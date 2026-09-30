import fs from 'node:fs/promises'
import http from 'node:http'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Settings } from '../shared/settings'
import { createApp } from './app'

let dataDirectory: string
let server: Server
let serverUrl: string

beforeEach(async () => {
  dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'git-aux-test-'))
  const app = await createApp({ dataDirectory })
  server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  serverUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve))
  await fs.rm(dataDirectory, { recursive: true })
})

function uploadClip(fileName: string, contents = 'fake mp3 bytes') {
  return fetch(`${serverUrl}/api/clips/${encodeURIComponent(fileName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'audio/mpeg' },
    body: contents,
  })
}

function saveSettings(settings: unknown) {
  return fetch(`${serverUrl}/api/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
}

const settingsUsingAirhorn: Settings = {
  clipRules: [
    { id: 'rule-1', eventKind: 'pull_request_merged', githubLogin: 'octocat', clipFileName: 'airhorn.mp3' },
  ],
}

describe('clips', () => {
  it('starts with no clips', async () => {
    const response = await fetch(`${serverUrl}/api/clips`)
    expect(await response.json()).toEqual({ clipFileNames: [] })
  })

  it('stores an uploaded clip and serves it back', async () => {
    expect((await uploadClip('airhorn.mp3', 'honk')).status).toBe(201)

    const list = await fetch(`${serverUrl}/api/clips`)
    expect(await list.json()).toEqual({ clipFileNames: ['airhorn.mp3'] })

    const clip = await fetch(`${serverUrl}/media/airhorn.mp3`)
    expect(clip.headers.get('content-type')).toBe('audio/mpeg')
    expect(await clip.text()).toBe('honk')
  })

  it('refuses names that reach outside the media folder', async () => {
    expect((await uploadClip('../settings.json')).status).toBe(400)
    expect((await uploadClip('..%2Fescape.mp3')).status).toBe(400)
    expect(await fs.readdir(dataDirectory)).toEqual(['media'])
  })

  it('refuses file types that are not audio or video', async () => {
    expect((await uploadClip('script.js')).status).toBe(400)
  })

  it('refuses an empty file', async () => {
    expect((await uploadClip('empty.mp3', '')).status).toBe(400)
  })

  it('refuses to overwrite an existing clip', async () => {
    await uploadClip('airhorn.mp3', 'first')
    expect((await uploadClip('airhorn.mp3', 'second')).status).toBe(409)
    expect(await (await fetch(`${serverUrl}/media/airhorn.mp3`)).text()).toBe('first')
  })

  it('deletes a clip', async () => {
    await uploadClip('airhorn.mp3')
    const response = await fetch(`${serverUrl}/api/clips/airhorn.mp3`, { method: 'DELETE' })
    expect(response.status).toBe(204)
    expect((await fetch(`${serverUrl}/media/airhorn.mp3`)).status).toBe(404)
  })

  it('refuses to delete a clip that a rule uses', async () => {
    await uploadClip('airhorn.mp3')
    await saveSettings(settingsUsingAirhorn)
    const response = await fetch(`${serverUrl}/api/clips/airhorn.mp3`, { method: 'DELETE' })
    expect(response.status).toBe(409)
    expect((await fetch(`${serverUrl}/media/airhorn.mp3`)).status).toBe(200)
  })

  it('answers 404 when deleting a clip that does not exist', async () => {
    const response = await fetch(`${serverUrl}/api/clips/nope.mp3`, { method: 'DELETE' })
    expect(response.status).toBe(404)
  })
})

describe('settings', () => {
  it('starts with no rules', async () => {
    const response = await fetch(`${serverUrl}/api/settings`)
    expect(await response.json()).toEqual({ clipRules: [] })
  })

  it('saves settings and returns them later', async () => {
    await uploadClip('airhorn.mp3')
    expect((await saveSettings(settingsUsingAirhorn)).status).toBe(200)

    const response = await fetch(`${serverUrl}/api/settings`)
    expect(await response.json()).toEqual(settingsUsingAirhorn)
  })

  it('refuses a rule whose clip was never uploaded', async () => {
    const response = await saveSettings(settingsUsingAirhorn)
    expect(response.status).toBe(400)
    expect((await response.json()).error).toContain('airhorn.mp3')
  })

  it('refuses settings with the wrong shape', async () => {
    expect((await saveSettings({ rules: [] })).status).toBe(400)
  })

  it('refuses a body that is not JSON', async () => {
    const response = await fetch(`${serverUrl}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    })
    expect(response.status).toBe(400)
  })
})

describe('host check', () => {
  // fetch cannot change the Host header, so these requests use node:http directly.
  function statusForHostHeader(hostHeader: string): Promise<number> {
    const { port } = server.address() as AddressInfo
    return new Promise((resolve, reject) => {
      http
        .get({ host: '127.0.0.1', port, path: '/api/settings', headers: { host: hostHeader } }, (response) => {
          response.resume()
          resolve(response.statusCode ?? 0)
        })
        .on('error', reject)
    })
  }

  it('answers requests addressed to this machine', async () => {
    const { port } = server.address() as AddressInfo
    for (const hostHeader of [`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`, 'LOCALHOST']) {
      expect(await statusForHostHeader(hostHeader)).toBe(200)
    }
  })

  it('refuses requests addressed to any other name', async () => {
    for (const hostHeader of ['evil.example', 'localhost.evil.example', '192.168.1.20:4242']) {
      expect(await statusForHostHeader(hostHeader)).toBe(403)
    }
  })
})

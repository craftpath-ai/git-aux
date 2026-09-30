import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createGithubConnection } from './githubConnection'
import { readGithubToken, writeGithubToken, type GithubToken } from './githubTokenFile'

// A fake GitHub. Each test queues the answers GitHub would give, in order.
type FakeAnswer = { status?: number; body: unknown; linkHeader?: string }

let dataDirectory: string
let queuedAnswers: FakeAnswer[]
let sentRequests: { url: string; body: string; authorization: string | null }[]
let scheduledChecks: (() => void)[]
let nowMs: number

beforeEach(async () => {
  dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'git-aux-github-test-'))
  queuedAnswers = []
  sentRequests = []
  scheduledChecks = []
  nowMs = 1_000_000
})

afterEach(async () => {
  await fs.rm(dataDirectory, { recursive: true })
})

const fakeFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers)
  sentRequests.push({
    url: String(input),
    body: String(init?.body ?? ''),
    authorization: headers.get('authorization'),
  })
  const answer = queuedAnswers.shift()
  if (!answer) throw new Error(`No fake answer queued for ${String(input)}`)
  return new Response(JSON.stringify(answer.body), {
    status: answer.status ?? 200,
    headers: answer.linkHeader ? { link: answer.linkHeader } : {},
  })
}

function makeConnection(clientId = 'Iv1.test') {
  return createGithubConnection({
    dataDirectory,
    appConfig: { clientId, appSlug: 'git-aux' },
    fetchFunction: fakeFetch,
    getNowMs: () => nowMs,
    scheduleLater: (callback) => scheduledChecks.push(callback),
  })
}

// Runs the next scheduled "approved yet?" check and waits for it to finish.
async function runNextCheck() {
  const check = scheduledChecks.shift()
  if (!check) throw new Error('No check was scheduled.')
  check()
  // The check runs several awaits; this lets them all finish.
  await new Promise((resolve) => setTimeout(resolve, 20))
}

const deviceCodeAnswer = {
  body: {
    device_code: 'device-123',
    user_code: 'WDJB-MJHT',
    verification_uri: 'https://github.com/login/device',
    expires_in: 900,
    interval: 5,
  },
}

const signedInToken: GithubToken = {
  accessToken: 'access-old',
  accessTokenExpiresAtMs: 1_000_000 + 8 * 60 * 60 * 1000,
  refreshToken: 'refresh-old',
  refreshTokenExpiresAtMs: 1_000_000 + 180 * 24 * 60 * 60 * 1000,
  githubLogin: 'octocat',
}

describe('sign-in', () => {
  it('is turned off when no client ID is set up', async () => {
    const connection = makeConnection('')
    expect((await connection.getStatus()).isSignInAvailable).toBe(false)
    await expect(connection.startSignIn()).rejects.toThrow('not set up')
    expect(sentRequests).toEqual([])
  })

  it('shows the code, waits for approval, then saves the token', async () => {
    const connection = makeConnection()
    queuedAnswers.push(deviceCodeAnswer)
    await connection.startSignIn()

    const pendingStatus = await connection.getStatus()
    expect(pendingStatus.pendingSignIn?.userCode).toBe('WDJB-MJHT')
    expect(pendingStatus.signedInGithubLogin).toBeNull()
    expect(sentRequests[0].body).toContain('client_id=Iv1.test')

    // Not approved yet.
    queuedAnswers.push({ body: { error: 'authorization_pending' } })
    await runNextCheck()
    expect((await connection.getStatus()).pendingSignIn).not.toBeNull()

    // Approved.
    queuedAnswers.push({
      body: {
        access_token: 'access-1',
        expires_in: 28800,
        refresh_token: 'refresh-1',
        refresh_token_expires_in: 15897600,
      },
    })
    queuedAnswers.push({ body: { login: 'octocat' } })
    await runNextCheck()

    const status = await connection.getStatus()
    expect(status.signedInGithubLogin).toBe('octocat')
    expect(status.pendingSignIn).toBeNull()
    expect(scheduledChecks).toEqual([])
    const token = await readGithubToken(dataDirectory)
    expect(token?.accessToken).toBe('access-1')
    expect(token?.accessTokenExpiresAtMs).toBe(nowMs + 28800 * 1000)
  })

  it('never includes the token in the status sent to the page', async () => {
    await writeGithubToken(dataDirectory, signedInToken)
    const statusText = JSON.stringify(await makeConnection().getStatus())
    expect(statusText).not.toContain('access-old')
    expect(statusText).not.toContain('refresh-old')
  })

  it('saves the token file so only its owner can read it', async () => {
    await writeGithubToken(dataDirectory, signedInToken)
    const { mode } = await fs.stat(path.join(dataDirectory, 'github-token.json'))
    expect(mode & 0o777).toBe(0o600)
  })

  it('shows a plain message when sign-in is cancelled on GitHub', async () => {
    const connection = makeConnection()
    queuedAnswers.push(deviceCodeAnswer)
    await connection.startSignIn()
    queuedAnswers.push({ body: { error: 'access_denied' } })
    await runNextCheck()

    const status = await connection.getStatus()
    expect(status.pendingSignIn).toBeNull()
    expect(status.signInErrorMessage).toBe('Sign-in was cancelled on GitHub.')
  })

  it('stops when the code runs out', async () => {
    const connection = makeConnection()
    queuedAnswers.push(deviceCodeAnswer)
    await connection.startSignIn()
    nowMs += 901 * 1000
    await runNextCheck()

    expect((await connection.getStatus()).signInErrorMessage).toContain('ran out')
    // It did not even ask GitHub.
    expect(sentRequests).toHaveLength(1)
  })

  it('waits longer when GitHub says to slow down', async () => {
    const connection = makeConnection()
    queuedAnswers.push(deviceCodeAnswer)
    await connection.startSignIn()
    queuedAnswers.push({ body: { error: 'slow_down', interval: 10 } })
    await runNextCheck()
    expect(scheduledChecks).toHaveLength(1)
  })

  it('stops checking after sign-out', async () => {
    const connection = makeConnection()
    queuedAnswers.push(deviceCodeAnswer)
    await connection.startSignIn()
    await connection.signOut()
    await runNextCheck()
    // Only the device code request went out.
    expect(sentRequests).toHaveLength(1)
  })
})

describe('GitHub requests', () => {
  it('refreshes a token that has run out, once, even for requests at the same time', async () => {
    await writeGithubToken(dataDirectory, signedInToken)
    const connection = makeConnection()
    nowMs = signedInToken.accessTokenExpiresAtMs! + 1

    queuedAnswers.push({ body: { access_token: 'access-new', expires_in: 28800, refresh_token: 'refresh-new' } })
    queuedAnswers.push({ body: { installations: [{ account: { login: 'craftpath-ai', type: 'Organization' } }] } })
    queuedAnswers.push({ body: { installations: [{ account: { login: 'craftpath-ai', type: 'Organization' } }] } })

    await Promise.all([
      connection.listInstalledOrganizationLogins(),
      connection.listInstalledOrganizationLogins(),
    ])

    const refreshRequests = sentRequests.filter((request) => request.body.includes('grant_type=refresh_token'))
    expect(refreshRequests).toHaveLength(1)
    expect(sentRequests.filter((r) => r.url.includes('/user/installations')).map((r) => r.authorization)).toEqual([
      'Bearer access-new',
      'Bearer access-new',
    ])
    expect((await readGithubToken(dataDirectory))?.refreshToken).toBe('refresh-new')
  })

  it('signs out when the refresh token no longer works', async () => {
    await writeGithubToken(dataDirectory, signedInToken)
    const connection = makeConnection()
    nowMs = signedInToken.accessTokenExpiresAtMs! + 1
    queuedAnswers.push({ body: { error: 'bad_refresh_token' } })

    await expect(connection.listInstalledOrganizationLogins()).rejects.toThrow('Sign in again')
    expect(await readGithubToken(dataDirectory)).toBeNull()
  })

  it('signs out when GitHub rejects the token', async () => {
    await writeGithubToken(dataDirectory, signedInToken)
    queuedAnswers.push({ status: 401, body: { message: 'Bad credentials' } })
    await expect(makeConnection().listInstalledOrganizationLogins()).rejects.toThrow('Sign in again')
    expect(await readGithubToken(dataDirectory)).toBeNull()
  })

  it('lists only organizations, not personal accounts', async () => {
    await writeGithubToken(dataDirectory, signedInToken)
    queuedAnswers.push({
      body: {
        installations: [
          { account: { login: 'octocat', type: 'User' } },
          { account: { login: 'craftpath-ai', type: 'Organization' } },
        ],
      },
    })
    expect(await makeConnection().listInstalledOrganizationLogins()).toEqual(['craftpath-ai'])
  })

  it('reads every page of organization members', async () => {
    await writeGithubToken(dataDirectory, signedInToken)
    queuedAnswers.push({
      body: [{ login: 'zed' }, { login: 'amy' }],
      linkHeader: '<https://api.github.com/orgs/craftpath-ai/members?per_page=100&page=2>; rel="next"',
    })
    queuedAnswers.push({ body: [{ login: 'Bob' }] })

    expect(await makeConnection().listOrganizationMemberLogins('craftpath-ai')).toEqual(['amy', 'Bob', 'zed'])
  })

  it('never follows a next page outside the GitHub API', async () => {
    await writeGithubToken(dataDirectory, signedInToken)
    queuedAnswers.push({
      body: [{ login: 'amy' }],
      linkHeader: '<https://evil.example/steal>; rel="next"',
    })
    expect(await makeConnection().listOrganizationMemberLogins('craftpath-ai')).toEqual(['amy'])
    expect(sentRequests).toHaveLength(1)
  })

  it('explains when the app is not installed on the organization', async () => {
    await writeGithubToken(dataDirectory, signedInToken)
    queuedAnswers.push({ status: 404, body: { message: 'Not Found' } })
    await expect(makeConnection().listOrganizationMemberLogins('other-org')).rejects.toThrow(
      'An admin of it needs to install the app',
    )
  })
})

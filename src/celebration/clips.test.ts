import { describe, expect, it } from 'vitest'
import { clipForGithubLogin, clipKindForFileName, type ClipsConfig } from './clips'

const config: ClipsConfig = {
  defaultClipFileName: 'default.mp3',
  clipFileNameByGithubLogin: { octocat: 'octocat.mp4' },
}

describe('clipKindForFileName', () => {
  it('treats mp4 and webm as video', () => {
    expect(clipKindForFileName('a.mp4')).toBe('video')
    expect(clipKindForFileName('A.WEBM')).toBe('video')
  })

  it('treats everything else as audio', () => {
    expect(clipKindForFileName('a.mp3')).toBe('audio')
    expect(clipKindForFileName('a.wav')).toBe('audio')
  })
})

describe('clipForGithubLogin', () => {
  it("returns the person's own clip", () => {
    expect(clipForGithubLogin('octocat', config)).toEqual({ fileName: 'octocat.mp4', kind: 'video' })
  })

  it('ignores letter case in the username', () => {
    expect(clipForGithubLogin('OctoCat', config).fileName).toBe('octocat.mp4')
  })

  it('falls back to the default clip for anyone unmapped', () => {
    expect(clipForGithubLogin('someone-else', config)).toEqual({
      fileName: 'default.mp3',
      kind: 'audio',
    })
  })
})

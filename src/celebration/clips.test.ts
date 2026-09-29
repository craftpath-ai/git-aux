import { describe, expect, it } from 'vitest'
import type { ClipRule } from '../../shared/settings'
import { BUILT_IN_DEFAULT_CLIP, clipForFileName, clipForGithubEvent, clipKindForFileName } from './clips'

const clipRules: ClipRule[] = [
  { id: '1', eventKind: 'pull_request_merged', githubLogin: null, clipFileName: 'chime.mp3' },
  { id: '2', eventKind: 'pull_request_merged', githubLogin: 'octocat', clipFileName: 'walk up.mp4' },
  { id: '3', eventKind: 'checks_failed', githubLogin: 'octocat', clipFileName: 'trombone.mp3' },
]

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

describe('clipForFileName', () => {
  it('makes a URL that is safe for names with spaces', () => {
    expect(clipForFileName('walk up.mp4')).toEqual({ url: '/media/walk%20up.mp4', kind: 'video' })
  })
})

describe('clipForGithubEvent', () => {
  it("prefers the person's own rule over the rule for anyone", () => {
    const event = { eventKind: 'pull_request_merged', githubLogin: 'octocat' } as const
    expect(clipForGithubEvent(event, clipRules).url).toBe('/media/walk%20up.mp4')
  })

  it('ignores letter case in the username', () => {
    const event = { eventKind: 'pull_request_merged', githubLogin: 'OctoCat' } as const
    expect(clipForGithubEvent(event, clipRules).url).toBe('/media/walk%20up.mp4')
  })

  it('uses the rule for anyone when the person has no rule', () => {
    const event = { eventKind: 'pull_request_merged', githubLogin: 'someone-else' } as const
    expect(clipForGithubEvent(event, clipRules).url).toBe('/media/chime.mp3')
  })

  it("does not use a person's rule for a different event", () => {
    const event = { eventKind: 'pull_request_opened', githubLogin: 'octocat' } as const
    expect(clipForGithubEvent(event, clipRules)).toEqual(BUILT_IN_DEFAULT_CLIP)
  })

  it('uses the built-in clip when no rule matches', () => {
    const event = { eventKind: 'checks_failed', githubLogin: 'someone-else' } as const
    expect(clipForGithubEvent(event, clipRules)).toEqual(BUILT_IN_DEFAULT_CLIP)
  })
})

import { VIDEO_CLIP_EXTENSIONS } from '../../shared/clipFileName'
import type { ClipRule, GithubEventKind } from '../../shared/settings'

export type Clip = {
  url: string
  // 'audio' clips have no picture, so the screen shows a default card instead.
  kind: 'video' | 'audio'
}

// A queue of events should clear quickly, so no clip plays longer than this.
export const MAX_CLIP_SECONDS = 15

// Ships with the app. Played when no rule matches.
export const BUILT_IN_DEFAULT_CLIP: Clip = { url: '/built-in-media/default.mp3', kind: 'audio' }

export function clipKindForFileName(fileName: string): Clip['kind'] {
  const lowerCaseFileName = fileName.toLowerCase()
  const isVideo = VIDEO_CLIP_EXTENSIONS.some((extension) => lowerCaseFileName.endsWith(extension))
  return isVideo ? 'video' : 'audio'
}

export function clipForFileName(clipFileName: string): Clip {
  return {
    url: `/media/${encodeURIComponent(clipFileName)}`,
    kind: clipKindForFileName(clipFileName),
  }
}

// The most specific rule wins: a rule for this person beats a rule for anyone.
export function clipForGithubEvent(
  event: { eventKind: GithubEventKind; githubLogin: string },
  clipRules: ClipRule[],
): Clip {
  const rulesForEventKind = clipRules.filter((rule) => rule.eventKind === event.eventKind)
  // GitHub usernames are case-insensitive: "Octocat" and "octocat" are the same person.
  const ruleForPerson = rulesForEventKind.find(
    (rule) => rule.githubLogin?.toLowerCase() === event.githubLogin.toLowerCase(),
  )
  const ruleForAnyone = rulesForEventKind.find((rule) => rule.githubLogin === null)

  const matchingRule = ruleForPerson ?? ruleForAnyone
  return matchingRule ? clipForFileName(matchingRule.clipFileName) : BUILT_IN_DEFAULT_CLIP
}

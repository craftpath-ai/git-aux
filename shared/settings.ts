import { isValidClipFileName } from './clipFileName'

export const GITHUB_EVENT_KINDS = [
  'pull_request_merged',
  'pull_request_opened',
  'pull_request_approved',
  'checks_failed',
] as const

export type GithubEventKind = (typeof GITHUB_EVENT_KINDS)[number]

export const GITHUB_EVENT_KIND_LABELS: Record<GithubEventKind, string> = {
  pull_request_merged: 'merged',
  pull_request_opened: 'opened',
  pull_request_approved: 'approved',
  checks_failed: 'checks failed',
}

export type ClipRule = {
  id: string
  eventKind: GithubEventKind
  // GitHub username this rule is for. null means the rule is for anyone.
  githubLogin: string | null
  // Name of a file in the media folder.
  clipFileName: string
}

export type Settings = {
  // The GitHub organization this screen follows, like "craftpath-ai".
  // null until someone picks one after signing in to GitHub.
  githubOrganizationLogin: string | null
  clipRules: ClipRule[]
}

export const EMPTY_SETTINGS: Settings = { githubOrganizationLogin: null, clipRules: [] }

// Letters, numbers and dashes, plus brackets for bot accounts like "dependabot[bot]".
const GITHUB_LOGIN_PATTERN = /^[A-Za-z0-9[\]-]{1,50}$/
// Organization names are letters, numbers and dashes, at most 39 characters.
export const GITHUB_ORGANIZATION_LOGIN_PATTERN = /^[A-Za-z0-9-]{1,39}$/

// Checks settings that came from outside the program (a request or the file on disk).
// Throws an Error with a plain-English message when something is wrong.
export function parseSettings(value: unknown): Settings {
  if (!isObject(value) || !Array.isArray(value.clipRules)) {
    throw new Error('Settings must have a list called clipRules.')
  }

  const seenRuleKeys = new Set<string>()
  const clipRules = value.clipRules.map((rule: unknown, index: number): ClipRule => {
    const ruleName = `Rule ${index + 1}`
    if (!isObject(rule)) throw new Error(`${ruleName} is not an object.`)

    const { id, eventKind, githubLogin, clipFileName } = rule
    if (typeof id !== 'string' || id === '') throw new Error(`${ruleName} has no id.`)
    if (!GITHUB_EVENT_KINDS.includes(eventKind as GithubEventKind)) {
      throw new Error(`${ruleName} has an unknown event.`)
    }
    if (githubLogin !== null && (typeof githubLogin !== 'string' || !GITHUB_LOGIN_PATTERN.test(githubLogin))) {
      throw new Error(`${ruleName} has a GitHub username that is not valid.`)
    }
    if (typeof clipFileName !== 'string' || !isValidClipFileName(clipFileName)) {
      throw new Error(`${ruleName} has a clip file name that is not valid.`)
    }

    const ruleKey = `${eventKind}:${githubLogin?.toLowerCase() ?? ''}`
    if (seenRuleKeys.has(ruleKey)) {
      throw new Error(`${ruleName} repeats an earlier rule for the same person and event.`)
    }
    seenRuleKeys.add(ruleKey)

    return { id, eventKind: eventKind as GithubEventKind, githubLogin, clipFileName }
  })

  // Settings files saved before GitHub sign-in existed have no organization.
  const githubOrganizationLogin = value.githubOrganizationLogin ?? null
  if (
    githubOrganizationLogin !== null &&
    (typeof githubOrganizationLogin !== 'string' ||
      !GITHUB_ORGANIZATION_LOGIN_PATTERN.test(githubOrganizationLogin))
  ) {
    throw new Error('The GitHub organization name is not valid.')
  }

  return { githubOrganizationLogin, clipRules }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

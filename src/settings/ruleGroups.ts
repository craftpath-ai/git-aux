import { GITHUB_EVENT_KINDS, type ClipRule } from '../../shared/settings'

export type ClipRuleGroup = {
  // GitHub username the rules are for. null means the rules are for anyone.
  githubLogin: string | null
  clipRules: ClipRule[]
}

// Groups rules by person for the settings page: "anyone" first, then people from A to Z.
// Inside a group, rules follow the order of GITHUB_EVENT_KINDS.
export function groupClipRulesByPerson(clipRules: ClipRule[]): ClipRuleGroup[] {
  // GitHub usernames are case-insensitive, so "Octocat" and "octocat" share a group.
  const groupsByLowerCaseLogin = new Map<string, ClipRuleGroup>()
  for (const rule of clipRules) {
    const lowerCaseLogin = rule.githubLogin?.toLowerCase() ?? ''
    const group = groupsByLowerCaseLogin.get(lowerCaseLogin) ?? {
      githubLogin: rule.githubLogin,
      clipRules: [],
    }
    group.clipRules.push(rule)
    groupsByLowerCaseLogin.set(lowerCaseLogin, group)
  }

  const groups = Array.from(groupsByLowerCaseLogin.values())
  for (const group of groups) {
    group.clipRules.sort(
      (a, b) => GITHUB_EVENT_KINDS.indexOf(a.eventKind) - GITHUB_EVENT_KINDS.indexOf(b.eventKind),
    )
  }
  return groups.sort((a, b) => {
    if (a.githubLogin === null) return -1
    if (b.githubLogin === null) return 1
    return a.githubLogin.localeCompare(b.githubLogin, 'en', { sensitivity: 'base' })
  })
}

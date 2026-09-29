import { describe, expect, it } from 'vitest'
import type { ClipRule, GithubEventKind } from '../../shared/settings'
import { groupClipRulesByPerson } from './ruleGroups'

function makeRule(githubLogin: string | null, eventKind: GithubEventKind): ClipRule {
  return { id: `${githubLogin}-${eventKind}`, eventKind, githubLogin, clipFileName: 'horn.mp3' }
}

describe('groupClipRulesByPerson', () => {
  it('returns no groups when there are no rules', () => {
    expect(groupClipRulesByPerson([])).toEqual([])
  })

  it('puts "anyone" first, then people from A to Z', () => {
    const groups = groupClipRulesByPerson([
      makeRule('zed', 'pull_request_merged'),
      makeRule('Amy', 'pull_request_merged'),
      makeRule(null, 'pull_request_merged'),
      makeRule('bob', 'pull_request_merged'),
    ])
    expect(groups.map((group) => group.githubLogin)).toEqual([null, 'Amy', 'bob', 'zed'])
  })

  it('treats usernames that differ only by case as the same person', () => {
    const groups = groupClipRulesByPerson([
      makeRule('Octocat', 'pull_request_merged'),
      makeRule('octocat', 'pull_request_opened'),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].clipRules).toHaveLength(2)
  })

  it('orders the rules inside a group by event', () => {
    const groups = groupClipRulesByPerson([
      makeRule('amy', 'checks_failed'),
      makeRule('amy', 'pull_request_merged'),
      makeRule('amy', 'pull_request_approved'),
    ])
    expect(groups[0].clipRules.map((rule) => rule.eventKind)).toEqual([
      'pull_request_merged',
      'pull_request_approved',
      'checks_failed',
    ])
  })
})

import { describe, expect, it } from 'vitest'
import { parseSettings } from './settings'

const validRule = {
  id: 'rule-1',
  eventKind: 'pull_request_merged',
  githubLogin: 'octocat',
  clipFileName: 'airhorn.mp3',
}

describe('parseSettings', () => {
  it('accepts valid settings', () => {
    expect(parseSettings({ clipRules: [validRule] })).toEqual({ clipRules: [validRule] })
  })

  it('accepts a rule for anyone', () => {
    const rule = { ...validRule, githubLogin: null }
    expect(parseSettings({ clipRules: [rule] }).clipRules[0].githubLogin).toBeNull()
  })

  it('accepts bot usernames', () => {
    const rule = { ...validRule, githubLogin: 'dependabot[bot]' }
    expect(() => parseSettings({ clipRules: [rule] })).not.toThrow()
  })

  it('drops fields it does not know', () => {
    const settings = parseSettings({ clipRules: [{ ...validRule, extra: true }], other: 1 })
    expect(settings).toEqual({ clipRules: [validRule] })
  })

  it('rejects an unknown event', () => {
    const rule = { ...validRule, eventKind: 'pull_request_closed' }
    expect(() => parseSettings({ clipRules: [rule] })).toThrow('unknown event')
  })

  it('rejects a username with odd characters', () => {
    const rule = { ...validRule, githubLogin: 'octo cat/../' }
    expect(() => parseSettings({ clipRules: [rule] })).toThrow('username')
  })

  it('rejects a clip name that is a path', () => {
    const rule = { ...validRule, clipFileName: '../secret.mp3' }
    expect(() => parseSettings({ clipRules: [rule] })).toThrow('clip file name')
  })

  it('rejects two rules for the same person and event, ignoring letter case', () => {
    const rules = [validRule, { ...validRule, id: 'rule-2', githubLogin: 'OctoCat' }]
    expect(() => parseSettings({ clipRules: rules })).toThrow('repeats')
  })

  it('rejects values that are not settings at all', () => {
    expect(() => parseSettings(null)).toThrow()
    expect(() => parseSettings({ clipRules: 'nope' })).toThrow()
  })
})

import { describe, expect, it } from 'vitest'
import { EMPTY_SETTINGS, type ClipRule, type Settings } from '../../shared/settings'
import { createSettingsSaveQueue } from './settingsSaveQueue'

const rule: ClipRule = {
  id: 'rule-1',
  eventKind: 'pull_request_merged',
  githubLogin: 'octocat',
  clipFileName: 'airhorn.mp3',
}

// Holds the first save until the test lets it finish, so the second save is
// queued while the first is still in flight.
function queueWithHeldFirstSave(onSaved: (settings: Settings) => void) {
  let finishFirstSave: () => void = () => {}
  let markFirstSaveStarted: () => void = () => {}
  const firstSaveStarted = new Promise<void>((resolve) => {
    markFirstSaveStarted = resolve
  })
  let calls = 0

  const enqueue = createSettingsSaveQueue(
    (settings) => {
      calls += 1
      if (calls === 1) {
        markFirstSaveStarted()
        return new Promise<Settings>((resolve) => {
          finishFirstSave = () => resolve(settings)
        })
      }
      return Promise.resolve(settings)
    },
    onSaved,
    EMPTY_SETTINGS,
  )

  return { enqueue, firstSaveStarted, finishFirstSave: () => finishFirstSave() }
}

describe('createSettingsSaveQueue', () => {
  it('keeps a rule that was saved while the organization save was still in flight', async () => {
    const stored: Settings[] = []
    const { enqueue, firstSaveStarted, finishFirstSave } = queueWithHeldFirstSave((settings) => {
      stored.push(settings)
    })

    const organizationSave = enqueue((current) => ({
      ...current,
      githubOrganizationLogin: 'craftpath-ai',
    }))
    const ruleSave = enqueue((current) => ({ ...current, clipRules: [rule] }))

    await firstSaveStarted
    finishFirstSave()
    await organizationSave
    await ruleSave

    expect(stored.at(-1)).toEqual({ githubOrganizationLogin: 'craftpath-ai', clipRules: [rule] })
  })

  it('keeps the organization when a rule save was already in flight', async () => {
    const stored: Settings[] = []
    const { enqueue, firstSaveStarted, finishFirstSave } = queueWithHeldFirstSave((settings) => {
      stored.push(settings)
    })

    const ruleSave = enqueue((current) => ({ ...current, clipRules: [rule] }))
    const organizationSave = enqueue((current) => ({
      ...current,
      githubOrganizationLogin: 'craftpath-ai',
    }))

    await firstSaveStarted
    finishFirstSave()
    await ruleSave
    await organizationSave

    expect(stored.at(-1)).toEqual({ githubOrganizationLogin: 'craftpath-ai', clipRules: [rule] })
  })

  it('saves the next change after a save fails', async () => {
    const stored: Settings[] = []
    let calls = 0
    const enqueue = createSettingsSaveQueue(
      async (settings) => {
        calls += 1
        if (calls === 1) throw new Error('disk full')
        return settings
      },
      (settings) => stored.push(settings),
      EMPTY_SETTINGS,
    )

    await expect(
      enqueue((current) => ({ ...current, githubOrganizationLogin: 'nope' })),
    ).rejects.toThrow('disk full')
    await enqueue((current) => ({ ...current, githubOrganizationLogin: 'craftpath-ai' }))

    expect(stored).toEqual([{ githubOrganizationLogin: 'craftpath-ai', clipRules: [] }])
  })
})

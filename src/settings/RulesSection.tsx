import { useState } from 'react'
import {
  GITHUB_EVENT_KINDS,
  type ClipRule,
  type GithubEventKind,
  type Settings,
} from '../../shared/settings'
import { saveSettings } from '../api'
import type { GithubEvent } from '../celebration/githubEvent'
import { groupClipRulesByPerson } from './ruleGroups'
import { makeTestEvent } from './testEvent'
import { useServerAction } from './useServerAction'

// What the person does, worded to fit the sentence "When anyone ..., play ...".
const GITHUB_EVENT_KIND_ACTIONS: Record<GithubEventKind, string> = {
  pull_request_merged: 'merges a pull request',
  pull_request_opened: 'opens a pull request',
  pull_request_approved: 'approves a pull request',
  checks_failed: 'has checks fail',
}

type Props = {
  settings: Settings
  clipFileNames: string[]
  onSettingsSaved: (settings: Settings) => void
  onTestEvent: (event: GithubEvent) => void
}

export function RulesSection({ settings, clipFileNames, onSettingsSaved, onTestEvent }: Props) {
  const { isBusy, errorMessage, runAction } = useServerAction()

  // The "add a rule" form.
  const [newRuleGithubLogin, setNewRuleGithubLogin] = useState('')
  const [newRuleEventKind, setNewRuleEventKind] = useState<GithubEventKind>('pull_request_merged')
  const [newRuleClipFileName, setNewRuleClipFileName] = useState('')

  function saveClipRules(clipRules: ClipRule[]) {
    runAction(async () => {
      onSettingsSaved(await saveSettings({ ...settings, clipRules }))
    })
  }

  function handleAddRule() {
    const githubLogin = newRuleGithubLogin.trim().replace(/^@/, '') || null
    const newRule: ClipRule = {
      id: crypto.randomUUID(),
      eventKind: newRuleEventKind,
      githubLogin,
      clipFileName: newRuleClipFileName,
    }
    // A new rule for the same person and event replaces the old one.
    const otherRules = settings.clipRules.filter(
      (rule) =>
        rule.eventKind !== newRule.eventKind ||
        rule.githubLogin?.toLowerCase() !== newRule.githubLogin?.toLowerCase(),
    )
    runAction(async () => {
      onSettingsSaved(await saveSettings({ ...settings, clipRules: [...otherRules, newRule] }))
      setNewRuleGithubLogin('')
    })
  }

  function handleChangeRuleClip(ruleId: string, clipFileName: string) {
    saveClipRules(
      settings.clipRules.map((rule) => (rule.id === ruleId ? { ...rule, clipFileName } : rule)),
    )
  }

  function handleRemoveRule(ruleId: string) {
    saveClipRules(settings.clipRules.filter((rule) => rule.id !== ruleId))
  }

  return (
    <section>
      <h2>rules</h2>
      <p className="settings-page__hint">
        A rule for one person beats a rule for anyone. When no rule matches, the built-in chime
        plays.
      </p>

      {errorMessage && (
        <p className="settings-page__error" role="alert">
          {errorMessage}
        </p>
      )}

      <form
        className="settings-page__rule-form"
        onSubmit={(event) => {
          event.preventDefault()
          handleAddRule()
        }}
      >
        <span>When</span>
        <input
          type="text"
          aria-label="who (a GitHub username, or empty for anyone)"
          placeholder="anyone"
          value={newRuleGithubLogin}
          onChange={(event) => setNewRuleGithubLogin(event.target.value)}
        />
        <select
          aria-label="event"
          value={newRuleEventKind}
          onChange={(event) => setNewRuleEventKind(event.target.value as GithubEventKind)}
        >
          {GITHUB_EVENT_KINDS.map((eventKind) => (
            <option key={eventKind} value={eventKind}>
              {GITHUB_EVENT_KIND_ACTIONS[eventKind]}
            </option>
          ))}
        </select>
        <span>, play</span>
        <select
          aria-label="clip"
          required
          value={newRuleClipFileName}
          onChange={(event) => setNewRuleClipFileName(event.target.value)}
        >
          <option value="">choose a clip</option>
          {clipFileNames.map((clipFileName) => (
            <option key={clipFileName} value={clipFileName}>
              {clipFileName}
            </option>
          ))}
        </select>
        <button type="submit" disabled={isBusy || clipFileNames.length === 0}>
          add rule
        </button>
      </form>
      <p className="settings-page__hint">
        {clipFileNames.length === 0
          ? 'Upload a clip first, then add a rule for it.'
          : '"who" is a GitHub username. Leave it empty for a rule that covers anyone.'}
      </p>

      {settings.clipRules.length === 0 ? (
        <p className="settings-page__empty">no rules yet</p>
      ) : (
        groupClipRulesByPerson(settings.clipRules).map((group) => (
          <div key={group.githubLogin?.toLowerCase() ?? ''} className="settings-page__rule-group">
            <h3>{group.githubLogin ?? 'anyone'}</h3>
            <ul className="settings-page__list">
              {group.clipRules.map((rule) => (
                <li key={rule.id}>
                  <span className="settings-page__name">
                    {GITHUB_EVENT_KIND_ACTIONS[rule.eventKind]}
                  </span>
                  <select
                    aria-label={`clip for when ${group.githubLogin ?? 'anyone'} ${GITHUB_EVENT_KIND_ACTIONS[rule.eventKind]}`}
                    disabled={isBusy}
                    value={rule.clipFileName}
                    onChange={(event) => handleChangeRuleClip(rule.id, event.target.value)}
                  >
                    {/* Keeps the rule readable if its file was removed from the media folder by hand. */}
                    {!clipFileNames.includes(rule.clipFileName) && (
                      <option value={rule.clipFileName}>{rule.clipFileName} (missing)</option>
                    )}
                    {clipFileNames.map((clipFileName) => (
                      <option key={clipFileName} value={clipFileName}>
                        {clipFileName}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => onTestEvent(makeTestEvent(rule.eventKind, rule.githubLogin))}
                  >
                    test
                  </button>
                  <button disabled={isBusy} onClick={() => handleRemoveRule(rule.id)}>
                    remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  )
}

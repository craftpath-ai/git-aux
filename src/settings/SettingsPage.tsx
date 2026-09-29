import { useEffect, useState } from 'react'
import { ALLOWED_CLIP_EXTENSIONS, cleanClipFileName } from '../../shared/clipFileName'
import {
  GITHUB_EVENT_KINDS,
  GITHUB_EVENT_KIND_LABELS,
  type ClipRule,
  type GithubEventKind,
  type Settings,
} from '../../shared/settings'
import { deleteClip, fetchClipFileNames, saveSettings, uploadClip } from '../api'
import { clipForFileName } from '../celebration/clips'
import type { GithubEvent } from '../celebration/githubEvent'
import { makeTestEvent } from './testEvent'

type Props = {
  settings: Settings
  onSettingsSaved: (settings: Settings) => void
  onTestEvent: (event: GithubEvent) => void
  onClose: () => void
}

export function SettingsPage({ settings, onSettingsSaved, onTestEvent, onClose }: Props) {
  const [clipFileNames, setClipFileNames] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  // The "add a rule" form.
  const [newRuleGithubLogin, setNewRuleGithubLogin] = useState('')
  const [newRuleEventKind, setNewRuleEventKind] = useState<GithubEventKind>('pull_request_merged')
  const [newRuleClipFileName, setNewRuleClipFileName] = useState('')

  useEffect(() => {
    fetchClipFileNames()
      .then(setClipFileNames)
      .catch((error: Error) => setErrorMessage(error.message))
  }, [])

  // Runs one server action, showing its error message if it fails.
  async function runAction(action: () => Promise<void>) {
    setIsBusy(true)
    setErrorMessage(null)
    try {
      await action()
    } catch (error) {
      setErrorMessage((error as Error).message)
    } finally {
      setIsBusy(false)
    }
  }

  function handleFilesChosen(files: FileList | null) {
    if (!files || files.length === 0) return
    const chosenFiles = Array.from(files)
    runAction(async () => {
      try {
        for (const file of chosenFiles) {
          await uploadClip(cleanClipFileName(file.name), file)
        }
      } finally {
        // Refresh even after a failure, so files uploaded before it still show up.
        setClipFileNames(await fetchClipFileNames())
      }
    })
  }

  function handleDeleteClip(clipFileName: string) {
    runAction(async () => {
      await deleteClip(clipFileName)
      setClipFileNames(await fetchClipFileNames())
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

  function handleRemoveRule(ruleId: string) {
    const clipRules = settings.clipRules.filter((rule) => rule.id !== ruleId)
    runAction(async () => {
      onSettingsSaved(await saveSettings({ ...settings, clipRules }))
    })
  }

  return (
    <main className="settings-page">
      <header className="settings-page__header">
        <h1>settings</h1>
        <button onClick={onClose}>back to screen</button>
      </header>

      {errorMessage && (
        <p className="settings-page__error" role="alert">
          {errorMessage}
        </p>
      )}

      <section>
        <h2>clips</h2>
        <p className="settings-page__hint">
          Sound or video files. Clips are cut off after 15 seconds. Only upload clips you have the
          right to use.
        </p>
        <label className="settings-page__upload">
          upload files
          <input
            type="file"
            multiple
            accept={ALLOWED_CLIP_EXTENSIONS.join(',')}
            disabled={isBusy}
            onChange={(event) => {
              handleFilesChosen(event.target.files)
              // Clearing the input lets the same file be chosen again later.
              event.target.value = ''
            }}
          />
        </label>

        {clipFileNames.length === 0 ? (
          <p className="settings-page__empty">no clips yet</p>
        ) : (
          <ul className="settings-page__list">
            {clipFileNames.map((clipFileName) => (
              <li key={clipFileName}>
                <span className="settings-page__name">{clipFileName}</span>
                {clipForFileName(clipFileName).kind === 'audio' ? (
                  <audio controls preload="none" src={clipForFileName(clipFileName).url} />
                ) : (
                  <a href={clipForFileName(clipFileName).url} target="_blank" rel="noreferrer">
                    watch
                  </a>
                )}
                <button disabled={isBusy} onClick={() => handleDeleteClip(clipFileName)}>
                  delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>rules</h2>
        <p className="settings-page__hint">
          A rule for one person beats a rule for anyone. When no rule matches, the built-in chime
          plays.
        </p>

        {settings.clipRules.length === 0 ? (
          <p className="settings-page__empty">no rules yet</p>
        ) : (
          <ul className="settings-page__list">
            {settings.clipRules.map((rule) => (
              <li key={rule.id}>
                <span className="settings-page__name">
                  {rule.githubLogin ?? 'anyone'} / {GITHUB_EVENT_KIND_LABELS[rule.eventKind]} /{' '}
                  {rule.clipFileName}
                </span>
                <button onClick={() => onTestEvent(makeTestEvent(rule.eventKind, rule.githubLogin))}>
                  test
                </button>
                <button disabled={isBusy} onClick={() => handleRemoveRule(rule.id)}>
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="settings-page__rule-form"
          onSubmit={(event) => {
            event.preventDefault()
            handleAddRule()
          }}
        >
          <label>
            who
            <input
              type="text"
              placeholder="anyone"
              value={newRuleGithubLogin}
              onChange={(event) => setNewRuleGithubLogin(event.target.value)}
            />
          </label>
          <label>
            event
            <select
              value={newRuleEventKind}
              onChange={(event) => setNewRuleEventKind(event.target.value as GithubEventKind)}
            >
              {GITHUB_EVENT_KINDS.map((eventKind) => (
                <option key={eventKind} value={eventKind}>
                  {GITHUB_EVENT_KIND_LABELS[eventKind]}
                </option>
              ))}
            </select>
          </label>
          <label>
            clip
            <select
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
          </label>
          <button type="submit" disabled={isBusy || clipFileNames.length === 0}>
            add rule
          </button>
        </form>
        <p className="settings-page__hint">
          "who" is a GitHub username. Leave it empty for a rule that covers anyone.
        </p>
      </section>
    </main>
  )
}

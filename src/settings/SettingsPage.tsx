import { useEffect, useState } from 'react'
import type { Settings } from '../../shared/settings'
import { fetchClipFileNames } from '../api'
import type { GithubEvent } from '../celebration/githubEvent'
import { ClipsSection } from './ClipsSection'
import { RulesSection } from './RulesSection'

type Props = {
  settings: Settings
  onSettingsSaved: (settings: Settings) => void
  onTestEvent: (event: GithubEvent) => void
  onClose: () => void
}

export function SettingsPage({ settings, onSettingsSaved, onTestEvent, onClose }: Props) {
  // Both sections need the clip list: one edits it, the other picks from it.
  // null until the list has loaded, so rules are not shown as "missing" their clip meanwhile.
  const [clipFileNames, setClipFileNames] = useState<string[] | null>(null)
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null)

  function loadClipFileNames() {
    setLoadErrorMessage(null)
    fetchClipFileNames()
      .then(setClipFileNames)
      .catch((error: Error) => setLoadErrorMessage(error.message))
  }

  useEffect(loadClipFileNames, [])

  return (
    <main className="settings-page">
      <header className="settings-page__header">
        <h1>settings</h1>
        <button onClick={onClose}>back to screen</button>
      </header>

      {loadErrorMessage && (
        <p className="settings-page__error" role="alert">
          {loadErrorMessage} <button onClick={loadClipFileNames}>try again</button>
        </p>
      )}

      {clipFileNames === null ? (
        !loadErrorMessage && <p className="settings-page__empty">loading clips...</p>
      ) : (
        <>
          <ClipsSection clipFileNames={clipFileNames} onClipFileNamesChanged={setClipFileNames} />
          <RulesSection
            settings={settings}
            clipFileNames={clipFileNames}
            onSettingsSaved={onSettingsSaved}
            onTestEvent={onTestEvent}
          />
        </>
      )}
    </main>
  )
}

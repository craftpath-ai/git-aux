import { useEffect, useRef, useState } from 'react'
import type { GithubStatus } from '../../shared/githubStatus'
import type { Settings } from '../../shared/settings'
import {
  fetchClipFileNames,
  fetchGithubOrganizationMemberLogins,
  fetchGithubStatus,
  saveSettings,
} from '../api'
import type { GithubEvent } from '../celebration/githubEvent'
import { ClipsSection } from './ClipsSection'
import { GithubSection } from './GithubSection'
import { RulesSection } from './RulesSection'
import { createSettingsSaveQueue, type SettingsSave } from './settingsSaveQueue'

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
  const [githubStatus, setGithubStatus] = useState<GithubStatus | null>(null)
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null)
  // Members of the chosen organization, for the "who" dropdown. null means type a username instead.
  const [organizationMemberLogins, setOrganizationMemberLogins] = useState<string[] | null>(null)
  const [memberLoadErrorMessage, setMemberLoadErrorMessage] = useState<string | null>(null)
  // The organization picker and the rules list both replace the whole settings
  // file. Later saves wait and change the copy an earlier save stored, and the
  // other section's controls stay disabled until that line of saves is done.
  const onSettingsSavedRef = useRef(onSettingsSaved)
  onSettingsSavedRef.current = onSettingsSaved
  const enqueueSettingsSaveRef = useRef<SettingsSave | null>(null)
  const settingsSaveCountRef = useRef(0)
  const [isSettingsSaveBusy, setIsSettingsSaveBusy] = useState(false)

  function saveSettingsChange(update: (current: Settings) => Settings): Promise<void> {
    let enqueueSettingsSave = enqueueSettingsSaveRef.current
    if (enqueueSettingsSave === null) {
      enqueueSettingsSave = createSettingsSaveQueue(
        saveSettings,
        (savedSettings) => onSettingsSavedRef.current(savedSettings),
        settings,
      )
      enqueueSettingsSaveRef.current = enqueueSettingsSave
    }
    settingsSaveCountRef.current += 1
    setIsSettingsSaveBusy(true)
    return enqueueSettingsSave(update).finally(() => {
      settingsSaveCountRef.current -= 1
      if (settingsSaveCountRef.current === 0) setIsSettingsSaveBusy(false)
    })
  }

  function loadPage() {
    setLoadErrorMessage(null)
    Promise.all([fetchClipFileNames(), fetchGithubStatus()])
      .then(([loadedClipFileNames, loadedGithubStatus]) => {
        setClipFileNames(loadedClipFileNames)
        setGithubStatus(loadedGithubStatus)
      })
      .catch((error: Error) => setLoadErrorMessage(error.message))
  }

  useEffect(loadPage, [])

  const signedInGithubLogin = githubStatus?.signedInGithubLogin ?? null
  useEffect(() => {
    setOrganizationMemberLogins(null)
    setMemberLoadErrorMessage(null)
    if (!signedInGithubLogin || !settings.githubOrganizationLogin) return
    let isStale = false
    fetchGithubOrganizationMemberLogins()
      .then((memberLogins) => {
        if (!isStale) setOrganizationMemberLogins(memberLogins)
      })
      .catch((error: Error) => {
        if (isStale) return
        setMemberLoadErrorMessage(error.message)
        // The server signs out when GitHub rejects the token, so pick that up here.
        fetchGithubStatus().then(setGithubStatus, () => {})
      })
    // Ignores an answer that arrives after the organization changed again.
    return () => {
      isStale = true
    }
  }, [signedInGithubLogin, settings.githubOrganizationLogin])

  return (
    <main className="settings-page">
      <header className="settings-page__header">
        <h1>settings</h1>
        <button onClick={onClose}>back to screen</button>
      </header>

      {loadErrorMessage && (
        <p className="settings-page__error" role="alert">
          {loadErrorMessage} <button onClick={loadPage}>try again</button>
        </p>
      )}

      {clipFileNames === null || githubStatus === null ? (
        !loadErrorMessage && <p className="settings-page__empty">loading...</p>
      ) : (
        <>
          <GithubSection
            githubStatus={githubStatus}
            onGithubStatusChanged={setGithubStatus}
            settings={settings}
            isSettingsSaveBusy={isSettingsSaveBusy}
            onSaveSettings={saveSettingsChange}
            memberLoadErrorMessage={memberLoadErrorMessage}
          />
          <ClipsSection clipFileNames={clipFileNames} onClipFileNamesChanged={setClipFileNames} />
          <RulesSection
            settings={settings}
            clipFileNames={clipFileNames}
            organizationMemberLogins={organizationMemberLogins}
            isSettingsSaveBusy={isSettingsSaveBusy}
            onSaveSettings={saveSettingsChange}
            onTestEvent={onTestEvent}
          />
        </>
      )}
    </main>
  )
}

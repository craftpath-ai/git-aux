import { useEffect, useState } from 'react'
import type { GithubStatus } from '../../shared/githubStatus'
import type { Settings } from '../../shared/settings'
import { fetchClipFileNames, fetchGithubOrganizationMemberLogins, fetchGithubStatus } from '../api'
import type { GithubEvent } from '../celebration/githubEvent'
import { ClipsSection } from './ClipsSection'
import { GithubSection } from './GithubSection'
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
  const [githubStatus, setGithubStatus] = useState<GithubStatus | null>(null)
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null)
  // Members of the chosen organization, for the "who" dropdown. null means type a username instead.
  const [organizationMemberLogins, setOrganizationMemberLogins] = useState<string[] | null>(null)
  const [memberLoadErrorMessage, setMemberLoadErrorMessage] = useState<string | null>(null)

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
            onSettingsSaved={onSettingsSaved}
            memberLoadErrorMessage={memberLoadErrorMessage}
          />
          <ClipsSection clipFileNames={clipFileNames} onClipFileNamesChanged={setClipFileNames} />
          <RulesSection
            settings={settings}
            clipFileNames={clipFileNames}
            organizationMemberLogins={organizationMemberLogins}
            onSettingsSaved={onSettingsSaved}
            onTestEvent={onTestEvent}
          />
        </>
      )}
    </main>
  )
}

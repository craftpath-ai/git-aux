import { useEffect, useState } from 'react'
import type { GithubStatus } from '../../shared/githubStatus'
import type { Settings } from '../../shared/settings'
import {
  fetchGithubOrganizationLogins,
  fetchGithubStatus,
  saveSettings,
  signOutOfGithub,
  startGithubSignIn,
} from '../api'
import { useServerAction } from './useServerAction'

// How often the page asks the server whether the code has been entered yet.
const PENDING_SIGN_IN_CHECK_SECONDS = 2

type Props = {
  githubStatus: GithubStatus
  onGithubStatusChanged: (githubStatus: GithubStatus) => void
  settings: Settings
  onSettingsSaved: (settings: Settings) => void
  // Why the member list for the "who" dropdown could not load, if it failed.
  memberLoadErrorMessage: string | null
}

export function GithubSection({
  githubStatus,
  onGithubStatusChanged,
  settings,
  onSettingsSaved,
  memberLoadErrorMessage,
}: Props) {
  const { isBusy, errorMessage, runAction } = useServerAction()
  // null until loaded. Only loaded while someone is signed in.
  const [organizationLogins, setOrganizationLogins] = useState<string[] | null>(null)
  const { signedInGithubLogin, pendingSignIn } = githubStatus

  // While a code is showing, keep checking until the server says sign-in finished or stopped.
  useEffect(() => {
    if (!pendingSignIn) return
    const timer = setInterval(() => {
      fetchGithubStatus()
        .then(onGithubStatusChanged)
        .catch(() => {
          // The next check will try again.
        })
    }, PENDING_SIGN_IN_CHECK_SECONDS * 1000)
    return () => clearInterval(timer)
    // onGithubStatusChanged is a new function on every render, so it is left out on purpose.
  }, [pendingSignIn?.userCode])

  function loadOrganizationLogins() {
    runAction(async () => {
      setOrganizationLogins(await fetchGithubOrganizationLogins())
    })
  }

  useEffect(() => {
    setOrganizationLogins(null)
    if (signedInGithubLogin) loadOrganizationLogins()
  }, [signedInGithubLogin])

  function handleChooseOrganization(githubOrganizationLogin: string) {
    runAction(async () => {
      onSettingsSaved(
        await saveSettings({ ...settings, githubOrganizationLogin: githubOrganizationLogin || null }),
      )
    })
  }

  return (
    <section>
      <h2>github</h2>

      {errorMessage && (
        <p className="settings-page__error" role="alert">
          {errorMessage}
        </p>
      )}
      {githubStatus.signInErrorMessage && (
        <p className="settings-page__error" role="alert">
          {githubStatus.signInErrorMessage}
        </p>
      )}

      {!githubStatus.isSignInAvailable ? (
        <p className="settings-page__hint">
          GitHub sign-in is not set up in this copy of git-aux yet. To use your own GitHub App,
          start the server with GIT_AUX_GITHUB_CLIENT_ID set. The README explains how.
        </p>
      ) : pendingSignIn ? (
        <div className="settings-page__sign-in-code">
          <p className="settings-page__hint">
            Open{' '}
            <a href={pendingSignIn.verificationUrl} target="_blank" rel="noreferrer">
              {pendingSignIn.verificationUrl.replace(/^https:\/\//, '')}
            </a>{' '}
            on any device and enter this code:
          </p>
          <p className="settings-page__user-code">{pendingSignIn.userCode}</p>
          <p className="settings-page__hint">
            Only enter a code you started on this screen. If someone sends you a code, do not enter
            it: that would sign them in as you.
          </p>
          <p className="settings-page__hint">waiting for GitHub...</p>
          <button
            disabled={isBusy}
            onClick={() => runAction(async () => onGithubStatusChanged(await signOutOfGithub()))}
          >
            cancel
          </button>
        </div>
      ) : !signedInGithubLogin ? (
        <>
          <p className="settings-page__hint">
            Sign in so git-aux can see your organization. It can only read, never change anything.
          </p>
          <button
            disabled={isBusy}
            onClick={() => runAction(async () => onGithubStatusChanged(await startGithubSignIn()))}
          >
            sign in with GitHub
          </button>
        </>
      ) : (
        <>
          <div className="settings-page__signed-in">
            <span>
              signed in as <strong>{signedInGithubLogin}</strong>
            </span>
            <button
              disabled={isBusy}
              onClick={() => runAction(async () => onGithubStatusChanged(await signOutOfGithub()))}
            >
              sign out
            </button>
          </div>

          {organizationLogins === null ? (
            !errorMessage && <p className="settings-page__empty">loading organizations...</p>
          ) : organizationLogins.length === 0 && !settings.githubOrganizationLogin ? (
            <p className="settings-page__hint">
              git-aux is not installed on any organization you belong to.{' '}
              <a href={githubStatus.installUrl} target="_blank" rel="noreferrer">
                Install it
              </a>{' '}
              (an organization admin has to), then{' '}
              <button disabled={isBusy} onClick={loadOrganizationLogins}>
                check again
              </button>
            </p>
          ) : (
            <label className="settings-page__organization">
              organization
              <select
                disabled={isBusy}
                value={settings.githubOrganizationLogin ?? ''}
                onChange={(event) => handleChooseOrganization(event.target.value)}
              >
                <option value="">choose an organization</option>
                {/* Keeps the saved choice visible even if the app was removed from it. */}
                {settings.githubOrganizationLogin &&
                  !organizationLogins.includes(settings.githubOrganizationLogin) && (
                    <option value={settings.githubOrganizationLogin}>
                      {settings.githubOrganizationLogin} (not installed)
                    </option>
                  )}
                {organizationLogins.map((organizationLogin) => (
                  <option key={organizationLogin} value={organizationLogin}>
                    {organizationLogin}
                  </option>
                ))}
              </select>
            </label>
          )}

          {memberLoadErrorMessage && (
            <p className="settings-page__error" role="alert">
              {memberLoadErrorMessage}
            </p>
          )}
        </>
      )}
    </section>
  )
}

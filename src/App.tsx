import { useEffect, useState } from 'react'
import type { Settings } from '../shared/settings'
import { fetchSettings } from './api'
import { CelebrationScreen } from './celebration/CelebrationScreen'
import { clipForGithubEvent } from './celebration/clips'
import { addEventToQueue, removeEventFromQueue } from './celebration/eventQueue'
import type { GithubEvent } from './celebration/githubEvent'
import { IdleScreen } from './IdleScreen'
import { SettingsPage } from './settings/SettingsPage'
import { StartScreen } from './StartScreen'

const SETTINGS_PAGE_HASH = '#settings'
const SETTINGS_LOAD_RETRY_SECONDS = 2

export function App() {
  // Browsers block sound until someone has clicked the page once.
  const [hasStarted, setHasStarted] = useState(false)
  const [eventQueue, setEventQueue] = useState<GithubEvent[]>([])
  // null until a load succeeds. A failed load must not look like "no rules":
  // saving on top of an empty list would erase the rules on disk.
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isSettingsPageOpen, setIsSettingsPageOpen] = useState(
    window.location.hash === SETTINGS_PAGE_HASH,
  )

  useEffect(() => {
    // The page can open before the server is up, so keep trying until a load succeeds.
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let isStopped = false

    function loadSettings() {
      fetchSettings()
        .then((loadedSettings) => {
          if (!isStopped) setSettings(loadedSettings)
        })
        .catch((error: Error) => {
          console.error(`git-aux: ${error.message}`)
          if (!isStopped) retryTimer = setTimeout(loadSettings, SETTINGS_LOAD_RETRY_SECONDS * 1000)
        })
    }

    loadSettings()
    return () => {
      isStopped = true
      clearTimeout(retryTimer)
    }
  }, [])

  function openOrCloseSettingsPage(isOpen: boolean) {
    // Keeping this in the address means a reload stays on the same page.
    window.history.replaceState(null, '', isOpen ? SETTINGS_PAGE_HASH : window.location.pathname)
    setIsSettingsPageOpen(isOpen)
  }

  if (!hasStarted) {
    return <StartScreen onStart={() => setHasStarted(true)} />
  }

  const currentEvent = eventQueue[0]
  if (currentEvent) {
    return (
      <CelebrationScreen
        // A new key makes React build a fresh screen, so each clip starts from zero.
        key={currentEvent.id}
        event={currentEvent}
        clip={clipForGithubEvent(currentEvent, settings?.clipRules ?? [])}
        eventsWaitingCount={eventQueue.length - 1}
        onFinished={() => setEventQueue((queue) => removeEventFromQueue(queue, currentEvent.id))}
      />
    )
  }

  if (isSettingsPageOpen) {
    if (settings === null) {
      return (
        <main className="settings-page">
          <p className="settings-page__empty">loading settings...</p>
        </main>
      )
    }
    return (
      <SettingsPage
        settings={settings}
        onSettingsSaved={setSettings}
        onTestEvent={(event) => setEventQueue((queue) => addEventToQueue(queue, event))}
        onClose={() => openOrCloseSettingsPage(false)}
      />
    )
  }

  return <IdleScreen onOpenSettings={() => openOrCloseSettingsPage(true)} />
}

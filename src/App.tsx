import { useEffect, useState } from 'react'
import { EMPTY_SETTINGS, type Settings } from '../shared/settings'
import { fetchSettings } from './api'
import { CelebrationScreen } from './celebration/CelebrationScreen'
import { clipForGithubEvent } from './celebration/clips'
import { addEventToQueue, removeEventFromQueue } from './celebration/eventQueue'
import type { GithubEvent } from './celebration/githubEvent'
import { IdleScreen } from './IdleScreen'
import { SettingsPage } from './settings/SettingsPage'
import { StartScreen } from './StartScreen'

const SETTINGS_PAGE_HASH = '#settings'

export function App() {
  // Browsers block sound until someone has clicked the page once.
  const [hasStarted, setHasStarted] = useState(false)
  const [eventQueue, setEventQueue] = useState<GithubEvent[]>([])
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS)
  const [isSettingsPageOpen, setIsSettingsPageOpen] = useState(
    window.location.hash === SETTINGS_PAGE_HASH,
  )

  useEffect(() => {
    fetchSettings()
      .then(setSettings)
      .catch((error: Error) => console.error(`git-aux: ${error.message}`))
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
        clip={clipForGithubEvent(currentEvent, settings.clipRules)}
        eventsWaitingCount={eventQueue.length - 1}
        onFinished={() => setEventQueue((queue) => removeEventFromQueue(queue, currentEvent.id))}
      />
    )
  }

  if (isSettingsPageOpen) {
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

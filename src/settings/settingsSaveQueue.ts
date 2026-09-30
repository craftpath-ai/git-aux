import type { Settings } from '../../shared/settings'

export type SettingsSave = (update: (current: Settings) => Settings) => Promise<void>

// One line of settings saves. The organization picker and the rules list both
// replace the whole settings file. Each save changes the copy the previous
// save stored, so the later one cannot put a stale organization or rule list back.
export function createSettingsSaveQueue(
  save: (settings: Settings) => Promise<Settings>,
  onSaved: (settings: Settings) => void,
  initialSettings: Settings,
): SettingsSave {
  let latestSettings = initialSettings
  let queue: Promise<void> = Promise.resolve()

  return (update) => {
    const savePromise = queue.then(async () => {
      const savedSettings = await save(update(latestSettings))
      latestSettings = savedSettings
      onSaved(savedSettings)
    })
    // A failed save must not leave the next one waiting forever.
    queue = savePromise.then(
      () => {},
      () => {},
    )
    return savePromise
  }
}

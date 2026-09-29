import fs from 'node:fs/promises'
import path from 'node:path'
import { EMPTY_SETTINGS, parseSettings, type Settings } from '../shared/settings'

function settingsFilePath(dataDirectory: string): string {
  return path.join(dataDirectory, 'settings.json')
}

export async function readSettings(dataDirectory: string): Promise<Settings> {
  let fileText: string
  try {
    fileText = await fs.readFile(settingsFilePath(dataDirectory), 'utf8')
  } catch (error) {
    // No file yet just means nothing has been saved.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return EMPTY_SETTINGS
    throw error
  }
  return parseSettings(JSON.parse(fileText))
}

export async function writeSettings(dataDirectory: string, settings: Settings): Promise<void> {
  // Write to a temporary file, then rename it over the real one. A crash halfway
  // through then leaves the old settings intact instead of a half-written file.
  const temporaryFilePath = `${settingsFilePath(dataDirectory)}.tmp`
  await fs.writeFile(temporaryFilePath, JSON.stringify(settings, null, 2))
  await fs.rename(temporaryFilePath, settingsFilePath(dataDirectory))
}

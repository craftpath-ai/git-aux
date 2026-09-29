import os from 'node:os'
import path from 'node:path'

// Settings and uploaded clips live outside the repo, so they can never be committed.
// GIT_AUX_DATA_DIRECTORY overrides the location.
export function defaultDataDirectory(): string {
  return process.env.GIT_AUX_DATA_DIRECTORY ?? path.join(os.homedir(), '.git-aux')
}

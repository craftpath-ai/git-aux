import fs from 'node:fs/promises'
import path from 'node:path'

// What GitHub gave us when someone signed in. Stays on this machine: the page never sees it.
export type GithubToken = {
  // Sent with every request to GitHub. Read-only, and only for installed organizations.
  accessToken: string
  // When accessToken stops working, in milliseconds since 1970. null means it never expires.
  accessTokenExpiresAtMs: number | null
  // Trades for a new accessToken without signing in again. null when GitHub gave none.
  refreshToken: string | null
  // When refreshToken stops working, in milliseconds since 1970. null means it never expires.
  refreshTokenExpiresAtMs: number | null
  // GitHub username of the person who signed in.
  githubLogin: string
}

// Only the owner of the file can read or change it.
const OWNER_ONLY_FILE_MODE = 0o600

function tokenFilePath(dataDirectory: string): string {
  return path.join(dataDirectory, 'github-token.json')
}

export async function readGithubToken(dataDirectory: string): Promise<GithubToken | null> {
  let fileText: string
  try {
    fileText = await fs.readFile(tokenFilePath(dataDirectory), 'utf8')
  } catch (error) {
    // No file just means nobody has signed in.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
  try {
    const token = JSON.parse(fileText)
    if (typeof token.accessToken !== 'string' || typeof token.githubLogin !== 'string') return null
    return token
  } catch {
    // A damaged file is treated as signed out; signing in again replaces it.
    return null
  }
}

export async function writeGithubToken(dataDirectory: string, token: GithubToken): Promise<void> {
  // Same write-then-rename as the settings file, so a crash never leaves half a token.
  const temporaryFilePath = `${tokenFilePath(dataDirectory)}.tmp`
  await fs.writeFile(temporaryFilePath, JSON.stringify(token, null, 2), { mode: OWNER_ONLY_FILE_MODE })
  // The mode above only applies when the file is new, so set it again in case it was not.
  await fs.chmod(temporaryFilePath, OWNER_ONLY_FILE_MODE)
  await fs.rename(temporaryFilePath, tokenFilePath(dataDirectory))
}

export async function deleteGithubToken(dataDirectory: string): Promise<void> {
  await fs.rm(tokenFilePath(dataDirectory), { force: true })
}

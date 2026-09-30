import type { GithubStatus } from '../shared/githubStatus'
import type { Settings } from '../shared/settings'

// Every call throws an Error with the server's plain-English message when it fails.

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (typeof body.error === 'string') return body.error
  } catch {
    // The body was not JSON. Fall through to the generic message.
  }
  return `The server answered with an error (${response.status}).`
}

async function request(url: string, options?: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await fetch(url, options)
  } catch {
    throw new Error('Could not reach the git-aux server. Is it running?')
  }
  if (!response.ok) throw new Error(await readErrorMessage(response))
  return response
}

export async function fetchSettings(): Promise<Settings> {
  return (await request('/api/settings')).json()
}

// Sends only the fields that changed. The server merges them into the saved settings
// and answers with the full result.
export async function updateSettings(changedFields: Partial<Settings>): Promise<Settings> {
  const response = await request('/api/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changedFields),
  })
  return response.json()
}

export async function fetchClipFileNames(): Promise<string[]> {
  const body = await (await request('/api/clips')).json()
  return body.clipFileNames
}

export async function uploadClip(clipFileName: string, file: File): Promise<void> {
  await request(`/api/clips/${encodeURIComponent(clipFileName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: file,
  })
}

export async function deleteClip(clipFileName: string): Promise<void> {
  await request(`/api/clips/${encodeURIComponent(clipFileName)}`, { method: 'DELETE' })
}

export async function fetchGithubStatus(): Promise<GithubStatus> {
  return (await request('/api/github/status')).json()
}

export async function startGithubSignIn(): Promise<GithubStatus> {
  return (await request('/api/github/sign-in', { method: 'POST' })).json()
}

export async function signOutOfGithub(): Promise<GithubStatus> {
  return (await request('/api/github/sign-out', { method: 'POST' })).json()
}

export async function fetchGithubOrganizationLogins(): Promise<string[]> {
  return (await (await request('/api/github/organizations')).json()).organizationLogins
}

export async function fetchGithubOrganizationMemberLogins(): Promise<string[]> {
  return (await (await request('/api/github/organization-members')).json()).githubLogins
}

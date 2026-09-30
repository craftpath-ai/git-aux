import type { GithubStatus } from '../shared/githubStatus'
import { githubAppInstallUrl, type GithubAppConfig } from './githubAppConfig'
import {
  deleteGithubToken,
  readGithubToken,
  writeGithubToken,
  type GithubToken,
} from './githubTokenFile'

// Signing in uses GitHub's "device flow":
//   1. We ask GitHub for a short code, like "WDJB-MJHT", and show it on the settings page.
//   2. The person types it in at github.com/login/device, on any device, and approves.
//   3. Meanwhile we keep asking GitHub "approved yet?" until it hands over a token.
// No password or client secret ever touches git-aux.

const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code'
const GITHUB_ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_API_URL = 'https://api.github.com'

// Refresh a little before the token runs out, so a request never goes out with a dying token.
const REFRESH_MARGIN_MS = 60 * 1000
// GitHub asks for at least 5 seconds between "approved yet?" checks.
const MIN_CHECK_INTERVAL_SECONDS = 5
// GitHub's own rule: after a "slow_down" answer, wait 5 seconds longer each time.
const SLOW_DOWN_EXTRA_SECONDS = 5

// Thrown when a GitHub request fails. status is the HTTP status our own API should answer with.
export class GithubConnectionError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

type PendingSignIn = {
  deviceCode: string
  userCode: string
  verificationUrl: string
  expiresAtMs: number
  checkIntervalSeconds: number
}

type Options = {
  dataDirectory: string
  appConfig: GithubAppConfig
  // Tests swap these out, so no real request reaches GitHub and no real time passes.
  fetchFunction?: typeof fetch
  getNowMs?: () => number
  scheduleLater?: (callback: () => void, delayMs: number) => void
}

export function createGithubConnection({
  dataDirectory,
  appConfig,
  fetchFunction = fetch,
  getNowMs = Date.now,
  scheduleLater = (callback, delayMs) => setTimeout(callback, delayMs),
}: Options) {
  let pendingSignIn: PendingSignIn | null = null
  let signInErrorMessage: string | null = null
  // Goes up with every new attempt or sign-out, so checks left over from an old attempt stop.
  let signInAttemptNumber = 0
  // Shared by requests that need a refresh at the same moment. A refresh token only works
  // once, so two refreshes at once would make the second fail and sign everyone out.
  let refreshInProgress: Promise<string> | null = null

  async function postToGithubLogin(url: string, fields: Record<string, string>) {
    let response: Response
    try {
      response = await fetchFunction(url, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(fields),
      })
    } catch {
      throw new GithubConnectionError('Could not reach GitHub. Is this machine online?', 502)
    }
    if (!response.ok) {
      throw new GithubConnectionError(`GitHub answered with an error (${response.status}).`, 502)
    }
    return response.json()
  }

  function tokenFromGithubAnswer(answer: Record<string, unknown>, githubLogin: string): GithubToken {
    const nowMs = getNowMs()
    // Answers without these fields come from apps that turned token expiry off.
    return {
      accessToken: String(answer.access_token),
      accessTokenExpiresAtMs:
        typeof answer.expires_in === 'number' ? nowMs + answer.expires_in * 1000 : null,
      refreshToken: typeof answer.refresh_token === 'string' ? answer.refresh_token : null,
      refreshTokenExpiresAtMs:
        typeof answer.refresh_token_expires_in === 'number'
          ? nowMs + answer.refresh_token_expires_in * 1000
          : null,
      githubLogin,
    }
  }

  async function startSignIn(): Promise<void> {
    if (!appConfig.clientId) {
      throw new GithubConnectionError('GitHub sign-in is not set up for this copy of git-aux.', 409)
    }
    signInAttemptNumber += 1
    const attemptNumber = signInAttemptNumber
    pendingSignIn = null
    signInErrorMessage = null

    const answer = await postToGithubLogin(GITHUB_DEVICE_CODE_URL, { client_id: appConfig.clientId })
    if (typeof answer.device_code !== 'string') {
      throw new GithubConnectionError(signInFailureMessage(answer.error), 502)
    }
    pendingSignIn = {
      deviceCode: answer.device_code,
      userCode: answer.user_code,
      verificationUrl: answer.verification_uri,
      expiresAtMs: getNowMs() + answer.expires_in * 1000,
      checkIntervalSeconds: Math.max(answer.interval ?? 0, MIN_CHECK_INTERVAL_SECONDS),
    }
    scheduleCheck(attemptNumber)
  }

  function scheduleCheck(attemptNumber: number) {
    if (!pendingSignIn) return
    scheduleLater(() => {
      checkPendingSignIn(attemptNumber).catch((error: Error) => {
        if (attemptNumber !== signInAttemptNumber) return
        pendingSignIn = null
        signInErrorMessage = error.message
      })
    }, pendingSignIn.checkIntervalSeconds * 1000)
  }

  // Asks GitHub once whether the code has been approved, then schedules the next check.
  async function checkPendingSignIn(attemptNumber: number): Promise<void> {
    const signIn = pendingSignIn
    if (!signIn || attemptNumber !== signInAttemptNumber) return
    if (getNowMs() >= signIn.expiresAtMs) {
      pendingSignIn = null
      signInErrorMessage = 'The code ran out before it was entered. Start sign-in again.'
      return
    }

    const answer = await postToGithubLogin(GITHUB_ACCESS_TOKEN_URL, {
      client_id: appConfig.clientId,
      device_code: signIn.deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    })
    // Sign-out or a new attempt may have happened while we waited for GitHub.
    if (attemptNumber !== signInAttemptNumber) return

    if (answer.error === 'authorization_pending') {
      scheduleCheck(attemptNumber)
      return
    }
    if (answer.error === 'slow_down') {
      signIn.checkIntervalSeconds =
        typeof answer.interval === 'number'
          ? answer.interval
          : signIn.checkIntervalSeconds + SLOW_DOWN_EXTRA_SECONDS
      scheduleCheck(attemptNumber)
      return
    }
    if (typeof answer.access_token !== 'string') {
      throw new GithubConnectionError(signInFailureMessage(answer.error), 502)
    }

    const githubLogin = await fetchSignedInGithubLogin(answer.access_token)
    if (attemptNumber !== signInAttemptNumber) return
    await writeGithubToken(dataDirectory, tokenFromGithubAnswer(answer, githubLogin))
    pendingSignIn = null
  }

  async function fetchSignedInGithubLogin(accessToken: string): Promise<string> {
    const response = await requestGithubApi(`${GITHUB_API_URL}/user`, accessToken)
    if (!response.ok) {
      throw new GithubConnectionError(`GitHub answered with an error (${response.status}).`, 502)
    }
    return (await response.json()).login
  }

  async function getStatus(): Promise<GithubStatus> {
    const token = await readGithubToken(dataDirectory)
    return {
      isSignInAvailable: appConfig.clientId !== '',
      installUrl: githubAppInstallUrl(appConfig),
      signedInGithubLogin: token?.githubLogin ?? null,
      pendingSignIn: pendingSignIn && {
        userCode: pendingSignIn.userCode,
        verificationUrl: pendingSignIn.verificationUrl,
        expiresAt: new Date(pendingSignIn.expiresAtMs).toISOString(),
      },
      signInErrorMessage,
    }
  }

  // Forgets the token on this machine. GitHub only lets an app revoke a token with its
  // client secret, which git-aux does not have, so the README explains how to revoke it there.
  async function signOut(): Promise<void> {
    signInAttemptNumber += 1
    pendingSignIn = null
    signInErrorMessage = null
    await deleteGithubToken(dataDirectory)
  }

  async function signOutBecauseTokenStopped(): Promise<never> {
    await signOut()
    throw new GithubConnectionError('The GitHub sign-in has ended. Sign in again.', 401)
  }

  // Returns a working access token, refreshing it first if it has run out.
  async function validAccessToken(): Promise<string> {
    const token = await readGithubToken(dataDirectory)
    if (!token) throw new GithubConnectionError('Sign in to GitHub first.', 401)

    const nowMs = getNowMs()
    const isAccessTokenFresh =
      token.accessTokenExpiresAtMs === null || token.accessTokenExpiresAtMs - REFRESH_MARGIN_MS > nowMs
    if (isAccessTokenFresh) return token.accessToken

    const canRefresh =
      token.refreshToken !== null &&
      (token.refreshTokenExpiresAtMs === null || token.refreshTokenExpiresAtMs > nowMs)
    if (!canRefresh) return signOutBecauseTokenStopped()

    refreshInProgress ??= refreshAccessToken(token).finally(() => {
      refreshInProgress = null
    })
    return refreshInProgress
  }

  async function refreshAccessToken(token: GithubToken): Promise<string> {
    const answer = await postToGithubLogin(GITHUB_ACCESS_TOKEN_URL, {
      client_id: appConfig.clientId,
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken!,
    })
    if (typeof answer.access_token !== 'string') return signOutBecauseTokenStopped()
    const refreshedToken = tokenFromGithubAnswer(answer, token.githubLogin)
    await writeGithubToken(dataDirectory, refreshedToken)
    return refreshedToken.accessToken
  }

  async function requestGithubApi(url: string, accessToken: string): Promise<Response> {
    try {
      return await fetchFunction(url, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${accessToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      })
    } catch {
      throw new GithubConnectionError('Could not reach GitHub. Is this machine online?', 502)
    }
  }

  // Reads a GitHub API address that answers with a list, following every page.
  async function githubApiGetAllPages<Item>(
    apiPath: string,
    readItems: (body: any) => Item[],
    notFoundMessage = 'GitHub could not find that.',
  ) {
    const items: Item[] = []
    let url: string | null = `${GITHUB_API_URL}${apiPath}`
    while (url) {
      const response = await requestGithubApi(url, await validAccessToken())
      if (response.status === 401) return signOutBecauseTokenStopped()
      if (response.status === 404) throw new GithubConnectionError(notFoundMessage, 404)
      if (!response.ok) throw new GithubConnectionError(`GitHub answered with an error (${response.status}).`, 502)
      items.push(...readItems(await response.json()))
      url = nextPageUrl(response.headers.get('link'))
    }
    return items
  }

  // Organizations where the app is installed and the signed-in person can see it.
  async function listInstalledOrganizationLogins(): Promise<string[]> {
    const installations = await githubApiGetAllPages(
      '/user/installations?per_page=100',
      (body) => body.installations as { account: { login: string; type: string } }[],
    )
    return installations
      .filter((installation) => installation.account.type === 'Organization')
      .map((installation) => installation.account.login)
      .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
  }

  async function listOrganizationMemberLogins(organizationLogin: string): Promise<string[]> {
    const members = await githubApiGetAllPages(
      `/orgs/${encodeURIComponent(organizationLogin)}/members?per_page=100`,
      (body) => body as { login: string }[],
      `git-aux cannot see ${organizationLogin}. An admin of it needs to install the app.`,
    )
    return members
      .map((member) => member.login)
      .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
  }

  return {
    startSignIn,
    getStatus,
    signOut,
    listInstalledOrganizationLogins,
    listOrganizationMemberLogins,
  }
}

export type GithubConnection = ReturnType<typeof createGithubConnection>

function signInFailureMessage(githubErrorCode: unknown): string {
  switch (githubErrorCode) {
    case 'access_denied':
      return 'Sign-in was cancelled on GitHub.'
    case 'expired_token':
      return 'The code ran out before it was entered. Start sign-in again.'
    case 'device_flow_disabled':
      return 'This GitHub App does not allow device sign-in. Turn on "Enable Device Flow" in its settings.'
    case 'incorrect_client_credentials':
      return 'GitHub does not recognize this app\'s client ID.'
    default:
      return `GitHub sign-in failed (${String(githubErrorCode ?? 'no reason given')}).`
  }
}

// GitHub splits long lists into pages and puts the next page's address in the Link header.
function nextPageUrl(linkHeader: string | null): string | null {
  const match = linkHeader?.match(/<([^>]+)>;\s*rel="next"/)
  // Only follow addresses on GitHub's API, so the token is never sent anywhere else.
  if (!match || !match[1].startsWith(`${GITHUB_API_URL}/`)) return null
  return match[1]
}

// Which GitHub App git-aux signs in through.
//
// By default everyone uses the shared git-aux app, so nobody has to register their own.
// Its client ID is public by design (it is only a name tag, not a password), so it is
// safe to keep here. An organization that would rather not trust the shared app can
// register its own and point git-aux at it with the two environment variables below.

// Left empty until the shared app is registered. Sign-in stays off until then.
const SHARED_GITHUB_APP_CLIENT_ID = ''
const SHARED_GITHUB_APP_SLUG = 'git-aux'

export type GithubAppConfig = {
  // Starts with "Iv". Empty means no app is set up, so sign-in is turned off.
  clientId: string
  // The app's name in its GitHub address, as in github.com/apps/<slug>.
  appSlug: string
}

export function githubAppConfigFromEnvironment(): GithubAppConfig {
  return {
    clientId: process.env.GIT_AUX_GITHUB_CLIENT_ID ?? SHARED_GITHUB_APP_CLIENT_ID,
    appSlug: process.env.GIT_AUX_GITHUB_APP_SLUG ?? SHARED_GITHUB_APP_SLUG,
  }
}

// Where an organization admin goes to let the app see their organization.
export function githubAppInstallUrl({ appSlug }: GithubAppConfig): string {
  return `https://github.com/apps/${encodeURIComponent(appSlug)}/installations/new`
}

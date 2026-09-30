// What the settings page knows about the GitHub connection. Never includes the token.
export type GithubStatus = {
  // false when no GitHub App client ID is set up, so the sign-in button cannot work.
  isSignInAvailable: boolean
  // Where an organization admin installs the app so git-aux can see the organization.
  installUrl: string
  // GitHub username of whoever is signed in, or null when nobody is.
  signedInGithubLogin: string | null
  // Set while waiting for someone to enter the code on github.com.
  pendingSignIn: {
    userCode: string
    verificationUrl: string
    expiresAt: string
  } | null
  // Why the last sign-in attempt stopped, if it failed.
  signInErrorMessage: string | null
}

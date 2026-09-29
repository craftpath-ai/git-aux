import type { GithubEventKind } from '../../shared/settings'

// One thing that happened on GitHub. The GitHub poller will produce these later;
// for now the test buttons on the settings page do.
export type GithubEvent = {
  // Unique per event, so the queue can tell two events apart.
  id: string
  eventKind: GithubEventKind
  pullRequestUrl: string
  pullRequestNumber: number
  pullRequestTitle: string
  repositoryName: string
  // GitHub username of the person who did it. For failed checks, the pull request's author.
  githubLogin: string
}

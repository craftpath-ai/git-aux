import type { GithubEventKind } from '../../shared/settings'
import type { GithubEvent } from '../celebration/githubEvent'

let nextTestPullRequestNumber = 1

// A made-up event, for hearing what a rule will sound like.
export function makeTestEvent(eventKind: GithubEventKind, githubLogin: string | null): GithubEvent {
  const pullRequestNumber = nextTestPullRequestNumber++
  return {
    id: `test-${pullRequestNumber}`,
    eventKind,
    pullRequestUrl: `https://github.com/example/app/pull/${pullRequestNumber}`,
    pullRequestNumber,
    pullRequestTitle: 'Make the login button work on mobile',
    repositoryName: 'example/app',
    githubLogin: githubLogin ?? 'someone',
  }
}

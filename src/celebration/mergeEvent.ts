// One merged pull request. The GitHub poller will produce these later;
// for now the test buttons on the idle screen do.
export type MergeEvent = {
  // Unique per pull request, so it doubles as the event's id.
  pullRequestUrl: string
  pullRequestNumber: number
  pullRequestTitle: string
  repositoryName: string
  // GitHub username of the person who merged.
  githubLogin: string
}

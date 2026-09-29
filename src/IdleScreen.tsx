import type { MergeEvent } from './celebration/mergeEvent'

// Placeholder until the leaderboard grid is built.
export function IdleScreen({ onTestMerge }: { onTestMerge: (merge: MergeEvent) => void }) {
  return (
    <main className="idle-screen">
      <h1 className="idle-screen__title">git-aux</h1>
      <p className="idle-screen__status">waiting for merges</p>
      {import.meta.env.DEV && (
        <div className="idle-screen__test-buttons">
          <button onClick={() => onTestMerge(testMergeBy('octocat'))}>test merge: video clip</button>
          <button onClick={() => onTestMerge(testMergeBy('someone-unmapped'))}>
            test merge: default sound
          </button>
          <button
            onClick={() => {
              onTestMerge(testMergeBy('octocat'))
              onTestMerge(testMergeBy('someone-unmapped'))
            }}
          >
            test two merges at once
          </button>
        </div>
      )}
    </main>
  )
}

let nextTestPullRequestNumber = 1

function testMergeBy(githubLogin: string): MergeEvent {
  const pullRequestNumber = nextTestPullRequestNumber++
  return {
    pullRequestUrl: `https://github.com/example/app/pull/${pullRequestNumber}`,
    pullRequestNumber,
    pullRequestTitle: 'Make the login button work on mobile',
    repositoryName: 'example/app',
    githubLogin,
  }
}

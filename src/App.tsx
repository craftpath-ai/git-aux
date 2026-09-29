import { useState } from 'react'
import { CelebrationScreen } from './celebration/CelebrationScreen'
import { clipForGithubLogin } from './celebration/clips'
import type { MergeEvent } from './celebration/mergeEvent'
import { addMergeToQueue, removeMergeFromQueue } from './celebration/mergeQueue'
import clipsConfig from './clips.json'
import { IdleScreen } from './IdleScreen'
import { StartScreen } from './StartScreen'

export function App() {
  // Browsers block sound until someone has clicked the page once.
  const [hasStarted, setHasStarted] = useState(false)
  const [mergeQueue, setMergeQueue] = useState<MergeEvent[]>([])

  if (!hasStarted) {
    return <StartScreen onStart={() => setHasStarted(true)} />
  }

  const currentMerge = mergeQueue[0]
  if (!currentMerge) {
    return <IdleScreen onTestMerge={(merge) => setMergeQueue((queue) => addMergeToQueue(queue, merge))} />
  }

  return (
    <CelebrationScreen
      // A new key makes React build a fresh screen, so each clip starts from zero.
      key={currentMerge.pullRequestUrl}
      merge={currentMerge}
      clip={clipForGithubLogin(currentMerge.githubLogin, clipsConfig)}
      mergesWaitingCount={mergeQueue.length - 1}
      onFinished={() =>
        setMergeQueue((queue) => removeMergeFromQueue(queue, currentMerge.pullRequestUrl))
      }
    />
  )
}

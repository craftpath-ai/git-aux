import type { MergeEvent } from './mergeEvent'

// Merges wait in line and play one at a time. The first item is the one on screen.

export function addMergeToQueue(queue: MergeEvent[], merge: MergeEvent): MergeEvent[] {
  const isAlreadyQueued = queue.some((queued) => queued.pullRequestUrl === merge.pullRequestUrl)
  return isAlreadyQueued ? queue : [...queue, merge]
}

export function removeMergeFromQueue(queue: MergeEvent[], pullRequestUrl: string): MergeEvent[] {
  return queue.filter((queued) => queued.pullRequestUrl !== pullRequestUrl)
}

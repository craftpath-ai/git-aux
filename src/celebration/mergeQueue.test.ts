import { describe, expect, it } from 'vitest'
import type { MergeEvent } from './mergeEvent'
import { addMergeToQueue, removeMergeFromQueue } from './mergeQueue'

function mergeNumbered(pullRequestNumber: number): MergeEvent {
  return {
    pullRequestUrl: `https://github.com/acme/app/pull/${pullRequestNumber}`,
    pullRequestNumber,
    pullRequestTitle: 'Fix thing',
    repositoryName: 'acme/app',
    githubLogin: 'octocat',
  }
}

describe('addMergeToQueue', () => {
  it('adds new merges to the back of the line', () => {
    const queue = addMergeToQueue([mergeNumbered(1)], mergeNumbered(2))
    expect(queue.map((merge) => merge.pullRequestNumber)).toEqual([1, 2])
  })

  it('ignores a merge that is already queued', () => {
    const queue = addMergeToQueue([mergeNumbered(1)], mergeNumbered(1))
    expect(queue).toHaveLength(1)
  })
})

describe('removeMergeFromQueue', () => {
  it('removes only the named merge', () => {
    const queue = removeMergeFromQueue([mergeNumbered(1), mergeNumbered(2)], mergeNumbered(1).pullRequestUrl)
    expect(queue.map((merge) => merge.pullRequestNumber)).toEqual([2])
  })

  it('does nothing when the merge is already gone', () => {
    const queue = removeMergeFromQueue([mergeNumbered(2)], mergeNumbered(1).pullRequestUrl)
    expect(queue).toHaveLength(1)
  })
})

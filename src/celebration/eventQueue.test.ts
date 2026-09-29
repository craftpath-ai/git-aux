import { describe, expect, it } from 'vitest'
import { addEventToQueue, removeEventFromQueue } from './eventQueue'
import type { GithubEvent } from './githubEvent'

function eventNumbered(pullRequestNumber: number): GithubEvent {
  return {
    id: `merged-${pullRequestNumber}`,
    eventKind: 'pull_request_merged',
    pullRequestUrl: `https://github.com/acme/app/pull/${pullRequestNumber}`,
    pullRequestNumber,
    pullRequestTitle: 'Fix thing',
    repositoryName: 'acme/app',
    githubLogin: 'octocat',
  }
}

describe('addEventToQueue', () => {
  it('adds new events to the back of the line', () => {
    const queue = addEventToQueue([eventNumbered(1)], eventNumbered(2))
    expect(queue.map((event) => event.pullRequestNumber)).toEqual([1, 2])
  })

  it('ignores an event that is already queued', () => {
    const queue = addEventToQueue([eventNumbered(1)], eventNumbered(1))
    expect(queue).toHaveLength(1)
  })
})

describe('removeEventFromQueue', () => {
  it('removes only the named event', () => {
    const queue = removeEventFromQueue([eventNumbered(1), eventNumbered(2)], eventNumbered(1).id)
    expect(queue.map((event) => event.pullRequestNumber)).toEqual([2])
  })

  it('does nothing when the event is already gone', () => {
    const queue = removeEventFromQueue([eventNumbered(2)], eventNumbered(1).id)
    expect(queue).toHaveLength(1)
  })
})

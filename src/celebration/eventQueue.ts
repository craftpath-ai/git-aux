import type { GithubEvent } from './githubEvent'

// Events wait in line and play one at a time. The first item is the one on screen.

export function addEventToQueue(queue: GithubEvent[], event: GithubEvent): GithubEvent[] {
  const isAlreadyQueued = queue.some((queued) => queued.id === event.id)
  return isAlreadyQueued ? queue : [...queue, event]
}

export function removeEventFromQueue(queue: GithubEvent[], eventId: string): GithubEvent[] {
  return queue.filter((queued) => queued.id !== eventId)
}

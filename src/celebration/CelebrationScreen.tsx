import { useEffect, useState } from 'react'
import { GITHUB_EVENT_KIND_LABELS } from '../../shared/settings'
import { MAX_CLIP_SECONDS, type Clip } from './clips'
import type { GithubEvent } from './githubEvent'

// How long the card stays up when the clip file is missing or unplayable.
const FAILED_CLIP_SECONDS = 5

type Props = {
  event: GithubEvent
  clip: Clip
  eventsWaitingCount: number
  onFinished: () => void
}

export function CelebrationScreen({ event, clip, eventsWaitingCount, onFinished }: Props) {
  const [hasClipFailed, setHasClipFailed] = useState(false)

  useEffect(() => {
    const secondsOnScreen = hasClipFailed ? FAILED_CLIP_SECONDS : MAX_CLIP_SECONDS
    const timer = setTimeout(onFinished, secondsOnScreen * 1000)
    return () => clearTimeout(timer)
    // onFinished is a new function on every render, so it is left out on purpose.
  }, [hasClipFailed])

  function handleClipError() {
    console.error(`git-aux: could not play ${clip.url}`)
    setHasClipFailed(true)
  }

  return (
    <main className="celebration-screen">
      {clip.kind === 'video' && !hasClipFailed && (
        <video
          className="celebration-screen__video"
          src={clip.url}
          autoPlay
          playsInline
          onEnded={onFinished}
          onError={handleClipError}
        />
      )}
      {clip.kind === 'audio' && !hasClipFailed && (
        <audio src={clip.url} autoPlay onEnded={onFinished} onError={handleClipError} />
      )}
      {(clip.kind === 'audio' || hasClipFailed) && <div className="celebration-screen__dots" />}

      <div className="celebration-screen__text">
        <p className="celebration-screen__label">{GITHUB_EVENT_KIND_LABELS[event.eventKind]}</p>
        <h1 className="celebration-screen__login">{event.githubLogin}</h1>
        <p className="celebration-screen__title">{event.pullRequestTitle}</p>
        <p className="celebration-screen__repository">
          {event.repositoryName} #{event.pullRequestNumber}
        </p>
      </div>

      {eventsWaitingCount > 0 && (
        <p className="celebration-screen__waiting">+{eventsWaitingCount} more</p>
      )}
    </main>
  )
}

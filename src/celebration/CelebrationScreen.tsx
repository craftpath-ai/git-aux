import { useEffect, useState } from 'react'
import { MAX_CLIP_SECONDS, type Clip } from './clips'
import type { MergeEvent } from './mergeEvent'

// How long the card stays up when the clip file is missing or unplayable.
const FAILED_CLIP_SECONDS = 5

type Props = {
  merge: MergeEvent
  clip: Clip
  mergesWaitingCount: number
  onFinished: () => void
}

export function CelebrationScreen({ merge, clip, mergesWaitingCount, onFinished }: Props) {
  const [hasClipFailed, setHasClipFailed] = useState(false)
  const clipUrl = `/media/${clip.fileName}`

  useEffect(() => {
    const secondsOnScreen = hasClipFailed ? FAILED_CLIP_SECONDS : MAX_CLIP_SECONDS
    const timer = setTimeout(onFinished, secondsOnScreen * 1000)
    return () => clearTimeout(timer)
    // onFinished is a new function on every render, so it is left out on purpose.
  }, [hasClipFailed])

  function handleClipError() {
    console.error(`git-aux: could not play ${clipUrl}`)
    setHasClipFailed(true)
  }

  return (
    <main className="celebration-screen">
      {clip.kind === 'video' && !hasClipFailed && (
        <video
          className="celebration-screen__video"
          src={clipUrl}
          autoPlay
          playsInline
          onEnded={onFinished}
          onError={handleClipError}
        />
      )}
      {clip.kind === 'audio' && !hasClipFailed && (
        <audio src={clipUrl} autoPlay onEnded={onFinished} onError={handleClipError} />
      )}
      {(clip.kind === 'audio' || hasClipFailed) && <div className="celebration-screen__dots" />}

      <div className="celebration-screen__text">
        <p className="celebration-screen__label">merged</p>
        <h1 className="celebration-screen__login">{merge.githubLogin}</h1>
        <p className="celebration-screen__title">{merge.pullRequestTitle}</p>
        <p className="celebration-screen__repository">
          {merge.repositoryName} #{merge.pullRequestNumber}
        </p>
      </div>

      {mergesWaitingCount > 0 && (
        <p className="celebration-screen__waiting">+{mergesWaitingCount} more</p>
      )}
    </main>
  )
}

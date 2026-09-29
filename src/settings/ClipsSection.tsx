import { useState } from 'react'
import { ALLOWED_CLIP_EXTENSIONS, cleanClipFileName } from '../../shared/clipFileName'
import { deleteClip, fetchClipFileNames, uploadClip } from '../api'
import { MAX_CLIP_SECONDS, clipForFileName } from '../celebration/clips'
import { useServerAction } from './useServerAction'

type Props = {
  clipFileNames: string[]
  onClipFileNamesChanged: (clipFileNames: string[]) => void
}

export function ClipsSection({ clipFileNames, onClipFileNamesChanged }: Props) {
  const { isBusy, errorMessage, setErrorMessage, runAction } = useServerAction()
  const [isFileDraggedOver, setIsFileDraggedOver] = useState(false)
  // Only one clip previews at a time, so two clips never play over each other.
  const [playingClipFileName, setPlayingClipFileName] = useState<string | null>(null)

  function handleFilesChosen(files: FileList | null) {
    if (!files || files.length === 0) return
    const chosenFiles = Array.from(files)
    runAction(async () => {
      // One bad file does not stop the rest from uploading.
      const failureMessages: string[] = []
      for (const file of chosenFiles) {
        try {
          await uploadClip(cleanClipFileName(file.name), file)
        } catch (error) {
          failureMessages.push(`${file.name}: ${(error as Error).message}`)
        }
      }
      onClipFileNamesChanged(await fetchClipFileNames())
      if (failureMessages.length > 0) throw new Error(failureMessages.join(' '))
    })
  }

  function handleDeleteClip(clipFileName: string) {
    if (playingClipFileName === clipFileName) setPlayingClipFileName(null)
    runAction(async () => {
      await deleteClip(clipFileName)
      onClipFileNamesChanged(await fetchClipFileNames())
    })
  }

  return (
    <section>
      <h2>clips</h2>
      <p className="settings-page__hint">
        Sound or video files. Clips are cut off after {MAX_CLIP_SECONDS} seconds. Only upload clips
        you have the right to use.
      </p>

      {errorMessage && (
        <p className="settings-page__error" role="alert">
          {errorMessage}
        </p>
      )}

      <div
        className={
          isFileDraggedOver
            ? 'settings-page__drop-zone settings-page__drop-zone--dragged-over'
            : 'settings-page__drop-zone'
        }
        onDragOver={(event) => {
          // Without this the browser opens the dropped file instead of handing it to the page.
          event.preventDefault()
          setIsFileDraggedOver(true)
        }}
        onDragLeave={(event) => {
          // Moving onto a child of this zone also fires dragleave, which would flicker the highlight.
          if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
            return
          }
          setIsFileDraggedOver(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setIsFileDraggedOver(false)
          if (!isBusy) handleFilesChosen(event.dataTransfer.files)
        }}
      >
        <span>{isBusy ? 'working...' : 'drop files here, or'}</span>
        <label className="settings-page__upload">
          choose files
          <input
            type="file"
            multiple
            accept={ALLOWED_CLIP_EXTENSIONS.join(',')}
            disabled={isBusy}
            onChange={(event) => {
              handleFilesChosen(event.target.files)
              // Clearing the input lets the same file be chosen again later.
              event.target.value = ''
            }}
          />
        </label>
      </div>

      {clipFileNames.length === 0 ? (
        <p className="settings-page__empty">no clips yet</p>
      ) : (
        <ul className="settings-page__list">
          {clipFileNames.map((clipFileName) => {
            const clip = clipForFileName(clipFileName)
            const isPlaying = playingClipFileName === clipFileName
            return (
              <li key={clipFileName}>
                {clip.kind === 'audio' ? (
                  <button
                    className="settings-page__play-button"
                    aria-label={isPlaying ? `stop ${clipFileName}` : `play ${clipFileName}`}
                    onClick={() => setPlayingClipFileName(isPlaying ? null : clipFileName)}
                  >
                    {isPlaying ? 'stop' : 'play'}
                  </button>
                ) : (
                  <a
                    className="settings-page__play-button"
                    href={clip.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    watch
                  </a>
                )}
                <span className="settings-page__name">{clipFileName}</span>
                <button disabled={isBusy} onClick={() => handleDeleteClip(clipFileName)}>
                  delete
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {playingClipFileName && (
        <audio
          // A new key makes React build a fresh player, so each preview starts from zero.
          key={playingClipFileName}
          src={clipForFileName(playingClipFileName).url}
          autoPlay
          onEnded={() => setPlayingClipFileName(null)}
          onTimeUpdate={(event) => {
            // The preview stops where the celebration screen would cut the clip off.
            if (event.currentTarget.currentTime >= MAX_CLIP_SECONDS) setPlayingClipFileName(null)
          }}
          onError={() => {
            setErrorMessage(`"${playingClipFileName}" could not be played.`)
            setPlayingClipFileName(null)
          }}
        />
      )}
    </section>
  )
}

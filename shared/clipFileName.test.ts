import { describe, expect, it } from 'vitest'
import { cleanClipFileName, isValidClipFileName } from './clipFileName'

describe('isValidClipFileName', () => {
  it('accepts plain audio and video names', () => {
    expect(isValidClipFileName('airhorn.mp3')).toBe(true)
    expect(isValidClipFileName('Air Horn 2.MP3')).toBe(true)
    expect(isValidClipFileName('walk-up_song.mp4')).toBe(true)
  })

  it('rejects paths and hidden files', () => {
    expect(isValidClipFileName('../airhorn.mp3')).toBe(false)
    expect(isValidClipFileName('folder/airhorn.mp3')).toBe(false)
    expect(isValidClipFileName('.hidden.mp3')).toBe(false)
  })

  it('rejects other file types', () => {
    expect(isValidClipFileName('settings.json')).toBe(false)
    expect(isValidClipFileName('airhorn')).toBe(false)
  })
})

describe('cleanClipFileName', () => {
  it('replaces characters that are not allowed', () => {
    expect(cleanClipFileName('Air Horn (final).mp3')).toBe('Air Horn -final-.mp3')
  })

  it('produces a valid name from a messy one', () => {
    expect(isValidClipFileName(cleanClipFileName('  ¡olé! #1.mp3'))).toBe(true)
  })

  it('keeps the file extension when shortening a long name', () => {
    const cleaned = cleanClipFileName(`${'a'.repeat(200)}.mp3`)
    expect(isValidClipFileName(cleaned)).toBe(true)
  })
})

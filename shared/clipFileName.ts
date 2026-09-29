// Clip file names are used in URLs and as paths on disk, so only plain names are allowed.
// This blocks names like "../settings.json" that would reach outside the media folder.

export const VIDEO_CLIP_EXTENSIONS = ['.mp4', '.webm']
export const AUDIO_CLIP_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a']
export const ALLOWED_CLIP_EXTENSIONS = [...AUDIO_CLIP_EXTENSIONS, ...VIDEO_CLIP_EXTENSIONS]

const MAX_CLIP_FILE_NAME_LENGTH = 100

export function isValidClipFileName(fileName: string): boolean {
  if (fileName.length > MAX_CLIP_FILE_NAME_LENGTH) return false
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._-]*$/.test(fileName)) return false
  return hasAllowedClipExtension(fileName)
}

export function hasAllowedClipExtension(fileName: string): boolean {
  return allowedClipExtension(fileName) !== ''
}

// The matched suffix, keeping its original letter case, or '' when the name is not a clip.
function allowedClipExtension(fileName: string): string {
  const lowerCaseFileName = fileName.toLowerCase()
  const extension = ALLOWED_CLIP_EXTENSIONS.find((candidate) => lowerCaseFileName.endsWith(candidate))
  if (extension === undefined) return ''
  return fileName.slice(-extension.length)
}

// Turns a name like "Air Horn (final).mp3" into "Air Horn -final-.mp3" before upload.
export function cleanClipFileName(fileName: string): string {
  const cleaned = fileName.replace(/[^A-Za-z0-9 ._-]/g, '-').slice(-MAX_CLIP_FILE_NAME_LENGTH)
  const extension = allowedClipExtension(cleaned)
  // Strip leading dashes and dots from the base name only. Doing it on the whole name
  // would also eat the extension dot when the title has no Latin letters ("歌曲.mp3").
  const baseName = cleaned.slice(0, cleaned.length - extension.length).replace(/^[^A-Za-z0-9]+/, '')
  if (baseName !== '') return `${baseName}${extension}`
  if (extension === '') return ''
  return `clip${extension}`
}

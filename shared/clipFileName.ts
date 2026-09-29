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
  const lowerCaseFileName = fileName.toLowerCase()
  return ALLOWED_CLIP_EXTENSIONS.some((extension) => lowerCaseFileName.endsWith(extension))
}

// Turns a name like "Air Horn (final).mp3" into "Air Horn -final-.mp3" before upload.
export function cleanClipFileName(fileName: string): string {
  return fileName
    .replace(/[^A-Za-z0-9 ._-]/g, '-')
    .slice(-MAX_CLIP_FILE_NAME_LENGTH)
    .replace(/^[^A-Za-z0-9]+/, '')
}

export type ClipsConfig = {
  // Played for anyone without their own clip.
  defaultClipFileName: string
  clipFileNameByGithubLogin: Record<string, string>
}

export type Clip = {
  fileName: string
  // 'audio' clips have no picture, so the screen shows a default card instead.
  kind: 'video' | 'audio'
}

// A queue of merges should clear quickly, so no clip plays longer than this.
export const MAX_CLIP_SECONDS = 15

const VIDEO_EXTENSIONS = ['.mp4', '.webm']

export function clipKindForFileName(fileName: string): Clip['kind'] {
  const lowerCaseFileName = fileName.toLowerCase()
  const isVideo = VIDEO_EXTENSIONS.some((extension) => lowerCaseFileName.endsWith(extension))
  return isVideo ? 'video' : 'audio'
}

export function clipForGithubLogin(githubLogin: string, config: ClipsConfig): Clip {
  // GitHub usernames are case-insensitive: "Octocat" and "octocat" are the same person.
  const matchingLogin = Object.keys(config.clipFileNameByGithubLogin).find(
    (login) => login.toLowerCase() === githubLogin.toLowerCase(),
  )
  const fileName = matchingLogin
    ? config.clipFileNameByGithubLogin[matchingLogin]
    : config.defaultClipFileName
  return { fileName, kind: clipKindForFileName(fileName) }
}

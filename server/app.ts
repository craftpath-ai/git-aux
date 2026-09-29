import fs from 'node:fs/promises'
import path from 'node:path'
import express, { type NextFunction, type Request, type Response } from 'express'
import { isValidClipFileName } from '../shared/clipFileName'
import { parseSettings } from '../shared/settings'
import { readSettings, writeSettings } from './settingsFile'

const MAX_CLIP_UPLOAD_SIZE = '50mb'

type AppOptions = {
  // Folder holding settings.json and the media folder.
  dataDirectory: string
  // Folder holding the built page (the output of "pnpm build"), if it should be served.
  builtPageDirectory?: string
}

export async function createApp({ dataDirectory, builtPageDirectory }: AppOptions) {
  const mediaDirectory = path.join(dataDirectory, 'media')
  await fs.mkdir(mediaDirectory, { recursive: true })

  async function listClipFileNames(): Promise<string[]> {
    const fileNames = await fs.readdir(mediaDirectory)
    return fileNames.filter(isValidClipFileName).sort((a, b) => a.localeCompare(b))
  }

  const app = express()

  app.get('/api/settings', async (_request, response) => {
    response.json(await readSettings(dataDirectory))
  })

  app.put('/api/settings', express.json(), async (request, response) => {
    let settings
    try {
      settings = parseSettings(request.body)
    } catch (error) {
      response.status(400).json({ error: (error as Error).message })
      return
    }

    const clipFileNames = await listClipFileNames()
    const ruleWithMissingClip = settings.clipRules.find(
      (rule) => !clipFileNames.includes(rule.clipFileName),
    )
    if (ruleWithMissingClip) {
      response
        .status(400)
        .json({ error: `There is no uploaded clip called "${ruleWithMissingClip.clipFileName}".` })
      return
    }

    await writeSettings(dataDirectory, settings)
    response.json(settings)
  })

  app.get('/api/clips', async (_request, response) => {
    response.json({ clipFileNames: await listClipFileNames() })
  })

  // The file is sent as the raw request body, with its name in the URL.
  app.put(
    '/api/clips/:fileName',
    express.raw({ type: () => true, limit: MAX_CLIP_UPLOAD_SIZE }),
    async (request, response) => {
      const fileName = String(request.params.fileName)
      if (!isValidClipFileName(fileName)) {
        response.status(400).json({
          error: 'Clip names can use letters, numbers, spaces, dots and dashes, and must end in .mp3, .wav, .ogg, .m4a, .mp4 or .webm.',
        })
        return
      }
      if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
        response.status(400).json({ error: 'The uploaded file is empty.' })
        return
      }
      if ((await listClipFileNames()).includes(fileName)) {
        response
          .status(409)
          .json({ error: `A clip called "${fileName}" already exists. Delete it first or rename the file.` })
        return
      }

      await fs.writeFile(path.join(mediaDirectory, fileName), request.body)
      response.status(201).json({ clipFileName: fileName })
    },
  )

  app.delete('/api/clips/:fileName', async (request, response) => {
    const fileName = String(request.params.fileName)
    if (!(await listClipFileNames()).includes(fileName)) {
      response.status(404).json({ error: `There is no clip called "${fileName}".` })
      return
    }

    const settings = await readSettings(dataDirectory)
    if (settings.clipRules.some((rule) => rule.clipFileName === fileName)) {
      response
        .status(409)
        .json({ error: `"${fileName}" is used by a rule. Remove the rule first.` })
      return
    }

    await fs.rm(path.join(mediaDirectory, fileName))
    response.status(204).end()
  })

  app.use('/api', (_request, response) => {
    response.status(404).json({ error: 'Not found.' })
  })

  app.use('/media', express.static(mediaDirectory, { fallthrough: false }))

  if (builtPageDirectory) {
    app.use(express.static(builtPageDirectory))
  }

  app.use((error: Error & { status?: number; type?: string }, _request: Request, response: Response, _next: NextFunction) => {
    if (error.type === 'entity.too.large') {
      response.status(413).json({ error: `Files can be at most ${MAX_CLIP_UPLOAD_SIZE}.` })
      return
    }
    if (error.status === 404) {
      response.status(404).json({ error: 'Not found.' })
      return
    }
    if (error.status === 400) {
      response.status(400).json({ error: 'The request could not be read.' })
      return
    }
    console.error(error)
    response.status(500).json({ error: 'Something went wrong on the server.' })
  })

  return app
}

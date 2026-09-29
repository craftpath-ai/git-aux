import { existsSync } from 'node:fs'
import path from 'node:path'
import { createApp } from './app'
import { defaultDataDirectory } from './dataDirectory'

const PORT = Number(process.env.PORT ?? 4242)
// Only this machine can reach the server. It has no login of its own,
// so it must not be open to the rest of the network.
const HOST = '127.0.0.1'

const dataDirectory = defaultDataDirectory()
const builtPageDirectory = path.join(import.meta.dirname, '..', 'dist')

const app = await createApp({
  dataDirectory,
  builtPageDirectory: existsSync(builtPageDirectory) ? builtPageDirectory : undefined,
})

app.listen(PORT, HOST, (error) => {
  if (error) {
    const isPortTaken = (error as NodeJS.ErrnoException).code === 'EADDRINUSE'
    console.error(
      isPortTaken
        ? `git-aux could not start: port ${PORT} is already in use. Is git-aux already running?`
        : `git-aux could not start: ${error.message}`,
    )
    process.exit(1)
  }
  console.log(`git-aux server: http://localhost:${PORT}`)
  console.log(`settings and clips: ${dataDirectory}`)
})

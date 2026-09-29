import { useState } from 'react'

// Each section of the settings page has its own copy of this,
// so an error shows up inside the section where it happened.
export function useServerAction() {
  const [isBusy, setIsBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Runs one server action, showing its error message if it fails.
  async function runAction(action: () => Promise<void>) {
    setIsBusy(true)
    setErrorMessage(null)
    try {
      await action()
    } catch (error) {
      setErrorMessage((error as Error).message)
    } finally {
      setIsBusy(false)
    }
  }

  return { isBusy, errorMessage, setErrorMessage, runAction }
}

import { createServerFn } from '@tanstack/react-start'
import { ingestGooglePickerFileInput } from '@/lib/shared/google-picker'

export const getGooglePickerFilesSnapshot = createServerFn({
  method: 'GET',
}).handler(async () => {
  const { getGooglePickerFilesSnapshotAction } = await import(
    './google-picker.server'
  )
  return getGooglePickerFilesSnapshotAction()
})

export const ingestGooglePickerFileServer = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => ingestGooglePickerFileInput.parse(input))
  .handler(async ({ data }) => {
    const { ingestGooglePickerFileAction } = await import(
      './google-picker.server'
    )
    return ingestGooglePickerFileAction(data)
  })

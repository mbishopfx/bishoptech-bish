import { getRequestHeaders } from '@tanstack/react-start/server'
import { requireBishOrgRequestContext } from '@/lib/backend/bish/request-context'
import {
  getGooglePickerFilesSnapshot,
  ingestGooglePickerFile,
} from '@/lib/backend/bish/google-picker'
import type {
  GooglePickerFilesSnapshot,
  IngestGooglePickerFileInput,
} from '@/lib/shared/google-picker'

async function requireGooglePickerSession() {
  const headers = getRequestHeaders()
  return requireBishOrgRequestContext(headers)
}

export async function getGooglePickerFilesSnapshotAction(): Promise<GooglePickerFilesSnapshot> {
  const session = await requireGooglePickerSession()
  return getGooglePickerFilesSnapshot({
    organizationId: session.organizationId,
    userId: session.userId,
  })
}

export async function ingestGooglePickerFileAction(
  input: IngestGooglePickerFileInput,
) {
  const session = await requireGooglePickerSession()
  await ingestGooglePickerFile({
    organizationId: session.organizationId,
    userId: session.userId,
    fileId: input.fileId,
  })
  return getGooglePickerFilesSnapshot({
    organizationId: session.organizationId,
    userId: session.userId,
  })
}

'use server';

import { logServerAuditEvent } from '@/lib/server-audit';

export async function logUserLoggedIn() {
  await logServerAuditEvent({ action: 'user.logged_in' });
}

export async function logUserLoggedOut() {
  await logServerAuditEvent({ action: 'user.logged_out' });
}

export async function logThreadRemoved(threadId: string, threadName?: string) {
  await logServerAuditEvent({
    action: 'thread.removed',
    resource: { type: 'thread', id: threadId, name: threadName },
  });
}

export async function logThreadRenamed(threadId: string, newName: string, previousName: string) {
  await logServerAuditEvent({
    action: 'thread.renamed',
    resource: { type: 'thread', id: threadId, name: newName },
    metadata: { previous_name: previousName },
  });
}

export async function logThreadCreated(threadId: string, model: string, hasAttachment: boolean, attachmentCount?: number,
) {
  await logServerAuditEvent({
    action: 'thread.create',
    resource: { type: 'thread', id: threadId },
    metadata: {
      model,
      has_attachment: hasAttachment,
      ...(typeof attachmentCount === 'number' ? { attachment_count: attachmentCount } : {}),
    },
  });
}

export async function logAttachmentUploaded(attachmentId: string, fileName: string, mimeType: string, size: number) {
  await logServerAuditEvent({
    action: 'attachment.uploaded',
    resource: { type: 'attachment', id: attachmentId, name: fileName },
    metadata: { mime_type: mimeType, size },
  });
}

export async function logAttachmentDeleted(attachmentId: string, fileName?: string, mimeType?: string, size?: number | string) {
  await logServerAuditEvent({
    action: 'attachment.deleted',
    resource: { type: 'attachment', id: attachmentId, name: fileName },
    metadata: {
      ...(mimeType ? { mime_type: mimeType } : {}),
      ...(typeof size === 'number' || typeof size === 'string' ? { size: typeof size === 'string' ? Number(size) || 0 : size } : {}),
    },
  });
}

export async function logAttachmentsBulkDeleted(items: Array<{ id: string; name?: string; mimeType?: string; size?: number | string }>) {
  const idsJoined = items.map(i => i.id).filter(Boolean).join(',');
  const namesJoined = items.map(i => i.name).filter(Boolean).join(',');
  await logServerAuditEvent({
    action: 'attachment.bulk_deleted',
    resource: { type: 'attachment', id: idsJoined || 'bulk', name: namesJoined || undefined },
    metadata: {
      count: items.length,
      total_size: items.reduce((sum, i) => sum + (typeof i.size === 'string' ? Number(i.size) || 0 : (i.size || 0)), 0),
      mime_types: Array.from(new Set(items.map(i => i.mimeType).filter(Boolean))).slice(0, 10).join(','),
    },
  });
}



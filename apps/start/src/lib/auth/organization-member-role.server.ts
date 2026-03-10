
export async function isOrgAdmin(input: {
  headers: Headers
  organizationId?: string
}): Promise<boolean> {
  const organizationId = input.organizationId?.trim()

  if (!organizationId) {
    return false
  }

  try {
    const { auth } = await import('./auth.server')
    const result = await auth.api.hasPermission({
      headers: input.headers,
      body: {
        organizationId,
        permissions: {
          organization: ['update'],
        },
      },
    })

    return Boolean(result?.success)
  } catch {
    return false
  }
}

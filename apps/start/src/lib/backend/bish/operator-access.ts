const OPERATOR_EMAIL_SPLIT = /[,\n]/g

export function getBishOperatorEmails(): readonly string[] {
  const raw = process.env.BISH_OPERATOR_EMAILS?.trim()
  if (!raw) return []

  return raw
    .split(OPERATOR_EMAIL_SPLIT)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
}

export function isBishOperatorEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return getBishOperatorEmails().includes(email.trim().toLowerCase())
}

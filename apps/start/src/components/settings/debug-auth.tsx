import { useAppAuth } from '@/lib/auth/use-auth'
import { m } from '@/paraglide/messages.js'

type DebugAuthProps = {
  signInUrl: string
  signUpUrl: string
}

export function DebugAuth({ signInUrl, signUpUrl }: DebugAuthProps) {
  const { user, loading, signOut } = useAppAuth()

  if (loading) {
    return <p className="text-sm text-content-muted">{m.debug_auth_loading_state()}</p>
  }

  if (user) {
    return (
      <div className="space-y-4 rounded-lg border border-border-default bg-bg-subtle p-4">
        <p className="text-sm">
          <span className="text-content-muted">{m.debug_auth_email_label()}</span>{' '}
          <span className="font-medium text-content-emphasis">{user.email}</span>
        </p>
        <p className="text-sm">
          <span className="text-content-muted">{m.debug_auth_user_id_label()}</span>{' '}
          <code className="rounded bg-bg-muted px-1.5 py-0.5 font-mono text-xs">{user.id}</code>
        </p>
        <button
          type="button"
          onClick={() => signOut()}
          className="rounded-md bg-bg-error px-4 py-2 text-sm text-content-error hover:opacity-90"
        >
          {m.debug_auth_sign_out()}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border border-border-default bg-bg-subtle p-4">
      <p className="text-sm text-content-muted">{m.debug_auth_not_signed_in()}</p>
      <div className="flex gap-3">
        <a
          href={signInUrl}
          className="rounded-md bg-bg-inverted px-4 py-2 text-sm text-content-inverted hover:opacity-90"
        >
          {m.debug_auth_sign_in()}
        </a>
        <a
          href={signUpUrl}
          className="rounded-md border border-border-default px-4 py-2 text-sm text-content-emphasis hover:bg-bg-subtle"
        >
          {m.debug_auth_sign_up()}
        </a>
      </div>
    </div>
  )
}

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { authClient } from '@/lib/auth/auth-client'

export const Route = createFileRoute('/auth/sign-in')({
  component: SignInPage,
})

function SignInPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onEmailSignIn = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await (authClient.signIn.email as (input: {
        email: string
        password: string
      }) => Promise<unknown>)({
        email,
        password,
      })
      void navigate({ to: '/chat' })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold text-content-emphasis">Sign in</h1>
      <p className="mt-2 text-sm text-content-muted">Use your account to continue.</p>

      <form className="mt-6 space-y-3" onSubmit={onEmailSignIn}>
        <input
          className="w-full rounded-md border border-border-default bg-bg-subtle px-3 py-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          className="w-full rounded-md border border-border-default bg-bg-subtle px-3 py-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button
          className="w-full rounded-md bg-bg-inverted px-3 py-2 text-content-inverted disabled:opacity-60"
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="mt-3 space-y-2">
        <button
          className="w-full rounded-md border border-border-default px-3 py-2"
          type="button"
          onClick={() =>
            (authClient.signIn.social as (input: {
              provider: 'google'
              callbackURL?: string
            }) => Promise<unknown>)({
              provider: 'google',
              callbackURL: '/chat',
            })
          }
        >
          Continue with Google
        </button>
        <button
          className="w-full rounded-md border border-border-default px-3 py-2"
          type="button"
          onClick={async () => {
            try {
              await authClient.signIn.anonymous()
            } catch (error) {
              const code =
                typeof error === 'object' && error
                  ? ((error as { code?: string; body?: { code?: string } })
                      .code ??
                    (error as { code?: string; body?: { code?: string } }).body
                      ?.code)
                  : undefined

              if (code !== 'ANONYMOUS_USERS_CANNOT_SIGN_IN_AGAIN_ANONYMOUSLY') {
                throw error
              }
            }
            void navigate({ to: '/chat' })
          }}
        >
          Continue as guest
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-content-error">{error}</p> : null}
    </main>
  )
}

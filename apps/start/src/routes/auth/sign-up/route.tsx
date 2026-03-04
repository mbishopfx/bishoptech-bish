import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { authClient } from '@/lib/auth/auth-client'

export const Route = createFileRoute('/auth/sign-up')({
  component: SignUpPage,
})

function SignUpPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onEmailSignUp = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await (authClient.signUp.email as (input: {
        email: string
        password: string
        name: string
      }) => Promise<unknown>)({
        name,
        email,
        password,
      })
      void navigate({ to: '/chat' })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign up')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold text-content-emphasis">Create account</h1>
      <p className="mt-2 text-sm text-content-muted">Start with email and password.</p>

      <form className="mt-6 space-y-3" onSubmit={onEmailSignUp}>
        <input
          className="w-full rounded-md border border-border-default bg-bg-subtle px-3 py-2"
          type="text"
          placeholder="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
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
          {submitting ? 'Creating account…' : 'Sign up'}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-content-error">{error}</p> : null}
    </main>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@bish/ui/button'
import { FormDialog } from '@bish/ui/dialog'
import { Input } from '@bish/ui/input'
import { Label } from '@bish/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@bish/ui/select'
import { KeyRound, ShieldPlus } from 'lucide-react'
import { createOrganizationMember } from './members.functions'

const DIRECT_MEMBER_ROLES = [
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
] as const

/**
 * Credential-based member creation is the fastest admin path for staging
 * shared-chat and huddle test users without relying on inbox delivery.
 */
export function CreateMemberDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'member' | 'admin'>('member')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const reset = () => {
    setEmail('')
    setPassword('')
    setName('')
    setRole('member')
    setError(null)
    setSuccess(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      reset()
    }
  }

  const handleSubmit = async () => {
    setError(null)
    setSuccess(null)

    startTransition(() => {
      void createOrganizationMember({
        data: {
          email,
          password,
          role,
          ...(name.trim().length > 0 ? { name } : {}),
        },
      })
        .then((result) => {
          const message = `Created ${result.email} as ${result.role}.`
          setSuccess(message)
          toast.success(message)
          setOpen(false)
          reset()
        })
        .catch((submitError) => {
          const message =
            submitError instanceof Error
              ? submitError.message
              : 'Failed to create member.'
          setError(message)
        })
    })
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={
        <Button variant="outline">
          <ShieldPlus aria-hidden />
          Create member
        </Button>
      }
      title="Create member"
      description="Create a login directly with email and password. No invitation email is sent."
      buttonText="Create member"
      submitButtonDisabled={
        isPending || email.trim().length === 0 || password.trim().length < 8
      }
      error={error}
      success={success}
      handleSubmit={handleSubmit}
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="create-member-email">Email address</Label>
          <Input
            id="create-member-email"
            type="email"
            autoComplete="email"
            placeholder="teammate@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-member-name">Display name</Label>
          <Input
            id="create-member-name"
            placeholder="Optional display name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-member-password">Password</Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground-tertiary" />
            <Input
              id="create-member-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Role</Label>
          <Select
            value={role}
            onValueChange={(value) =>
              setRole(value === 'admin' ? 'admin' : 'member')
            }
          >
            <SelectTrigger size="default">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              {DIRECT_MEMBER_ROLES.map((entry) => (
                <SelectItem key={entry.value} value={entry.value}>
                  {entry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </FormDialog>
  )
}

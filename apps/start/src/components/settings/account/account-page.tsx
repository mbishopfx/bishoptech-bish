'use client'

import { Form } from '@rift/ui/form'
import { ContentPage } from '@/components/layout'
import { AvatarUploadField } from '@/components/settings/avatar-upload'
import { useAccountPageLogic } from './account-page.logic'

/**
 * User account settings page for profile information.
 */
export function AccountPage() {
  const {
    name,
    email,
    avatarImage,
    nameMessage,
    emailMessage,
    canEdit,
    initials,
    setNameInput,
    setEmailInput,
    submitName,
    submitEmail,
    persistAvatar,
    applyAvatarChange,
  } = useAccountPageLogic()

  return (
    <ContentPage title="Account" description="Manage your account details and avatar.">
      <Form
        title="Avatar"
        description="This is your avatar. Click on the avatar to upload a custom image."
        headerSlot={
          <AvatarUploadField
            image={avatarImage}
            fallbackText={initials}
            alt="Profile avatar"
            disabled={!canEdit}
            onPersistImage={persistAvatar}
            onImageChange={applyAvatarChange}
          />
        }
        helpText={<p className="text-sm text-content-subtle">An avatar is optional but strongly recommended.</p>}
      />

      <Form
        title="Display Name"
        description="Please enter your full name, or a display name you are comfortable with."
        inputAttrs={{
          name: 'displayName',
          type: 'text',
          placeholder: 'e.g. Ari Say',
          maxLength: 32,
          disabled: !canEdit,
        }}
        value={name}
        onValueChange={setNameInput}
        helpText={
          <p className="text-sm text-content-subtle">
            {nameMessage ?? 'Please use 32 characters at maximum.'}
          </p>
        }
        buttonText="Save"
        buttonDisabled={!canEdit || name.trim().length === 0}
        handleSubmit={submitName}
      />

      <Form
        title="Email"
        description="This is your account email address."
        inputAttrs={{
          name: 'email',
          type: 'email',
          placeholder: 'you@example.com',
          readOnly: true,
          disabled: !canEdit,
        }}
        value={email}
        onValueChange={setEmailInput}
        helpText={
          emailMessage ? (
            <p className="text-sm text-content-error" role="alert">
              {emailMessage}
            </p>
          ) : (
            <p className="text-sm text-content-subtle">
              Email changes are currently managed outside this page.
            </p>
          )
        }
        buttonText="Save"
        buttonDisabled
        handleSubmit={submitEmail}
      />
    </ContentPage>
  )
}

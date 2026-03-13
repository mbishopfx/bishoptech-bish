'use client'

import { useAppAuth } from '@/lib/frontend/auth/use-auth'
import {
  readRecord,
  readStringField
  
  
  
} from './security-page-shared'
import type {ActiveSessionViewModel, ConnectedLoginMethodViewModel, SecurityPageLogicResult} from './security-page-shared';
import { useConnectedLoginMethodsLogic } from './connected-login-methods.logic'
import { useMfaSectionLogic } from './mfa-section.logic'
import { useSecurityPasswordLogic } from './security-page-password.logic'
import { useSessionListLogic } from './session-list.logic'

/**
 * Compose page-level security logic from section-specific logic modules.
 */
export { type SecurityPageLogicResult, type ActiveSessionViewModel, type ConnectedLoginMethodViewModel }

export function useSecurityPageLogic(): SecurityPageLogicResult {
  const { loading, user, isAnonymous, session, refetchSession } = useAppAuth()

  const canEdit = !loading && !!user && !isAnonymous

  const sessionRecord = readRecord(session)
  const currentSessionId = readStringField(sessionRecord, ['id', 'sessionId'])
  const currentSessionToken =
    readStringField(sessionRecord, ['token', 'sessionToken']) ??
    readStringField(readRecord(sessionRecord?.session), ['token', 'sessionToken'])

  const loginMethods = useConnectedLoginMethodsLogic(canEdit)
  const passwordMode = canEdit && loginMethods.loginMethodsLoaded && !loginMethods.hasCredentialPassword
    ? 'set'
    : 'change'
  const password = useSecurityPasswordLogic(canEdit, passwordMode, loginMethods.refreshConnectedLoginMethods)
  const sessions = useSessionListLogic(canEdit, currentSessionId, currentSessionToken)
  const mfa = useMfaSectionLogic(canEdit, user, refetchSession)

  return {
    currentPassword: password.currentPassword,
    newPassword: password.newPassword,
    confirmPassword: password.confirmPassword,
    passwordMessage: password.passwordMessage,
    sessionsMessage: sessions.sessionsMessage,
    loginMethodsMessage: loginMethods.loginMethodsMessage,
    primaryEmail: typeof user?.email === 'string' ? user.email : null,
    sessionsLoaded: sessions.sessionsLoaded,
    loginMethodsLoaded: loginMethods.loginMethodsLoaded,
    canEdit,
    passwordMode: password.passwordMode,
    activeSessions: sessions.activeSessions,
    connectedLoginMethods: loginMethods.connectedLoginMethods,
    sessionsLoading: sessions.sessionsLoading,
    loginMethodsLoading: loginMethods.loginMethodsLoading,
    sessionsRefreshing: sessions.sessionsRefreshing,
    mfaEnabled: mfa.mfaEnabled,
    mfaPendingVerification: mfa.mfaPendingVerification,
    mfaBusy: mfa.mfaBusy,
    mfaMessage: mfa.mfaMessage,
    mfaSetupTotpURI: mfa.mfaSetupTotpURI,
    mfaSetupStep: mfa.mfaSetupStep,
    mfaBackupCodes: mfa.mfaBackupCodes,
    mfaSetupPassword: mfa.mfaSetupPassword,
    mfaSetupCode: mfa.mfaSetupCode,
    mfaDisablePassword: mfa.mfaDisablePassword,
    revokingSessionToken: sessions.revokingSessionToken,
    linkingProviderId: loginMethods.linkingProviderId,
    unlinkingLoginMethodId: loginMethods.unlinkingLoginMethodId,
    revokingAllOtherSessions: sessions.revokingAllOtherSessions,
    setCurrentPasswordInput: password.setCurrentPasswordInput,
    setNewPasswordInput: password.setNewPasswordInput,
    setConfirmPasswordInput: password.setConfirmPasswordInput,
    setMfaSetupPasswordInput: mfa.setMfaSetupPasswordInput,
    setMfaSetupCodeInput: mfa.setMfaSetupCodeInput,
    setMfaDisablePasswordInput: mfa.setMfaDisablePasswordInput,
    submitPasswordChange: password.submitPasswordChange,
    enableMfa: mfa.enableMfa,
    verifyMfaTotp: mfa.verifyMfaTotp,
    cancelMfaSetup: mfa.cancelMfaSetup,
    finishMfaSetup: mfa.finishMfaSetup,
    disableMfa: mfa.disableMfa,
    refreshActiveSessions: sessions.refreshActiveSessions,
    refreshConnectedLoginMethods: loginMethods.refreshConnectedLoginMethods,
    revokeSessionByToken: sessions.revokeSessionByToken,
    connectLoginProvider: loginMethods.connectLoginProvider,
    unlinkConnectedLoginMethod: loginMethods.unlinkConnectedLoginMethod,
    revokeAllOtherSessions: sessions.revokeAllOtherSessions,
  }
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  getCurrentUserSecurityState,
  type SecurityAuthFactor,
  type SecuritySession,
} from "@/actions/settings/security/getCurrentUserSecurityState";
import { revokeSession } from "@/actions/settings/security/revokeSession";
import { revokeOtherSessions } from "@/actions/settings/security/revokeOtherSessions";

import { Button } from "@/components/ai/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ai/ui/dialog";

import { PasswordChangeDialog } from "./security/PasswordChangeDialog";
import { MfaEnableDialog } from "./security/MfaEnableDialog";
import { MfaDisableDialog } from "./security/MfaDisableDialog";
import { SecuritySessions } from "./security/SecuritySessions";

export function SecuritySettings({
  initialFactors,
  initialSessions,
  initialCurrentSessionId,
  showSessions = false,
}: {
  initialFactors: SecurityAuthFactor[];
  initialSessions: SecuritySession[];
  initialCurrentSessionId: string;
  showSessions?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const [factors, setFactors] = useState<SecurityAuthFactor[]>(initialFactors);
  const [sessions, setSessions] = useState<SecuritySession[]>(initialSessions);
  const [currentSessionId, setCurrentSessionId] = useState<string>(
    initialCurrentSessionId,
  );

  // MFA dialogs
  const [isMfaDialogOpen, setIsMfaDialogOpen] = useState(false);
  const [isDeleteMfaPreDialogOpen, setIsDeleteMfaPreDialogOpen] = useState(false);
  const [isDeleteMfaDialogOpen, setIsDeleteMfaDialogOpen] = useState(false);

  const mfaEnabled = factors.length > 0;
  const hasPassword = useMemo(
    () => sessions.some((s) => s.authMethod === "password"),
    [sessions],
  );

  const sessionsSorted = useMemo(() => {
    const copy = [...sessions];
    // Sort: current session first, then others by creation date (newest first)
    copy.sort((a, b) => {
      const aIsCurrent = a.id === currentSessionId;
      const bIsCurrent = b.id === currentSessionId;
      if (aIsCurrent && !bIsCurrent) return -1;
      if (!aIsCurrent && bIsCurrent) return 1;
      // Both are current or both are not - sort by creation date
      return a.createdAt < b.createdAt ? 1 : -1;
    });
    return copy;
  }, [sessions, currentSessionId]);

  const refresh = () =>
    startTransition(async () => {
      const result = await getCurrentUserSecurityState();
      if (!result.success) {
        toast.error(result.error ?? "No se pudo actualizar.");
        return;
      }
      setFactors(result.factors);
      setSessions(result.sessions);
      setCurrentSessionId(result.currentSessionId);
    });

  const onRevokeSession = (sessionId: string) =>
    startTransition(async () => {
      const result = await revokeSession(sessionId);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo cerrar la sesión.");
        return;
      }
      toast.success("Sesión cerrada.");
      refresh();
    });

  const onRevokeOtherSessions = () =>
    startTransition(async () => {
      const result = await revokeOtherSessions();
      if (!result.success) {
        toast.error(result.error ?? "No se pudieron cerrar otras sesiones.");
        return;
      }
      toast.success(
        result.revoked === 1
          ? "1 sesión cerrada."
          : `${result.revoked} sesiones cerradas.`,
      );
      refresh();
    });

  if (showSessions) {
    return (
      <SecuritySessions
        sessions={sessionsSorted}
        currentSessionId={currentSessionId}
        isPending={isPending}
        onRevokeSession={onRevokeSession}
        onRevokeOtherSessions={onRevokeOtherSessions}
      />
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-popover-secondary rounded-lg border border-gray-200 dark:border-border shadow-sm">
        <div className="space-y-4">
          {/* Password */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center">
                  <p className="font-medium text-base leading-6 text-gray-900 dark:text-white">
                    Contraseña
                  </p>
                </div>
                <p className="text-gray-500 dark:text-text-muted text-sm leading-5 mt-1">
                  {hasPassword
                    ? "Cambia tu contraseña para mantener tu cuenta segura"
                    : "Establece o cambia tu contraseña para acceder a tu cuenta"}
                </p>
              </div>

              <PasswordChangeDialog hasPassword={hasPassword} isPending={isPending} />
            </div>
          </div>

          {/* MFA */}
          <div className="pt-4 border-t border-gray-200 dark:border-border">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-base font-medium text-foreground">
                    Multi-factor authentication (TOTP)
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Protege tu cuenta con una app de autenticación
                  </div>
                </div>

                {mfaEnabled ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDeleteMfaPreDialogOpen(true)}
                      disabled={isPending}
                      className="cursor-pointer"
                    >
                      Desactivar
                    </Button>

                    <MfaDisableDialog
                      isPreDialogOpen={isDeleteMfaPreDialogOpen}
                      onPreDialogOpenChange={setIsDeleteMfaPreDialogOpen}
                      isDialogOpen={isDeleteMfaDialogOpen}
                      onDialogOpenChange={(open) => {
                        setIsDeleteMfaDialogOpen(open);
                        if (!open) {
                          setIsMfaDialogOpen(false);
                        }
                      }}
                      factorId={factors[0]?.id ?? ""}
                      onSuccess={() => {
                        setIsDeleteMfaPreDialogOpen(false);
                        setIsDeleteMfaDialogOpen(false);
                        setIsMfaDialogOpen(false);
                        refresh();
                      }}
                      isPending={isPending}
                    />
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      onClick={() => setIsMfaDialogOpen(true)}
                      variant="accent"
                      className="cursor-pointer"
                    >
                      Activar MFA
                    </Button>

                    <MfaEnableDialog
                      isOpen={isMfaDialogOpen}
                      onOpenChange={setIsMfaDialogOpen}
                      onSuccess={refresh}
                      isPending={isPending}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}

"use client";

import { useState, useTransition, useMemo, useCallback, useEffect } from "react";
import { Button } from "@rift/ui/button";
import { toast } from "sonner";
import { revokeSession } from "@/actions/settings/security/revokeSession";
import { revokeOtherSessions } from "@/actions/settings/security/revokeOtherSessions";
import { getCurrentUserSecurityState } from "@/actions/settings/security/getCurrentUserSecurityState";
import type { SecuritySession } from "@/actions/settings/security/getCurrentUserSecurityState";
import { LaptopIcon, PhoneIcon, getDeviceType, parseUserAgent, formatLastSeen } from "./security-utils";
import { SecuritySessionsSkeleton } from "./SecuritySessionsSkeleton";

export function SecuritySessionsClient({
  initialCurrentSessionId,
}: {
  initialCurrentSessionId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [sessions, setSessions] = useState<SecuritySession[] | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string>(initialCurrentSessionId);

  useEffect(() => {
    startTransition(async () => {
      const result = await getCurrentUserSecurityState();
      if (!result.success) {
        toast.error(result.error ?? "No se pudo cargar las sesiones.");
        return;
      }
      setSessions(result.sessions);
      setCurrentSessionId(result.currentSessionId);
    });
  }, []);

  const refresh = useCallback(() => {
    startTransition(async () => {
      const result = await getCurrentUserSecurityState();
      if (!result.success) {
        toast.error(result.error ?? "No se pudo actualizar.");
        return;
      }
      setSessions(result.sessions);
      setCurrentSessionId(result.currentSessionId);
    });
  }, []);

  const onRevokeSession = useCallback((sessionId: string) => {
    startTransition(async () => {
      const result = await revokeSession(sessionId);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo cerrar la sesión.");
        return;
      }
      toast.success("Sesión cerrada.");
      refresh();
    });
  }, [refresh]);

  const onRevokeOtherSessions = useCallback(() => {
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
  }, [refresh]);

  const sessionsSorted = useMemo(() => {
    if (!sessions) return [];
    return [...sessions].toSorted((a, b) => {
      const aIsCurrent = a.id === currentSessionId;
      const bIsCurrent = b.id === currentSessionId;
      if (aIsCurrent && !bIsCurrent) return -1;
      if (!aIsCurrent && bIsCurrent) return 1;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
  }, [sessions, currentSessionId]);

  const otherActiveSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter(
      (s) => s.id !== currentSessionId && s.status === "active"
    );
  }, [sessions, currentSessionId]);

  if (sessions === null) {
    return <SecuritySessionsSkeleton />;
  }

  return (
    <>
      <div className="space-y-6">
        {sessionsSorted.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            No hay sesiones activas
          </div>
        ) : (
          sessionsSorted.map((s) => {
            const isCurrent = s.id === currentSessionId;
            const deviceType = getDeviceType(s.userAgent);
            const { browser, os } = parseUserAgent(s.userAgent);
            const lastSeen = isCurrent ? "Sesión activa" : formatLastSeen(s.updatedAt);

            return (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 text-gray-700 dark:text-gray-300">
                    {deviceType === "phone" ? (
                      <PhoneIcon className="w-5 h-7" />
                    ) : (
                      <LaptopIcon className="w-7 h-6" />
                    )}
                  </div>
                  <div className="min-w-0 space-y-0.5 flex-1">
                    <div className="text-sm font-medium text-foreground">
                      {browser} en {os}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {s.ipAddress ?? "Ubicación desconocida"} <span className="mx-1.5">∙</span>{lastSeen}
                    </div>
                  </div>
                </div>

                {!isCurrent ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRevokeSession(s.id)}
                    disabled={isPending || s.status !== "active"}
                    className="cursor-pointer"
                  >
                    Eliminar
                  </Button>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {otherActiveSessions.length > 0 ? (
        <div className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-base font-medium text-foreground">
                Cerrar otras sesiones
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Elimina el acceso de todos los dispositivos excepto este.
              </div>
            </div>
            <Button
              type="button"
              onClick={onRevokeOtherSessions}
              disabled={isPending}
              variant="accent"
              className="cursor-pointer text-white dark:text-white"
            >
              Cerrar otras sesiones
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

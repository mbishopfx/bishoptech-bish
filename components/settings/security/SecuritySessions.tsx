"use client";

import { Button } from "@/components/ai/ui/button";
import { type SecuritySession } from "@/actions/settings/security/getCurrentUserSecurityState";
import { LaptopIcon, PhoneIcon, getDeviceType, parseUserAgent, formatLastSeen } from "./security-utils";

export function SecuritySessions({
  sessions,
  currentSessionId,
  isPending,
  onRevokeSession,
  onRevokeOtherSessions,
}: {
  sessions: SecuritySession[];
  currentSessionId: string;
  isPending: boolean;
  onRevokeSession: (sessionId: string) => void;
  onRevokeOtherSessions: () => void;
}) {
  return (
    <div className="p-6 bg-white dark:bg-popover-secondary rounded-lg border border-gray-200 dark:border-border shadow-sm">
      <div className="space-y-6">

        <div className="space-y-6">
          {sessions.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No hay sesiones activas
            </div>
          ) : (
            sessions.map((s) => {
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

                {!isCurrent && (
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
                )}
              </div>
            );
          })
          )}
        </div>

        {sessions.filter((s) => s.id !== currentSessionId && s.status === "active").length > 0 && (
          <div className="pt-4 border-t border-gray-200 dark:border-border">
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
                className="cursor-pointer"
              >
                Cerrar otras sesiones
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

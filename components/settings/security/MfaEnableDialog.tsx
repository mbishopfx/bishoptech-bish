"use client";

import { useState, useTransition, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ai/ui/button";
import { SettingRow, SettingsInput } from "@/components/settings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ai/ui/dialog";
import { startTotpEnrollment } from "@/actions/settings/security/startTotpEnrollment";
import { verifyTotpEnrollment } from "@/actions/settings/security/verifyTotpEnrollment";

type TotpEnrollmentState =
  | {
      status: "idle";
    }
  | {
      status: "loading";
      code: string;
    }
  | {
      status: "enrolling";
      factorId: string;
      challengeId: string;
      qrCodeDataUrl: string;
      secret: string;
      uri: string;
      code: string;
    };

interface MfaEnableDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  isPending: boolean;
}

export function MfaEnableDialog({ isOpen, onOpenChange, onSuccess, isPending: parentIsPending }: MfaEnableDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [totp, setTotp] = useState<TotpEnrollmentState>({ status: "idle" });
  const [mfaError, setMfaError] = useState<string | null>(null);

  // Automatically start TOTP enrollment when dialog opens
  useEffect(() => {
    if (isOpen && totp.status === "idle") {
      onStartTotp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const onStartTotp = () => {
    setTotp({ status: "loading", code: "" });
    setMfaError(null);
    startTransition(async () => {
      const result = await startTotpEnrollment();
      if (!result.success) {
        setMfaError(result.error ?? "No se pudo iniciar la configuración.");
        setTotp({ status: "idle" });
        return;
      }

      setTotp({
        status: "enrolling",
        factorId: result.factorId,
        challengeId: result.challengeId,
        qrCodeDataUrl: result.qrCodeDataUrl,
        secret: result.secret,
        uri: result.uri,
        code: "",
      });
    });
  };

  const onVerifyTotp = () =>
    startTransition(async () => {
      if (totp.status !== "enrolling") return;

      const result = await verifyTotpEnrollment({
        challengeId: totp.challengeId,
        code: totp.code,
      });

      if (!result.success) {
        setMfaError(result.error);
        return;
      }

      setMfaError(null);
      setTotp({ status: "idle" });
      onSuccess();
    });

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTotp({ status: "idle" });
      setMfaError(null);
    }
    onOpenChange(open);
  };

  const isLoading = isPending || parentIsPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="w-full rounded-2xl border border-border/50 bg-white/95 dark:bg-popover-main shadow-2xl"
        style={{ boxSizing: 'content-box' }}
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
          <div className="space-y-6 p-4">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-2xl font-bold text-foreground dark:text-popover-text">
                Configurar autenticación de dos factores
              </DialogTitle>
              <DialogDescription className="text-base text-muted-foreground leading-relaxed">
                Escanea el código QR con tu app de autenticación y luego ingresa el código de 6 dígitos para verificar.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0 flex flex-col gap-3">
                {totp.status === "loading" ? (
                  <div className="rounded-lg border border-border/60 bg-white dark:bg-popover-secondary p-3 w-fit">
                    <div className="w-[180px] h-[180px] bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                  </div>
                ) : totp.status === "enrolling" ? (
                  <div className="rounded-lg border border-border/60 bg-white dark:bg-popover-secondary p-3 w-fit">
                    <Image
                      src={totp.qrCodeDataUrl}
                      alt="TOTP QR code"
                      width={180}
                      height={180}
                      unoptimized
                    />
                  </div>
                ) : null}
                {mfaError && (
                  <div className="flex items-center gap-2 text-sm text-destructive max-w-[180px]">
                    <svg
                      className="size-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span>{mfaError}</span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-4">
                <div>
                  <div className="text-sm font-medium text-foreground mb-2">
                    Si tu app no puede escanear el QR, usa este secreto:
                  </div>
                  {totp.status === "loading" ? (
                    <div className="rounded-lg border border-border/60 bg-gray-200 dark:bg-gray-700 p-3 w-full animate-pulse">
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full" />
                    </div>
                  ) : totp.status === "enrolling" ? (
                    <code className="block text-xs break-all rounded-lg border border-border/60 bg-black/[0.03] dark:bg-black/40 p-3 w-full overflow-hidden" style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                      {totp.secret}
                    </code>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Código de 6 dígitos
                  </label>
                  <SettingsInput
                    type="text"
                    value={totp.status === "enrolling" ? totp.code : ""}
                    onChange={(e) => {
                      setMfaError(null);
                      setTotp((prev) =>
                        prev.status === "enrolling"
                          ? {
                              ...prev,
                              code: e.target.value.replace(/\D/g, "").slice(0, 6),
                            }
                          : prev,
                      );
                    }}
                    placeholder="123456"
                    className="max-w-xs"
                    width="w-[200px]"
                    error={!!mfaError}
                    disabled={totp.status !== "enrolling"}
                  />
                </div>

                <div className="pt-4 border-t border-border/30 space-y-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setTotp({ status: "idle" });
                        handleOpenChange(false);
                        setMfaError(null);
                      }}
                      disabled={isLoading}
                      className="cursor-pointer rounded-lg font-medium"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={onVerifyTotp}
                      disabled={isLoading || totp.status === "loading" || (totp.status === "enrolling" && totp.code.length !== 6)}
                      className="cursor-pointer rounded-lg font-medium gap-2 min-w-[150px]"
                      variant="accent"
                    >
                      {isLoading ? "Verificando..." : "Verificar y activar"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}

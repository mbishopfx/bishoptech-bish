"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ai/ui/button";
import { SettingRow, SettingsInput } from "@/components/settings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ai/ui/dialog";
import { Eye, EyeOff } from "lucide-react";
import { changeCurrentUserPassword } from "@/actions/settings/security/changeCurrentUserPassword";
import { setCurrentUserPassword } from "@/actions/settings/security/setCurrentUserPassword";
import { sendSecurityEmailVerification } from "@/actions/settings/security/sendSecurityEmailVerification";
import { confirmSecurityEmailVerification } from "@/actions/settings/security/confirmSecurityEmailVerification";

interface PasswordChangeDialogProps {
  hasPassword: boolean;
  isPending: boolean;
}

export function PasswordChangeDialog({ hasPassword, isPending: parentIsPending }: PasswordChangeDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [isPasswordPreDialogOpen, setIsPasswordPreDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordStepUpCode, setPasswordStepUpCode] = useState("");
  const [passwordStepUpError, setPasswordStepUpError] = useState<string | null>(null);
  const [passwordStepUpVerified, setPasswordStepUpVerified] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const onChangePassword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    startTransition(async () => {
      setPasswordError(null);
      setPasswordSuccess(false);
      if (newPassword !== confirmPassword) {
        setPasswordError("Las contraseñas no coinciden.");
        return;
      }
      if (newPassword.length < 12) {
        setPasswordError("La nueva contraseña debe tener al menos 12 caracteres.");
        return;
      }

      const result = hasPassword
        ? await changeCurrentUserPassword({
            currentPassword,
            newPassword,
          })
        : await setCurrentUserPassword({
            newPassword,
          });

      if (!result.success) {
        setPasswordError(result.error);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setPasswordSuccess(true);
      setTimeout(() => {
        setPasswordSuccess(false);
        setIsPasswordDialogOpen(false);
      }, 3000);
    });
  };

  const beginPasswordStepUp = () =>
    startTransition(async () => {
      setPasswordStepUpError(null);
      setPasswordStepUpCode("");
      setPasswordStepUpVerified(false);
      const res = await sendSecurityEmailVerification();
      if (!res.success) {
        setPasswordStepUpError(
          res.error ?? "No se pudo enviar el código. Intenta de nuevo.",
        );
      }
    });

  const verifyPasswordStepUp = () =>
    startTransition(async () => {
      setPasswordStepUpError(null);
      const res = await confirmSecurityEmailVerification(passwordStepUpCode);
      if (!res.success) {
        setPasswordStepUpError(res.error);
        return;
      }
      setPasswordStepUpVerified(true);
    });

  const openPasswordFlow = () => {
    setIsPasswordPreDialogOpen(false);
    setIsPasswordDialogOpen(true);
    beginPasswordStepUp();
  };

  const isLoading = isPending || parentIsPending;

  return (
    <>
      {/* Pre-step-up confirmation */}
      <Dialog
        open={isPasswordPreDialogOpen}
        onOpenChange={setIsPasswordPreDialogOpen}
      >
        <DialogTrigger asChild>
          <Button type="button" variant="accent" className="cursor-pointer">
            {hasPassword ? "Cambiar contraseña" : "Crear contraseña"}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md rounded-2xl border border-border/50 bg-white/95 dark:bg-popover-main shadow-2xl">
          <div className="space-y-6 p-2">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-2xl font-bold text-foreground dark:text-popover-text">
                Verificar identidad
              </DialogTitle>
              <DialogDescription className="text-base text-muted-foreground leading-relaxed">
                Para continuar, necesitamos verificar tu identidad enviando un
                código a tu correo.
              </DialogDescription>
            </DialogHeader>

            <div className="pt-4 border-t border-border/30">
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPasswordPreDialogOpen(false)}
                  disabled={isLoading}
                  className="cursor-pointer rounded-lg font-medium"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="accent"
                  onClick={openPasswordFlow}
                  disabled={isLoading}
                  className="cursor-pointer rounded-lg font-medium gap-2 min-w-[150px]"
                >
                  Continuar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Step-up + password dialog */}
      <Dialog
        open={isPasswordDialogOpen}
        onOpenChange={(open) => {
          setIsPasswordDialogOpen(open);
          if (!open) {
            setPasswordStepUpCode("");
            setPasswordStepUpError(null);
            setPasswordStepUpVerified(false);
            setPasswordError(null);
            setPasswordSuccess(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setShowCurrentPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border border-border/50 bg-white/95 dark:bg-popover-main shadow-2xl" style={{ boxSizing: 'content-box' }}>
          {passwordSuccess ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
                <svg
                  className="size-12 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div className="space-y-2">
                <DialogTitle className="text-2xl font-bold text-foreground dark:text-popover-text">
                  Contraseña actualizada
                </DialogTitle>
                <DialogDescription className="text-base text-muted-foreground max-w-md">
                  Tu contraseña ha sido actualizada correctamente.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-4 pt-4">
                <Button
                  onClick={() => {
                    setIsPasswordDialogOpen(false);
                    setPasswordSuccess(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setShowCurrentPassword(false);
                    setShowNewPassword(false);
                    setShowConfirmPassword(false);
                    setPasswordError(null);
                  }}
                  className="cursor-pointer rounded-lg font-medium min-w-[100px]"
                  variant="accent"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 p-2">
              <DialogHeader className="space-y-2">
                <DialogTitle className="text-2xl font-bold text-foreground dark:text-popover-text">
                  {hasPassword ? "Cambiar contraseña" : "Crear contraseña"}
                </DialogTitle>
                {!passwordStepUpVerified ? (
                  <DialogDescription className="text-base text-muted-foreground leading-relaxed">
                    Primero verifica tu identidad con un código enviado a tu correo.
                  </DialogDescription>
                ) : (
                  <DialogDescription className="text-base text-muted-foreground leading-relaxed">
                    {hasPassword
                      ? "Ingresa tu contraseña actual y la nueva contraseña."
                      : "Ingresa tu nueva contraseña."}
                  </DialogDescription>
                )}
              </DialogHeader>

              {!passwordStepUpVerified ? (
                <div className="space-y-4">
                  <SettingRow label="Código de verificación">
                    <SettingsInput
                      type="text"
                      value={passwordStepUpCode}
                      onChange={(e) =>
                        setPasswordStepUpCode(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      width="w-full"
                      placeholder="123456"
                      error={!!passwordStepUpError}
                    />
                  </SettingRow>

                  {passwordStepUpError && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <span>{passwordStepUpError}</span>
                    </div>
                  )}

                  <div className="pt-4 border-t border-border/30 space-y-3">
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsPasswordDialogOpen(false)}
                        disabled={isLoading}
                        className="cursor-pointer rounded-lg font-medium mr-2"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        disabled={isLoading || passwordStepUpCode.length !== 6}
                        className="cursor-pointer rounded-lg font-medium gap-2 min-w-[150px]"
                        variant="accent"
                        onClick={verifyPasswordStepUp}
                      >
                        {isLoading ? "Verificando..." : "Verificar"}
                      </Button>
                    </div>
                    <button
                      type="button"
                      className="text-sm text-gray-500 hover:text-gray-700 dark:text-text-muted dark:hover:text-white underline underline-offset-4"
                      onClick={beginPasswordStepUp}
                      disabled={isLoading}
                    >
                      Reenviar código
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={onChangePassword} className="space-y-4">
                  {hasPassword && (
                    <SettingRow label="Contraseña actual">
                      <div className="relative w-full">
                        <SettingsInput
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          autoComplete="current-password"
                          width="w-full"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-text-muted dark:hover:text-white transition-colors"
                          aria-label={showCurrentPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </SettingRow>
                  )}

                  <SettingRow label="Nueva contraseña">
                    <div className="relative w-full">
                      <SettingsInput
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        width="w-full"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-text-muted dark:hover:text-white transition-colors"
                        aria-label={showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </SettingRow>

                  <SettingRow label="Confirmar nueva contraseña">
                    <div className="relative w-full">
                      <SettingsInput
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        width="w-full"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-text-muted dark:hover:text-white transition-colors"
                        aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </SettingRow>

                {passwordError && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
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
                    <span>{passwordError}</span>
                  </div>
                )}

                <div className="pt-4 border-t border-border/30 space-y-3">
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsPasswordDialogOpen(false);
                      }}
                      disabled={isLoading}
                      className="cursor-pointer rounded-lg font-medium mr-2"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="cursor-pointer rounded-lg font-medium gap-2 min-w-[150px]"
                      variant="accent"
                    >
                      {isLoading ? "Guardando..." : "Guardar cambios"}
                    </Button>
                  </div>
                </div>
                </form>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

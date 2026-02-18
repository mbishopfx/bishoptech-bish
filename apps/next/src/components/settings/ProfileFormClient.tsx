"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { updateCurrentUserProfile } from "@/actions/updateCurrentUserProfile";
import { type CurrentUserProfile } from "@/actions/getCurrentUserProfile";
import { SettingRow, SettingsInput } from "@/components/settings";
import { Button } from "@rift/ui/button";

export type ProfileFormUser = CurrentUserProfile;

const THROTTLE_MS = 2000;

function getInitial(name: string) {
  return name.charAt(0).toUpperCase();
}

function getDisplayName(firstName: string | null | undefined, lastName: string | null | undefined, email: string) {
  const name = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return name || email;
}

interface ProfileFormContextValue {
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  firstName: string;
  setFirstName: (value: string) => void;
  lastName: string;
  setLastName: (value: string) => void;
  savedFirstName: string;
  savedLastName: string;
  isPending: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  onSave: (e: React.FormEvent) => void;
  handleCancel: () => void;
  isDirty: boolean;
  isSubmitCoolingDown: boolean;
  initialUser: ProfileFormUser;
}

const ProfileFormContext = createContext<ProfileFormContextValue | null>(null);

function useProfileForm() {
  const context = useContext(ProfileFormContext);
  if (!context) {
    throw new Error("useProfileForm must be used within ProfileFormProvider");
  }
  return context;
}

export interface ProfileFormProviderProps {
  initialUser: ProfileFormUser;
  children: React.ReactNode;
}

export function ProfileFormProvider({ initialUser, children }: ProfileFormProviderProps) {
  const [savedFirstName, setSavedFirstName] = useState(initialUser.firstName ?? "");
  const [savedLastName, setSavedLastName] = useState(initialUser.lastName ?? "");
  const [firstName, setFirstName] = useState(initialUser.firstName ?? "");
  const [lastName, setLastName] = useState(initialUser.lastName ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const lastSubmitTimeRef = useRef<number>(0);
  const [isSubmitCoolingDown, setIsSubmitCoolingDown] = useState(false);
  const cooldownTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownTimeoutRef.current !== null) {
        window.clearTimeout(cooldownTimeoutRef.current);
        cooldownTimeoutRef.current = null;
      }
    };
  }, []);

  const isDirty = useMemo(
    () => firstName !== savedFirstName || lastName !== savedLastName,
    [firstName, lastName, savedFirstName, savedLastName]
  );

  const onSave = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    const now = Date.now();
    const timeSinceLastSubmit = now - lastSubmitTimeRef.current;
    
    if (timeSinceLastSubmit < THROTTLE_MS && lastSubmitTimeRef.current > 0) {
      return;
    }
    
    lastSubmitTimeRef.current = now;
    setIsSubmitCoolingDown(true);
    if (cooldownTimeoutRef.current !== null) {
      window.clearTimeout(cooldownTimeoutRef.current);
    }
    cooldownTimeoutRef.current = window.setTimeout(() => {
      setIsSubmitCoolingDown(false);
      cooldownTimeoutRef.current = null;
    }, THROTTLE_MS);
    
    startTransition(async () => {
      setError(null);

      const trimmedFirstName = firstName.trim();
      const trimmedLastName = lastName.trim();

      const result = await updateCurrentUserProfile({
        firstName: trimmedFirstName || null,
        lastName: trimmedLastName || null,
      });

      if (!result.success) {
        setError(result.error ?? "No se pudo guardar el perfil.");
        return;
      }

      const newFirstName = result.user.firstName ?? trimmedFirstName ?? "";
      const newLastName = result.user.lastName ?? trimmedLastName ?? "";
      setFirstName(newFirstName);
      setLastName(newLastName);
      setSavedFirstName(newFirstName);
      setSavedLastName(newLastName);
      
      setIsEditing(false);
    });
  }, [firstName, lastName]);

  const handleCancel = useCallback(() => {
    setFirstName(savedFirstName);
    setLastName(savedLastName);
    setError(null);
    setIsEditing(false);
  }, [savedFirstName, savedLastName]);

  const contextValue = useMemo(
    () => ({
      isEditing,
      setIsEditing,
      firstName,
      setFirstName,
      lastName,
      setLastName,
      savedFirstName,
      savedLastName,
      isPending,
      error,
      setError,
      onSave,
      handleCancel,
      isDirty,
      isSubmitCoolingDown,
      initialUser,
    }),
    [
      isEditing,
      firstName,
      lastName,
      savedFirstName,
      savedLastName,
      isPending,
      error,
      onSave,
      handleCancel,
      isDirty,
      isSubmitCoolingDown,
      initialUser,
    ]
  );

  return (
    <ProfileFormContext.Provider value={contextValue}>
      {children}
    </ProfileFormContext.Provider>
  );
}

export function ProfileFormButton() {
  const { isEditing, setIsEditing } = useProfileForm();

  if (isEditing) {
    return null;
  }

  return (
    <Button
      type="button"
      onClick={() => setIsEditing(true)}
      variant="accent"
      className="gap-2 border border-border/60 shadow-sm shadow-black/5 dark:shadow-black/30 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Editar perfil
    </Button>
  );
}

export function ProfileDisplay() {
  const { initialUser } = useProfileForm();
  const displayName = getDisplayName(initialUser.firstName, initialUser.lastName, initialUser.email);

  return (
    <div className="flex items-center gap-4">
      <div className="flex-shrink-0">
        {initialUser.profilePictureUrl ? (
          <img
            className="h-16 w-16 rounded-full object-cover"
            src={initialUser.profilePictureUrl}
            alt={displayName}
            width={64}
            height={64}
          />
        ) : (
          <div className="h-16 w-16 rounded-full bg-gradient-to-t from-blue-500 to-blue-400 flex items-center justify-center">
            <span className="text-xl font-semibold text-white">
              {getInitial(displayName)}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {displayName}
        </h3>
        <p className="text-sm text-gray-500 dark:text-text-muted">
          {initialUser.email}
        </p>
      </div>
      <ProfileFormButton />
    </div>
  );
}

export function ProfileFormContent() {
  const {
    isEditing,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    isPending,
    error,
    onSave,
    handleCancel,
    isDirty,
    isSubmitCoolingDown,
    initialUser,
  } = useProfileForm();

  if (!isEditing) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 dark:border-border pt-4">
      <form onSubmit={onSave} className="space-y-4">
        <SettingRow label="Correo electrónico" labelClassName="mb-[5px]">
          <SettingsInput
            type="email"
            value={initialUser.email}
            readOnly
            disabled
            className="opacity-60 cursor-not-allowed"
            width="w-[350px]"
          />
        </SettingRow>

        <SettingRow label="Nombre">
          <SettingsInput
            type="text"
            placeholder="Ingresa tu nombre"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            maxLength={100}
            autoComplete="given-name"
            width="w-[350px]"
          />
        </SettingRow>

        <SettingRow label="Apellido" labelClassName="mt-[5px]">
          <SettingsInput
            type="text"
            placeholder="Ingresa tu apellido"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            maxLength={100}
            autoComplete="family-name"
            width="w-[350px]"
          />
        </SettingRow>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="flex justify-start items-start gap-2 pt-0">
          <Button 
            type="submit" 
            disabled={!isDirty || isPending || isSubmitCoolingDown} 
            variant="accent"
            className="gap-2 border border-border/60 shadow-sm shadow-black/5 dark:shadow-black/30 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
          <Button
            type="button"
            onClick={handleCancel}
            variant="ghost"
            disabled={isPending}
            className="gap-2 border border-border/60 bg-white/90 dark:bg-popover-secondary/75 dark:shadow-black/30 hover:bg-black/[0.04] dark:hover:bg-hover/30 hover:text-foreground dark:hover:text-popover-text disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}


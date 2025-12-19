"use server";

import { Effect, Option } from "effect";

import {
  callWorkosApiEffect,
  getAuthenticatedUserEffect,
  SecurityActionError,
  workos,
} from "@/actions/settings/security/security-effect";

type UpdateCurrentUserProfileArgs = {
  firstName: string | null;
  lastName: string | null;
};

type UpdateCurrentUserProfileResult =
  | {
      success: true;
      user: {
        id: string;
        email: string;
        firstName?: string | null;
        lastName?: string | null;
        profilePictureUrl?: string | null;
      };
    }
  | { success: false; error: string };

/**
 * Maps SecurityActionError to user-friendly error messages.
 */
const errorToMessage = (
  error: SecurityActionError,
  fallbackMessage: string,
): string => {
  switch (error._tag) {
    case "SecurityAuthError":
      return "Necesitas iniciar sesión para continuar.";

    case "WorkosApiError": {
      const status = error.status;
      
      const statusMessageMap: Record<number, string> = {
        401: "No autorizado.",
        403: "No autorizado.",
        404: "Usuario no encontrado.",
        429: "Demasiadas solicitudes. Intenta de nuevo en unos segundos.",
      };

      const exactMatch = typeof status === "number" 
        ? Option.fromNullable(statusMessageMap[status])
        : Option.none();

      return Option.getOrElse(exactMatch, () => {
        const isServerError = typeof status === "number" && status >= 500;
        return Option.match(Option.some(isServerError), {
          onSome: (isServer) =>
            isServer
              ? "Servicio temporalmente no disponible. Intenta de nuevo."
              : error.message || fallbackMessage,
          onNone: () => error.message || fallbackMessage,
        });
      });
    }

    case "SecurityStepUpRequiredError":
      return "Necesitas verificar tu identidad por correo para continuar.";

    case "SecurityValidationError":
    case "SecurityNotFoundError":
    case "SecurityConfigError":
      return error.message;

    default:
      return fallbackMessage;
  }
};

const runProfileAction = async <T extends UpdateCurrentUserProfileResult>(args: {
  actionName: string;
  program: Effect.Effect<T, SecurityActionError, never>;
  fallbackMessage?: string;
}): Promise<T> => {
  const fallback = args.fallbackMessage ?? "Error al actualizar el perfil";

  const effect = args.program.pipe(
    Effect.catchTags({
      SecurityAuthError: (error) =>
        Effect.sync(() => {
          console.error(`[profile] ${args.actionName} failed: authentication error`);
          return {
            success: false as const,
            error: errorToMessage(error, fallback),
          } as T;
        }),
      WorkosApiError: (error) =>
        Effect.sync(() => {
          console.error(`[profile] ${args.actionName} failed: WorkOS API error`, {
            operation: error.operation,
            status: error.status,
            code: error.code,
          });
          return {
            success: false as const,
            error: errorToMessage(error, fallback),
          } as T;
        }),
      SecurityStepUpRequiredError: (error) =>
        Effect.sync(() => {
          console.error(`[profile] ${args.actionName} failed: step-up required`);
          return {
            success: false as const,
            error: errorToMessage(error, fallback),
          } as T;
        }),
      SecurityValidationError: (error) =>
        Effect.sync(() => {
          console.error(`[profile] ${args.actionName} failed: validation error`, { error });
          return {
            success: false as const,
            error: errorToMessage(error, fallback),
          } as T;
        }),
      SecurityNotFoundError: (error) =>
        Effect.sync(() => {
          console.error(`[profile] ${args.actionName} failed: not found`, { error });
          return {
            success: false as const,
            error: errorToMessage(error, fallback),
          } as T;
        }),
      SecurityConfigError: (error) =>
        Effect.sync(() => {
          console.error(`[profile] ${args.actionName} failed: config error`, { error });
          return {
            success: false as const,
            error: errorToMessage(error, fallback),
          } as T;
        }),
    }),
    Effect.catchAll((error) =>
      Effect.sync(() => {
        console.error(`[profile] ${args.actionName} failed`, { error });
        return {
          success: false as const,
          error: errorToMessage(error as SecurityActionError, fallback),
        } as T;
      }),
    ),
    Effect.catchAllDefect((defect) =>
      Effect.sync(() => {
        console.error(`[profile] ${args.actionName} failed (defect)`, { defect });
        return {
          success: false as const,
          error: fallback,
        } as T;
      }),
    ),
  );

  return Effect.runPromise(effect);
};

export async function updateCurrentUserProfile(
  args: UpdateCurrentUserProfileArgs,
): Promise<UpdateCurrentUserProfileResult> {
  return runProfileAction({
    actionName: "updateCurrentUserProfile",
    fallbackMessage: "Error al actualizar el perfil",
    program: Effect.gen(function* () {
      const { user } = yield* getAuthenticatedUserEffect();

      const updated = yield* callWorkosApiEffect(
        "userManagement.updateUser",
        () =>
          workos.userManagement.updateUser({
            userId: user.id,
            firstName: args.firstName ?? undefined,
            lastName: args.lastName ?? undefined,
          }),
      );

      return {
        success: true as const,
        user: {
          id: updated.id,
          email: updated.email,
          firstName: updated.firstName ?? null,
          lastName: updated.lastName ?? null,
          profilePictureUrl: updated.profilePictureUrl ?? null,
        },
      } satisfies UpdateCurrentUserProfileResult;
    }),
  });
}


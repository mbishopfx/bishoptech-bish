"use client";

import { PasswordChangeDialog } from "./PasswordChangeDialog";

export function PasswordSettings() {
  return <PasswordChangeDialog hasPassword={true} isPending={false} />;
}

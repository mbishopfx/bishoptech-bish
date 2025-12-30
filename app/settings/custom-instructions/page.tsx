"use client";

import { InstructionManager } from "@/components/custom-instructions/InstructionManager";
import { useAuth } from "@workos-inc/authkit-nextjs/components";

export default function CustomInstructionsPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="py-6 px-4 md:py-12 md:px-12 flex flex-col max-w-4xl min-w-0 md:min-w-[520px] w-full min-h-full box-border bg-background dark:bg-popover-main">
      <InstructionManager />
    </div>
  );
}

"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ai/ui/button";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  /**
   * Controls visual style without impacting other pages.
   * - default: uses outline variant
   * - secondary: uses secondary variant
   * - ghost: uses ghost variant
   */
  styleType?: "default" | "secondary" | "ghost";
}

export function ThemeToggle({
  className,
  size = "md",
  styleType = "default",
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const buttonSizeMap = {
    sm: "sm" as const,
    md: "icon" as const,
    lg: "lg" as const,
  };

  const isDark = mounted ? resolvedTheme === "dark" : false;

  const variantMap = {
    default: "outline" as const,
    secondary: "secondary" as const,
    ghost: "ghost" as const,
  };

  const variant = variantMap[styleType || "default"];

  return (
    <Button
      type="button"
      variant={variant}
      size={buttonSizeMap[size]}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={className}
    >
      {isDark ? (
        <Sun className="transition-transform" />
      ) : (
        <Moon className="transition-transform" />
      )}
    </Button>
  );
}

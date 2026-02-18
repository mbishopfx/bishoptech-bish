"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";

const themeOptions = [
  {
    id: "light" as Theme,
    name: "Claro",
    description: "Tema claro por defecto",
    preview: "bg-white",
    icon: "bg-gray-100",
  },
  {
    id: "dark" as Theme,
    name: "Oscuro",
    description: "Tema oscuro para poca luz",
    preview: "bg-gray-900",
    icon: "bg-gray-700",
  },
  {
    id: "system" as Theme,
    name: "Sistema",
    description: "Seguir preferencia del sistema",
    preview: "split-preview",
    icon: "monitor",
  },
] as const;

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = useCallback(
    (newTheme: Theme) => {
      setTheme(newTheme);
    },
    [setTheme]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, themeOption: Theme) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleThemeChange(themeOption);
      }
    },
    [handleThemeChange]
  );

  return (
    <div className="grid grid-cols-3 gap-4">
      {themeOptions.map((themeOption) => {
        // Only show as selected once mounted and theme is available
        const isSelected = mounted && theme === themeOption.id;
        const borderColor = isSelected
          ? "border-blue-500"
          : "border-gray-200 dark:border-border";

        return (
          <div
            key={themeOption.id}
            className={`border-2 ${borderColor} rounded-lg p-4 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-popover-main`}
            onClick={() => handleThemeChange(themeOption.id)}
            onKeyDown={(e) => handleKeyDown(e, themeOption.id)}
            tabIndex={0}
            role="button"
            aria-label={`Seleccionar tema ${themeOption.name.toLowerCase()}`}
            aria-pressed={isSelected}
          >
            <div
              className={`${
                themeOption.preview === "split-preview"
                  ? ""
                  : themeOption.preview
              } rounded border h-20 mb-3 flex items-center justify-center relative overflow-hidden ${
                themeOption.preview === "split-preview" ? "bg-gray-100 dark:bg-gray-800" : ""
              }`}
            >
              {themeOption.preview === "split-preview" && (
                <>
                  <div 
                    className="absolute inset-0 bg-white" 
                    style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}
                  ></div>
                  <div 
                    className="absolute inset-0 bg-gray-900" 
                    style={{ clipPath: 'polygon(0 0, 0 100%, 100% 100%)' }}
                  ></div>
                </>
              )}
              {themeOption.icon === "monitor" ? (
                <Monitor className="w-8 h-8 text-gray-600 dark:text-gray-400 relative z-10 drop-shadow-sm" />
              ) : (
                <div className={`w-8 h-8 ${themeOption.icon} rounded relative z-10`}></div>
              )}
            </div>
            <div className="text-center">
              <h3 className="font-medium text-gray-900 dark:text-white">
                {themeOption.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-text-muted">
                {themeOption.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

const THEME_COLOR_META_SELECTOR = 'meta[name="theme-color"]';

export function ThemeColorUpdater() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const root = document.documentElement;
    const body = document.body;
    if (!root || !body) {
      return;
    }

    const backgroundColor = window.getComputedStyle(root).backgroundColor;
    if (!backgroundColor) {
      return;
    }

    // Keep the overscroll/background color in sync with the active theme.
    body.style.backgroundColor = backgroundColor;
    root.style.backgroundColor = backgroundColor;

    const metaThemeColor = document.querySelector<HTMLMetaElement>(THEME_COLOR_META_SELECTOR);
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", backgroundColor);
    }
  }, [resolvedTheme]);

  return null;
}




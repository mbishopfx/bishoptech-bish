"use client";

import React from "react";

export function ConversationPromptBackdrop({
  className,
  edge = "bottom",
  position = "fixed",
  height = 200,
  backgroundVar = "var(--background, transparent)",
}: {
  className?: string;
  edge?: "top" | "bottom";
  position?: "fixed" | "absolute";
  height?: number;
  /** CSS variable or value for gradient start (e.g. var(--background-secondary) for sidebar). */
  backgroundVar?: string;
}) {
  const to = edge === "top" ? "bottom" : "top";

  return (
    <div
      aria-hidden="true"
      className={[
        "pointer-events-none z-10",
        position,
        edge === "top" ? "top-0" : "bottom-0",
        className ?? "inset-x-0",
      ].join(" ")}
      style={{ height }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          background:
            `linear-gradient(to ${to}, ${backgroundVar} 0%, transparent 100%)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            WebkitMaskImage:
              `linear-gradient(to ${to}, rgb(0, 0, 0) 0%, rgba(0, 0, 0, 0) 12.5%)`,
            maskImage:
              `linear-gradient(to ${to}, rgb(0, 0, 0) 0%, rgba(0, 0, 0, 0) 12.5%)`,
            WebkitBackdropFilter: "blur(20px)",
            backdropFilter: "blur(20px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            WebkitMaskImage:
              `linear-gradient(to ${to}, rgb(0, 0, 0) 0%, rgb(0, 0, 0) 12.5%, rgba(0, 0, 0, 0) 25%)`,
            maskImage:
              `linear-gradient(to ${to}, rgb(0, 0, 0) 0%, rgb(0, 0, 0) 12.5%, rgba(0, 0, 0, 0) 25%)`,
            WebkitBackdropFilter: "blur(11.81px)",
            backdropFilter: "blur(11.81px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
            WebkitMaskImage:
              `linear-gradient(to ${to}, rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 12.5%, rgb(0, 0, 0) 25%, rgba(0, 0, 0, 0) 37.5%)`,
            maskImage:
              `linear-gradient(to ${to}, rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 12.5%, rgb(0, 0, 0) 25%, rgba(0, 0, 0, 0) 37.5%)`,
            WebkitBackdropFilter: "blur(6.97px)",
            backdropFilter: "blur(6.97px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 4,
            WebkitMaskImage:
              `linear-gradient(to ${to}, rgba(0, 0, 0, 0) 12.5%, rgb(0, 0, 0) 25%, rgb(0, 0, 0) 37.5%, rgba(0, 0, 0, 0) 50%)`,
            maskImage:
              `linear-gradient(to ${to}, rgba(0, 0, 0, 0) 12.5%, rgb(0, 0, 0) 25%, rgb(0, 0, 0) 37.5%, rgba(0, 0, 0, 0) 50%)`,
            WebkitBackdropFilter: "blur(4.12px)",
            backdropFilter: "blur(4.12px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 5,
            WebkitMaskImage:
              `linear-gradient(to ${to}, rgba(0, 0, 0, 0) 25%, rgb(0, 0, 0) 37.5%, rgb(0, 0, 0) 50%, rgba(0, 0, 0, 0) 62.5%)`,
            maskImage:
              `linear-gradient(to ${to}, rgba(0, 0, 0, 0) 25%, rgb(0, 0, 0) 37.5%, rgb(0, 0, 0) 50%, rgba(0, 0, 0, 0) 62.5%)`,
            WebkitBackdropFilter: "blur(2.43px)",
            backdropFilter: "blur(2.43px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 6,
            WebkitMaskImage:
              `linear-gradient(to ${to}, rgba(0, 0, 0, 0) 37.5%, rgb(0, 0, 0) 50%, rgb(0, 0, 0) 62.5%, rgba(0, 0, 0, 0) 75%)`,
            maskImage:
              `linear-gradient(to ${to}, rgba(0, 0, 0, 0) 37.5%, rgb(0, 0, 0) 50%, rgb(0, 0, 0) 62.5%, rgba(0, 0, 0, 0) 75%)`,
            WebkitBackdropFilter: "blur(1.43px)",
            backdropFilter: "blur(1.43px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 7,
            WebkitMaskImage:
              `linear-gradient(to ${to}, rgba(0, 0, 0, 0) 50%, rgb(0, 0, 0) 62.5%, rgb(0, 0, 0) 75%, rgba(0, 0, 0, 0) 87.5%)`,
            maskImage:
              `linear-gradient(to ${to}, rgba(0, 0, 0, 0) 50%, rgb(0, 0, 0) 62.5%, rgb(0, 0, 0) 75%, rgba(0, 0, 0, 0) 87.5%)`,
            WebkitBackdropFilter: "blur(0.85px)",
            backdropFilter: "blur(0.85px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 8,
            WebkitMaskImage:
              `linear-gradient(to ${to}, rgba(0, 0, 0, 0) 62.5%, rgb(0, 0, 0) 75%, rgb(0, 0, 0) 87.5%, rgba(0, 0, 0, 0) 100%)`,
            maskImage:
              `linear-gradient(to ${to}, rgba(0, 0, 0, 0) 62.5%, rgb(0, 0, 0) 75%, rgb(0, 0, 0) 87.5%, rgba(0, 0, 0, 0) 100%)`,
            WebkitBackdropFilter: "blur(0.5px)",
            backdropFilter: "blur(0.5px)",
          }}
        />
      </div>
    </div>
  );
}

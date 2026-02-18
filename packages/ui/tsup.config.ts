import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/components/*.tsx"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  outDir: "dist",
  outExtension() {
    return { js: ".js" };
  },
  esbuildOptions(options) {
    options.outbase = "src";
  },
  external: [
    /^@rift\/ui\//,
    "react",
    "react-dom",
    "react/jsx-runtime",
    "@rift/utils",
    "@radix-ui/react-alert-dialog",
    "@radix-ui/react-avatar",
    "@radix-ui/react-checkbox",
    "@radix-ui/react-collapsible",
    "@radix-ui/react-context-menu",
    "@radix-ui/react-dialog",
    "@radix-ui/react-dropdown-menu",
    "@radix-ui/react-label",
    "@radix-ui/react-popover",
    "@radix-ui/react-progress",
    "@radix-ui/react-scroll-area",
    "@radix-ui/react-select",
    "@radix-ui/react-separator",
    "@radix-ui/react-slider",
    "@radix-ui/react-slot",
    "@radix-ui/react-switch",
    "@radix-ui/react-tabs",
    "@radix-ui/react-tooltip",
    "@tanstack/react-table",
    "class-variance-authority",
    "cmdk",
    "input-otp",
    "lucide-react",
    "react-day-picker",
    "sonner",
    "next-themes",
  ],
});

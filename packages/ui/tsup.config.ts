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
    "@base-ui/react",
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

import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/reference/**"],
  },
];

export default config;

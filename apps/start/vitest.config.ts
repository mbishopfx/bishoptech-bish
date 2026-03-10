import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(() => {
  const env = loadEnv('test', process.cwd(), '')

  for (const [key, value] of Object.entries(env)) {
    if (!(key in process.env)) {
      process.env[key] = value
    }
  }

  process.env.VITEST = 'true'

  return {
    plugins: [tsconfigPaths({ projects: ['./tsconfig.json'] })],
    test: {
      environment: 'node',
      globals: true,
      watch: false,
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    },
  }
})

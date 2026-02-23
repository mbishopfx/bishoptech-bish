import type { ProviderToolDefinition } from './types'

export const OPENAI_PROVIDER_TOOLS: readonly ProviderToolDefinition[] = [
  {
    id: 'web_search',
    name: 'Web Search',
    description: 'Searches the web for up-to-date sources.',
    advanced: false,
  },
  {
    id: 'file_search',
    name: 'File Search',
    description: 'Searches indexed documents and files.',
    advanced: false,
  },
  {
    id: 'code_interpreter',
    name: 'Code Interpreter',
    description: 'Runs code and returns computed outputs.',
    advanced: true,
  },
]

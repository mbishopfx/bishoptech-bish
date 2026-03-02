export const CHAT_MODE_IDS = ['study'] as const

export type ChatModeId = (typeof CHAT_MODE_IDS)[number]

export type ChatModeDefinition = {
  readonly id: ChatModeId
  readonly label: string
  readonly fixedModelId: string
  readonly systemPrompt: string
  /**
   * Optional provider-tool allowlist for the mode.
   * - `undefined` => inherit model defaults
   * - `[]` => no provider tools
   */
  readonly providerToolAllowlistByProvider?: Readonly<
    Partial<Record<string, readonly string[]>>
  >
}

export type ResolvedChatMode = {
  readonly modeId: ChatModeId
  readonly isEnforced: boolean
  readonly source: 'org' | 'request' | 'thread'
  readonly definition: ChatModeDefinition
}

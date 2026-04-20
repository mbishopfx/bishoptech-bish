import { invoke } from '@tauri-apps/api/core'

export type ListenerDesktopConfig = {
  baseUrl: string
  listenerSecret: string
  tunnelUrl: string
  workspaceDir: string
  outputDir: string
  runtimeMode: 'visible' | 'headless'
  defaultTarget: 'gemini' | 'codex'
  supportedTargets: string[]
  localtunnelSubdomain: string
}

export type RuntimeStatus = {
  running: boolean
  registered: boolean
  pid: number | null
  tunnelUrl: string | null
  lastError: string | null
  lastStartedAt: string | null
}

export type PrerequisiteStatus = {
  bun: boolean
  gemini: boolean
  codex: boolean
}

const STORAGE_KEY = 'bish-listener-desktop-config'

const defaultConfig: ListenerDesktopConfig = {
  baseUrl: 'https://web-production-070f1.up.railway.app',
  listenerSecret: '',
  tunnelUrl: '',
  workspaceDir: '',
  outputDir: '',
  runtimeMode: 'visible',
  defaultTarget: 'gemini',
  supportedTargets: ['gemini', 'codex'],
  localtunnelSubdomain: '',
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

function loadBrowserConfig(): ListenerDesktopConfig {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return defaultConfig
  try {
    return {
      ...defaultConfig,
      ...JSON.parse(raw),
    }
  } catch {
    return defaultConfig
  }
}

function saveBrowserConfig(config: ListenerDesktopConfig) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export async function loadConfig(): Promise<ListenerDesktopConfig> {
  if (!isTauriRuntime()) {
    return loadBrowserConfig()
  }
  return invoke<ListenerDesktopConfig>('load_config')
}

export async function saveConfig(config: ListenerDesktopConfig): Promise<ListenerDesktopConfig> {
  if (!isTauriRuntime()) {
    saveBrowserConfig(config)
    return config
  }
  return invoke<ListenerDesktopConfig>('save_config', { config })
}

export async function getRuntimeStatus(): Promise<RuntimeStatus> {
  if (!isTauriRuntime()) {
    return {
      running: false,
      registered: false,
      pid: null,
      tunnelUrl: null,
      lastError: 'Desktop runtime commands are only available inside the Tauri app.',
      lastStartedAt: null,
    }
  }
  return invoke<RuntimeStatus>('get_runtime_status')
}

export async function checkPrerequisites(): Promise<PrerequisiteStatus> {
  if (!isTauriRuntime()) {
    return {
      bun: true,
      gemini: true,
      codex: true,
    }
  }
  return invoke<PrerequisiteStatus>('check_prerequisites')
}

export async function startListener(config: ListenerDesktopConfig): Promise<RuntimeStatus> {
  if (!isTauriRuntime()) {
    saveBrowserConfig(config)
    return {
      running: false,
      registered: false,
      pid: null,
      tunnelUrl: config.tunnelUrl || null,
      lastError: 'Start is only available inside the packaged Tauri desktop app.',
      lastStartedAt: null,
    }
  }
  return invoke<RuntimeStatus>('start_listener', { config })
}

export async function stopListener(): Promise<RuntimeStatus> {
  if (!isTauriRuntime()) {
    return {
      running: false,
      registered: false,
      pid: null,
      tunnelUrl: null,
      lastError: null,
      lastStartedAt: null,
    }
  }
  return invoke<RuntimeStatus>('stop_listener')
}

export async function openOutputDir(): Promise<void> {
  if (!isTauriRuntime()) return
  return invoke('open_output_dir')
}

export async function installLaunchAgent(config: ListenerDesktopConfig): Promise<string> {
  if (!isTauriRuntime()) {
    return 'LaunchAgent install is only available inside the packaged Tauri app.'
  }
  return invoke<string>('install_launch_agent', { config })
}

export { defaultConfig }

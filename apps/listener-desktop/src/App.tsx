import { useEffect, useState } from 'react'
import {
  checkPrerequisites,
  defaultConfig,
  getRuntimeStatus,
  installLaunchAgent,
  loadConfig,
  openOutputDir,
  saveConfig,
  startListener,
  stopListener,
  type ListenerDesktopConfig,
  type PrerequisiteStatus,
  type RuntimeStatus,
} from './lib/desktop'

function Field({
  label,
  value,
  onChange,
  placeholder,
  secret = false,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
  secret?: boolean
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={secret ? 'password' : 'text'}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function StatusPill({
  label,
  active,
}: {
  label: string
  active: boolean
}) {
  return <span className={`pill ${active ? 'pill-active' : ''}`}>{label}</span>
}

export function App() {
  const [config, setConfig] = useState<ListenerDesktopConfig>(defaultConfig)
  const [status, setStatus] = useState<RuntimeStatus | null>(null)
  const [prerequisites, setPrerequisites] = useState<PrerequisiteStatus | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const boot = async () => {
      const [nextConfig, nextStatus, nextPrereqs] = await Promise.all([
        loadConfig(),
        getRuntimeStatus(),
        checkPrerequisites(),
      ])
      setConfig(nextConfig)
      setStatus(nextStatus)
      setPrerequisites(nextPrereqs)
      setLoading(false)
    }
    void boot()
  }, [])

  const persistConfig = async () => {
    const saved = await saveConfig(config)
    setConfig(saved)
    setMessage('Configuration saved.')
  }

  const refreshStatus = async () => {
    setStatus(await getRuntimeStatus())
    setPrerequisites(await checkPrerequisites())
  }

  if (loading) {
    return <main className="shell"><p>Loading BISH Listener Desktop…</p></main>
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">BISH Enterprise Listener</p>
          <h1>Desktop control for local handoffs</h1>
          <p className="lede">
            This macOS app wraps the BISH local listener so operators can manage registration,
            tunnel strategy, local runtime state, and Gemini/Codex handoffs without editing shell
            scripts by hand.
          </p>
        </div>
        <div className="status-card">
          <p className="status-label">Runtime</p>
          <div className="pill-row">
            <StatusPill label={status?.running ? 'Running' : 'Stopped'} active={Boolean(status?.running)} />
            <StatusPill label={status?.registered ? 'Registered' : 'Not registered'} active={Boolean(status?.registered)} />
          </div>
          <p className="status-meta">PID: {status?.pid ?? 'n/a'}</p>
          <p className="status-meta">Tunnel: {status?.tunnelUrl ?? 'auto / not started'}</p>
          <p className="status-meta">Last started: {status?.lastStartedAt ?? 'never'}</p>
        </div>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>Connection</h2>
          <Field
            label="BISH base URL"
            value={config.baseUrl}
            placeholder="https://web-production-070f1.up.railway.app"
            onChange={(next) => setConfig({ ...config, baseUrl: next })}
          />
          <Field
            label="Listener secret"
            value={config.listenerSecret}
            secret
            onChange={(next) => setConfig({ ...config, listenerSecret: next })}
          />
          <Field
            label="Configured tunnel URL (optional)"
            value={config.tunnelUrl}
            placeholder="Leave blank to use localtunnel automatically"
            onChange={(next) => setConfig({ ...config, tunnelUrl: next })}
          />
          <Field
            label="Localtunnel subdomain (optional)"
            value={config.localtunnelSubdomain}
            placeholder="custom-subdomain"
            onChange={(next) => setConfig({ ...config, localtunnelSubdomain: next })}
          />
        </article>

        <article className="panel">
          <h2>Workspace</h2>
          <Field
            label="Workspace path"
            value={config.workspaceDir}
            placeholder="/absolute/path/to/local/workspace"
            onChange={(next) => setConfig({ ...config, workspaceDir: next })}
          />
          <Field
            label="Handoff output path"
            value={config.outputDir}
            placeholder="/absolute/path/to/handoff-markdown"
            onChange={(next) => setConfig({ ...config, outputDir: next })}
          />
          <label className="field">
            <span>Runtime mode</span>
            <select
              value={config.runtimeMode}
              onChange={(event) =>
                setConfig({
                  ...config,
                  runtimeMode: event.target.value as ListenerDesktopConfig['runtimeMode'],
                })}
            >
              <option value="visible">visible</option>
              <option value="headless">headless</option>
            </select>
          </label>
          <label className="field">
            <span>Default target</span>
            <select
              value={config.defaultTarget}
              onChange={(event) =>
                setConfig({
                  ...config,
                  defaultTarget: event.target.value as ListenerDesktopConfig['defaultTarget'],
                })}
            >
              <option value="gemini">gemini</option>
              <option value="codex">codex</option>
            </select>
          </label>
        </article>
      </section>

      <section className="panel">
        <h2>Prerequisites</h2>
        <div className="pill-row">
          <StatusPill label="bun" active={Boolean(prerequisites?.bun)} />
          <StatusPill label="gemini" active={Boolean(prerequisites?.gemini)} />
          <StatusPill label="codex" active={Boolean(prerequisites?.codex)} />
        </div>
        <p className="support-copy">
          The first enterprise desktop build still depends on local CLI runtimes. The app manages
          configuration, launch flow, tunnel behavior, and status, but Gemini/Codex must still
          exist on the operator machine.
        </p>
      </section>

      <section className="actions">
        <button onClick={() => void persistConfig()}>Save config</button>
        <button onClick={() => void refreshStatus()}>Refresh status</button>
        <button
          onClick={async () => {
            const nextStatus = await startListener(config)
            setStatus(nextStatus)
            setMessage(nextStatus.lastError ?? 'Listener launch requested.')
          }}
        >
          Start listener
        </button>
        <button
          onClick={async () => {
            const nextStatus = await stopListener()
            setStatus(nextStatus)
            setMessage('Listener stopped.')
          }}
        >
          Stop listener
        </button>
        <button onClick={() => void openOutputDir()}>Open handoff folder</button>
        <button
          onClick={async () => {
            const result = await installLaunchAgent(config)
            setMessage(result)
          }}
        >
          Install launch at login
        </button>
      </section>

      {status?.lastError ? (
        <section className="message error">
          <strong>Last error:</strong> {status.lastError}
        </section>
      ) : null}

      {message ? (
        <section className="message">
          {message}
        </section>
      ) : null}
    </main>
  )
}

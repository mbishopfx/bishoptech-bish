#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager, State};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ListenerConfig {
    base_url: String,
    listener_secret: String,
    tunnel_url: String,
    workspace_dir: String,
    output_dir: String,
    runtime_mode: String,
    default_target: String,
    supported_targets: Vec<String>,
    localtunnel_subdomain: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RuntimeStatus {
    running: bool,
    registered: bool,
    pid: Option<u32>,
    tunnel_url: Option<String>,
    last_error: Option<String>,
    last_started_at: Option<String>,
}

#[derive(Debug, Serialize)]
struct PrerequisiteStatus {
    bun: bool,
    gemini: bool,
    codex: bool,
}

#[derive(Default)]
struct RuntimeState {
    child: Option<Child>,
    last_error: Option<String>,
    last_started_at: Option<String>,
}

fn default_config() -> ListenerConfig {
    ListenerConfig {
        base_url: "https://web-production-070f1.up.railway.app".into(),
        listener_secret: String::new(),
        tunnel_url: String::new(),
        workspace_dir: String::new(),
        output_dir: String::new(),
        runtime_mode: "visible".into(),
        default_target: "gemini".into(),
        supported_targets: vec!["gemini".into(), "codex".into()],
        localtunnel_subdomain: String::new(),
    }
}

fn config_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(config_dir(app)?.join("listener-config.json"))
}

fn load_config_from_disk(app: &AppHandle) -> Result<ListenerConfig, String> {
    let path = config_path(app)?;
    if !path.exists() {
        return Ok(default_config());
    }

    let raw = fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str(&raw).map_err(|error| error.to_string())
}

fn save_config_to_disk(app: &AppHandle, config: &ListenerConfig) -> Result<(), String> {
    let path = config_path(app)?;
    let raw = serde_json::to_string_pretty(config).map_err(|error| error.to_string())?;
    fs::write(path, raw).map_err(|error| error.to_string())
}

fn listener_resource_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let resource_dir = app.path().resource_dir().map_err(|error| error.to_string())?;

    // Tauri resource bundling can preserve either the folder basename or the
    // relative workspace path. We accept both so the desktop app can run
    // cleanly in dev builds and packaged DMGs without requiring a second
    // listener-specific build layout.
    let direct = resource_dir.join("local-listener");
    if direct.exists() {
        return Ok(direct);
    }

    let nested = resource_dir.join("packages").join("local-listener");
    if nested.exists() {
        return Ok(nested);
    }

    Ok(direct)
}

fn write_listener_env(app: &AppHandle, config: &ListenerConfig) -> Result<(), String> {
    let listener_dir = listener_resource_dir(app)?;
    fs::create_dir_all(&listener_dir).map_err(|error| error.to_string())?;
    let env_path = listener_dir.join(".env.local");

    // The desktop shell persists config in app storage, but the bundled Bun
    // listener still expects its existing env-file contract. Writing the env
    // file here lets the desktop app reuse the hardened script runtime instead
    // of introducing a second, divergent launch path.
    let mut lines = vec![
        format!("BISH_BASE_URL={}", config.base_url),
        format!("BISH_LISTENER_SECRET={}", config.listener_secret),
        format!("BISH_LISTENER_WORKSPACE_DIR={}", config.workspace_dir),
        format!("BISH_LISTENER_OUTPUT_DIR={}", config.output_dir),
        format!("BISH_LISTENER_RUNTIME_MODE={}", config.runtime_mode),
        format!("BISH_LISTENER_DEFAULT_TARGET={}", config.default_target),
        format!(
            "BISH_LISTENER_SUPPORTED_TARGETS={}",
            config.supported_targets.join(",")
        ),
        format!("BISH_LOCALTUNNEL_SUBDOMAIN={}", config.localtunnel_subdomain),
    ];

    if !config.tunnel_url.trim().is_empty() {
        lines.push(format!("BISH_TUNNEL_URL={}", config.tunnel_url));
    }

    fs::write(env_path, format!("{}\n", lines.join("\n"))).map_err(|error| error.to_string())
}

fn command_exists(command: &str) -> bool {
    Command::new("sh")
        .arg("-lc")
        .arg(format!("command -v {}", command))
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

fn status_from_state(config: ListenerConfig, runtime: &RuntimeState) -> RuntimeStatus {
    RuntimeStatus {
        running: runtime.child.is_some(),
        registered: runtime.child.is_some(),
        pid: runtime.child.as_ref().map(|child| child.id()),
        tunnel_url: if config.tunnel_url.trim().is_empty() {
            None
        } else {
            Some(config.tunnel_url.clone())
        },
        last_error: runtime.last_error.clone(),
        last_started_at: runtime.last_started_at.clone(),
    }
}

#[tauri::command]
fn load_config(app: AppHandle) -> Result<ListenerConfig, String> {
    load_config_from_disk(&app)
}

#[tauri::command]
fn save_config(app: AppHandle, config: ListenerConfig) -> Result<ListenerConfig, String> {
    save_config_to_disk(&app, &config)?;
    Ok(config)
}

#[tauri::command]
fn get_runtime_status(
    app: AppHandle,
    runtime: State<Mutex<RuntimeState>>,
) -> Result<RuntimeStatus, String> {
    let config = load_config_from_disk(&app)?;
    let state = runtime.lock().map_err(|_| "Runtime lock poisoned".to_string())?;
    Ok(status_from_state(config, &state))
}

#[tauri::command]
fn check_prerequisites() -> PrerequisiteStatus {
    PrerequisiteStatus {
        bun: command_exists("bun"),
        gemini: command_exists("gemini"),
        codex: command_exists("codex"),
    }
}

#[tauri::command]
fn start_listener(
    app: AppHandle,
    config: ListenerConfig,
    runtime: State<Mutex<RuntimeState>>,
) -> Result<RuntimeStatus, String> {
    save_config_to_disk(&app, &config)?;
    write_listener_env(&app, &config)?;

    let listener_dir = listener_resource_dir(&app)?;
    let mut state = runtime.lock().map_err(|_| "Runtime lock poisoned".to_string())?;

    if state.child.is_some() {
        return Ok(status_from_state(config, &state));
    }

    let child = Command::new("/bin/bash")
        .arg(listener_dir.join("start.sh"))
        .current_dir(&listener_dir)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| error.to_string())?;

    state.last_started_at = Some(iso_timestamp());
    state.last_error = None;
    state.child = Some(child);

    Ok(status_from_state(config, &state))
}

#[tauri::command]
fn stop_listener(
    app: AppHandle,
    runtime: State<Mutex<RuntimeState>>,
) -> Result<RuntimeStatus, String> {
    let config = load_config_from_disk(&app)?;
    let mut state = runtime.lock().map_err(|_| "Runtime lock poisoned".to_string())?;

    if let Some(mut child) = state.child.take() {
        let _ = child.kill();
    }

    Ok(status_from_state(config, &state))
}

#[tauri::command]
fn open_output_dir(app: AppHandle) -> Result<(), String> {
    let config = load_config_from_disk(&app)?;
    if config.output_dir.trim().is_empty() {
        return Err("Configure an output directory first.".into());
    }

    Command::new("open")
        .arg(config.output_dir)
        .spawn()
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn install_launch_agent(app: AppHandle, config: ListenerConfig) -> Result<String, String> {
    save_config_to_disk(&app, &config)?;
    write_listener_env(&app, &config)?;

    let listener_dir = listener_resource_dir(&app)?;
    let output = Command::new("/bin/bash")
        .arg(listener_dir.join("scripts").join("install-macos-listener.sh"))
        .current_dir(&listener_dir)
        .output()
        .map_err(|error| error.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

fn main() {
    tauri::Builder::default()
        .manage(Mutex::new(RuntimeState::default()))
        .invoke_handler(tauri::generate_handler![
            load_config,
            save_config,
            get_runtime_status,
            check_prerequisites,
            start_listener,
            stop_listener,
            open_output_dir,
            install_launch_agent
        ])
        .run(tauri::generate_context!())
        .expect("error while running BISH Listener Desktop");
}
fn iso_timestamp() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default();
    format!("{seconds}")
}

mod database;
use rusqlite::Connection;
use serde_json::{json, Value};
use std::{fs, io::Write, path::PathBuf, sync::Mutex};
use tauri::Manager;
struct Storage {
    connection: Mutex<Connection>,
    backups: PathBuf,
}
#[tauri::command]
fn load_data(storage: tauri::State<Storage>) -> Result<Option<Value>, String> {
    let guard = storage.connection.lock().map_err(|e| e.to_string())?;
    database::load(&guard)
}
#[tauri::command]
fn save_data(
    snapshot: Value,
    expected_revision: i64,
    storage: tauri::State<Storage>,
) -> Result<i64, String> {
    let mut guard = storage.connection.lock().map_err(|e| e.to_string())?;
    database::save(&mut guard, &snapshot, expected_revision)
}
fn backup_path(storage: &Storage, id: &str) -> Result<PathBuf, String> {
    if id.is_empty() || id.len() > 100 || !id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
    {
        return Err("Invalid backup identifier".into());
    }
    Ok(storage.backups.join(format!("{id}.json")))
}
#[tauri::command]
fn create_backup(
    id: String,
    label: String,
    contents: String,
    storage: tauri::State<Storage>,
) -> Result<(), String> {
    if contents.len() > 100 * 1024 * 1024 {
        return Err("Backup exceeds 100 MB".into());
    }
    let path = backup_path(&storage, &id)?;
    let mut data: Value = serde_json::from_str(&contents).map_err(|e| e.to_string())?;
    data["label"] = json!(label);
    fs::create_dir_all(&storage.backups).map_err(|e| e.to_string())?;
    let tmp = path.with_extension("tmp");
    let mut file = fs::File::create(&tmp).map_err(|e| e.to_string())?;
    file.write_all(
        serde_json::to_string(&data)
            .map_err(|e| e.to_string())?
            .as_bytes(),
    )
    .map_err(|e| e.to_string())?;
    file.sync_all().map_err(|e| e.to_string())?;
    drop(file);
    fs::rename(tmp, path).map_err(|e| e.to_string())?;
    let mut files: Vec<_> = fs::read_dir(&storage.backups)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().and_then(|x| x.to_str()) == Some("json"))
        .collect();
    files.sort_by_key(|e| e.file_name());
    let count = files.len();
    for entry in files.into_iter().take(count.saturating_sub(12)) {
        fs::remove_file(entry.path()).map_err(|e| e.to_string())?;
    }
    Ok(())
}
#[tauri::command]
fn list_backups(storage: tauri::State<Storage>) -> Result<Vec<Value>, String> {
    let mut items = Vec::new();
    if !storage.backups.exists() {
        return Ok(items);
    }
    for entry in fs::read_dir(&storage.backups).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.path().extension().and_then(|x| x.to_str()) != Some("json") {
            continue;
        }
        if let Ok(text) = fs::read_to_string(entry.path()) {
            if let Ok(v) = serde_json::from_str::<Value>(&text) {
                items.push(json!({"id":entry.path().file_stem().unwrap().to_string_lossy(),"createdAt":v["createdAt"],"label":v.get("label").unwrap_or(&json!("Backup"))}));
            }
        }
    }
    items.sort_by(|a, b| b["createdAt"].as_i64().cmp(&a["createdAt"].as_i64()));
    Ok(items)
}
#[tauri::command]
fn read_backup(id: String, storage: tauri::State<Storage>) -> Result<String, String> {
    fs::read_to_string(backup_path(&storage, &id)?).map_err(|e| e.to_string())
}
#[tauri::command]
fn clear_backups(storage: tauri::State<Storage>) -> Result<(), String> {
    if !storage.backups.exists() {
        return Ok(());
    }
    for entry in fs::read_dir(&storage.backups).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.file_type().map_err(|e| e.to_string())?.is_file()
            && entry.path().extension().and_then(|x| x.to_str()) == Some("json")
        {
            fs::remove_file(entry.path()).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            let connection =
                database::open(&dir.join("atlas.sqlite3")).map_err(std::io::Error::other)?;
            app.manage(Storage {
                connection: Mutex::new(connection),
                backups: dir.join("backups"),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_data,
            save_data,
            create_backup,
            list_backups,
            read_backup,
            clear_backups
        ])
        .run(tauri::generate_context!())
        .expect("ATLAS could not start. The existing notebook was not overwritten.");
}

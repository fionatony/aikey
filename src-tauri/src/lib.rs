use std::fs;
use std::path::Path;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

// Read a file and return its contents
#[tauri::command]
fn read_file(file_path: &str) -> Result<String, String> {
    fs::read_to_string(file_path).map_err(|e| e.to_string())
}

// Save content to a file
#[tauri::command]
fn save_file(file_path: &str, content: &str) -> Result<bool, String> {
    fs::write(file_path, content)
        .map(|_| true)
        .map_err(|e| e.to_string())
}

// Check if a file exists
#[tauri::command]
fn file_exists(file_path: &str) -> bool {
    Path::new(file_path).exists()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![read_file, save_file, file_exists])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::Path;
use std::process::Command;

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

// Set an environment variable (Windows specific)
#[tauri::command]
fn set_env_var(name: &str, value: &str) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("cmd")
            .args(&["/c", "setx", name, value])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("This function is only supported on Windows".to_string())
    }
}


fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            read_file,
            save_file,
            file_exists,
            set_env_var
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

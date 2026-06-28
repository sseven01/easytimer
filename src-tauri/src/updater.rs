use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub has_update: bool,
    pub latest_version: String,
    pub current_version: String,
    pub download_url: Option<String>,
    pub release_notes: Option<String>,
}

#[command]
pub async fn check_update() -> Result<UpdateInfo, String> {
    let current_version = env!("CARGO_PKG_VERSION");

    // GitHub Releases API
    let repo_owner = "sseven01";
    let repo_name = "easytimer";
    let url = format!(
        "https://api.github.com/repos/{}/{}/releases/latest",
        repo_owner, repo_name
    );

    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .header("User-Agent", "EasyTimer-Updater")
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if !resp.status().is_success() {
        return Ok(UpdateInfo {
            has_update: false,
            current_version: current_version.to_string(),
            latest_version: current_version.to_string(),
            download_url: None,
            release_notes: None,
        });
    }

    let release: GitHubRelease = resp
        .json()
        .await
        .map_err(|e| format!("解析失败: {}", e))?;

    let latest_version = release.tag_name.trim_start_matches('v').to_string();
    let has_update = latest_version != current_version;

    // 查找 Windows 安装包
    let download_url = release
        .assets
        .iter()
        .find(|a| a.name.contains("setup.exe") || a.name.contains(".msi"))
        .map(|a| a.browser_download_url.clone());

    Ok(UpdateInfo {
        has_update,
        latest_version,
        current_version: current_version.to_string(),
        download_url,
        release_notes: release.body,
    })
}

#[derive(Debug, Deserialize)]
struct GitHubRelease {
    tag_name: String,
    body: Option<String>,
    assets: Vec<GitHubAsset>,
}

#[derive(Debug, Deserialize)]
struct GitHubAsset {
    name: String,
    browser_download_url: String,
}
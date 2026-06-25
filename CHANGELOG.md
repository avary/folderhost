# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed

- **Upload system**: Fixed issue where upload system didn't work properly. It was throwing "invalid json in request body" error for no reason.

## [v26.6.0] - 2026-06-23

### Added

- **Session recovery**: If your session token expires and client redirects you to the login page, it will now save your path and redirect you to the same page after you login.
- **Save file ordering**: Now client saves the file ordering settings and you don't have to select the file ordering settings every time you visit the explorer page.

### Changed

- **Redirect on wrong dirpath**: If you try to access a directory path that doesn't exist, it will now redirect you to the / directory instead of showing you an error.

### Fixed

- **Security**: Revised auth check middleware and fixed critical vulnerability. (Thanks to [simeonnv](https://github.com/simeonnv))


## [v26.5.1] - 2026-05-23

### Added

- **Bulk actions**: Now you can select multiple items at once and perform actions like deleting, moving, or copying them.
- **Server Console**: Better server-side console visualization. Shows local IP addresses you can use to access your FolderHost server.
- **Cross-platform support**: More binaries for different platforms like macOS and FreeBSD, including ARM architectures. Now Raspberry Pi, Mac, and FreeBSD users can run it without Docker too. Please contact me if you encounter any issues with the new binaries.
- **Version checker**: I plan to implement an auto-update system without functionality problems. For now, I added a version checker that notifies you when a new version is available and provides the download link.

### Changed

- **Database**: Switched from **github.com/mattn/go-sqlite3** to **modernc.org/sqlite**. I don't want to use CGO anymore. You might encounter new issues, so please contact me if you find any.

### Fixed

- **Windows extract zip error**: Caused by using the **chown** command on Windows.

## [v26.5.0] - 2026-05-02

### Added

- **Login Page**: Show password button added to login page - no more typing mistakes.
- **OPUS support**: Audio player now handles opus files too.
- **File Viewer Tweaks**: Files load way faster now.
- **File uploading**: You can now throw multiple files at once. Just drag, drop, and let it rip. Each file shows you where it's at. Upload page is now a modal component right inside the File Explorer - no more tab switching.

## [v26.4.0] - 2026-04-16

### Added

- **Security**: Now the token fingerprint will be deleted from the server after logout.

### Changed

- Updated Go version from 1.24.5 to 1.25.0
- Upgraded `github.com/fasthttp/websocket` from v1.5.8 → v1.5.12
- Upgraded `github.com/fatih/color` from v1.18.0 → v1.19.0
- Upgraded `github.com/gofiber/fiber/v2` from v2.52.9 → v2.52.12
- Upgraded `github.com/golang-jwt/jwt/v5` from v5.3.0 → v5.3.1
- Upgraded `github.com/mattn/go-sqlite3` from v1.14.32 → v1.14.42
- Upgraded `github.com/savsgio/gotils` from v0.0.0-20240303185622-093b76447511 → v0.0.0-20250924091648-bce9a52d7761
- Upgraded `golang.org/x/net` from v0.43.0 → v0.53.0
- Upgraded `github.com/andybalholm/brotli` from v1.2.0 → v1.2.1
- Upgraded `github.com/klauspost/compress` from v1.18.0 → v1.18.5
- Upgraded `github.com/mattn/go-isatty` from v0.0.20 → v0.0.21
- Upgraded `github.com/mattn/go-runewidth` from v0.0.16 → v0.0.23
- Upgraded `github.com/valyala/fasthttp` from v1.65.0 → v1.70.0
- Upgraded `golang.org/x/sys` from v0.35.0 → v0.43.0
- Upgraded axios from 1.7.2 → 1.15.0

## [v26.2.2] - 2026-02-28

<img width="650" height="325" alt="image" src="https://github.com/user-attachments/assets/3c4e606e-af27-4432-b58c-5681cc71e244" />

### Added

- **File Viewer**: View PDFs, videos, images and audio files directly in the File Explorer.
- **Image Viewer**: This is a feature included in File Viewer and now you can view the details of a picture. You can zoom in, zoom out, rotate etc.
- **Security**: Now if someone steals your session token and tries to login from another browser or if he uses another ip address to login your account with the stolen token he will fail and the stolen token will be deleted from the server's cache.

### Changed

- **Services Shutdown**: Services now stop faster and can be forced using CTRL+C in server-side terminal.

### Fixed

- **CodeEditor**: Editor now properly waits for WebSocket connection before allowing edits.
- **Services**: Resolved mutex deadlock that could freeze the services panel when accessed by unauthorized users.

## [v26.2.1] - 2026-02-25

### Added

- **Service Logs**: Now you can follow user activities related to services.

### Changed

- **Optimized Build Size**: Binary size has reduced:
  - Linux: ~23 MB -> ~17 MB (26% smaller)
  - Windows: ~37 MB -> ~17.3 MB (53% smaller)

### Fixed

- **Upload page**: Fixed "Uploading..." text after trying to upload without a selected file. I didn't expect that someone would click the upload button before selecting a file to upload, but I saw my friend doing that and realised that I needed to fix that tiny issue.

## [v26.2.0] - 2026-02-22

### Added

- **Services** (BETA):
  With this update you can create your own services. For example: Minecraft Server, Web Server etc. Features are:
  - Special configurations for services.
  - Added functions like auto_start and auto_restart.
  - Real-time terminal with WebSocket for your service.
  - Read logs and send commands to your service using web interface.
  - User permissions for services (start, stop, read_logs and execute_commands).
  - Service RAM limits.
  - Windows and Linux support.
- File Explorer: Another button to upload your files on current directory.

### Changed

- Module name: github.com/MertJSX/folder-host-go -> github.com/MertJSX/folderhost

## [v25.12.5] - 2025-12-19

### Added

- **Code Editor**: Added syntax highlighting support for new file formats:
  - Go (`.go`)
  - Markdown (`.md`, `.markdown`) 
  - JavaScript modules (`.mjs`, `.mts`)
  - F# scripts (`.fsx`, `.fsharp`)

### Fixed

- **File order**: Fixed inconsistent file sorting that ignored user settings.

### Changed

- **User Preferences**: Implemented cookie-based persistence for user settings
  - Settings like "Show folder size" now persist across browser sessions
  - Cookies auto-renew on each visit (7-day expiry)
  - Preferences only reset if user doesn't visit for a week
- **File order**: The default setting for file ordering is changed. The ordering now starts with the most recently modified element and goes to the oldest.

### Removed

- Unused UI components in OptionsBar directory.


## [v25.12.4] - 2025-12-15

### Added

- **File Renaming**: Pressing Enter now confirms file renaming in the dialog.
- **Quick Deletion**: Delete key shortcut for directory items. Now you can select a directory item in File Explorer then click Delete key in your keyboard to easily delete an item.

### Changed

- **Settings Sync**: The 'Show folder size' setting now refreshes the File Explorer immediately.
- **UI Labels**: Updated ambiguous button text ('Open Editor' -> 'Open in Code Editor') for clarity.

### Fixed

- **ZIP button** The 'Zip' button no longer appears in non-archive contexts.
- **Uploads**: Fixed a regression in the File Explorer that broked filepaths/uploads.
- **Scope** Fixed some errors caused by scope system.

# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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

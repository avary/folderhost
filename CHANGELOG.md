# Changelog

All notable changes to this project will be documented in this file.

## [v26.2.0] - 2026-02-22

## Added

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

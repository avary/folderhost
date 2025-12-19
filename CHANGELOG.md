# Changelog

All notable changes to this project will be documented in this file.

## [25.12.5] - 2025-12-19

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


## [25.12.4] - 2025-12-15

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

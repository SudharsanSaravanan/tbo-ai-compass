# TBO AI Compass Chrome Extension

A professional Chrome extension that allows users to save YouTube travel videos and blog URLs directly to their TBO AI Compass travel plans.

## Features

- **YouTube Content Detection**: Automatically detects when the active tab is a YouTube video page, capturing the video title, URL, and thumbnail.
- **Blog URL Integration**: Allows users to save articles, blogs, or any webpage. Automatically pre-fills the URL and page title of the current active tab.
- **Bucket Creation and Organization**: Users can create custom "Buckets" (e.g., "Bali Getaway", "Europe Trip") to categorize and group saved videos and blogs intuitively.
- **Plan Management**: A built-in dashboard to browse, search, and manage all saved content. Users can view saved plans, copy URLs, directly open saved links, or delete outdated plans.
- **Advanced Filtering**: Filter saved plans by specific buckets or search by plan name, title, or notes.
- **Frontend Real-time Sync**: Automatically mirrors saved plans and buckets to the web application's local storage across active frontend tabs for seamless data transfer.
- **Badge Counter**: Displays the total count of saved items directly on the extension icon.

## TBO AI Compass Extension in Action

https://github.com/user-attachments/assets/a1d0fbac-805d-4dc6-ac0a-e2ca33b96ef7

## File Structure

- `manifest.json`: Chrome Extension Manifest V3 configuration.
- `popup.html`: Extension user interface structure.
- `popup.css`: Extension styling aligned with the TBO AI Compass design system.
- `popup.js`: Core user interface logic including YouTube detection, blog handling, bucket management, and local storage interactions.
- `background.js`: Service worker managing badge synchronization, fallback functionalities, and bridging data to frontend tabs.
- `content.js`: Content script handling SPA (Single Page Application) navigation detection on YouTube.
- `icons/`: Directory containing extension icon assets across various resolutions.

## Installation Instructions

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** via the toggle in the top-right corner.
3. Click the **Load unpacked** button.
4. Select the `extension/` directory from this repository.
5. The TBO AI Compass extension icon will now be available in your browser toolbar.

## Usage Guide

1. Navigate to any YouTube video or travel blog.
2. Click the TBO AI Compass extension icon in the toolbar.
3. The extension will automatically detect the active content type (YouTube or Blog).
4. Select an existing bucket from the dropdown or click to create a new bucket to categorize your plan.
5. Add an optional plan name and note.
6. Click **Add to Travel Plans**. The content will be securely saved to your local browser storage and synchronized with the TBO AI Compass frontend.
7. Use the header navigation within the extension to view, filter, and manage all saved plans and buckets.

## Storage Architecture

All data is managed locally using the Chrome Storage API (`chrome.storage.local`), ensuring complete data privacy. The extension structures saved contents and buckets as follows:

### Plan Data Structure

```json
{
  "id": "id_1234567890_abcde",
  "type": "youtube", 
  "planName": "Bali Getaway 2025",
  "note": "Check beach resort section",
  "url": "https://www.youtube.com/watch?v=...",
  "videoId": "...",
  "title": "Best Beaches in Bali",
  "savedAt": "2025-03-01T10:30:00.000Z",
  "thumbnail": "https://img.youtube.com/vi/.../mqdefault.jpg",
  "bucketId": "id_0987654321_fghij",
  "bucketName": "Indonesia Trip"
}
```

### Bucket Data Structure

```json
{
  "id": "id_0987654321_fghij",
  "name": "Indonesia Trip",
  "createdAt": "2025-03-01T10:25:00.000Z"
}
```

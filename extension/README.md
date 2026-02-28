# TBO AI Compass – Chrome Extension

A Chrome extension that lets you **save YouTube travel videos directly to your TBO AI Compass travel plans** with one click.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎬 YouTube Detection | Automatically detects when you're on a YouTube video page |
| 💾 Save to Plans | One-click saves the video URL + title to local browser storage |
| 🗂️ Plan Manager | Browse, search, copy, open, and delete saved plans |
| 🔍 Search | Filter saved plans by name, title, or note |
| 📛 Badge Counter | Shows the number of saved plans on the extension icon |
| 📋 Copy URL | Copy any saved YouTube URL to clipboard in one click |

---

## 📁 File Structure

```
extension/
├── manifest.json        # Chrome Extension Manifest V3
├── popup.html           # Extension popup UI
├── popup.css            # Popup styles (matches TBO AI Compass design system)
├── popup.js             # Popup logic – YouTube detection & storage management
├── background.js        # Service worker – badge sync & message handling
├── content.js           # Content script – YouTube SPA navigation detection
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## 🚀 How to Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Toggle **Developer mode** ON (top-right switch)
3. Click **"Load unpacked"**
4. Select the `extension/` folder from this project
5. The **TBO AI Compass** icon will appear in your Chrome toolbar

---

## 📖 How to Use

1. Open any **YouTube video** in Chrome
2. Click the **TBO AI Compass extension icon** in the toolbar
3. The popup detects the video and auto-fills the title
4. Optionally enter a **Travel Plan Name** and a **Note**
5. Click **"Add to Travel Plans"** — the URL is saved to local browser storage
6. Click the ❤️ icon in the popup header to view all saved plans

---

## 🗄️ Storage

All data is stored using **`chrome.storage.local`** — no data leaves your browser. Each saved plan contains:

```json
{
  "id": "plan_1234_abc",
  "planName": "Bali Getaway 2025",
  "note": "Check beach resort section",
  "url": "https://www.youtube.com/watch?v=...",
  "videoId": "...",
  "title": "Best Beaches in Bali",
  "savedAt": "2025-03-01T10:30:00.000Z",
  "thumbnail": "https://img.youtube.com/vi/.../mqdefault.jpg"
}
```

---

## 🎨 Design

Matches the TBO AI Compass frontend design system:
- **Primary Color**: `hsl(211, 69%, 42%)` (Travel Blue)
- **Typography**: Lora (headings) + Source Sans 3 (body)
- **Radius**: 6–14px rounded corners
- **Animations**: Subtle slide-in / fade-in transitions

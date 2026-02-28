/**
 * TBO AI Compass – Background Service Worker (Manifest V3)
 * Handles clipboard fallback, badge management, and localStorage mirroring.
 */

// ── Frontend origins to mirror data into ──
const FRONTEND_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:3000',
    'http://localhost:4173',
];

const STORAGE_KEY = 'tbo_travel_plans';

// ── Helper: inject plans into localStorage of frontend tabs ──
async function mirrorPlansToFrontend(plans) {
    try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            if (!tab.url) continue;
            const isFrontend = FRONTEND_ORIGINS.some(origin => tab.url.startsWith(origin));
            if (!isFrontend) continue;
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: (key, data) => {
                        try {
                            localStorage.setItem(key, JSON.stringify(data));
                            // Dispatch a storage event so React can pick it up
                            window.dispatchEvent(new StorageEvent('storage', {
                                key: key,
                                newValue: JSON.stringify(data),
                                storageArea: localStorage,
                            }));
                        } catch (e) { }
                    },
                    args: [STORAGE_KEY, plans],
                });
            } catch (_) {
                // Tab may have restricted access, ignore
            }
        }
    } catch (_) { }
}

// ── On install, initialise storage if empty ──
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
        if (!result[STORAGE_KEY]) {
            chrome.storage.local.set({ [STORAGE_KEY]: [] });
        }
    });

    // Reset badge
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
    console.log('[TBO Compass] Extension installed & ready.');
});

// ── Listen for messages from popup and content scripts ──
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'copyToClipboard') {
        sendResponse({ success: false, reason: 'Use popup clipboard API directly.' });
        return true;
    }

    if (message.action === 'getBadgeCount') {
        chrome.storage.local.get([STORAGE_KEY], (result) => {
            const plans = result[STORAGE_KEY] || [];
            sendResponse({ count: plans.length });
        });
        return true;
    }

    // ── Acknowledge navigation events from content.js ──
    // Without this handler the content script gets a "no receiving end" rejection.
    if (message.action === 'youtubeNavigation') {
        // Nothing to do — popup reads the tab URL directly when opened.
        sendResponse({ ok: true });
        return true;
    }
});

// ── Keep badge in sync on storage changes & mirror to frontend ──
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEY]) {
        const plans = changes[STORAGE_KEY].newValue || [];
        const count = plans.length;
        chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
        chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
        // Mirror to any open frontend tab
        mirrorPlansToFrontend(plans);
    }
});

// ── When a frontend tab is updated/activated, push current plans ──
async function pushPlansToTab(tabId, tabUrl) {
    if (!tabUrl) return;
    const isFrontend = FRONTEND_ORIGINS.some(o => tabUrl.startsWith(o));
    if (!isFrontend) return;
    chrome.storage.local.get([STORAGE_KEY], async (result) => {
        const plans = result[STORAGE_KEY] || [];
        try {
            await chrome.scripting.executeScript({
                target: { tabId },
                func: (key, data) => {
                    try {
                        localStorage.setItem(key, JSON.stringify(data));
                        window.dispatchEvent(new StorageEvent('storage', {
                            key: key,
                            newValue: JSON.stringify(data),
                            storageArea: localStorage,
                        }));
                    } catch (e) { }
                },
                args: [STORAGE_KEY, plans],
            });
        } catch (_) { }
    });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        pushPlansToTab(tabId, tab.url);
    }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (tab) pushPlansToTab(tabId, tab.url);
});

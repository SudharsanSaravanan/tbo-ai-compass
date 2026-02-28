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
const BUCKETS_STORAGE_KEY = 'tbo_travel_buckets';

// ── Helper: inject plans + buckets into localStorage of frontend tabs ──
async function mirrorDataToFrontend(plans, buckets) {
    try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            if (!tab.url) continue;
            const isFrontend = FRONTEND_ORIGINS.some(origin => tab.url.startsWith(origin));
            if (!isFrontend) continue;
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: (plansKey, plansData, bucketsKey, bucketsData) => {
                        try {
                            localStorage.setItem(plansKey, JSON.stringify(plansData));
                            localStorage.setItem(bucketsKey, JSON.stringify(bucketsData));
                            window.dispatchEvent(new StorageEvent('storage', {
                                key: plansKey,
                                newValue: JSON.stringify(plansData),
                                storageArea: localStorage,
                            }));
                            window.dispatchEvent(new StorageEvent('storage', {
                                key: bucketsKey,
                                newValue: JSON.stringify(bucketsData),
                                storageArea: localStorage,
                            }));
                        } catch (e) { }
                    },
                    args: [STORAGE_KEY, plans, BUCKETS_STORAGE_KEY, buckets],
                });
            } catch (_) {
                // Tab may have restricted access, ignore
            }
        }
    } catch (_) { }
}

// ── On install, initialise storage if empty ──
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get([STORAGE_KEY, BUCKETS_STORAGE_KEY], (result) => {
        const updates = {};
        if (!result[STORAGE_KEY]) updates[STORAGE_KEY] = [];
        if (!result[BUCKETS_STORAGE_KEY]) updates[BUCKETS_STORAGE_KEY] = [];
        if (Object.keys(updates).length) chrome.storage.local.set(updates);
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

    if (message.action === 'youtubeNavigation') {
        sendResponse({ ok: true });
        return true;
    }
});

// ── Keep badge in sync on storage changes & mirror to frontend ──
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    const plansChanged = !!changes[STORAGE_KEY];
    const bucketsChanged = !!changes[BUCKETS_STORAGE_KEY];

    if (!plansChanged && !bucketsChanged) return;

    chrome.storage.local.get([STORAGE_KEY, BUCKETS_STORAGE_KEY], (result) => {
        const plans = result[STORAGE_KEY] || [];
        const buckets = result[BUCKETS_STORAGE_KEY] || [];

        if (plansChanged) {
            const count = plans.length;
            chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
            chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
        }

        mirrorDataToFrontend(plans, buckets);
    });
});

// ── When a frontend tab is updated/activated, push current data ──
async function pushDataToTab(tabId, tabUrl) {
    if (!tabUrl) return;
    const isFrontend = FRONTEND_ORIGINS.some(o => tabUrl.startsWith(o));
    if (!isFrontend) return;

    chrome.storage.local.get([STORAGE_KEY, BUCKETS_STORAGE_KEY], async (result) => {
        const plans = result[STORAGE_KEY] || [];
        const buckets = result[BUCKETS_STORAGE_KEY] || [];
        try {
            await chrome.scripting.executeScript({
                target: { tabId },
                func: (plansKey, plansData, bucketsKey, bucketsData) => {
                    try {
                        localStorage.setItem(plansKey, JSON.stringify(plansData));
                        localStorage.setItem(bucketsKey, JSON.stringify(bucketsData));
                        window.dispatchEvent(new StorageEvent('storage', {
                            key: plansKey,
                            newValue: JSON.stringify(plansData),
                            storageArea: localStorage,
                        }));
                        window.dispatchEvent(new StorageEvent('storage', {
                            key: bucketsKey,
                            newValue: JSON.stringify(bucketsData),
                            storageArea: localStorage,
                        }));
                    } catch (e) { }
                },
                args: [STORAGE_KEY, plans, BUCKETS_STORAGE_KEY, buckets],
            });
        } catch (_) { }
    });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        pushDataToTab(tabId, tab.url);
    }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (tab) pushDataToTab(tabId, tab.url);
});

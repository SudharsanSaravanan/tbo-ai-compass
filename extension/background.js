/**
 * TBO AI Compass – Background Service Worker (Manifest V3)
 * Handles clipboard fallback and badge management.
 */

// ── On install, initialise storage if empty ──
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['tbo_travel_plans'], (result) => {
        if (!result['tbo_travel_plans']) {
            chrome.storage.local.set({ tbo_travel_plans: [] });
        }
    });

    // Reset badge
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
    console.log('[TBO Compass] Extension installed & ready.');
});

// ── Listen for messages from popup ──
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'copyToClipboard') {
        // Clipboard write from service worker is not possible in MV3,
        // so this is handled via the popup's navigator.clipboard.writeText.
        // This is a fallback acknowledgement.
        sendResponse({ success: false, reason: 'Use popup clipboard API directly.' });
        return true;
    }

    if (message.action === 'getBadgeCount') {
        chrome.storage.local.get(['tbo_travel_plans'], (result) => {
            const plans = result['tbo_travel_plans'] || [];
            sendResponse({ count: plans.length });
        });
        return true; // keep channel open for async
    }
});

// ── Keep badge in sync on storage changes ──
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes['tbo_travel_plans']) {
        const plans = changes['tbo_travel_plans'].newValue || [];
        const count = plans.length;
        chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
        chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
    }
});

/**
 * TBO AI Compass – Content Script
 * Injected into YouTube pages to observe navigation changes
 * (YouTube is a SPA, so URL changes don't trigger page reloads).
 * Sends messages to the background to keep the popup aware of the current video.
 */

(function () {
    'use strict';

    // ── Utility: extract video ID ──
    function getVideoId(url) {
        try {
            const u = new URL(url);
            if (u.hostname === 'youtu.be') return u.pathname.slice(1);
            if (u.hostname.includes('youtube.com')) {
                if (u.pathname === '/watch') return u.searchParams.get('v');
                const m = u.pathname.match(/\/(?:shorts|embed)\/([^/?]+)/);
                if (m) return m[1];
            }
        } catch (_) { }
        return null;
    }

    /**
     * Safely send a message to the background service worker.
     * Guards against:
     *  - Extension context invalidated (e.g. extension reloaded mid-session)
     *  - No receiving end (background not yet active / no listener for this action)
     *  - Any other runtime rejection
     */
    function safeNotify(payload) {
        // chrome.runtime may not exist if the extension context is invalidated
        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) return;
        try {
            chrome.runtime.sendMessage(payload).catch(() => {
                // Silently ignore: popup not open or SW not active — this is expected.
            });
        } catch (_) {
            // Synchronous throw if context is invalidated; ignore.
        }
    }

    // ── Watch for URL changes via YouTube's yt-navigate-finish event ──
    document.addEventListener('yt-navigate-finish', () => {
        const videoId = getVideoId(location.href);
        if (videoId) {
            safeNotify({
                action: 'youtubeNavigation',
                videoId: videoId,
                url: location.href,
                title: document.title,
            });
        }
    });

    // ── Notify on initial load as well ──
    const initVideoId = getVideoId(location.href);
    if (initVideoId) {
        safeNotify({
            action: 'youtubeNavigation',
            videoId: initVideoId,
            url: location.href,
            title: document.title,
        });
    }
})();

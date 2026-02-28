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

    // ── Watch for URL changes via YouTube's yt-navigate-finish event ──
    document.addEventListener('yt-navigate-finish', () => {
        const videoId = getVideoId(location.href);
        if (videoId) {
            // Notify extension that a new video is active
            chrome.runtime.sendMessage({
                action: 'youtubeNavigation',
                videoId: videoId,
                url: location.href,
                title: document.title,
            }).catch(() => {
                // Extension popup may not be open – silence the error
            });
        }
    });

    // Notify on initial load as well
    const initVideoId = getVideoId(location.href);
    if (initVideoId) {
        chrome.runtime.sendMessage({
            action: 'youtubeNavigation',
            videoId: initVideoId,
            url: location.href,
            title: document.title,
        }).catch(() => { });
    }
})();

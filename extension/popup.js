/**
 * TBO AI Compass – Chrome Extension Popup JS
 * Handles YouTube detection, saving to chrome.storage.local, and UI management.
 */

// ──────────────────────────────────────────────
// STORAGE KEY
// ──────────────────────────────────────────────
const STORAGE_KEY = 'tbo_travel_plans';

// ──────────────────────────────────────────────
// UTILITY HELPERS
// ──────────────────────────────────────────────

/** Get all saved plans from storage */
async function getPlans() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || []);
    });
  });
}

/** Save all plans to storage */
async function savePlans(plans) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: plans }, resolve);
  });
}

/** Format timestamp → human-readable */
function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Extract YouTube video ID from URL */
function getYouTubeVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1);
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      const shortsMatch = u.pathname.match(/\/shorts\/([^/?]+)/);
      if (shortsMatch) return shortsMatch[1];
      const embedMatch = u.pathname.match(/\/embed\/([^/?]+)/);
      if (embedMatch) return embedMatch[1];
    }
  } catch (_) {}
  return null;
}

/** Check if a URL is a YouTube video (not just the homepage / search) */
function isYouTubeVideoUrl(url) {
  return !!url && !!getYouTubeVideoId(url);
}

/** Get a clean short URL for display */
function shortUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace('www.', '') + u.pathname + (u.searchParams.get('v') ? '?v=' + u.searchParams.get('v') : '');
  } catch (_) { return url; }
}

// ──────────────────────────────────────────────
// DOM REFERENCES
// ──────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const els = {
  notYoutubeState : $('notYoutubeState'),
  youtubeState    : $('youtubeState'),
  mainView        : $('mainView'),
  plansPanel      : $('plansPanel'),

  thumbnailImg    : $('thumbnailImg'),
  videoTitle      : $('videoTitle'),
  videoUrlPreview : $('videoUrlPreview'),
  planNameInput   : $('planNameInput'),
  noteInput       : $('noteInput'),
  addToPlanBtn    : $('addToPlanBtn'),
  successBanner   : $('successBanner'),
  alreadySaved    : $('alreadySaved'),

  viewPlansBtn    : $('viewPlansBtn'),
  savedCount      : $('savedCount'),
  closePanelBtn   : $('closePanelBtn'),
  plansList       : $('plansList'),
  emptyPlans      : $('emptyPlans'),
  plansFooter     : $('plansFooter'),
  clearAllBtn     : $('clearAllBtn'),
  plansCountLabel : $('plansCountLabel'),
  searchInput     : $('searchInput'),
};

// ──────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────
let currentTab = null;
let currentVideoId = null;
let allPlans = [];

// ──────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  allPlans = await getPlans();
  updateBadge();

  // Get current active tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];

  if (currentTab && isYouTubeVideoUrl(currentTab.url)) {
    await showYouTubeState(currentTab);
  } else {
    showNotYouTubeState();
  }

  bindEvents();
});

// ──────────────────────────────────────────────
// UI STATES
// ──────────────────────────────────────────────

function showNotYouTubeState() {
  els.notYoutubeState.classList.remove('hidden');
  els.youtubeState.classList.add('hidden');
}

async function showYouTubeState(tab) {
  currentVideoId = getYouTubeVideoId(tab.url);

  els.notYoutubeState.classList.add('hidden');
  els.youtubeState.classList.remove('hidden');

  // Thumbnail
  if (currentVideoId) {
    els.thumbnailImg.src = `https://img.youtube.com/vi/${currentVideoId}/mqdefault.jpg`;
    els.thumbnailImg.onerror = () => {
      els.thumbnailImg.src = `https://img.youtube.com/vi/${currentVideoId}/default.jpg`;
    };
  }

  // URL preview
  els.videoUrlPreview.textContent = shortUrl(tab.url);

  // Try to get tab title
  els.videoTitle.textContent = tab.title
    ? tab.title.replace(' - YouTube', '').replace(' – YouTube', '').trim()
    : 'YouTube Video';

  // Pre-fill plan name with video title
  if (!els.planNameInput.value && tab.title) {
    const cleanTitle = tab.title
      .replace(' - YouTube', '')
      .replace(' – YouTube', '')
      .trim()
      .slice(0, 60);
    els.planNameInput.value = cleanTitle;
  }

  // Check if already saved
  const alreadyExists = allPlans.some(p => p.videoId === currentVideoId);
  if (alreadyExists) {
    els.alreadySaved.classList.remove('hidden');
    els.addToPlanBtn.disabled = true;
    els.addToPlanBtn.textContent = 'Already Saved ✓';
  }

  // Open thumbnail in YouTube
  els.thumbnailImg.parentElement.addEventListener('click', () => {
    chrome.tabs.create({ url: tab.url });
  });
}

// ──────────────────────────────────────────────
// EVENT BINDINGS
// ──────────────────────────────────────────────

function bindEvents() {
  // Add to plan
  els.addToPlanBtn.addEventListener('click', handleAddToPlan);

  // View / hide plans panel
  els.viewPlansBtn.addEventListener('click', () => openPlansPanel());
  els.closePanelBtn.addEventListener('click', () => closePlansPanel());

  // Clear all
  els.clearAllBtn.addEventListener('click', handleClearAll);

  // Search
  els.searchInput.addEventListener('input', () => renderPlansList(els.searchInput.value.trim().toLowerCase()));
}

// ──────────────────────────────────────────────
// ADD TO PLAN
// ──────────────────────────────────────────────

async function handleAddToPlan() {
  if (!currentTab || !currentVideoId) return;

  const planName = els.planNameInput.value.trim() || 'My Travel Plan';
  const note = els.noteInput.value.trim();

  const newPlan = {
    id        : `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    planName,
    note,
    url       : currentTab.url,
    videoId   : currentVideoId,
    title     : els.videoTitle.textContent,
    savedAt   : new Date().toISOString(),
    thumbnail : `https://img.youtube.com/vi/${currentVideoId}/mqdefault.jpg`,
  };

  allPlans = [newPlan, ...allPlans];
  await savePlans(allPlans);

  // UI feedback
  els.addToPlanBtn.classList.add('hidden');
  els.successBanner.classList.remove('hidden');
  els.alreadySaved.classList.add('hidden');
  updateBadge();

  // Reset after 2 seconds
  setTimeout(() => {
    els.successBanner.classList.add('hidden');
    els.alreadySaved.classList.remove('hidden');
    els.addToPlanBtn.disabled = true;
  }, 2200);
}

// ──────────────────────────────────────────────
// PLANS PANEL
// ──────────────────────────────────────────────

function openPlansPanel() {
  els.mainView.classList.add('hidden');
  els.plansPanel.classList.remove('hidden');
  els.searchInput.value = '';
  renderPlansList('');
}

function closePlansPanel() {
  els.plansPanel.classList.add('hidden');
  els.mainView.classList.remove('hidden');
}

function renderPlansList(query = '') {
  const filtered = query
    ? allPlans.filter(p =>
        p.planName.toLowerCase().includes(query) ||
        p.title?.toLowerCase().includes(query) ||
        p.note?.toLowerCase().includes(query)
      )
    : allPlans;

  els.plansList.innerHTML = '';

  if (filtered.length === 0) {
    els.emptyPlans.classList.remove('hidden');
    els.plansFooter.classList.add('hidden');
    return;
  }

  els.emptyPlans.classList.add('hidden');
  els.plansFooter.classList.remove('hidden');
  els.plansCountLabel.textContent = `${allPlans.length} saved`;

  filtered.forEach(plan => {
    const card = createPlanCard(plan);
    els.plansList.appendChild(card);
  });
}

function createPlanCard(plan) {
  const card = document.createElement('div');
  card.className = 'plan-card';
  card.dataset.id = plan.id;

  card.innerHTML = `
    <div class="plan-card-header">
      <span class="plan-card-name">${escapeHtml(plan.planName)}</span>
      <div class="plan-card-actions">
        <button class="plan-action-btn plan-action-btn--copy" title="Copy URL" data-url="${escapeHtml(plan.url)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
        <button class="plan-action-btn plan-action-btn--open" title="Open Video" data-url="${escapeHtml(plan.url)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </button>
        <button class="plan-action-btn plan-action-btn--delete" title="Remove" data-id="${plan.id}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
    <a class="plan-card-url" href="${escapeHtml(plan.url)}" target="_blank" title="${escapeHtml(plan.url)}">${shortUrl(plan.url)}</a>
    <div class="plan-card-footer">
      <span class="plan-card-note">${plan.note ? escapeHtml(plan.note) : (plan.title ? escapeHtml(plan.title) : '')}</span>
      <span class="plan-card-date">${formatDate(plan.savedAt)}</span>
    </div>
  `;

  // Copy URL button
  card.querySelector('.plan-action-btn--copy').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const url = btn.dataset.url;
    try {
      await navigator.clipboard.writeText(url);
      btn.classList.add('copied');
      btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
      }, 1800);
    } catch (_) {
      // Fallback: send message to background
      chrome.runtime.sendMessage({ action: 'copyToClipboard', text: url });
    }
  });

  // Open video
  card.querySelector('.plan-action-btn--open').addEventListener('click', (e) => {
    chrome.tabs.create({ url: e.currentTarget.dataset.url });
  });

  // Delete
  card.querySelector('.plan-action-btn--delete').addEventListener('click', async (e) => {
    const planId = e.currentTarget.dataset.id;
    allPlans = allPlans.filter(p => p.id !== planId);
    await savePlans(allPlans);
    updateBadge();
    renderPlansList(els.searchInput.value.trim().toLowerCase());

    // Re-enable "Add" button if the deleted plan was the current video
    if (planId && currentVideoId) {
      const stillExists = allPlans.some(p => p.videoId === currentVideoId);
      if (!stillExists) {
        els.addToPlanBtn.disabled = false;
        els.addToPlanBtn.innerHTML = `
          <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          Add to Travel Plans`;
        els.alreadySaved.classList.add('hidden');
      }
    }
  });

  // Open link on plan-card-url click
  card.querySelector('.plan-card-url').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: plan.url });
  });

  return card;
}

async function handleClearAll() {
  if (!confirm('Remove all saved travel plans? This cannot be undone.')) return;
  allPlans = [];
  await savePlans(allPlans);
  updateBadge();
  renderPlansList('');
}

// ──────────────────────────────────────────────
// BADGE UPDATE
// ──────────────────────────────────────────────
function updateBadge() {
  const count = allPlans.length;
  if (count > 0) {
    els.savedCount.textContent = count > 99 ? '99+' : count;
    els.savedCount.classList.remove('hidden');
  } else {
    els.savedCount.classList.add('hidden');
  }

  // Update extension badge text
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
}

// ──────────────────────────────────────────────
// HTML ESCAPE
// ──────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

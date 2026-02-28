/**
 * TBO AI Compass – Chrome Extension Popup JS
 * Supports: YouTube videos, blog/any URLs, bucket grouping.
 */

// ──────────────────────────────────────────────
// STORAGE KEYS
// ──────────────────────────────────────────────
const STORAGE_KEY = 'tbo_travel_plans';
const BUCKETS_STORAGE_KEY = 'tbo_travel_buckets';

// ──────────────────────────────────────────────
// STORAGE HELPERS
// ──────────────────────────────────────────────

async function getPlans() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || []);
    });
  });
}

async function savePlans(plans) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: plans }, resolve);
  });
}

async function getBuckets() {
  return new Promise((resolve) => {
    chrome.storage.local.get([BUCKETS_STORAGE_KEY], (result) => {
      resolve(result[BUCKETS_STORAGE_KEY] || []);
    });
  });
}

async function saveBuckets(buckets) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [BUCKETS_STORAGE_KEY]: buckets }, resolve);
  });
}

// ──────────────────────────────────────────────
// UTILITY HELPERS
// ──────────────────────────────────────────────

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

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
  } catch (_) { }
  return null;
}

function isYouTubeVideoUrl(url) {
  return !!url && !!getYouTubeVideoId(url);
}

function shortUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace('www.', '') + u.pathname + (u.searchParams.get('v') ? '?v=' + u.searchParams.get('v') : '');
  } catch (_) { return url; }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateId() {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ──────────────────────────────────────────────
// DOM REFERENCES
// ──────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const els = {
  mainView: $('mainView'),
  plansPanel: $('plansPanel'),
  bucketsPanel: $('bucketsPanel'),

  // Tabs
  tabYoutubeBtn: $('tabYoutube'),
  tabBlogBtn: $('tabBlog'),
  youtubeTab: $('youtubeTab'),
  blogTab: $('blogTab'),

  // YouTube state
  notYoutubeState: $('notYoutubeState'),
  youtubeState: $('youtubeState'),
  thumbnailImg: $('thumbnailImg'),
  videoTitle: $('videoTitle'),
  videoUrlPreview: $('videoUrlPreview'),
  planNameInput: $('planNameInput'),
  noteInput: $('noteInput'),
  addToPlanBtn: $('addToPlanBtn'),
  successBanner: $('successBanner'),
  alreadySaved: $('alreadySaved'),
  ytBucketSelect: $('ytBucketSelect'),
  ytNewBucketBtn: $('ytNewBucketBtn'),

  // Blog state
  blogUrlInput: $('blogUrlInput'),
  blogLabelInput: $('blogLabelInput'),
  blogNoteInput: $('blogNoteInput'),
  blogBucketSelect: $('blogBucketSelect'),
  blogNewBucketBtn: $('blogNewBucketBtn'),
  addBlogBtn: $('addBlogBtn'),
  blogSuccessBanner: $('blogSuccessBanner'),
  blogAutoDetect: $('blogAutoDetect'),

  // Header
  viewPlansBtn: $('viewPlansBtn'),
  savedCount: $('savedCount'),
  viewBucketsBtn: $('viewBucketsBtn'),
  bucketsCount: $('bucketsCount'),

  // Plans panel
  closePanelBtn: $('closePanelBtn'),
  plansList: $('plansList'),
  emptyPlans: $('emptyPlans'),
  plansFooter: $('plansFooter'),
  clearAllBtn: $('clearAllBtn'),
  plansCountLabel: $('plansCountLabel'),
  searchInput: $('searchInput'),
  bucketFilterSelect: $('bucketFilterSelect'),

  // Buckets panel
  closeBucketsPanelBtn: $('closeBucketsPanelBtn'),
  bucketsList: $('bucketsList'),
  emptyBuckets: $('emptyBuckets'),
  newBucketNameInput: $('newBucketNameInput'),
  createBucketBtn: $('createBucketBtn'),
};

// ──────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────
let currentTab = null;
let currentVideoId = null;
let allPlans = [];
let allBuckets = [];
let activeTab = 'youtube'; // 'youtube' | 'blog'

// ──────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  [allPlans, allBuckets] = await Promise.all([getPlans(), getBuckets()]);
  updateBadge();
  updateBucketsCount();
  populateBucketSelects();

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];

  if (currentTab && isYouTubeVideoUrl(currentTab.url)) {
    await showYouTubeState(currentTab);
    switchTab('youtube');
  } else {
    showNotYouTubeState();
    // Pre-fill blog URL with the current page's URL if it's not YouTube
    if (currentTab && currentTab.url && !currentTab.url.startsWith('chrome://')) {
      els.blogUrlInput.value = currentTab.url;
      els.blogAutoDetect.classList.remove('hidden');
      if (currentTab.title) {
        els.blogLabelInput.value = currentTab.title.trim().slice(0, 80);
      }
    }
  }

  bindEvents();
});

// ──────────────────────────────────────────────
// TAB SWITCHING
// ──────────────────────────────────────────────
function switchTab(tab) {
  activeTab = tab;
  if (tab === 'youtube') {
    els.youtubeTab.classList.remove('hidden');
    els.blogTab.classList.add('hidden');
    els.tabYoutubeBtn.classList.add('active');
    els.tabBlogBtn.classList.remove('active');
  } else {
    els.blogTab.classList.remove('hidden');
    els.youtubeTab.classList.add('hidden');
    els.tabBlogBtn.classList.add('active');
    els.tabYoutubeBtn.classList.remove('active');
  }
}

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

  if (currentVideoId) {
    els.thumbnailImg.src = `https://img.youtube.com/vi/${currentVideoId}/mqdefault.jpg`;
    els.thumbnailImg.onerror = () => {
      els.thumbnailImg.src = `https://img.youtube.com/vi/${currentVideoId}/default.jpg`;
    };
  }

  els.videoUrlPreview.textContent = shortUrl(tab.url);
  els.videoTitle.textContent = tab.title
    ? tab.title.replace(' - YouTube', '').replace(' – YouTube', '').trim()
    : 'YouTube Video';

  if (!els.planNameInput.value && tab.title) {
    const cleanTitle = tab.title
      .replace(' - YouTube', '')
      .replace(' – YouTube', '')
      .trim()
      .slice(0, 60);
    els.planNameInput.value = cleanTitle;
  }

  const alreadyExists = allPlans.some(p => p.videoId === currentVideoId);
  if (alreadyExists) {
    els.alreadySaved.classList.remove('hidden');
    els.addToPlanBtn.disabled = true;
    els.addToPlanBtn.textContent = 'Already Saved ✓';
  }

  els.thumbnailImg.parentElement.addEventListener('click', () => {
    chrome.tabs.create({ url: tab.url });
  });
}

// ──────────────────────────────────────────────
// BUCKET SELECT POPULATION
// ──────────────────────────────────────────────
function populateBucketSelects() {
  const selects = [els.ytBucketSelect, els.blogBucketSelect, els.bucketFilterSelect];
  selects.forEach(sel => {
    if (!sel) return;
    const savedValue = sel.value;
    // Clear except first option
    while (sel.options.length > 1) sel.remove(1);
    allBuckets.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name;
      sel.appendChild(opt);
    });
    sel.value = savedValue;
  });
}

// ──────────────────────────────────────────────
// EVENT BINDINGS
// ──────────────────────────────────────────────
function bindEvents() {
  // Tab switching
  els.tabYoutubeBtn.addEventListener('click', () => switchTab('youtube'));
  els.tabBlogBtn.addEventListener('click', () => switchTab('blog'));

  // YouTube save
  els.addToPlanBtn.addEventListener('click', handleAddYoutubeToPlan);

  // Blog save
  els.addBlogBtn.addEventListener('click', handleAddBlogToPlan);

  // Plans panel
  els.viewPlansBtn.addEventListener('click', () => openPlansPanel());
  els.closePanelBtn.addEventListener('click', () => closePlansPanel());
  els.clearAllBtn.addEventListener('click', handleClearAll);
  els.searchInput.addEventListener('input', () => renderPlansList());
  els.bucketFilterSelect.addEventListener('change', () => renderPlansList());

  // Buckets panel
  els.viewBucketsBtn.addEventListener('click', () => openBucketsPanel());
  els.closeBucketsPanelBtn.addEventListener('click', () => closeBucketsPanel());
  els.createBucketBtn.addEventListener('click', handleCreateBucket);
  els.newBucketNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleCreateBucket();
  });

  // Quick "new bucket" buttons next to selects
  els.ytNewBucketBtn.addEventListener('click', () => promptCreateBucket(els.ytBucketSelect));
  els.blogNewBucketBtn.addEventListener('click', () => promptCreateBucket(els.blogBucketSelect));
}

// ──────────────────────────────────────────────
// QUICK CREATE BUCKET (from main view)
// ──────────────────────────────────────────────
async function promptCreateBucket(selectEl) {
  const name = prompt('Enter bucket name (e.g. "Chennai Trip"):');
  if (!name || !name.trim()) return;

  const newBucket = { id: generateId(), name: name.trim(), createdAt: new Date().toISOString() };
  allBuckets = [newBucket, ...allBuckets];
  await saveBuckets(allBuckets);
  updateBucketsCount();
  populateBucketSelects();

  // Select the newly created bucket
  if (selectEl) selectEl.value = newBucket.id;
}

// ──────────────────────────────────────────────
// ADD YOUTUBE TO PLAN
// ──────────────────────────────────────────────
async function handleAddYoutubeToPlan() {
  if (!currentTab || !currentVideoId) return;

  const planName = els.planNameInput.value.trim() || 'My Travel Plan';
  const note = els.noteInput.value.trim();
  const bucketId = els.ytBucketSelect.value || null;
  const bucketName = bucketId ? (allBuckets.find(b => b.id === bucketId)?.name || '') : '';

  const newPlan = {
    id: generateId(),
    type: 'youtube',
    planName,
    note,
    url: currentTab.url,
    videoId: currentVideoId,
    title: els.videoTitle.textContent,
    savedAt: new Date().toISOString(),
    thumbnail: `https://img.youtube.com/vi/${currentVideoId}/mqdefault.jpg`,
    bucketId,
    bucketName,
  };

  allPlans = [newPlan, ...allPlans];
  await savePlans(allPlans);

  els.addToPlanBtn.classList.add('hidden');
  els.successBanner.classList.remove('hidden');
  els.alreadySaved.classList.add('hidden');
  updateBadge();

  setTimeout(() => {
    els.successBanner.classList.add('hidden');
    els.alreadySaved.classList.remove('hidden');
    els.addToPlanBtn.disabled = true;
  }, 2200);
}

// ──────────────────────────────────────────────
// ADD BLOG URL TO PLAN
// ──────────────────────────────────────────────
async function handleAddBlogToPlan() {
  const url = els.blogUrlInput.value.trim();
  const label = els.blogLabelInput.value.trim();
  const note = els.blogNoteInput.value.trim();
  const bucketId = els.blogBucketSelect.value || null;
  const bucketName = bucketId ? (allBuckets.find(b => b.id === bucketId)?.name || '') : '';

  if (!url) {
    els.blogUrlInput.focus();
    els.blogUrlInput.style.borderColor = '#e05252';
    setTimeout(() => { els.blogUrlInput.style.borderColor = ''; }, 2000);
    return;
  }

  if (!label) {
    els.blogLabelInput.focus();
    els.blogLabelInput.style.borderColor = '#e05252';
    setTimeout(() => { els.blogLabelInput.style.borderColor = ''; }, 2000);
    return;
  }

  let validUrl = url;
  try {
    new URL(url);
  } catch {
    if (!url.startsWith('http')) {
      validUrl = 'https://' + url;
    }
  }

  const newPlan = {
    id: generateId(),
    type: 'blog',
    planName: label,
    note,
    url: validUrl,
    videoId: null,
    title: label,
    savedAt: new Date().toISOString(),
    thumbnail: null,
    bucketId,
    bucketName,
  };

  allPlans = [newPlan, ...allPlans];
  await savePlans(allPlans);

  els.blogSuccessBanner.classList.remove('hidden');
  els.addBlogBtn.disabled = true;
  updateBadge();

  setTimeout(() => {
    els.blogSuccessBanner.classList.add('hidden');
    els.addBlogBtn.disabled = false;
    // Clear form
    els.blogUrlInput.value = '';
    els.blogLabelInput.value = '';
    els.blogNoteInput.value = '';
    els.blogBucketSelect.value = '';
    els.blogAutoDetect.classList.add('hidden');
  }, 2200);
}

// ──────────────────────────────────────────────
// PLANS PANEL
// ──────────────────────────────────────────────
function openPlansPanel() {
  els.mainView.classList.add('hidden');
  els.bucketsPanel.classList.add('hidden');
  els.plansPanel.classList.remove('hidden');
  els.searchInput.value = '';
  renderPlansList();
}

function closePlansPanel() {
  els.plansPanel.classList.add('hidden');
  els.mainView.classList.remove('hidden');
}

function renderPlansList() {
  const query = els.searchInput.value.trim().toLowerCase();
  const bucketId = els.bucketFilterSelect.value;

  let filtered = allPlans;

  if (bucketId) {
    filtered = filtered.filter(p => p.bucketId === bucketId);
  }

  if (query) {
    filtered = filtered.filter(p =>
      p.planName?.toLowerCase().includes(query) ||
      p.title?.toLowerCase().includes(query) ||
      p.note?.toLowerCase().includes(query) ||
      p.bucketName?.toLowerCase().includes(query)
    );
  }

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
  const isBlog = plan.type === 'blog';
  const card = document.createElement('div');
  card.className = `plan-card${isBlog ? ' plan-card--blog' : ''}`;
  card.dataset.id = plan.id;

  const typeIcon = isBlog
    ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`
    : `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>`;

  const typeLabel = isBlog ? 'Blog' : 'YouTube';

  const bucketChip = plan.bucketName
    ? `<span class="plan-bucket-chip"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>${escapeHtml(plan.bucketName)}</span>`
    : '';

  card.innerHTML = `
    <div class="plan-card-header">
      <div class="plan-card-meta">
        <span class="plan-type-tag plan-type-tag--${isBlog ? 'blog' : 'yt'}">${typeIcon}${typeLabel}</span>
        ${bucketChip}
      </div>
      <div class="plan-card-actions">
        <button class="plan-action-btn plan-action-btn--copy" title="Copy URL" data-url="${escapeHtml(plan.url)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
        <button class="plan-action-btn plan-action-btn--open" title="Open" data-url="${escapeHtml(plan.url)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </button>
        <button class="plan-action-btn plan-action-btn--delete" title="Remove" data-id="${plan.id}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
    <span class="plan-card-name">${escapeHtml(plan.planName)}</span>
    <a class="plan-card-url" href="${escapeHtml(plan.url)}" target="_blank" title="${escapeHtml(plan.url)}">${shortUrl(plan.url)}</a>
    <div class="plan-card-footer">
      <span class="plan-card-note">${plan.note ? escapeHtml(plan.note) : ''}</span>
      <span class="plan-card-date">${formatDate(plan.savedAt)}</span>
    </div>
  `;

  // Copy
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
      chrome.runtime.sendMessage({ action: 'copyToClipboard', text: url });
    }
  });

  // Open
  card.querySelector('.plan-action-btn--open').addEventListener('click', (e) => {
    chrome.tabs.create({ url: e.currentTarget.dataset.url });
  });

  // Delete
  card.querySelector('.plan-action-btn--delete').addEventListener('click', async (e) => {
    const planId = e.currentTarget.dataset.id;
    allPlans = allPlans.filter(p => p.id !== planId);
    await savePlans(allPlans);
    updateBadge();
    renderPlansList();

    if (planId && currentVideoId) {
      const stillExists = allPlans.some(p => p.videoId === currentVideoId);
      if (!stillExists) {
        els.addToPlanBtn.disabled = false;
        els.addToPlanBtn.innerHTML = `
          <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          Save to Travel Plans`;
        els.alreadySaved.classList.add('hidden');
      }
    }
  });

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
  renderPlansList();
}

// ──────────────────────────────────────────────
// BUCKETS PANEL
// ──────────────────────────────────────────────
function openBucketsPanel() {
  els.mainView.classList.add('hidden');
  els.plansPanel.classList.add('hidden');
  els.bucketsPanel.classList.remove('hidden');
  renderBucketsList();
}

function closeBucketsPanel() {
  els.bucketsPanel.classList.add('hidden');
  els.mainView.classList.remove('hidden');
}

async function handleCreateBucket() {
  const name = els.newBucketNameInput.value.trim();
  if (!name) {
    els.newBucketNameInput.focus();
    return;
  }

  const newBucket = { id: generateId(), name, createdAt: new Date().toISOString() };
  allBuckets = [newBucket, ...allBuckets];
  await saveBuckets(allBuckets);
  els.newBucketNameInput.value = '';
  updateBucketsCount();
  populateBucketSelects();
  renderBucketsList();
}

function renderBucketsList() {
  els.bucketsList.innerHTML = '';

  if (allBuckets.length === 0) {
    els.emptyBuckets.classList.remove('hidden');
    return;
  }

  els.emptyBuckets.classList.add('hidden');

  allBuckets.forEach(bucket => {
    const count = allPlans.filter(p => p.bucketId === bucket.id).length;
    const item = document.createElement('div');
    item.className = 'bucket-item';
    item.innerHTML = `
      <div class="bucket-item-info">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:.7">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <span class="bucket-item-name">${escapeHtml(bucket.name)}</span>
        <span class="bucket-item-count">${count} item${count !== 1 ? 's' : ''}</span>
      </div>
      <div class="bucket-item-actions">
        <button class="plan-action-btn plan-action-btn--open bucket-view-btn" title="View plans in this bucket" data-id="${bucket.id}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <button class="plan-action-btn plan-action-btn--delete bucket-delete-btn" title="Delete bucket" data-id="${bucket.id}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    `;

    item.querySelector('.bucket-view-btn').addEventListener('click', () => {
      closeBucketsPanel();
      openPlansPanel();
      els.bucketFilterSelect.value = bucket.id;
      renderPlansList();
    });

    item.querySelector('.bucket-delete-btn').addEventListener('click', async () => {
      if (!confirm(`Delete bucket "${bucket.name}"? Plans inside will remain but lose their bucket tag.`)) return;
      allBuckets = allBuckets.filter(b => b.id !== bucket.id);
      // Remove bucket reference from plans
      allPlans = allPlans.map(p => p.bucketId === bucket.id ? { ...p, bucketId: null, bucketName: '' } : p);
      await Promise.all([saveBuckets(allBuckets), savePlans(allPlans)]);
      updateBucketsCount();
      populateBucketSelects();
      renderBucketsList();
    });

    els.bucketsList.appendChild(item);
  });
}

// ──────────────────────────────────────────────
// BADGE UPDATES
// ──────────────────────────────────────────────
function updateBadge() {
  const count = allPlans.length;
  if (count > 0) {
    els.savedCount.textContent = count > 99 ? '99+' : count;
    els.savedCount.classList.remove('hidden');
  } else {
    els.savedCount.classList.add('hidden');
  }
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
}

function updateBucketsCount() {
  const count = allBuckets.length;
  if (count > 0) {
    els.bucketsCount.textContent = count > 99 ? '99+' : count;
    els.bucketsCount.classList.remove('hidden');
  } else {
    els.bucketsCount.classList.add('hidden');
  }
}

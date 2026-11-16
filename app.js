/**
 * VidGrab — Universal Client-side Video Downloader
 * Powered by public Cobalt instances. Free, no server required.
 */

// Default and fallback Cobalt API instances
const DEFAULT_INSTANCES = [
  'https://api.cobalt.tools',
  'https://cobalt-api.kwiatekm.pl',
  'https://api.wuk.sh'
];

// App State
const state = {
  activeInstance: localStorage.getItem('vidgrab_api_instance') || DEFAULT_INSTANCES[0],
  detectedPlatform: null,
  isProcessing: false,
};

// DOM Elements
const urlInput = document.getElementById('urlInput');
const clearBtn = document.getElementById('clearBtn');
const pasteBtn = document.getElementById('pasteBtn');
const downloadBtn = document.getElementById('downloadBtn');
const qualitySelect = document.getElementById('qualitySelect');
const formatSelect = document.getElementById('formatSelect');
const muteAudioCheckbox = document.getElementById('muteAudio');

const platformIconContainer = document.getElementById('platformIconContainer');
const detectedPlatformBadge = document.getElementById('detectedPlatformBadge');
const platformName = document.getElementById('platformName');

const statusContainer = document.getElementById('statusContainer');
const loadingCard = document.getElementById('loadingCard');
const loadingText = document.getElementById('loadingText');
const errorCard = document.getElementById('errorCard');
const errorTitle = document.getElementById('errorTitle');
const errorMessage = document.getElementById('errorMessage');
const closeErrorBtn = document.getElementById('closeErrorBtn');

const resultCard = document.getElementById('resultCard');
const resultPlatform = document.getElementById('resultPlatform');
const resultFilename = document.getElementById('resultFilename');
const saveVideoLink = document.getElementById('saveVideoLink');
const pickerContainer = document.getElementById('pickerContainer');
const pickerList = document.getElementById('pickerList');

// Settings modal
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const instancePresetSelect = document.getElementById('instancePresetSelect');
const customInstanceWrapper = document.getElementById('customInstanceWrapper');
const customInstanceInput = document.getElementById('customInstanceInput');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

// Initialize Icons
function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Platform Matcher
function detectPlatform(url) {
  if (!url) return null;
  const lower = url.toLowerCase();

  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('instagram.com')) return 'instagram';
  if (lower.includes('reddit.com') || lower.includes('redd.it')) return 'reddit';
  if (lower.includes('facebook.com') || lower.includes('fb.watch')) return 'facebook';
  if (lower.includes('twitter.com') || lower.includes('x.com')) return 'x (twitter)';
  if (lower.includes('tiktok.com')) return 'tiktok';
  if (lower.includes('pinterest.com') || lower.includes('pin.it')) return 'pinterest';
  if (lower.includes('vimeo.com')) return 'vimeo';

  return null;
}

// Update Platform Icon in Input
function updatePlatformUI(platform) {
  state.detectedPlatform = platform;
  let iconName = 'link';

  if (platform === 'youtube') iconName = 'youtube';
  else if (platform === 'instagram') iconName = 'instagram';
  else if (platform === 'reddit') iconName = 'message-square';
  else if (platform === 'facebook') iconName = 'facebook';
  else if (platform === 'x (twitter)') iconName = 'twitter';
  else if (platform === 'tiktok') iconName = 'video';

  platformIconContainer.innerHTML = `<i data-lucide="${iconName}" class="w-5 h-5 ${platform ? 'text-indigo-400' : 'text-slate-500'}"></i>`;

  if (platform) {
    detectedPlatformBadge.classList.remove('hidden');
    platformName.textContent = platform;
  } else {
    detectedPlatformBadge.classList.add('hidden');
  }

  refreshIcons();
}

// Handle Input changes
urlInput.addEventListener('input', () => {
  const val = urlInput.value.trim();
  if (val.length > 0) {
    clearBtn.classList.remove('hidden');
    const plat = detectPlatform(val);
    updatePlatformUI(plat);
  } else {
    clearBtn.classList.add('hidden');
    updatePlatformUI(null);
  }
});

// Clear Button
clearBtn.addEventListener('click', () => {
  urlInput.value = '';
  clearBtn.classList.add('hidden');
  updatePlatformUI(null);
  urlInput.focus();
});

// Paste Button
pasteBtn.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      urlInput.value = text.trim();
      clearBtn.classList.remove('hidden');
      updatePlatformUI(detectPlatform(text));
    }
  } catch (err) {
    console.warn('Clipboard read failed:', err);
    urlInput.focus();
  }
});

// Hide all status cards
function resetStatus() {
  statusContainer.classList.add('hidden');
  loadingCard.classList.add('hidden');
  errorCard.classList.add('hidden');
  resultCard.classList.add('hidden');
  pickerContainer.classList.add('hidden');
  pickerList.innerHTML = '';
}

// Show Error
function showError(title, msg) {
  resetStatus();
  statusContainer.classList.remove('hidden');
  errorCard.classList.remove('hidden');
  errorTitle.textContent = title || 'Download Failed';
  errorMessage.textContent = msg || 'An unexpected error occurred. Please check the video link.';
  refreshIcons();
}

closeErrorBtn.addEventListener('click', () => {
  errorCard.classList.add('hidden');
});

// Call Cobalt API with automatic instance fallback
async function fetchFromCobalt(payload) {
  // Try active instance first, then fallbacks
  const instancesToTry = [
    state.activeInstance,
    ...DEFAULT_INSTANCES.filter(i => i !== state.activeInstance)
  ];

  let lastError = null;

  for (let i = 0; i < instancesToTry.length; i++) {
    const instance = instancesToTry[i];
    try {
      loadingText.textContent = `Connecting to extraction node (${i + 1}/${instancesToTry.length})...`;
      
      const response = await fetch(`${instance}/`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData && errorData.text) {
          throw new Error(errorData.text);
        } else if (response.status === 429) {
          throw new Error('Rate limit reached on this instance. Trying alternate server...');
        } else {
          throw new Error(`Server returned code ${response.status}`);
        }
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.warn(`Instance failed (${instance}):`, err.message);
      lastError = err;
      // Continue to next instance
    }
  }

  throw lastError || new Error('Could not reach any video extraction server. Please check your connection.');
}

// Download Process
async function processDownload() {
  const rawUrl = urlInput.value.trim();
  if (!rawUrl) {
    showError('No URL Entered', 'Please paste a link to a video from YouTube, Instagram, Reddit, Facebook, or X.com.');
    return;
  }

  // Set Processing State
  state.isProcessing = true;
  downloadBtn.disabled = true;
  downloadBtn.innerHTML = `<div class="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div><span>Fetching...</span>`;

  resetStatus();
  statusContainer.classList.remove('hidden');
  loadingCard.classList.remove('hidden');
  loadingText.textContent = 'Contacting video processing engine...';

  const downloadMode = formatSelect.value === 'audio' 
    ? 'audio' 
    : (muteAudioCheckbox.checked ? 'mute' : 'auto');

  const payload = {
    url: rawUrl,
    videoQuality: qualitySelect.value,
    audioFormat: 'mp3',
    downloadMode: downloadMode,
    filenameStyle: 'pretty'
  };

  try {
    const data = await fetchFromCobalt(payload);

    if (data.status === 'error') {
      showError('Extraction Error', data.text || 'Could not parse media from this link.');
      return;
    }

    // Success response: tunnel or redirect
    if (data.status === 'tunnel' || data.status === 'redirect') {
      showSuccessSingle(data.url, data.filename || 'download.mp4');
    } else if (data.status === 'picker' && Array.isArray(data.picker)) {
      showSuccessPicker(data.picker);
    } else if (data.url) {
      showSuccessSingle(data.url, data.filename || 'download.mp4');
    } else {
      showError('Unknown Format', 'The server responded but did not provide a valid download URL.');
    }

  } catch (err) {
    showError('Download Failed', err.message || 'Unable to download video. Make sure the video is public and accessible.');
  } finally {
    state.isProcessing = false;
    downloadBtn.disabled = false;
    downloadBtn.innerHTML = `<i data-lucide="arrow-down-to-line" class="w-5 h-5"></i><span>Fetch Video</span>`;
    refreshIcons();
  }
}

// Show single file download
function showSuccessSingle(url, filename) {
  resetStatus();
  statusContainer.classList.remove('hidden');
  resultCard.classList.remove('hidden');

  resultPlatform.textContent = state.detectedPlatform || 'Media';
  resultFilename.textContent = filename || 'download.mp4';
  saveVideoLink.href = url;
  saveVideoLink.setAttribute('download', filename || 'video.mp4');

  // Trigger auto download if desirable or let user click
  refreshIcons();
}

// Show multiple items (carousels, album, etc.)
function showSuccessPicker(items) {
  resetStatus();
  statusContainer.classList.remove('hidden');
  resultCard.classList.remove('hidden');

  resultPlatform.textContent = state.detectedPlatform || 'Album/Carousel';
  resultFilename.textContent = `${items.length} items found`;
  saveVideoLink.classList.add('hidden'); // Use individual buttons
  pickerContainer.classList.remove('hidden');
  pickerList.innerHTML = '';

  items.forEach((item, index) => {
    const isVideo = item.type === 'video';
    const card = document.createElement('div');
    card.className = 'p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-2';
    card.innerHTML = `
      <div class="flex items-center gap-2 overflow-hidden">
        <div class="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
          <i data-lucide="${isVideo ? 'film' : 'image'}" class="w-4 h-4"></i>
        </div>
        <div class="truncate text-xs">
          <p class="font-medium text-slate-200 truncate">Item #${index + 1} (${item.type})</p>
        </div>
      </div>
      <a 
        href="${item.url}" 
        target="_blank" 
        download="item_${index + 1}.${isVideo ? 'mp4' : 'jpg'}"
        class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium shrink-0 flex items-center gap-1"
      >
        <i data-lucide="download" class="w-3.5 h-3.5"></i> Save
      </a>
    `;
    pickerList.appendChild(card);
  });

  refreshIcons();
}

// Event Listeners
downloadBtn.addEventListener('click', processDownload);

urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    processDownload();
  }
});

// Settings Modal Management
settingsBtn.addEventListener('click', () => {
  settingsModal.classList.remove('hidden');
  if (DEFAULT_INSTANCES.includes(state.activeInstance)) {
    instancePresetSelect.value = state.activeInstance;
    customInstanceWrapper.classList.add('hidden');
  } else {
    instancePresetSelect.value = 'custom';
    customInstanceWrapper.classList.remove('hidden');
    customInstanceInput.value = state.activeInstance;
  }
});

closeSettingsBtn.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
});

instancePresetSelect.addEventListener('change', () => {
  if (instancePresetSelect.value === 'custom') {
    customInstanceWrapper.classList.remove('hidden');
  } else {
    customInstanceWrapper.classList.add('hidden');
  }
});

saveSettingsBtn.addEventListener('click', () => {
  let selected = instancePresetSelect.value;
  if (selected === 'custom') {
    const custom = customInstanceInput.value.trim().replace(/\/+$/, '');
    if (custom) {
      selected = custom;
    } else {
      selected = DEFAULT_INSTANCES[0];
    }
  }

  state.activeInstance = selected;
  localStorage.setItem('vidgrab_api_instance', selected);
  settingsModal.classList.add('hidden');
});

// Initial boot
document.addEventListener('DOMContentLoaded', () => {
  refreshIcons();
});

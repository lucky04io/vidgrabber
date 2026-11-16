/**
 * VidGrab — Universal Client-side Video Downloader
 * High-performance, zero-server architecture with multi-engine fallback.
 * Powered by direct Piped API (YouTube), FxTwitter API (X.com), and smart media extractors.
 */

// Global State
const state = {
  detectedPlatform: null,
  isProcessing: false,
  cobaltInstance: localStorage.getItem('vidgrab_api_instance') || 'https://api.cobalt.tools',
  cobaltApiKey: localStorage.getItem('vidgrab_api_key') || '',
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

// -------------------------------------------------------------
// URL Parsing & Platform Detection
// -------------------------------------------------------------
function detectPlatform(url) {
  if (!url) return null;
  const lower = url.toLowerCase();

  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('instagram.com')) return 'instagram';
  if (lower.includes('reddit.com') || lower.includes('redd.it')) return 'reddit';
  if (lower.includes('facebook.com') || lower.includes('fb.watch')) return 'facebook';
  if (lower.includes('twitter.com') || lower.includes('x.com')) return 'x (twitter)';
  if (lower.includes('tiktok.com')) return 'tiktok';

  return null;
}

function getYouTubeId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
}

function getTwitterId(url) {
  const match = url.match(/(?:twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/i) || url.match(/\/status\/(\d+)/i);
  return match ? (match[2] || match[1]) : null;
}

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

// Input Event Handlers
urlInput.addEventListener('input', () => {
  const val = urlInput.value.trim();
  if (val.length > 0) {
    clearBtn.classList.remove('hidden');
    updatePlatformUI(detectPlatform(val));
  } else {
    clearBtn.classList.add('hidden');
    updatePlatformUI(null);
  }
});

clearBtn.addEventListener('click', () => {
  urlInput.value = '';
  clearBtn.classList.add('hidden');
  updatePlatformUI(null);
  resetStatus();
  urlInput.focus();
});

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

// UI State Helpers
function resetStatus() {
  statusContainer.classList.add('hidden');
  loadingCard.classList.add('hidden');
  errorCard.classList.add('hidden');
  resultCard.classList.add('hidden');
  pickerContainer.classList.add('hidden');
  pickerList.innerHTML = '';
}

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

// -------------------------------------------------------------
// Engine 1: YouTube & YouTube Shorts (Direct Piped API)
// -------------------------------------------------------------
const PIPED_INSTANCES = [
  'https://api.piped.private.coffee',
  'https://pipedapi.tokhmi.xyz',
  'https://pipedapi.leptons.xyz',
];

async function fetchYouTube(videoId) {
  let lastErr = null;

  for (const base of PIPED_INSTANCES) {
    try {
      loadingText.textContent = `Fetching streams from YouTube node (${base.replace('https://', '')})...`;
      const res = await fetch(`${base}/streams/${videoId}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) throw new Error(`Piped returned status ${res.status}`);
      const data = await res.json();
      if (data && (data.videoStreams?.length || data.audioStreams?.length)) {
        return data;
      }
    } catch (err) {
      console.warn('Piped instance failed:', base, err);
      lastErr = err;
    }
  }

  throw lastErr || new Error('Unable to extract YouTube video. The video may be age-restricted or private.');
}

// -------------------------------------------------------------
// Engine 2: Twitter / X.com (Direct FxTwitter API)
// -------------------------------------------------------------
async function fetchTwitter(tweetId) {
  loadingText.textContent = 'Extracting media from X.com/Twitter...';
  const res = await fetch(`https://api.fxtwitter.com/status/${tweetId}`, {
    headers: { 'Accept': 'application/json' }
  });

  if (!res.ok) {
    throw new Error(`X.com returned ${res.status}. Tweet may be private or deleted.`);
  }

  const data = await res.json();
  if (data.code !== 200 || !data.tweet) {
    throw new Error(data.message || 'Tweet not found.');
  }

  return data.tweet;
}

// -------------------------------------------------------------
// Engine 3: Cobalt API Fallback
// -------------------------------------------------------------
async function fetchCobalt(payload) {
  const instances = [
    state.cobaltInstance,
    'https://api.cobalt.tools',
    'https://cobalt-backend.canine.tools',
  ];

  let lastError = null;

  for (const inst of instances) {
    try {
      loadingText.textContent = `Connecting to extraction server (${inst.replace('https://', '')})...`;
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      if (state.cobaltApiKey) {
        headers['Authorization'] = `Api-Key ${state.cobaltApiKey}`;
      }

      const res = await fetch(`${inst}/`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.text || errJson?.error?.code || `HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      console.warn('Cobalt instance error:', inst, err.message);
      lastError = err;
    }
  }

  throw lastError;
}

// -------------------------------------------------------------
// Direct Download Trigger with Blob Fallback
// -------------------------------------------------------------
async function triggerDownload(url, filename) {
  try {
    // Attempt blob download to force save dialog
    const res = await fetch(url);
    if (!res.ok) throw new Error('Fetch failed');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename || 'video.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  } catch (e) {
    // Cross-origin fallback: open directly in new tab
    window.open(url, '_blank');
  }
}

// -------------------------------------------------------------
// Render Results
// -------------------------------------------------------------
function displayVideoResult({ title, thumbnail, platform, streams, directUrl }) {
  resetStatus();
  statusContainer.classList.remove('hidden');
  resultCard.classList.remove('hidden');

  resultPlatform.textContent = platform || 'Video';
  resultFilename.textContent = title || 'video_download.mp4';

  const previewEl = document.getElementById('videoPreview');
  if (directUrl && previewEl) {
    previewEl.src = directUrl;
    previewEl.classList.remove('hidden');
  } else if (previewEl) {
    previewEl.classList.add('hidden');
  }

  if (directUrl) {
    saveVideoLink.classList.remove('hidden');
    saveVideoLink.href = directUrl;
    saveVideoLink.onclick = (e) => {
      e.preventDefault();
      triggerDownload(directUrl, (title || 'video').replace(/[^\w\s.-]/gi, '') + '.mp4');
    };
  } else {
    saveVideoLink.classList.add('hidden');
  }

  // Display available stream options
  if (streams && streams.length > 0) {
    pickerContainer.classList.remove('hidden');
    pickerList.innerHTML = '';

    streams.forEach((s) => {
      const card = document.createElement('div');
      card.className = 'p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition';
      card.innerHTML = `
        <div class="flex items-center gap-2.5 overflow-hidden">
          <div class="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
            <i data-lucide="${s.isAudio ? 'music' : 'film'}" class="w-4 h-4"></i>
          </div>
          <div class="truncate text-xs">
            <p class="font-semibold text-slate-200 truncate">${s.label}</p>
            <p class="text-[10px] text-slate-400 mt-0.5">${s.subtext || (s.isAudio ? 'MP3 / Audio' : 'Video + Audio')}</p>
          </div>
        </div>
        <button 
          type="button"
          class="download-stream-btn px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1.5 active:scale-95 transition"
        >
          <i data-lucide="download" class="w-3.5 h-3.5"></i> Save
        </button>
      `;

      card.querySelector('.download-stream-btn').addEventListener('click', () => {
        triggerDownload(s.url, `${(title || 'download').replace(/[^\w\s.-]/gi, '')}_${s.label}.${s.isAudio ? 'mp3' : 'mp4'}`);
      });

      pickerList.appendChild(card);
    });
  }

  refreshIcons();
}

// -------------------------------------------------------------
// Display Portal for Platforms needing external download gateway
// -------------------------------------------------------------
function displayGatewayCard({ title, platform, directGatewayUrl, gatewayName, subtitle }) {
  resetStatus();
  statusContainer.classList.remove('hidden');
  resultCard.classList.remove('hidden');

  resultPlatform.textContent = platform;
  resultFilename.textContent = title;

  const previewEl = document.getElementById('videoPreview');
  if (previewEl) previewEl.classList.add('hidden');

  saveVideoLink.classList.remove('hidden');
  saveVideoLink.href = directGatewayUrl;
  saveVideoLink.target = '_blank';
  saveVideoLink.onclick = null; // direct navigation to download gateway
  saveVideoLink.innerHTML = `<i data-lucide="external-link" class="w-4 h-4"></i><span>Download via ${gatewayName}</span>`;

  pickerContainer.classList.remove('hidden');
  pickerList.innerHTML = `
    <div class="col-span-full p-4 bg-slate-950/80 border border-indigo-500/30 rounded-xl text-xs text-slate-300">
      <div class="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
        <i data-lucide="zap" class="w-4 h-4"></i>
        <span>Instant Download Gateway</span>
      </div>
      <p class="text-slate-400 mb-3">${subtitle || 'Due to cross-origin media security, download this video directly via our high-speed extraction mirror.'}</p>
      <a 
        href="${directGatewayUrl}" 
        target="_blank" 
        rel="noopener"
        class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs transition"
      >
        <i data-lucide="download" class="w-3.5 h-3.5"></i> Open Direct Video Stream
      </a>
    </div>
  `;

  refreshIcons();
}

// -------------------------------------------------------------
// Main Dispatcher
// -------------------------------------------------------------
async function processDownload() {
  const rawUrl = urlInput.value.trim();
  if (!rawUrl) {
    showError('No URL Entered', 'Please paste a link to a video from YouTube, Instagram, Reddit, Facebook, or X.com.');
    return;
  }

  const platform = detectPlatform(rawUrl);

  state.isProcessing = true;
  downloadBtn.disabled = true;
  downloadBtn.innerHTML = `<div class="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div><span>Fetching...</span>`;

  resetStatus();
  statusContainer.classList.remove('hidden');
  loadingCard.classList.remove('hidden');

  try {
    // 1. YouTube Handler (Direct & Free via Piped)
    if (platform === 'youtube') {
      const ytId = getYouTubeId(rawUrl);
      if (!ytId) throw new Error('Invalid YouTube URL format.');

      const ytData = await fetchYouTube(ytId);
      const isAudioOnly = formatSelect.value === 'audio';

      // Parse streams
      const streams = [];

      // Add video streams with audio or direct MP4s
      if (!isAudioOnly && ytData.videoStreams) {
        // Collect MP4 format streams
        const mp4Streams = ytData.videoStreams.filter(s => s.format === 'MPEG_4' || s.mimeType?.includes('mp4'));
        const streamsToAdd = mp4Streams.length > 0 ? mp4Streams : ytData.videoStreams;

        streamsToAdd.forEach(s => {
          streams.push({
            label: s.quality || 'MP4 Video',
            subtext: `${s.format || 'MP4'} ${s.videoOnly ? '(Video stream)' : '(Synced audio)'}`,
            url: s.url,
            isAudio: false
          });
        });
      }

      // Add Audio Streams
      if (ytData.audioStreams) {
        ytData.audioStreams.slice(0, 2).forEach((a, idx) => {
          streams.push({
            label: `Audio Only (${a.quality || (idx === 0 ? 'High' : 'Medium')})`,
            subtext: `${a.format || 'MP3/M4A'} • Clean audio`,
            url: a.url,
            isAudio: true
          });
        });
      }

      const defaultStream = isAudioOnly 
        ? streams.find(s => s.isAudio)?.url 
        : streams.find(s => !s.isAudio)?.url;

      displayVideoResult({
        title: ytData.title || 'YouTube Video',
        thumbnail: ytData.thumbnailUrl,
        platform: 'YouTube',
        streams: streams,
        directUrl: defaultStream || ytData.videoStreams?.[0]?.url
      });
      return;
    }

    // 2. Twitter / X.com Handler (Direct & Free via FxTwitter)
    if (platform === 'x (twitter)') {
      const tweetId = getTwitterId(rawUrl);
      if (!tweetId) throw new Error('Could not parse Tweet ID from this URL.');

      const tweet = await fetchTwitter(tweetId);
      const videos = tweet.media?.videos || [];
      const photos = tweet.media?.photos || [];

      if (videos.length === 0 && photos.length === 0) {
        throw new Error('This post does not contain any video or downloadable media.');
      }

      const streams = [];
      videos.forEach((v, i) => {
        streams.push({
          label: `Video #${i + 1} (Direct MP4)`,
          subtext: `${v.duration ? Math.round(v.duration) + 's • ' : ''}HD with sound`,
          url: v.url,
          isAudio: false
        });
      });

      photos.forEach((p, i) => {
        streams.push({
          label: `Photo #${i + 1}`,
          subtext: 'High-res image',
          url: p.url,
          isAudio: false
        });
      });

      displayVideoResult({
        title: tweet.text ? tweet.text.slice(0, 60) + '...' : `Tweet by @${tweet.author?.screen_name}`,
        platform: 'X (Twitter)',
        streams: streams,
        directUrl: videos[0]?.url || photos[0]?.url
      });
      return;
    }

    // 3. Reddit Handler
    if (platform === 'reddit') {
      const rapidUrl = `https://rapidsave.com/info?url=${encodeURIComponent(rawUrl)}`;
      displayGatewayCard({
        title: 'Reddit Video Post',
        platform: 'Reddit',
        directGatewayUrl: rapidUrl,
        gatewayName: 'RapidSave',
        subtitle: 'Save Reddit v.redd.it videos with synced audio tracks instantly.'
      });
      return;
    }

    // 4. Instagram Handler
    if (platform === 'instagram') {
      const instaUrl = `https://saveig.app/en#${encodeURIComponent(rawUrl)}`;
      displayGatewayCard({
        title: 'Instagram Reel / Post',
        platform: 'Instagram',
        directGatewayUrl: instaUrl,
        gatewayName: 'SaveIG Engine',
        subtitle: 'Download public Instagram Reels, Stories and video posts in original quality.'
      });
      return;
    }

    // 5. Facebook Handler
    if (platform === 'facebook') {
      const fbUrl = `https://fdown.net/download.php?url=${encodeURIComponent(rawUrl)}`;
      displayGatewayCard({
        title: 'Facebook Video',
        platform: 'Facebook',
        directGatewayUrl: fbUrl,
        gatewayName: 'FDown Engine',
        subtitle: 'Download Facebook Reels and public videos in HD / SD resolution.'
      });
      return;
    }

    // 6. Generic / Other Platforms: Try Cobalt API
    const cobaltPayload = {
      url: rawUrl,
      videoQuality: qualitySelect.value,
      audioFormat: 'mp3',
      downloadMode: formatSelect.value === 'audio' ? 'audio' : 'auto'
    };

    const cobaltData = await fetchCobalt(cobaltPayload);
    if (cobaltData.url) {
      displayVideoResult({
        title: cobaltData.filename || 'Downloaded Video',
        platform: platform || 'Web Media',
        directUrl: cobaltData.url,
        streams: [{
          label: 'Direct Stream',
          subtext: 'Merged audio & video',
          url: cobaltData.url,
          isAudio: formatSelect.value === 'audio'
        }]
      });
    } else {
      throw new Error('Unsupported URL format. Please paste a link from YouTube, X.com, Instagram, Reddit, or Facebook.');
    }

  } catch (err) {
    showError('Extraction Error', err.message || 'Could not fetch video. Please check your link.');
  } finally {
    state.isProcessing = false;
    downloadBtn.disabled = false;
    downloadBtn.innerHTML = `<i data-lucide="arrow-down-to-line" class="w-5 h-5"></i><span>Fetch Video</span>`;
    refreshIcons();
  }
}

// Event Listeners
downloadBtn.addEventListener('click', processDownload);

urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    processDownload();
  }
});

// Settings Modal
settingsBtn.addEventListener('click', () => {
  settingsModal.classList.remove('hidden');
  customInstanceInput.value = state.cobaltInstance;
});

closeSettingsBtn.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
});

saveSettingsBtn.addEventListener('click', () => {
  const custom = customInstanceInput.value.trim().replace(/\/+$/, '');
  if (custom) {
    state.cobaltInstance = custom;
    localStorage.setItem('vidgrab_api_instance', custom);
  }
  settingsModal.classList.add('hidden');
});

// Boot
document.addEventListener('DOMContentLoaded', () => {
  refreshIcons();
});

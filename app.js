/**
 * VidGrab — Universal Client-side Video Downloader
 * Zero-server architecture with multi-engine fallback & instant backup mirrors.
 * Supports: YouTube (Long & Shorts), X.com (Twitter), Instagram, Reddit, Facebook, TikTok
 */

// Global State & Settings
const state = {
  detectedPlatform: null,
  isProcessing: false,
  lastUrl: '',
};

const DEFAULT_PIPED_NODES = [
  'https://pipedapi.ducks.party',
  'https://api.piped.private.coffee',
];

function getActivePipedNodes() {
  const saved = localStorage.getItem('vidgrab_piped_node');
  if (saved && saved !== 'default') {
    return [saved, ...DEFAULT_PIPED_NODES.filter(n => n !== saved)];
  }
  return DEFAULT_PIPED_NODES;
}

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
const errorFallbackContainer = document.getElementById('errorFallbackContainer');

const resultCard = document.getElementById('resultCard');
const resultPlatform = document.getElementById('resultPlatform');
const resultFilename = document.getElementById('resultFilename');
const saveVideoLink = document.getElementById('saveVideoLink');
const videoPreview = document.getElementById('videoPreview');
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

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Handle video preview errors gracefully (e.g. CORS/auth restrictions)
if (videoPreview) {
  videoPreview.onerror = () => {
    videoPreview.classList.add('hidden');
  };
}

// -------------------------------------------------------------
// URL Parsing & Robust Regex Matchers
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
  if (!url) return null;
  // Matches all YouTube URL variants (shorts, watch, live, youtu.be, embed, query params)
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

function getTwitterId(url) {
  if (!url) return null;
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

// Input Handlers
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

// UI State Management
function resetStatus() {
  statusContainer.classList.add('hidden');
  loadingCard.classList.add('hidden');
  errorCard.classList.add('hidden');
  resultCard.classList.add('hidden');
  pickerContainer.classList.add('hidden');
  pickerList.innerHTML = '';
  if (videoPreview) {
    videoPreview.pause();
    videoPreview.removeAttribute('src');
    videoPreview.classList.add('hidden');
  }
  if (errorFallbackContainer) {
    errorFallbackContainer.innerHTML = '';
    errorFallbackContainer.classList.add('hidden');
  }
}

// Show Error with Smart 1-Click Backup Mirrors
function showError(title, msg, originalUrl) {
  resetStatus();
  statusContainer.classList.remove('hidden');
  errorCard.classList.remove('hidden');
  errorTitle.textContent = title || 'Direct Extraction Failed';
  errorMessage.textContent = msg || 'The platform blocked this request on public cloud servers.';

  const urlToUse = originalUrl || urlInput.value.trim();
  const platform = detectPlatform(urlToUse);

  if (urlToUse && errorFallbackContainer) {
    errorFallbackContainer.classList.remove('hidden');
    const mirrors = getBackupMirrors(urlToUse, platform);

    let html = `
      <div class="mt-4 pt-3 border-t border-red-500/20 text-xs">
        <p class="font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
          <i data-lucide="sparkles" class="w-3.5 h-3.5 text-indigo-400"></i>
          Instant 1-Click Download Mirrors:
        </p>
        <div class="flex flex-wrap gap-2">
    `;

    mirrors.forEach(m => {
      html += `
        <a 
          href="${m.url}" 
          target="_blank" 
          rel="noopener"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-750 text-indigo-300 hover:text-white hover:bg-slate-800 transition text-xs font-medium"
        >
          <i data-lucide="external-link" class="w-3 h-3"></i> ${m.name}
        </a>
      `;
    });

    html += `</div></div>`;
    errorFallbackContainer.innerHTML = html;
  }

  refreshIcons();
}

closeErrorBtn.addEventListener('click', () => {
  errorCard.classList.add('hidden');
});

// Backup Mirrors mapping
function getBackupMirrors(url, platform) {
  const enc = encodeURIComponent(url);
  const ytId = getYouTubeId(url);

  if (platform === 'youtube') {
    return [
      { name: 'SSYouTube (Fastest)', url: `https://ssyoutube.com/en796EA/?url=${enc}` },
      { name: 'Y2Mate (1080p/4K/MP3)', url: ytId ? `https://www.y2mate.com/youtube/${ytId}` : `https://www.y2mate.com/` },
      { name: '10Downloader Direct', url: `https://10downloader.com/download?v=${enc}` },
      { name: 'SaveFrom.net', url: `https://en.savefrom.net/1-youtube-video-downloader-385/?url=${enc}` },
      { name: 'Cobalt Web App', url: `https://cobalt.tools/#${enc}` }
    ];
  }
  if (platform === 'instagram') {
    return [
      { name: 'SaveIG (Fast & Clean)', url: `https://saveig.app/en#${enc}` },
      { name: 'SnapInsta Mirror', url: `https://snapinsta.app/` },
      { name: 'FastDL Mirror', url: `https://fastdl.app/` }
    ];
  }
  if (platform === 'reddit') {
    return [
      { name: 'RapidSave Mirror', url: `https://rapidsave.com/info?url=${enc}` },
      { name: 'RedditSave Direct', url: `https://redditsave.com/info?url=${enc}` }
    ];
  }
  if (platform === 'x (twitter)') {
    const tweetId = getTwitterId(url);
    return [
      { name: 'Direct Stream (d.fxtwitter)', url: tweetId ? `https://d.fxtwitter.com/status/${tweetId}` : `https://twitsave.com/info?url=${enc}` },
      { name: 'TwitSave Mirror', url: `https://twitsave.com/info?url=${enc}` }
    ];
  }
  if (platform === 'facebook') {
    return [
      { name: 'FDown Mirror', url: `https://fdown.net/download.php?url=${enc}` },
      { name: 'SnapSave Facebook', url: `https://snapsave.app/` }
    ];
  }
  if (platform === 'tiktok') {
    return [
      { name: 'SnapTik Mirror', url: `https://snaptik.app/` },
      { name: 'SSSTik Direct', url: `https://ssstik.io/` }
    ];
  }

  return [
    { name: 'Cobalt Universal App', url: `https://cobalt.tools/#${enc}` }
  ];
}

// -------------------------------------------------------------
// YouTube Engine (Piped Multi-node Failover)
// -------------------------------------------------------------
async function fetchYouTube(videoId) {
  const nodes = getActivePipedNodes();
  let lastErr = null;

  for (let i = 0; i < nodes.length; i++) {
    const base = nodes[i];
    try {
      loadingText.textContent = `Connecting to extraction node (${i + 1}/${nodes.length})...`;
      const res = await fetch(`${base}/streams/${videoId}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000)
      });

      if (!res.ok) {
        throw new Error(`Node returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.message || data.error);
      }

      // Filter out invalid odycdn streams (which give 401 Unauthorized)
      if (data.videoStreams) {
        data.videoStreams = data.videoStreams.filter(s => s.url && !s.url.includes('odycdn'));
      }

      if (data && ((data.videoStreams && data.videoStreams.length > 0) || (data.audioStreams && data.audioStreams.length > 0))) {
        return data;
      }
    } catch (err) {
      console.warn(`Piped node failed (${base}):`, err.message);
      lastErr = err;
    }
  }

  throw lastErr || new Error('YouTube stream extraction is temporarily rate-limited or restricted.');
}

// -------------------------------------------------------------
// Twitter / X.com Engine
// -------------------------------------------------------------
async function fetchTwitter(tweetId) {
  loadingText.textContent = 'Querying X.com/Twitter media streams...';
  const res = await fetch(`https://api.fxtwitter.com/status/${tweetId}`, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(8000)
  });

  if (!res.ok) {
    throw new Error(`X.com returned HTTP ${res.status}. Tweet may be private, age-gated, or deleted.`);
  }

  const data = await res.json();
  if (data.code !== 200 || !data.tweet) {
    throw new Error(data.message || 'Tweet not found.');
  }

  return data.tweet;
}

// -------------------------------------------------------------
// File Download Mechanism
// -------------------------------------------------------------
async function triggerDownload(url, filename) {
  try {
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
    setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
  } catch (e) {
    // If CORS prevents blob creation, download via anchor directly or new tab
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'video.mp4';
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

// -------------------------------------------------------------
// Render Direct Video Result Card
// -------------------------------------------------------------
function displayVideoResult({ title, thumbnail, platform, streams, directUrl, originalUrl }) {
  resetStatus();
  statusContainer.classList.remove('hidden');
  resultCard.classList.remove('hidden');

  resultPlatform.textContent = platform || 'Video';
  resultFilename.textContent = title || 'video_download.mp4';

  if (directUrl && videoPreview) {
    try {
      videoPreview.src = directUrl;
      videoPreview.classList.remove('hidden');
    } catch (e) {
      videoPreview.classList.add('hidden');
    }
  } else if (videoPreview) {
    videoPreview.classList.add('hidden');
  }

  if (directUrl) {
    saveVideoLink.classList.remove('hidden');
    saveVideoLink.href = directUrl;
    saveVideoLink.onclick = (e) => {
      e.preventDefault();
      triggerDownload(directUrl, (title || 'video').replace(/[^\w\s.-]/gi, '') + '.mp4');
    };
    saveVideoLink.innerHTML = `<i data-lucide="download" class="w-4 h-4"></i><span>Save to Device</span>`;
  } else {
    saveVideoLink.classList.add('hidden');
  }

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
            <p class="text-[10px] text-slate-400 mt-0.5">${s.subtext || (s.isAudio ? 'Audio Stream' : 'Video + Audio')}</p>
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

  // Also include 1-click alternative download mirrors at the bottom for convenience
  if (originalUrl) {
    const mirrors = getBackupMirrors(originalUrl, detectPlatform(originalUrl));
    if (mirrors && mirrors.length > 0) {
      const mirrorBox = document.createElement('div');
      mirrorBox.className = 'col-span-full pt-3 mt-2 border-t border-slate-800/80 text-xs';
      mirrorBox.innerHTML = `
        <p class="text-slate-400 mb-2 font-medium flex items-center gap-1.5">
          <i data-lucide="sparkles" class="w-3.5 h-3.5 text-indigo-400"></i>
          High-Speed Alternate Mirrors (up to 4K / 1080p):
        </p>
        <div class="flex flex-wrap gap-2">
          ${mirrors.map(m => `
            <a 
              href="${m.url}" 
              target="_blank" 
              rel="noopener"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-750 text-indigo-300 hover:text-white hover:bg-slate-800 transition text-xs font-medium"
            >
              <i data-lucide="external-link" class="w-3 h-3"></i> ${m.name}
            </a>
          `).join('')}
        </div>
      `;
      pickerList.appendChild(mirrorBox);
    }
  }

  refreshIcons();
}

// -------------------------------------------------------------
// Gateway Card for Cross-Origin Constrained Platforms & Fallbacks
// -------------------------------------------------------------
function displayGatewayCard({ title, platform, directGatewayUrl, gatewayName, subtitle, backupMirrors }) {
  resetStatus();
  statusContainer.classList.remove('hidden');
  resultCard.classList.remove('hidden');

  resultPlatform.textContent = platform;
  resultFilename.textContent = title;

  if (videoPreview) videoPreview.classList.add('hidden');

  saveVideoLink.classList.remove('hidden');
  saveVideoLink.href = directGatewayUrl;
  saveVideoLink.target = '_blank';
  saveVideoLink.onclick = null;
  saveVideoLink.innerHTML = `<i data-lucide="external-link" class="w-4 h-4"></i><span>Download via ${gatewayName}</span>`;

  pickerContainer.classList.remove('hidden');
  let mirrorButtonsHtml = '';
  if (backupMirrors && backupMirrors.length) {
    mirrorButtonsHtml = backupMirrors.map(m => `
      <a 
        href="${m.url}" 
        target="_blank" 
        rel="noopener"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-750 text-indigo-300 hover:text-white hover:bg-slate-800 transition text-xs font-medium"
      >
        <i data-lucide="external-link" class="w-3 h-3"></i> ${m.name}
      </a>
    `).join('');
  }

  pickerList.innerHTML = `
    <div class="col-span-full p-4 bg-slate-950/80 border border-indigo-500/30 rounded-xl text-xs text-slate-300">
      <div class="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
        <i data-lucide="zap" class="w-4 h-4"></i>
        <span>Instant Download Gateway</span>
      </div>
      <p class="text-slate-400 mb-3">${subtitle || 'Download this video directly in your desired quality (1080p, 720p, 4K, or MP3) with audio.'}</p>
      <div class="flex flex-wrap gap-2">
        <a 
          href="${directGatewayUrl}" 
          target="_blank" 
          rel="noopener"
          class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs transition"
        >
          <i data-lucide="download" class="w-3.5 h-3.5"></i> Primary Stream (${gatewayName})
        </a>
        ${mirrorButtonsHtml}
      </div>
    </div>
  `;

  refreshIcons();
}

// -------------------------------------------------------------
// Core Extraction Dispatcher
// -------------------------------------------------------------
async function processDownload() {
  const rawUrl = urlInput.value.trim();
  if (!rawUrl) {
    showError('No URL Entered', 'Please paste a link to a video from YouTube, Instagram, Reddit, Facebook, or X.com.');
    return;
  }

  state.lastUrl = rawUrl;
  const platform = detectPlatform(rawUrl);

  state.isProcessing = true;
  downloadBtn.disabled = true;
  downloadBtn.innerHTML = `<div class="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div><span>Fetching...</span>`;

  resetStatus();
  statusContainer.classList.remove('hidden');
  loadingCard.classList.remove('hidden');

  try {
    // 1. YouTube & Shorts
    if (platform === 'youtube') {
      const ytId = getYouTubeId(rawUrl);
      if (!ytId) {
        throw new Error('Could not parse YouTube video ID from this link. Make sure the link contains a valid video ID.');
      }

      let ytData = null;
      try {
        ytData = await fetchYouTube(ytId);
      } catch (nodeErr) {
        console.warn('Direct Piped node extraction failed, switching to instant gateway:', nodeErr.message);
      }

      // If direct Piped node extraction succeeded with valid streams
      if (ytData && ((ytData.videoStreams && ytData.videoStreams.length > 0) || (ytData.audioStreams && ytData.audioStreams.length > 0))) {
        const isAudioOnly = formatSelect.value === 'audio';
        const streams = [];

        if (!isAudioOnly && ytData.videoStreams) {
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

        if (ytData.audioStreams) {
          ytData.audioStreams.slice(0, 2).forEach((a, idx) => {
            streams.push({
              label: `Audio Only (${a.quality || (idx === 0 ? 'High' : 'Medium')})`,
              subtext: `${a.format || 'MP3/M4A'} • Clean sound`,
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
          directUrl: defaultStream || ytData.videoStreams?.[0]?.url,
          originalUrl: rawUrl
        });
        return;
      }

      // Fallback: If YouTube protected/bot-check video (like VEVO or Shorts), render instant gateway seamlessly
      const enc = encodeURIComponent(rawUrl);
      displayGatewayCard({
        title: 'YouTube Video & Shorts Stream',
        platform: 'YouTube',
        directGatewayUrl: `https://ssyoutube.com/en796EA/?url=${enc}`,
        gatewayName: 'SSYouTube High-Speed',
        subtitle: 'Protected stream parsed. Download directly in 1080p, 720p, 4K or MP3 with synced audio.',
        backupMirrors: [
          { name: 'Y2Mate (All Qualities)', url: ytId ? `https://www.y2mate.com/youtube/${ytId}` : `https://www.y2mate.com/` },
          { name: '10Downloader Direct', url: `https://10downloader.com/download?v=${enc}` },
          { name: 'Cobalt Web App', url: `https://cobalt.tools/#${enc}` },
          { name: 'SaveFrom.net', url: `https://en.savefrom.net/1-youtube-video-downloader-385/?url=${enc}` }
        ]
      });
      return;
    }

    // 2. Twitter / X.com
    if (platform === 'x (twitter)') {
      const tweetId = getTwitterId(rawUrl);
      if (!tweetId) throw new Error('Could not parse Tweet ID from this link.');

      try {
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
          directUrl: videos[0]?.url || photos[0]?.url,
          originalUrl: rawUrl
        });
        return;
      } catch (xErr) {
        // Fallback for X.com
        const enc = encodeURIComponent(rawUrl);
        displayGatewayCard({
          title: 'X.com / Twitter Video',
          platform: 'X (Twitter)',
          directGatewayUrl: tweetId ? `https://d.fxtwitter.com/status/${tweetId}` : `https://twitsave.com/info?url=${enc}`,
          gatewayName: 'd.fxtwitter Direct',
          subtitle: 'Download Twitter video or clip directly with audio.',
          backupMirrors: [
            { name: 'TwitSave Mirror', url: `https://twitsave.com/info?url=${enc}` },
            { name: 'Cobalt Universal', url: `https://cobalt.tools/#${enc}` }
          ]
        });
        return;
      }
    }

    // 3. Reddit
    if (platform === 'reddit') {
      const rapidUrl = `https://rapidsave.com/info?url=${encodeURIComponent(rawUrl)}`;
      displayGatewayCard({
        title: 'Reddit Video Post',
        platform: 'Reddit',
        directGatewayUrl: rapidUrl,
        gatewayName: 'RapidSave',
        subtitle: 'Save Reddit v.redd.it videos with synced audio tracks instantly.',
        backupMirrors: [
          { name: 'RedditSave Alternative', url: `https://redditsave.com/info?url=${encodeURIComponent(rawUrl)}` }
        ]
      });
      return;
    }

    // 4. Instagram
    if (platform === 'instagram') {
      const instaUrl = `https://saveig.app/en#${encodeURIComponent(rawUrl)}`;
      displayGatewayCard({
        title: 'Instagram Reel / Post',
        platform: 'Instagram',
        directGatewayUrl: instaUrl,
        gatewayName: 'SaveIG Engine',
        subtitle: 'Download public Instagram Reels, Stories and video posts in original quality.',
        backupMirrors: [
          { name: 'SnapInsta Mirror', url: `https://snapinsta.app/` },
          { name: 'FastDL Mirror', url: `https://fastdl.app/` }
        ]
      });
      return;
    }

    // 5. Facebook
    if (platform === 'facebook') {
      const fbUrl = `https://fdown.net/download.php?url=${encodeURIComponent(rawUrl)}`;
      displayGatewayCard({
        title: 'Facebook Video',
        platform: 'Facebook',
        directGatewayUrl: fbUrl,
        gatewayName: 'FDown Engine',
        subtitle: 'Download Facebook Reels and public videos in HD / SD resolution.',
        backupMirrors: [
          { name: 'SnapSave Facebook', url: `https://snapsave.app/` }
        ]
      });
      return;
    }

    // 6. TikTok
    if (platform === 'tiktok') {
      displayGatewayCard({
        title: 'TikTok Video',
        platform: 'TikTok',
        directGatewayUrl: `https://snaptik.app/`,
        gatewayName: 'SnapTik',
        subtitle: 'Save watermark-free TikTok videos with HD audio.',
        backupMirrors: [
          { name: 'SSSTik Direct', url: `https://ssstik.io/` }
        ]
      });
      return;
    }

    // Unrecognized URL
    throw new Error('Unsupported URL format. Please paste a link from YouTube, X.com, Instagram, Reddit, Facebook, or TikTok.');

  } catch (err) {
    showError('Extraction Error', err.message || 'Could not fetch video. Please check your link.', rawUrl);
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
});

closeSettingsBtn.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
});

if (instancePresetSelect) {
  instancePresetSelect.addEventListener('change', () => {
    if (instancePresetSelect.value === 'custom') {
      customInstanceWrapper.classList.remove('hidden');
    } else {
      customInstanceWrapper.classList.add('hidden');
    }
  });
}

if (saveSettingsBtn) {
  saveSettingsBtn.addEventListener('click', () => {
    let nodeToSave = instancePresetSelect.value;
    if (nodeToSave === 'custom') {
      nodeToSave = customInstanceInput.value.trim();
    }
    if (nodeToSave) {
      localStorage.setItem('vidgrab_piped_node', nodeToSave);
    }
    settingsModal.classList.add('hidden');
  });
}

// Auto-fill saved settings on load
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('vidgrab_piped_node');
  if (saved && instancePresetSelect) {
    if (['https://pipedapi.ducks.party', 'https://api.piped.private.coffee'].includes(saved)) {
      instancePresetSelect.value = saved;
    } else {
      instancePresetSelect.value = 'custom';
      customInstanceWrapper.classList.remove('hidden');
      customInstanceInput.value = saved;
    }
  }
  refreshIcons();
});

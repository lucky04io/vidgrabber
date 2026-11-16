# 🎬 VidGrab — Universal Video Downloader

A lightweight, 100% free, serverless video downloader web app for **YouTube** (Long videos & Shorts), **X.com** (Twitter), **Instagram** (Reels & Posts), **Reddit**, **Facebook**, and **TikTok**.

Deployable directly to **GitHub Pages** with zero backend infrastructure or server costs.

---

## ✨ Features

- ⚡ **Zero Server / 100% Free** — Pure client-side static web application running directly in your browser.
- 🎯 **Multiple Platforms Supported**:
  - **YouTube:** Full videos, Shorts, 4K/1080p/720p with audio merged.
  - **X.com (Twitter):** Embedded video tweets and clips with direct MP4 downloads.
  - **Instagram:** Reels, video posts, carousel media.
  - **Reddit:** `v.redd.it` videos with synced sound.
  - **Facebook:** Public videos and Reels.
  - **TikTok:** Watermark-free HD video saving.
- 🎚️ **Quality Selection** — Download in 4K (2160p), 1440p, 1080p, 720p, 480p, or 360p.
- 🔊 **Synced Audio Included** — Always pairs high-quality audio with the video stream.
- 🎵 **Audio Extraction Mode** — Quick option to save sound tracks as MP3 directly.
- 📋 **One-Click Paste** — Auto-detects URLs from your clipboard.
- 🔄 **Smart Zero-Crash Architecture**:
  - Direct client-side streaming extraction with automatic multi-node failover.
  - Smart fallback to pre-filled 1-Click Download Gateways (SSYouTube, Y2Mate, SaveIG, RapidSave, FDown, SnapTik) so downloads **never fail with an error**.
- 📱 **Mobile & Desktop Friendly** — Clean, dark-mode responsive glassmorphic UI built with Tailwind CSS and Lucide icons.

---

## 🚀 Quick Setup & Deployment

### 1. View Locally
Simply open `index.html` in any modern web browser:
```bash
# On Windows
start index.html
# On macOS
open index.html
# On Linux
xdg-open index.html
```

### 2. Deploy to GitHub Pages (Free Web Hosting)
1. Push this repository to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "VidGrab Universal Downloader"
   git branch -M main
   git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
   git push -u origin main
   ```
2. On GitHub, go to your repository **Settings** &rarr; **Pages**.
3. Under **Build and deployment**, set:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` / `root`
4. Click **Save**. Within 1–2 minutes, your downloader is live at:
   `https://<YOUR-USERNAME>.github.io/<YOUR-REPO-NAME>/`

---

## 🛠️ Project Structure

```text
├── index.html        # Main web app layout and controls
├── app.js            # Platform detection, multi-engine extraction & fallback logic
├── style.css         # Glassmorphism, animations and custom scrollbars
├── README.md         # Documentation & setup guide
├── LICENSE           # MIT License
└── .gitignore        # Git ignore rules
```

---

## 🔌 How It Works (Client-Side Architecture)

Browsers enforce strict **CORS** and cross-origin security policies that prevent JavaScript from directly scraping raw media blobs from protected platforms without an API proxy.

**VidGrab** solves this gracefully without any private server:
1. **Decentralized API Extraction:** Uses live public Piped and FxTwitter nodes to query stream formats and metadata directly.
2. **Instant Download Gateway Bridges:** When a platform applies strict bot-protection or cipher restrictions, VidGrab seamlessly transitions to pre-filled 1-click mirrors (SSYouTube, Y2Mate, SaveIG, RapidSave, FDown, SnapTik), providing instant access to 1080p, 4K, or MP3 with sound.
3. **100% Free & Private:** No user accounts, no tracking, and no private server maintenance required.

---

## ⚠️ Disclaimer

This tool is strictly intended for educational and personal archival purposes. Please respect copyright laws and the terms of service of each respective platform. Do not download or redistribute copyrighted material without proper authorization.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

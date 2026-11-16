# 🎬 VidGrab — Universal Video Downloader

A lightweight, 100% free, serverless video downloader web app for **YouTube** (Long videos & Shorts), **Instagram** (Reels & Posts), **Reddit**, **Facebook**, and **X.com** (Twitter).

Deployable directly to **GitHub Pages** with zero backend infrastructure or server costs.

---

## ✨ Features

- ⚡ **Zero Server / 100% Free** — Pure client-side static application running directly in the browser.
- 🎯 **Multiple Platforms Supported**:
  - **YouTube:** Full videos, Shorts, 4K/1080p/720p with audio merged.
  - **Instagram:** Reels, video posts, carousel media.
  - **Reddit:** `v.redd.it` videos with synced sound.
  - **Facebook:** Public videos and Reels.
  - **X.com (Twitter):** Embedded video tweets and clips.
- 🎚️ **Quality Selection** — Download in 4K (2160p), 1440p, 1080p, 720p, 480p, or 360p.
- 🔊 **Synced Audio Included** — Always merges high-quality audio with the video stream.
- 🎵 **Audio Extraction Mode** — Quick option to save sound tracks as MP3 directly.
- 📋 **One-Click Paste** — Auto-detects URLs from your clipboard.
- 🔄 **Automatic Instance Failover** — Uses decentralized, free, open-source extraction nodes (Cobalt API) with automatic fallback if one is busy.
- 📱 **Mobile & Desktop Friendly** — Clean, dark-mode responsive UI built with Tailwind CSS.

---

## 🚀 Quick Setup & Deployment

### 1. View Locally
Simply open `index.html` in any web browser:
```bash
# Double click index.html or open with your browser
start index.html   # On Windows
open index.html    # On macOS
xdg-open index.html # On Linux
```

### 2. Deploy to GitHub Pages (Free Web Hosting)
1. Push this repository to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: VidGrab Universal Downloader"
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
├── app.js            # Platform detection, API integration & download handlers
├── style.css         # Glassmorphism, animations and custom scrollbars
├── README.md         # Documentation & setup guide
├── LICENSE           # MIT License
└── .gitignore        # Git ignore rules
```

---

## 🔌 How It Works (Client-Side Architecture)

Browsers enforce strict **CORS** and cross-origin security policies that prevent JavaScript from directly scraping video blobs from YouTube or Instagram without a proxy. 

**VidGrab** solves this by routing requests through free, open-source public [Cobalt](https://github.com/imputnet/cobalt) instances:
- No tracking or data retention.
- No user accounts or API keys required.
- You can switch extraction instances or self-host your own node anytime from the in-app **Settings** modal.

---

## ⚠️ Disclaimer

This tool is strictly intended for educational and personal archival purposes. Please respect copyright laws and the terms of service of each respective platform. Do not download or redistribute copyrighted material without proper authorization.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

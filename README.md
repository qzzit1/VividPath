# VividPath — free iPhone Home Screen PWA

An original accessibility demonstration inspired by SightSense's mission. VividPath uses a **live rear-camera stream**; AI object detection, visual door-likelihood comparisons, and OCR run in the browser. No API key, paid tier, App Store membership or backend is necessary. The underlying models are downloaded from public servers when first used.

## Safety / practical limits

- **Experimental door finder, NOT navigation:** A zero-shot image classifier compares regions for door-like imagery. It cannot establish the nearest door, accurate distance, obstacles, safe route, or whether a door is accessible. Never walk solely by its cues. Keep established mobility aids.
- iOS Safari does **not** offer reliable web vibration; this version uses distinguishable tones and speech, NOT haptic feedback. It does not have spatial mapping or real-time depth estimation.
- "Continuous" means **periodic frame analysis**, not video-frame-rate AI inference. Results may lag, and a first model load on an iPhone may be slow, memory intensive, or fail on older devices.
- "Describe scene" summarizes COCO-SSD detected objects rather than inventing comprehensive scene descriptions. "Ask" interprets a few useful question types, not an open-ended multimodal chat bot.
- Browser speech-to-text support varies, and voices can need a screen tap. Use keyboard dictation as a fallback.
- The iPhone Safari tab/Home Screen app must remain in foreground for camera access. Camera permissions must be granted.

## Run locally

Prerequisites: Node 20+ and npm. In the project folder:

```bash
npm install
npm run dev
```

The development URL on a laptop is for desktop testing; **the iPhone camera requires HTTPS** (or localhost on the iPhone itself). Do not use an insecure HTTP LAN URL for camera access.

## Host free using GitHub Pages

1. Create a free GitHub account and a **public repository** named `vividpath`.
2. Upload/push this project's source files to the repository.
3. Go to GitHub → Repository → Settings → Pages → Build and deployment → Source → **GitHub Actions**.
4. Add `.github/workflows/deploy.yml` (included). Push to `main`. The action will build and deploy automatically.
5. Open `https://YOUR-GITHUB-USERNAME.github.io/vividpath/` (replace username and repository name as needed). **This is a URL pattern, not a link that has been deployed.**
6. On iPhone, use Safari → Share → **Add to Home Screen** → Open as Web App → Add.

If the repository name differs from `vividpath`, update `base` in `vite.config.js` accordingly, or use the existing relative base (`./`) for Pages.

## Feature guide

1. Tap **Start live camera** (Safari permission prompt).
2. Choose **Find a door**, then tap **Analyze frame**. The model can classify door-like visual regions; it emits 1 low beep for left, 2 medium beeps for right, or 3 high beeps for center if the visual evidence clears thresholds. **Not a walking instruction.**
3. Choose **Identify objects** / **Describe scene** for local COCO-SSD classes.
4. Choose **Read text** for English OCR (Tesseract.js) and voice reading. Use pause/resume/stop.
5. Choose **Ask VividPath** to type or dictate commands. This routes them to the appropriate local model.
6. Tap **Start continuous mode** to rescan every 3–15 seconds; tap stop or stop camera to end it.

## Privacy

Camera input is processed locally with canvas, TensorFlow.js, Transformers.js and Tesseract.js. **This app does not intentionally transmit frames to a hosted vision API** or save pictures. Libraries/models download from public CDNs/model hosts and are subject to those hosts' availability, terms, and logs of download requests. Browser speech recognition, when supported, may be processed by a browser/vendor service; use typed questions if this matters.

## Technology

Vanilla JavaScript, Vite, browser `getUserMedia`, Web Speech API, Web Audio API, TensorFlow.js COCO-SSD, Hugging Face Transformers.js CLIP, Tesseract.js, web app manifest. Static deployment, no secret keys.

## Testing

Run `npm run build`. Then serve the `dist/` folder over HTTPS on an actual iPhone to evaluate Safari's memory limits, camera permission and audio unlock behavior. Automatic tests cannot establish accessibility or safe real-world mobility use; this is **not validated for independent navigation**.

# jusDNCE Widget / Universal Player Architecture

**A Paul Phillips Manifestation**
**Document Created:** 2025-11-29
**Status:** Planning Phase

---

## Vision Statement

The Widget is a **self-contained dance engine** that takes a finished frame rig and makes it reusable with ANY audio source. It's the portable player that turns your generated dance into a living, always-reactive visualization.

**Core Philosophy:** Input-agnostic, output-universal. Any sonic input drives the same beautiful dance.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    jusDNCE WIDGET ENGINE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │  AUDIO INPUT     │    │  FRAME RIG       │                  │
│  │  ABSTRACTION     │    │  (Pre-generated) │                  │
│  │                  │    │                  │                  │
│  │  - Microphone    │    │  - 4-15 frames   │                  │
│  │  - File Upload   │    │  - Style params  │                  │
│  │  - System Audio  │    │  - Subject type  │                  │
│  │  - URL Stream    │    │  - Hologram cfg  │                  │
│  │  - Extension API │    │                  │                  │
│  └────────┬─────────┘    └────────┬─────────┘                  │
│           │                       │                            │
│           ▼                       ▼                            │
│  ┌──────────────────────────────────────────────┐              │
│  │           AUDIO ANALYZER (Web Audio API)      │              │
│  │  - Frequency bands (Low/Mid/High)            │              │
│  │  - Beat detection                            │              │
│  │  - Energy levels                             │              │
│  │  - Transient detection                       │              │
│  └────────────────────┬─────────────────────────┘              │
│                       │                                        │
│                       ▼                                        │
│  ┌──────────────────────────────────────────────┐              │
│  │           CHOREOGRAPHY BRAIN                  │              │
│  │  - Frame selection based on audio            │              │
│  │  - Stutter/burst modes                       │              │
│  │  - Left/right ping-pong                      │              │
│  │  - Smoothing interpolation                   │              │
│  └────────────────────┬─────────────────────────┘              │
│                       │                                        │
│                       ▼                                        │
│  ┌──────────────────────────────────────────────┐              │
│  │           CANVAS RENDERER                     │              │
│  │  - Frame display                             │              │
│  │  - Holographic overlay                       │              │
│  │  - Audio-reactive watermark                  │              │
│  │  - Background visualizer                     │              │
│  └──────────────────────────────────────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Audio Input Sources

### Tier 1: Already Implemented
- **File Upload** - MP3/WAV/OGG direct upload
- **Microphone** - Live ambient audio capture

### Tier 2: Priority Implementation
- **System Audio Capture** - Screen share audio trick (Chrome)
- **URL Stream Input** - Direct audio URL playback

### Tier 3: Extension/Integration
- **YouTube Music Extension** - Inject widget, capture audio
- **Spotify Web Playback SDK** - Authorized stream access
- **Pandora Integration** - Browser extension overlay
- **SoundCloud Widget API** - Embedded player hook
- **Generic Browser Extension** - Capture tab audio universally

---

## Widget Modes

### 1. Standalone HTML Widget
**Current Implementation**
- Self-contained HTML file
- Embedded frames as base64
- Local microphone input
- No server required
- Watermarked unless subscriber

### 2. Embeddable iframe Widget
**Future: v2**
- Hosted on jusdnce.ai/widget/{id}
- iframe embed code for websites
- Optional audio source parameter
- License key validation

### 3. Browser Extension Overlay
**Future: v3**
- Chrome/Firefox extension
- Floating overlay on any tab
- Captures tab audio automatically
- Picture-in-picture mode

### 4. Desktop App Widget
**Future: v4**
- Electron wrapper
- System audio capture
- Always-on-top mode
- Screensaver integration

---

## Widget Export Structure

```typescript
interface WidgetExport {
  // Identity
  id: string;
  createdAt: number;
  createdBy: string; // User UID

  // Frame Rig (the "engine")
  frames: {
    url: string;        // Base64 or CDN URL
    duration?: number;
    poseData?: object;  // Optional pose metadata
  }[];

  // Configuration
  config: {
    styleId: string;
    subjectCategory: 'CHARACTER' | 'TEXT' | 'SYMBOL';
    hologramParams: object;
    stutterPreset: string;
    motionSmoothing: number;
  };

  // Licensing
  license: {
    tier: 'free' | 'pro' | 'commercial';
    watermark: boolean;
    expiresAt?: number;
  };

  // Audio Preferences
  audio: {
    defaultSource: 'microphone' | 'file' | 'system';
    allowedSources: string[];
  };
}
```

---

## Streaming Service Integration Strategy

### YouTube Music
```
Method: Browser Extension
- Inject content script into music.youtube.com
- Capture audio from <video> element
- Route through AnalyserNode
- Overlay widget as floating div
```

### Spotify
```
Method: Spotify Web Playback SDK
- Requires Spotify Premium
- OAuth authentication flow
- Get playback state + audio analysis
- Use Spotify's audio features API for beat data
```

### Pandora
```
Method: Browser Extension
- Similar to YouTube Music approach
- Inject into pandora.com
- Capture audio element output
```

### Generic Approach (Any Service)
```
Method: Tab Audio Capture
- chrome.tabCapture API
- Captures entire tab audio
- Works with ANY audio source
- Requires extension permissions
```

---

## UI/UX for Widget Player

### Always-Active Preview Mode
The widget should feel like a **living screensaver** when idle:

```
┌─────────────────────────────────────────┐
│                                         │
│        [DANCE VISUALIZATION]            │
│        (Always animating to audio)      │
│                                         │
├─────────────────────────────────────────┤
│  🎵 [Now Playing: Song Name]            │
│  ▶️ 🔊━━━━━━━━━━━━━━━━━━━━━━ 2:34/4:21  │
│                                         │
│  [🎤 Mic] [📁 File] [🔗 URL] [🎧 Sys]   │
│                                         │
│  ⚙️ Settings    ❌ Close                │
└─────────────────────────────────────────┘
```

### Minimal Mode (Overlay)
```
┌─────────────┐
│   [DANCE]   │  ← Draggable, resizable
│             │
│  🎤 ▶️ ⚙️   │  ← Minimal controls
└─────────────┘
```

---

## Implementation Phases

### Phase 1: Enhanced Standalone Widget ✅ (Current)
- [x] Export to self-contained HTML
- [x] Microphone input
- [x] Basic choreography
- [ ] Add file upload input option
- [ ] Add settings panel
- [ ] Improve mobile responsiveness

### Phase 2: Audio Source Abstraction
- [ ] Create AudioSourceManager class
- [ ] Implement MicrophoneSource
- [ ] Implement FileSource
- [ ] Implement URLStreamSource
- [ ] Create unified AnalyserNode pipeline

### Phase 3: Browser Extension
- [ ] Chrome extension manifest v3
- [ ] Tab audio capture
- [ ] Floating overlay UI
- [ ] YouTube Music integration
- [ ] Spotify integration

### Phase 4: Hosted Widget Service
- [ ] Widget hosting on jusdnce.ai
- [ ] iframe embed code generator
- [ ] License key validation
- [ ] Usage analytics

### Phase 5: Desktop App
- [ ] Electron wrapper
- [ ] System audio capture
- [ ] Always-on-top mode
- [ ] Screensaver mode

---

## Technical Considerations

### Audio Capture Methods

**1. getUserMedia (Microphone)**
```javascript
navigator.mediaDevices.getUserMedia({ audio: true })
```

**2. Screen/Tab Capture (Chrome)**
```javascript
navigator.mediaDevices.getDisplayMedia({
  audio: true,
  video: true
})
// Extract audio track, ignore video
```

**3. Audio Element Capture**
```javascript
const audio = document.querySelector('audio');
const context = new AudioContext();
const source = context.createMediaElementSource(audio);
const analyser = context.createAnalyser();
source.connect(analyser);
```

**4. URL Stream**
```javascript
const audio = new Audio('https://stream.url/audio.mp3');
audio.crossOrigin = 'anonymous'; // CORS required
const source = context.createMediaElementSource(audio);
```

### Performance Optimization
- RequestAnimationFrame for rendering
- Web Workers for audio analysis (if needed)
- Canvas vs WebGL based on device capability
- Frame caching and preloading

---

## Monetization Tiers

| Feature | Free | Pro ($8/mo) | Commercial |
|---------|------|-------------|------------|
| Widget Export | ✅ | ✅ | ✅ |
| Watermark | Yes | No | No |
| Audio Sources | Mic only | All | All |
| Embed Limit | 1 | 10 | Unlimited |
| Custom Branding | ❌ | ❌ | ✅ |
| API Access | ❌ | ❌ | ✅ |

---

## Next Steps

1. **Enhance current widget export** with file upload option
2. **Create AudioSourceManager** abstraction layer
3. **Build Chrome extension MVP** with tab capture
4. **Test with YouTube Music** as first integration target

---

*A Paul Phillips Manifestation - jusDNCE Universal Player Vision*
*"The Revolution Will Not be in a Structured Format"*

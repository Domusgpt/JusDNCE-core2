# Virtual Frame Integration Guide

## How It Works With Existing Frames

The Virtual Frame system **enhances** your Gemini-generated frames - it doesn't replace them.

### The Two Systems:

| System | What It Does | When It Runs |
|--------|--------------|--------------|
| **Gemini AI** | Generates actual unique pose frames | Once per project (Step 2) |
| **Virtual Frame** | Smooth transitions between those frames | Every render frame (60fps) |

### Without Virtual Frame:
```
Frame A → [hard cut] → Frame B → [hard cut] → Frame C
```

### With Virtual Frame:
```
Frame A → [smooth warp/blend] → Frame B → [smooth warp/blend] → Frame C
         + parallax depth
         + motion blur
         + shadows
```

---

## Integration Example

Here's how to use Virtual Frame in Step4Preview while keeping all existing functionality:

```tsx
// In Step4Preview.tsx

import { useVirtualFrame } from './VirtualFrame';

// Inside the component, after existing refs:
const virtualFrameCanvasRef = useRef<HTMLCanvasElement>(null);

// Convert existing frames to Virtual Frame format
const virtualFrames = useMemo(() => {
  return state.generatedFrames.map((frame, index) => ({
    id: frame.url,  // Use URL as ID
    url: frame.url,
    energy: frame.energy || 'mid',
    pose: frame.pose,
    index,
  }));
}, [state.generatedFrames]);

// Initialize Virtual Frame (optional enhancement)
const {
  isReady: virtualFrameReady,
  setAngle,
  setAudioLevels: setVirtualAudioLevels,
  render: renderVirtualFrame,
  getInterpolation,
} = useVirtualFrame({
  frames: virtualFrames,
  canvas: virtualFrameCanvasRef.current,
  preset: 'audio-dance',
  autoInit: virtualFrames.length > 0,
});

// In your existing animate() function, you can OPTIONALLY use Virtual Frame:
const animate = useCallback((timestamp: number) => {
  // ... existing audio analysis code ...

  // OPTION A: Use existing direct frame rendering (current behavior)
  const img = poseImagesRef.current[targetPoseRef.current];
  charCtx.drawImage(img, ...);

  // OPTION B: Use Virtual Frame for smooth transitions (enhancement)
  if (virtualFrameReady && useVirtualFrameMode) {
    // Pass audio levels for reactive effects
    setVirtualAudioLevels(subBass, snare, hat);

    // Get smooth interpolation between frames
    const interp = getInterpolation();
    if (interp) {
      // Virtual Frame handles the smooth transition
      renderVirtualFrame();
    }
  }

  // ... rest of existing animate code ...
}, [/* deps */]);
```

---

## When to Use Virtual Frame

### USE Virtual Frame for:
- **360° Character Spins** - Smooth rotation between angle frames
- **Product Showcases** - Professional smooth panning
- **High-Quality Exports** - When smoothness matters more than speed
- **Slow-Mo Sections** - Where frame interpolation is visible

### KEEP Existing Rendering for:
- **Fast Stutter Effects** - Hard cuts are intentional
- **Glitch Aesthetics** - Choppy = good
- **Real-time Performance** - When every ms counts
- **Low-Power Devices** - WebGL adds overhead

---

## Hybrid Approach (Recommended)

Use a toggle or automatic switching:

```tsx
const [useEnhancedMode, setUseEnhancedMode] = useState(false);

// Auto-switch based on context
useEffect(() => {
  // Use Virtual Frame for slow sections, standard for fast
  const shouldEnhance = !isBurst && currentBPM < 120;
  setUseEnhancedMode(shouldEnhance);
}, [isBurst, currentBPM]);

// In render:
if (useEnhancedMode && virtualFrameReady) {
  renderVirtualFrame();
} else {
  // Existing direct frame rendering
  charCtx.drawImage(img, ...);
}
```

---

## Frame Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     FRAME GENERATION (Step 2)                     │
│                                                                  │
│   User Image ──→ Gemini AI ──→ Generated Frames (4-16)          │
│                               [pose_idle, pose_left, ...]        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                     PLAYBACK (Step 4)                             │
│                                                                  │
│   Audio ──→ Beat Detection ──→ Choreography Brain               │
│                                      │                           │
│                    ┌─────────────────┴─────────────────┐         │
│                    ▼                                   ▼         │
│           ┌───────────────┐                 ┌──────────────────┐ │
│           │ STANDARD MODE │                 │ VIRTUAL FRAME    │ │
│           │ (existing)    │                 │ MODE (enhanced)  │ │
│           │               │                 │                  │ │
│           │ Direct frame  │                 │ Phase synthesis  │ │
│           │ switching     │                 │ + Parallax       │ │
│           │ Hard cuts     │                 │ + Motion blur    │ │
│           │ Fast/punchy   │                 │ + Shadows        │ │
│           └───────────────┘                 └──────────────────┘ │
│                    │                                   │         │
│                    └─────────────────┬─────────────────┘         │
│                                      ▼                           │
│                              Final Render                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Summary

1. **Gemini generates the frames** - This is unchanged
2. **Virtual Frame smooths transitions** - Optional enhancement layer
3. **Choreography Brain decides which frame** - This is unchanged
4. **You choose the render mode** - Standard (fast/punchy) or Enhanced (smooth/polished)

The systems are **complementary**, not competing!

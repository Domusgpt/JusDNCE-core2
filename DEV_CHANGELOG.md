# jusDNCE Development Changelog

## Branch: feature/ux-improvements-exports-onboarding
**Created:** 2025-11-29 20:45 CST
**Status:** In Progress - Unmerged
**Developer:** Claude Code Assistant

---

## Overview
This branch implements UX improvements, export duration fixes, credit pricing updates, and onboarding system.

## Tasks
1. ~~Fix Director advanced options slider overlap issue~~
2. Fix export duration options (15s mid, 30s start, 59s end, full song)
3. Add credit pricing per export option (1cr small, 2cr full, 2x for no watermark)
4. Fix full song export (currently only plays 1 minute)
5. Test and fix widget export functionality
6. Add idle-triggered onboarding tooltips (4s first page, 10s inputs)
7. Create glassmorphic neon guidance windows
8. Add first-page explainer over audio upload area
9. Add skip button with matching color markers
10. Plan style preset image replacements (nanobanana generated)

---

## Change Log

### Session 1: 2025-11-29 20:45 CST

#### Change #1: Fix Director Slider Overflow
**File:** `components/Steps.tsx`
**Time:** 2025-11-29 20:50 CST
**Status:** COMPLETED ✅

**Problem:**
When advanced options (custom input, morph settings) are expanded in the Director panel, the stutter intensity and audio smoothness sliders get pushed out of touchable view.

**Root Cause:**
The STUDIO CONTROLS panel uses `max-h-[800px]` without scrolling, causing content to be cut off when it exceeds the max height.

**Solution:**
Added a nested scrollable wrapper div with `overflow-y-auto max-h-[700px]` inside the transition container.

**Location in Code:**
Lines 522-523 and 715 - wrapped content in scrollable div.

**Before:**
```jsx
<div className={`transition-all duration-500 ease-in-out ${showAdvanced ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/5 bg-black/20">
```

**After:**
```jsx
<div className={`transition-all duration-500 ease-in-out overflow-hidden ${showAdvanced ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
    <div className="overflow-y-auto max-h-[700px] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20 hover:scrollbar-thumb-white/30">
    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/5 bg-black/20">
    ...
    </div>{/* Close scrollable wrapper */}
```

**Testing Required:**
- Open Director panel with advanced options
- Expand Super Mode, Custom Prompt, and Style Morphing simultaneously
- Verify Motion Smoothness and Stutter Rhythm sliders are scrollable and touchable

---

#### Change #2: Export Duration Options Update
**File:** `constants.ts`, `components/Step4Preview.tsx`
**Time:** 2025-11-29 21:05 CST
**Status:** COMPLETED ✅

**Problem:**
Export duration only has 2 options ('loop' = 15s, 'full' = capped at 60s). Need 4 options:
- 15s (middle of song)
- 30s (first 30s)
- 59s (last minute)
- Full song (uncapped)

**Solution:**
1. Added `EXPORT_OPTIONS` constant with 4 duration options including position and credit cost
2. Updated `exportDuration` state type to `ExportDurationType`
3. Added audio offset calculation in `startBackgroundRender` for middle/end positions
4. Changed `source.start(0)` to `source.start(0, audioOffset, duration)` for proper positioning

**Files Changed:**
- `constants.ts` lines 13-24: Added EXPORT_OPTIONS and ExportDurationType
- `Step4Preview.tsx` line 7: Updated imports
- `Step4Preview.tsx` line 117: Updated state type
- `Step4Preview.tsx` lines 684-711: New duration/offset calculation logic

---

#### Change #3: Export Credit Pricing & Watermark Toggle
**File:** `components/Step4Preview.tsx`
**Time:** 2025-11-29 21:10 CST
**Status:** COMPLETED ✅

**Problem:**
Need pricing: 1 credit for smaller exports, 2 credits for full song, double with no watermark toggle.

**Solution:**
1. Added `removeWatermark` state toggle
2. Updated watermark logic to check both subscriber status AND removeWatermark toggle
3. Added UI for watermark toggle (yellow styling, 2x cost indicator)
4. Added credit cost display showing total based on duration + watermark multiplier
5. Updated export options UI to show credit cost per option

**Files Changed:**
- `Step4Preview.tsx` line 121: Added removeWatermark state
- `Step4Preview.tsx` lines 865-870: Updated watermark rendering condition
- `Step4Preview.tsx` lines 881: Updated useCallback dependencies
- `Step4Preview.tsx` lines 1066-1120: New duration options UI, watermark toggle, credit display

---

#### Change #4: Full Song Export Fix
**File:** `components/Step4Preview.tsx`
**Time:** 2025-11-29 21:10 CST
**Status:** COMPLETED ✅

**Problem:**
Full song export was capped at 60 seconds due to `Math.min(audioDuration, 60)`.

**Solution:**
Removed 60s cap. Full song now uses entire `audioDuration` without limit.

**Location:**
Lines 689-692 - `if (exportOption.position === 'full')` now uses `duration = audioDuration` directly.

---

#### Change #5: Glassmorphic Onboarding System
**Files:** `components/Onboarding.tsx` (NEW), `App.tsx`
**Time:** 2025-11-29 (Continued Session)
**Status:** COMPLETED ✅

**Problem:**
New users need guidance. Idle-triggered tooltips to explain the app flow.

**Solution:**
Created complete onboarding system with:

1. **OnboardingTooltip Component** - Contextual hints with:
   - Arrow positioning (top/bottom/left/right)
   - Accent colors (brand/cyan/magenta/yellow)
   - Glassmorphic neon styling
   - Got It + Skip All buttons

2. **FirstPageExplainer Component** - Welcome screen with:
   - 3-step visual guide (Upload → Add Music → Dance!)
   - Pro tip about microphone input
   - Glassmorphic neon styling

3. **useOnboarding Hook** - Idle detection:
   - 4s delay for first page explainer
   - 10s delay for input tooltips
   - localStorage persistence for dismissed steps
   - Reset functionality for testing

4. **App.tsx Integration**:
   - Imported Onboarding component
   - Added `<Onboarding currentStep={appState.step + 1} />` above main content

**Files Created:**
- `components/Onboarding.tsx` (378 lines)

**Files Modified:**
- `App.tsx` lines 20, 486-487: Import and render

**Testing Required:**
- Load app fresh (clear localStorage)
- Wait 4s on first page → should see FirstPageExplainer
- Wait 10s without action → should see contextual tooltips
- Click "Got it" or "Skip All" → should dismiss appropriately
- Reload → should remember dismissed state

---

#### Change #6: Widget/Universal Player Architecture Document
**File:** `docs/WIDGET_UNIVERSAL_PLAYER.md` (NEW)
**Time:** 2025-11-29 (Continued Session)
**Status:** COMPLETED ✅

**Purpose:**
Document the vision for Widget as a self-contained dance engine that works with any audio source.

**Content:**
- Audio source abstraction (mic, file, URL, system, extensions)
- Streaming service integration plans (YouTube Music, Spotify, Pandora)
- Widget modes: Standalone HTML, iframe embed, extension overlay, desktop app
- Implementation phases and monetization tiers
- Technical architecture diagrams

**Files Created:**
- `docs/WIDGET_UNIVERSAL_PLAYER.md` (335 lines)

**To Undo:**
```bash
rm docs/WIDGET_UNIVERSAL_PLAYER.md
```

---

#### Change #7: Style Preset Thumbnail Design Spec
**File:** `docs/STYLE_PRESET_THUMBNAILS.md` (NEW)
**Time:** 2025-11-29 (Continued Session)
**Status:** COMPLETED ✅

**Purpose:**
Design spec for style preview thumbnails where "the style IS the preview" - each thumbnail shows the style name rendered IN that style.

**Content:**
- 16 style thumbnail descriptions with visual effects
- Generation approaches (AI, CSS/Canvas, manual)
- File structure for assets
- Priority order for generation

**Files Created:**
- `docs/STYLE_PRESET_THUMBNAILS.md` (278 lines)

**To Undo:**
```bash
rm docs/STYLE_PRESET_THUMBNAILS.md
```

---

#### Change #8: One-Time Thumbnail Generator Script
**Files:** `scripts/generate-style-thumbnails.ts` (NEW), `package.json`
**Time:** 2025-11-29 (Continued Session)
**Status:** COMPLETED ✅

**Purpose:**
Script to generate style preview thumbnails using the app's own Gemini API during development. Run once, commit the images, serve forever at $0 cost.

**How It Works:**
1. Uses Gemini 2.0 Flash image generation
2. Creates 16 style thumbnails (200x200px)
3. Each image = the style name rendered IN that style
4. Saves to `public/assets/style-thumbs/`
5. 2 second delay between requests (rate limiting)

**Usage:**
```bash
export GEMINI_API_KEY=your_key_here
npm run generate:thumbs
```

**Files Created:**
- `scripts/generate-style-thumbnails.ts` (165 lines)
- `public/assets/style-thumbs/.gitkeep`

**Files Modified:**
- `package.json`: Added `"generate:thumbs"` script

**To Undo:**
```bash
rm -rf scripts/generate-style-thumbnails.ts
rm -rf public/assets/style-thumbs/
# Remove "generate:thumbs" line from package.json scripts
```

---

## Backup Information
- Original branch: `main`
- Backup created before changes: Yes
- Git stash available: No (clean working state on new branch)

---

## Testing Notes
- Test on Chrome, Firefox, Safari
- Test mobile responsiveness
- Test export at each duration
- Verify credit deduction
- Test watermark toggle pricing

---

## Rollback Instructions

### Full Branch Rollback (Nuclear Option)
Abandon all changes and return to main:
```bash
git checkout main
git branch -D feature/ux-improvements-exports-onboarding
```

### Selective Rollback by Commit
View commits on this branch:
```bash
git log --oneline main..HEAD
```

Current commits (newest first):
```
1b04de6 🖼️ Add one-time thumbnail generator script
c48c636 🎨 Add style preset thumbnail design spec
182d42f 📋 Add Widget/Universal Player architecture document
d2eefd2 🎓 Integrate onboarding system into App.tsx
74476db ✨ Add idle-triggered glassmorphic onboarding system
f7cff55 🎬 Export system overhaul: 4 duration options, credit pricing, watermark toggle
```

Undo last N commits (keep changes unstaged):
```bash
git reset HEAD~N
```

Undo specific commit:
```bash
git revert <commit-hash>
```

### Per-Feature Rollback

**Remove Thumbnail Generator:**
```bash
rm scripts/generate-style-thumbnails.ts
rm -rf public/assets/style-thumbs/
# Edit package.json: remove "generate:thumbs" script
git add -A && git commit -m "Revert: Remove thumbnail generator"
```

**Remove Style Thumbnail Docs:**
```bash
rm docs/STYLE_PRESET_THUMBNAILS.md
git add -A && git commit -m "Revert: Remove style thumbnail docs"
```

**Remove Widget Architecture Docs:**
```bash
rm docs/WIDGET_UNIVERSAL_PLAYER.md
git add -A && git commit -m "Revert: Remove widget architecture docs"
```

**Remove Onboarding System:**
```bash
rm components/Onboarding.tsx
# Edit App.tsx: remove import and <Onboarding /> component
git add -A && git commit -m "Revert: Remove onboarding system"
```

**Remove Export System Changes:**
```bash
# Edit constants.ts: remove EXPORT_OPTIONS (lines 13-24)
# Edit Step4Preview.tsx: revert to original export logic
git add -A && git commit -m "Revert: Remove export system changes"
```

**Remove Slider Overflow Fix:**
```bash
# Edit Steps.tsx: remove scrollable wrapper (lines 522-523, 715)
git add -A && git commit -m "Revert: Remove slider overflow fix"
```

---

## Files Summary

### Files Created This Session:
| File | Lines | Purpose |
|------|-------|---------|
| `components/Onboarding.tsx` | 378 | Idle-triggered onboarding system |
| `docs/WIDGET_UNIVERSAL_PLAYER.md` | 335 | Widget architecture documentation |
| `docs/STYLE_PRESET_THUMBNAILS.md` | 278 | Style thumbnail design spec |
| `scripts/generate-style-thumbnails.ts` | 165 | One-time thumbnail generator |
| `public/assets/style-thumbs/.gitkeep` | 0 | Directory placeholder |

### Files Modified This Session:
| File | Changes |
|------|---------|
| `constants.ts` | Added EXPORT_OPTIONS (lines 13-24) |
| `components/Steps.tsx` | Added scrollable wrapper (lines 522-523, 715) |
| `components/Step4Preview.tsx` | Export duration, pricing, watermark toggle |
| `App.tsx` | Import + render Onboarding component |
| `package.json` | Added generate:thumbs script |

---

*A Paul Phillips Manifestation - jusDNCE Development*

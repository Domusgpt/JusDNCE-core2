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
```bash
git checkout main
git branch -D feature/ux-improvements-exports-onboarding
```

---

*A Paul Phillips Manifestation - jusDNCE Development*

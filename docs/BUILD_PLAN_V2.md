# jusDNCE Build Plan v2 - UI Polish + Domain Setup

**Date:** December 2, 2025
**Status:** Pre-Launch Final Polish
**Target:** Deploy to jusDNCE.com

---

## BUILD A: UI Fixes (This Release)

### 1. Banner Z-Index Fix
**Problem:** Promotional banner occludes buttons/toggles
**File:** `App.tsx` lines 481-500

**Current:** Banner has no explicit z-index, inherits from layout
**Fix:** Lower banner z-index OR raise button z-index

```tsx
// Option A: Lower banner (recommended)
<div className="bg-gradient-to-r ... z-10">  // Add z-10

// Option B: Raise buttons to go over banner
// Already have z-50 on header, should naturally overlay
```

**Implementation:**
- Banner: `z-10` (low priority)
- Header: `z-50` (medium - sticky navigation)
- UFO Widget: `z-[60]` (high - always clickable)
- Modals: `z-[100]` (highest - full overlay)

---

### 2. Mobile Portrait Layout Fix
**Problem:** Director controls overflow viewport when fully expanded
**File:** `components/Steps.tsx` lines 510-715

**Current Issues:**
- `max-h-[800px]` on advanced panel exceeds mobile viewport
- Grid `grid-cols-2` doesn't collapse on narrow screens
- Inner scrollable wrapper `max-h-[700px]` still too tall

**Fix:**
```tsx
// Line 522: Add responsive max-height
<div className={`transition-all duration-500 ease-in-out overflow-hidden ${showAdvanced ? 'max-h-[60vh] md:max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>

// Line 523: Responsive inner height
<div className="overflow-y-auto max-h-[55vh] md:max-h-[700px] ...">

// Line 524: Stack on mobile
<div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 ...">
```

---

### 3. Style Thumbnails Redesign
**Problem:** Thumbnails too large, dominate screen, need collapsible menu
**File:** `components/Steps.tsx` lines 465-509

**Current:** `grid-cols-2 lg:grid-cols-4` with `aspect-square` thumbnails

**New Design: Collapsible Style Picker**
```tsx
// State for expanded/collapsed
const [styleMenuOpen, setStyleMenuOpen] = useState(false);
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

// Categories
const STYLE_CATEGORIES = [
  { id: 'cinematic', label: 'Cinematic', icon: Film },
  { id: 'anime', label: 'Anime/2D', icon: Sparkles },
  { id: 'digital', label: 'Digital', icon: Zap },
  { id: 'artistic', label: 'Artistic', icon: Palette },
];

// Compact view (default)
<div className="flex items-center gap-3 p-3 bg-black/30 rounded-xl border border-white/10">
  <div className="flex -space-x-2">
    {/* Show first 4 thumbnails stacked */}
    {STYLE_PRESETS.slice(0, 4).map((s, i) => (
      <img key={s.id} src={s.thumbnail}
        className="w-10 h-10 rounded-lg border-2 border-black object-cover"
        style={{ zIndex: 4 - i }}
      />
    ))}
  </div>
  <div className="flex-1">
    <p className="font-bold text-sm">{selectedStyle?.name || 'Choose Style'}</p>
    <p className="text-xs text-white/50">{selectedStyle?.category || 'Tap to browse'}</p>
  </div>
  <button onClick={() => setStyleMenuOpen(!styleMenuOpen)}
    className="p-2 rounded-lg bg-white/10 hover:bg-white/20">
    <ChevronDown className={`w-5 h-5 transition-transform ${styleMenuOpen ? 'rotate-180' : ''}`} />
  </button>
</div>

// Expanded view (when styleMenuOpen)
{styleMenuOpen && (
  <div className="mt-3 p-4 bg-black/40 rounded-xl border border-white/10">
    {/* Category tabs */}
    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
      {STYLE_CATEGORIES.map(cat => (
        <button key={cat.id}
          onClick={() => setSelectedCategory(cat.id)}
          className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${
            selectedCategory === cat.id ? 'bg-brand-500' : 'bg-white/10'
          }`}>
          {cat.label}
        </button>
      ))}
    </div>

    {/* Filtered grid - smaller thumbnails */}
    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
      {filteredStyles.map(style => (
        <button key={style.id}
          onClick={() => { onSelectStyle(style.id); setStyleMenuOpen(false); }}
          className={`aspect-square rounded-lg overflow-hidden border-2 ${
            config.selectedStyleId === style.id ? 'border-brand-500' : 'border-transparent'
          }`}>
          <img src={style.thumbnail} className="w-full h-full object-cover" />
        </button>
      ))}
    </div>
  </div>
)}
```

**Thumbnail Size Changes:**
- Current: ~80px x 80px (aspect-square in 4-col grid)
- New Compact: 40px x 40px (preview stack)
- New Expanded: 48px x 48px (8-col grid)

---

### 4. Credit Pricing "Sale" Display
**Problem:** Show current prices as "on sale" with higher retail prices
**File:** `constants.ts` lines 26-33, `components/Modals.tsx` PaymentModal

**Current Pricing:**
| Pack | Credits | Price |
|------|---------|-------|
| pack_1 | 1 | $1 |
| pack_10 | 10 | $5 |
| pack_25 | 25 | $10 |
| pack_60 | 60 | $20 |
| pack_100 | 100 | $30 |

**New Pricing (33% higher retail, current = sale):**
| Pack | Credits | Retail | Sale | Savings |
|------|---------|--------|------|---------|
| pack_1 | 1 | $1.50 | $1 | 33% OFF |
| pack_10 | 10 | $7.50 | $5 | 33% OFF |
| pack_25 | 25 | $15 | $10 | 33% OFF |
| pack_60 | 60 | $30 | $20 | 33% OFF |
| pack_100 | 100 | $45 | $30 | 33% OFF |

**constants.ts Update:**
```typescript
export const CREDIT_PACKS = [
  { id: 'pack_1', credits: 1, price: 1, retailPrice: 1.50, label: '1 Credit', priceId: 'price_1cr' },
  { id: 'pack_10', credits: 10, price: 5, retailPrice: 7.50, label: '10 Credits', priceId: 'price_10cr', popular: true },
  { id: 'pack_25', credits: 25, price: 10, retailPrice: 15, label: '25 Credits', priceId: 'price_25cr' },
  { id: 'pack_60', credits: 60, price: 20, retailPrice: 30, label: '60 Credits', priceId: 'price_60cr', bestValue: true },
  { id: 'pack_100', credits: 100, price: 30, retailPrice: 45, label: '100 Credits', priceId: 'price_100cr' },
] as const;
```

**PaymentModal UI Update:**
```tsx
<div className="relative">
  {/* Sale badge */}
  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
    EARLY ACCESS
  </div>

  {/* Price display */}
  <div className="flex items-baseline gap-2">
    <span className="text-2xl font-black text-white">${pack.price}</span>
    <span className="text-sm text-white/40 line-through">${pack.retailPrice.toFixed(2)}</span>
    <span className="text-xs text-green-400 font-bold">33% OFF</span>
  </div>
</div>
```

---

## BUILD B: Domain Configuration (jusDNCE.com)

### Prerequisites
- [x] Firebase project: `jusdnce-ai`
- [x] GoDaddy domain: `jusDNCE.com` (owned)
- [ ] Firebase Hosting enabled
- [ ] DNS records configured

### Step 1: Verify Firebase Hosting Setup
```bash
cd /mnt/c/Users/millz/JusDNCE-core2
firebase use jusdnce-ai
firebase init hosting
# Select: dist (Vite build output)
# Configure as single-page app: Yes
```

### Step 2: Add Custom Domain in Firebase
```bash
firebase hosting:sites:list
firebase hosting:channel:list

# Add custom domain
firebase hosting:sites:create jusdnce-com  # if needed
firebase target:apply hosting jusdnce-com jusdnce-ai

# Or via Firebase Console:
# 1. Go to Hosting > Add custom domain
# 2. Enter: jusdnce.com
# 3. Copy TXT record for verification
```

### Step 3: GoDaddy DNS Configuration

**Required DNS Records:**

| Type | Host | Value | TTL |
|------|------|-------|-----|
| TXT | @ | google-site-verification=XXXXX | 1 Hour |
| A | @ | 151.101.1.195 | 1 Hour |
| A | @ | 151.101.65.195 | 1 Hour |
| CNAME | www | jusdnce-ai.web.app | 1 Hour |

**GoDaddy CLI (if available):**
```bash
# Note: GoDaddy doesn't have official CLI, use API or web console
# Alternative: Use gcloud DNS if domain transferred to Google Domains
```

**Manual GoDaddy Steps:**
1. Login to GoDaddy → My Products → DNS
2. Delete existing A records for @ (if any)
3. Add Firebase A records (151.101.x.x)
4. Add TXT record for verification
5. Add CNAME for www subdomain

### Step 4: SSL Certificate Provisioning
Firebase automatically provisions SSL certificate after DNS verification.
- Wait 24-48 hours for full propagation
- Check status: `firebase hosting:channel:list`

### Step 5: Deploy to Production
```bash
npm run build
firebase deploy --only hosting

# Verify deployment
curl -I https://jusdnce.com
```

### firebase.json Configuration
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

---

## BUILD C: Future - Style Expansion (5x Thumbnails)

### Current Styles: 20
### Target Styles: 100+

### Smart Categories Plan:
```typescript
const STYLE_CATEGORIES_V2 = {
  // Current categories expanded
  cinematic: {
    label: 'Cinematic',
    subcategories: ['Film Noir', 'Blockbuster', 'Documentary', 'Horror', 'Sci-Fi'],
    targetCount: 25
  },
  anime: {
    label: 'Anime & 2D',
    subcategories: ['Shonen', 'Slice of Life', 'Mecha', 'Chibi', 'Manga'],
    targetCount: 25
  },
  digital: {
    label: 'Digital Effects',
    subcategories: ['Glitch', 'Vaporwave', 'Synthwave', 'Matrix', 'Holographic'],
    targetCount: 25
  },
  artistic: {
    label: 'Artistic',
    subcategories: ['Impressionist', 'Pop Art', 'Watercolor', 'Sketch', 'Graffiti'],
    targetCount: 25
  },
  // NEW categories
  cultural: {
    label: 'Cultural',
    subcategories: ['K-Pop', 'Bollywood', 'Latin', 'African', 'Traditional'],
    targetCount: 20
  },
  seasonal: {
    label: 'Seasonal',
    subcategories: ['Holiday', 'Summer', 'Halloween', 'Valentine', 'New Year'],
    targetCount: 15
  }
};
```

### Subject-Based Smart Categorization:
```typescript
// When SubjectCategory is detected, suggest relevant styles
const STYLE_SUGGESTIONS: Record<SubjectCategory, string[]> = {
  CHARACTER: ['anime-cel', 'pixel-retro', 'neon-cyber', 'comic-book'],
  TEXT: ['glitch-matrix', 'kinetic-type', 'neon-sign', 'graffiti'],
  SYMBOL: ['holographic', 'metallic', 'emblem', 'abstract']
};
```

---

## Implementation Order

### Phase 1: UI Polish (2-3 hours)
1. Banner z-index fix
2. Mobile viewport fixes
3. Style thumbnails redesign
4. Sale pricing display

### Phase 2: Domain Setup (1-2 hours)
1. Firebase hosting verification
2. GoDaddy DNS configuration
3. SSL provisioning wait
4. Production deploy

### Phase 3: Testing (1 hour)
1. Cross-browser testing
2. Mobile device testing
3. Domain accessibility verification
4. Generation flow testing

---

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `App.tsx` | Banner z-index | HIGH |
| `components/Steps.tsx` | Mobile layout, thumbnail redesign | HIGH |
| `constants.ts` | Add retailPrice to CREDIT_PACKS | MEDIUM |
| `components/Modals.tsx` | Sale pricing display | MEDIUM |
| `firebase.json` | Hosting configuration | HIGH |

---

## Generation Issue Investigation

**Reported:** Generation errors possibly related to connection/local env

**Diagnostic Steps:**
1. Check Gemini API key validity
2. Test API connectivity: `curl https://generativelanguage.googleapis.com/v1beta/models`
3. Check Firebase Functions logs: `firebase functions:log --project jusdnce-ai`
4. Verify CORS settings in functions
5. Test with mock mode enabled

**Potential Causes:**
- API key quota exceeded
- Network timeout (slow connection)
- CORS blocking from localhost
- Firebase cold start delays

---

**Document Version:** 1.0
**Last Updated:** December 2, 2025
**Author:** Claude Code Assistant

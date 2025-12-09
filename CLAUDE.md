# jusDNCE Production Context - Claude Code Skill

**Firebase Project:** `jusdnce-ai`
**Domain:** `jusdnce.com` (GoDaddy DNS -> Firebase Hosting)
**Live URL:** https://jusdnce-ai.web.app | https://jusdnce.com

---

## Persona & Role

You are a Senior Creative Technologist specializing in React, WebGL, and Generative AI.
You prioritize **Vibe**, **Flow**, and **Performance**.
This is a freemium AI dance video generator targeting social media creators.

---

## Quick Reference

### Firebase Project Details
```
Project ID:     jusdnce-ai
Region:         us-central1
Hosting URL:    https://jusdnce-ai.web.app
Functions URL:  https://us-central1-jusdnce-ai.cloudfunctions.net
```

### Deployment Commands
```bash
# Build and deploy frontend
npm run build && firebase deploy --only hosting --project jusdnce-ai

# Deploy specific function
FUNCTIONS_DISCOVERY_TIMEOUT=120 firebase deploy --only functions:generateDanceFrames --project jusdnce-ai

# Deploy all functions
FUNCTIONS_DISCOVERY_TIMEOUT=120 firebase deploy --only functions --project jusdnce-ai

# Check function logs
firebase functions:log --project jusdnce-ai
```

### Key Secrets (Firebase Secret Manager)
- `STRIPE_SECRET_KEY` - Stripe API key for payments
- `GEMINI_API_KEY` - Google Gemini AI (also hardcoded fallback in services/gemini.ts)
- `STRIPE_WEBHOOK_SECRET` - For webhook verification

---

## Architecture Overview

### Frontend Stack
- **React 19** with TypeScript
- **Vite** for build/dev
- **Tailwind CSS** with custom "Quantum Glassmorphism" design system
- **Lucide React** for icons
- **Firebase SDK** for Auth, Firestore, Functions

### Backend Stack
- **Firebase Functions v2** (Gen 2)
- **Firestore** for user data and credits
- **Stripe** for payments (credit packs + subscriptions)
- **Google Gemini AI** for image generation

### File Structure
```
/
├── App.tsx              # Main app (643 lines) - state, routing, UI
├── constants.ts         # CREDIT_COSTS, STYLE_PRESETS, CREDIT_PACKS
├── types.ts             # TypeScript interfaces, AppState, enums
├── index.tsx            # Entry point
├── components/
│   ├── Steps.tsx        # Step 1-3 wizard UI (42k lines)
│   ├── Step4Preview.tsx # Video preview/export (65k lines)
│   ├── Modals.tsx       # Auth, Payment, Export modals
│   ├── HelpSystem.tsx   # UFO helper widgets
│   ├── Onboarding.tsx   # First-time user flow
│   └── Visualizer/      # WebGL background
├── services/
│   ├── gemini.ts        # Gemini AI frame generation
│   ├── firebase.ts      # Firebase config
│   ├── firestore.ts     # User/credit operations
│   └── playerExport.ts  # Video export logic
├── functions/src/
│   ├── index.ts                 # Function exports
│   ├── generateDance.ts         # AI generation function
│   ├── createCheckoutSession.ts # Stripe checkout
│   ├── stripeWebhook.ts         # Payment webhooks
│   └── redeemPromoCode.ts       # Promo codes
└── firebase.json        # Firebase config
```

---

## Credit System (CRITICAL)

### Credit Costs (constants.ts:5-11)
```typescript
CREDIT_COSTS = {
  TURBO: 1,           // 4 frames - fast generation
  QUALITY: 2,         // 8 frames - better quality
  SUPER_MODE: 4,      // 15 frames - premium choreography
  RE_EXPORT: 1,       // Re-export with new song
  WIDGET_PURCHASE: 20 // Standalone widget export
}
```

### Credit Packs (constants.ts:27-33)
| Pack ID | Credits | Price | Notes |
|---------|---------|-------|-------|
| pack_1 | 1 | $1 | Single credit |
| pack_10 | 10 | $5 | Popular |
| pack_25 | 25 | $10 | |
| pack_60 | 60 | $20 | Best Value |
| pack_100 | 100 | $30 | |

### Free Tier (constants.ts:52-55)
```typescript
FREE_TIER = {
  signupCredits: 5,  // Given on account creation
  dailyCredits: 1    // Claimable every 24 hours
}
```

### Subscription ($8/month)
- No watermarks
- 2 daily credits (instead of 1)
- Unlimited re-exports for Super Mode
- Priority generation queue
- No ads

---

## Generation Modes

### Turbo Mode (1 credit)
- **4 frames** generated
- Fast, budget option
- Uses `gemini-2.5-flash` for planning
- Uses `gemini-2.5-flash-image` for generation

### Quality Mode (2 credits) - DEFAULT
- **8 frames** generated
- Better choreography variety
- Recommended for most users

### Super Mode (4 credits)
- **15 frames** including:
  - 10 body poses (varied dance moves)
  - 3 close-up shots (face/center focus)
  - 2 ultra-wide impact poses
- Unlocks special choreography presets:
  - Triplet Flow, Vocal Chop, Character Spin, Slow-Mo Impact, Liquid Morph

---

## Style System

### Style Categories (constants.ts:83-234)
16 presets across 4 categories:

**Cinematic (4):** Neon Cyberpunk, Neo Noir, Cinematic Realism, Vintage Film
**Anime/2D (4):** Retro Anime, Cyber Samurai, 16-Bit Pixel, Vector Flat
**Digital/Glitch (4):** Acid Glitch, Vaporwave, CRT Terminal, Low Poly
**Artistic (4):** Dreamy Oil, Claymation, Street Graffiti, Ukiyo-e

### Style Preset Structure
```typescript
{
  id: 'neon-cyber',
  name: 'Neon Cyberpunk',
  category: 'Cinematic',
  description: 'Glowing neon lights, dark tech aesthetic.',
  promptModifier: 'cyberpunk style, neon lights, glowing edges...',
  thumbnail: '/assets/style-thumbs/neon-cyber.png',
  hologramParams: { geometryType: 0, hue: 280, chaos: 0.3, ... }
}
```

---

## AI Generation Pipeline (services/gemini.ts)

### Input Optimization
```typescript
const OPTIMIZED_INPUT_SIZE = 312;  // Resize to 312px for cost efficiency
```

### Generation Flow
1. **Resize input** to 312px (line 36)
2. **Plan animation** with `gemini-2.5-flash` (structured JSON output)
3. **Detect subject category**: CHARACTER | TEXT | SYMBOL
4. **Generate frames** with `gemini-2.5-flash-image`
5. **Mirror non-TEXT frames** for L/R variety
6. **Resize output** to 512px max

### Subject-Specific Prompts
- **CHARACTER**: Full body shots, Dolly Zoom effect, asymmetric poses
- **TEXT**: No rotation, RGB Moiré, scanline interference
- **SYMBOL**: Holographic, metallic effects

---

## Design System

### Font
`'Rajdhani'` (Google Fonts) - Weights 300-800

### Aesthetic: "Quantum Glassmorphism"
```css
/* Backgrounds */
bg-black/20, backdrop-blur-xl

/* Borders */
border-white/10 (idle) -> border-brand-500/50 (active)

/* Accent Colors */
Neon Cyan:    #00ffff
Magenta:      #ff00ff
Brand Purple: #8b5cf6
```

### Micro-Interactions
```typescript
// On hover
triggerImpulse('hover', 0.1)

// On click
triggerImpulse('click', 1.0)

// Text effect
className="glitch-hover"
```

### Z-Index Hierarchy
```
Banner:      z-10  (lowest - promotional)
Header:      z-50  (sticky nav)
UFO Widgets: z-[60] (always clickable)
Modals:      z-[100] (highest)
```

---

## Firestore Schema

### Users Collection (`/users/{uid}`)
```typescript
interface UserDocument {
  uid: string;
  email: string;
  name: string;
  photoURL: string;
  credits: number;
  tier: 'free' | 'pro';
  isSubscriber: boolean;
  lastDailyCreditClaim: Timestamp | null;
  createdAt: Timestamp;
  lastLogin: Timestamp;
}
```

### Firestore Rules
- Users can only read/write their own document
- Credits can only be modified by Cloud Functions
- Promo codes tracked in `/promo_codes/{code}` and `/redeemed_codes/{uid}_{code}`

---

## Cloud Functions

### generateDanceFrames
- **Trigger:** HTTPS Callable
- **Auth:** Required
- **Secrets:** GEMINI_API_KEY
- **Memory:** 512MiB
- **Timeout:** 300s

### createCheckoutSession
- **Trigger:** HTTPS Callable
- **Auth:** Required
- **Secrets:** STRIPE_SECRET_KEY
- **Validates:** Redirect URLs from allowed domains

### handleStripeWebhook
- **Trigger:** HTTPS Request (raw body)
- **Secrets:** STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- **Handles:** checkout.session.completed, customer.subscription events

### redeemPromoCode
- **Trigger:** HTTPS Callable
- **Auth:** Required
- **Rate limited:** One redemption per code per user

---

## Operations & Monitoring

### Health Checks
```bash
# Check site is up
curl -I https://jusdnce.com

# Check Firebase Functions
firebase functions:list --project jusdnce-ai

# Check recent logs
firebase functions:log --project jusdnce-ai --limit 50
```

### Common Issues

**"Generation failed"**
- Check Gemini API quota in GCP Console
- Verify GEMINI_API_KEY secret is set
- Check for rate limiting (429 errors)

**"Payment system not configured"**
- Verify STRIPE_SECRET_KEY in Firebase secrets
- Check Stripe webhook endpoint is active

**DNS issues**
- A record: 199.36.158.100
- TXT record: hosting-site=jusdnce-ai
- Allow 24-48 hours for SSL provisioning

---

## DO NOT

- **DO NOT** suggest server-side rendering for video - strictly client-side for cost
- **DO NOT** remove Free Tier logic - business depends on freemium funnel
- **DO NOT** mock data - app is in Production Mode
- **DO NOT** block the visualizer background with opaque colors
- **DO NOT** change credit pricing without business approval

---

## Visualizer Integration

The background is a live `QuantumVisualizer` WebGL instance.

```typescript
// Change background mood
const event = new CustomEvent('color-shift', { detail: { hue: 120 } });
window.dispatchEvent(event);
```

---

## Glossary

| Term | Definition |
|------|------------|
| **Impulse** | Shockwave sent to the WebGL shader |
| **Quantum Foam** | High-density noise state (idle visualizer) |
| **Hyper-Reactivity** | Every pixel reacts to mouse/audio |
| **Stutter** | Beat-synced frame jump effects |
| **Morph** | Blend between two style presets |

---

**A Paul Phillips Manifestation**
Paul@clearseassolutions.com | Parserator.com

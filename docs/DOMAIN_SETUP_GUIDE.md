# jusDNCE.com Domain Setup Guide

**Date:** December 2, 2025
**Firebase Project:** jusdnce-ai
**Domain:** jusdnce.com (GoDaddy)

---

## Step 1: Add Custom Domain in Firebase Console

1. Go to: https://console.firebase.google.com/project/jusdnce-ai/hosting/sites
2. Click on **"jusdnce-ai"** site
3. Click **"Add custom domain"**
4. Enter: `jusdnce.com`
5. Firebase will show you a **TXT record** for verification

**Copy the TXT record value** - it will look like:
```
google-site-verification=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## Step 2: GoDaddy DNS Configuration

### Login to GoDaddy:
1. Go to: https://dcc.godaddy.com/manage/jusdnce.com/dns
2. Or: My Products → Domain → DNS Management

### Add TXT Record (Verification):
| Type | Host | Value | TTL |
|------|------|-------|-----|
| TXT | @ | `hosting-site-jusdnce-ai` | 1 Hour |

### Add A Record (Routing to Firebase):
| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | @ | 199.36.158.100 | 1 Hour |

### REMOVE these existing records (if present):
| Type | Host | Value |
|------|------|-------|
| A | @ | 13.248.243.5 |
| A | @ | 76.223.105.230 |

### Add CNAME for www subdomain:
| Type | Host | Value | TTL |
|------|------|-------|-----|
| CNAME | www | jusdnce-ai.web.app | 1 Hour |

### Remove conflicting records:
- Delete any existing A records for `@` (may point to GoDaddy parking page)
- Delete any existing CNAME for `www` if present

---

## Step 3: Verify in Firebase Console

1. Return to Firebase Console
2. Click **"Verify"** button
3. Firebase will check for the TXT record
4. Once verified, Firebase provisions SSL certificate (can take up to 24 hours)

---

## Step 4: Add www subdomain (Optional but Recommended)

1. In Firebase Console, click **"Add custom domain"** again
2. Enter: `www.jusdnce.com`
3. It will use the same verification (already done)
4. This ensures both `jusdnce.com` and `www.jusdnce.com` work

---

## Step 5: Deploy Latest Build

```bash
cd /mnt/c/Users/millz/JusDNCE-core2
npm run build
firebase deploy --only hosting --project jusdnce-ai
```

---

## DNS Propagation Timeline

| Stage | Time |
|-------|------|
| TXT Record Verification | 5-30 minutes |
| A Record Propagation | 1-4 hours |
| SSL Certificate Provisioning | 1-24 hours |
| Full Global Propagation | Up to 48 hours |

---

## Verification Commands

### Check DNS propagation:
```bash
# Check A records
dig jusdnce.com A +short

# Check TXT record
dig jusdnce.com TXT +short

# Check CNAME
dig www.jusdnce.com CNAME +short
```

### Test site access:
```bash
curl -I https://jusdnce.com
curl -I https://www.jusdnce.com
```

---

## Troubleshooting

### "Domain verification failed"
- Wait 15-30 minutes for TXT record to propagate
- Check for typos in TXT value
- Ensure TTL is set to 1 Hour (not Auto)

### "SSL certificate pending"
- This is normal - Firebase auto-provisions Let's Encrypt certificate
- Can take up to 24 hours
- Site may show security warning until complete

### "Site not loading"
- Verify A records point to Firebase IPs
- Check for conflicting records in GoDaddy
- Clear browser cache

---

## Quick Reference - Firebase IPs

Firebase Hosting uses these IP addresses:
- 151.101.1.195
- 151.101.65.195

These are Fastly CDN endpoints used by Firebase Hosting.

---

## Post-Setup Checklist

- [ ] TXT record added in GoDaddy
- [ ] Domain verified in Firebase Console
- [ ] A records pointing to Firebase IPs
- [ ] CNAME for www subdomain
- [ ] SSL certificate provisioned (green lock)
- [ ] Both jusdnce.com and www.jusdnce.com work
- [ ] Latest build deployed

---

**Firebase Console Direct Link:**
https://console.firebase.google.com/project/jusdnce-ai/hosting/sites

**GoDaddy DNS Management:**
https://dcc.godaddy.com/manage/jusdnce.com/dns

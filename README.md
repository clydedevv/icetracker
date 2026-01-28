# ICETracker MSP

<div align="center">

![ICETracker MSP](https://img.shields.io/badge/ICETracker-MSP-dc2626?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0xMCAzTDIgMTloMjBMMTAgM3ptMCA0bDYgMTBINGw2LTEwem0wIDNoLjAxdjNoLS4wMXYtM3ptMCA0aC4wMXYxaC0uMDF2LTF6Ii8+PC9zdmc+)
![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)

**Real-time community ICE activity alerts for Minneapolis**

[Live Site](https://ice.clydedev.xyz) • [Telegram Bot](https://t.me/icetracker_msp_bot) • [Alert Channel](https://t.me/+EnMv3G3j241jYjU0)

</div>

---

## What is ICETracker MSP?

A community-driven platform for reporting and tracking ICE activity in Minneapolis. Features include:

- **Live Map** — Real-time reports with filtering by type and verification
- **Telegram Alerts** — Instant notifications when activity is reported
- **Proximity Alerts** — Get DMs when ICE is spotted near your zip code
- **Bot Submissions** — Report sightings directly via Telegram

---

## Live Deployment

| Service | URL |
|---------|-----|
| Web App | https://ice.clydedev.xyz |
| Telegram Bot | [@icetracker_msp_bot](https://t.me/icetracker_msp_bot) |
| Alert Channel | [Join](https://t.me/+EnMv3G3j241jYjU0) |

---

## Self-Hosting Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ with PostGIS
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

### 1. Clone & Install

```bash
git clone https://github.com/clydedevv/icetracker.git
cd icetracker
npm install
```

### 2. Environment Variables

Create `.env` and `.env.local`:

```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/icetracker?schema=public"
```

```bash
# .env.local
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHANNEL_ID=@your_channel  # optional, for broadcasts
TELEGRAM_ADMIN_IDS=123456789       # comma-separated admin user IDs
APP_URL=https://your-domain.com
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed with iceout.org data
npx tsx scripts/import-sightings.ts
```

### 4. Run

```bash
# Development
npm run dev

# Production
npm run build
npm start

# Telegram bot (separate process)
npx tsx src/bot.ts
```

### 5. PM2 (Production)

```bash
# Web app
pm2 start npm --name "icetracker" -- start

# Telegram bot
pm2 start "npx tsx src/bot.ts" --name "icetracker-bot"

pm2 save
```

---

## Telegram Bot Commands

### For Everyone
| Command | Description |
|---------|-------------|
| `/alerts <zip>` | Get alerts within 5 miles of zip code |
| `/alerts <zip> <miles>` | Custom radius (1-50 miles) |
| `/alerts off` | Stop receiving alerts |
| `/alerts status` | Check your subscription |
| `/map` | Get link to the live map |

### For Verified Reporters
| Command | Description |
|---------|-------------|
| `/report` | How to submit a report |
| `/submit TYPE, Address, Description` | Submit a report |
| `/register` | Request verified status |
| `/status` | Check verification status |

**Report Types:** `CRITICAL`, `ACTIVE`, `OBSERVED`, `OTHER`

**Example:**
```
/submit ACTIVE, Lake Street & Chicago Ave, Two ICE vehicles spotted
```

---

## Report Types

| Type | Color | When to Use |
|------|-------|-------------|
| 🔴 Critical | Red | Active raid, arrests happening |
| 🟠 Active | Orange | ICE agents currently present |
| 🟡 Observed | Yellow | Vehicle or agent sighting |
| ⚪ Other | Gray | Unverified or general info |

---

## Tech Stack

- **Frontend:** Next.js 16, React, Tailwind CSS
- **Map:** Leaflet, react-leaflet, CartoDB dark tiles
- **Database:** PostgreSQL + Prisma
- **Bot:** Telegraf (Node.js)
- **Geocoding:** Nominatim (OpenStreetMap)

---

## Data Sources

Reports are aggregated from:
- Community submissions via web and Telegram
- [iceout.org](https://iceout.org) (People Over Papers)

---

## Disclaimer

⚠️ **Important:**
- Reports are community-submitted and may contain errors
- Always verify with local rapid response networks
- This is for awareness, not confrontation
- No personal data is stored; consider using a VPN

---

## Resources

- [Know Your Rights](https://www.informedimmigrant.com/guides/ice-raids/)
- [ACLU: Immigrants' Rights](https://www.aclu.org/know-your-rights/immigrants-rights)
- [United We Dream](https://unitedwedream.org/)

---

## License

MIT License. Built for community safety and awareness.

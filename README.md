# ICETracker

Community-driven platform for reporting and tracking ICE (Immigration and Customs Enforcement) activity. Designed to help communities stay informed and safe.

## Features

### MVP (Phase 1) ✅
- Interactive map with Leaflet/OpenStreetMap
- Report submission via web form
- Report types: Critical, Active, Observed, Other
- Verification levels: Trusted, Verified, Unverified
- Filter by type and verification status
- Mobile-responsive design
- Dark theme optimized for low-light viewing

### Coming Soon (Phase 2)
- [ ] PostgreSQL + PostGIS for persistent storage
- [ ] Telegram bot for submissions and alerts
- [ ] Signal integration
- [ ] Admin moderation dashboard
- [ ] Ethereum wallet verification

### Future (Phase 3)
- [ ] Blockchain logging via Clawdbot
- [ ] Multilingual support (Spanish, Arabic, Somali)
- [ ] Analytics and historical trends
- [ ] Public data aggregation

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

Create a `.env.local` file:

```env
# Database (for production)
DATABASE_URL="postgresql://user:password@localhost:5432/icetracker"

# Telegram Bot (Phase 2)
TELEGRAM_BOT_TOKEN=

# Ethereum RPC (Phase 3)
ETHEREUM_RPC_URL=
```

## Docker Deployment

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f
```

## Tech Stack

- **Frontend**: Next.js 16, React, Tailwind CSS
- **Map**: Leaflet, react-leaflet, OpenStreetMap tiles
- **Database**: PostgreSQL with PostGIS (production)
- **ORM**: Prisma
- **Deployment**: Docker, PM2

## Report Types

| Type | Color | Description |
|------|-------|-------------|
| Critical | 🔴 Red | Ongoing raid, detention, immediate threat |
| Active | 🟠 Orange | Active ICE presence or activity |
| Observed | 🟡 Yellow | ICE vehicle or agent sighting |
| Other | ⚪ Gray | Related activity or information |

## Verification Levels

- **Trusted**: From verified partner organizations (RRNs, nonprofits)
- **Verified**: Reporter verified via Ethereum wallet signature
- **Unverified**: Anonymous community submission

## Disclaimer

⚠️ **Important**:
- Reports are user-submitted and may contain errors
- Always verify with local rapid response networks
- This platform does not encourage violence or harassment
- Information may be outdated by the time you view it
- No personal data is stored; consider using a VPN

## Resources

- [Know Your Rights](https://www.informedimmigrant.com/guides/ice-raids/)
- [United We Dream](https://unitedwedream.org/)
- [RAICES Texas](https://www.raicestexas.org/)

## License

Open source under MIT License. Built for community safety and awareness.

## Contributing

Contributions welcome! Please read our guidelines and submit PRs to the main repository.

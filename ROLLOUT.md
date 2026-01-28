# ICE Tracker - Rollout Plan

## Overview
Real-time ICE activity alerts for communities. Report sightings, get instant notifications.

## Live URLs
- **Website:** https://ice.clydedev.xyz (pending DNS)
- **Direct:** http://77.42.24.244:3001
- **Telegram Bot:** @icetracker_msp_bot
- **Telegram Channel:** https://t.me/+EnMv3G3j241jYjU0

---

## Phase 1: Soft Launch (Now)

### What's Ready
- ✅ Map with real-time reports
- ✅ Web report submission form
- ✅ Telegram bot for verified reporters
- ✅ Telegram channel for alerts
- ✅ Database with 15 seeded reports

### Immediate Actions
1. **Test the flow end-to-end**
   - Submit a report via web → appears on map after approval
   - Submit via bot → appears on map
   - Alert broadcasts to channel

2. **Add yourself as trusted reporter**
   - Message @icetracker_msp_bot
   - Send `/register`
   - Approve yourself via `/approve <your_id>`

3. **Share channel link** with trusted contacts for testing

---

## Phase 2: Community Outreach

### Target Organizations
- Local rapid response networks (RRN)
- Immigration legal aid orgs
- Community centers
- Faith organizations
- Mutual aid groups

### Outreach Template
```
🔴 New community tool: ICE Tracker

Real-time alerts for ICE activity in your area.

📍 View map: https://ice.clydedev.xyz
📱 Get alerts: https://t.me/+EnMv3G3j241jYjU0
🤖 Report sightings: @icetracker_msp_bot

Free, open source, no personal data collected.
```

### Ask
- Partner orgs get "Trusted" status (auto-approved reports)
- They share with their networks
- Cross-post alerts to their channels

---

## Phase 3: Scale

### Regional Expansion
1. Create regional Telegram channels:
   - @icealerts_msp (Minneapolis)
   - @icealerts_chicago
   - @icealerts_la
   etc.

2. Filter alerts by region in bot settings

3. Allow users to subscribe to specific areas

### Technical
- Set up daily iceout.org scraper (needs Playwright fix)
- Add Signal bot integration
- Add email alerts option
- Mobile app consideration

---

## Admin Commands (Telegram Bot)

| Command | Description |
|---------|-------------|
| `/pending` | View pending verification requests |
| `/approve <id>` | Approve a user as verified reporter |
| `/deny <id>` | Deny a verification request |
| `/trusted` | List all trusted users |
| `/addtrusted <id>` | Add user as trusted partner (auto-approve) |

---

## Handoff Checklist

### Access Needed
- [ ] Server SSH access (cosmos@77.42.24.244)
- [ ] Telegram bot token (in .env.local)
- [ ] Database credentials (in .env)
- [ ] Domain DNS access (clydedev.xyz)

### Documentation
- [ ] This file (ROLLOUT.md)
- [ ] README.md with setup instructions
- [ ] .env.example with required variables

### Monitoring
- [ ] pm2 for process management (`pm2 list`, `pm2 logs`)
- [ ] PostgreSQL database (`psql -U icetracker -d icetracker`)

---

## Support Contacts
- **Technical:** [handoff contact]
- **Community:** [org contact]

---

*Last updated: 2026-01-27*

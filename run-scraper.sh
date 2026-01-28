#!/bin/bash
cd /home/cosmos/clawd/icetracker
export PATH="$HOME/.local/share/pnpm:$PATH"
npx tsx src/scraper/iceout-scraper.ts >> /tmp/icetracker-scraper.log 2>&1

import puppeteer from "puppeteer";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { config } from "dotenv";

// Load both env files - .env first (has DATABASE_URL), then .env.local
config({ path: ".env" });
config({ path: ".env.local" });

// Telegram notification config
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const APP_URL = process.env.APP_URL || "http://77.42.24.244:3001";

// Send alert to Telegram channel
async function sendTelegramAlert(report: {
  type: string;
  address: string;
  description: string;
  latitude: number;
  longitude: number;
  confirmed: boolean;
}) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
    console.log("[Scraper] Telegram not configured, skipping notification");
    return;
  }

  const typeEmoji: Record<string, string> = {
    CRITICAL: "🔴",
    ACTIVE: "🟠",
    OBSERVED: "🟡",
    OTHER: "⚪",
  };

  const emoji = typeEmoji[report.type] || "📍";
  const mapsLink = `https://maps.google.com/?q=${report.latitude},${report.longitude}`;
  const statusLine = report.confirmed ? "✅ Verified" : "⚠️ Unconfirmed";
  const headerLine = report.confirmed ? "✅ ICE ACTIVITY VERIFIED" : `${emoji} ICE AGENTS REPORTED`;

  const message = `<b>${headerLine}</b>

📍 ${report.address}
🗺 <a href="${mapsLink}">View on Map</a>
${statusLine}

${report.description}

<a href="${APP_URL}">View full map →</a>`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHANNEL_ID,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (response.ok) {
      console.log("[Scraper] Telegram alert sent successfully");
    } else {
      const err = await response.json();
      console.error("[Scraper] Telegram alert failed:", err);
    }
  } catch (error) {
    console.error("[Scraper] Telegram alert error:", error);
  }
}

// Prisma 7 requires a driver adapter
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface IceoutReport {
  type: string;
  address: string;
  timeOccurred: string;
  timeSubmitted: string;
  confirmed: boolean;
  latitude?: number;
  longitude?: number;
}

// Map iceout.org types to our types
function mapReportType(type: string): "CRITICAL" | "ACTIVE" | "OBSERVED" | "OTHER" {
  const normalized = type.toLowerCase();
  if (normalized.includes("critical")) return "CRITICAL";
  if (normalized.includes("active")) return "ACTIVE";
  if (normalized.includes("observed")) return "OBSERVED";
  return "OTHER";
}

// Parse state from address
function parseState(address: string): string | null {
  const stateMatches = address.match(/,\s*([A-Z]{2})\s*\d{5}|,\s*([A-Z]{2}),?\s*USA/i);
  if (stateMatches) {
    return (stateMatches[1] || stateMatches[2]).toUpperCase();
  }
  return null;
}

// Parse city from address
function parseCity(address: string): string | null {
  const parts = address.split(",");
  if (parts.length >= 2) {
    return parts[parts.length - 3]?.trim() || parts[0]?.trim();
  }
  return null;
}

async function scrapeIceout(): Promise<IceoutReport[]> {
  console.log("[Scraper] Launching browser...");
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log("[Scraper] Navigating to iceout.org...");
    await page.goto("https://iceout.org/en", { 
      waitUntil: "networkidle2",
      timeout: 60000 
    });

    // Wait for reports to load
    console.log("[Scraper] Waiting for reports to load...");
    await page.waitForSelector("mat-card", { timeout: 30000 }).catch(() => {
      console.log("[Scraper] No mat-card found, trying alternate selectors...");
    });

    // Give Angular time to render
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Extract reports from the page - using actual iceout.org HTML structure
    const reports = await page.evaluate(() => {
      const results: IceoutReport[] = [];
      
      // Find all report cards - they're divs with flex-row and padding
      const cards = document.querySelectorAll('div[style*="padding: 8px"]');
      
      cards.forEach((card) => {
        try {
          // Extract type from the colored badge
          const typeBadge = card.querySelector('.text-sm.font-bold.text-white');
          let type = "OTHER";
          if (typeBadge) {
            const typeText = typeBadge.textContent?.trim().toLowerCase() || "";
            if (typeText.includes("critical")) type = "Critical";
            else if (typeText.includes("active")) type = "Active";
            else if (typeText.includes("observed")) type = "Observed";
          }
          
          // Extract address from h3 > b
          const addressEl = card.querySelector('h3.text-lg.font-bold b');
          const address = addressEl?.textContent?.trim() || "";
          
          // Extract times from the text-xs div
          const text = card.textContent || "";
          const timeOccurredMatch = text.match(/Time Occurred[:\s]*([0-9:]+\s*[APMapm]+)/i);
          const timeSubmittedMatch = text.match(/Time Submitted[:\s]*([0-9:]+\s*[APMapm]+)/i);
          
          // Check confirmation status
          const confirmed = text.includes("Confirmed") && !text.includes("Not Confirmed");
          
          if (address && address.length > 10) {
            results.push({
              type,
              address,
              timeOccurred: timeOccurredMatch ? timeOccurredMatch[1].trim() : "",
              timeSubmitted: timeSubmittedMatch ? timeSubmittedMatch[1].trim() : "",
              confirmed,
            });
          }
        } catch (e) {
          // Skip malformed cards
        }
      });
      
      return results;
    });

    console.log(`[Scraper] Found ${reports.length} reports`);
    return reports;

  } finally {
    await browser.close();
  }
}

// Minneapolis metro area bounding box (roughly Twin Cities metro)
const MINNEAPOLIS_BOUNDS = {
  north: 45.25,  // North of St. Paul
  south: 44.65,  // South of Burnsville
  east: -92.75,  // East of Woodbury
  west: -93.70,  // West of Eden Prairie
};

function isInMinneapolisArea(lat: number, lng: number): boolean {
  return (
    lat >= MINNEAPOLIS_BOUNDS.south &&
    lat <= MINNEAPOLIS_BOUNDS.north &&
    lng >= MINNEAPOLIS_BOUNDS.west &&
    lng <= MINNEAPOLIS_BOUNDS.east
  );
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encoded = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
      {
        headers: {
          "User-Agent": "ICETracker/1.0 (community safety tool)",
        },
      }
    );
    
    const data = await response.json();
    if (data && data[0]) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
  } catch (error) {
    console.error(`[Scraper] Geocoding failed for: ${address}`, error);
  }
  return null;
}

async function saveReports(reports: IceoutReport[]) {
  console.log(`[Scraper] Saving ${reports.length} reports to database...`);
  
  let saved = 0;
  let skipped = 0;

  for (const report of reports) {
    // Create a unique identifier for deduplication
    const sourceId = `iceout-${report.address}-${report.timeOccurred}`.replace(/\s+/g, "-").toLowerCase();
    
    // Check if we already have this report
    const existing = await prisma.report.findFirst({
      where: { sourceId },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Geocode the address
    const coords = await geocodeAddress(report.address);
    
    // Rate limit geocoding
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (!coords) {
      console.log(`[Scraper] Skipping report (geocoding failed): ${report.address}`);
      skipped++;
      continue;
    }

    // Filter to Minneapolis metro area only
    if (!isInMinneapolisArea(coords.lat, coords.lng)) {
      console.log(`[Scraper] Skipping report (outside Minneapolis area): ${report.address}`);
      skipped++;
      continue;
    }

    // Parse the time
    let reportedAt = new Date();
    try {
      if (report.timeOccurred) {
        // Handle formats like "1:05 AM" or "12:30 AM"
        const today = new Date();
        const [time, period] = report.timeOccurred.split(" ");
        const [hours, minutes] = time.split(":");
        let hour = parseInt(hours);
        if (period?.toLowerCase() === "pm" && hour !== 12) hour += 12;
        if (period?.toLowerCase() === "am" && hour === 12) hour = 0;
        reportedAt = new Date(today.setHours(hour, parseInt(minutes) || 0, 0, 0));
      }
    } catch (e) {
      console.log(`[Scraper] Could not parse time: ${report.timeOccurred}`);
    }

    try {
      const reportType = mapReportType(report.type);
      const description = `Report from iceout.org. ${report.confirmed ? "Confirmed" : "Unconfirmed"} sighting.`;
      
      await prisma.report.create({
        data: {
          latitude: coords.lat,
          longitude: coords.lng,
          address: report.address,
          city: parseCity(report.address),
          state: parseState(report.address),
          type: reportType,
          status: "APPROVED", // Auto-approve iceout.org data
          title: `${report.type} - ICE Activity`,
          description,
          verificationLevel: report.confirmed ? "TRUSTED" : "UNVERIFIED",
          source: "AGGREGATED",
          sourceId,
          reportedAt,
        },
      });
      saved++;
      console.log(`[Scraper] Saved: ${report.address}`);
      
      // Send Telegram alert for new Minneapolis-area reports
      await sendTelegramAlert({
        type: reportType,
        address: report.address,
        description,
        latitude: coords.lat,
        longitude: coords.lng,
        confirmed: report.confirmed,
      });
    } catch (error) {
      console.error(`[Scraper] Failed to save report:`, error);
      skipped++;
    }
  }

  console.log(`[Scraper] Complete: ${saved} saved, ${skipped} skipped`);
  return { saved, skipped };
}

async function main() {
  console.log("[Scraper] Starting iceout.org scrape...");
  console.log(`[Scraper] Time: ${new Date().toISOString()}`);
  
  try {
    const reports = await scrapeIceout();
    
    if (reports.length > 0) {
      await saveReports(reports);
    } else {
      console.log("[Scraper] No reports found - page structure may have changed");
    }
  } catch (error) {
    console.error("[Scraper] Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
  
  console.log("[Scraper] Done!");
}

main();

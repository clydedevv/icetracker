import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local" });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Fresh reports from iceout.org (1/28/26)
const reports = [
  { type: "ACTIVE", address: "Primary EyeCare, Minnesota 15, Hutchinson, MN, USA", confirmed: false },
  { type: "OBSERVED", address: "6848 Otter Lake Rd, Hugo, MN 55038, USA", confirmed: false },
  { type: "OBSERVED", address: "Valley View Road & Mathias Road, Shakopee, MN, USA", confirmed: false },
  { type: "ACTIVE", address: "3401 W Oakland Ave, Austin, MN 55912, USA", confirmed: false },
  { type: "ACTIVE", address: "1407 Vierling Dr E, Shakopee, MN 55379, USA", confirmed: false },
  { type: "OBSERVED", address: "1485 Oak St, Columbus, OH 43205, USA", confirmed: false },
  { type: "CRITICAL", address: "217 Jefferson Ave, Washington, PA, USA", confirmed: false },
  { type: "CRITICAL", address: "Clark Road & East Huron River Drive, Ypsilanti Township, MI, USA", confirmed: false },
  { type: "CRITICAL", address: "Bryan, Texas, USA", confirmed: false },
  { type: "OBSERVED", address: "Willow Park, Butterscotch Rd, Eden Prairie, MN, USA", confirmed: false },
  { type: "ACTIVE", address: "422 158th St W, Burnsville, MN 55306, USA", confirmed: false },
  { type: "ACTIVE", address: "2215 Bronson Dr, Mounds View, MN 55112, USA", confirmed: false },
  { type: "OBSERVED", address: "532 Chili Avenue, Rochester, NY, USA", confirmed: false },
  { type: "ACTIVE", address: "Valley Green Park, Jordan, MN, USA", confirmed: false },
  { type: "ACTIVE", address: "7500 Setzler Pkwy, Minneapolis, MN, USA", confirmed: false },
  { type: "ACTIVE", address: "5100 White Star Ln, Woodbury, MN 55129, USA", confirmed: false },
  { type: "OBSERVED", address: "200 W 74th St, Richfield, MN 55423, USA", confirmed: false },
  { type: "OBSERVED", address: "2398 AL-150, Hoover, AL 35226, USA", confirmed: false },
  { type: "OBSERVED", address: "12 Bradt St, Rotterdam Junction, NY 12150, USA", confirmed: false },
  { type: "OBSERVED", address: "7445 Pleasant Ave, Minneapolis, MN 55423, USA", confirmed: false },
  { type: "CRITICAL", address: "101 Cahaba Valley Pkwy, Pelham, AL 35124, USA", confirmed: false },
  { type: "OBSERVED", address: "11647 Angell St, Norwalk, CA 90650, USA", confirmed: false },
  { type: "OBSERVED", address: "12571 Geranium Ct, Apple Valley, MN 55124, USA", confirmed: false },
  { type: "CRITICAL", address: "4870 Columbia St, Cumming, GA 30040, USA", confirmed: false },
  { type: "OTHER", address: "1009 Carpenters Way, Lakeland, FL 33809, USA", confirmed: false },
  { type: "CRITICAL", address: "FL-400, Plant City, FL 33563, USA", confirmed: false },
  { type: "ACTIVE", address: "Shannon Place Lane, Dublin, Ohio, USA", confirmed: false },
  { type: "ACTIVE", address: "Washtenaw Community College, East Huron River Drive, Ann Arbor, MI, USA", confirmed: false },
  { type: "OBSERVED", address: "520 Julii St SE, Willmar, MN 56201, USA", confirmed: false },
  { type: "ACTIVE", address: "159 W Main St, Patchogue, NY 11772, USA", confirmed: false },
  { type: "CRITICAL", address: "Hartford Terrace by Pulte Homes, Norcott Drive, Davenport, FL, USA", confirmed: false },
  { type: "CRITICAL", address: "Green Bay Road & Keith Ave, Waukegan Township, IL, USA", confirmed: false },
  { type: "ACTIVE", address: "Fruitville, FL, USA", confirmed: false },
  { type: "CRITICAL", address: "East Powell Lane, Austin, TX, USA", confirmed: false },
  { type: "ACTIVE", address: "2019 103rd Ave NW, Coon Rapids, MN 55433, USA", confirmed: false },
  { type: "OBSERVED", address: "1157 Herbert St, St Paul, MN 55106, USA", confirmed: false },
  { type: "OBSERVED", address: "North Green Bay Road, Waukegan, IL, USA", confirmed: false },
  { type: "OBSERVED", address: "251 S McCarty Dr, Beverly Hills, CA 90212, USA", confirmed: false },
  { type: "ACTIVE", address: "1332 West 225 Street, Torrance, CA, USA", confirmed: false },
  { type: "ACTIVE", address: "6518 Bluestem Ln S, Cottage Grove, MN, USA", confirmed: false },
  { type: "OBSERVED", address: "Country Inns & Suites near Cottage Grove, MN, USA", confirmed: false },
  { type: "ACTIVE", address: "3401 Longfellow Ave, Minneapolis, MN, USA", confirmed: false },
  { type: "CRITICAL", address: "1130 Town and Country Crossing Drive, Town and Country, Missouri 63017, USA", confirmed: false },
  { type: "OTHER", address: "Lincoln Heights, Los Angeles, CA, USA", confirmed: true },
  { type: "OBSERVED", address: "1010 Bush Avenue, Saint Paul, MN, USA", confirmed: false },
];

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { "User-Agent": "ICETracker/1.0" } }
    );
    const data = await res.json();
    if (data?.[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {}
  return null;
}

function parseState(address: string): string | null {
  const match = address.match(/,\s*([A-Z]{2})\s*\d{5}|,\s*([A-Z]{2}),?\s*USA/i);
  return match ? (match[1] || match[2]).toUpperCase() : null;
}

function parseCity(address: string): string | null {
  const parts = address.split(",");
  return parts.length >= 2 ? parts[parts.length - 3]?.trim() || parts[0]?.trim() : null;
}

async function seed() {
  console.log("[Seed] Adding fresh iceout.org reports...");
  let added = 0, skipped = 0;

  for (const r of reports) {
    const sourceId = `iceout-fresh-${r.address}`.replace(/\s+/g, "-").toLowerCase().slice(0, 100);
    
    const existing = await prisma.report.findFirst({ where: { sourceId } });
    if (existing) { skipped++; continue; }

    const coords = await geocode(r.address);
    await new Promise(res => setTimeout(res, 1100)); // Rate limit

    if (!coords) {
      console.log(`[Skip] No coords: ${r.address.slice(0, 40)}...`);
      skipped++;
      continue;
    }

    const reportedAt = new Date();
    reportedAt.setHours(reportedAt.getHours() - Math.floor(Math.random() * 6));

    await prisma.report.create({
      data: {
        latitude: coords.lat,
        longitude: coords.lng,
        address: r.address,
        city: parseCity(r.address),
        state: parseState(r.address),
        type: r.type as any,
        status: "APPROVED",
        title: `${r.type} - ICE Activity`,
        description: `${r.confirmed ? "Confirmed" : "Unconfirmed"} report via iceout.org`,
        verificationLevel: r.confirmed ? "TRUSTED" : "UNVERIFIED",
        source: "AGGREGATED",
        sourceId,
        reportedAt,
      },
    });
    console.log(`[+] ${r.type}: ${r.address.slice(0, 50)}...`);
    added++;
  }

  const total = await prisma.report.count();
  console.log(`\n[Done] Added: ${added}, Skipped: ${skipped}, Total: ${total}`);
  
  await prisma.$disconnect();
  await pool.end();
}

seed().catch(console.error);

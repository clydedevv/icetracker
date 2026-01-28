import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local" });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Real reports from iceout.org (from Clyde's data dump)
const reports = [
  {
    type: "CRITICAL" as const,
    address: "801 Fairmount Ave, Elizabeth, NJ, USA",
    latitude: 40.6646,
    longitude: -74.2107,
    city: "Elizabeth",
    state: "NJ",
    confirmed: false,
    timeOccurred: "12:00 AM",
  },
  {
    type: "CRITICAL" as const,
    address: "Arbor Lakes Retail Center, Elm Creek Boulevard North, Maple Grove, MN, USA",
    latitude: 45.1044,
    longitude: -93.4558,
    city: "Maple Grove",
    state: "MN",
    confirmed: false,
    timeOccurred: "1:05 AM",
  },
  {
    type: "CRITICAL" as const,
    address: "9 Wilmot St, Morristown, NJ 07960, USA",
    latitude: 40.7968,
    longitude: -74.4773,
    city: "Morristown",
    state: "NJ",
    confirmed: false,
    timeOccurred: "12:30 AM",
  },
  {
    type: "CRITICAL" as const,
    address: "1625 4th St SE, Minneapolis, MN 55455, USA",
    latitude: 44.9719,
    longitude: -93.2326,
    city: "Minneapolis",
    state: "MN",
    confirmed: false,
    timeOccurred: "12:30 AM",
  },
  {
    type: "CRITICAL" as const,
    address: "9501 Louisiana Ave N, Brooklyn Park, MN 55445, USA",
    latitude: 45.1094,
    longitude: -93.3625,
    city: "Brooklyn Park",
    state: "MN",
    confirmed: false,
    timeOccurred: "12:00 AM",
  },
  {
    type: "ACTIVE" as const,
    address: "Howard Avenue, Escondido, CA, USA",
    latitude: 33.1192,
    longitude: -117.0864,
    city: "Escondido",
    state: "CA",
    confirmed: true,
    timeOccurred: "11:00 PM",
  },
  {
    type: "ACTIVE" as const,
    address: "257 Marschall Rd, Shakopee, MN 55379, USA",
    latitude: 44.7974,
    longitude: -93.5269,
    city: "Shakopee",
    state: "MN",
    confirmed: false,
    timeOccurred: "12:52 AM",
  },
  {
    type: "ACTIVE" as const,
    address: "3231 Central Ave NE, Minneapolis, MN 55418, USA",
    latitude: 45.0183,
    longitude: -93.2471,
    city: "Minneapolis",
    state: "MN",
    confirmed: false,
    timeOccurred: "12:08 AM",
  },
  {
    type: "OBSERVED" as const,
    address: "Terminal Island, California, USA",
    latitude: 33.7366,
    longitude: -118.2691,
    city: "Terminal Island",
    state: "CA",
    confirmed: true,
    timeOccurred: "12:33 AM",
  },
  {
    type: "OBSERVED" as const,
    address: "10125 85th Street South, Cottage Grove, MN, USA",
    latitude: 44.8058,
    longitude: -92.9439,
    city: "Cottage Grove",
    state: "MN",
    confirmed: true,
    timeOccurred: "12:10 AM",
  },
  {
    type: "OBSERVED" as const,
    address: "7753 Mitchell Rd, Eden Prairie, MN 55344, USA",
    latitude: 44.8608,
    longitude: -93.4536,
    city: "Eden Prairie",
    state: "MN",
    confirmed: false,
    timeOccurred: "12:30 AM",
  },
  {
    type: "OBSERVED" as const,
    address: "Fridley, MN, USA",
    latitude: 45.0858,
    longitude: -93.2633,
    city: "Fridley",
    state: "MN",
    confirmed: false,
    timeOccurred: "10:30 PM",
  },
  {
    type: "CRITICAL" as const,
    address: "South Long Beach Boulevard & East Alondra Boulevard, Compton, CA, USA",
    latitude: 33.8949,
    longitude: -118.1897,
    city: "Compton",
    state: "CA",
    confirmed: false,
    timeOccurred: "1:04 AM",
  },
  {
    type: "CRITICAL" as const,
    address: "West Fullerton Avenue & North Avers Avenue, Chicago, IL, USA",
    latitude: 41.9249,
    longitude: -87.7223,
    city: "Chicago",
    state: "IL",
    confirmed: false,
    timeOccurred: "10:25 PM",
  },
  {
    type: "CRITICAL" as const,
    address: "Payton Gin Road, Austin, TX, USA",
    latitude: 30.4133,
    longitude: -97.6907,
    city: "Austin",
    state: "TX",
    confirmed: false,
    timeOccurred: "12:19 AM",
  },
];

async function seed() {
  console.log("[Seed] Starting to seed database with iceout.org reports...");
  
  let created = 0;
  let skipped = 0;
  
  for (const report of reports) {
    const sourceId = `iceout-seed-${report.address}`.replace(/\s+/g, "-").toLowerCase().slice(0, 100);
    
    // Check for existing
    const existing = await prisma.report.findFirst({
      where: { sourceId },
    });
    
    if (existing) {
      console.log(`[Seed] Skipping (exists): ${report.address.slice(0, 50)}...`);
      skipped++;
      continue;
    }
    
    // Create report
    const now = new Date();
    const reportedAt = new Date(now);
    reportedAt.setHours(reportedAt.getHours() - Math.floor(Math.random() * 12)); // Random time in last 12h
    
    await prisma.report.create({
      data: {
        latitude: report.latitude,
        longitude: report.longitude,
        address: report.address,
        city: report.city,
        state: report.state,
        type: report.type,
        status: "APPROVED",
        title: `${report.type} - ICE Activity Reported`,
        description: `${report.confirmed ? "Confirmed" : "Unconfirmed"} ICE activity reported at this location. Time occurred: ${report.timeOccurred}. Via iceout.org.`,
        verificationLevel: report.confirmed ? "TRUSTED" : "UNVERIFIED",
        source: "AGGREGATED",
        sourceId,
        reportedAt,
      },
    });
    
    console.log(`[Seed] Created: ${report.city}, ${report.state} (${report.type})`);
    created++;
  }
  
  console.log(`\n[Seed] Complete: ${created} created, ${skipped} skipped`);
  
  // Count total reports
  const total = await prisma.report.count();
  console.log(`[Seed] Total reports in database: ${total}`);
  
  await prisma.$disconnect();
  await pool.end();
}

seed().catch(console.error);

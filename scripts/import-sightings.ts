import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Raw sightings from iceout.org - MN focus
const sightings = [
  { type: "OBSERVED", address: "Macalester - Groveland, Saint Paul, MN, USA", timeOccurred: "10:15 AM", state: "MN" },
  { type: "ACTIVE", address: "El Nuevo Estilo Hair Salon, Blackhawk Road, Eagan, MN, USA", timeOccurred: "5:30 AM", state: "MN" },
  { type: "OBSERVED", address: "Westgate Mall, Baxter Drive, Brainerd, MN, USA", timeOccurred: "10:41 AM", state: "MN" },
  { type: "OBSERVED", address: "9100 3rd Ave S, Minneapolis, MN 55420, USA", timeOccurred: "10:39 AM", state: "MN" },
  { type: "CRITICAL", address: "725 45th Avenue North, Minneapolis, MN 55412, USA", timeOccurred: "11:00 PM", state: "MN" },
  { type: "CRITICAL", address: "701 E 77th St, Richfield, MN, USA", timeOccurred: "2:41 AM", state: "MN" },
  { type: "OBSERVED", address: "10th Ave SE & 8th St SE, Minneapolis, MN 55414, USA", timeOccurred: "6:30 AM", state: "MN" },
  { type: "OBSERVED", address: "AC Hotel Bloomington Mall of America, 26th Avenue South, Bloomington, MN, USA", timeOccurred: "8:00 AM", state: "MN" },
  { type: "OBSERVED", address: "1140 White Bear Ave N, St Paul, MN 55106, USA", timeOccurred: "9:40 AM", state: "MN" },
  { type: "OBSERVED", address: "1409 E 140th St, Burnsville, MN 55337, USA", timeOccurred: "10:12 AM", state: "MN" },
  { type: "OBSERVED", address: "6723 Elliot Ave, Minneapolis, MN 55423, USA", timeOccurred: "4:00 AM", state: "MN" },
  { type: "OBSERVED", address: "Walmart Supercenter, Singletree Lane, Eden Prairie, MN, USA", timeOccurred: "10:03 AM", state: "MN" },
  { type: "OBSERVED", address: "Becker Ave SE, Willmar, MN, USA", timeOccurred: "9:50 AM", state: "MN" },
  { type: "ACTIVE", address: "7385 157th St W, Apple Valley, MN 55124, USA", timeOccurred: "11:30 PM", state: "MN" },
  { type: "OBSERVED", address: "6910 54th Ave N, Minneapolis, MN 55428, USA", timeOccurred: "7:00 AM", state: "MN" },
  { type: "ACTIVE", address: "7318 157th St W, Apple Valley, MN 55124, USA", timeOccurred: "11:00 PM", state: "MN" },
  { type: "OBSERVED", address: "1919 Old W Main St, Red Wing, MN 55066, USA", timeOccurred: "9:27 AM", state: "MN" },
  { type: "OBSERVED", address: "8253 Regional Center Rd, Eden Prairie, MN 55344, USA", timeOccurred: "9:01 AM", state: "MN" },
  { type: "CRITICAL", address: "White Bear Ave & Idaho Ave, St Paul, MN 55106, USA", timeOccurred: "5:15 AM", state: "MN", confirmed: true },
  { type: "OBSERVED", address: "2215 Mailand Rd E, St Paul, MN 55119, USA", timeOccurred: "8:30 AM", state: "MN" },
];

async function geocode(address: string): Promise<{ lat: number; lng: number; city?: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`;
    const response = await fetch(url, {
      headers: { "User-Agent": "ICETrackerMSP/1.0" },
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.length === 0) return null;
    const result = data[0];
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      city: result.address?.city || result.address?.town || result.address?.village,
    };
  } catch (error) {
    console.error(`Geocode failed for ${address}:`, error);
    return null;
  }
}

async function importSightings() {
  console.log(`Importing ${sightings.length} MN sightings...`);
  
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const sighting of sightings) {
    // Check for duplicate by address (fuzzy match)
    const existing = await prisma.report.findFirst({
      where: {
        address: { contains: sighting.address.split(",")[0], mode: "insensitive" },
      },
    });

    if (existing) {
      console.log(`SKIP (duplicate): ${sighting.address.slice(0, 50)}...`);
      skipped++;
      continue;
    }

    // Geocode
    const location = await geocode(sighting.address);
    if (!location) {
      console.log(`FAIL (geocode): ${sighting.address.slice(0, 50)}...`);
      failed++;
      continue;
    }

    // Parse time occurred to create reportedAt
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timeMatch = sighting.timeOccurred.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const isPM = timeMatch[3].toUpperCase() === "PM";
      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
      today.setHours(hours, minutes);
    }

    // Create report
    const report = await prisma.report.create({
      data: {
        latitude: location.lat,
        longitude: location.lng,
        address: sighting.address,
        city: location.city || null,
        state: "MN",
        type: sighting.type as any,
        status: "APPROVED",
        title: `${sighting.type} - ${sighting.address.split(",")[0]}`,
        description: `ICE activity reported at ${sighting.address}. Time occurred: ${sighting.timeOccurred}. Source: iceout.org`,
        verificationLevel: sighting.confirmed ? "TRUSTED" : "UNVERIFIED",
        source: "AGGREGATED",
        imageUrls: [],
        reportedAt: today,
      },
    });

    console.log(`OK: ${report.id} - ${sighting.address.slice(0, 40)}...`);
    imported++;

    // Rate limit for Nominatim (1 req/sec)
    await new Promise((r) => setTimeout(r, 1100));
  }

  console.log(`\nDone! Imported: ${imported}, Skipped: ${skipped}, Failed: ${failed}`);
}

importSightings()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

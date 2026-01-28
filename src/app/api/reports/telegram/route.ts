import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ReportType, ReportStatus, VerificationLevel, ReportSource } from "@prisma/client";

// Geocode address using Nominatim (free, no API key)
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; city?: string; state?: string } | null> {
  // Try multiple query formats for better results
  const queries = buildGeoQueries(address);
  
  for (const query of queries) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: {
          "User-Agent": "ICETrackerMSP/1.0",
        },
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      if (data.length === 0) continue;
      
      const result = data[0];
      console.log(`[Geocode] Success with query: "${query}"`);
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        city: result.address?.city || result.address?.town || result.address?.village,
        state: result.address?.state,
      };
    } catch (error) {
      console.error(`[Geocode] Error for "${query}":`, error);
    }
  }
  
  console.error(`[Geocode] All queries failed for: ${address}`);
  return null;
}

// Build multiple query variations to improve geocoding success
function buildGeoQueries(address: string): string[] {
  const queries: string[] = [];
  const hasMN = address.includes("MN") || address.includes("Minnesota");
  const baseAddress = address.trim();
  
  // Handle intersection format: "Street1 & Street2" or "Street1 and Street2"
  const intersectionMatch = baseAddress.match(/^(.+?)\s*[&+]\s*(.+?)(?:,|$)/i);
  if (intersectionMatch) {
    const [, street1, street2Rest] = intersectionMatch;
    const street2 = street2Rest.split(",")[0].trim();
    const suffix = baseAddress.includes(",") ? baseAddress.substring(baseAddress.indexOf(",")) : ", Minneapolis, MN";
    
    // Try "Street1 and Street2, City"
    queries.push(`${street1} and ${street2}${suffix}`);
    // Try just the first street with city
    queries.push(`${street1}${suffix}`);
  }
  
  // Original address
  queries.push(baseAddress);
  
  // Add Minneapolis context if not present
  if (!hasMN) {
    queries.push(`${baseAddress}, Minneapolis, MN`);
  }
  
  // Try without unit numbers, suite numbers etc
  const simplified = baseAddress.replace(/\s*(suite|ste|unit|apt|#)\s*\w+/gi, "");
  if (simplified !== baseAddress) {
    queries.push(simplified);
    if (!hasMN) queries.push(`${simplified}, Minneapolis, MN`);
  }
  
  return [...new Set(queries)]; // Remove duplicates
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { type, address, description, telegramUserId, telegramUsername, userLevel } = body;

    // Validate required fields
    if (!type || !address || !description) {
      return NextResponse.json(
        { error: "Missing required fields: type, address, description" },
        { status: 400 }
      );
    }

    // Validate report type
    const validTypes: ReportType[] = ["CRITICAL", "ACTIVE", "OBSERVED", "OTHER"];
    if (!validTypes.includes(type as ReportType)) {
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    // Geocode the address
    const location = await geocodeAddress(address);
    if (!location) {
      return NextResponse.json(
        { error: "Could not find location. Try being more specific (e.g., include cross streets or neighborhood)." },
        { status: 400 }
      );
    }

    // Determine if auto-approve based on user level
    const autoApprove = userLevel === "trusted" || userLevel === "admin";
    const verificationLevel: VerificationLevel = userLevel === "trusted" ? "TRUSTED" : userLevel === "admin" ? "TRUSTED" : "VERIFIED";

    // Create title from type and location
    const title = `${type} - ${address}`;

    const report = await prisma.report.create({
      data: {
        latitude: location.lat,
        longitude: location.lng,
        address: address,
        city: location.city || null,
        state: location.state ? getStateAbbr(location.state) : "MN",
        type: type as ReportType,
        status: autoApprove ? "APPROVED" : "PENDING",
        title: title.slice(0, 100),
        description: description.slice(0, 2000),
        verificationLevel: verificationLevel,
        source: "TELEGRAM" as ReportSource,
        imageUrls: [],
        reportedAt: new Date(),
      },
    });

    console.log("[Telegram Report] Created:", report.id, report.type, report.status, `by ${telegramUsername || telegramUserId}`);

    // If auto-approved, broadcast to channel
    if (autoApprove) {
      try {
        const { broadcastAlert } = await import("@/lib/telegram-bot");
        await broadcastAlert({
          type: report.type,
          title: report.title,
          address: report.address || undefined,
          description: report.description,
          reportedAt: report.reportedAt.toISOString(),
          id: report.id,
          latitude: report.latitude,
          longitude: report.longitude,
          verificationLevel: report.verificationLevel,
          source: report.source,
        });
      } catch (broadcastError) {
        console.error("[Telegram Report] Broadcast failed:", broadcastError);
        // Don't fail the request if broadcast fails
      }
    }

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        status: report.status,
        autoApproved: autoApprove,
      },
    });
  } catch (error) {
    console.error("[Telegram Report] Error:", error);
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }
}

// Helper to convert full state name to abbreviation
function getStateAbbr(stateName: string): string {
  const states: Record<string, string> = {
    "minnesota": "MN",
    "wisconsin": "WI",
    "iowa": "IA",
    "north dakota": "ND",
    "south dakota": "SD",
    // Add more as needed
  };
  return states[stateName.toLowerCase()] || stateName.slice(0, 2).toUpperCase();
}

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// In-memory store for MVP (replace with Prisma/PostgreSQL in production)
// Minneapolis-focused demo data
let reports: any[] = [
  {
    id: "demo-1",
    latitude: 44.9488,
    longitude: -93.2583,
    address: "Lake Street & Chicago Ave",
    city: "Minneapolis",
    state: "MN",
    type: "ACTIVE",
    status: "APPROVED",
    title: "ICE vehicles spotted near Lake Street",
    description: "Multiple marked and unmarked vehicles observed near Lake Street. Two white vans with federal plates. Agents in plainclothes.",
    verificationLevel: "TRUSTED",
    source: "TELEGRAM",
    imageUrls: [],
    reportedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-2",
    latitude: 44.9337,
    longitude: -93.2777,
    address: "East Phillips neighborhood",
    city: "Minneapolis",
    state: "MN",
    type: "CRITICAL",
    status: "APPROVED",
    title: "Reported residential enforcement activity",
    description: "Community members report ICE agents at apartment building on Cedar Ave. Rapid response network notified. Legal observers en route.",
    verificationLevel: "VERIFIED",
    source: "SIGNAL",
    imageUrls: [],
    reportedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-3",
    latitude: 44.9778,
    longitude: -93.2650,
    address: "Downtown Minneapolis",
    city: "Minneapolis",
    state: "MN",
    type: "OBSERVED",
    status: "APPROVED",
    title: "Federal vehicle near Hennepin County Government Center",
    description: "Black SUV with federal plates parked near government center. Two individuals in suits observed entering building.",
    verificationLevel: "UNVERIFIED",
    source: "WEB",
    imageUrls: [],
    reportedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-4",
    latitude: 44.9629,
    longitude: -93.2171,
    address: "University of Minnesota area",
    city: "Minneapolis",
    state: "MN",
    type: "OBSERVED",
    status: "APPROVED",
    title: "Unmarked van sighting near campus",
    description: "White unmarked van with tinted windows seen driving slowly through Dinkytown area. No direct enforcement observed.",
    verificationLevel: "UNVERIFIED",
    source: "WEB",
    imageUrls: [],
    reportedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-5",
    latitude: 44.9919,
    longitude: -93.2478,
    address: "Northeast Minneapolis",
    city: "Minneapolis",
    state: "MN",
    type: "OTHER",
    status: "APPROVED",
    title: "Community meeting on know-your-rights",
    description: "Reminder: Know Your Rights training tonight at 7pm at Holy Cross Church. Free legal consultation available.",
    verificationLevel: "TRUSTED",
    source: "TELEGRAM",
    imageUrls: [],
    reportedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-6",
    latitude: 44.8897,
    longitude: -93.3499,
    address: "Richfield area",
    city: "Richfield",
    state: "MN",
    type: "OBSERVED",
    status: "APPROVED",
    title: "Federal vehicles at apartment complex",
    description: "Two federal vehicles observed at apartment complex near 77th Street. Unknown if ICE or other agency. Residents advised to know their rights.",
    verificationLevel: "UNVERIFIED",
    source: "WEB",
    imageUrls: [],
    reportedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const city = searchParams.get("city");
  const state = searchParams.get("state");

  let filtered = [...reports];

  if (status) {
    filtered = filtered.filter((r) => r.status === status);
  }
  if (type) {
    filtered = filtered.filter((r) => r.type === type);
  }
  if (city) {
    filtered = filtered.filter((r) => r.city?.toLowerCase().includes(city.toLowerCase()));
  }
  if (state) {
    filtered = filtered.filter((r) => r.state?.toLowerCase() === state.toLowerCase());
  }

  // Sort by reportedAt descending
  filtered.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());

  return NextResponse.json({
    reports: filtered,
    total: filtered.length,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const required = ["latitude", "longitude", "type", "title", "description", "reportedAt"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate coordinates
    if (body.latitude < -90 || body.latitude > 90) {
      return NextResponse.json({ error: "Invalid latitude" }, { status: 400 });
    }
    if (body.longitude < -180 || body.longitude > 180) {
      return NextResponse.json({ error: "Invalid longitude" }, { status: 400 });
    }

    // Validate report type
    const validTypes = ["CRITICAL", "ACTIVE", "OBSERVED", "OTHER"];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const report = {
      id: uuidv4(),
      latitude: body.latitude,
      longitude: body.longitude,
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      type: body.type,
      status: "PENDING", // All reports start as pending
      title: body.title.slice(0, 100),
      description: body.description.slice(0, 2000),
      verificationLevel: body.walletAddress ? "VERIFIED" : "UNVERIFIED",
      walletAddress: body.walletAddress || null,
      walletSignature: body.walletSignature || null,
      source: "WEB",
      imageUrls: body.imageUrls || [],
      reportedAt: body.reportedAt,
      createdAt: now,
      updatedAt: now,
    };

    reports.push(report);

    // In production, this would save to database and potentially trigger alerts
    console.log("[Report] New submission:", report.id, report.type, report.title);

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        status: report.status,
      },
    });
  } catch (error) {
    console.error("[Report] Error:", error);
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }
}

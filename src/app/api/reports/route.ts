import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// In-memory store for MVP (replace with Prisma/PostgreSQL in production)
let reports: any[] = [
  // Sample data for demo
  {
    id: "demo-1",
    latitude: 34.0522,
    longitude: -118.2437,
    address: "Downtown Los Angeles",
    city: "Los Angeles",
    state: "CA",
    type: "ACTIVE",
    status: "APPROVED",
    title: "ICE vehicles spotted near courthouse",
    description: "Multiple marked and unmarked vehicles observed near the federal courthouse. Agents in tactical gear visible.",
    verificationLevel: "TRUSTED",
    source: "WEB",
    imageUrls: [],
    reportedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-2",
    latitude: 33.4484,
    longitude: -112.074,
    address: "Central Phoenix",
    city: "Phoenix",
    state: "AZ",
    type: "CRITICAL",
    status: "APPROVED",
    title: "Reported workplace raid in progress",
    description: "Multiple reports of ICE conducting workplace enforcement at a food processing facility. Legal observers requested.",
    verificationLevel: "VERIFIED",
    source: "TELEGRAM",
    imageUrls: [],
    reportedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-3",
    latitude: 29.7604,
    longitude: -95.3698,
    address: "Midtown Houston",
    city: "Houston",
    state: "TX",
    type: "OBSERVED",
    status: "APPROVED",
    title: "ICE van parked near transit station",
    description: "White unmarked van with federal plates observed near the Midtown station. Two individuals in plain clothes exited the vehicle.",
    verificationLevel: "UNVERIFIED",
    source: "WEB",
    imageUrls: [],
    reportedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-4",
    latitude: 41.8781,
    longitude: -87.6298,
    address: "Pilsen neighborhood",
    city: "Chicago",
    state: "IL",
    type: "ACTIVE",
    status: "APPROVED",
    title: "ICE presence reported in residential area",
    description: "Community members report ICE agents going door-to-door in the Pilsen neighborhood. Rapid response network activated.",
    verificationLevel: "TRUSTED",
    source: "SIGNAL",
    imageUrls: [],
    reportedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-5",
    latitude: 44.9778,
    longitude: -93.265,
    address: "Lake Street",
    city: "Minneapolis",
    state: "MN",
    type: "OBSERVED",
    status: "APPROVED",
    title: "Unmarked federal vehicle sighting",
    description: "Black SUV with federal plates seen driving slowly through the Lake Street commercial district.",
    verificationLevel: "UNVERIFIED",
    source: "WEB",
    imageUrls: [],
    reportedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
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

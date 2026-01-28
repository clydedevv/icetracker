import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { ReportType, ReportStatus, VerificationLevel, ReportSource } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as ReportStatus | null;
  const type = searchParams.get("type") as ReportType | null;
  const city = searchParams.get("city");
  const state = searchParams.get("state");

  try {
    const reports = await prisma.report.findMany({
      where: {
        ...(status && { status }),
        ...(type && { type }),
        ...(city && { city: { contains: city, mode: "insensitive" } }),
        ...(state && { state: state.toUpperCase() }),
      },
      orderBy: {
        reportedAt: "desc",
      },
      take: 100,
    });

    return NextResponse.json({
      reports,
      total: reports.length,
    });
  } catch (error) {
    console.error("[Report GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
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
    const validTypes: ReportType[] = ["CRITICAL", "ACTIVE", "OBSERVED", "OTHER"];
    if (!validTypes.includes(body.type as ReportType)) {
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    const report = await prisma.report.create({
      data: {
        latitude: body.latitude,
        longitude: body.longitude,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        type: body.type as ReportType,
        status: "PENDING" as ReportStatus,
        title: body.title.slice(0, 100),
        description: body.description.slice(0, 2000),
        verificationLevel: body.walletAddress ? "VERIFIED" as VerificationLevel : "UNVERIFIED" as VerificationLevel,
        walletAddress: body.walletAddress || null,
        walletSignature: body.walletSignature || null,
        source: "WEB" as ReportSource,
        imageUrls: body.imageUrls || [],
        reportedAt: new Date(body.reportedAt),
      },
    });

    console.log("[Report] New submission:", report.id, report.type, report.title);

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        status: report.status,
      },
    });
  } catch (error) {
    console.error("[Report POST] Error:", error);
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }
}

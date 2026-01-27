"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Report, ReportType } from "@/types";

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
);

// Report type colors
const TYPE_COLORS: Record<ReportType, string> = {
  CRITICAL: "#dc2626", // red-600
  ACTIVE: "#ea580c",   // orange-600
  OBSERVED: "#ca8a04", // yellow-600
  OTHER: "#6b7280",    // gray-500
};

const TYPE_LABELS: Record<ReportType, string> = {
  CRITICAL: "Critical - Ongoing Raid/Detention",
  ACTIVE: "Active ICE Presence",
  OBSERVED: "ICE Sighting",
  OTHER: "Other Activity",
};

interface MapProps {
  reports: Report[];
  center?: [number, number];
  zoom?: number;
  onReportClick?: (report: Report) => void;
  selectedTypes?: ReportType[];
  showConfirmedOnly?: boolean;
}

export default function Map({
  reports,
  center = [39.8283, -98.5795], // US center
  zoom = 4,
  onReportClick,
  selectedTypes,
  showConfirmedOnly = false,
}: MapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter reports
  const filteredReports = reports.filter((report) => {
    if (selectedTypes && selectedTypes.length > 0 && !selectedTypes.includes(report.type)) {
      return false;
    }
    if (showConfirmedOnly && report.verificationLevel === "UNVERIFIED") {
      return false;
    }
    return true;
  });

  if (!mounted) {
    return (
      <div className="w-full h-full bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading map...</div>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="w-full h-full"
      style={{ background: "#1e293b" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      
      {filteredReports.map((report) => (
        <CircleMarker
          key={report.id}
          center={[report.latitude, report.longitude]}
          radius={report.type === "CRITICAL" ? 12 : 8}
          pathOptions={{
            color: TYPE_COLORS[report.type],
            fillColor: TYPE_COLORS[report.type],
            fillOpacity: 0.7,
            weight: report.verificationLevel !== "UNVERIFIED" ? 3 : 1,
          }}
          eventHandlers={{
            click: () => onReportClick?.(report),
          }}
        >
          <Popup>
            <div className="min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: TYPE_COLORS[report.type] }}
                />
                <span className="text-xs font-medium text-slate-600">
                  {TYPE_LABELS[report.type]}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{report.title}</h3>
              <p className="text-sm text-slate-600 mb-2">{report.description}</p>
              {report.address && (
                <p className="text-xs text-slate-500 mb-2">📍 {report.address}</p>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {new Date(report.reportedAt).toLocaleString()}
                </span>
                {report.verificationLevel !== "UNVERIFIED" && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                    ✓ {report.verificationLevel === "TRUSTED" ? "Trusted" : "Verified"}
                  </span>
                )}
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

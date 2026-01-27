"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Report, ReportType, ReportSubmission } from "@/types";
import ReportForm from "@/components/ReportForm";
import { 
  AlertTriangle, 
  Filter, 
  Plus, 
  X, 
  Shield, 
  Info,
  ExternalLink,
  Menu,
  Clock,
  MapPin,
  CheckCircle,
  Circle
} from "lucide-react";

// Minneapolis coordinates
const MINNEAPOLIS_CENTER: [number, number] = [44.9778, -93.265];
const DEFAULT_ZOOM = 11;

// Dynamic import for Map to avoid SSR issues
const Map = dynamic(() => import("@/components/Map"), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
      <div className="text-slate-400">Loading map...</div>
    </div>
  ),
});

const TYPE_COLORS: Record<ReportType, string> = {
  CRITICAL: "bg-red-600",
  ACTIVE: "bg-orange-500",
  OBSERVED: "bg-yellow-500",
  OTHER: "bg-gray-500",
};

const TYPE_LABELS: Record<ReportType, string> = {
  CRITICAL: "Critical",
  ACTIVE: "Active",
  OBSERVED: "Observed",
  OTHER: "Other",
};

export default function Home() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  
  // Filters
  const [selectedTypes, setSelectedTypes] = useState<ReportType[]>([
    "CRITICAL", "ACTIVE", "OBSERVED", "OTHER"
  ]);
  const [confirmedOnly, setConfirmedOnly] = useState(false);

  // Fetch reports
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch("/api/reports?status=APPROVED");
        const data = await res.json();
        setReports(data.reports || []);
      } catch (error) {
        console.error("Failed to fetch reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchReports, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmitReport = async (submission: ReportSubmission) => {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Failed to submit report");
    }

    // Refresh reports list
    const reportsRes = await fetch("/api/reports?status=APPROVED");
    const data = await reportsRes.json();
    setReports(data.reports || []);
    setShowReportForm(false);
  };

  const toggleType = (type: ReportType) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter((t) => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const recentReports = reports
    .filter((r) => selectedTypes.includes(r.type))
    .slice(0, 10);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="lg:hidden p-2 text-slate-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg leading-tight">ICETracker MSP</h1>
              <p className="text-xs text-slate-500 hidden sm:block">Minneapolis Community ICE Reports</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInfo(true)}
            className="p-2 text-slate-400 hover:text-white transition"
            title="About"
          >
            <Info className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 text-slate-400 hover:text-white transition lg:hidden"
            title="Filters"
          >
            <Filter className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowReportForm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Report Activity</span>
            <span className="sm:hidden">Report</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className={`
          ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          fixed lg:relative inset-y-0 left-0 z-40
          w-80 bg-slate-950 border-r border-slate-800 flex flex-col
          transition-transform duration-300 ease-in-out
          top-[57px] lg:top-0
        `}>
          {/* Filters */}
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Filter by Type
            </h2>
            <div className="space-y-2">
              {(["CRITICAL", "ACTIVE", "OBSERVED", "OTHER"] as ReportType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                    selectedTypes.includes(type)
                      ? "bg-slate-800 text-white"
                      : "text-slate-500 hover:bg-slate-900"
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${TYPE_COLORS[type]}`} />
                  <span className="flex-1 text-left text-sm">{TYPE_LABELS[type]}</span>
                  {selectedTypes.includes(type) ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-600" />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <button
                onClick={() => setConfirmedOnly(!confirmedOnly)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  confirmedOnly
                    ? "bg-emerald-900/30 text-emerald-400 border border-emerald-800"
                    : "text-slate-500 hover:bg-slate-900 border border-transparent"
                }`}
              >
                <Shield className="w-4 h-4" />
                <span className="flex-1 text-left text-sm">Verified only</span>
              </button>
            </div>
          </div>

          {/* Recent Reports */}
          <div className="flex-1 overflow-y-auto p-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Recent Reports
            </h2>
            {loading ? (
              <div className="text-slate-500 text-sm">Loading...</div>
            ) : recentReports.length === 0 ? (
              <div className="text-slate-500 text-sm">No reports to display</div>
            ) : (
              <div className="space-y-3">
                {recentReports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`w-full text-left p-3 rounded-lg border transition ${
                      selectedReport?.id === report.id
                        ? "bg-slate-800 border-slate-700"
                        : "bg-slate-900/50 border-slate-800 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${TYPE_COLORS[report.type]}`} />
                      <span className="text-sm font-medium text-white line-clamp-1">
                        {report.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 ml-4">
                      <Clock className="w-3 h-3" />
                      {new Date(report.reportedAt).toLocaleDateString()}
                      {report.city && (
                        <>
                          <MapPin className="w-3 h-3 ml-2" />
                          {report.city}
                        </>
                      )}
                    </div>
                    {report.verificationLevel !== "UNVERIFIED" && (
                      <div className="ml-4 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-emerald-900/30 text-emerald-400 rounded-full">
                          ✓ Verified
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="p-4 border-t border-slate-800">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-900 rounded-lg p-3">
                <div className="text-2xl font-bold text-white">
                  {reports.filter((r) => r.type === "CRITICAL" || r.type === "ACTIVE").length}
                </div>
                <div className="text-xs text-slate-500">Active Alerts</div>
              </div>
              <div className="bg-slate-900 rounded-lg p-3">
                <div className="text-2xl font-bold text-white">{reports.length}</div>
                <div className="text-xs text-slate-500">Total Reports</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile sidebar backdrop */}
        {showSidebar && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Map */}
        <main className="flex-1 relative">
          <Map
            reports={reports.filter((r) => r.status === "APPROVED")}
            center={MINNEAPOLIS_CENTER}
            zoom={DEFAULT_ZOOM}
            selectedTypes={selectedTypes}
            showConfirmedOnly={confirmedOnly}
            onReportClick={setSelectedReport}
          />

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 text-xs">
            <div className="flex flex-wrap gap-3">
              {(["CRITICAL", "ACTIVE", "OBSERVED", "OTHER"] as ReportType[]).map((type) => (
                <div key={type} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${TYPE_COLORS[type]}`} />
                  <span className="text-slate-300">{TYPE_LABELS[type]}</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Report Form Modal */}
      {showReportForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Report ICE Activity</h2>
              <button
                onClick={() => setShowReportForm(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6">
              <ReportForm
                onSubmit={handleSubmitReport}
                onClose={() => setShowReportForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">About ICETracker</h2>
              <button
                onClick={() => setShowInfo(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-600">
                ICETracker is a community-driven platform for reporting and tracking Immigration and Customs Enforcement (ICE) activity. Our goal is to help communities stay informed and safe.
              </p>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="font-semibold text-amber-800 mb-2">⚠️ Important Disclaimers</h3>
                <ul className="text-sm text-amber-700 space-y-2">
                  <li>• Reports are user-submitted and may contain errors</li>
                  <li>• Always verify information with local rapid response networks</li>
                  <li>• This platform does not encourage violence or harassment</li>
                  <li>• Information may be outdated by the time you view it</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Verification Levels</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs">Trusted</span>
                    <span className="text-slate-600">From verified partner organizations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">Verified</span>
                    <span className="text-slate-600">Reporter verified via Ethereum wallet</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs">Unverified</span>
                    <span className="text-slate-600">Anonymous community report</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Resources</h3>
                <div className="space-y-2">
                  <a
                    href="https://www.informedimmigrant.com/guides/ice-raids/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    Know Your Rights <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href="https://unitedwedream.org/our-work/fighting-mass-detention-deportation/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    United We Dream <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                ICETracker is an open-source project. Reports are moderated before appearing on the map.
                No personal information is stored. Consider using a VPN.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selected Report Detail */}
      {selectedReport && (
        <div className="fixed bottom-0 left-0 right-0 lg:bottom-4 lg:right-4 lg:left-auto lg:w-96 bg-white lg:rounded-xl shadow-2xl z-40 max-h-[60vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${TYPE_COLORS[selectedReport.type]}`} />
              <span className="font-medium text-slate-900">{TYPE_LABELS[selectedReport.type]}</span>
            </div>
            <button
              onClick={() => setSelectedReport(null)}
              className="p-1 hover:bg-slate-100 rounded"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <h3 className="font-bold text-lg text-slate-900">{selectedReport.title}</h3>
            <p className="text-slate-600">{selectedReport.description}</p>
            {selectedReport.address && (
              <p className="text-sm text-slate-500 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {selectedReport.address}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(selectedReport.reportedAt).toLocaleString()}
              </span>
            </div>
            {selectedReport.verificationLevel !== "UNVERIFIED" && (
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">
                  {selectedReport.verificationLevel === "TRUSTED" ? "Verified by trusted organization" : "Verified reporter"}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

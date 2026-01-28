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

const TYPE_DESCRIPTIONS: Record<ReportType, string> = {
  CRITICAL: "Active raid or arrests",
  ACTIVE: "Agents currently present",
  OBSERVED: "Vehicle or agent sighting",
  OTHER: "Unverified or general info",
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
  const [selectedState, setSelectedState] = useState<string>("MN"); // Default to Minnesota
  const [availableStates, setAvailableStates] = useState<string[]>([]);

  // Fetch reports
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch("/api/reports?status=APPROVED");
        const data = await res.json();
        const allReports = data.reports || [];
        setReports(allReports);
        
        // Extract unique states for filter
        const states = [...new Set(allReports.map((r: Report) => r.state).filter(Boolean))] as string[];
        states.sort();
        setAvailableStates(states);
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

  // Filter reports by state and type
  const filteredReports = reports.filter((r) => {
    const matchesType = selectedTypes.includes(r.type);
    const matchesState = selectedState === "ALL" || r.state === selectedState;
    return matchesType && matchesState;
  });

  const recentReports = filteredReports.slice(0, 50);

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
          {/* Telegram CTA - prominent in header */}
          <a
            href="https://t.me/+EnMv3G3j241jYjU0"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#0088cc] text-white rounded-lg hover:bg-[#0077b5] transition text-sm font-medium"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            Get Alerts
          </a>
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
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center gap-2 relative z-[60]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Report Activity</span>
            <span className="sm:hidden">Report</span>
          </button>
        </div>
      </header>

      {/* Telegram Alert Banner - Mobile & Tablet */}
      <a
        href="https://t.me/+EnMv3G3j241jYjU0"
        target="_blank"
        rel="noopener noreferrer"
        className="lg:hidden flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0088cc] text-white text-sm font-medium shrink-0"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
        <span>Join Telegram for instant alerts →</span>
      </a>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside 
          className="sidebar-mobile fixed left-0 z-[1000] w-[85vw] max-w-80 bg-slate-950 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out"
          style={{ 
            top: '57px', 
            height: 'calc(100dvh - 57px)',
            transform: showSidebar ? 'translateX(0)' : 'translateX(-100%)'
          }}
        >
          {/* Compact Filters Row */}
          <div className="p-3 border-b border-slate-800 space-y-2">
            {/* Type toggles - compact row */}
            <div className="flex gap-1.5">
              {(["CRITICAL", "ACTIVE", "OBSERVED", "OTHER"] as ReportType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg transition text-xs ${
                    selectedTypes.includes(type)
                      ? "bg-slate-800 text-white"
                      : "text-slate-500 hover:bg-slate-900"
                  }`}
                  title={TYPE_DESCRIPTIONS[type]}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${TYPE_COLORS[type]}`} />
                  <span className="hidden sm:inline">{TYPE_LABELS[type]}</span>
                </button>
              ))}
            </div>
            
            {/* State & verified row */}
            <div className="flex gap-2">
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="flex-1 bg-slate-800 text-white border border-slate-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="MN">Minnesota</option>
                <option value="ALL">All States</option>
                {availableStates.filter(s => s !== "MN").map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              <button
                onClick={() => setConfirmedOnly(!confirmedOnly)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition text-xs ${
                  confirmedOnly
                    ? "bg-emerald-900/30 text-emerald-400 border border-emerald-800"
                    : "text-slate-500 hover:bg-slate-900 border border-slate-700"
                }`}
              >
                <Shield className="w-3 h-3" />
                <span>Verified</span>
              </button>
            </div>
          </div>

          {/* Recent Reports - Takes most space */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-3 pb-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Recent Reports
                </h2>
                <span className="text-xs text-slate-500">{filteredReports.length} total</span>
              </div>
            </div>
            {loading ? (
              <div className="p-4 text-slate-500 text-sm">Loading...</div>
            ) : recentReports.length === 0 ? (
              <div className="p-4 text-slate-500 text-sm">No reports to display</div>
            ) : (
              <div className="px-3 pb-3 space-y-2">
                {recentReports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`w-full text-left p-3 rounded-lg border transition ${
                      selectedReport?.id === report.id
                        ? "bg-slate-800 border-slate-600"
                        : "bg-slate-900/50 border-slate-800 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 mb-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${TYPE_COLORS[report.type]}`} />
                      <span className="text-sm font-medium text-white line-clamp-2 leading-snug">
                        {report.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 ml-5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(report.reportedAt).toLocaleDateString()}
                      </span>
                      {report.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {report.city}
                        </span>
                      )}
                      {report.verificationLevel !== "UNVERIFIED" && (
                        <span className="text-emerald-400">✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Compact Stats */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/50">
            <div className="flex items-center justify-around text-center">
              <div>
                <div className="text-lg font-bold text-white">
                  {filteredReports.filter((r) => r.type === "CRITICAL" || r.type === "ACTIVE").length}
                </div>
                <div className="text-xs text-slate-500">Active</div>
              </div>
              <div className="w-px h-8 bg-slate-700" />
              <div>
                <div className="text-lg font-bold text-white">{filteredReports.length}</div>
                <div className="text-xs text-slate-500">Total</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile sidebar backdrop */}
        {showSidebar && (
          <div
            className="fixed inset-0 bg-black/50 z-[999] lg:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Map */}
        <main className="flex-1 relative">
          <Map
            reports={filteredReports.filter((r) => r.status === "APPROVED")}
            center={MINNEAPOLIS_CENTER}
            zoom={DEFAULT_ZOOM}
            selectedTypes={selectedTypes}
            showConfirmedOnly={confirmedOnly}
            onReportClick={setSelectedReport}
            onMapClick={() => setSelectedReport(null)}
            selectedReport={selectedReport}
          />

          {/* Telegram Float CTA - Desktop only */}
          <a
            href="https://t.me/icetracker_msp_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex absolute bottom-24 left-4 items-center gap-3 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-xl px-4 py-3 shadow-lg transition group"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            <div>
              <div className="font-semibold text-sm">Get Alerts by Zip Code</div>
              <div className="text-xs text-white/80">DM alerts when ICE is near you</div>
            </div>
            <ExternalLink className="w-4 h-4 opacity-60 group-hover:opacity-100 transition" />
          </a>

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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative" style={{ zIndex: 10000 }}>
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative" style={{ zIndex: 10000 }}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">ICE Tracker</h2>
              <button
                onClick={() => setShowInfo(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Hero */}
              <div className="text-center pb-4 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Know Your Rights. Stay Informed.</h3>
                <p className="text-slate-600">
                  Real-time community alerts to help Minneapolis residents understand and exercise their legal rights during immigration enforcement.
                </p>
              </div>

              {/* Data Sources */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="font-semibold text-amber-900 mb-2">Live Data</h3>
                <p className="text-sm text-amber-800 mb-2">
                  Map data is seeded from <a href="https://iceout.org" target="_blank" rel="noopener noreferrer" className="underline">iceout.org</a> and updated with community reports.
                </p>
                <p className="text-sm text-amber-800 font-medium">
                  For fastest alerts, submit reports directly via Telegram — community reports trigger instant notifications.
                </p>
              </div>

              {/* Get Alerts - Primary CTA */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Get Instant Alerts</h3>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700 mb-3">Join our Telegram channel to receive alerts the moment reports come in:</p>
                  <a
                    href="https://t.me/+EnMv3G3j241jYjU0"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Join Alert Channel <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Submit Reports */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Submit a Report</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-slate-600">
                    See ICE activity? Report it to alert the community:
                  </p>
                  <ul className="text-slate-600 space-y-1 ml-4">
                    <li>• <strong>Web:</strong> Click "Report Activity" button above</li>
                    <li>• <strong>Telegram:</strong> Message <a href="https://t.me/icetracker_msp_bot" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">@icetracker_msp_bot</a></li>
                  </ul>
                  <p className="text-xs text-slate-500 mt-2">
                    Verified reporters get instant posting. Use /register in the bot to request verification.
                  </p>
                </div>
              </div>

              {/* Report Types */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Report Types</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-600" />
                    <span className="text-slate-600">Critical - Active raid</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-orange-500" />
                    <span className="text-slate-600">Active - Agents present</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-slate-600">Observed - Vehicle sighting</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-gray-500" />
                    <span className="text-slate-600">Other - General info</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-100 border border-slate-200 rounded-lg">
                <h3 className="font-semibold text-slate-800 mb-2">Important</h3>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Reports are community-submitted and may contain errors</li>
                  <li>• Always verify with local rapid response networks</li>
                  <li>• This tool is for awareness, not confrontation</li>
                </ul>
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
        <div className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-6 lg:bottom-6 lg:w-[420px] z-40">
          {/* Card */}
          <div className="bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
            {/* Header with type indicator */}
            <div className={`px-6 py-4 ${
              selectedReport.type === "CRITICAL" ? "bg-red-600" :
              selectedReport.type === "ACTIVE" ? "bg-orange-600" :
              selectedReport.type === "OBSERVED" ? "bg-yellow-600" : "bg-slate-700"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-white" />
                  <span className="font-semibold text-white text-lg">
                    {TYPE_LABELS[selectedReport.type]}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              <h3 className="font-bold text-xl text-white leading-snug">
                {selectedReport.title}
              </h3>
              
              <p className="text-slate-300 leading-relaxed text-base">
                {selectedReport.description}
              </p>

              {/* Location */}
              {selectedReport.address && (
                <div className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-xl">
                  <MapPin className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                  <span className="text-slate-300">{selectedReport.address}</span>
                </div>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    {new Date(selectedReport.reportedAt).toLocaleString()}
                  </span>
                </div>
                
                {selectedReport.verificationLevel !== "UNVERIFIED" && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900/40 rounded-full">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 text-sm font-medium">
                      {selectedReport.verificationLevel === "TRUSTED" ? "Trusted Source" : "Verified"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Tap to dismiss hint on mobile */}
            <div className="lg:hidden px-6 pb-4">
              <p className="text-center text-slate-500 text-xs">
                Tap the map to close
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

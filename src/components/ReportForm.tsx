"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { ReportType, ReportSubmission } from "@/types";
import { AlertTriangle, MapPin, Camera, Shield, Send, Loader2 } from "lucide-react";

// Dynamic import for map picker
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });

interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
  };
}

// Map click handler component
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  const { useMapEvents: useEvents } = require("react-leaflet");
  useEvents({
    click: (e: any) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const REPORT_TYPES: { value: ReportType; label: string; description: string; color: string }[] = [
  {
    value: "CRITICAL",
    label: "Critical",
    description: "Ongoing raid, detention, or immediate threat",
    color: "bg-red-600",
  },
  {
    value: "ACTIVE",
    label: "Active",
    description: "Active ICE presence or activity",
    color: "bg-orange-500",
  },
  {
    value: "OBSERVED",
    label: "Observed",
    description: "ICE vehicle or agent sighting",
    color: "bg-yellow-500",
  },
  {
    value: "OTHER",
    label: "Other",
    description: "Related activity or information",
    color: "bg-gray-500",
  },
];

interface ReportFormProps {
  onSubmit: (report: ReportSubmission) => Promise<void>;
  onClose?: () => void;
  initialLocation?: { lat: number; lng: number };
}

export default function ReportForm({ onSubmit, onClose, initialLocation }: ReportFormProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [type, setType] = useState<ReportType>("OBSERVED");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState(initialLocation?.lat || 0);
  const [longitude, setLongitude] = useState(initialLocation?.lng || 0);
  const [address, setAddress] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [reportedAt, setReportedAt] = useState(new Date().toISOString().slice(0, 16));
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setUseCurrentLocation(true);
        
        // Try to reverse geocode
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`
          );
          const data = await res.json();
          if (data.address) {
            setAddress(data.display_name?.split(",").slice(0, 3).join(",") || "");
            setCity(data.address.city || data.address.town || data.address.village || "");
            setState(data.address.state || "");
          }
        } catch {
          // Geocoding failed, but we have coordinates
        }
        setLocationLoading(false);
      },
      (err) => {
        setError("Unable to get your location: " + err.message);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!latitude || !longitude) {
      setError("Please provide a location");
      setIsSubmitting(false);
      return;
    }

    try {
      await onSubmit({
        type,
        title,
        description,
        latitude,
        longitude,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        reportedAt: new Date(reportedAt).toISOString(),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Report Submitted</h2>
        <p className="text-slate-600 mb-6">
          Thank you for your report. It will be reviewed by our moderation team and appear on the map once approved.
        </p>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Disclaimer */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Important Notice</p>
            <p>
              This information is for community awareness only. Always verify with local rapid response networks.
              Do not use this platform to encourage violence or harassment.
            </p>
          </div>
        </div>
      </div>

      {/* Report Type */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          Type of Activity *
        </label>
        <div className="grid grid-cols-2 gap-3">
          {REPORT_TYPES.map((rt) => (
            <button
              key={rt.value}
              type="button"
              onClick={() => setType(rt.value)}
              className={`p-4 rounded-xl border-2 text-left transition ${
                type === rt.value
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-3 h-3 rounded-full ${rt.color}`} />
                <span className="font-semibold text-slate-900">{rt.label}</span>
              </div>
              <p className="text-xs text-slate-500">{rt.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Location *
        </label>
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={locationLoading}
          className="w-full p-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-slate-400 transition flex items-center justify-center gap-2 text-slate-600 mb-3"
        >
          {locationLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <MapPin className="w-5 h-5" />
          )}
          {useCurrentLocation ? "Location captured ✓" : "Use current location"}
        </button>
        
        {useCurrentLocation && (
          <div className="p-3 bg-slate-50 rounded-lg text-sm">
            <p className="text-slate-600">{address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}</p>
          </div>
        )}

        <div className="mt-3 relative">
          <label className="text-xs text-slate-500">Or enter address:</label>
          <div className="relative mt-1">
            <input
              type="text"
              value={address}
              onChange={(e) => {
                const val = e.target.value;
                setAddress(val);
                
                // Debounced search
                if (searchTimeoutRef.current) {
                  clearTimeout(searchTimeoutRef.current);
                }
                
                if (val.length > 3) {
                  setSearchingAddress(true);
                  searchTimeoutRef.current = setTimeout(async () => {
                    try {
                      const res = await fetch(
                        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5&addressdetails=1&countrycodes=us`
                      );
                      const data = await res.json();
                      setAddressSuggestions(data || []);
                      setShowSuggestions(true);
                    } catch {
                      setAddressSuggestions([]);
                    }
                    setSearchingAddress(false);
                  }, 300);
                } else {
                  setAddressSuggestions([]);
                  setShowSuggestions(false);
                }
              }}
              onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Start typing an address..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500 text-slate-900 bg-white text-sm"
            />
            {searchingAddress && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            )}
            
            {/* Suggestions dropdown */}
            {showSuggestions && addressSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {addressSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAddress(suggestion.display_name);
                      setLatitude(parseFloat(suggestion.lat));
                      setLongitude(parseFloat(suggestion.lon));
                      setCity(suggestion.address?.city || suggestion.address?.town || suggestion.address?.village || "");
                      setState(suggestion.address?.state || "");
                      setUseCurrentLocation(true);
                      setShowSuggestions(false);
                      setAddressSuggestions([]);
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{suggestion.display_name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Map Picker */}
        <div className="mt-3">
          <label className="text-xs text-slate-500 mb-1 block">Or tap on map to set location:</label>
          <div className="h-48 rounded-lg overflow-hidden border border-slate-300">
            <MapContainer
              center={[latitude || 44.9778, longitude || -93.265]}
              zoom={latitude ? 14 : 10}
              className="w-full h-full"
              style={{ background: "#e2e8f0" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {latitude && longitude && (
                <Marker position={[latitude, longitude]} />
              )}
              <MapClickHandler 
                onLocationSelect={async (lat: number, lng: number) => {
                  setLatitude(lat);
                  setLongitude(lng);
                  setUseCurrentLocation(true);
                  // Reverse geocode
                  try {
                    const res = await fetch(
                      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
                    );
                    const data = await res.json();
                    if (data.display_name) {
                      setAddress(data.display_name);
                      setCity(data.address?.city || data.address?.town || data.address?.village || "");
                      setState(data.address?.state || "");
                    }
                  } catch {}
                }}
              />
            </MapContainer>
          </div>
        </div>

        {!useCurrentLocation && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <input
                type="number"
                step="any"
                value={latitude || ""}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
                placeholder="Latitude"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500 text-slate-900 bg-white text-sm"
              />
            </div>
            <div>
              <input
                type="number"
                step="any"
                value={longitude || ""}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
                placeholder="Longitude"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500 text-slate-900 bg-white text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Brief Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., ICE vehicles spotted near downtown"
          required
          maxLength={100}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500 text-slate-900 bg-white"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Description *
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what you observed. Include any relevant details like number of vehicles, agents, or direction of movement."
          required
          rows={4}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500 text-slate-900 bg-white resize-none"
        />
      </div>

      {/* When */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          When did this occur? *
        </label>
        <input
          type="datetime-local"
          value={reportedAt}
          onChange={(e) => setReportedAt(e.target.value)}
          required
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500 text-slate-900 bg-white"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-3">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !latitude || !longitude || !title || !description}
          className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
          Submit Report
        </button>
      </div>

      {/* Privacy note */}
      <p className="text-xs text-slate-500 text-center">
        Reports are reviewed before appearing on the map. Your IP address is not stored.
        Consider using a VPN for additional privacy.
      </p>
    </form>
  );
}

export type ReportStatus = "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED";
export type ReportType = "CRITICAL" | "ACTIVE" | "OBSERVED" | "OTHER";
export type VerificationLevel = "UNVERIFIED" | "VERIFIED" | "TRUSTED";
export type ReportSource = "WEB" | "TELEGRAM" | "SIGNAL" | "AGGREGATED";

export interface Report {
  id: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  type: ReportType;
  status: ReportStatus;
  title: string;
  description: string;
  verificationLevel: VerificationLevel;
  walletAddress?: string;
  source: ReportSource;
  imageUrls: string[];
  reportedAt: string;
  createdAt: string;
  updatedAt: string;
  confirmationCount?: number;
}

export interface ReportSubmission {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  type: ReportType;
  title: string;
  description: string;
  reportedAt: string;
  imageUrls?: string[];
  walletAddress?: string;
  walletSignature?: string;
}

export interface Organization {
  id: string;
  name: string;
  type: string;
  description?: string;
  verified: boolean;
  walletAddress?: string;
  cities: string[];
  states: string[];
}

export interface Subscriber {
  id: string;
  channel: "telegram" | "signal" | "email";
  channelId: string;
  types: ReportType[];
  cities: string[];
  states: string[];
  radiusKm?: number;
  centerLat?: number;
  centerLng?: number;
  active: boolean;
}

export interface MapFilters {
  types: ReportType[];
  confirmedOnly: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  city?: string;
  state?: string;
}

export interface Moderator {
  id: string;
  email: string;
  name: string;
  role: "admin" | "moderator";
  organizationId?: string;
}

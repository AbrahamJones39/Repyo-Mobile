export type Role = "PROVIDER" | "REP" | "COMPANY_ADMIN" | "SUPER_ADMIN";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId: string | null;
  accountState: string;
  adminPermissions: string[];
};

export type RequestData = {
  id: string;
  facilityName: string;
  facilityAddr?: string;
  facilityZipCode?: string | null;
  procedureType: string;
  urgency: string;
  status: string;
  scheduledAt: string;
  department?: string | null;
  physicianName?: string | null;
  notes?: string | null;
  repLat?: number | null;
  repLng?: number | null;
  etaMinutes?: number | null;
  assignedRep?: { id: string; name: string; phone: string | null } | null;
  assignedAdmin?: { id: string; name: string } | null;
  provider?: { id: string; name: string; phone: string | null } | null;
  initiatedByRep?: { id: string; name: string; phone: string | null } | null;
  requesterName?: string | null;
  company?: { name: string } | null;
  deviceManufacturer?: string | null;
  deviceName?: string | null;
  deviceSerial?: string | null;
  patientName?: string | null;
  patientRoom?: string | null;
  crmLookupStatus?: string | null;
  identifiersHidden?: boolean;
  acknowledgedAt?: string | null;
  alertActive?: boolean;
};

export type RepProfile = {
  status?: string;
  onCallEnabled?: boolean;
  travelRadiusMiles?: number;
  products?: string[];
  territories?: {
    state?: string | null;
    county?: string | null;
    zipCode?: string | null;
  }[];
  user?: {
    name: string;
    email?: string;
    phone?: string | null;
    company?: { name: string } | null;
  };
};

export type CalendarPayload = {
  rules: { dayOfWeek: number; startTime: string; endTime: string; dayLabel?: string }[];
  blocks: {
    id: string;
    type: "VACATION" | "OFF";
    startAt: string;
    endAt: string;
    note?: string | null;
  }[];
  requests: {
    id: string;
    facilityName: string;
    procedureType: string | null;
    scheduledAt: string;
    status: string;
  }[];
};

export type TeamInfo = {
  id: string;
  name: string;
  defaultCalendarVisibility: string;
  manager: { name: string };
  members: { id: string; name: string }[];
};

export type HealthcareSite = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
  data?: { requestId?: string } | null;
};

export type ForwardTarget = {
  id: string;
  name: string;
  type: "rep" | "manager";
  territoryLabel: string;
  statusLabel: string;
  onCall: boolean;
  teamNames: string[];
  teamId?: string;
};

export const colors = {
  rose: "#e11d48",
  roseDark: "#be123c",
  roseSoft: "#fff1f2",
  roseBorder: "#fecdd3",
  slate900: "#0f172a",
  slate700: "#334155",
  slate600: "#475569",
  slate500: "#64748b",
  slate400: "#94a3b8",
  slate200: "#e2e8f0",
  slate100: "#f1f5f9",
  slate50: "#f8fafc",
  white: "#ffffff",
  amber50: "#fffbeb",
  amber700: "#b45309",
  red50: "#fef2f2",
  red700: "#b91c1c",
  emerald50: "#ecfdf5",
  emerald700: "#047857",
  indigo50: "#eef2ff",
  indigo700: "#4338ca",
  purple50: "#faf5ff",
  purple700: "#7e22ce",
};

export const statusColors: Record<string, { bg: string; text: string }> = {
  REQUESTING: { bg: "#fffbeb", text: "#b45309" },
  ACCEPTED: { bg: "#eef2ff", text: "#4338ca" },
  EN_ROUTE: { bg: "#faf5ff", text: "#7e22ce" },
  ARRIVED: { bg: "#fff1f2", text: "#be123c" },
  COMPLETED: { bg: "#ecfdf5", text: "#047857" },
  CANCELLED: { bg: "#f1f5f9", text: "#64748b" },
  DECLINED: { bg: "#fef2f2", text: "#b91c1c" },
};

export const urgencyColors: Record<string, { bg: string; text: string }> = {
  ASAP: { bg: "#fef2f2", text: "#b91c1c" },
  SAME_DAY: { bg: "#fff7ed", text: "#c2410c" },
  SCHEDULED: { bg: "#f1f5f9", text: "#475569" },
};

export const requestStatusLabels: Record<string, string> = {
  REQUESTING: "Requesting",
  ACCEPTED: "Accepted",
  EN_ROUTE: "En Route",
  ARRIVED: "Arrived",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DECLINED: "Declined",
};

export const urgencyLabels: Record<string, string> = {
  ASAP: "ASAP",
  SAME_DAY: "Same Day",
  SCHEDULED: "Scheduled",
};

export const repStatusLabels: Record<string, string> = {
  AVAILABLE: "Available",
  BUSY: "Busy",
  OFF_DUTY: "Off Duty",
  VACATION: "Vacation",
};

export const procedureTypes = [
  "PPM",
  "ICD",
  "CRT",
  "Extraction",
  "Loop",
  "EP Study",
  "Ablation",
  "Watchman",
  "Structural Heart",
  "Leadless PPM",
  "CRT-D",
  "CRT-P",
  "Other",
];

import { EmptyState, ErrorBanner, StatusBadge, UrgencyBadge } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { api } from "@/lib/api";
import { formatWhen } from "@/lib/format";
import { colors, repStatusLabels } from "@/lib/theme";
import type { NotificationItem, RequestData, TeamMetrics } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const STATUSES = ["AVAILABLE", "BUSY", "OFF_DUTY", "VACATION"] as const;

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [status, setStatus] = useState("OFF_DUTY");
  const [onCall, setOnCall] = useState(false);
  const [unread, setUnread] = useState(0);
  const [metrics, setMetrics] = useState<TeamMetrics | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const [reqData, profile, notes, teamMetrics] = await Promise.all([
        api<RequestData[]>("/api/requests"),
        api<{ status?: string; onCallEnabled?: boolean } | null>("/api/rep/profile"),
        api<NotificationItem[]>("/api/notifications"),
        api<TeamMetrics>("/api/rep/team-metrics").catch(() => null),
      ]);
      setRequests(Array.isArray(reqData) ? reqData : []);
      if (profile?.status) setStatus(profile.status);
      if (profile?.onCallEnabled != null) setOnCall(profile.onCallEnabled);
      setUnread(notes.filter((n) => !n.read).length);
      setMetrics(teamMetrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(load, 20000);
      return () => clearInterval(timer);
    }, [load])
  );

  async function updateStatus(next: string) {
    try {
      await api("/api/rep/profile", {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setStatus(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status");
    }
  }

  async function toggleOnCall() {
    try {
      const next = !onCall;
      await api("/api/rep/profile", {
        method: "PATCH",
        body: JSON.stringify({ onCallEnabled: next }),
      });
      setOnCall(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update on-call");
    }
  }

  const mine = requests.filter(
    (r) =>
      ["ACCEPTED", "EN_ROUTE", "ARRIVED"].includes(r.status) ||
      (r.status === "REQUESTING" && r.assignedRep?.id === user?.id)
  );
  const adminQueue = requests.filter(
    (r) => r.status === "REQUESTING" && r.assignedRep?.id !== user?.id
  );
  const urgent = [...adminQueue, ...mine].filter((r) => r.urgency === "ASAP");

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
    >
      <View style={styles.topRow}>
        <View>
          <Text style={styles.hello}>Hi {user?.name?.split(" ")[0] ?? "there"}</Text>
          <Text style={styles.meta}>
            {mine.length} active · {urgent.length} urgent
          </Text>
        </View>
        <Pressable style={styles.bell} onPress={() => router.push("/notifications")}>
          <Ionicons name="notifications-outline" size={22} color={colors.slate700} />
          {unread > 0 ? (
            <View style={styles.dot}>
              <Text style={styles.dotText}>{unread > 9 ? "9+" : unread}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <ErrorBanner message={error} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your status</Text>
        <View style={styles.chipRow}>
          {STATUSES.map((s) => (
            <Pressable
              key={s}
              onPress={() => updateStatus(s)}
              style={[styles.chip, status === s && styles.chipOn]}
            >
              <Text style={[styles.chipText, status === s && styles.chipTextOn]}>
                {repStatusLabels[s]}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={toggleOnCall}
          style={[styles.onCall, onCall && styles.onCallActive]}
        >
          <Text style={[styles.onCallText, onCall && styles.onCallTextActive]}>
            {onCall ? "On call — active" : "Off call"}
          </Text>
        </Pressable>
      </View>

      {metrics && metrics.reportCount > 0 && metrics.totals ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>People you oversee</Text>
          <Text style={styles.metricsNote}>
            Operational metrics for your reporting line. Patient information is not included.
          </Text>
          <View style={styles.metricsRow}>
            {[
              ["Reps", metrics.reportCount],
              ["Available", metrics.totals.available],
              ["Active", metrics.totals.active],
              ["Done", metrics.totals.completed],
              ["Escalated", metrics.totals.escalated],
            ].map(([label, value]) => (
              <View key={String(label)} style={styles.metric}>
                <Text style={styles.metricLabel}>{label}</Text>
                <Text style={styles.metricValue}>{value}</Text>
              </View>
            ))}
          </View>
          {metrics.reports?.length ? (
            <Text style={styles.metricsNote}>{metrics.reports.join(", ")}</Text>
          ) : null}
        </View>
      ) : null}

      {urgent.length > 0 ? (
        <Section title="ASAP" items={urgent} />
      ) : null}

      {adminQueue.length > 0 ? (
        <Section title="Admin queue (forwarded)" items={adminQueue} />
      ) : null}

      <Text style={styles.section}>Your assignments</Text>
      {mine.length === 0 ? (
        <EmptyState
          title="No pending requests"
          subtitle="Go available so new cases can route to you."
        />
      ) : (
        mine.map((request) => <RequestRow key={request.id} request={request} />)
      )}
      {mine.length === 0 && status !== "AVAILABLE" ? (
        <Pressable onPress={() => updateStatus("AVAILABLE")} style={styles.goAvailable}>
          <Text style={styles.goAvailableText}>Go available</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function Section({ title, items }: { title: string; items: RequestData[] }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.section}>{title}</Text>
      {items.map((request) => (
        <RequestRow key={request.id} request={request} />
      ))}
    </View>
  );
}

function RequestRow({ request }: { request: RequestData }) {
  const router = useRouter();
  return (
    <Pressable
      style={styles.request}
      onPress={() => router.push(`/request/${request.id}`)}
    >
      <View style={styles.requestTop}>
        <Text style={styles.facility} numberOfLines={1}>
          {request.facilityName}
        </Text>
        <StatusBadge status={request.status} />
      </View>
      <Text style={styles.procedure}>{request.procedureType}</Text>
      <View style={styles.requestMeta}>
        <UrgencyBadge urgency={request.urgency} />
        <Text style={styles.when}>{formatWhen(request.scheduledAt)}</Text>
        {request.alertActive ? <Text style={styles.newBadge}>New</Text> : null}
      </View>
      {request.status === "EN_ROUTE" && request.etaMinutes != null ? (
        <Text style={styles.eta}>ETA {request.etaMinutes} min</Text>
      ) : null}
      {request.identifiersHidden ? (
        <Text style={styles.hidden}>Open to acknowledge and view details</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16, paddingBottom: 40 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  hello: { fontSize: 24, fontWeight: "800", color: colors.slate900 },
  meta: { marginTop: 4, color: colors.slate500 },
  bell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.rose,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  dotText: { color: colors.white, fontSize: 9, fontWeight: "800" },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 16,
    marginBottom: 18,
  },
  cardTitle: { fontWeight: "700", color: colors.slate700, marginBottom: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 999,
    backgroundColor: colors.slate100,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipOn: { backgroundColor: colors.rose },
  chipText: { color: colors.slate600, fontWeight: "600", fontSize: 13 },
  chipTextOn: { color: colors.white },
  onCall: {
    marginTop: 12,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: colors.slate100,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  onCallActive: { backgroundColor: colors.rose },
  onCallText: { color: colors.slate600, fontWeight: "700" },
  onCallTextActive: { color: colors.white },
  section: {
    marginBottom: 10,
    marginTop: 8,
    fontSize: 12,
    fontWeight: "800",
    color: colors.slate500,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  request: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 14,
    marginBottom: 10,
  },
  requestTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
  },
  facility: { flex: 1, fontWeight: "700", color: colors.slate900, fontSize: 16 },
  procedure: { marginTop: 4, color: colors.slate600 },
  requestMeta: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  when: { color: colors.slate500, fontSize: 12 },
  newBadge: {
    color: colors.rose,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  eta: { marginTop: 8, color: colors.purple700, fontWeight: "700", fontSize: 13 },
  hidden: { marginTop: 8, color: colors.amber700, fontSize: 12, fontWeight: "600" },
  metricsNote: { color: colors.slate500, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  metricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metric: { minWidth: 56 },
  metricLabel: { color: colors.slate500, fontSize: 11 },
  metricValue: { fontSize: 20, fontWeight: "800", color: colors.slate900 },
  goAvailable: {
    marginTop: 12,
    alignSelf: "center",
    backgroundColor: colors.rose,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  goAvailableText: { color: colors.white, fontWeight: "700" },
});

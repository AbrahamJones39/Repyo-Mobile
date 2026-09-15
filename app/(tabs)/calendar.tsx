import { EmptyState, ErrorBanner, PrimaryButton, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { formatWhen, monthKey } from "@/lib/format";
import { colors } from "@/lib/theme";
import type { CalendarPayload } from "@/lib/types";
import { useRouter } from "expo-router";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  startOfMonth,
  subMonths,
} from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEFAULT_RULES: CalendarPayload["rules"] = [1, 2, 3, 4, 5].map((day) => ({
  dayOfWeek: day,
  startTime: "08:00",
  endTime: "17:00",
  dayLabel: WEEKDAYS[day],
}));

export default function CalendarScreen() {
  const router = useRouter();
  const [viewDate, setViewDate] = useState(new Date());
  const [data, setData] = useState<CalendarPayload | null>(null);
  const [error, setError] = useState("");
  const [vacationStart, setVacationStart] = useState("");
  const [vacationEnd, setVacationEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const month = monthKey(viewDate);

  const load = useCallback(async () => {
    setError("");
    try {
      const payload = await api<CalendarPayload>(`/api/rep/calendar?month=${month}`);
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar");
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const days = useMemo(() => {
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    const gridStart = new Date(start);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());
    const gridEnd = new Date(end);
    gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewDate]);

  const requestDays = new Set(
    (data?.requests ?? []).map((r) => format(new Date(r.scheduledAt), "yyyy-MM-dd"))
  );

  async function addVacation() {
    if (!vacationStart || !vacationEnd) return;
    setSaving(true);
    setError("");
    try {
      await api("/api/rep/calendar", {
        method: "POST",
        body: JSON.stringify({
          type: "VACATION",
          startAt: new Date(vacationStart).toISOString(),
          endAt: new Date(vacationEnd).toISOString(),
        }),
      });
      setVacationStart("");
      setVacationEnd("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add time off");
    } finally {
      setSaving(false);
    }
  }

  async function saveHours() {
    setSaving(true);
    setError("");
    try {
      await api("/api/rep/calendar", {
        method: "PUT",
        body: JSON.stringify({ rules: data?.rules?.length ? data.rules : DEFAULT_RULES }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save hours");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ErrorBanner message={error} />
      <View style={styles.monthNav}>
        <Pressable onPress={() => setViewDate((d) => subMonths(d, 1))}>
          <Text style={styles.nav}>‹</Text>
        </Pressable>
        <Text style={styles.month}>{format(viewDate, "MMMM yyyy")}</Text>
        <Pressable onPress={() => setViewDate((d) => addMonths(d, 1))}>
          <Text style={styles.nav}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const current = isSameMonth(day, viewDate);
          const hasRequest = requestDays.has(key);
          return (
            <View key={key} style={[styles.day, !current && { opacity: 0.35 }]}>
              <Text style={styles.dayNum}>{format(day, "d")}</Text>
              {hasRequest ? <View style={styles.dot} /> : null}
            </View>
          );
        })}
      </View>

      <Text style={styles.section}>This month</Text>
      {(data?.requests ?? []).length === 0 ? (
        <EmptyState title="No assignments this month" />
      ) : (
        data?.requests.map((request) => (
          <Pressable
            key={request.id}
            style={styles.item}
            onPress={() => router.push(`/request/${request.id}`)}
          >
            <View style={styles.itemTop}>
              <Text style={styles.itemTitle}>{request.facilityName}</Text>
              <StatusBadge status={request.status} />
            </View>
            <Text style={styles.itemMeta}>
              {request.procedureType ?? "Case"} · {formatWhen(request.scheduledAt)}
            </Text>
          </Pressable>
        ))
      )}

      <Text style={styles.section}>Weekly hours</Text>
      <View style={styles.card}>
        {(data?.rules?.length ? data.rules : DEFAULT_RULES).map((rule) => (
          <Text key={rule.dayOfWeek} style={styles.hours}>
            {rule.dayLabel ?? WEEKDAYS[rule.dayOfWeek]} · {rule.startTime}–{rule.endTime}
          </Text>
        ))}
        <PrimaryButton
          title="Save weekday hours"
          variant="outline"
          onPress={saveHours}
          loading={saving}
          style={{ marginTop: 10 }}
        />
      </View>

      <Text style={styles.section}>Time off</Text>
      <View style={styles.card}>
        <TextInput
          value={vacationStart}
          onChangeText={setVacationStart}
          placeholder="Start (YYYY-MM-DD)"
          placeholderTextColor={colors.slate400}
          style={styles.input}
        />
        <TextInput
          value={vacationEnd}
          onChangeText={setVacationEnd}
          placeholder="End (YYYY-MM-DD)"
          placeholderTextColor={colors.slate400}
          style={styles.input}
        />
        <PrimaryButton title="Add vacation" onPress={addVacation} loading={saving} />
        {(data?.blocks ?? []).map((block) => (
          <Text key={block.id} style={styles.block}>
            {block.type} · {format(new Date(block.startAt), "MMM d")} –{" "}
            {format(new Date(block.endAt), "MMM d")}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16, paddingBottom: 40 },
  monthNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  month: { fontSize: 20, fontWeight: "800", color: colors.slate900 },
  nav: { fontSize: 28, color: colors.rose, paddingHorizontal: 8 },
  weekRow: { flexDirection: "row" },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: "center",
    color: colors.slate400,
    fontSize: 11,
    fontWeight: "700",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 8, marginBottom: 16 },
  day: {
    width: `${100 / 7}%`,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNum: { color: colors.slate700, fontWeight: "600" },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.rose,
    marginTop: 2,
  },
  section: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: "800",
    color: colors.slate500,
    textTransform: "uppercase",
  },
  item: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 14,
    marginBottom: 8,
  },
  itemTop: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  itemTitle: { flex: 1, fontWeight: "700", color: colors.slate900 },
  itemMeta: { marginTop: 6, color: colors.slate500, fontSize: 13 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 14,
    marginBottom: 16,
  },
  hours: { color: colors.slate600, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    color: colors.slate900,
  },
  block: { marginTop: 10, color: colors.slate600 },
});

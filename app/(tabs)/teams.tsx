import { EmptyState, ErrorBanner } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { api } from "@/lib/api";
import { formatWhen, monthKey } from "@/lib/format";
import { colors } from "@/lib/theme";
import type { TeamInfo } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type SharedAssignment = {
  id: string;
  facilityName: string;
  scheduledAt: string;
  status: string;
  repName: string;
  teamCalendarVisibility?: string;
};

type MyAssignment = {
  id: string;
  facilityName: string;
  scheduledAt: string;
  teamCalendarVisibility: string;
};

export default function TeamsScreen() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [shared, setShared] = useState<SharedAssignment[]>([]);
  const [mine, setMine] = useState<MyAssignment[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const teamData = await api<{ teams: TeamInfo[] }>("/api/rep/teams");
      const nextTeams = teamData.teams ?? [];
      setTeams(nextTeams);
      const tid = selectedId || nextTeams[0]?.id || "";
      setSelectedId(tid);
      if (!tid) {
        setShared([]);
        setMine([]);
        return;
      }
      const coverage = await api<{
        teams: {
          sharedAssignments: SharedAssignment[];
          members: { id: string; assignments?: MyAssignment[] }[];
        }[];
      }>(`/api/company/teams/coverage?teamId=${tid}&month=${monthKey(new Date())}`);
      const team = coverage.teams?.[0];
      setShared(team?.sharedAssignments ?? []);
      const me = team?.members.find((m) => m.id === user?.id);
      setMine(me?.assignments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
    }
  }, [selectedId, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = teams.find((t) => t.id === selectedId);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ErrorBanner message={error} />
      <Text style={styles.lead}>
        Team calendar shows shared assignments only. Your manager always sees your schedule.
      </Text>
      {teams.length === 0 ? (
        <EmptyState title="No teams yet" subtitle="Ask your manager to add you." />
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pills}>
            {teams.map((team) => (
              <Pressable
                key={team.id}
                onPress={() => setSelectedId(team.id)}
                style={[styles.pill, selectedId === team.id && styles.pillOn]}
              >
                <Text style={[styles.pillText, selectedId === team.id && styles.pillTextOn]}>
                  {team.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {selected ? (
            <View style={styles.card}>
              <Text style={styles.title}>{selected.name}</Text>
              <Text style={styles.meta}>Manager: {selected.manager.name}</Text>
              <Text style={styles.section}>Members</Text>
              {selected.members.map((member) => (
                <Text key={member.id} style={styles.member}>
                  {member.name}
                  {member.id === user?.id ? " (you)" : ""}
                </Text>
              ))}
            </View>
          ) : null}

          {mine.length > 0 ? (
            <>
              <Text style={styles.section}>My assignments — peer visibility</Text>
              {mine.map((item) => (
                <View key={item.id} style={styles.item}>
                  <Text style={styles.itemTitle}>{item.facilityName}</Text>
                  <Text style={styles.meta}>{formatWhen(item.scheduledAt)}</Text>
                  <View style={styles.visRow}>
                    {(
                      [
                        ["SHARED_WITH_TEAM", "Share with team"],
                        ["HIDDEN_FROM_TEAM_PEERS", "Hide from peers"],
                      ] as const
                    ).map(([value, label]) => {
                      const on = item.teamCalendarVisibility === value;
                      return (
                        <Pressable
                          key={value}
                          onPress={async () => {
                            try {
                              await api(`/api/requests/${item.id}`, {
                                method: "PATCH",
                                body: JSON.stringify({ teamCalendarVisibility: value }),
                              });
                              await load();
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Update failed");
                            }
                          }}
                          style={[styles.visChip, on && styles.visChipOn]}
                        >
                          <Text style={[styles.visText, on && styles.visTextOn]}>{label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </>
          ) : null}

          <Text style={styles.section}>Shared assignments</Text>
          {shared.length === 0 ? (
            <EmptyState title="Nothing shared this month" />
          ) : (
            shared.map((item) => (
              <View key={item.id} style={styles.item}>
                <Text style={styles.itemTitle}>{item.facilityName}</Text>
                <Text style={styles.meta}>
                  {item.repName} · {formatWhen(item.scheduledAt)}
                </Text>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16, paddingBottom: 40 },
  lead: { color: colors.slate500, marginBottom: 14, lineHeight: 20 },
  pills: { marginBottom: 14 },
  pill: {
    marginRight: 8,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillOn: { backgroundColor: colors.rose, borderColor: colors.rose },
  pillText: { color: colors.slate600, fontWeight: "700" },
  pillTextOn: { color: colors.white },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 16,
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: "800", color: colors.slate900 },
  meta: { marginTop: 4, color: colors.slate500 },
  section: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "800",
    color: colors.slate500,
    textTransform: "uppercase",
  },
  member: { color: colors.slate700, marginBottom: 4 },
  item: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 14,
    marginBottom: 8,
  },
  itemTitle: { fontWeight: "700", color: colors.slate900 },
  visRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  visChip: {
    borderRadius: 999,
    backgroundColor: colors.slate100,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  visChipOn: { backgroundColor: colors.rose },
  visText: { color: colors.slate600, fontWeight: "600", fontSize: 12 },
  visTextOn: { color: colors.white },
});

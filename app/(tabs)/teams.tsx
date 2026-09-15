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
};

export default function TeamsScreen() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [shared, setShared] = useState<SharedAssignment[]>([]);
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
        return;
      }
      const coverage = await api<{
        teams: { sharedAssignments: SharedAssignment[] }[];
      }>(`/api/company/teams/coverage?teamId=${tid}&month=${monthKey(new Date())}`);
      setShared(coverage.teams?.[0]?.sharedAssignments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
    }
  }, [selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = teams.find((t) => t.id === selectedId);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ErrorBanner message={error} />
      {teams.length === 0 ? (
        <EmptyState title="No teams yet" subtitle="Your company admin can add you to a team." />
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
});

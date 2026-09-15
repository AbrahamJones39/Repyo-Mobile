import { EmptyState, ErrorBanner } from "@/components/ui";
import { api } from "@/lib/api";
import { formatWhen } from "@/lib/format";
import { colors } from "@/lib/theme";
import type { NotificationItem } from "@/lib/types";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text } from "react-native";

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await api<NotificationItem[]>("/api/notifications");
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function open(item: NotificationItem) {
    const unread = items.filter((n) => !n.read).map((n) => n.id);
    if (unread.length > 0) {
      try {
        await api("/api/notifications", {
          method: "PATCH",
          body: JSON.stringify({ ids: unread }),
        });
      } catch {
        // Keep navigation even if mark-read fails.
      }
    }
    if (item.data?.requestId) {
      router.push(`/request/${item.data.requestId}`);
    }
  }

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
      <ErrorBanner message={error} />
      {items.length === 0 ? (
        <EmptyState title="No notifications" subtitle="New assignments will show up here." />
      ) : (
        items.map((item) => (
          <Pressable key={item.id} style={styles.item} onPress={() => open(item)}>
            <Text style={[styles.title, !item.read && styles.unread]}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.when}>{formatWhen(item.createdAt)}</Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16 },
  item: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 14,
    marginBottom: 10,
  },
  title: { fontWeight: "600", color: colors.slate700 },
  unread: { color: colors.slate900, fontWeight: "800" },
  body: { marginTop: 4, color: colors.slate600 },
  when: { marginTop: 8, color: colors.slate400, fontSize: 12 },
});

import { EmptyState, ErrorBanner, PrimaryButton } from "@/components/ui";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";
import type { HealthcareSite } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

export default function FacilitiesScreen() {
  const [sites, setSites] = useState<HealthcareSite[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HealthcareSite[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await api<HealthcareSite[]>("/api/rep/site-coverage");
      setSites(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load facilities");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function searchSites(text: string) {
    setQuery(text);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    try {
      const data = await api<HealthcareSite[]>(
        `/api/healthcare-sites?q=${encodeURIComponent(text.trim())}&limit=8`
      );
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await api<HealthcareSite[]>("/api/rep/site-coverage", {
        method: "PUT",
        body: JSON.stringify({ siteIds: sites.map((s) => s.id) }),
      });
      setSites(Array.isArray(updated) ? updated : sites);
      setMessage("Facilities saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save facilities");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>
        Facilities you cover. Incoming requests go to reps who cover that hospital, or whoever
        covers the nearest one.
      </Text>
      <ErrorBanner message={error} />
      {message ? (
        <View style={styles.ok}>
          <Text style={styles.okText}>{message}</Text>
        </View>
      ) : null}

      <TextInput
        value={query}
        onChangeText={searchSites}
        placeholder="Search hospitals or clinics"
        placeholderTextColor={colors.slate400}
        style={styles.input}
      />
      {results.map((site) => (
        <Pressable
          key={site.id}
          style={styles.item}
          onPress={() => {
            if (!sites.some((s) => s.id === site.id)) {
              setSites([...sites, site]);
            }
            setQuery("");
            setResults([]);
          }}
        >
          <Text style={styles.itemTitle}>{site.name}</Text>
          <Text style={styles.meta}>
            {[site.city, site.state, site.zipCode].filter(Boolean).join(", ")}
          </Text>
        </Pressable>
      ))}

      <Text style={styles.section}>Covered locations</Text>
      {sites.length === 0 ? (
        <EmptyState
          title="No facilities yet"
          subtitle="Search the directory to add the hospitals and clinics you cover."
        />
      ) : (
        sites.map((site) => (
          <Pressable
            key={site.id}
            style={styles.item}
            onPress={() => setSites(sites.filter((s) => s.id !== site.id))}
          >
            <Text style={styles.itemTitle}>{site.name}</Text>
            <Text style={styles.meta}>
              {[site.address, site.city, site.state].filter(Boolean).join(", ") || "Tap to remove"}
            </Text>
          </Pressable>
        ))
      )}

      <PrimaryButton title="Save facilities" onPress={save} loading={saving} style={{ marginTop: 16 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16, paddingBottom: 40 },
  lead: { color: colors.slate500, marginBottom: 14, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    color: colors.slate900,
  },
  section: {
    marginTop: 10,
    marginBottom: 8,
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
    padding: 12,
    marginBottom: 8,
  },
  itemTitle: { fontWeight: "700", color: colors.slate900 },
  meta: { marginTop: 4, color: colors.slate500, fontSize: 13 },
  ok: {
    backgroundColor: colors.emerald50,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  okText: { color: colors.emerald700, fontWeight: "600" },
});

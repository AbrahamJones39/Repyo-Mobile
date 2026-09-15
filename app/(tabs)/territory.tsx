import { EmptyState, ErrorBanner, PrimaryButton } from "@/components/ui";
import { api } from "@/lib/api";
import { colors, procedureTypes } from "@/lib/theme";
import type { HealthcareSite, RepProfile } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Territory = { state: string; county: string; zipCode: string };

export default function TerritoryScreen() {
  const [profile, setProfile] = useState<RepProfile | null>(null);
  const [territories, setTerritories] = useState<Territory[]>([
    { state: "", county: "", zipCode: "" },
  ]);
  const [sites, setSites] = useState<HealthcareSite[]>([]);
  const [radius, setRadius] = useState("50");
  const [products, setProducts] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HealthcareSite[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const [data, covered] = await Promise.all([
        api<RepProfile | null>("/api/rep/profile"),
        api<HealthcareSite[]>("/api/rep/site-coverage"),
      ]);
      setProfile(data);
      setSites(covered ?? []);
      setRadius(String(data?.travelRadiusMiles ?? 50));
      setProducts(data?.products ?? []);
      const rows =
        data?.territories?.map((t) => ({
          state: t.state ?? "",
          county: t.county ?? "",
          zipCode: t.zipCode ?? "",
        })) ?? [];
      setTerritories(rows.length ? rows : [{ state: "", county: "", zipCode: "" }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load territory");
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
      await Promise.all([
        api("/api/rep/territory", {
          method: "PUT",
          body: JSON.stringify({
            territories: territories.filter((t) => t.state || t.county || t.zipCode),
          }),
        }),
        api("/api/rep/site-coverage", {
          method: "PUT",
          body: JSON.stringify({ siteIds: sites.map((s) => s.id) }),
        }),
        api("/api/rep/profile", {
          method: "PATCH",
          body: JSON.stringify({
            travelRadiusMiles: Number(radius) || 50,
            products,
          }),
        }),
      ]);
      setMessage("Territory saved");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ErrorBanner message={error} />
      {message ? (
        <View style={styles.ok}>
          <Text style={styles.okText}>{message}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.title}>{profile?.user?.company?.name ?? "Your coverage"}</Text>
        <Text style={styles.label}>Travel radius (miles)</Text>
        <TextInput
          value={radius}
          onChangeText={setRadius}
          keyboardType="number-pad"
          style={styles.input}
        />
        <Text style={styles.label}>Products</Text>
        <View style={styles.chipRow}>
          {procedureTypes.map((product) => {
            const on = products.includes(product);
            return (
              <Pressable
                key={product}
                onPress={() =>
                  setProducts((prev) =>
                    prev.includes(product)
                      ? prev.filter((p) => p !== product)
                      : [...prev, product]
                  )
                }
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{product}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={styles.section}>Zip / county coverage</Text>
      {territories.map((row, idx) => (
        <View key={idx} style={styles.card}>
          <TextInput
            value={row.state}
            onChangeText={(state) => {
              const next = [...territories];
              next[idx] = { ...row, state };
              setTerritories(next);
            }}
            placeholder="State"
            placeholderTextColor={colors.slate400}
            style={styles.input}
          />
          <TextInput
            value={row.county}
            onChangeText={(county) => {
              const next = [...territories];
              next[idx] = { ...row, county };
              setTerritories(next);
            }}
            placeholder="County"
            placeholderTextColor={colors.slate400}
            style={styles.input}
          />
          <TextInput
            value={row.zipCode}
            onChangeText={(zipCode) => {
              const next = [...territories];
              next[idx] = { ...row, zipCode };
              setTerritories(next);
            }}
            placeholder="ZIP"
            placeholderTextColor={colors.slate400}
            style={styles.input}
          />
        </View>
      ))}
      <PrimaryButton
        title="Add territory"
        variant="outline"
        onPress={() => setTerritories([...territories, { state: "", county: "", zipCode: "" }])}
      />

      <Text style={styles.section}>Covered sites</Text>
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
      {sites.length === 0 ? (
        <EmptyState title="No covered sites yet" />
      ) : (
        sites.map((site) => (
          <Pressable
            key={site.id}
            style={styles.item}
            onPress={() => setSites(sites.filter((s) => s.id !== site.id))}
          >
            <Text style={styles.itemTitle}>{site.name}</Text>
            <Text style={styles.meta}>Tap to remove</Text>
          </Pressable>
        ))
      )}

      <PrimaryButton title="Save territory" onPress={save} loading={saving} style={{ marginTop: 16 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 14,
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: "800", color: colors.slate900, marginBottom: 10 },
  label: { color: colors.slate700, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    color: colors.slate900,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 999,
    backgroundColor: colors.slate100,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipOn: { backgroundColor: colors.rose },
  chipText: { color: colors.slate600, fontWeight: "600", fontSize: 12 },
  chipTextOn: { color: colors.white },
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

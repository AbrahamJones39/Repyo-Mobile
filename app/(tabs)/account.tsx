import { BrandMark, ErrorBanner, PrimaryButton } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { api, DEFAULT_API_URL, getApiUrl, setApiUrl } from "@/lib/api";
import { colors, repStatusLabels } from "@/lib/theme";
import type { AccountProfile } from "@/lib/types";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

export default function AccountScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [phone, setPhone] = useState("");
  const [serverUrl, setServerUrl] = useState(DEFAULT_API_URL);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getApiUrl().then(setServerUrl);
    apiProfile();
  }, []);

  async function apiProfile() {
    try {
      const data = await api<AccountProfile>("/api/profile");
      setProfile(data);
      setPhone(data.phone ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BrandMark />
      <Text style={styles.caption}>Device representative app</Text>

      <View style={styles.card}>
        <Text style={styles.name}>{profile?.name ?? user?.name}</Text>
        <Text style={styles.meta}>{profile?.email ?? user?.email}</Text>
        <Text style={styles.meta}>Role: Device rep</Text>
        {profile?.company?.name ? <Text style={styles.meta}>{profile.company.name}</Text> : null}
        {profile?.manager?.name ? (
          <Text style={styles.meta}>Manager: {profile.manager.name}</Text>
        ) : null}
        {profile?.homeOrgUnit?.name ? (
          <Text style={styles.meta}>
            Org: {profile.homeOrgUnit.name}
            {profile.homeOrgUnit.typeLabel ? ` · ${profile.homeOrgUnit.typeLabel}` : ""}
          </Text>
        ) : null}
        {profile?.repProfile?.status ? (
          <Text style={styles.meta}>
            Status: {repStatusLabels[profile.repProfile.status] ?? profile.repProfile.status}
            {profile.repProfile.onCallEnabled ? " · On call" : ""}
          </Text>
        ) : null}
        {profile?.repProfile?.credentialStatus ? (
          <Text style={styles.meta}>Credential: {profile.repProfile.credentialStatus}</Text>
        ) : null}
        {profile?.repProfile?.products?.length ? (
          <Text style={styles.meta}>Products: {profile.repProfile.products.join(", ")}</Text>
        ) : null}
      </View>

      <ErrorBanner message={error} />
      {message ? (
        <View style={styles.ok}>
          <Text style={styles.okText}>{message}</Text>
        </View>
      ) : null}

      <Text style={styles.label}>Phone</Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="Mobile number"
        placeholderTextColor={colors.slate400}
        style={styles.input}
      />
      <PrimaryButton
        title="Save profile"
        variant="outline"
        loading={saving}
        onPress={async () => {
          setSaving(true);
          setError("");
          setMessage("");
          try {
            await api("/api/profile", {
              method: "PATCH",
              body: JSON.stringify({ phone: phone.trim() || null }),
            });
            setMessage("Profile saved");
            await apiProfile();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save profile");
          } finally {
            setSaving(false);
          }
        }}
      />

      <Text style={[styles.label, { marginTop: 20 }]}>API server</Text>
      <TextInput
        value={serverUrl}
        onChangeText={setServerUrl}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      <PrimaryButton
        title="Save server"
        variant="outline"
        onPress={async () => {
          setError("");
          try {
            await setApiUrl(serverUrl);
            setMessage("Server saved. Sign in again if you changed it.");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save server");
          }
        }}
      />

      <PrimaryButton title="Sign out" onPress={logout} style={{ marginTop: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16, paddingBottom: 40 },
  caption: { marginTop: 8, marginBottom: 20, color: colors.slate500 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 16,
    marginBottom: 20,
  },
  name: { fontSize: 20, fontWeight: "800", color: colors.slate900 },
  meta: { marginTop: 4, color: colors.slate500 },
  label: { fontWeight: "600", color: colors.slate700, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    color: colors.slate900,
  },
  ok: {
    backgroundColor: colors.emerald50,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  okText: { color: colors.emerald700, fontWeight: "600" },
});

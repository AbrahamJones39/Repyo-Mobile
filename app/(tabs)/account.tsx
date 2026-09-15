import { BrandMark, ErrorBanner, PrimaryButton } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { DEFAULT_API_URL, getApiUrl, setApiUrl } from "@/lib/api";
import { colors } from "@/lib/theme";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

export default function AccountScreen() {
  const { user, logout } = useAuth();
  const [serverUrl, setServerUrl] = useState(DEFAULT_API_URL);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getApiUrl().then(setServerUrl);
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BrandMark />
      <Text style={styles.caption}>Device representative app</Text>

      <View style={styles.card}>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.meta}>{user?.email}</Text>
        <Text style={styles.meta}>Role: Device rep</Text>
      </View>

      <ErrorBanner message={error} />
      {message ? (
        <View style={styles.ok}>
          <Text style={styles.okText}>{message}</Text>
        </View>
      ) : null}

      <Text style={styles.label}>API server</Text>
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

import { BrandMark, ErrorBanner, PrimaryButton } from "@/components/ui";
import { useAuth } from "@/context/auth";
import {
  DEFAULT_API_URL,
  getApiUrl,
  isLocalDevApiUrl,
  suggestedLocalApiUrl,
} from "@/lib/api";
import { colors } from "@/lib/theme";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [serverUrl, setServerUrl] = useState(DEFAULT_API_URL);
  const [showServer, setShowServer] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getApiUrl().then((url) => {
      setServerUrl(isLocalDevApiUrl(url) ? DEFAULT_API_URL : url);
    });
  }, []);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password, serverUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BrandMark size="lg" />
        <Text style={styles.subtitle}>Rep app for field assignments</Text>

        <ErrorBanner message={error} />

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@company.com"
          placeholderTextColor={colors.slate400}
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="Password"
            placeholderTextColor={colors.slate400}
            style={[styles.input, { marginBottom: 0, paddingRight: 44 }]}
          />
          <Pressable style={styles.eye} onPress={() => setShowPassword((v) => !v)}>
            <Text style={styles.eyeText}>{showPassword ? "Hide" : "Show"}</Text>
          </Pressable>
        </View>

        <PrimaryButton
          title={loading ? "Signing in..." : "Sign In"}
          onPress={submit}
          loading={loading}
          disabled={!email || !password}
          style={{ marginTop: 18 }}
        />

        <Text style={styles.serverLine}>Server: {serverUrl || DEFAULT_API_URL}</Text>

        <Pressable onPress={() => setShowServer((v) => !v)} style={styles.serverToggle}>
          <Text style={styles.serverToggleText}>
            {showServer ? "Hide server" : "Advanced: change server"}
          </Text>
        </Pressable>
        {showServer ? (
          <>
            <Text style={styles.label}>API server</Text>
            <TextInput
              value={serverUrl}
              onChangeText={setServerUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder={suggestedLocalApiUrl()}
              placeholderTextColor={colors.slate400}
              style={styles.input}
            />
            <Pressable onPress={() => setServerUrl(DEFAULT_API_URL)}>
              <Text style={styles.serverHint}>Use production: {DEFAULT_API_URL}</Text>
            </Pressable>
            <Pressable
              onPress={() => setServerUrl(suggestedLocalApiUrl())}
              style={{ marginBottom: 8 }}
            >
              <Text style={styles.serverHint}>Use local website: {suggestedLocalApiUrl()}</Text>
            </Pressable>
          </>
        ) : null}

        <Text style={styles.hint}>
          Device reps only. This app talks to https://gorepyo.com unless you change the server.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { flexGrow: 1, justifyContent: "center", padding: 24 },
  subtitle: {
    marginTop: 8,
    marginBottom: 28,
    color: colors.slate500,
    fontSize: 15,
  },
  label: {
    marginBottom: 6,
    color: colors.slate700,
    fontWeight: "600",
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.slate900,
    marginBottom: 14,
    backgroundColor: colors.white,
  },
  passwordWrap: { position: "relative", marginBottom: 4 },
  eye: { position: "absolute", right: 12, top: 14 },
  eyeText: { color: colors.slate500, fontWeight: "600" },
  serverLine: {
    marginTop: 14,
    textAlign: "center",
    color: colors.slate400,
    fontSize: 12,
  },
  serverToggle: { marginTop: 8, alignSelf: "center" },
  serverToggleText: { color: colors.slate500, fontSize: 13 },
  serverHint: { color: colors.rose, fontSize: 13, marginBottom: 8 },
  hint: {
    marginTop: 24,
    textAlign: "center",
    color: colors.slate400,
    fontSize: 13,
    lineHeight: 18,
  },
});

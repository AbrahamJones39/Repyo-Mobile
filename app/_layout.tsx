import { AuthProvider, useAuth } from "@/context/auth";
import { colors } from "@/lib/theme";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

function Gate({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === "login";
    if (!user && !inAuth) {
      router.replace("/login");
    } else if (user && inAuth) {
      router.replace("/(tabs)");
    }
  }, [ready, user, segments, router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.white }}>
        <ActivityIndicator color={colors.rose} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Gate>
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerTintColor: colors.rose,
            headerTitleStyle: { color: colors.slate900, fontWeight: "700" },
            contentStyle: { backgroundColor: colors.slate50 },
          }}
        >
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="request/[id]" options={{ title: "Request" }} />
          <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
        </Stack>
      </Gate>
    </AuthProvider>
  );
}

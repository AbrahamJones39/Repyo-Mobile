import { colors } from "@/lib/theme";
import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen does not exist.</Text>
        <Link href="/(tabs)" style={styles.link}>
          <Text style={styles.linkText}>Back to dashboard</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.slate900,
  },
  link: {
    marginTop: 16,
  },
  linkText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.rose,
  },
});

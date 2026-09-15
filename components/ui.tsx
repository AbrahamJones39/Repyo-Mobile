import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  colors,
  requestStatusLabels,
  statusColors,
  urgencyColors,
  urgencyLabels,
} from "@/lib/theme";

export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const fontSize = size === "lg" ? 34 : size === "sm" ? 20 : 26;
  return (
    <View style={styles.brandRow}>
      <View
        style={[
          styles.brandIcon,
          size === "lg" && { width: 52, height: 52, borderRadius: 14 },
          size === "sm" && { width: 32, height: 32, borderRadius: 8 },
        ]}
      >
        <Ionicons name="pulse" size={size === "lg" ? 26 : 18} color={colors.white} />
      </View>
      <Text style={[styles.brandText, { fontSize }]}>
        <Text style={{ color: colors.rose }}>Go</Text>
        <Text style={{ color: colors.slate900 }}>RepYo</Text>
      </Text>
    </View>
  );
}

export function Badge({
  label,
  tone,
}: {
  label: string;
  tone?: { bg: string; text: string };
}) {
  return (
    <View style={[styles.badge, { backgroundColor: tone?.bg ?? colors.slate100 }]}>
      <Text style={[styles.badgeText, { color: tone?.text ?? colors.slate600 }]}>
        {label}
      </Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      label={requestStatusLabels[status] ?? status}
      tone={statusColors[status]}
    />
  );
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
  return (
    <Badge
      label={urgencyLabels[urgency] ?? urgency}
      tone={urgencyColors[urgency]}
    />
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  variant = "primary",
  style,
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "outline" | "ghost";
  style?: StyleProp<ViewStyle>;
}) {
  const palette =
    variant === "outline"
      ? styles.outlineButton
      : variant === "ghost"
        ? styles.ghostButton
        : styles.primaryButton;
  const text =
    variant === "outline"
      ? styles.outlineButtonText
      : variant === "ghost"
        ? styles.ghostButtonText
        : styles.primaryButtonText;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        palette,
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.white : colors.rose} />
      ) : (
        <Text style={text}>{title}</Text>
      )}
    </Pressable>
  );
}

export function EmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View style={styles.error}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.rose,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  button: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  primaryButton: {
    backgroundColor: colors.rose,
  },
  outlineButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  ghostButton: {
    backgroundColor: "transparent",
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  outlineButtonText: {
    color: colors.slate700,
    fontWeight: "700",
    fontSize: 15,
  },
  ghostButtonText: {
    color: colors.rose,
    fontWeight: "700",
    fontSize: 15,
  },
  empty: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  emptyTitle: {
    color: colors.slate700,
    fontWeight: "600",
  },
  emptySubtitle: {
    marginTop: 6,
    color: colors.slate500,
    textAlign: "center",
  },
  error: {
    backgroundColor: colors.red50,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: colors.red700,
    fontSize: 14,
  },
});

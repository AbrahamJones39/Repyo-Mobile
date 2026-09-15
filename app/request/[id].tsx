import { ErrorBanner, PrimaryButton, StatusBadge, UrgencyBadge } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { api } from "@/lib/api";
import { formatWhen } from "@/lib/format";
import { colors } from "@/lib/theme";
import type { ForwardTarget, RequestData } from "@/lib/types";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [request, setRequest] = useState<RequestData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError("");
    try {
      const data = await api<RequestData>(`/api/requests/${id}`);
      setRequest(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open request");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function coords() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") return {};
      const pos = await Location.getCurrentPositionAsync({});
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      return {};
    }
  }

  async function act(body: Record<string, unknown>) {
    if (!id) return;
    setActing(true);
    setError("");
    try {
      await api(`/api/requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.rose} />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.center}>
        <ErrorBanner message={error || "Request not found"} />
      </View>
    );
  }

  const assignedToMe = request.assignedRep?.id === user?.id;
  const needsOpen =
    assignedToMe &&
    !request.acknowledgedAt &&
    ["REQUESTING", "ACCEPTED"].includes(request.status);
  const canRespond =
    assignedToMe && request.status === "REQUESTING" && Boolean(request.acknowledgedAt);
  const canForward =
    assignedToMe &&
    Boolean(request.acknowledgedAt) &&
    ["REQUESTING", "ACCEPTED"].includes(request.status);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ErrorBanner message={error} />
      <View style={styles.card}>
        <View style={styles.top}>
          <Text style={styles.facility}>{request.facilityName}</Text>
          <StatusBadge status={request.status} />
        </View>
        <Text style={styles.procedure}>{request.procedureType}</Text>
        <View style={styles.row}>
          <UrgencyBadge urgency={request.urgency} />
          <Text style={styles.when}>{formatWhen(request.scheduledAt)}</Text>
        </View>
        {request.facilityAddr ? (
          <Pressable
            onPress={() =>
              Linking.openURL(
                `https://maps.apple.com/?q=${encodeURIComponent(request.facilityAddr ?? "")}`
              )
            }
          >
            <Text style={styles.link}>{request.facilityAddr}</Text>
          </Pressable>
        ) : null}
        {request.facilityZipCode ? (
          <Text style={styles.meta}>Zip {request.facilityZipCode}</Text>
        ) : null}
        {request.company?.name ? (
          <Text style={styles.meta}>{request.company.name}</Text>
        ) : null}
        {request.department || request.physicianName ? (
          <Text style={styles.meta}>
            {[request.department, request.physicianName].filter(Boolean).join(" · ")}
          </Text>
        ) : null}
        {request.requesterName ? (
          <Text style={styles.meta}>Requester: {request.requesterName}</Text>
        ) : null}
        {request.provider?.name ? (
          <Text style={styles.meta}>Provider: {request.provider.name}</Text>
        ) : null}
        {request.notes ? <Text style={styles.notes}>{request.notes}</Text> : null}
        {request.patientName || request.patientRoom ? (
          <View style={styles.phi}>
            <Text style={styles.phiTitle}>Patient</Text>
            {request.patientName ? <Text style={styles.meta}>{request.patientName}</Text> : null}
            {request.patientRoom ? <Text style={styles.meta}>Room {request.patientRoom}</Text> : null}
          </View>
        ) : null}
        {request.deviceManufacturer || request.deviceName ? (
          <View style={styles.phi}>
            <Text style={styles.phiTitle}>Device</Text>
            {request.deviceManufacturer ? (
              <Text style={styles.meta}>{request.deviceManufacturer}</Text>
            ) : null}
            {request.deviceName ? <Text style={styles.meta}>{request.deviceName}</Text> : null}
            {request.deviceSerial ? (
              <Text style={styles.meta}>Serial {request.deviceSerial}</Text>
            ) : null}
          </View>
        ) : null}
        {request.assignedRep?.phone ? (
          <PrimaryButton
            title={`Call ${request.assignedRep.name}`}
            variant="outline"
            onPress={() => Linking.openURL(`tel:${request.assignedRep?.phone}`)}
            style={{ marginTop: 12 }}
          />
        ) : null}
        {request.provider?.phone ? (
          <PrimaryButton
            title="Call provider"
            variant="outline"
            onPress={() => Linking.openURL(`tel:${request.provider?.phone}`)}
            style={{ marginTop: 8 }}
          />
        ) : null}
      </View>

      <View style={styles.actions}>
        {needsOpen ? (
          <PrimaryButton title="Open & acknowledge" onPress={load} loading={acting} />
        ) : null}
        {canRespond ? (
          <>
            <PrimaryButton
              title="Accept"
              onPress={() => act({ status: "ACCEPTED" })}
              loading={acting}
            />
            <PrimaryButton
              title="Decline"
              variant="outline"
              onPress={() => act({ action: "DECLINE" })}
              loading={acting}
            />
          </>
        ) : null}
        {canForward ? (
          <PrimaryButton
            title="Forward"
            variant="outline"
            onPress={() => setForwardOpen(true)}
          />
        ) : null}
        {assignedToMe && request.status === "ACCEPTED" && request.acknowledgedAt ? (
          <PrimaryButton
            title="Mark en route"
            onPress={async () => act({ status: "EN_ROUTE", ...(await coords()) })}
            loading={acting}
          />
        ) : null}
        {assignedToMe && request.status === "EN_ROUTE" ? (
          <PrimaryButton
            title="Mark arrived"
            onPress={async () => act({ status: "ARRIVED", ...(await coords()) })}
            loading={acting}
          />
        ) : null}
        {assignedToMe && request.status === "ARRIVED" ? (
          <PrimaryButton
            title="Complete request"
            onPress={() => act({ status: "COMPLETED" })}
            loading={acting}
          />
        ) : null}
      </View>

      <ForwardSheet
        visible={forwardOpen}
        requestId={request.id}
        onClose={() => setForwardOpen(false)}
        onSuccess={() => {
          setForwardOpen(false);
          load();
          router.back();
        }}
      />
    </ScrollView>
  );
}

function ForwardSheet({
  visible,
  requestId,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  requestId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [targets, setTargets] = useState<ForwardTarget[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setError("");
    api<{ reps: ForwardTarget[]; managers: ForwardTarget[]; teams: { members: ForwardTarget[] }[] }>(
      `/api/requests/${requestId}/forward-targets`
    )
      .then((data) => {
        const fromTeams = data.teams?.flatMap((t) => t.members) ?? [];
        const all = [...(data.reps ?? []), ...(data.managers ?? []), ...fromTeams];
        const unique = new Map(all.map((t) => [t.id, t]));
        setTargets([...unique.values()]);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load targets");
      });
  }, [visible, requestId]);

  async function submit() {
    if (!selectedId) return;
    setLoading(true);
    setError("");
    try {
      await api(`/api/requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "FORWARD",
          forwardedToId: selectedId,
          reason: reason.trim() || undefined,
          targetTeamId: selectedTeamId,
        }),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Forward failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Forward request</Text>
          <ErrorBanner message={error} />
          <ScrollView style={{ maxHeight: 280 }}>
            {targets.map((target) => (
              <Pressable
                key={target.id}
                onPress={() => {
                  setSelectedId(target.id);
                  setSelectedTeamId(target.teamId);
                }}
                style={[styles.target, selectedId === target.id && styles.targetOn]}
              >
                <Text style={styles.targetName}>{target.name}</Text>
                <Text style={styles.targetMeta}>
                  {target.statusLabel}
                  {target.onCall ? " · On call" : ""}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Optional reason"
            placeholderTextColor={colors.slate400}
            style={styles.input}
          />
          <PrimaryButton title="Forward" onPress={submit} loading={loading} disabled={!selectedId} />
          <PrimaryButton title="Cancel" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 16,
  },
  top: { flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "flex-start" },
  facility: { flex: 1, fontSize: 22, fontWeight: "800", color: colors.slate900 },
  procedure: { marginTop: 6, fontSize: 16, color: colors.slate600 },
  row: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  when: { color: colors.slate500 },
  link: { marginTop: 10, color: colors.rose, fontWeight: "600" },
  meta: { marginTop: 6, color: colors.slate600 },
  notes: { marginTop: 12, color: colors.slate700, lineHeight: 20 },
  phi: {
    marginTop: 12,
    backgroundColor: colors.slate50,
    borderRadius: 12,
    padding: 12,
  },
  phiTitle: { fontWeight: "700", color: colors.slate700, marginBottom: 4 },
  actions: { marginTop: 16, gap: 10 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.slate900 },
  target: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  targetOn: { borderColor: colors.rose, backgroundColor: colors.roseSoft },
  targetName: { fontWeight: "700", color: colors.slate900 },
  targetMeta: { marginTop: 2, color: colors.slate500, fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    padding: 12,
    color: colors.slate900,
  },
});

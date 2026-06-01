import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { acknowledgeAlert, getAlerts } from '../service/api';
import type { AlertRecord } from './types';
import { AlertCard } from './components/AlertCard';

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AlertsScreen() {
  const { fieldId, fieldName } = useLocalSearchParams<{
    fieldId: string;
    fieldName: string;
  }>();

  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchAlerts = useCallback(async () => {
    if (!fieldId) return;
    try {
      setLoading(true);
      const data = await getAlerts(fieldId);
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message ?? 'Failed to load alerts.');
    } finally {
      setLoading(false);
    }
  }, [fieldId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // ── Acknowledge ─────────────────────────────────────────────────────────────
  const handleAcknowledge = async (alertId: string) => {
    try {
      setAcknowledgingId(alertId);
      await acknowledgeAlert(alertId);
      // Optimistically flip the flag locally
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)),
      );
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message ?? 'Failed to acknowledge alert.');
    } finally {
      setAcknowledgingId(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <Stack.Screen
        options={{
          title: fieldName ? `Alerts — ${fieldName}` : 'Alerts',
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#fff',
        }}
      />

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#22d3ee" />
          <Text style={{ color: '#94a3b8', marginTop: 12, fontSize: 14 }}>
            Loading alerts…
          </Text>
        </View>
      ) : alerts.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: '#16a34a', fontSize: 32, marginBottom: 12 }}>✓</Text>
          <Text style={{ color: '#94a3b8', fontSize: 16, textAlign: 'center' }}>
            No alerts for this field.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingVertical: 12, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary pill */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 8 }}>
            <View
              style={{
                backgroundColor: '#1e293b',
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 5,
                borderWidth: 1,
                borderColor: '#334155',
              }}
            >
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                {alerts.filter((a) => !a.acknowledged).length} unacknowledged
                {' · '}
                {alerts.length} total
              </Text>
            </View>
          </View>

          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={handleAcknowledge}
              acknowledging={acknowledgingId === alert.id}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

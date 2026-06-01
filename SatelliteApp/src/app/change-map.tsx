import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { getAlerts, getChangeMap } from '../service/api';
import type { AlertRecord, ChangeRecord } from './types';
import { NdviGrid } from './components/NdviGrid';
import { ClassificationBar } from './components/ClassificationBar';
import { buildClassificationBars, buildGridCells } from './utils';

// ─── Screen ───────────────────────────────────────────────────────────────────


export default function ChangeMapScreen() {
  const { fieldId, fieldName, date1, date2 } = useLocalSearchParams<{
    fieldId: string;
    fieldName: string;
    date1: string;
    date2: string;
  }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [deltaArray, setDeltaArray] = useState<number[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!fieldId || !date1 || !date2) return;

    let cancelled = false;
    (async () => {
      try {
        const [changeData, alertData] = await Promise.all([
          getChangeMap(fieldId, date1, date2),
          getAlerts(fieldId),
        ]);

        if (cancelled) return;

        // Take first change record and parse the delta array
        const record: ChangeRecord = Array.isArray(changeData)
          ? changeData[0]
          : changeData;

        if (!record?.deltaArray) {
          throw new Error('No delta data returned from server.');
        }

        const parsed: number[] = JSON.parse(record.deltaArray);
        setDeltaArray(parsed);
        setAlerts(Array.isArray(alertData) ? alertData : []);
      } catch (err: any) {
        if (!cancelled) {
          console.error(err);
          setError(err.message ?? 'Failed to load change map.');
          Alert.alert('Error', err.message ?? 'Failed to load change map.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fieldId, date1, date2]);

  // ── Derive grid colour arrays from deltaArray ───────────────────────────────
  const { date1Cells, date2Cells, deltaCells, stats } = useMemo(
    () => buildGridCells(deltaArray),
    [deltaArray],
  );

  // ── Alert-based classification (overrides delta stats if data available) ────
  const classificationBars = useMemo(
    () => buildClassificationBars(alerts, stats),
    [alerts, stats],
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <Stack.Screen
        options={{
          title: fieldName ?? 'Change Map',
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#fff',
        }}
      />

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#22d3ee" />
          <Text style={{ color: '#94a3b8', marginTop: 12, fontSize: 14 }}>
            Loading NDVI data…
          </Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: '#f87171', fontSize: 16, textAlign: 'center' }}>
            {error}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Date badge ─────────────────────────────────────────────────── */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 20,
            }}
          >
            {[date1, date2].map((d, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 5,
                  borderWidth: 1,
                  borderColor: '#334155',
                }}
              >
                <Text style={{ color: '#22d3ee', fontSize: 12, fontWeight: '700' }}>
                  {i === 0 ? '📅 ' : '📅 '}
                  {d}
                </Text>
              </View>
            ))}
          </View>

          {/* ── NDVI Grids ─────────────────────────────────────────────────── */}
          <View
            style={{
              backgroundColor: '#1e293b',
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#334155',
            }}
          >
            <Text
              style={{
                color: '#f8fafc',
                fontSize: 14,
                fontWeight: '700',
                marginBottom: 4,
              }}
            >
              NDVI Comparison
            </Text>
            <Text style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>
              Each cell = 1 pixel · 20×20 grid
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <NdviGrid cells={date1Cells} label={`Date 1\n${date1}`} />
              <NdviGrid cells={date2Cells} label={`Date 2\n${date2}`} />
            </View>
          </View>

          {/* ── Delta Grid ─────────────────────────────────────────────────── */}
          <View
            style={{
              backgroundColor: '#1e293b',
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#334155',
            }}
          >
            <Text style={{ color: '#f8fafc', fontSize: 14, fontWeight: '700', marginBottom: 4 }}>
              Δ Delta Map
            </Text>
            <Text style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>
              Pixel-wise NDVI change between the two dates
            </Text>
            <View style={{ alignItems: 'center' }}>
              <NdviGrid cells={deltaCells} label="NDVI Change" />
            </View>

            {/* Legend */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, justifyContent: 'center' }}>
              {[
                { color: '#16a34a', label: 'Growth (>0.15)' },
                { color: '#dc2626', label: 'Stress (<−0.15)' },
                { color: '#f59e0b', label: 'Moderate' },
                { color: '#475569', label: 'Stable' },
              ].map((l) => (
                <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      backgroundColor: l.color,
                    }}
                  />
                  <Text style={{ color: '#94a3b8', fontSize: 11 }}>{l.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Classification Breakdown ────────────────────────────────────── */}
          <View
            style={{
              backgroundColor: '#1e293b',
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#334155',
            }}
          >
            <Text style={{ color: '#f8fafc', fontSize: 14, fontWeight: '700', marginBottom: 14 }}>
              Classification Breakdown
            </Text>
            {classificationBars.map((bar) => (
              <ClassificationBar key={bar.label} {...bar} />
            ))}
          </View>

          {/* ── Alerts button ──────────────────────────────────────────────── */}
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/alerts' as any,
                params: { fieldId, fieldName },
              })
            }
            style={{
              backgroundColor: '#0e7490',
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
              shadowColor: '#22d3ee',
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 }}>
              View Alerts for this Field
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

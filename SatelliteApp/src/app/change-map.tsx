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
import type { AlertRecord, BarProps, ChangeRecord, GridProps } from './types';


// ─── Color helpers ────────────────────────────────────────────────────────────

const GRID_SIZE = 20; // 20×20 grid
const CELL_PX = 14;  // pixels per cell

/** Map a simulated NDVI value to a colour */
function ndviColor(ndvi: number): string {
  if (ndvi > 0.6) return '#16a34a';  // green – healthy
  if (ndvi >= 0.3) return '#ca8a04'; // yellow – moderate
  return '#dc2626';                   // red – stressed
}

/** Map a delta value to a colour */
function deltaColor(delta: number): string {
  if (delta > 0.15) return '#16a34a';  // growth
  if (delta < -0.15) return '#dc2626'; // stress
  if (Math.abs(delta) >= 0.10) return '#f59e0b'; // amber – moderate change
  return '#475569';                    // slate – stable
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NdviGrid({ cells, label }: GridProps) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text
        style={{
          color: '#94a3b8',
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.5,
          marginBottom: 6,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          width: GRID_SIZE * CELL_PX,
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        {cells.map((color, i) => (
          <View
            key={i}
            style={{ width: CELL_PX, height: CELL_PX, backgroundColor: color }}
          />
        ))}
      </View>
    </View>
  );
}

function ClassificationBar({ label, value, color }: BarProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <View style={{ marginBottom: 10 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <Text style={{ color: '#e2e8f0', fontSize: 13, fontWeight: '600' }}>
          {label}
        </Text>
        <Text style={{ color, fontSize: 13, fontWeight: '700' }}>
          {pct.toFixed(1)}%
        </Text>
      </View>
      <View
        style={{
          height: 8,
          backgroundColor: '#1e293b',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: color,
            borderRadius: 4,
          }}
        />
      </View>
    </View>
  );
}

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
  const { date1Cells, date2Cells, deltaCells, stats } = useMemo(() => {
    const total = GRID_SIZE * GRID_SIZE;

    // Pad or trim to exactly 400 values
    const raw =
      deltaArray.length >= total
        ? deltaArray.slice(0, total)
        : [
            ...deltaArray,
            ...Array(total - deltaArray.length).fill(0),
          ];

    // Simulate baseline NDVI (Date 1) from delta:
    //   positive delta  → the pixel was already healthy
    //   negative delta  → the pixel is now stressed, was borderline
    //   stable          → moderate value
    const date1Cells = raw.map((d) => {
      const simulatedNdvi = d >= 0 ? 0.65 : d < -0.15 ? 0.35 : 0.5;
      return ndviColor(simulatedNdvi);
    });

    // Date 2 NDVI — apply the delta shift
    const date2Cells = raw.map((d) => {
      const simulatedNdvi = d >= 0 ? 0.65 + d * 0.3 : 0.35 + d * 0.6;
      return ndviColor(Math.max(0, Math.min(1, simulatedNdvi)));
    });

    const deltaCells = raw.map(deltaColor);

    // Classification stats from delta
    const growth = raw.filter((d) => d > 0.15).length;
    const stress = raw.filter((d) => d < -0.15).length;
    const moderate = raw.filter((d) => Math.abs(d) >= 0.10 && Math.abs(d) <= 0.15).length;
    const stable = raw.filter((d) => Math.abs(d) < 0.10).length;

    return {
      date1Cells,
      date2Cells,
      deltaCells,
      stats: {
        growth: (growth / total) * 100,
        stress: (stress / total) * 100,
        moderate: (moderate / total) * 100,
        stable: (stable / total) * 100,
      },
    };
  }, [deltaArray]);

  // ── Alert-based classification (overrides delta stats if data available) ────
  const classificationBars = useMemo(() => {
    if (alerts.length === 0) {
      return [
        { label: 'Crop Growth', value: stats.growth, color: '#16a34a' },
        { label: 'Crop Stress', value: stats.stress, color: '#dc2626' },
        { label: 'Moderate Change', value: stats.moderate, color: '#f59e0b' },
        { label: 'Stable', value: stats.stable, color: '#475569' },
      ];
    }
    const colorMap: Record<string, string> = {
      HEALTHY: '#16a34a',
      STRESSED: '#dc2626',
      CRITICAL: '#f97316',
      MODERATE: '#f59e0b',
    };
    return alerts.map((a) => ({
      label: a.classification,
      value: a.percentage,
      color: colorMap[a.classification.toUpperCase()] ?? '#94a3b8',
    }));
  }, [alerts, stats]);

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
              🔔 View Alerts for this Field
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

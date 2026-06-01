import React from 'react';
import { View, Text } from 'react-native';
import type { BarProps } from '../types';

export function ClassificationBar({ label, value, color }: BarProps) {
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

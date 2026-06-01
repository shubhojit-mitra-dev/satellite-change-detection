import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { AlertCardProps } from '../types';
import { formatDate, severityStyle } from '../utils';

export function AlertCard({ alert, onAcknowledge, acknowledging }: AlertCardProps) {
  const badge = severityStyle(alert.severity);

  return (
    <View
      style={{
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: '#334155',
      }}
    >
      {/* Severity badge + timestamp row */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <View
          style={{
            backgroundColor: badge.bg,
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 3,
          }}
        >
          <Text style={{ color: badge.text, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>
            {alert.severity.toUpperCase()}
          </Text>
        </View>
        <Text style={{ color: '#475569', fontSize: 11 }}>
          {formatDate(alert.createdAt)}
        </Text>
      </View>

      {/* Message */}
      <Text style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 20, marginBottom: 12 }}>
        {alert.message}
      </Text>

      {/* Acknowledge row */}
      {alert.acknowledged ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: '#475569',
            }}
          />
          <Text style={{ color: '#475569', fontSize: 12 }}>Acknowledged</Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => onAcknowledge(alert.id)}
          disabled={acknowledging}
          activeOpacity={0.75}
          style={{
            backgroundColor: acknowledging ? '#164e63' : '#0e7490',
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 8,
            alignSelf: 'flex-start',
            opacity: acknowledging ? 0.6 : 1,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
            {acknowledging ? 'Acknowledging…' : 'Acknowledge'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

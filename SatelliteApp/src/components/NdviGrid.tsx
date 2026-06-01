import React from 'react';
import { View, Text } from 'react-native';
import type { GridProps } from '../types';

const GRID_SIZE = 20;
const CELL_PX = 14;

export function NdviGrid({ cells, label }: GridProps) {
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

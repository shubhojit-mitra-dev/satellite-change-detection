import type { BarProps } from './types';

// ─── Grid constants ───────────────────────────────────────────────────────────

export const GRID_SIZE = 20; // 20×20 grid
export const CELL_PX = 14;  // pixels per cell

// ─── Color mappers ────────────────────────────────────────────────────────────

/** Map a simulated NDVI value to a hex colour string */
export function ndviColor(ndvi: number): string {
  if (ndvi > 0.6) return '#16a34a';  // green  – healthy
  if (ndvi >= 0.3) return '#ca8a04'; // yellow – moderate
  return '#dc2626';                   // red    – stressed
}

/** Map a delta value to a hex colour string */
export function deltaColor(delta: number): string {
  if (delta > 0.15) return '#16a34a';            // growth
  if (delta < -0.15) return '#dc2626';           // stress
  if (Math.abs(delta) >= 0.10) return '#f59e0b'; // amber – moderate change
  return '#475569';                              // slate – stable
}

// ─── Grid derivation ──────────────────────────────────────────────────────────

export type GridCells = {
  date1Cells: string[];
  date2Cells: string[];
  deltaCells: string[];
  stats: {
    growth: number;
    stress: number;
    moderate: number;
    stable: number;
  };
};

/**
 * Derives Date 1 NDVI, Date 2 NDVI, and Delta colour grids from a raw delta
 * array. Pads or trims the input to exactly GRID_SIZE × GRID_SIZE values.
 */
export function buildGridCells(deltaArray: number[]): GridCells {
  const total = GRID_SIZE * GRID_SIZE;

  // Pad or trim to exactly 400 values
  const raw =
    deltaArray.length >= total
      ? deltaArray.slice(0, total)
      : [...deltaArray, ...Array(total - deltaArray.length).fill(0)];

  // Simulate baseline NDVI (Date 1) from delta sign:
  //   positive delta  → pixel was already healthy
  //   negative delta  → pixel is now stressed, was borderline
  //   stable          → moderate value
  const date1Cells = raw.map((d) => {
    const simulatedNdvi = d >= 0 ? 0.65 : d < -0.15 ? 0.35 : 0.5;
    return ndviColor(simulatedNdvi);
  });

  // Date 2 NDVI — apply the delta shift to the baseline
  const date2Cells = raw.map((d) => {
    const simulatedNdvi = d >= 0 ? 0.65 + d * 0.3 : 0.35 + d * 0.6;
    return ndviColor(Math.max(0, Math.min(1, simulatedNdvi)));
  });

  const deltaCells = raw.map(deltaColor);

  // Classification percentages computed from delta bands
  const growth   = raw.filter((d) => d > 0.15).length;
  const stress   = raw.filter((d) => d < -0.15).length;
  const moderate = raw.filter((d) => Math.abs(d) >= 0.10 && Math.abs(d) <= 0.15).length;
  const stable   = raw.filter((d) => Math.abs(d) < 0.10).length;

  return {
    date1Cells,
    date2Cells,
    deltaCells,
    stats: {
      growth:   (growth   / total) * 100,
      stress:   (stress   / total) * 100,
      moderate: (moderate / total) * 100,
      stable:   (stable   / total) * 100,
    },
  };
}

// ─── Classification bar builder ───────────────────────────────────────────────

/**
 * Returns bar-chart data for the classification breakdown section.
 * Always derived from the delta array — real alert records carry no
 * percentage data so we don't use them here.
 */
export function buildClassificationBars(stats: GridCells['stats']): BarProps[] {
  return [
    { label: 'Crop Growth',     value: stats.growth,   color: '#16a34a' },
    { label: 'Crop Stress',     value: stats.stress,   color: '#dc2626' },
    { label: 'Moderate Change', value: stats.moderate, color: '#f59e0b' },
    { label: 'Stable',          value: stats.stable,   color: '#475569' },
  ];
}

// ─── Alert helpers ────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, { bg: string; text: string }> = {
  CRITICAL: { bg: '#991b1b', text: '#fecaca' },
  POSITIVE: { bg: '#14532d', text: '#bbf7d0' },
  MODERATE: { bg: '#78350f', text: '#fde68a' },
};

/** Returns background + text colours for a given severity string. */
export function severityStyle(severity: string): { bg: string; text: string } {
  return SEVERITY_STYLES[severity.toUpperCase()] ?? { bg: '#1e293b', text: '#94a3b8' };
}

/** Formats an ISO timestamp into a human-readable local date/time string. */
export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

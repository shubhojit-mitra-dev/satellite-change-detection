// ─── Domain types ─────────────────────────────────────────────────────────────

export type ChangeRecord = {
  id: string;
  fieldId: string;
  date1: string;
  date2: string;
  deltaArray: string; // JSON string of number[]
  createdAt: string;
};

export type AlertRecord = {
  id: string;
  fieldId: string;
  classification: string; // e.g. "HEALTHY", "STRESSED", "CRITICAL"
  percentage: number;
  createdAt: string;
};

// ─── Component prop types ─────────────────────────────────────────────────────

export type GridProps = {
  cells: string[];
  label: string;
};

export type BarProps = {
  label: string;
  value: number;
  color: string;
};

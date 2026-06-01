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
  severity: string;      // "POSITIVE", "CRITICAL", "MODERATE"
  message: string;
  acknowledged: boolean;
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

export type AlertCardProps = {
  alert: AlertRecord;
  onAcknowledge: (id: string) => void;
  acknowledging: boolean;
};

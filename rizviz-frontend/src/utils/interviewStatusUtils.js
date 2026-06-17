import { parseRawRowJson } from './interviewTableColumns';

const STATUS_KEYS = ['STATUS', 'Status', 'Interview Status'];

/** Excel STATUS column value when present; otherwise normalized DB Status. */
export const getInterviewRowStatus = (record) => {
  const raw = parseRawRowJson(record);
  for (const key of STATUS_KEYS) {
    const v = raw[key];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  const dynamicKey = Object.keys(raw).find((k) => {
    const n = k.trim().replace(/:$/, '').toLowerCase();
    return n === 'status';
  });
  if (dynamicKey && raw[dynamicKey] != null && String(raw[dynamicKey]).trim() !== '') {
    return String(raw[dynamicKey]).trim();
  }
  const model = record?.Status ?? record?.status;
  return model != null && String(model).trim() !== '' ? String(model).trim() : 'Scheduled';
};

const normalizeKey = (s) => String(s || '').trim().toLowerCase();

/** Pill / badge colors per requirement */
export const STATUS_PILL_COLORS = {
  // Each status has a completely unique hue family — no two share the same color
  converted:      { bg: '#dcfce7', border: '#86efac', text: '#166534' },  // 🟢 emerald green
  scheduled:      { bg: '#ccfbf1', border: '#5eead4', text: '#0f766e' },  // 🩵 teal
  reschedule:     { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af' },  // 🔵 royal blue
  rescheduled:    { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af' },  // 🔵 royal blue
  postponed:      { bg: '#fef9c3', border: '#fde047', text: '#a16207' },  // 🟡 amber/yellow
  'date changed': { bg: '#fff1f2', border: '#fecdd3', text: '#9f1239' },  // 🌸 rose/pink
  datechanged:    { bg: '#fff1f2', border: '#fecdd3', text: '#9f1239' },  // 🌸 rose/pink
  applied:        { bg: '#f7fee7', border: '#bef264', text: '#3f6212' },  // 🍋 lime green
  shortlisted:    { bg: '#eef2ff', border: '#a5b4fc', text: '#3730a3' },  // 💙 indigo
  rejected:       { bg: '#f0f9ff', border: '#7dd3fc', text: '#0c4a6e' },  // 🩵 sky blue
  dropped:        { bg: '#fff7ed', border: '#fdba74', text: '#c2410c' },  // 🟠 orange
  closed:         { bg: '#f8fafc', border: '#94a3b8', text: '#334155' },  // ⬜ slate/gray
  dead:           { bg: '#fdf8f0', border: '#d6bfa0', text: '#7c2d12' },  // 🟤 warm brown
  cancelled:      { bg: '#f5f3ff', border: '#c4b5fd', text: '#6d28d9' },  // 🟣 violet/purple
  default:        { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569' },  // 🔘 neutral slate
};

export const getStatusPillColors = (status, active = false) => {
  const key = normalizeKey(status);
  const palette = STATUS_PILL_COLORS[key] || STATUS_PILL_COLORS.default;
  if (active) {
    return {
      backgroundColor: palette.bg,
      borderColor: palette.border,
      color: palette.text,
    };
  }
  return {
    backgroundColor: 'transparent',
    borderColor: palette.border,
    color: palette.bg,
  };
};

export const statusMatchesSelection = (record, selectedStatuses) => {
  if (!selectedStatuses?.length) return true;
  const rowStatus = getInterviewRowStatus(record);
  return selectedStatuses.some(
    (s) => normalizeKey(s) === normalizeKey(rowStatus)
  );
};

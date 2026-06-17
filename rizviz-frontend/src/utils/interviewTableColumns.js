import { Tag, Tooltip } from 'antd';
import InterviewStatusBadge from '../components/interviews/InterviewStatusBadge';

const DATE_HEADER_HINTS = ['date', 'start', 'close'];

export const parseRawRowJson = (record) => {
  const raw = record?.RawRowJson ?? record?.rawRowJson;
  if (!raw) return {};
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
};

const isDateHeader = (header) =>
  DATE_HEADER_HINTS.some((h) => header.toLowerCase().includes(h));

const cellRender = (header, formatDate) => (_, record) => {
  const v = parseRawRowJson(record)[header];
  if (v == null || v === '') return '—';
  const s = String(v);
  if (isDateHeader(header)) {
    const d = formatDate(v);
    return d !== '—' ? d : s;
  }
  if (header.toLowerCase().includes('status')) {
    return <InterviewStatusBadge status={s} />;
  }
  return (
    <Tooltip title={s}>
      <span className="block truncate max-w-[180px]">{s}</span>
    </Tooltip>
  );
};

/** All DB-backed fields when no Excel JSON is stored yet */
 export const buildModelColumns = ({ formatDate, navigate }) => [
  { title: 'Inv To', dataIndex: 'InvTo', key: 'InvTo', width: 90, render: (t) => t || '—' },
  { title: 'Sr', dataIndex: 'Sr', key: 'Sr', width: 70, render: (t) => t ?? '—' },
  { title: 'Job Hunter', dataIndex: 'JobHunterName', key: 'JobHunterName', width: 130, ellipsis: true, render: (t) => <Tooltip title={t}>{t || '—'}</Tooltip> },
  { title: 'Job Profile', dataIndex: 'InterviewFor', key: 'InterviewFor', width: 150, ellipsis: true, render: (t) => <Tooltip title={t}>{t || '—'}</Tooltip> },
  {
    title: 'Interviewee',
    dataIndex: 'IntervieweeName',
    key: 'IntervieweeName',
    width: 130,
    render: (t) => (
      <button
        type="button"
        className="font-semibold text-left hover:underline border-0 bg-transparent cursor-pointer p-0"
        style={{ color: '#7c3aed' }}
        onClick={() => t && navigate(`/interviews/candidates/${encodeURIComponent(t)}`)}
      >
        {t || '—'}
      </button>
    ),
  },
  { title: 'Company', dataIndex: 'CompanyName', key: 'CompanyName', width: 120, render: (t) => <Tag color="blue" className="m-0">{t || '—'}</Tag> },
  { title: 'Type', dataIndex: 'InterviewType', key: 'InterviewType', width: 100, ellipsis: true, render: (t) => t || '—' },
  { title: 'Status', dataIndex: 'Status', key: 'Status', width: 110, fixed: 'right', render: (s) => <InterviewStatusBadge status={s} /> },
  { title: 'Stack', dataIndex: 'Stack', key: 'Stack', width: 100, render: (t) => t || '—' },
  { title: 'Interview Date', dataIndex: 'InterviewDate', key: 'InterviewDate', width: 115, render: formatDate },
  { title: 'Job Start', dataIndex: 'JobStartDate', key: 'JobStartDate', width: 115, render: formatDate },
  { title: 'Job Close', dataIndex: 'JobCloseDate', key: 'JobCloseDate', width: 115, render: formatDate },
  { title: 'First Salary', dataIndex: 'FirstSalary', key: 'FirstSalary', width: 100, render: (t) => t || '—' },
  { title: 'JH Suggest', dataIndex: 'JhSuggest', key: 'JhSuggest', width: 110, ellipsis: true, render: (t) => t || '—' },
  { title: 'Charges', dataIndex: 'InterviewCharges', key: 'InterviewCharges', width: 90, render: (t) => t ?? '—' },
  { title: 'JH Due', dataIndex: 'JhDue', key: 'JhDue', width: 90, render: (t) => t ?? '—' },
  { title: '1st Payment', dataIndex: 'FirstPaymentOnJob', key: 'FirstPaymentOnJob', width: 95, render: (t) => t ?? '—' },
  { title: '2nd Payment', dataIndex: 'SecondPaymentOnJob', key: 'SecondPaymentOnJob', width: 95, render: (t) => t ?? '—' },
  { title: 'Balance', dataIndex: 'BalancePayable', key: 'BalancePayable', width: 90, render: (t) => t ?? '—' },
];

/**
 * Prefer every column from uploaded Excel/CSV (RawRowJson); fall back to full model columns.
 */
export const buildInterviewTableColumns = (rows, { formatDate, navigate }) => {
  const headerOrder = [];
  const seen = new Set();
  let hasRaw = false;

  rows.forEach((r) => {
    const raw = parseRawRowJson(r);
    if (Object.keys(raw).length > 0) hasRaw = true;
    Object.keys(raw).forEach((h) => {
      if (h && !seen.has(h)) {
        seen.add(h);
        headerOrder.push(h);
      }
    });
  });

  // Status-related keys are excluded from raw Excel columns because
  // Interviews.jsx appends its own styled-badge Status column separately.
  const STATUS_KEYS_TO_SKIP = new Set(['status', 'interview status', 'STATUS', 'Status']);

  if (hasRaw && headerOrder.length > 0) {
    return headerOrder
      .filter((h) => !STATUS_KEYS_TO_SKIP.has(h) && h.toLowerCase() !== 'status')
      .map((h) => ({
        title: h,
        key: `excel_${h}`,
        width: Math.min(220, Math.max(95, h.length * 7)),
        ellipsis: true,
        render: cellRender(h, formatDate),
      }));
  }

  return buildModelColumns({ formatDate, navigate });
};

export const buildExportHeaders = (rows) => {
  const raw = parseRawRowJson(rows[0]);
  const keys = Object.keys(raw);
  if (keys.length > 0) return keys;
  return [
    'InvTo', 'Sr', 'JobHunterName', 'InterviewFor', 'IntervieweeName', 'CompanyName',
    'InterviewType', 'Status', 'InterviewDate', 'JobStartDate', 'JobCloseDate',
    'FirstSalary', 'JhSuggest', 'InterviewCharges', 'JhDue', 'FirstPaymentOnJob',
    'SecondPaymentOnJob', 'BalancePayable',
  ];
};

export const rowToExportLine = (record, headers) =>
  headers.map((h) => {
    const raw = parseRawRowJson(record);
    const v = raw[h] ?? record[h] ?? '';
    return `"${String(v).replace(/"/g, '""')}"`;
  });

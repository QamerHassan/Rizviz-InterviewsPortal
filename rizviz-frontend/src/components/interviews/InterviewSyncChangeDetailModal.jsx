import React, { useMemo } from 'react';
import { Modal, Table, Tag, Typography, Alert } from 'antd';

const { Text, Title } = Typography;

const pick = (obj, ...keys) => {
  for (const k of keys) {
    if (obj?.[k] != null) return obj[k];
  }
  return undefined;
};

const changeTypeColor = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('cancel')) return 'red';
  if (t.includes('postpone')) return 'orange';
  if (t.includes('reschedule')) return 'blue';
  if (t.includes('new')) return 'green';
  return 'purple';
};

const normalizeVal = (v) => (v == null || v === '' ? '—' : String(v));

/** Parse "[Reschedule] Job Start Date: 09-Mar → 10-Mar" when API sends summary only */
const rowsFromSummary = (summary, fieldChanges) => {
  const lines = [...(fieldChanges || [])];
  const sum = summary || '';
  const stripped = sum.replace(/^\[[^\]]+\]\s*/, '').trim();
  if (lines.length === 0 && stripped.includes('→')) lines.push(stripped);

  return lines
    .map((line, i) => {
      const clean = line.replace(/^\[[^\]]+\]\s*/, '').trim();
      const m = clean.match(/^([^:]+):\s*(.+?)\s*→\s*(.+)$/);
      if (!m) return null;
      return {
        key: `fc-${i}`,
        column: m[1].trim(),
        before: m[2].trim(),
        after: m[3].trim(),
        changed: true,
      };
    })
    .filter(Boolean);
};

const rowsFromDictionaries = (oldRow, newRow) => {
  const old = oldRow && typeof oldRow === 'object' ? oldRow : {};
  const neu = newRow && typeof newRow === 'object' ? newRow : {};
  const keys = new Set([...Object.keys(old), ...Object.keys(neu)]);
  return Array.from(keys)
    .filter((k) => k && String(k).trim())
    .sort((a, b) => a.localeCompare(b))
    .map((col) => {
      const before = normalizeVal(old[col]);
      const after = normalizeVal(neu[col]);
      return { key: col, column: col, before, after, changed: before !== after };
    });
};

const InterviewSyncChangeDetailModal = ({ open, onClose, change }) => {
  const changeType = pick(change, 'changeType', 'ChangeType') || 'Data change';
  const sr = pick(change, 'sr', 'Sr');
  const interviewee = pick(change, 'intervieweeName', 'IntervieweeName');
  const company = pick(change, 'companyName', 'CompanyName');
  const summary = pick(change, 'summary', 'Summary') || '';
  const fieldChanges = pick(change, 'fieldChanges', 'FieldChanges') || [];
  const rowFields = pick(change, 'rowFields', 'RowFields');
  const oldRow = pick(change, 'oldRow', 'OldRow');
  const newRow = pick(change, 'newRow', 'NewRow');
  const isNewRow = (changeType || '').toLowerCase().includes('new');

  const rowData = useMemo(() => {
    if (Array.isArray(rowFields) && rowFields.length > 0) {
      return rowFields.map((f, i) => ({
        key: f.column ?? f.Column ?? i,
        column: f.column ?? f.Column ?? '—',
        before: normalizeVal(f.before ?? f.Before),
        after: normalizeVal(f.after ?? f.After),
        changed: f.changed ?? f.Changed ?? false,
      }));
    }

    const fromDict = rowsFromDictionaries(oldRow, newRow);
    if (fromDict.length > 0) return fromDict;

    return rowsFromSummary(summary, fieldChanges);
  }, [rowFields, oldRow, newRow, summary, fieldChanges]);

  const columns = isNewRow
    ? [
        { title: 'Column (Excel)', dataIndex: 'column', width: 200, ellipsis: true },
        { title: 'Value', dataIndex: 'after', ellipsis: true },
      ]
    : [
        { title: 'Column (Excel)', dataIndex: 'column', width: 180, ellipsis: true },
        {
          title: 'Before',
          dataIndex: 'before',
          ellipsis: true,
          render: (v, r) => (
            <Text type={r.changed ? 'secondary' : undefined} delete={r.changed}>
              {v}
            </Text>
          ),
        },
        {
          title: 'After',
          dataIndex: 'after',
          ellipsis: true,
          render: (v, r) => (
            <Text strong={r.changed} type={r.changed ? 'danger' : undefined}>
              {v}
            </Text>
          ),
        },
      ];

  return (
    <Modal
      title="Row change details"
      open={open}
      onCancel={onClose}
      onOk={onClose}
      okText="Close"
      width={820}
      destroyOnHidden
      zIndex={1100}
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Tag color={changeTypeColor(changeType)}>{changeType}</Tag>
        <Text strong>Sr {sr ?? '—'}</Text>
        <Text type="secondary">·</Text>
        <Text>{interviewee || '—'}</Text>
        {company && <Text type="secondary">@ {company}</Text>}
      </div>

      {(fieldChanges.length > 0 || summary) && (
        <Alert
          type="info"
          showIcon
          className="!mb-3"
          title="What changed"
          description={
            <ul className="!mb-0 !pl-4 text-xs">
              {(fieldChanges.length > 0 ? fieldChanges : [summary.replace(/^\[[^\]]+\]\s*/, '')]).map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          }
        />
      )}

      <Title level={5} className="!mb-2 !mt-0">
        {isNewRow ? 'Full row from Excel' : 'Full row — before vs after'}
      </Title>
      {rowData.length === 0 ? (
        <Text type="secondary">No row detail available. Restart the API, save Excel, and Refresh again.</Text>
      ) : (
        <Table
          size="small"
          columns={columns}
          dataSource={rowData}
          pagination={rowData.length > 12 ? { pageSize: 12 } : false}
          rowClassName={(r) => (r.changed ? 'interviews-sync-row-changed' : '')}
          scroll={{ y: 360 }}
        />
      )}
    </Modal>
  );
};

export default InterviewSyncChangeDetailModal;

import React, { useState } from 'react';
import { Modal, Descriptions, Typography, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import InterviewSyncChangeDetailModal from './InterviewSyncChangeDetailModal';

const { Text } = Typography;

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

const InterviewSyncSummaryModal = ({ open, onClose, summary }) => {
  const [selectedChange, setSelectedChange] = useState(null);

  if (!summary) return null;

  const syncedAt = pick(summary, 'syncedAt', 'SyncedAt');
  const sourcePath = pick(summary, 'sourcePath', 'SourcePath');
  const sourceModified = pick(summary, 'sourceFileLastModified', 'SourceFileLastModified');
  const changes = pick(summary, 'changes', 'Changes') || [];

  const handleClose = () => {
    setSelectedChange(null);
    onClose();
  };

  const changeColumns = [
    {
      title: 'Sr',
      dataIndex: 'sr',
      width: 70,
      render: (_, r) => r.sr ?? r.Sr ?? '—',
    },
    {
      title: 'Interviewee',
      dataIndex: 'intervieweeName',
      ellipsis: true,
      render: (_, r) => r.intervieweeName ?? r.IntervieweeName ?? '—',
    },
    {
      title: 'Change',
      dataIndex: 'changeType',
      width: 120,
      render: (_, r) => {
        const type = r.changeType ?? r.ChangeType ?? 'Data change';
        return <Tag color={changeTypeColor(type)}>{type}</Tag>;
      },
    },
    {
      title: 'Details',
      dataIndex: 'summary',
      ellipsis: true,
      render: (_, r) => (
        <Text className="text-xs text-purple-600" title={r.summary ?? r.Summary}>
          {r.summary ?? r.Summary ?? '—'}
        </Text>
      ),
    },
  ];

  return (
    <>
      <Modal
        title="Excel sync summary"
        open={open}
        onCancel={handleClose}
        onOk={handleClose}
        okText="Close"
        width={720}
        destroyOnHidden
        zIndex={1000}
      >
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Synced at">
            {syncedAt ? dayjs(syncedAt).format('MMM D, YYYY h:mm A') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="File read">
            <Text className="text-xs break-all">{sourcePath || '—'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="File saved at">
            {sourceModified ? dayjs(sourceModified).format('MMM D, YYYY h:mm A') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Total rows">{pick(summary, 'totalRows', 'TotalRows') ?? 0}</Descriptions.Item>
          <Descriptions.Item label="New rows">{pick(summary, 'insertedRows', 'InsertedRows') ?? 0}</Descriptions.Item>
          <Descriptions.Item label="Changed">{pick(summary, 'updatedRows', 'UpdatedRows') ?? 0}</Descriptions.Item>
          <Descriptions.Item label="Unchanged">{pick(summary, 'unchangedRows', 'UnchangedRows') ?? 0}</Descriptions.Item>
          <Descriptions.Item label="Failed">{pick(summary, 'failedRows', 'FailedRows') ?? 0}</Descriptions.Item>
        </Descriptions>

        {summary.message && (
          <Text type="secondary" className="block mt-3 text-xs">
            {summary.message}
          </Text>
        )}

        {changes.length > 0 ? (
          <div className="mt-4">
            <Text strong className="block mb-1 text-sm">What changed in this refresh</Text>
            <Text type="secondary" className="block mb-2 text-xs">
              Click a row to see full Excel data (before vs after).
            </Text>
            <Table
              size="small"
              columns={changeColumns}
              dataSource={changes.map((c, i) => ({ ...c, key: i }))}
              pagination={changes.length > 8 ? { pageSize: 8 } : false}
              scroll={{ x: 600 }}
              onRow={(record) => ({
                onClick: () => setSelectedChange(record),
                style: { cursor: 'pointer' },
              })}
            />
          </div>
        ) : (
          <Text type="secondary" className="block mt-3 text-xs">
            No field changes detected — Excel matches what is already in the database. Save your file (Ctrl+S) if you edited dates or names.
          </Text>
        )}

        <Text type="secondary" className="block mt-2 text-xs">
          Save your Excel file (Ctrl+S), then upload it or trigger synchronization. Rows match by Sr number.
        </Text>
      </Modal>

      <InterviewSyncChangeDetailModal
        open={!!selectedChange}
        onClose={() => setSelectedChange(null)}
        change={selectedChange}
      />
    </>
  );
};

export default InterviewSyncSummaryModal;

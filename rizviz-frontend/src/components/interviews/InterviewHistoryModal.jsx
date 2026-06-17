import React from 'react';
import { Modal, Timeline, Typography, Spin, Empty } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;

const InterviewHistoryModal = ({ open, onClose, interview, history = [], loading }) => (
  <Modal
    title={interview ? `History — ${interview.IntervieweeName || 'Interview'}` : 'Interview history'}
    open={open}
    onCancel={onClose}
    footer={null}
    width={560}
    destroyOnHidden
  >
    {loading ? (
      <div className="py-8 text-center"><Spin /></div>
    ) : !history.length ? (
      <Empty description="No change history yet" />
    ) : (
      <Timeline
        items={history.map((h) => ({
          color: h.NewStatus === 'Cancelled' ? 'red' : h.NewStatus === 'Postponed' ? 'blue' : 'purple',
          children: (
            <div className="text-sm">
              <Text strong>{dayjs(h.ChangedAt).format('MMM D, YYYY h:mm A')}</Text>
              <div className="text-xs text-slate-500">{h.ChangedBy}</div>
              {h.ChangeSummary && <div className="mt-1">{h.ChangeSummary}</div>}
              {!h.ChangeSummary && (
                <div className="mt-1">
                  {h.OldStatus && h.NewStatus && <span>Status: {h.OldStatus} → {h.NewStatus}. </span>}
                  {h.OldRecruiter !== h.NewRecruiter && (
                    <span>Recruiter: {h.OldRecruiter || '—'} → {h.NewRecruiter || '—'}. </span>
                  )}
                </div>
              )}
            </div>
          ),
        }))}
      />
    )}
  </Modal>
);

export default InterviewHistoryModal;

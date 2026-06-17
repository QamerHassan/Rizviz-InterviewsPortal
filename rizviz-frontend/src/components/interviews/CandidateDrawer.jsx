import React, { useMemo, useState } from 'react';
import { Drawer, Spin, Tag, Empty, Collapse, Button, Typography } from 'antd';
import {
  CloseOutlined, CalendarOutlined, TrophyOutlined,
  RightOutlined, DownOutlined, UserOutlined,
} from '@ant-design/icons';
import {
  useGetCandidateDetailQuery,
  useGetLeadsQuery,
} from '../../store/apiSlice';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import InterviewDetailDrawer from './InterviewDetailDrawer';
import { getInterviewRowStatus, STATUS_PILL_COLORS } from '../../utils/interviewStatusUtils';

const { Text } = Typography;

const formatDate = (d) => (d ? dayjs(d).format('MMM D, YYYY') : '—');

const statusPill = (status) => {
  const key = (status || '').toLowerCase().trim();
  const pal = STATUS_PILL_COLORS[key] || STATUS_PILL_COLORS.default;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: pal.bg, color: pal.text, border: `1px solid ${pal.border}` }}
    >
      {status || '—'}
    </span>
  );
};

const StatBox = ({ label, value, color }) => (
  <div
    className="flex-1 flex flex-col items-center justify-center rounded-2xl py-4 px-3"
    style={{ background: color?.bg || '#f1f5f9', minWidth: 0 }}
  >
    <span className="text-3xl font-black leading-none" style={{ color: color?.text || '#1e293b' }}>
      {value}
    </span>
    <span className="text-[11px] font-semibold mt-1 text-center" style={{ color: color?.label || '#64748b' }}>
      {label}
    </span>
  </div>
);

const CandidateDrawer = ({ candidateName, open, onClose }) => {
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const [selectedInterview, setSelectedInterview] = useState(null);

  const { data, isLoading } = useGetCandidateDetailQuery(candidateName, {
    skip: !candidateName || !open,
  });
  const { data: leadsData } = useGetLeadsQuery(
    { interviewee: candidateName },
    { skip: !candidateName || !open }
  );

  const records = data?.records || [];
  const summary = data?.summary || {};
  const totalLeads = Array.isArray(leadsData?.data) ? leadsData.data.length : 0;

  // Group interviews by their computed status
  const byStatus = useMemo(() => {
    const groups = {};
    records.forEach((r) => {
      const status = getInterviewRowStatus(r);
      if (!groups[status]) groups[status] = [];
      groups[status].push(r);
    });
    return groups;
  }, [records]);

  const statusOrder = [
    'Converted', 'Scheduled', 'Rescheduled', 'Postponed', 'Rejected',
    'Dropped', 'Closed', 'Dead', 'Cancelled', 'Applied', 'Shortlisted',
  ];
  const sortedStatuses = [
    ...statusOrder.filter((s) => byStatus[s]),
    ...Object.keys(byStatus).filter((s) => !statusOrder.includes(s)),
  ];

  const drawerBg = isDarkMode ? '#0f172a' : '#ffffff';
  const headerBg = isDarkMode ? '#1e293b' : '#f8faff';
  const borderColor = isDarkMode ? '#334155' : '#e2e8f0';

  const collapseItems = sortedStatuses.map((status) => {
    const rows = byStatus[status];
    const key = (status || '').toLowerCase().trim();
    const pal = STATUS_PILL_COLORS[key] || STATUS_PILL_COLORS.default;
    return {
      key: status,
      label: (
        <div className="flex items-center justify-between w-full pr-1">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: pal.text }}
            />
            <span className="text-sm font-semibold" style={{ color: isDarkMode ? '#e2e8f0' : '#1e293b' }}>
              {status}
            </span>
          </div>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: pal.bg, color: pal.text, border: `1px solid ${pal.border}` }}
          >
            {rows.length}
          </span>
        </div>
      ),
      children: (
        <div className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <button
              key={r.Id}
              type="button"
              onClick={() => setSelectedInterview(r)}
              className="w-full text-left rounded-xl px-3 py-2.5 transition-all hover:shadow-md"
              style={{
                background: isDarkMode ? '#1e293b' : '#f8faff',
                border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                cursor: 'pointer',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate" style={{ color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>
                    {r.CompanyName || '— No Company'}
                  </div>
                  <div className="text-[11px] mt-0.5 truncate" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                    {r.InterviewFor || '—'}&nbsp;·&nbsp;Sr#{r.Sr ?? '—'}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[10px] font-medium" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                    {formatDate(r.JobStartDate || r.InterviewDate)}
                  </span>
                  <RightOutlined style={{ fontSize: 10, color: '#6366f1' }} />
                </div>
              </div>
            </button>
          ))}
        </div>
      ),
    };
  });

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        placement="right"
        closable={false}
        styles={{
          body: { padding: 0, background: drawerBg },
          header: { display: 'none' },
          mask: { backdropFilter: 'blur(2px)' },
        }}
        style={{ width: Math.min(480, window.innerWidth) }}
      >
        {/* ── Custom Header ── */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ background: headerBg, borderColor }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-base flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
            >
              {candidateName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black truncate" style={{ color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>
                {candidateName || 'Candidate'}
              </div>
              <div className="text-[11px] font-medium" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                Candidate Profile
              </div>
            </div>
          </div>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            className="flex-shrink-0"
            style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Spin size="large" />
          </div>
        ) : (
          <div className="flex flex-col gap-4 px-4 py-4" style={{ background: drawerBg }}>
            {/* ── Stat Boxes ── */}
            <div className="flex gap-3">
              <StatBox
                label="Total Interviews"
                value={summary.totalInterviews ?? records.length}
                color={{ bg: '#eef2ff', text: '#4338ca', label: '#6366f1' }}
              />
              <StatBox
                label="Total Leads"
                value={totalLeads}
                color={{ bg: '#ecfdf5', text: '#059669', label: '#10b981' }}
              />
            </div>

            {/* ── Interviews by Status ── */}
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <CalendarOutlined style={{ color: '#6366f1', fontSize: 13 }} />
                <span className="text-xs font-black uppercase tracking-wider" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                  Interviews by Status
                </span>
              </div>

              {sortedStatuses.length === 0 ? (
                <Empty description="No interviews found" />
              ) : (
                <Collapse
                  items={collapseItems}
                  defaultActiveKey={sortedStatuses.slice(0, 2)}
                  expandIconPosition="end"
                  ghost={false}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${borderColor}`,
                    borderRadius: 16,
                    overflow: 'hidden',
                  }}
                  className="candidate-status-collapse"
                />
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* ── Level 2: Interview Detail Drawer ── */}
      <InterviewDetailDrawer
        interview={selectedInterview}
        open={!!selectedInterview}
        onClose={() => setSelectedInterview(null)}
        candidateName={candidateName}
      />
    </>
  );
};

export default CandidateDrawer;

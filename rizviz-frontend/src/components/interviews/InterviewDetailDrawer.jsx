import React, { useMemo } from 'react';
import { Drawer, Spin, Button, Typography, Divider, Collapse } from 'antd';
import {
  CloseOutlined, LinkOutlined, CalendarOutlined,
  ClockCircleOutlined, TeamOutlined, TrophyOutlined,
} from '@ant-design/icons';
import {
  useGetLeadsQuery,
  useGetFeedbacksQuery,
  useGetInterviewsPagedQuery,
} from '../../store/apiSlice';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { STATUS_PILL_COLORS, getInterviewRowStatus } from '../../utils/interviewStatusUtils';

const { Text } = Typography;

const formatDate = (d) => (d ? dayjs(d).format('MMM D, YYYY') : '—');
const formatTime = (d, tz) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleTimeString('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch { return '—'; }
};

const statusBadge = (status, size = 'sm') => {
  const key = (status || '').toLowerCase().trim();
  const pal = STATUS_PILL_COLORS[key] || STATUS_PILL_COLORS.default;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center ${padding} rounded-full font-semibold`}
      style={{ backgroundColor: pal.bg, color: pal.text, border: `1px solid ${pal.border}` }}
    >
      {status || '—'}
    </span>
  );
};

const SectionLabel = ({ icon, label, isDarkMode }) => (
  <div className="flex items-center gap-2 mb-3">
    <span style={{ color: '#6366f1', fontSize: 13 }}>{icon}</span>
    <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
      {label}
    </span>
  </div>
);

const InfoRow = ({ label, value, isDarkMode }) => (
  <div className="flex items-start gap-2 py-1.5">
    <span className="text-[11px] font-semibold w-24 flex-shrink-0 mt-0.5" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
      {label}
    </span>
    <span className="text-[13px] font-semibold flex-1" style={{ color: isDarkMode ? '#e2e8f0' : '#1e293b' }}>
      {value || '—'}
    </span>
  </div>
);

const TimelineStep = ({ label, date, status, isLast, isDarkMode }) => {
  const key = (status || '').toLowerCase().trim();
  const pal = STATUS_PILL_COLORS[key] || STATUS_PILL_COLORS.default;
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
          style={{ backgroundColor: pal.text, border: `2px solid ${pal.border}` }}
        />
        {!isLast && (
          <div className="w-px flex-1 mt-1" style={{ backgroundColor: isDarkMode ? '#334155' : '#e2e8f0', minHeight: 20 }} />
        )}
      </div>
      <div className="flex-1 pb-3 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-bold" style={{ color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>{label}</span>
          {statusBadge(status)}
        </div>
        <span className="text-[11px]" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>{date}</span>
      </div>
    </div>
  );
};

const InterviewDetailDrawer = ({ interview, open, onClose, candidateName }) => {
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);

  const companyName = interview?.CompanyName;
  const interviewFor = interview?.InterviewFor;
  const interviewDate = interview?.JobStartDate || interview?.InterviewDate;

  // Fetch all interviews for this candidate to build the Round Journey
  const { data: pagedData } = useGetInterviewsPagedQuery(
    { candidate: candidateName, limit: 50 },
    { skip: !candidateName || !open }
  );

  // Fetch leads for this candidate
  const { data: leadsData } = useGetLeadsQuery(
    { interviewee: candidateName },
    { skip: !candidateName || !open }
  );

  // Fetch feedback for this candidate (match by Sr)
  const { data: feedbackData } = useGetFeedbacksQuery(
    { search: candidateName },
    { skip: !candidateName || !open }
  );

  const allInterviews = pagedData?.data || [];

  // Round Journey: interviews at the same company & role, ordered by date
  const roundJourney = useMemo(() => {
    if (!companyName) return [];
    return allInterviews
      .filter((r) =>
        (r.CompanyName || '').toLowerCase() === (companyName || '').toLowerCase()
      )
      .sort((a, b) => {
        const da = new Date(a.JobStartDate || a.InterviewDate || 0);
        const db = new Date(b.JobStartDate || b.InterviewDate || 0);
        return da - db;
      });
  }, [allInterviews, companyName]);

  // Related lead record
  const relatedLead = useMemo(() => {
    const leads = leadsData?.data || [];
    return leads.find((l) =>
      (l.CompanyName || '').toLowerCase() === (companyName || '').toLowerCase()
    ) || null;
  }, [leadsData, companyName]);

  // Feedback matching this interview's Sr
  const matchedFeedback = useMemo(() => {
    if (!interview?.Sr) return null;
    const fbList = Array.isArray(feedbackData) ? feedbackData : feedbackData?.data || [];
    return fbList.find((f) => String(f.Sr) === String(interview.Sr)) || null;
  }, [feedbackData, interview]);

  const drawerBg = isDarkMode ? '#0f172a' : '#ffffff';
  const headerBg = isDarkMode ? '#1e293b' : '#f8faff';
  const borderColor = isDarkMode ? '#334155' : '#e2e8f0';
  const sectionBg = isDarkMode ? 'rgba(255,255,255,0.03)' : '#f8faff';

  if (!interview) return null;

  const status = getInterviewRowStatus(interview);

  const collapseItems = [
    // Opportunity section
    (relatedLead || companyName) && {
      key: 'opportunity',
      label: (
        <div className="flex items-center gap-2">
          <TrophyOutlined style={{ color: '#f59e0b' }} />
          <span className="text-sm font-bold" style={{ color: isDarkMode ? '#e2e8f0' : '#1e293b' }}>Opportunity</span>
          {relatedLead && statusBadge(relatedLead.Status)}
        </div>
      ),
      children: (
        <div className="space-y-1">
          <InfoRow label="Company" value={companyName} isDarkMode={isDarkMode} />
          <InfoRow label="Job Profile" value={interviewFor} isDarkMode={isDarkMode} />
          <InfoRow label="Candidate" value={interview.IntervieweeName} isDarkMode={isDarkMode} />
          <InfoRow label="Job Hunter" value={interview.JobHunterName} isDarkMode={isDarkMode} />
          {relatedLead && (
            <>
              <InfoRow label="Lead Status" value={relatedLead.Status} isDarkMode={isDarkMode} />
              <InfoRow label="Rounds" value={relatedLead.Rounds} isDarkMode={isDarkMode} />
              {relatedLead.Notes && (
                <InfoRow label="Notes" value={relatedLead.Notes} isDarkMode={isDarkMode} />
              )}
            </>
          )}
          {relatedLead?.BdCloser && (
            <InfoRow label="BD Developer" value={relatedLead.BdCloser} isDarkMode={isDarkMode} />
          )}
        </div>
      ),
    },
    // This Interview section
    {
      key: 'this_interview',
      label: (
        <div className="flex items-center gap-2">
          <ClockCircleOutlined style={{ color: '#6366f1' }} />
          <span className="text-sm font-bold" style={{ color: isDarkMode ? '#e2e8f0' : '#1e293b' }}>This Interview</span>
        </div>
      ),
      children: (
        <div className="space-y-1">
          <InfoRow label="Sr" value={`#${interview.Sr ?? '—'}`} isDarkMode={isDarkMode} />
          <InfoRow label="Job Profile" value={interviewFor} isDarkMode={isDarkMode} />
          <InfoRow label="Job Start" value={formatDate(interview.JobStartDate)} isDarkMode={isDarkMode} />
          <InfoRow label="Job Close" value={formatDate(interview.JobCloseDate)} isDarkMode={isDarkMode} />
          <InfoRow label="Status" value={status} isDarkMode={isDarkMode} />
          {interviewDate && (
            <div className="mt-3 rounded-xl p-3" style={{ background: isDarkMode ? 'rgba(99,102,241,0.1)' : '#eef2ff', border: `1px solid ${isDarkMode ? 'rgba(99,102,241,0.2)' : '#c7d2fe'}` }}>
              <div className="text-[10px] uppercase font-black tracking-wider mb-2" style={{ color: '#6366f1' }}>
                Time Zones
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                {[
                  { label: 'EST (New York)', tz: 'America/New_York' },
                  { label: 'CST (Chicago)', tz: 'America/Chicago' },
                  { label: 'PST (LA)', tz: 'America/Los_Angeles' },
                  { label: 'PKT (Karachi)', tz: 'Asia/Karachi' },
                ].map(({ label, tz }) => (
                  <div key={tz} className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>{label}</span>
                    <span className="text-xs font-bold" style={{ color: isDarkMode ? '#a5b4fc' : '#4f46e5' }}>
                      {formatTime(interviewDate, tz)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
  ].filter(Boolean);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      closable={false}
      zIndex={1001}
      styles={{
        body: { padding: 0, background: drawerBg },
        header: { display: 'none' },
        mask: { backdropFilter: 'blur(2px)' },
      }}
      style={{ width: Math.min(500, window.innerWidth) }}
    >
      {/* ── Custom Header ── */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ background: headerBg, borderColor }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' }}
          >
            IV
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black truncate" style={{ color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>
              Interview Details
            </div>
            <div className="text-[11px] font-medium truncate" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
              {companyName || '—'} · {interviewFor || '—'}
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

      <div className="flex flex-col gap-4 px-4 py-4" style={{ background: drawerBg, overflowY: 'auto', maxHeight: 'calc(100vh - 70px)' }}>

        {/* ── Round Journey ── */}
        {roundJourney.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: sectionBg, border: `1px solid ${borderColor}` }}>
            <SectionLabel icon={<TeamOutlined />} label="Round Journey" isDarkMode={isDarkMode} />
            <div className="mt-1">
              {roundJourney.map((r, idx) => (
                <TimelineStep
                  key={r.Id}
                  label={r.InterviewFor || `Round ${idx + 1}`}
                  date={formatDate(r.JobStartDate || r.InterviewDate)}
                  status={getInterviewRowStatus(r)}
                  isLast={idx === roundJourney.length - 1}
                  isDarkMode={isDarkMode}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Collapsible Sections: Opportunity + This Interview ── */}
        <Collapse
          items={collapseItems}
          defaultActiveKey={['opportunity', 'this_interview']}
          expandIconPosition="end"
          ghost={false}
          style={{
            background: 'transparent',
            border: `1px solid ${borderColor}`,
            borderRadius: 16,
            overflow: 'hidden',
          }}
        />

        {/* ── Feedback ── */}
        <div className="rounded-2xl p-4" style={{ background: sectionBg, border: `1px solid ${borderColor}` }}>
          <SectionLabel icon={<CalendarOutlined />} label="Feedback" isDarkMode={isDarkMode} />
          {matchedFeedback ? (
            <div className="space-y-4">
              {matchedFeedback.Recommendation && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>Recommendation:</span>
                  {statusBadge(matchedFeedback.Recommendation)}
                </div>
              )}
              {matchedFeedback.EnglishFeedback && (
                <div>
                  <span className="text-[11px] font-semibold block mb-1" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>English Feedback</span>
                  <p className="text-[12px] leading-relaxed m-0 whitespace-pre-wrap" style={{ color: isDarkMode ? '#e2e8f0' : '#374151' }}>
                    {matchedFeedback.EnglishFeedback}
                  </p>
                </div>
              )}
              {matchedFeedback.TechnicalSkills && (
                <div>
                  <span className="text-[11px] font-semibold block mb-1" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>Technical Skills</span>
                  <p className="text-[12px] leading-relaxed m-0 whitespace-pre-wrap" style={{ color: isDarkMode ? '#e2e8f0' : '#374151' }}>
                    {matchedFeedback.TechnicalSkills}
                  </p>
                </div>
              )}
              {matchedFeedback.Communication && (
                <div>
                  <span className="text-[11px] font-semibold block mb-1" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>Communication</span>
                  <p className="text-[12px] leading-relaxed m-0 whitespace-pre-wrap" style={{ color: isDarkMode ? '#e2e8f0' : '#374151' }}>
                    {matchedFeedback.Communication}
                  </p>
                </div>
              )}
              {matchedFeedback.Strengths && (
                <div>
                  <span className="text-[11px] font-semibold block mb-1" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>Strengths</span>
                  <p className="text-[12px] leading-relaxed m-0 whitespace-pre-wrap" style={{ color: isDarkMode ? '#e2e8f0' : '#374151' }}>
                    {matchedFeedback.Strengths}
                  </p>
                </div>
              )}
              {matchedFeedback.Weaknesses && (
                <div>
                  <span className="text-[11px] font-semibold block mb-1" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>Weaknesses</span>
                  <p className="text-[12px] leading-relaxed m-0 whitespace-pre-wrap" style={{ color: isDarkMode ? '#e2e8f0' : '#374151' }}>
                    {matchedFeedback.Weaknesses}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[12px] m-0" style={{ color: isDarkMode ? '#475569' : '#94a3b8' }}>
              No feedback recorded for this interview (Sr #{interview?.Sr ?? '—'}).
            </p>
          )}
        </div>

      </div>
    </Drawer>
  );
};

export default InterviewDetailDrawer;

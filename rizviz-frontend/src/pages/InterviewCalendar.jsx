import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Tooltip, Modal, Spin, Empty, Alert } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  ArrowLeftOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import {
  useGetInterviewsForCalendarQuery,
  useRefreshInterviewsFromExcelMutation,
  useGetExcelSessionStatusQuery,
} from '../store/apiSlice';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import ExcelUploadRequired from '../components/ExcelUploadRequired';

const { Title, Paragraph, Text } = Typography;

const RECRUITER_COLORS = {
  'hashir tariq': '#3B82F6',
  'ammara liaqat': '#8B5CF6',
  'arez hassan': '#10B981',
  'amna jamil': '#EC4899',
  'walli ullah': '#F59E0B',
  'sadaf khurram': '#14B8A6',
  'zainab': '#EF4444',
  'shaheer mehmood': '#6366F1',
  'ali mehmood': '#06B6D4',
  'yahya': '#84CC16',
  'qamer hassan': '#4f46e5',
};

const DEFAULT_COLOR = '#6B7280';
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MAX_CHIPS_PER_DAY = 8;

const getTimezoneTimes = (isoDate) => {
  if (!isoDate || !dayjs(isoDate).isValid()) return null;
  const est = dayjs(isoDate);
  const hasTime = est.hour() !== 0 || est.minute() !== 0;
  if (!hasTime) {
    return { est: '12:00 PM', pkt: '9:00 PM', pst: '9:00 AM', cst: '11:00 AM', hasTime: false };
  }
  return {
    est: est.format('h:mm A'),
    pkt: est.add(9, 'hour').format('h:mm A'),
    pst: est.subtract(3, 'hour').format('h:mm A'),
    cst: est.subtract(1, 'hour').format('h:mm A'),
    hasTime: true,
  };
};

const getOrdinalRound = (n) => {
  if (n <= 0) return '1st';
  const labels = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
  if (n <= labels.length) return labels[n - 1];
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n}st`;
  if (mod10 === 2 && mod100 !== 12) return `${n}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${n}rd`;
  return `${n}th`;
};

const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getRecruiterColor = (name) => {
  if (!name) return DEFAULT_COLOR;
  return RECRUITER_COLORS[name.trim().toLowerCase()] || DEFAULT_COLOR;
};

/** Collect every date on the row (same fields as Interviews table). */
const getRecordDateEntries = (r) => {
  const entries = [];
  const seen = new Set();
  const push = (val, kind) => {
    if (!val) return;
    const d = dayjs(val);
    if (!d.isValid()) return;
    const key = d.format('YYYY-MM-DD');
    const sig = `${key}|${kind}`;
    if (seen.has(sig)) return;
    seen.add(sig);
    entries.push({ key, iso: val, kind });
  };
  push(r.JobStartDate ?? r.jobStartDate, 'start');
  push(r.InterviewDate ?? r.interviewDate, 'interview');
  push(r.JobCloseDate ?? r.jobCloseDate, 'close');
  return entries;
};

const normalizeRecord = (r) => {
  const interviewType = r.InterviewType ?? r.interviewType ?? '';
  const status = r.Status ?? r.status ?? 'Scheduled';
  return {
    id: r.Id ?? r.id,
    sr: r.Sr ?? r.sr,
    interviewDate: r.InterviewDate ?? r.interviewDate,
    jobStartDate: r.JobStartDate ?? r.jobStartDate,
    jobCloseDate: r.JobCloseDate ?? r.jobCloseDate,
    intervieweeName: r.IntervieweeName ?? r.intervieweeName,
    companyName: r.CompanyName ?? r.companyName,
    interviewFor: r.InterviewFor ?? r.interviewFor,
    interviewType,
    status,
    isJobLanded: interviewType === 'Job Landed',
    jobHunterName: r.JobHunterName ?? r.jobHunterName,
    invTo: r.InvTo ?? r.invTo,
    dateEntries: getRecordDateEntries(r),
  };
};

const kindLabel = (kind) => {
  if (kind === 'close') return 'Close';
  if (kind === 'interview') return 'Intv';
  return 'Start';
};

const InterviewChip = ({ item, isDarkMode, onClick }) => {
  const color = getRecruiterColor(item.intervieweeName);
  const tz = getTimezoneTimes(item.calendarDate);

  // Determine if this interview is in the past
  const isPast = item.calendarDate
    ? dayjs(item.calendarDate).isBefore(dayjs(), 'day')
    : false;

  const tooltipContent = (
    <div className="text-xs space-y-1">
      <div><strong>Candidate:</strong> {item.intervieweeName || '—'}</div>
      <div><strong>Company:</strong> {item.companyName || '—'}</div>
      <div><strong>Job Profile:</strong> {item.interviewFor || '—'}</div>
      <div><strong>Status:</strong> {item.status || '—'}</div>
      <div><strong>Type:</strong> {item.interviewType || '—'}</div>
      <div><strong>Date:</strong> {item.calendarDate ? dayjs(item.calendarDate).format('MMM D, YYYY h:mm A') : '—'}</div>
      <div><strong>Job Hunter:</strong> {item.jobHunterName || '—'}</div>
      {tz && (
        <>
          <div><strong>EST:</strong> {tz.est}</div>
          <div><strong>PAK (PKT):</strong> {tz.pkt}</div>
        </>
      )}
    </div>
  );

  const isClose = item.eventKind === 'close' || item.isJobLanded;

  // Past chip: very light/faded background, greyed avatar, muted text
  const chipBg = isPast
    ? (isDarkMode ? 'rgba(75,85,99,0.18)' : 'rgba(156,163,175,0.15)')
    : isClose
      ? (isDarkMode ? '#3D2E14' : '#FEF3C7')
      : (isDarkMode ? '#2D2456' : '#F3F0FF');

  const chipBorder = isPast
    ? (isDarkMode ? 'rgba(107,114,128,0.3)' : 'rgba(156,163,175,0.35)')
    : isClose
      ? (isDarkMode ? '#92400E' : '#FCD34D')
      : (isDarkMode ? '#4C3F8A' : '#E0D9FF');

  const avatarBg = isPast
    ? (isDarkMode ? '#4B5563' : '#9CA3AF')
    : color;

  const roundBadgeBg = isPast
    ? (isDarkMode ? 'rgba(107,114,128,0.25)' : 'rgba(156,163,175,0.2)')
    : (isDarkMode ? 'rgba(79,70,229,0.35)' : 'rgba(79,70,229,0.15)');

  const roundBadgeColor = isPast
    ? (isDarkMode ? '#9CA3AF' : '#9CA3AF')
    : (isDarkMode ? '#c7d2fe' : '#4338ca');

  const textColor = isPast
    ? (isDarkMode ? '#6B7280' : '#9CA3AF')
    : (isDarkMode ? '#e2e8f0' : '#1e293b');

  const timeColor = isPast
    ? (isDarkMode ? '#4B5563' : '#C4C9D4')
    : (isDarkMode ? '#94a3b8' : '#64748b');

  return (
    <Tooltip title={tooltipContent} placement="top" mouseEnterDelay={0.2}>
      <button
        type="button"
        onClick={onClick}
        className="interview-calendar-chip w-full flex items-center gap-1.5 px-1.5 py-1 rounded-full border text-left transition-colors"
        style={{
          background: chipBg,
          borderColor: chipBorder,
          fontSize: 11,
          opacity: isPast ? 0.65 : 1,
        }}
      >
        <span
          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white font-bold"
          style={{ fontSize: 8, background: avatarBg }}
        >
          {getInitials(item.intervieweeName)}
        </span>
        <span
          className="flex-shrink-0 px-1 rounded font-semibold"
          style={{
            fontSize: 9,
            background: roundBadgeBg,
            color: roundBadgeColor,
          }}
        >
          {isClose ? 'Land' : (item.round || kindLabel(item.eventKind))}
        </span>
        <span
          className="flex-1 truncate font-medium"
          style={{ color: textColor }}
        >
          {item.companyName || item.interviewFor || 'No company'}
        </span>
        <span className="flex-shrink-0" style={{ fontSize: 10, color: timeColor }}>
          {tz?.est || '—'}
        </span>
      </button>
    </Tooltip>
  );
};

const InterviewCalendar = () => {
  const navigate = useNavigate();
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const { role } = useSelector((state) => state.auth);
  const [currentMonth, setCurrentMonth] = useState(() => dayjs().startOf('month'));
  const [dayModal, setDayModal] = useState({ open: false, date: null, items: [] });
  const monthInitialized = useRef(false);

  const { data: uploadStatus } = useGetExcelSessionStatusQuery(undefined, {
    skip: role !== 'Admin',
  });

  const { data, isLoading, isFetching, refetch, error } = useGetInterviewsForCalendarQuery();
  const [refreshFromExcel, { isLoading: isSyncing }] = useRefreshInterviewsFromExcelMutation();

  const rawRecords = Array.isArray(data?.data) ? data.data : [];
  const totalLoaded = data?.total ?? rawRecords.length;

  const { calendarEvents, unscheduled, eventsByDate, busiestMonth } = useMemo(() => {
    const normalized = rawRecords.map(normalizeRecord);

    const byCandidate = {};
    normalized.forEach((r) => {
      const key = (r.interviewFor || r.intervieweeName || `row-${r.id}`).trim().toLowerCase();
      if (!byCandidate[key]) byCandidate[key] = [];
      byCandidate[key].push(r);
    });

    const rounds = {};
    Object.values(byCandidate).forEach((list) => {
      list.sort((a, b) => {
        const da = a.jobStartDate ? dayjs(a.jobStartDate).valueOf() : 0;
        const db = b.jobStartDate ? dayjs(b.jobStartDate).valueOf() : 0;
        return da - db || (a.sr || 0) - (b.sr || 0);
      });
      list.forEach((r, idx) => {
        rounds[r.id] = getOrdinalRound(idx + 1);
      });
    });

    const events = [];
    const noDate = [];

    normalized.forEach((r) => {
      const base = {
        ...r,
        round: r.isJobLanded ? 'Land' : (rounds[r.id] || '1st'),
      };
      if (!base.dateEntries.length) {
        noDate.push(base);
        return;
      }
      base.dateEntries.forEach((de) => {
        events.push({
          ...base,
          calendarDate: de.iso,
          eventKind: de.kind,
          chipKey: `${r.id}-${de.kind}-${de.key}`,
        });
      });
    });

    const map = {};
    const monthCounts = {};
    events.forEach((item) => {
      const key = dayjs(item.calendarDate).format('YYYY-MM-DD');
      if (!map[key]) map[key] = [];
      map[key].push(item);
      const ym = key.slice(0, 7);
      monthCounts[ym] = (monthCounts[ym] || 0) + 1;
    });

    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => {
        const ta = dayjs(a.calendarDate).valueOf();
        const tb = dayjs(b.calendarDate).valueOf();
        return ta - tb || (a.sr || 0) - (b.sr || 0);
      });
    });

    const busiest = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0];
    const busiestMonth = busiest ? dayjs(`${busiest[0]}-01`) : dayjs().startOf('month');

    return {
      calendarEvents: events,
      unscheduled: noDate,
      eventsByDate: map,
      busiestMonth,
    };
  }, [rawRecords]);

  useEffect(() => {
    if (monthInitialized.current || isLoading) return;
    if (calendarEvents.length > 0) {
      setCurrentMonth(busiestMonth.startOf('month'));
      monthInitialized.current = true;
    }
  }, [isLoading, calendarEvents.length, busiestMonth]);

  const monthInView = useMemo(() => {
    const daysInMonth = currentMonth.daysInMonth();
    let filled = 0;
    let eventCount = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = currentMonth.date(d).format('YYYY-MM-DD');
      const n = (eventsByDate[key] || []).length;
      if (n > 0) filled++;
      eventCount += n;
    }
    const pct = daysInMonth > 0 ? Math.round((filled / daysInMonth) * 100) : 0;
    return { daysInMonth, filled, pct, eventCount };
  }, [currentMonth, eventsByDate]);

  const calendarDays = useMemo(() => {
    const start = currentMonth.startOf('month');
    const end = currentMonth.endOf('month');
    const startPad = start.day();
    const daysInMonth = end.date();
    const cells = [];

    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = currentMonth.date(d);
      cells.push({
        date,
        key: date.format('YYYY-MM-DD'),
        isToday: date.isSame(dayjs(), 'day'),
        items: eventsByDate[date.format('YYYY-MM-DD')] || [],
      });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [currentMonth, eventsByDate]);

  const handleSyncRefresh = async () => {
    try {
      await refreshFromExcel().unwrap();
      monthInitialized.current = false;
      refetch();
    } catch {
      /* toast handled on Interviews page */
    }
  };

  const headingColor = isDarkMode ? '#f1f5f9' : '#1e293b';
  const labelColor = isDarkMode ? '#94a3b8' : '#64748b';
  const cellBg = isDarkMode ? '#1F2937' : '#ffffff';
  const gridBorder = isDarkMode ? '#374151' : '#e5e7eb';
  const headerBg = isDarkMode ? '#111827' : '#f8fafc';

  const openDayModal = (date, items) => {
    setDayModal({ open: true, date, items });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Spin size="large" tip="Loading calendar..." />
      </div>
    );
  }

  if (role === 'Admin' && uploadStatus && !uploadStatus.hasUploaded) {
    return <ExcelUploadRequired />;
  }

  return (
    <div className="interview-calendar-page space-y-5">
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/interviews')}
        style={{ color: '#4f46e5', fontWeight: 600, paddingLeft: 0 }}
      >
        Back to Interviews
      </Button>

      <div>
        <Title level={2} style={{ margin: 0, fontWeight: 800, color: headingColor }}>
          Interview Calendar
        </Title>
      </div>

      {error && (
        <Alert type="error" showIcon title="Could not load interviews. Is the API running on port 5000?" />
      )}

      <div
        className="flex flex-wrap items-center justify-between gap-2 py-3 px-4 rounded-xl"
        style={{
          background: isDarkMode ? '#1e293b' : '#f8fafc',
          border: `1px solid ${gridBorder}`,
        }}
      >
        {/* Navigation group: prev + title + next always together */}
        <div className="flex items-center gap-2">
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={() => setCurrentMonth((m) => m.subtract(1, 'month'))}
            aria-label="Previous month"
          />
          <Title level={4} style={{ margin: 0, color: headingColor, whiteSpace: 'nowrap' }}>
            {currentMonth.format('MMMM YYYY')}
          </Title>
          <Button
            type="text"
            icon={<RightOutlined />}
            onClick={() => setCurrentMonth((m) => m.add(1, 'month'))}
            aria-label="Next month"
          />
        </div>

        {/* Action buttons — wrap on small screens */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => setCurrentMonth(busiestMonth.startOf('month'))}>
            Busiest ({busiestMonth.format('MMM YYYY')})
          </Button>
          <Button onClick={() => setCurrentMonth(dayjs().startOf('month'))}>Today</Button>
          <Button
            icon={<SyncOutlined />}
            loading={isSyncing || isFetching}
            onClick={handleSyncRefresh}
            className="bg-[#4f46e5] text-white border-none"
          >
            Sync
          </Button>
        </div>
      </div>

      {monthInView.eventCount === 0 && calendarEvents.length > 0 && (
        <Alert
          type="info"
          showIcon
          title={`No dated interviews in ${currentMonth.format('MMMM YYYY')}. Click "Busiest month" to jump to ${busiestMonth.format('MMMM YYYY')}.`}
        />
      )}

      <div
        className="interview-calendar-grid rounded-xl overflow-hidden overflow-x-auto"
        style={{ border: `1px solid ${gridBorder}` }}
      >
        <div style={{ minWidth: 560 }}>
          <div className="grid grid-cols-7" style={{ borderBottom: `1px solid ${gridBorder}` }}>
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="text-center py-2.5 text-xs font-bold tracking-wider"
                style={{ background: headerBg, color: labelColor, borderRight: `1px solid ${gridBorder}` }}
              >
                {wd}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((cell, idx) => {
              if (!cell) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="interview-calendar-cell-empty"
                    style={{
                      minHeight: 110,
                      background: isDarkMode ? '#111827' : '#f9fafb',
                      borderRight: `1px solid ${gridBorder}`,
                      borderBottom: `1px solid ${gridBorder}`,
                    }}
                  />
                );
              }

              const visible = cell.items.slice(0, MAX_CHIPS_PER_DAY);
              const overflow = cell.items.length - MAX_CHIPS_PER_DAY;

              return (
                <div
                  key={cell.key}
                  className="interview-calendar-cell p-1.5 flex flex-col"
                  style={{
                    minHeight: 110,
                    background: cell.items.length > 0
                      ? (isDarkMode ? 'rgba(79,70,229,0.08)' : 'rgba(79,70,229,0.04)')
                      : cellBg,
                    borderRight: `1px solid ${gridBorder}`,
                    borderBottom: `1px solid ${gridBorder}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full"
                      style={{
                        color: cell.isToday ? '#fff' : headingColor,
                        background: cell.isToday ? '#4f46e5' : 'transparent',
                      }}
                    >
                      {cell.date.date()}
                    </span>
                    {cell.items.length > 0 && (
                      <span className="text-[10px] font-semibold" style={{ color: labelColor }}>
                        {cell.items.length}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 flex-1">
                    {visible.map((item) => (
                      <InterviewChip
                        key={item.chipKey}
                        item={item}
                        isDarkMode={isDarkMode}
                        onClick={() => openDayModal(cell.date, cell.items)}
                      />
                    ))}
                    {overflow > 0 && (
                      <button
                        type="button"
                        className="text-left text-xs font-bold py-0.5 px-1 border-0 bg-transparent cursor-pointer"
                        style={{ color: '#4f46e5' }}
                        onClick={() => openDayModal(cell.date, cell.items)}
                      >
                        +{overflow} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {unscheduled.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            border: `1px solid ${gridBorder}`,
            background: isDarkMode ? '#1e293b' : '#fafafa',
          }}
        >
          <Title level={5} style={{ margin: '0 0 12px', color: headingColor }}>
            No date on file ({unscheduled.length}) — same rows as Interviews list without Job Start / Interview / Close date
          </Title>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {unscheduled.map((item) => (
              <Tooltip
                key={item.id}
                title={`${item.intervieweeName || '—'} · ${item.companyName || '—'} · Sr ${item.sr ?? '—'}`}
              >
                <span
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border"
                  style={{
                    background: isDarkMode ? '#2D2456' : '#F3F0FF',
                    borderColor: isDarkMode ? '#4C3F8A' : '#E0D9FF',
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full text-white flex items-center justify-center font-bold"
                    style={{ fontSize: 7, background: getRecruiterColor(item.intervieweeName) }}
                  >
                    {getInitials(item.intervieweeName)}
                  </span>
                  {item.companyName || item.interviewFor || `Row ${item.id}`}
                </span>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      {totalLoaded === 0 && !isLoading && (
        <Empty description="No interviews loaded. Sync from Excel on the Interviews page or click Sync & refresh." />
      )}

      <Modal
        title={dayModal.date ? dayModal.date.format('dddd, MMMM D, YYYY') : 'Interviews'}
        open={dayModal.open}
        onCancel={() => setDayModal({ open: false, date: null, items: [] })}
        footer={null}
        width={Math.min(480, window.innerWidth * 0.95)}
        destroyOnHidden
      >
        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
          {dayModal.items?.map((item) => (
            <InterviewChip
              key={item.chipKey}
              item={item}
              isDarkMode={isDarkMode}
              onClick={() => {}}
            />
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default InterviewCalendar;

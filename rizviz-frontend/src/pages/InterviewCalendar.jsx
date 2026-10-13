import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Tooltip,
  Modal,
  Spin,
  Empty,
  Alert,
  Tag,
  DatePicker,
  TimePicker,
  Select,
  Card,
  Avatar,
  Form,
  Input,
  InputNumber,
  Radio,
  Space,
  Divider,
  Badge,
  Drawer,
  Dropdown,
  message as AntMessage,
} from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  ArrowLeftOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  PlusOutlined,
  TeamOutlined,
  CodeOutlined,
  IdcardOutlined,
  ThunderboltOutlined,
  MailOutlined,
  BankOutlined,
  SendOutlined,
  MenuOutlined,
  SearchOutlined,
  EditOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import {
  useGetInterviewsForCalendarQuery,
  useGetDeveloperAvailabilityQuery,
  useSaveDeveloperAvailabilityMutation,
  useDeleteDeveloperAvailabilityMutation,
  useCreateInterviewMutation,
  useUpdateInterviewMutation,
  useDeleteInterviewMutation,
  useGetProfileOwnersQuery,
  useGetScheduleRequestsQuery,
  useRespondScheduleRequestMutation,
} from '../store/apiSlice';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import InterviewStatusBadge from '../components/interviews/InterviewStatusBadge';
import { getInterviewRowStatus } from '../utils/interviewStatusUtils';
import CalendarSettingsMenu, { saveToTrash, getStoredCalendarSettings } from '../components/CalendarSettingsMenu';

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

const STACK_TAG_COLORS = {
  'ai/python': 'purple',
  'devops': 'cyan',
  'servicenow': 'green',
  'dataengineering': 'orange',
  'salesforce': 'blue',
  'react': 'geekblue',
  '.net': 'magenta',
};

const DEFAULT_COLOR = '#6B7280';
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MAX_CHIPS_PER_DAY = 7;

// Offset in hours RELATIVE to EST (i.e. how many hours to add to an EST time to get the target tz)
// Data is stored/entered in EST by convention.
const TZ_OFFSET_FROM_EST = {
  EST: 0,
  CST: -1,  // CST = EST - 1h
  PST: -3,  // PST = EST - 3h
  PKT: +9,  // PKT = EST + 9h (during EDT)
  LOCAL: null, // special: use browser offset
};

const TZ_IANA = {
  EST: 'America/New_York',
  CST: 'America/Chicago',
  PST: 'America/Los_Angeles',
  PKT: 'Asia/Karachi',
  LOCAL: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Karachi',
};

const TZ_LABELS = {
  EST: 'EST',
  CST: 'CST',
  PST: 'PST',
  PKT: 'PKT',
  LOCAL: 'Local',
};

const TZ_FLAGS = {
  EST: '🇺🇸',
  CST: '🇺🇸',
  PST: '🇺🇸',
  PKT: '🇵🇰',
  LOCAL: '🌐',
};

/**
 * Get current time in specified timezone (e.g. EST, CST, PKT)
 */
const getNowTimeInTz = (tzKey = 'EST') => {
  const iana = TZ_IANA[tzKey] || 'America/New_York';
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: iana,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now);
  let hour = 0;
  let minute = 0;
  let second = 0;
  parts.forEach((p) => {
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'minute') minute = parseInt(p.value, 10);
    if (p.type === 'second') second = parseInt(p.value, 10);
  });
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: iana,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(now);
  return { hour, minute, second, formatted };
};

/**
 * Get today's YYYY-MM-DD date in specified timezone
 */
const getTodayDateStrInTz = (tzKey = 'EST') => {
  const iana = TZ_IANA[tzKey] || 'America/New_York';
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: iana,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  let y = '';
  let m = '';
  let d = '';
  parts.forEach((p) => {
    if (p.type === 'year') y = p.value;
    if (p.type === 'month') m = p.value;
    if (p.type === 'day') d = p.value;
  });
  return `${y}-${m}-${d}`;
};

/**
 * Convert a stored ISO date (treated as EST) to all timezone times.
 * primaryTz: the key from TZ_OFFSET_FROM_EST to use as the "primary" display tz.
 */
const getTimezoneTimes = (isoDate, primaryTz = 'EST') => {
  if (!isoDate || !dayjs(isoDate).isValid()) return null;
  const estBase = dayjs(isoDate);
  const hasTime = estBase.hour() !== 0 || estBase.minute() !== 0;

  const getTzDiffHours = (tz) => {
    if (tz === 'EST') return 0;
    if (tz === 'CST') return -1;
    if (tz === 'PST') return -3;
    if (tz === 'PKT') return 9;
    if (tz === 'LOCAL') {
      const browserOffsetMins = -new Date().getTimezoneOffset();
      const estOffsetMins = -240; // EDT is UTC-4 (-240m)
      return (browserOffsetMins - estOffsetMins) / 60;
    }
    return 0;
  };

  const getTzMoment = (tz) => {
    const diffHours = getTzDiffHours(tz);
    return estBase.add(diffHours * 60, 'minute');
  };

  const formatInTz = (tz) => {
    return getTzMoment(tz).format('h:mm A');
  };

  const primaryMoment = getTzMoment(primaryTz || 'EST');
  const decimalHourInPrimary = primaryMoment.hour() + primaryMoment.minute() / 60;

  const result = {
    hasTime,
    est: formatInTz('EST'),
    cst: formatInTz('CST'),
    pst: formatInTz('PST'),
    pkt: formatInTz('PKT'),
    local: formatInTz('LOCAL'),
    primary: formatInTz(primaryTz || 'EST'),
    primaryLabel: TZ_LABELS[primaryTz] || 'EST',
    primaryFlag: TZ_FLAGS[primaryTz] || '🇺🇸',
    primaryDate: primaryMoment.format('YYYY-MM-DD'),
    primaryHour: primaryMoment.hour(),
    primaryMinute: primaryMoment.minute(),
    decimalHourInPrimary,
  };

  return result;
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

const getStackTagColor = (stack) => {
  if (!stack) return 'default';
  const lower = stack.trim().toLowerCase();
  return STACK_TAG_COLORS[lower] || 'blue';
};

/** Collect every date on the row without duplicating cards for the same day. */
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

  const intvDate = r.InterviewDate ?? r.interviewDate;
  const startDate = r.JobStartDate ?? r.jobStartDate;
  const closeDate = r.JobCloseDate ?? r.jobCloseDate;

  // Primary: Interview Date
  if (intvDate) {
    push(intvDate, 'interview');
  }

  // Job Start Date: only if different from Interview Date (prevents duplicate calendar cards)
  if (startDate) {
    const isSameDay = intvDate && dayjs(startDate).format('YYYY-MM-DD') === dayjs(intvDate).format('YYYY-MM-DD');
    if (!isSameDay) {
      push(startDate, 'start');
    }
  }

  // Job Close Date: only if different from Interview Date
  if (closeDate) {
    const isSameAsIntv = intvDate && dayjs(closeDate).format('YYYY-MM-DD') === dayjs(intvDate).format('YYYY-MM-DD');
    if (!isSameAsIntv) {
      push(closeDate, 'close');
    }
  }

  // Fallback: If no date was pushed yet, push whatever is available
  if (entries.length === 0) {
    if (startDate) push(startDate, 'start');
    else if (closeDate) push(closeDate, 'close');
  }

  return entries;
};

const normalizeRecord = (r) => {
  const interviewType = r.InterviewType ?? r.interviewType ?? '';
  const status = r.Status ?? r.status ?? 'Scheduled';
  const stack = (r.Stack ?? r.stack ?? '').trim();
  const interviewFor = (r.InterviewFor ?? r.interviewFor ?? '').trim();

  return {
    id: r.Id ?? r.id,
    sr: r.Sr ?? r.sr,
    interviewDate: r.InterviewDate ?? r.interviewDate,
    jobStartDate: r.JobStartDate ?? r.jobStartDate,
    jobCloseDate: r.JobCloseDate ?? r.jobCloseDate,
    intervieweeName: r.IntervieweeName ?? r.intervieweeName,
    companyName: r.CompanyName ?? r.companyName,
    interviewFor,
    stack,
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

const InterviewChip = ({ item, isDarkMode, onClick, primaryTz = 'EST' }) => {
  const color = getRecruiterColor(item.intervieweeName);
  const tz = getTimezoneTimes(item.calendarDate, primaryTz);

  const isPast = item.calendarDate
    ? dayjs(item.calendarDate).isBefore(dayjs(), 'day')
    : false;

  const tooltipContent = (
    <div className="text-xs space-y-1.5 p-1">
      <div>🏢 <strong>Company:</strong> {item.companyName || '—'}</div>
      <div>👨‍💻 <strong>Developer:</strong> <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>{item.intervieweeName || '—'}</span></div>
      <div>🎯 <strong>Added by:</strong> <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{item.jobHunterName || 'Unassigned'}</span></div>
      <div>📅 <strong>Date:</strong> {item.calendarDate ? dayjs(item.calendarDate).format('dddd, DD MMMM YYYY') : '—'}</div>
      {tz && (
        <>
          <div>{tz.primaryFlag} <strong>{tz.primaryLabel}:</strong> {tz.primary}</div>
          {primaryTz !== 'EST' && <div>🇺🇸 <strong>EST:</strong> {tz.est}</div>}
          {primaryTz !== 'CST' && <div>🇺🇸 <strong>CST:</strong> {tz.cst}</div>}
          {primaryTz !== 'PKT' && <div>🇵🇰 <strong>PKT:</strong> {tz.pkt}</div>}
          {primaryTz !== 'PST' && <div>🇺🇸 <strong>PST:</strong> {tz.pst}</div>}
        </>
      )}
      {item.interviewFor && <div>👤 <strong>Profile:</strong> {item.interviewFor}</div>}
      {item.stack && <div>💻 <strong>Stack:</strong> {item.stack}</div>}
      <div>🏷️ <strong>Status:</strong> {item.status || '—'}</div>
    </div>
  );

  const isClose = item.eventKind === 'close' || item.isJobLanded;

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

  const avatarBg = isPast ? (isDarkMode ? '#4B5563' : '#9CA3AF') : color;
  const roundBadgeBg = isPast
    ? (isDarkMode ? 'rgba(107,114,128,0.25)' : 'rgba(156,163,175,0.2)')
    : (isDarkMode ? 'rgba(79,70,229,0.35)' : 'rgba(79,70,229,0.15)');
  const roundBadgeColor = isPast ? '#9CA3AF' : (isDarkMode ? '#c7d2fe' : '#4338ca');
  const textColor = isPast ? (isDarkMode ? '#6B7280' : '#9CA3AF') : (isDarkMode ? '#e2e8f0' : '#1e293b');
  const timeColor = isPast ? (isDarkMode ? '#4B5563' : '#C4C9D4') : (isDarkMode ? '#94a3b8' : '#64748b');

  return (
    <Tooltip title={tooltipContent} placement="top" mouseEnterDelay={0.2}>
      <button
        type="button"
        onClick={onClick}
        className="interview-calendar-chip w-full flex items-center gap-1 px-1.5 py-1 rounded-full border text-left transition-all hover:scale-[1.01]"
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
          style={{ fontSize: 9, background: roundBadgeBg, color: roundBadgeColor }}
        >
          {isClose ? 'Land' : (item.round || kindLabel(item.eventKind))}
        </span>

        {/* Small Stack badge on chip */}
        {item.stack && (
          <span
            className="flex-shrink-0 px-1 rounded font-bold uppercase text-[8px]"
            style={{
              background: isDarkMode ? '#1e3a5f' : '#e0f2fe',
              color: isDarkMode ? '#7dd3fc' : '#0369a1',
            }}
          >
            {item.stack.length > 8 ? item.stack.substring(0, 7) + '…' : item.stack}
          </span>
        )}

        <span className="flex-1 truncate font-medium" style={{ color: textColor }}>
          {item.companyName || item.interviewFor || 'No company'}
          {item.interviewFor && (
            <span className="text-[10px] opacity-75 font-normal ml-1">({item.interviewFor})</span>
          )}
        </span>

        <span className="flex-shrink-0 font-medium" style={{ fontSize: 10, color: timeColor }}>
          {tz?.primary || '—'}
        </span>
      </button>
    </Tooltip>
  );
};

// Timeline layout constants (Google Calendar style)
const TIMELINE_START_HOUR = 0; // 12 AM
const TIMELINE_HOUR_HEIGHT = 60; // px per hour
const TIMELINE_TOTAL_HOURS = 24;

const InterviewCalendar = () => {
  const navigate = useNavigate();
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const { role, interviewName, user } = useSelector((state) => state.auth);
  const isInterviewee = role === 'Interviewee';
  const currentUserCandidate = (interviewName || user?.fullName || user?.FullName || user?.username || '').trim();

  // Mobile detection
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // View mode options: 'day' (1 day), '2days', '3days', '4days', '5days', '6days', 'week' (7 days), or 'month'
  const [viewMode, setViewMode] = useState(() => {
    if (window.innerWidth < 768) return 'day';
    const saved = getStoredCalendarSettings()?.defaultView;
    return saved || 'month';
  });
  const [selectedDay, setSelectedDay] = useState(() => dayjs());
  const [currentMonth, setCurrentMonth] = useState(() => dayjs().startOf('month'));

  // Primary timezone from Settings (reacts to live changes)
  const [primaryTimezone, setPrimaryTimezone] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rizviz_calendar_settings') || '{}').primaryTimezone || 'EST';
    } catch { return 'EST'; }
  });

  // Listen for settings changes dispatched from CalendarSettingsMenu
  useEffect(() => {
    const handleSettingsChanged = (e) => {
      if (e.detail?.defaultView) {
        setViewMode(e.detail.defaultView);
      }
      if (e.detail?.primaryTimezone) {
        setPrimaryTimezone(e.detail.primaryTimezone);
      }
    };
    window.addEventListener('calendar-settings-changed', handleSettingsChanged);
    return () => window.removeEventListener('calendar-settings-changed', handleSettingsChanged);
  }, []);

  // Google Calendar Left Sidebar toggle (open/closed)
  const [calendarSidebarOpen, setCalendarSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const timelineScrollRef = useRef(null);

  // Search filter query (searches Candidate, Company, Stack)
  const [searchQuery, setSearchQuery] = useState('');

  // Selected event for Google Calendar event detail popup card
  const [selectedEventForModal, setSelectedEventForModal] = useState(null);
  const [editingInterviewRecord, setEditingInterviewRecord] = useState(null);

  const [selectedCandidateFilter, setSelectedCandidateFilter] = useState(() => (isInterviewee && currentUserCandidate ? currentUserCandidate : 'All'));
  const [selectedStackFilter, setSelectedStackFilter] = useState('All');

  const [availabilityModal, setAvailabilityModal] = useState({
    open: false,
    date: dayjs(),
    candidate: isInterviewee && currentUserCandidate ? currentUserCandidate : 'All',
  });

  // Multi-day calculation helpers
  const getNumDaysForView = useCallback((mode) => {
    switch (mode) {
      case 'day': return 1;
      case '2days': return 2;
      case '3days': return 3;
      case '4days': return 4;
      case '5days': return 5;
      case '6days': return 6;
      case 'week': return 7;
      default: return 1;
    }
  }, []);

  const activeNumDays = getNumDaysForView(viewMode);

  // Timeline days array for 1, 2, 3, 4, 5, 6, or 7 days
  const timelineDays = useMemo(() => {
    if (viewMode === 'month') return [];
    if (viewMode === 'week') {
      const start = selectedDay.startOf('week');
      return [0, 1, 2, 3, 4, 5, 6].map(i => start.add(i, 'day'));
    }
    const count = getNumDaysForView(viewMode);
    return Array.from({ length: count }, (_, i) => selectedDay.add(i, 'day'));
  }, [viewMode, selectedDay, getNumDaysForView]);

  const timelineStartDay = timelineDays[0] || selectedDay;
  const timelineEndDay = timelineDays[timelineDays.length - 1] || selectedDay;

  // Unavailability marking state (for developer self-service)
  const [unavailForm] = Form.useForm();
  const [availSlotForm] = Form.useForm();
  const [unavailMarkMode, setUnavailMarkMode] = useState(false);
  const [unavailSaving, setUnavailSaving] = useState(false);
  const [unavailReasonType, setUnavailReasonType] = useState(null); // tracks selected reason for "Other" reveal
  const [availSlotMode, setAvailSlotMode] = useState(false);
  const [availSlotSaving, setAvailSlotSaving] = useState(false);

  const monthInitialized = useRef(false);
  const { data, isLoading, isFetching, refetch, error } = useGetInterviewsForCalendarQuery();

  // Developer Availability data from DB
  const { data: devAvailData, refetch: refetchDevAvail } = useGetDeveloperAvailabilityQuery(
    isInterviewee && currentUserCandidate ? { candidate: currentUserCandidate } : {},
    { skip: false }
  );
  const devAvailList = devAvailData?.data || [];
  const [saveDevAvail] = useSaveDeveloperAvailabilityMutation();
  const [deleteDevAvail] = useDeleteDeveloperAvailabilityMutation();
  const [createInterview, { isLoading: isCreatingInterview }] = useCreateInterviewMutation();
  const [updateInterview, { isLoading: isUpdatingInterview }] = useUpdateInterviewMutation();
  const [deleteInterview, { isLoading: isDeletingInterview }] = useDeleteInterviewMutation();
  const { data: profileOwners = [] } = useGetProfileOwnersQuery();

  // ─── Schedule Requests (Accept / Reject workflow for Developers) ─────
  const { data: scheduleRequestsData, refetch: refetchScheduleRequests } = useGetScheduleRequestsQuery(
    isInterviewee && currentUserCandidate ? { candidate: currentUserCandidate } : {},
    { skip: false }
  );
  const [respondScheduleRequest, { isLoading: isRespondingRequest }] = useRespondScheduleRequestMutation();

  const allScheduleRequests = scheduleRequestsData?.data || [];

  // Filter requests for the currently focused candidate
  const targetCandidateForRequests = isInterviewee && currentUserCandidate
    ? currentUserCandidate
    : (selectedCandidateFilter !== 'All' ? selectedCandidateFilter : null);

  const candidateRequests = useMemo(() => {
    if (!targetCandidateForRequests) return allScheduleRequests;
    const candLower = targetCandidateForRequests.trim().toLowerCase();
    return allScheduleRequests.filter(
      (r) => (r.CandidateName ?? r.candidateName ?? '').trim().toLowerCase() === candLower
    );
  }, [allScheduleRequests, targetCandidateForRequests]);

  const pendingRequests = useMemo(() => {
    return candidateRequests.filter((r) => (r.Status ?? r.status) === 'Pending');
  }, [candidateRequests]);

  const [rejectModalState, setRejectModalState] = useState({ open: false, request: null, reason: '' });
  const [requestsDrawerOpen, setRequestsDrawerOpen] = useState(false);

  const handleAcceptRequest = async (req) => {
    try {
      const id = req.Id ?? req.id;
      const compName = req.CompanyName ?? req.companyName;
      const reqDate = dayjs(req.RequestedDate ?? req.requestedDate).format('D MMM YYYY');
      await respondScheduleRequest({ id, action: 'accept' }).unwrap();
      AntMessage.success(`🎉 Interview accepted! Confirmed with ${compName} for ${reqDate}. Calendar updated.`);
      refetch();
      refetchScheduleRequests();
    } catch (err) {
      AntMessage.error(err?.data?.message || 'Failed to accept interview request.');
    }
  };

  const handleRejectRequestSubmit = async () => {
    if (!rejectModalState.request) return;
    try {
      const id = rejectModalState.request.Id ?? rejectModalState.request.id;
      const compName = rejectModalState.request.CompanyName ?? rejectModalState.request.companyName;
      const reason = rejectModalState.reason?.trim() || 'Developer is unavailable for this time window.';
      await respondScheduleRequest({ id, action: 'reject', reason }).unwrap();
      AntMessage.info(`Request for ${compName} rejected. Admin has been notified.`);
      setRejectModalState({ open: false, request: null, reason: '' });
      refetchScheduleRequests();
    } catch (err) {
      AntMessage.error(err?.data?.message || 'Failed to reject interview request.');
    }
  };

  // Add/Edit Interview modal state
  const [addInterviewModal, setAddInterviewModal] = useState(false);
  const [addInterviewForm] = Form.useForm();

  const handleOpenAddInterview = (date = selectedDay, hour = null) => {
    addInterviewForm.resetFields();
    setEditingInterviewRecord(null);
    const d = dayjs(date);
    addInterviewForm.setFieldsValue({
      InterviewDate: d,
      InterviewTime: hour !== null ? d.hour(hour).minute(0) : d,
      Status: 'Scheduled',
    });
    setAddInterviewModal(true);
  };

  const handleOpenEditInterview = (item) => {
    setEditingInterviewRecord(item);
    const d = dayjs(item.calendarDate || item.interviewDate || item.InterviewDate);
    addInterviewForm.setFieldsValue({
      IntervieweeName: item.intervieweeName || item.IntervieweeName,
      CompanyName: item.companyName || item.CompanyName,
      InterviewDate: d,
      InterviewTime: d,
      Stack: item.stack || item.Stack,
      InterviewFor: item.interviewFor || item.InterviewFor,
      InvTo: item.invTo || item.InvTo || 'Silmun',
      InterviewType: item.interviewType || item.InterviewType || 'Technical',
      Status: item.status || item.Status || 'Scheduled',
    });
    setAddInterviewModal(true);
  };

  const handleDeleteInterview = async (id) => {
    try {
      if (selectedEventForModal) {
        saveToTrash(selectedEventForModal);
      }
      await deleteInterview(id).unwrap();
      AntMessage.success('Interview deleted and moved to Trash.');
      setSelectedEventForModal(null);
      refetch();
    } catch (err) {
      AntMessage.error(err?.data?.message || 'Failed to delete interview.');
    }
  };

  const handleAddInterviewSubmit = async (values) => {
    try {
      const dateVal = values.InterviewDate;
      const timeVal = values.InterviewTime;
      let interviewDate = null;
      if (dateVal) {
        const base = dayjs.isDayjs(dateVal) ? dateVal : dayjs(dateVal);
        if (timeVal && dayjs.isDayjs(timeVal)) {
          interviewDate = base.hour(timeVal.hour()).minute(timeVal.minute()).second(0).format('YYYY-MM-DDTHH:mm:ss');
        } else {
          interviewDate = base.format('YYYY-MM-DD');
        }
      }
      const payload = {
        InvTo: values.InvTo || 'Silmun',
        InterviewFor: values.InterviewFor || '',
        IntervieweeName: values.IntervieweeName,
        CompanyName: values.CompanyName,
        InterviewType: values.InterviewType || 'Technical',
        Stack: values.Stack || '',
        Status: values.Status || 'Scheduled',
        InterviewDate: interviewDate,
        JobHunterName: values.JobHunterName || '',
        InterviewCharges: 0,
        JhDue: 0,
        FirstPaymentOnJob: 0,
        SecondPaymentOnJob: 0,
        BalancePayable: 0,
      };
      if (editingInterviewRecord) {
        await updateInterview({ id: editingInterviewRecord.id, ...payload }).unwrap();
        AntMessage.success('Interview updated successfully!');
      } else {
        await createInterview(payload).unwrap();
        AntMessage.success('Interview added successfully!');
      }
      setAddInterviewModal(false);
      setEditingInterviewRecord(null);
      addInterviewForm.resetFields();
      if (selectedEventForModal) setSelectedEventForModal(null);
      refetch();
    } catch (err) {
      AntMessage.error(err?.data?.message || 'Failed to save interview.');
    }
  };

  // Map of date -> ALL availability records (unavailable AND free-slot)
  // Filtered to only the currently selected candidate so another dev's Emergency
  // badge does NOT bleed through when viewing a different person's calendar.
  const devAvailByDate = useMemo(() => {
    const unavailMap = {};
    const freeSlotMap = {};

    // Determine whose availability to show on the calendar cells
    const filterCand = isInterviewee && currentUserCandidate
      ? currentUserCandidate
      : (selectedCandidateFilter !== 'All' ? selectedCandidateFilter : null);

    const filteredList = filterCand
      ? devAvailList.filter((a) => {
          const name = (a.CandidateName ?? a.candidate_name ?? '').trim().toLowerCase();
          return name === filterCand.trim().toLowerCase();
        })
      : devAvailList;

    filteredList.forEach((a) => {
      const dateKey = dayjs(a.AvailabilityDate ?? a.availability_date).format('YYYY-MM-DD');
      const status = (a.Status ?? a.status ?? '').toLowerCase();
      if (status === 'available') {
        if (!freeSlotMap[dateKey]) freeSlotMap[dateKey] = [];
        freeSlotMap[dateKey].push(a);
      } else {
        if (!unavailMap[dateKey]) unavailMap[dateKey] = [];
        unavailMap[dateKey].push(a);
      }
    });
    return { unavailMap, freeSlotMap };
  }, [devAvailList, isInterviewee, currentUserCandidate, selectedCandidateFilter]);

  // Returns array of ALL unavailability records (Emergency/Medical/Leave) for a date with Developer Name
  const getDevAvailListOnDate = useCallback((dateKey) => {
    return devAvailByDate.unavailMap[dateKey] || [];
  }, [devAvailByDate]);

  // Returns single unavailability record (for single-item fallback)
  const getDevAvailOnDate = useCallback((dateKey) => {
    return devAvailByDate.unavailMap[dateKey]?.[0] || null;
  }, [devAvailByDate]);

  // Returns array of declared free-slot records for a date
  const getDevFreeSlotsOnDate = useCallback((dateKey) => {
    return devAvailByDate.freeSlotMap[dateKey] || [];
  }, [devAvailByDate]);

  const rawRecords = Array.isArray(data?.data) ? data.data : [];
  const totalLoaded = data?.total ?? rawRecords.length;

  // Extract all unique candidate names for filtering
  const allCandidateNames = useMemo(() => {
    const set = new Set();
    rawRecords.forEach((r) => {
      const name = (r.IntervieweeName ?? r.intervieweeName ?? '').trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rawRecords]);

  // Extract all unique tech stack names for filtering
  const allStackNames = useMemo(() => {
    const set = new Set();
    rawRecords.forEach((r) => {
      const s = (r.Stack ?? r.stack ?? '').trim();
      if (s) set.add(s);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rawRecords]);

  const targetCandidate = isInterviewee && currentUserCandidate
    ? currentUserCandidate
    : (selectedCandidateFilter === 'All' ? '' : selectedCandidateFilter);

  // Filter records by candidate, stack, AND search query
  const displayRecords = useMemo(() => {
    let list = rawRecords;

    if (targetCandidate) {
      const lower = targetCandidate.trim().toLowerCase();
      list = list.filter((r) => {
        const dev = (r.IntervieweeName ?? r.intervieweeName ?? '').trim().toLowerCase();
        const intFor = (r.InterviewFor ?? r.interviewFor ?? '').trim().toLowerCase();
        return dev === lower || intFor === lower;
      });
    }

    if (selectedStackFilter && selectedStackFilter !== 'All') {
      const lowerStack = selectedStackFilter.trim().toLowerCase();
      list = list.filter((r) => {
        const s = (r.Stack ?? r.stack ?? '').trim().toLowerCase();
        return s === lowerStack;
      });
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((r) => {
        const comp = (r.CompanyName ?? r.companyName ?? '').toLowerCase();
        const cand = (r.IntervieweeName ?? r.intervieweeName ?? '').toLowerCase();
        const stack = (r.Stack ?? r.stack ?? '').toLowerCase();
        const intFor = (r.InterviewFor ?? r.interviewFor ?? '').toLowerCase();
        return comp.includes(q) || cand.includes(q) || stack.includes(q) || intFor.includes(q);
      });
    }

    return list;
  }, [rawRecords, targetCandidate, selectedStackFilter, searchQuery]);

  const getCandidateAvailabilityOnDate = useCallback((candName, date) => {
    if (!candName || !date) return { isAssigned: false, interviews: [] };
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    const candLower = candName.trim().toLowerCase();

    const matches = rawRecords.filter((r) => {
      const dev = (r.IntervieweeName ?? r.intervieweeName ?? '').trim().toLowerCase();
      const intFor = (r.InterviewFor ?? r.interviewFor ?? '').trim().toLowerCase();
      if (dev !== candLower && intFor !== candLower) return false;

      const status = (getInterviewRowStatus(r) || '').toLowerCase().trim();
      if (['cancelled', 'x', 'deleted', 'dropped', 'dead'].includes(status)) return false;

      const dVal = r.InterviewDate ?? r.interviewDate ?? r.JobStartDate ?? r.jobStartDate;
      if (!dVal) return false;
      const d = dayjs(dVal);
      return d.isValid() && d.format('YYYY-MM-DD') === dateStr;
    });

    return {
      isAssigned: matches.length > 0,
      interviews: matches,
    };
  }, [rawRecords]);

  const handleOpenAvailability = (date = dayjs(), cand = null) => {
    const effectiveCand = isInterviewee && currentUserCandidate
      ? currentUserCandidate
      : (cand || (selectedCandidateFilter !== 'All' ? selectedCandidateFilter : (allCandidateNames[0] || '')));
    setUnavailMarkMode(false);
    unavailForm.resetFields();
    setAvailabilityModal({
      open: true,
      date: dayjs(date),
      candidate: effectiveCand,
    });
  };

  const handleMarkUnavailable = async (values) => {
    try {
      setUnavailSaving(true);
      const candName = isInterviewee ? currentUserCandidate : (availabilityModal.candidate || currentUserCandidate);
      // If reason is "Other", use the custom text as the displayed reason
      const finalReason = values.reasonType === 'Other'
        ? (values.otherReasonText?.trim() || 'Other')
        : values.reasonType;
      const startTime = values.unavailStartTime ? values.unavailStartTime.format('hh:mm A') : '';
      const endTime = values.unavailEndTime ? values.unavailEndTime.format('hh:mm A') : '';
      await saveDevAvail({
        CandidateName: candName,
        AvailabilityDate: availabilityModal.date.format('YYYY-MM-DD'),
        Status: 'Unavailable',
        ReasonType: finalReason,
        TimeZone: values.timeZone || 'PKT (UTC+5)',
        StartTime: startTime,
        EndTime: endTime,
        Notes: values.notes || '',
      }).unwrap();
      const timeStr = startTime && endTime ? ` (${startTime} – ${endTime})` : '';
      AntMessage.success(`Date marked as Unavailable (${finalReason})${timeStr} for ${candName}`);
      refetchDevAvail();
      setUnavailMarkMode(false);
      setUnavailReasonType(null);
      unavailForm.resetFields();
    } catch (err) {
      AntMessage.error('Failed to mark unavailability. Please try again.');
    } finally {
      setUnavailSaving(false);
    }
  };

  const handleMarkAvailableSlot = async (values) => {
    try {
      setAvailSlotSaving(true);
      const candName = isInterviewee ? currentUserCandidate : (availabilityModal.candidate || currentUserCandidate);
      const startTime = values.startTime ? values.startTime.format('hh:mm A') : '';
      const endTime = values.endTime ? values.endTime.format('hh:mm A') : '';
      await saveDevAvail({
        CandidateName: candName,
        AvailabilityDate: availabilityModal.date.format('YYYY-MM-DD'),
        Status: 'FreeSlot',
        ReasonType: 'Available',
        TimeZone: values.timeZone || 'PKT (UTC+5)',
        StartTime: startTime,
        EndTime: endTime,
        Notes: values.notes || '',
      }).unwrap();
      AntMessage.success(`✅ Free slot ${startTime}–${endTime} (${values.timeZone || 'PKT'}) declared for ${candName}!`);
      refetchDevAvail();
      setAvailSlotMode(false);
      availSlotForm.resetFields();
    } catch (err) {
      AntMessage.error('Failed to save free slot. Please try again.');
    } finally {
      setAvailSlotSaving(false);
    }
  };

  const handleRemoveUnavailability = async (id) => {
    try {
      await deleteDevAvail(id).unwrap();
      AntMessage.success('Availability restored. Date is now Available.');
      refetchDevAvail();
    } catch (err) {
      AntMessage.error('Failed to update availability.');
    }
  };

  const { calendarEvents, unscheduled, eventsByDate } = useMemo(() => {
    const normalized = displayRecords.map(normalizeRecord);

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
      const tz = getTimezoneTimes(item.calendarDate, primaryTimezone);
      const key = tz?.primaryDate || dayjs(item.calendarDate).format('YYYY-MM-DD');
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

    return {
      calendarEvents: events,
      unscheduled: noDate,
      eventsByDate: map,
    };
  }, [displayRecords, primaryTimezone]);

  useEffect(() => {
    if (monthInitialized.current || isLoading) return;
    if (calendarEvents.length > 0) {
      setCurrentMonth(dayjs().startOf('month'));
      monthInitialized.current = true;
    }
  }, [isLoading, calendarEvents.length]);

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

  // Live tick to keep current-time line moving
  const [currentTick, setCurrentTick] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTick(Date.now()), 30000); // tick every 30s
    return () => clearInterval(timer);
  }, []);

  const nowInPrimary = useMemo(() => {
    return getNowTimeInTz(primaryTimezone);
  }, [primaryTimezone, currentTick]);

  const todayStrInPrimary = useMemo(() => {
    return getTodayDateStrInTz(primaryTimezone);
  }, [primaryTimezone, currentTick]);

  const selectedDayKey = selectedDay ? selectedDay.format('YYYY-MM-DD') : '';

  // Auto-scroll timeline to current daytime hours (8 AM or now - 1h)
  useEffect(() => {
    if (viewMode !== 'month' && timelineScrollRef.current) {
      const targetHour = Math.max(7, Math.min(19, nowInPrimary.hour - 1));
      const scrollTarget = (targetHour - TIMELINE_START_HOUR) * TIMELINE_HOUR_HEIGHT;
      timelineScrollRef.current.scrollTop = scrollTarget;
    }
  }, [viewMode, selectedDayKey]);

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
        isToday: date.format('YYYY-MM-DD') === todayStrInPrimary,
        items: eventsByDate[date.format('YYYY-MM-DD')] || [],
      });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [currentMonth, eventsByDate, todayStrInPrimary]);

  const handleSyncRefresh = () => {
    monthInitialized.current = false;
    refetch();
  };

  // Switch to Day View on a selected date (Google Calendar style)
  const handleSelectDay = (date) => {
    setSelectedDay(date);
    setViewMode('day');
  };

  const headingColor = isDarkMode ? '#f1f5f9' : '#1e293b';
  const labelColor = isDarkMode ? '#94a3b8' : '#64748b';
  const cellBg = isDarkMode ? '#1F2937' : '#ffffff';
  const gridBorder = isDarkMode ? '#374151' : '#e5e7eb';
  const headerBg = isDarkMode ? '#111827' : '#f8fafc';
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';

  // ── Selected Day Specific Data for Google Calendar Day Detail View ────────
  const dayItems = eventsByDate[selectedDayKey] || [];

  // Group items by all-day vs timed
  const { allDayItems, timedItems } = useMemo(() => {
    const allDay = [];
    const timed = [];
    dayItems.forEach((item) => {
      const tz = getTimezoneTimes(item.calendarDate, primaryTimezone);
      if (tz && tz.hasTime) {
        timed.push({ ...item, tz });
      } else {
        allDay.push({ ...item, tz });
      }
    });
    timed.sort((a, b) => dayjs(a.calendarDate).valueOf() - dayjs(b.calendarDate).valueOf());
    return { allDayItems: allDay, timedItems: timed };
  }, [dayItems, primaryTimezone]);

  // Statistics for the selected day
  const dayStats = useMemo(() => {
    const total = dayItems.length;
    let scheduled = 0;
    let completed = 0;
    let landed = 0;
    let other = 0;
    const activeStacks = new Set();
    const activeProfiles = new Set();

    dayItems.forEach((item) => {
      const st = (item.status || '').toLowerCase();
      if (item.isJobLanded || item.eventKind === 'close') landed++;
      else if (['done', 'completed', 'passed', 'cleared'].includes(st)) completed++;
      else if (['scheduled', 'in progress', 'ongoing', 'pending'].includes(st)) scheduled++;
      else other++;

      if (item.stack) activeStacks.add(item.stack);
      if (item.interviewFor) activeProfiles.add(item.interviewFor);
    });

    return {
      total,
      scheduled,
      completed,
      landed,
      other,
      activeStacks: Array.from(activeStacks),
      activeProfiles: Array.from(activeProfiles),
    };
  }, [dayItems]);

  const dayDeclaredUnavail = getDevAvailOnDate(selectedDayKey);
  const dayDeclaredFreeSlots = getDevFreeSlotsOnDate(selectedDayKey);
  const dayCandidateAvail = targetCandidate
    ? getCandidateAvailabilityOnDate(targetCandidate, selectedDay)
    : null;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Spin size="large" tip="Loading calendar..." />
      </div>
    );
  }

  // ── HELPERS for day-view hourly timeline ──────────────────────────────────
  const getEventTopPx = (isoDate, targetTz = primaryTimezone) => {
    const tz = getTimezoneTimes(isoDate, targetTz);
    if (tz && tz.hasTime) {
      return Math.max(0, (tz.decimalHourInPrimary - TIMELINE_START_HOUR) * TIMELINE_HOUR_HEIGHT);
    }
    const d = dayjs(isoDate);
    const hours = d.hour() + d.minute() / 60;
    return Math.max(0, (hours - TIMELINE_START_HOUR) * TIMELINE_HOUR_HEIGHT);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Reusable Sidebar Content (for desktop sidebar and mobile slide-in drawer)
  const renderSidebarContent = (isInsideDrawer = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* + Add Interview button */}
      {!isInterviewee && (
        <div style={{ padding: '0 16px 12px' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            block
            onClick={() => {
              handleOpenAddInterview(viewMode === 'day' ? selectedDay : dayjs());
              if (isInsideDrawer) setMobileDrawerOpen(false);
            }}
            style={{ background: '#4f46e5', borderColor: '#4f46e5', borderRadius: 20, fontWeight: 600, height: 40, boxShadow: '0 2px 8px rgba(79,70,229,0.3)' }}
          >
            Add Interview
          </Button>
        </div>
      )}

      {/* Google Calendar Mobile Drawer View Switcher */}
      {isInsideDrawer && (
        <div style={{ padding: '0 16px 12px', borderBottom: `1px solid ${gridBorder}`, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: labelColor, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.8 }}>
            Calendar View
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
            {[
              { key: 'day', label: '1 Day', icon: <CalendarOutlined /> },
              { key: '3days', label: '3 Days', icon: <AppstoreOutlined /> },
              { key: 'week', label: 'Week', icon: <UnorderedListOutlined /> },
              { key: 'month', label: 'Month', icon: <AppstoreOutlined /> },
            ].map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => {
                  if (v.key === 'month') setCurrentMonth(selectedDay.startOf('month'));
                  setViewMode(v.key);
                  setMobileDrawerOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '7px 8px',
                  borderRadius: 8,
                  border: viewMode === v.key ? '1.5px solid #4f46e5' : `1px solid ${gridBorder}`,
                  background: viewMode === v.key ? (isDarkMode ? 'rgba(79,70,229,0.25)' : '#eef2ff') : (isDarkMode ? '#1e293b' : '#fff'),
                  color: viewMode === v.key ? '#4f46e5' : headingColor,
                  fontWeight: viewMode === v.key ? 700 : 500,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: 13, color: viewMode === v.key ? '#4f46e5' : labelColor }}>{v.icon}</span>
                <span>{v.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mini Month Calendar */}
      <div style={{ padding: '0 8px 8px' }}>
        {/* Mini month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 4px' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: headingColor }}>
            {currentMonth.format('MMMM YYYY')}
          </span>
          <div style={{ display: 'flex', gap: 2 }}>
            <Button type="text" size="small" icon={<LeftOutlined style={{ fontSize: 10 }} />} onClick={() => setCurrentMonth(m => m.subtract(1, 'month'))} style={{ padding: '0 4px', color: labelColor }} />
            <Button type="text" size="small" icon={<RightOutlined style={{ fontSize: 10 }} />} onClick={() => setCurrentMonth(m => m.add(1, 'month'))} style={{ padding: '0 4px', color: labelColor }} />
          </div>
        </div>

        {/* Mini weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 2 }}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: i === 0 || i === 6 ? '#ef4444' : labelColor, padding: '2px 0' }}>{d}</div>
          ))}
        </div>

        {/* Mini date cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {calendarDays.map((cell, idx) => {
            if (!cell) return <div key={`e-${idx}`} style={{ height: 28 }} />;
            const isSel = selectedDay.isSame(cell.date, 'day') && viewMode === 'day';
            const isToday = cell.isToday;
            const isWeekend = cell.date.day() === 0 || cell.date.day() === 6;
            const hasDots = cell.items.length > 0 || getDevAvailOnDate(cell.key) || getDevFreeSlotsOnDate(cell.key).length > 0;
            return (
              <div
                key={cell.key}
                onClick={() => {
                  setSelectedDay(cell.date);
                  setCurrentMonth(cell.date.startOf('month'));
                  setViewMode('day');
                  if (isInsideDrawer) setMobileDrawerOpen(false);
                }}
                style={{
                  height: 28,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderRadius: 14,
                  gap: 1,
                  background: isSel ? '#4f46e5' : isToday ? (isDarkMode ? 'rgba(79,70,229,0.2)' : '#e0e7ff') : 'transparent',
                  transition: 'background 0.1s',
                }}
              >
                <span style={{
                  fontSize: 12,
                  fontWeight: isSel || isToday ? 700 : 400,
                  color: isSel ? '#fff' : isToday ? '#4f46e5' : isWeekend ? '#ef4444' : headingColor,
                  lineHeight: 1,
                }}>
                  {cell.date.date()}
                </span>
                {hasDots && (
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? 'rgba(255,255,255,0.7)' : '#4f46e5' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ height: 1, background: gridBorder, margin: '8px 0' }} />

      {/* ─ Filters section ─ */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto', flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: labelColor, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 }}>Filters</div>

        {!isInterviewee && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: headingColor, marginBottom: 4 }}>👤 Candidate</div>
            <Select
              value={selectedCandidateFilter}
              onChange={v => setSelectedCandidateFilter(v)}
              style={{ width: '100%' }}
              size="small"
              showSearch
              placeholder="All Candidates"
            >
              <Select.Option value="All">All Candidates</Select.Option>
              {allCandidateNames.map(n => <Select.Option key={n} value={n}>{n}</Select.Option>)}
            </Select>
          </div>
        )}

        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: headingColor, marginBottom: 4 }}>💻 Tech Stack</div>
          <Select
            value={selectedStackFilter}
            onChange={v => setSelectedStackFilter(v)}
            style={{ width: '100%' }}
            size="small"
            showSearch
            placeholder="All Stacks"
          >
            <Select.Option value="All">All Stacks</Select.Option>
            {allStackNames.map(s => <Select.Option key={s} value={s}>{s}</Select.Option>)}
          </Select>
        </div>

        <div style={{ height: 1, background: gridBorder }} />

        <div style={{ fontSize: 11, fontWeight: 700, color: labelColor, textTransform: 'uppercase', letterSpacing: 0.8 }}>Quick Actions</div>

        <Button
          icon={<CheckCircleOutlined />}
          size="small"
          onClick={() => {
            handleOpenAvailability(viewMode === 'day' ? selectedDay : dayjs());
            if (isInsideDrawer) setMobileDrawerOpen(false);
          }}
          style={{ background: '#059669', borderColor: '#059669', color: '#fff', fontWeight: 600, borderRadius: 8 }}
        >
          Check Availability
        </Button>

        {isInterviewee && currentUserCandidate && (
          <Button
            icon={<MailOutlined />}
            size="small"
            onClick={() => {
              setRequestsDrawerOpen(true);
              if (isInsideDrawer) setMobileDrawerOpen(false);
            }}
            style={{ fontWeight: 600, borderRadius: 8 }}
          >
            My Requests {pendingRequests.length > 0 && <Badge count={pendingRequests.length} size="small" style={{ marginLeft: 4 }} />}
          </Button>
        )}

        {/* Legend */}
        <div style={{ height: 1, background: gridBorder }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: labelColor, textTransform: 'uppercase', letterSpacing: 0.8 }}>Legend</div>
        {[
          { color: '#f59e0b', label: 'Unavailable' },
          { color: '#10b981', label: 'Free Slot' },
          { color: '#4f46e5', label: 'Interview' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: headingColor }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
            {l.label}
          </div>
        ))}

        {/* Stats */}
        {viewMode === 'day' && dayItems.length > 0 && (
          <>
            <div style={{ height: 1, background: gridBorder }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: labelColor, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {selectedDay.format('MMM D')} Stats
            </div>
            {[
              { label: 'Total', val: dayStats.total, color: '#4f46e5' },
              { label: 'Scheduled', val: dayStats.scheduled, color: '#3b82f6' },
              { label: 'Passed', val: dayStats.landed + dayStats.completed, color: '#10b981' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: labelColor }}>{s.label}</span>
                <span style={{ fontWeight: 700, color: s.color }}>{s.val}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: isMobile ? 'calc(100dvh - 64px)' : 'calc(100vh - 64px)',
        overflow: 'hidden',
        background: isDarkMode ? '#0f172a' : '#fff',
        fontFamily: "'Google Sans', Roboto, sans-serif",
      }}
    >
      {/* ══════════════════════════════════════════════════════════════════════
          TOP NAVIGATION BAR — sleek Google Calendar style
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 4 : 10,
          padding: isMobile ? '6px 8px' : '8px 16px',
          borderBottom: `1px solid ${gridBorder}`,
          background: isDarkMode ? '#1e293b' : '#fff',
          flexShrink: 0,
          zIndex: 10,
          height: isMobile ? 52 : 64,
          flexWrap: 'nowrap',
          overflowX: 'visible',
        }}
      >
        {isMobile && mobileSearchOpen ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => { setMobileSearchOpen(false); setSearchQuery(''); }}
              style={{ color: headingColor }}
            />
            <Input
              autoFocus
              placeholder="Search candidate, stack, company..."
              prefix={<SearchOutlined style={{ color: labelColor, fontSize: 13 }} />}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              allowClear
              style={{
                flex: 1,
                borderRadius: 20,
                background: isDarkMode ? '#0f172a' : '#f1f5f9',
                borderColor: 'transparent',
                fontSize: 13,
              }}
            />
          </div>
        ) : (
          <>
            {/* Left: Google Hamburger toggle ☰ (opens drawer on mobile / toggles sidebar on desktop) */}
            <Button
              type="text"
              icon={<MenuOutlined style={{ fontSize: 18, color: headingColor }} />}
              onClick={() => isMobile ? setMobileDrawerOpen(true) : setCalendarSidebarOpen(o => !o)}
              style={{ borderRadius: '50%', width: 38, height: 38, padding: 0, flexShrink: 0 }}
              title="Main menu"
            />

            {!isMobile && (
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/interviews')}
                style={{ color: '#4f46e5', flexShrink: 0 }}
                title="Back to All Interviews"
              />
            )}

            {!isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8, flexShrink: 0 }}>
                <CalendarOutlined style={{ fontSize: 26, color: '#4f46e5' }} />
                <span style={{ fontSize: 19, fontWeight: 500, color: headingColor, letterSpacing: -0.2 }}>
                  Calendar
                </span>
              </div>
            )}

            {/* Date Nav Chevrons + Date Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <Button
                type="text"
                icon={<LeftOutlined style={{ fontSize: isMobile ? 11 : 12 }} />}
                size="small"
                style={{ color: headingColor, padding: isMobile ? '0 4px' : undefined }}
                onClick={() => {
                  if (viewMode === 'month') setCurrentMonth(m => m.subtract(1, 'month'));
                  else if (viewMode === 'week') setSelectedDay(d => d.subtract(1, 'week'));
                  else setSelectedDay(d => d.subtract(activeNumDays, 'day'));
                }}
              />
              <Button
                type="text"
                icon={<RightOutlined style={{ fontSize: isMobile ? 11 : 12 }} />}
                size="small"
                style={{ color: headingColor, padding: isMobile ? '0 4px' : undefined }}
                onClick={() => {
                  if (viewMode === 'month') setCurrentMonth(m => m.add(1, 'month'));
                  else if (viewMode === 'week') setSelectedDay(d => d.add(1, 'week'));
                  else setSelectedDay(d => d.add(activeNumDays, 'day'));
                }}
              />
              <span style={{ fontSize: isMobile ? 12 : 19, fontWeight: 600, color: headingColor, whiteSpace: 'nowrap', marginLeft: 2 }}>
                {viewMode === 'month'
                  ? currentMonth.format(isMobile ? 'MMM YYYY' : 'MMMM YYYY')
                  : activeNumDays === 1
                  ? selectedDay.format(isMobile ? 'MMM D' : 'dddd, MMMM D, YYYY')
                  : isMobile
                  ? `${timelineStartDay.format('MMM D')}–${timelineEndDay.format('D')}`
                  : `${timelineStartDay.format('MMM D')} – ${timelineEndDay.format(timelineStartDay.month() === timelineEndDay.month() ? 'D, YYYY' : 'MMM D, YYYY')}`}
              </span>
            </div>

            {/* Desktop real-time search bar */}
            {!isMobile && (
              <Input
                placeholder="Search interviews, candidate, stack..."
                prefix={<SearchOutlined style={{ color: labelColor, fontSize: 14 }} />}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                allowClear
                style={{
                  maxWidth: 260,
                  marginLeft: 12,
                  borderRadius: 20,
                  background: isDarkMode ? '#0f172a' : '#f1f5f9',
                  borderColor: 'transparent',
                  fontSize: 13,
                }}
              />
            )}

            <div style={{ flex: 1 }} />

            {/* Today Button */}
            <Button
              onClick={() => { setSelectedDay(dayjs()); setCurrentMonth(dayjs().startOf('month')); }}
              style={{
                borderRadius: 14,
                border: `1px solid ${gridBorder}`,
                fontWeight: 600,
                background: 'transparent',
                color: headingColor,
                padding: isMobile ? '0 6px' : '0 12px',
                fontSize: isMobile ? 11 : 14,
                height: isMobile ? 28 : undefined,
                flexShrink: 0,
              }}
              size={isMobile ? 'small' : 'middle'}
            >
              Today
            </Button>

            {/* View Switcher Select (1 Day, 2 Days, 3 Days, Week, Month) - Placed next to Today for immediate access */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: `1px solid ${gridBorder}`,
                borderRadius: 8,
                overflow: 'hidden',
                background: isDarkMode ? '#1e293b' : '#fff',
                padding: isMobile ? '1px 2px' : '2px 4px',
                flexShrink: 0,
              }}
            >
              <Select
                value={viewMode}
                onChange={(v) => {
                  if (v === 'month') setCurrentMonth(selectedDay.startOf('month'));
                  setViewMode(v);
                }}
                style={{ minWidth: isMobile ? 80 : 155 }}
                size="small"
                bordered={false}
                popupMatchSelectWidth={false}
                options={[
                  { value: 'day', label: '1 Day' },
                  { value: '2days', label: '2 Days' },
                  { value: '3days', label: '3 Days' },
                  { value: '4days', label: '4 Days' },
                  { value: '5days', label: '5 Days' },
                  { value: 'week', label: 'Week' },
                  { value: 'month', label: 'Month' },
                ]}
              />
            </div>

            {/* Right: refresh */}
            {!isMobile && (
              <Button
                icon={<SyncOutlined />}
                loading={isFetching}
                onClick={handleSyncRefresh}
                type="text"
                style={{ color: headingColor, flexShrink: 0 }}
                title="Sync & Refresh"
              />
            )}

            {pendingRequests.length > 0 && (
              <Badge count={pendingRequests.length} size="small" style={{ flexShrink: 0 }}>
                <Button
                  icon={<MailOutlined />}
                  type="text"
                  style={{ color: '#f59e0b' }}
                  onClick={() => setRequestsDrawerOpen(true)}
                  title="Interview Requests"
                />
              </Badge>
            )}

            {/* ── Timezone Quick-Select Button ──────────────────────────────── */}
            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              overlayStyle={{ zIndex: 1200 }}
              menu={{
                selectedKeys: [primaryTimezone],
                items: [
                  {
                    type: 'group',
                    label: (
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#94a3b8', textTransform: 'uppercase' }}>
                        Display Times In
                      </span>
                    ),
                  },
                  ...[
                    { key: 'EST', flag: '🇺🇸', label: 'EST', desc: 'US Eastern · New York' },
                    { key: 'CST', flag: '🇺🇸', label: 'CST', desc: 'US Central · Chicago' },
                    { key: 'PST', flag: '🇺🇸', label: 'PST', desc: 'US Pacific · San Francisco' },
                    { key: 'PKT', flag: '🇵🇰', label: 'PKT', desc: 'Pakistan Standard Time' },
                    { key: 'LOCAL', flag: '🌐', label: 'Local', desc: 'My Browser Timezone' },
                  ].map(({ key, flag, label, desc }) => ({
                    key,
                    label: (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '2px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{flag}</span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>{label}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.2 }}>{desc}</div>
                          </div>
                        </div>
                        {primaryTimezone === key && (
                          <span style={{ color: '#4f46e5', fontWeight: 700, fontSize: 13 }}>✓</span>
                        )}
                      </div>
                    ),
                    onClick: () => {
                      setPrimaryTimezone(key);
                      try {
                        const stored = JSON.parse(localStorage.getItem('rizviz_calendar_settings') || '{}');
                        stored.primaryTimezone = key;
                        localStorage.setItem('rizviz_calendar_settings', JSON.stringify(stored));
                      } catch (e) {}
                      window.dispatchEvent(new CustomEvent('calendar-settings-changed', {
                        detail: { primaryTimezone: key }
                      }));
                    },
                  })),
                ],
              }}
            >
              <button
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 2,
                  padding: isMobile ? '3px 5px' : '5px 10px',
                  borderRadius: 8,
                  border: `1px solid ${gridBorder}`,
                  background: isDarkMode ? '#1e293b' : '#f8fafc',
                  color: headingColor,
                  fontSize: isMobile ? 10 : 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: 0.3,
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                title="Switch display timezone"
              >
                <span style={{ fontSize: isMobile ? 11 : 14 }}>{TZ_FLAGS[primaryTimezone] || '🌐'}</span>
                <span>{TZ_LABELS[primaryTimezone] || primaryTimezone}</span>
                <span style={{ fontSize: 8, opacity: 0.6, marginLeft: 1 }}>▼</span>
              </button>
            </Dropdown>

            {/* Google Workspace Calendar Settings, Trash, Appearance, Print, Add-ons */}
            <CalendarSettingsMenu
              currentView={viewMode}
              setViewMode={setViewMode}
              selectedDay={selectedDay}
              interviews={displayRecords}
              compact={isMobile}
              onRestoreInterview={async (item) => {
                try {
                  const payload = {
                    InvTo: item.InvTo || item.invTo || 'Silmun',
                    InterviewFor: item.InterviewFor || item.interviewFor || '',
                    IntervieweeName: item.IntervieweeName || item.intervieweeName,
                    CompanyName: item.CompanyName || item.companyName,
                    InterviewType: item.InterviewType || item.interviewType || 'Technical',
                    Stack: item.Stack || item.stack || '',
                    Status: item.Status || item.status || 'Scheduled',
                    InterviewDate: item.InterviewDate || item.interviewDate,
                    JobHunterName: item.JobHunterName || item.jobHunterName || '',
                    MeetingLink: item.MeetingLink || item.meetingLink || '',
                    Notes: item.Notes || item.notes || '',
                  };
                  await createInterview(payload).unwrap();
                  AntMessage.success(`Restored interview for ${payload.IntervieweeName}`);
                  refetch();
                } catch (e) {
                  AntMessage.error('Failed to restore interview');
                }
              }}
              onSearchFocus={() => {
                if (isMobile) {
                  setMobileSearchOpen(true);
                } else {
                  const input = document.querySelector('input[placeholder*="Search interviews"]');
                  if (input) input.focus();
                }
              }}
            />
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN BODY — left sidebar + content area
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >

        {/* ── DESKTOP LEFT SIDEBAR (Google Calendar style) ─────────────────── */}
        {!isMobile && (
          <div
            style={{
              width: calendarSidebarOpen ? 256 : 0,
              flexShrink: 0,
              borderRight: calendarSidebarOpen ? `1px solid ${gridBorder}` : 'none',
              background: isDarkMode ? '#1e293b' : '#fff',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              padding: calendarSidebarOpen ? '12px 0' : '0',
              transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {renderSidebarContent(false)}
          </div>
        )}

        {/* ── MOBILE QUICK FILTERS: compact horizontal scroll strip ─────────── */}
        {isMobile && (
          <div
            style={{
              flexShrink: 0,
              width: '100%',
              zIndex: 5,
              background: isDarkMode ? '#1e293b' : '#f8fafc',
              borderBottom: `1px solid ${gridBorder}`,
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {!isInterviewee && (
              <Select
                value={selectedCandidateFilter}
                onChange={v => setSelectedCandidateFilter(v)}
                style={{ minWidth: 125, flexShrink: 0 }}
                size="small"
                placeholder="Candidate"
                showSearch
              >
                <Select.Option value="All">All Candidates</Select.Option>
                {allCandidateNames.map(n => <Select.Option key={n} value={n}>{n}</Select.Option>)}
              </Select>
            )}
            <Select
              value={selectedStackFilter}
              onChange={v => setSelectedStackFilter(v)}
              style={{ minWidth: 105, flexShrink: 0 }}
              size="small"
              placeholder="Stack"
            >
              <Select.Option value="All">All Stacks</Select.Option>
              {allStackNames.map(s => <Select.Option key={s} value={s}>{s}</Select.Option>)}
            </Select>
            <Button
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleOpenAvailability(selectedDay)}
              style={{ background: '#059669', borderColor: '#059669', color: '#fff', fontWeight: 600, borderRadius: 12, flexShrink: 0 }}
            >
              Avail
            </Button>
            {(selectedCandidateFilter !== 'All' || selectedStackFilter !== 'All') && (
              <Button
                size="small"
                type="text"
                onClick={() => { setSelectedCandidateFilter('All'); setSelectedStackFilter('All'); }}
                style={{ fontSize: 11, color: '#ef4444', flexShrink: 0, padding: '0 4px' }}
              >
                Clear
              </Button>
            )}
          </div>
        )}

        {/* ── MOBILE DRAWER (Google Calendar style slide-in side menu) ─────── */}
        {isMobile && (
          <Drawer
            placement="left"
            open={mobileDrawerOpen}
            onClose={() => setMobileDrawerOpen(false)}
            width={290}
            styles={{
              header: { display: 'none' },
              body: { padding: 0, background: isDarkMode ? '#1e293b' : '#fff' },
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              {/* Drawer header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px 12px',
                  borderBottom: `1px solid ${gridBorder}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CalendarOutlined style={{ fontSize: 22, color: '#4f46e5' }} />
                  <span style={{ fontSize: 17, fontWeight: 700, color: headingColor }}>Calendar</span>
                </div>
                <Button
                  type="text"
                  icon={<CloseCircleOutlined style={{ fontSize: 18, color: labelColor }} />}
                  onClick={() => setMobileDrawerOpen(false)}
                />
              </div>

              {/* Drawer scrollable body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
                {renderSidebarContent(true)}
              </div>
            </div>
          </Drawer>
        )}

        {/* ── MAIN CONTENT AREA ──────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >

          {/* ── PENDING REQUESTS BANNER ──────────────────────────────────────── */}
          {pendingRequests.length > 0 && (
            <div
              style={{
                padding: '8px 20px',
                background: isDarkMode ? '#1e1b4b' : '#eef2ff',
                borderBottom: `2px solid #818cf8`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MailOutlined style={{ color: '#4f46e5', fontSize: 16 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: headingColor }}>
                  {pendingRequests.length} Pending Interview Request{pendingRequests.length > 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: 12, color: labelColor }}>
                  {isInterviewee ? 'Admin has proposed interview slots for you.' : 'Awaiting developer response.'}
                </span>
              </div>
              <Button size="small" type="primary" onClick={() => setRequestsDrawerOpen(true)} style={{ background: '#4f46e5', borderColor: '#4f46e5', borderRadius: 8, fontWeight: 600 }}>
                Review Now
              </Button>
            </div>
          )}

          {/* Inline pending request cards */}
          {pendingRequests.length > 0 && (
            <div style={{ padding: '12px 20px', borderBottom: `1px solid ${gridBorder}`, display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, maxHeight: 280, overflowY: 'auto' }}>
              {pendingRequests.map((req) => {
                const id = req.Id ?? req.id;
                const comp = req.CompanyName ?? req.companyName;
                const reqDate = dayjs(req.RequestedDate ?? req.requestedDate);
                const cand = req.CandidateName ?? req.candidateName;
                const stack = req.Stack ?? req.stack;
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: `1px solid #818cf8`, background: isDarkMode ? '#1e293b' : '#fff' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📬</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: headingColor }}>{comp} — {reqDate.format('ddd, MMM D, YYYY')}</div>
                      <div style={{ fontSize: 12, color: labelColor }}>{cand}{stack ? ` · ${stack}` : ''}</div>
                      {(req.ProposedTime || req.proposedTime) && (
                        <div style={{ fontSize: 11, color: '#4f46e5', fontWeight: 600 }}>🕐 {req.ProposedTime ?? req.proposedTime}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <Button size="small" type="primary" onClick={() => handleAcceptRequest(req)} loading={isRespondingRequest} style={{ background: '#059669', borderColor: '#059669', borderRadius: 6, fontWeight: 700 }}>✓ Accept</Button>
                      <Button size="small" danger onClick={() => setRejectModalState({ open: true, request: req, reason: '' })} style={{ borderRadius: 6, fontWeight: 700 }}>✕ Reject</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TIMELINE VIEW — 1 Day, 2 Days, 3 Days, 4 Days, 5 Days, 6 Days, 7 Days (Week)
          ═══════════════════════════════════════════════════════════════════ */}
          {viewMode !== 'month' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              {/* Day column headers row */}
              <div
                style={{
                  display: 'flex',
                  borderBottom: `1px solid ${gridBorder}`,
                  flexShrink: 0,
                  background: isDarkMode ? '#1e293b' : '#fff',
                }}
              >
                {/* GMT / Timezone label space */}
                <div style={{ width: isMobile ? 50 : 60, flexShrink: 0, padding: '8px 0', textAlign: 'right', paddingRight: isMobile ? 4 : 8 }}>
                  <span style={{ fontSize: isMobile ? 9 : 10, fontWeight: 700, color: '#4f46e5' }}>
                    {TZ_FLAGS[primaryTimezone]} {TZ_LABELS[primaryTimezone]}
                  </span>
                </div>
                {/* Columns headers */}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${activeNumDays}, 1fr)` }}>
                  {timelineDays.map((wd, i) => {
                    const isToday = wd.format('YYYY-MM-DD') === todayStrInPrimary;
                    const isSel = wd.isSame(selectedDay, 'day');
                    const isWeekend = wd.day() === 0 || wd.day() === 6;
                    return (
                      <div
                        key={i}
                        onClick={() => handleSelectDay(wd)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '8px 0',
                          cursor: 'pointer',
                          borderRight: i < activeNumDays - 1 ? `1px solid ${gridBorder}` : 'none',
                          background: isSel ? (isDarkMode ? 'rgba(79,70,229,0.1)' : 'rgba(79,70,229,0.05)') : 'transparent',
                          transition: 'background 0.1s',
                        }}
                        title={`Click to view single day for ${wd.format('dddd, MMMM D')}`}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color: isWeekend ? '#ef4444' : labelColor, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                          {wd.format('ddd')}
                        </span>
                        <div
                          style={{
                            width: activeNumDays === 1 ? 42 : 36,
                            height: activeNumDays === 1 ? 42 : 36,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isToday ? '#4f46e5' : 'transparent',
                            color: isToday ? '#fff' : isWeekend ? '#ef4444' : headingColor,
                            fontSize: activeNumDays === 1 ? 20 : 16,
                            fontWeight: isToday ? 700 : 500,
                            marginTop: 2,
                            transition: 'all 0.15s',
                          }}
                        >
                          {wd.date()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* All-day row — shows developer emergency / unavailabilities with DEVELOPER NAME, reason, and time */}
              <div
                style={{
                  display: 'flex',
                  borderBottom: `1px solid ${gridBorder}`,
                  background: isDarkMode ? '#1a2035' : '#f8fafc',
                  minHeight: 34,
                  flexShrink: 0,
                  alignItems: 'center',
                }}
              >
                <div style={{ width: isMobile ? 50 : 60, flexShrink: 0, textAlign: 'right', paddingRight: isMobile ? 4 : 8, fontSize: 10, color: labelColor }}>All day</div>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${activeNumDays}, 1fr)` }}>
                  {timelineDays.map((wd, i) => {
                    const k = wd.format('YYYY-MM-DD');
                    const unavList = getDevAvailListOnDate(k);
                    const free = getDevFreeSlotsOnDate(k);
                    const dayEvs = eventsByDate[k] || [];
                    const allDayEvs = dayEvs.filter(e => !getTimezoneTimes(e.calendarDate)?.hasTime);
                    return (
                      <div
                        key={i}
                        style={{
                          borderRight: i < activeNumDays - 1 ? `1px solid ${gridBorder}` : 'none',
                          padding: '4px 6px',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 4,
                          minHeight: 28,
                          alignItems: 'center',
                        }}
                      >
                        {/* Emergency / Unavailability badges with DEVELOPER NAME */}
                        {unavList.map((unav, uIdx) => {
                          const candName = unav.CandidateName || unav.candidate_name || 'Developer';
                          const reason = unav.ReasonType || unav.reason_type || 'Unavailable';
                          const timeStr = (unav.StartTime && unav.EndTime) ? `${unav.StartTime}–${unav.EndTime}` : 'All Day';
                          return (
                            <Tooltip
                              key={`unav-${uIdx}`}
                              title={
                                <div style={{ fontSize: 12 }}>
                                  <div style={{ fontWeight: 700 }}>🟠 {candName}</div>
                                  <div>Status: Unavailable ({reason})</div>
                                  <div>Time: {timeStr} ({unav.TimeZone || 'PKT'})</div>
                                  {unav.Notes && <div>Note: {unav.Notes}</div>}
                                </div>
                              }
                            >
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  background: isDarkMode ? '#78350f' : '#fef3c7',
                                  color: isDarkMode ? '#fcd34d' : '#92400e',
                                  border: `1px solid ${isDarkMode ? '#b45309' : '#fde68a'}`,
                                  borderRadius: 4,
                                  padding: '2px 6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  maxWidth: '100%',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                <span>🟠</span>
                                <strong>{candName}:</strong> {reason}
                                <span style={{ opacity: 0.85, fontWeight: 400 }}>({timeStr})</span>
                              </span>
                            </Tooltip>
                          );
                        })}

                        {/* Free slots */}
                        {free.map((s, idx) => (
                          <span
                            key={`free-${idx}`}
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              background: isDarkMode ? '#064e3b' : '#dcfce7',
                              color: isDarkMode ? '#6ee7b7' : '#15803d',
                              borderRadius: 4,
                              padding: '2px 6px',
                            }}
                          >
                            🟢 {s.CandidateName ? `${s.CandidateName}: ` : ''}{s.StartTime ?? 'Free'}
                          </span>
                        ))}

                        {/* All day interview events */}
                        {allDayEvs.map((e, idx) => (
                          <span
                            key={`allday-${idx}`}
                            onClick={(ev) => { ev.stopPropagation(); setSelectedEventForModal(e); }}
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              background: getRecruiterColor(e.intervieweeName),
                              color: '#fff',
                              borderRadius: 4,
                              padding: '2px 6px',
                              cursor: 'pointer',
                            }}
                          >
                            {e.companyName} · {e.intervieweeName}
                          </span>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 24-Hour Timeline Grid across N columns */}
              <div ref={timelineScrollRef} style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                <div style={{ position: 'relative', minHeight: TIMELINE_TOTAL_HOURS * TIMELINE_HOUR_HEIGHT }}>
                  {/* Horizontal Hour Lines */}
                  {Array.from({ length: TIMELINE_TOTAL_HOURS }, (_, h) => (
                    <div
                      key={h}
                      style={{
                        position: 'absolute',
                        top: h * TIMELINE_HOUR_HEIGHT,
                        left: 0,
                        right: 0,
                        display: 'flex',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div style={{ width: isMobile ? 50 : 60, flexShrink: 0, textAlign: 'right', paddingRight: 6, fontSize: isMobile ? 9 : 10, color: labelColor, marginTop: -7, userSelect: 'none' }}>
                        {h === 0 ? '' : dayjs().hour(h).minute(0).format('h A')}
                      </div>
                      <div style={{ flex: 1, borderTop: `1px solid ${isDarkMode ? '#1f2937' : '#f0f0f0'}` }} />
                    </div>
                  ))}

                  {/* N Vertical Day Columns with events */}
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: isMobile ? 50 : 60, right: 0, display: 'grid', gridTemplateColumns: `repeat(${activeNumDays}, 1fr)` }}>
                    {timelineDays.map((wd, dayIdx) => {
                      const k = wd.format('YYYY-MM-DD');
                      const isToday = wd.format('YYYY-MM-DD') === todayStrInPrimary;
                      const dayEvs = (eventsByDate[k] || []).filter(e => getTimezoneTimes(e.calendarDate, primaryTimezone)?.hasTime);
                      return (
                        <div
                          key={dayIdx}
                          style={{
                            position: 'relative',
                            borderRight: dayIdx < activeNumDays - 1 ? `1px solid ${gridBorder}` : 'none',
                            height: '100%',
                          }}
                        >
                          {/* Clickable hour slots to schedule interview */}
                          {Array.from({ length: TIMELINE_TOTAL_HOURS }, (_, h) => (
                            <div
                              key={h}
                              onClick={() => handleOpenAddInterview(wd.hour(h).minute(0), h)}
                              style={{
                                position: 'absolute',
                                top: h * TIMELINE_HOUR_HEIGHT,
                                left: 0,
                                right: 0,
                                height: TIMELINE_HOUR_HEIGHT,
                                cursor: 'pointer',
                              }}
                              className="hover:bg-indigo-50/15"
                            />
                          ))}

                          {/* Live Red Time Indicator on Today's Column */}
                          {isToday && (
                            <div
                              style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: Math.max(0, (nowInPrimary.hour + nowInPrimary.minute / 60 - TIMELINE_START_HOUR) * TIMELINE_HOUR_HEIGHT),
                                height: 2,
                                background: '#ea4335',
                                zIndex: 4,
                                pointerEvents: 'none',
                              }}
                            >
                              <div style={{ position: 'absolute', left: -5, top: -4, width: 10, height: 10, borderRadius: '50%', background: '#ea4335' }} />
                              <div
                                style={{
                                  position: 'absolute',
                                  left: 8,
                                  top: -10,
                                  background: '#ea4335',
                                  color: '#fff',
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                                  pointerEvents: 'none',
                                  whiteSpace: 'nowrap',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <span>{TZ_FLAGS[primaryTimezone]}</span>
                                <span>{nowInPrimary.formatted}</span>
                                <span>{TZ_LABELS[primaryTimezone]}</span>
                              </div>
                            </div>
                          )}

                          {/* Events in this day's column */}
                          {dayEvs.map((item, idx) => {
                            const color = getRecruiterColor(item.intervieweeName);
                            const topPx = getEventTopPx(item.calendarDate, primaryTimezone);
                            const tz = getTimezoneTimes(item.calendarDate, primaryTimezone);
                            return (
                              <Tooltip
                                key={item.chipKey || idx}
                                title={
                                  <div style={{ fontSize: 12 }}>
                                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{item.companyName}</div>
                                    <div>👤 {item.intervieweeName}</div>
                                    <div>💻 {item.stack || 'General'}</div>
                                    <div>{tz?.primaryFlag} {tz?.primary} {tz?.primaryLabel}{tz?.primaryLabel !== 'PKT' ? ` · 🇵🇰 ${tz?.pkt} PKT` : ''}</div>
                                    <div>📋 {item.round} Round · {item.interviewType}</div>
                                  </div>
                                }
                              >
                                <div
                                  onClick={(e) => { e.stopPropagation(); setSelectedEventForModal(item); }}
                                  style={{
                                    position: 'absolute',
                                    left: 2,
                                    right: 2,
                                    top: topPx + 1,
                                    minHeight: 46,
                                    background: `${color}e6`,
                                    borderLeft: `3px solid ${color}`,
                                    borderRadius: '0 5px 5px 0',
                                    padding: '3px 6px',
                                    cursor: 'pointer',
                                    zIndex: 3,
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.16)',
                                    overflow: 'hidden',
                                    transition: 'transform 0.15s, box-shadow 0.15s',
                                  }}
                                  className="hover:scale-[1.02] hover:z-10"
                                >
                                  <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {item.companyName}
                                  </div>
                                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {tz?.primary} {tz?.primaryLabel} · {item.intervieweeName}
                                  </div>
                                  {item.stack && (
                                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      💻 {item.stack}
                                    </div>
                                  )}
                                </div>
                              </Tooltip>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {/* Empty state when 1 day view has no events */}
                  {activeNumDays === 1 && timedItems.length === 0 && allDayItems.length === 0 && !dayDeclaredUnavail && dayDeclaredFreeSlots.length === 0 && (
                    <div style={{ position: 'absolute', top: 8 * TIMELINE_HOUR_HEIGHT, left: 60, right: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: isDarkMode ? 'rgba(79,70,229,0.15)' : '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📅</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: headingColor }}>No events scheduled</div>
                      <div style={{ fontSize: 13, color: labelColor, textAlign: 'center' }}>
                        {selectedDay.format('dddd, MMMM D, YYYY')} is clear.
                      </div>
                      {!isInterviewee && (
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenAddInterview(selectedDay)} style={{ background: '#4f46e5', borderColor: '#4f46e5', borderRadius: 20 }}>
                          Schedule Interview
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              MONTH VIEW — full Google Calendar month grid
          ═══════════════════════════════════════════════════════════════════ */}
          {viewMode === 'month' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', width: '100%' }}>
              {/* Weekday headers */}
              <div style={{ overflowX: 'hidden', width: '100%', flexShrink: 0 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    borderBottom: `1px solid ${gridBorder}`,
                    background: isDarkMode ? '#1e293b' : '#fff',
                    width: '100%',
                  }}
                >
                  {WEEKDAYS.map((wd, i) => (
                    <div
                      key={wd}
                      style={{
                        textAlign: 'center',
                        padding: isMobile ? '6px 0' : '8px 0',
                        fontSize: isMobile ? 10 : 11,
                        fontWeight: 700,
                        letterSpacing: isMobile ? 0 : 1,
                        color: i === 0 || i === 6 ? '#ef4444' : labelColor,
                        borderRight: i < 6 ? `1px solid ${gridBorder}` : 'none',
                        textTransform: 'uppercase',
                      }}
                    >
                      {isMobile ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i] : wd}
                    </div>
                  ))}
                </div>
              </div>

              {/* Calendar grid cells */}
              <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', width: '100%' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gridAutoRows: isMobile ? 'minmax(64px, 1fr)' : 'minmax(120px, 1fr)',
                    width: '100%',
                  }}
                >
                  {calendarDays.map((cell, idx) => {
                    if (!cell) {
                      return (
                        <div
                          key={`empty-${idx}`}
                          style={{
                            background: isDarkMode ? '#111827' : '#f9fafb',
                            borderRight: `1px solid ${gridBorder}`,
                            borderBottom: `1px solid ${gridBorder}`,
                          }}
                        />
                      );
                    }

                    const visible = cell.items.slice(0, isMobile ? 2 : MAX_CHIPS_PER_DAY);
                    const overflow = cell.items.length - (isMobile ? 2 : MAX_CHIPS_PER_DAY);
                    const cellUnavails = getDevAvailListOnDate(cell.key);
                    const freeSlots = getDevFreeSlotsOnDate(cell.key);
                    const isWeekend = cell.date.day() === 0 || cell.date.day() === 6;
                    const isCurrentMonth = cell.date.month() === currentMonth.month();

                    return (
                      <div
                        key={cell.key}
                        onClick={() => {
                          if (isMobile) {
                            handleSelectDay(cell.date);
                          } else {
                            handleOpenAddInterview(cell.date);
                          }
                        }}
                        style={{
                          borderRight: `1px solid ${gridBorder}`,
                          borderBottom: `1px solid ${gridBorder}`,
                          padding: isMobile ? '2px 2px' : '4px 6px',
                          cursor: 'pointer',
                          background: isWeekend
                            ? (isDarkMode ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.02)')
                            : (isDarkMode ? '#1e293b' : '#fff'),
                          transition: 'background 0.1s',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                          overflow: 'hidden',
                          opacity: isCurrentMonth ? 1 : 0.45,
                        }}
                      >
                        {/* Date number header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'space-between', marginBottom: 1 }}>
                          <span
                            onClick={(e) => { e.stopPropagation(); handleSelectDay(cell.date); }}
                            style={{
                              width: isMobile ? 22 : 24,
                              height: isMobile ? 22 : 24,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: isMobile ? 11 : 12,
                              fontWeight: cell.isToday ? 700 : 500,
                              background: cell.isToday ? '#4f46e5' : 'transparent',
                              color: cell.isToday ? '#fff' : isWeekend ? '#ef4444' : headingColor,
                              cursor: 'pointer',
                            }}
                            title={`Switch to Day View for ${cell.date.format('MMM D')}`}
                          >
                            {cell.date.date()}
                          </span>
                          {!isMobile && (
                            <div style={{ display: 'flex', gap: 2 }}>
                              {cellUnavails.length > 0 && (
                                <Tooltip title={cellUnavails.map(u => `${u.CandidateName ?? u.candidate_name}: ${u.ReasonType ?? 'Unavailable'}${u.StartTime ? ` (${u.StartTime}–${u.EndTime})` : ' (All Day)'}`).join('\n')}>
                                  <span style={{ fontSize: 9, fontWeight: 700, background: isDarkMode ? '#78350f' : '#fef3c7', color: isDarkMode ? '#fcd34d' : '#92400e', borderRadius: 3, padding: '1px 4px', cursor: 'pointer' }}>
                                    🟠 {cellUnavails.length}
                                  </span>
                                </Tooltip>
                              )}
                              {freeSlots.length > 0 && (
                                <Tooltip title={freeSlots.map(s => `${s.CandidateName ? `${s.CandidateName}: ` : ''}${s.StartTime ?? ''} – ${s.EndTime ?? ''} ${s.TimeZone ?? ''}`).join('\n')}>
                                  <span style={{ fontSize: 9, fontWeight: 700, background: isDarkMode ? '#064e3b' : '#dcfce7', color: isDarkMode ? '#6ee7b7' : '#15803d', borderRadius: 3, padding: '1px 4px', cursor: 'pointer' }}>
                                    🟢 {freeSlots.length}
                                  </span>
                                </Tooltip>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Mobile dots indicator */}
                        {isMobile ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minHeight: 18 }}>
                            {/* Dots row for availability */}
                            {(cellUnavails.length > 0 || freeSlots.length > 0) && (
                              <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                {cellUnavails.length > 0 && (
                                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b' }} title="Unavailable" />
                                )}
                                {freeSlots.length > 0 && (
                                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} title="Free slot" />
                                )}
                              </div>
                            )}

                            {/* Mini event badges or dots */}
                            {visible.map((item, idx) => (
                              <div
                                key={item.chipKey || idx}
                                onClick={(e) => { e.stopPropagation(); setSelectedEventForModal(item); }}
                                style={{
                                  fontSize: 8,
                                  fontWeight: 700,
                                  background: getRecruiterColor(item.intervieweeName),
                                  color: '#fff',
                                  borderRadius: 3,
                                  padding: '1px 3px',
                                  width: '100%',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  textAlign: 'center',
                                  lineHeight: 1.1,
                                }}
                              >
                                {item.intervieweeName || item.companyName}
                              </div>
                            ))}
                            {overflow > 0 && (
                              <span style={{ fontSize: 8, color: '#4f46e5', fontWeight: 700 }}>
                                +{overflow}
                              </span>
                            )}
                          </div>
                        ) : (
                          <>
                            {/* Developer Unavailable / Emergency Badges with NAME, REASON, and TIME */}
                            {cellUnavails.map((unav, uIdx) => {
                              const candName = unav.CandidateName || unav.candidate_name || 'Developer';
                              const reason = unav.ReasonType || unav.reason_type || 'Unavailable';
                              const timeStr = (unav.StartTime && unav.EndTime) ? `${unav.StartTime}–${unav.EndTime}` : 'All Day';
                              return (
                                <Tooltip
                                  key={`month-unav-${uIdx}`}
                                  title={
                                    <div style={{ fontSize: 12 }}>
                                      <div style={{ fontWeight: 700 }}>🟠 {candName}</div>
                                      <div>Status: Unavailable ({reason})</div>
                                      <div>Time: {timeStr} ({unav.TimeZone || 'PKT'})</div>
                                      {unav.Notes && <div>Note: {unav.Notes}</div>}
                                    </div>
                                  }
                                >
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAvailabilityModal({ open: true, date: cell.date, candidate: candName });
                                    }}
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      background: isDarkMode ? '#78350f' : '#fef3c7',
                                      color: isDarkMode ? '#fcd34d' : '#92400e',
                                      border: `1px solid ${isDarkMode ? '#b45309' : '#fde68a'}`,
                                      borderRadius: 4,
                                      padding: '1px 5px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 3,
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      lineHeight: '14px',
                                    }}
                                  >
                                    <span style={{ fontSize: 9, flexShrink: 0 }}>🟠</span>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      <strong>{candName}:</strong> {reason}
                                      <span style={{ opacity: 0.85, fontWeight: 400, marginLeft: 2 }}>({timeStr})</span>
                                    </span>
                                  </div>
                                </Tooltip>
                              );
                            })}

                            {/* Free slot badges if any */}
                            {freeSlots.slice(0, 2).map((s, idx) => (
                              <div
                                key={`month-free-${idx}`}
                                style={{
                                  fontSize: 9,
                                  fontWeight: 600,
                                  background: isDarkMode ? '#064e3b' : '#dcfce7',
                                  color: isDarkMode ? '#6ee7b7' : '#15803d',
                                  borderRadius: 3,
                                  padding: '1px 4px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                🟢 {s.CandidateName ? `${s.CandidateName}: ` : ''}{s.StartTime ? `${s.StartTime}–${s.EndTime}` : 'Available'}
                              </div>
                            ))}

                            {/* Event chips */}
                            {visible.map((item) => (
                              <InterviewChip
                                key={item.chipKey}
                                item={item}
                                isDarkMode={isDarkMode}
                                primaryTz={primaryTimezone}
                                onClick={(e) => { e.stopPropagation(); setSelectedEventForModal(item); }}
                              />
                            ))}
                            {overflow > 0 && (
                              <span
                                onClick={(e) => { e.stopPropagation(); handleSelectDay(cell.date); }}
                                style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', paddingLeft: 2, cursor: 'pointer' }}
                              >
                                +{overflow} more
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Unscheduled items */}
                {unscheduled.length > 0 && (
                  <div style={{ padding: 16, borderTop: `1px solid ${gridBorder}`, background: isDarkMode ? '#1e293b' : '#fafafa' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: headingColor, marginBottom: 8 }}>No date on file ({unscheduled.length})</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
                      {unscheduled.map((item) => (
                        <Tooltip key={item.id} title={`${item.intervieweeName || '—'} · ${item.companyName || '—'} · ${item.stack || '—'}`}>
                          <span style={{ fontSize: 11, background: isDarkMode ? '#2D2456' : '#F3F0FF', borderColor: isDarkMode ? '#4C3F8A' : '#E0D9FF', borderWidth: 1, borderStyle: 'solid', borderRadius: 12, padding: '2px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: getRecruiterColor(item.intervieweeName), flexShrink: 0 }} />
                            {item.companyName || item.interviewFor || `Row ${item.id}`}
                          </span>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {totalLoaded === 0 && !isLoading && viewMode === 'month' && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
          <Empty description="No interviews loaded. Sync from Excel on the Interviews page." />
        </div>
      )}

      {/* ── REJECT REQUEST MODAL ───────────────────────────────────────────── */}
      <Modal
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontWeight: 700 }}><CloseCircleOutlined /><span>Reject Interview Request</span></div>}
        open={rejectModalState.open}
        onCancel={() => setRejectModalState({ open: false, request: null, reason: '' })}
        onOk={handleRejectRequestSubmit}
        okText="Confirm Rejection"
        okButtonProps={{ danger: true, loading: isRespondingRequest }}
        destroyOnHidden
      >
        {rejectModalState.request && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            <Paragraph style={{ fontSize: 13 }}>
              Rejecting request for <strong>{rejectModalState.request.CompanyName ?? rejectModalState.request.companyName}</strong> on <strong>{dayjs(rejectModalState.request.RequestedDate ?? rejectModalState.request.requestedDate).format('dddd, MMMM D, YYYY')}</strong>.
            </Paragraph>
            <div>
              <Text strong style={{ fontSize: 12, color: headingColor }}>Quick Reason</Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {['Time conflict / Another commitment','Outside my available working hours','Personal leave / Emergency','Skill stack mismatch for this role'].map((preset) => (
                  <Button key={preset} size="small" type={rejectModalState.reason === preset ? 'primary' : 'default'} onClick={() => setRejectModalState(prev => ({ ...prev, reason: preset }))}>{preset}</Button>
                ))}
              </div>
            </div>
            <div>
              <Text strong style={{ fontSize: 12, color: headingColor }}>Reason / Note for Admin</Text>
              <Input.TextArea rows={3} style={{ marginTop: 4 }} placeholder="Explain why you cannot take this slot..." value={rejectModalState.reason} onChange={(e) => setRejectModalState(prev => ({ ...prev, reason: e.target.value }))} maxLength={300} />
            </div>
          </div>
        )}
      </Modal>

      {/* ── REQUESTS HISTORY DRAWER ───────────────────────────────────────── */}
      <Drawer
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: headingColor }}><MailOutlined style={{ color: '#4f46e5' }} /><span>Interview Requests History</span>{candidateRequests.length > 0 && <Tag color="purple">{candidateRequests.length} Total</Tag>}</div>}
        open={requestsDrawerOpen}
        onClose={() => setRequestsDrawerOpen(false)}
        width={Math.min(680, window.innerWidth * 0.95)}
        placement="right"
      >
        {candidateRequests.length === 0 ? (
          <Empty description="No interview requests found." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {candidateRequests.map((req) => {
              const id = req.Id ?? req.id;
              const status = req.Status ?? req.status;
              const comp = req.CompanyName ?? req.companyName;
              const reqDate = dayjs(req.RequestedDate ?? req.requestedDate);
              const cand = req.CandidateName ?? req.candidateName;
              return (
                <div key={id} style={{ padding: 16, borderRadius: 12, border: `1px solid ${gridBorder}`, background: isDarkMode ? '#1e293b' : '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: headingColor }}>{comp}</div>
                      <div style={{ fontSize: 12, color: labelColor }}>{cand} · {reqDate.format('ddd, MMM D, YYYY')}</div>
                    </div>
                    <Tag color={status === 'Pending' ? 'orange' : status === 'Accepted' ? 'green' : 'red'} style={{ fontWeight: 700 }}>{status}</Tag>
                  </div>
                  {(req.ProposedTime || req.proposedTime) && (
                    <div style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600, marginBottom: 8 }}>🕐 {req.ProposedTime ?? req.proposedTime}</div>
                  )}
                  {status === 'Pending' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button size="small" type="primary" onClick={() => handleAcceptRequest(req)} loading={isRespondingRequest} style={{ background: '#059669', borderColor: '#059669', fontWeight: 700 }}>✓ Accept</Button>
                      <Button size="small" danger onClick={() => setRejectModalState({ open: true, request: req, reason: '' })} style={{ fontWeight: 700 }}>✕ Reject</Button>
                    </div>
                  )}
                  {(req.RejectionReason || req.rejectionReason) && (
                    <div style={{ fontSize: 12, color: '#dc2626', marginTop: 6, fontStyle: 'italic' }}>Reason: {req.RejectionReason ?? req.rejectionReason}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Drawer>

      {/* ── AVAILABILITY MODAL ────────────────────────────────────────────── */}
      <Modal
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: headingColor }}><CalendarOutlined style={{ color: '#4f46e5' }} /><span>{unavailMarkMode ? 'Mark as Unavailable / Leave' : 'Check Developer Availability'}</span></div>}
        open={availabilityModal.open}
        onCancel={() => { setAvailabilityModal(prev => ({ ...prev, open: false })); setUnavailMarkMode(false); setAvailSlotMode(false); unavailForm.resetFields(); availSlotForm.resetFields(); }}
        footer={null}
        width={Math.min(600, window.innerWidth - 32)}
        destroyOnHidden
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Date + candidate info */}
          <div style={{ padding: '12px 16px', borderRadius: 10, background: isDarkMode ? '#1e1b4b' : '#eef2ff', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase' }}>{availabilityModal.date.format('ddd')}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#4f46e5', lineHeight: 1 }}>{availabilityModal.date.date()}</div>
              <div style={{ fontSize: 11, color: labelColor }}>{availabilityModal.date.format('MMM YYYY')}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: headingColor }}>{availabilityModal.candidate || 'All Developers'}</div>
              {(() => {
                const k = availabilityModal.date.format('YYYY-MM-DD');
                const unav = getDevAvailOnDate(k);
                const free = getDevFreeSlotsOnDate(k);
                if (unav) return <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, marginTop: 2 }}>🟠 {unav.ReasonType ?? 'Unavailable'}{(unav.StartTime ?? unav.startTime) ? ` · ${unav.StartTime ?? unav.startTime} – ${unav.EndTime ?? unav.endTime}` : ''}{unav.Notes ? ` — ${unav.Notes}` : ''}</div>;
                if (free.length > 0) return <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700, marginTop: 2 }}>🟢 {free.length} Free Slot{free.length > 1 ? 's' : ''} declared</div>;
                return <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700, marginTop: 2 }}>✅ Available — No conflicts</div>;
              })()}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button icon={<WarningOutlined />} onClick={() => { setUnavailMarkMode(true); setAvailSlotMode(false); }} style={{ background: '#f59e0b', borderColor: '#f59e0b', color: '#fff', fontWeight: 600 }}>Mark Unavailable</Button>
            <Button icon={<CheckCircleOutlined />} onClick={() => { setAvailSlotMode(true); setUnavailMarkMode(false); }} style={{ background: '#059669', borderColor: '#059669', color: '#fff', fontWeight: 600 }}>Declare Free Slot</Button>
            {getDevAvailOnDate(availabilityModal.date.format('YYYY-MM-DD')) && (
              <Button danger icon={<DeleteOutlined />} onClick={() => { const rec = getDevAvailOnDate(availabilityModal.date.format('YYYY-MM-DD')); if (rec) handleRemoveUnavailability(rec.Id ?? rec.id); setAvailabilityModal(prev => ({ ...prev, open: false })); }}>Remove Unavailability</Button>
            )}
          </div>

          {/* Mark Unavailable Form */}
          {unavailMarkMode && (
            <Form form={unavailForm} layout="vertical" onFinish={handleMarkUnavailable}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <Form.Item name="reasonType" label={<span style={{ color: headingColor, fontWeight: 600, fontSize: 12 }}>Reason</span>} rules={[{ required: true }]} style={{ gridColumn: '1 / -1' }}>
                  <Select placeholder="Select reason" onChange={v => setUnavailReasonType(v)}>
                    {['Medical / Sick Leave','Personal Emergency','Family Emergency','Holiday / Vacation','National Holiday','Other'].map(r => <Select.Option key={r} value={r}>{r}</Select.Option>)}
                  </Select>
                </Form.Item>
                {unavailReasonType === 'Other' && (
                  <Form.Item name="otherReasonText" label={<span style={{ color: headingColor, fontWeight: 600, fontSize: 12 }}>Custom Reason</span>} rules={[{ required: true }]} style={{ gridColumn: '1 / -1' }}>
                    <Input placeholder="Describe your reason..." />
                  </Form.Item>
                )}
                <Form.Item name="unavailStartTime" label={<span style={{ color: headingColor, fontWeight: 600, fontSize: 12 }}>From (optional)</span>}>
                  <TimePicker format="hh:mm A" use12Hours style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="unavailEndTime" label={<span style={{ color: headingColor, fontWeight: 600, fontSize: 12 }}>To (optional)</span>}>
                  <TimePicker format="hh:mm A" use12Hours style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="timeZone" label={<span style={{ color: headingColor, fontWeight: 600, fontSize: 12 }}>Timezone</span>} initialValue="PKT (UTC+5)">
                  <Select>
                    {['PKT (UTC+5)','EST (UTC-5)','PST (UTC-8)','CST (UTC-6)','UTC'].map(tz => <Select.Option key={tz} value={tz}>{tz}</Select.Option>)}
                  </Select>
                </Form.Item>
                <Form.Item name="notes" label={<span style={{ color: headingColor, fontWeight: 600, fontSize: 12 }}>Notes</span>} style={{ gridColumn: '1 / -1' }}>
                  <Input.TextArea rows={2} placeholder="Additional notes..." maxLength={200} />
                </Form.Item>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button onClick={() => { setUnavailMarkMode(false); unavailForm.resetFields(); }}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={unavailSaving} icon={<WarningOutlined />} style={{ background: '#f59e0b', borderColor: '#f59e0b', fontWeight: 700 }}>Mark Unavailable</Button>
              </div>
            </Form>
          )}

          {/* Declare Free Slot Form */}
          {availSlotMode && (
            <Form form={availSlotForm} layout="vertical" onFinish={handleMarkAvailableSlot}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <Form.Item name="startTime" label={<span style={{ color: headingColor, fontWeight: 600, fontSize: 12 }}>Available From</span>} rules={[{ required: true }]}>
                  <TimePicker format="hh:mm A" use12Hours style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="endTime" label={<span style={{ color: headingColor, fontWeight: 600, fontSize: 12 }}>Available Until</span>} rules={[{ required: true }]}>
                  <TimePicker format="hh:mm A" use12Hours style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="timeZone" label={<span style={{ color: headingColor, fontWeight: 600, fontSize: 12 }}>Timezone</span>} initialValue="PKT (UTC+5)" style={{ gridColumn: '1 / -1' }}>
                  <Select>
                    {['PKT (UTC+5)','EST (UTC-5)','PST (UTC-8)','CST (UTC-6)','UTC'].map(tz => <Select.Option key={tz} value={tz}>{tz}</Select.Option>)}
                  </Select>
                </Form.Item>
                <Form.Item name="notes" label={<span style={{ color: headingColor, fontWeight: 600, fontSize: 12 }}>Notes</span>} style={{ gridColumn: '1 / -1' }}>
                  <Input.TextArea rows={2} placeholder="e.g. Available for US EST morning interviews" maxLength={200} />
                </Form.Item>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button onClick={() => { setAvailSlotMode(false); availSlotForm.resetFields(); }}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={availSlotSaving} icon={<CheckCircleOutlined />} style={{ background: '#059669', borderColor: '#059669', fontWeight: 700 }}>Declare Free Slot</Button>
              </div>
            </Form>
          )}
        </div>
      </Modal>

      {/* ── ADD / EDIT INTERVIEW MODAL ───────────────────────────────────── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4f46e5', fontWeight: 700 }}>
            {editingInterviewRecord ? <EditOutlined /> : <PlusOutlined />}
            <span>{editingInterviewRecord ? 'Edit Interview' : 'Add New Interview'}</span>
          </div>
        }
        open={addInterviewModal}
        onCancel={() => { setAddInterviewModal(false); setEditingInterviewRecord(null); addInterviewForm.resetFields(); }}
        footer={null}
        width={Math.min(700, window.innerWidth - 32)}
        destroyOnHidden
      >
        <Form form={addInterviewForm} layout="vertical" onFinish={handleAddInterviewSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <Form.Item name="IntervieweeName" label={<span style={{ color: headingColor, fontWeight: 600, fontSize: 12 }}>Developer Name</span>} rules={[{ required: true }]}>
              <Select showSearch placeholder="Select developer">
                {allCandidateNames.map(n => <Select.Option key={n} value={n}>{n}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="CompanyName" label={<span style={{ color: headingColor, fontWeight: 600, fontSize: 12 }}>Company Name</span>} rules={[{ required: true }]}>
              <Input placeholder="e.g. Google, Microsoft" />
            </Form.Item>
            <Form.Item name="InterviewDate" label={<span style={{ color: headingColor, fontWeight: 600, fontSize: 12 }}>Interview Date</span>}>
              <DatePicker style={{ width: '100%' }} format="ddd, DD MMM YYYY" />
            </Form.Item>
            <Form.Item name="InterviewTime" label={<span style={{ color: headingColor, fontWeight: 600, fontSize: 12 }}>Time (EST)</span>}>
              <TimePicker format="hh:mm A" use12Hours style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="Stack" label={<span style={{ color: headingColor, fontWeight: 600, fontSize: 12 }}>Tech Stack</span>}>
              <Select showSearch allowClear placeholder="Select stack">
                {allStackNames.map(s => <Select.Option key={s} value={s}>{s}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="InterviewFor" label={<span style={{ color: headingColor, fontWeight: 600, fontSize: 12 }}>Profile / Role</span>}>
              <Select
                showSearch
                allowClear
                placeholder="Select profile"
                optionFilterProp="children"
                onChange={(val) => {
                  const po = profileOwners.find((p) => (typeof p === 'object' ? p.name : p) === val);
                  if (po?.stack) addInterviewForm.setFieldValue('Stack', po.stack);
                }}
              >
                {profileOwners.map((p, idx) => {
                  const name = typeof p === 'object' ? (p.name || p.code || '') : p;
                  const stack = typeof p === 'object' ? p.stack : '';
                  const key = typeof p === 'object' ? (p.code ?? p.name ?? idx) : p;
                  return (
                    <Select.Option key={key} value={name}>
                      {name}{stack ? ` (${stack})` : ''}
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>
            <Form.Item name="InvTo" label={<span style={{ color: headingColor, fontWeight: 600, fontSize: 12 }}>Company via</span>} initialValue="Silmun">
              <Select>
                {['Silmun','Direct','Upwork','LinkedIn'].map(v => <Select.Option key={v} value={v}>{v}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="InterviewType" label={<span style={{ color: headingColor, fontWeight: 600, fontSize: 12 }}>Interview Type</span>} initialValue="Technical">
              <Select>
                {['Technical','HR','Final','General','Assessment'].map(t => <Select.Option key={t} value={t}>{t}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="Status" label={<span style={{ color: headingColor, fontWeight: 600, fontSize: 12 }}>Status</span>} initialValue="Scheduled" style={{ gridColumn: '1 / -1' }}>
              <Select>
                {['Scheduled','Done','Cancelled','Postponed','No Show'].map(s => <Select.Option key={s} value={s}>{s}</Select.Option>)}
              </Select>
            </Form.Item>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 8, background: isDarkMode ? '#1e1b4b' : '#eef2ff', borderLeft: '4px solid #4f46e5', marginBottom: 16, fontSize: 12, color: isDarkMode ? '#c7d2fe' : '#4338ca', fontWeight: 600 }}>
            <TeamOutlined style={{ marginRight: 6 }} />This interview will be saved to the Interviews list and appear on the calendar.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setAddInterviewModal(false); setEditingInterviewRecord(null); addInterviewForm.resetFields(); }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={isCreatingInterview || isUpdatingInterview} icon={<PlusOutlined />} style={{ background: '#4f46e5', borderColor: '#4f46e5', fontWeight: 700 }}>
              {editingInterviewRecord ? 'Save Changes' : 'Add Interview'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ── GOOGLE CALENDAR EVENT DETAILS POPUP CARD ─────────────────────── */}
      <Modal
        open={!!selectedEventForModal}
        onCancel={() => setSelectedEventForModal(null)}
        footer={null}
        width={460}
        closable={false}
        destroyOnHidden
        styles={{ body: { padding: 0, overflow: 'hidden', borderRadius: 16 } }}
      >
        {selectedEventForModal && (
          <div style={{ background: isDarkMode ? '#1e293b' : '#fff', borderRadius: 16, overflow: 'hidden' }}>
            {/* Google Calendar header band colored by candidate */}
            <div
              style={{
                background: getRecruiterColor(selectedEventForModal.intervieweeName),
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#fff',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {selectedEventForModal.interviewType || 'Interview'} · {selectedEventForModal.round} Round
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {!isInterviewee && (
                  <>
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined style={{ color: '#fff', fontSize: 15 }} />}
                      onClick={() => {
                        const it = selectedEventForModal;
                        setSelectedEventForModal(null);
                        handleOpenEditInterview(it);
                      }}
                      title="Edit interview"
                    />
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined style={{ color: '#fff', fontSize: 15 }} />}
                      onClick={() => {
                        const targetId = selectedEventForModal.id;
                        const comp = selectedEventForModal.companyName;
                        Modal.confirm({
                          title: 'Delete Interview?',
                          content: `Are you sure you want to delete this interview with ${comp}?`,
                          okText: 'Delete',
                          okButtonProps: { danger: true },
                          onOk: () => handleDeleteInterview(targetId),
                        });
                      }}
                      title="Delete interview"
                    />
                  </>
                )}
                <Button
                  type="text"
                  size="small"
                  onClick={() => setSelectedEventForModal(null)}
                  style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}
                >
                  ✕
                </Button>
              </div>
            </div>

            {/* Event Details Content */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Company & Role */}
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: headingColor, lineHeight: 1.2 }}>
                  {selectedEventForModal.companyName || 'Interview'}
                </div>
                <div style={{ fontSize: 13, color: labelColor, marginTop: 4 }}>
                  {selectedEventForModal.interviewFor ? `Role / Profile: ${selectedEventForModal.interviewFor}` : 'Standard Interview Round'}
                </div>
              </div>

              {/* Date & Time with Timezones */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <ClockCircleOutlined style={{ fontSize: 18, color: '#4f46e5', marginTop: 3 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: headingColor }}>
                    {dayjs(selectedEventForModal.calendarDate).format('dddd, MMMM D, YYYY')}
                  </div>
                  {(() => {
                    const tz = getTimezoneTimes(selectedEventForModal.calendarDate, primaryTimezone);
                    const tzKeys = Object.keys(TZ_OFFSET_FROM_EST).filter(k => k !== primaryTimezone && k !== 'LOCAL');
                    return (
                      <div style={{ fontSize: 12, color: labelColor, marginTop: 3 }}>
                        <span style={{ fontWeight: 700, color: '#4f46e5', fontSize: 14 }}>
                          {tz?.primaryFlag} {tz?.primary} {tz?.primaryLabel}
                        </span>
                        {tzKeys.slice(0, 2).map(k => tz?.[k.toLowerCase()] ? (
                          <span key={k} style={{ marginLeft: 8, color: headingColor }}>
                            {TZ_FLAGS[k]} {tz[k.toLowerCase()]} {TZ_LABELS[k]}
                          </span>
                        ) : null)}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Developer / Candidate with Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: getRecruiterColor(selectedEventForModal.intervieweeName),
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {getInitials(selectedEventForModal.intervieweeName)}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: headingColor }}>
                    {selectedEventForModal.intervieweeName}
                  </div>
                  <div style={{ fontSize: 12, color: labelColor }}>Developer</div>
                </div>
              </div>

              {/* Tech Stack & Badges */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {selectedEventForModal.stack && (
                  <Tag color={getStackTagColor(selectedEventForModal.stack)} style={{ fontWeight: 600, padding: '3px 10px', borderRadius: 12 }}>
                    💻 {selectedEventForModal.stack}
                  </Tag>
                )}
                {selectedEventForModal.invTo && (
                  <Tag color="geekblue" style={{ fontWeight: 600, padding: '3px 10px', borderRadius: 12 }}>
                    🏢 {selectedEventForModal.invTo}
                  </Tag>
                )}
                <InterviewStatusBadge status={selectedEventForModal.status} />
              </div>

              {/* Meeting Link or Action */}
              {(selectedEventForModal.meetingLink || selectedEventForModal.MeetingLink) ? (
                <Button
                  type="primary"
                  icon={<VideoCameraOutlined />}
                  href={selectedEventForModal.meetingLink || selectedEventForModal.MeetingLink}
                  target="_blank"
                  rel="noreferrer"
                  block
                  size="large"
                  style={{ background: '#059669', borderColor: '#059669', borderRadius: 10, fontWeight: 700 }}
                >
                  Join Meeting (Video Call)
                </Button>
              ) : (
                <div style={{ background: isDarkMode ? '#0f172a' : '#f8fafc', padding: '10px 14px', borderRadius: 10, fontSize: 12, color: labelColor, border: `1px dashed ${gridBorder}` }}>
                  📋 No video meeting link attached. Click edit above to attach link.
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── MOBILE GOOGLE CALENDAR FLOATING ACTION BUTTON (+) ──────────────── */}
      {isMobile && !isInterviewee && (
        <button
          type="button"
          onClick={() => handleOpenAddInterview(viewMode === 'day' ? selectedDay : dayjs())}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#4f46e5',
            color: '#fff',
            border: 'none',
            boxShadow: '0 4px 16px rgba(79,70,229,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            cursor: 'pointer',
            zIndex: 1000,
            transition: 'transform 0.15s',
          }}
          title="Add Interview"
        >
          <PlusOutlined />
        </button>
      )}

    </div>
  );
};


export default InterviewCalendar;


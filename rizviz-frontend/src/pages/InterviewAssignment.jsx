import React, { useMemo, useState } from 'react';
import {
  Alert, Avatar, Button, Card, Col, DatePicker, Empty, Input, Modal, Radio, Row,
  Select, Skeleton, Space, Tag, Typography, App, Popconfirm, Tooltip,
  Badge, Drawer, Table,
} from 'antd';
import {
  BankOutlined, CheckCircleOutlined, InfoCircleOutlined, SearchOutlined,
  UserOutlined, DeleteOutlined, CalendarOutlined, ExclamationCircleOutlined,
  PieChartOutlined, EyeOutlined, ClockCircleOutlined, SendOutlined,
  SwapOutlined, CloseCircleOutlined, MailOutlined, GlobalOutlined,
  AppstoreOutlined, LeftOutlined, RightOutlined, CheckSquareOutlined,
} from '@ant-design/icons';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import {
  useCreateInterviewMutation,
  useDeleteInterviewMutation,
  useGetInterviewCandidatesQuery,
  useGetInterviewCompanyNamesQuery,
  useGetInterviewsForCalendarQuery,
  useGetInterviewsPagedQuery,
  useGetDeveloperAvailabilityQuery,
  useGetScheduleRequestsQuery,
  useCreateScheduleRequestMutation,
  useRespondScheduleRequestMutation,
  useRescheduleScheduleRequestMutation,
} from '../store/apiSlice';
import InterviewStatusBadge from '../components/interviews/InterviewStatusBadge';
import {
  companySummaryFromInterviews,
  hasUpcomingAnywhere,
  recommendDevelopers,
  upcomingForDeveloperAtCompany,
  getUpcomingInterviewForDeveloper,
  getUpcomingAssignmentsForCompany,
} from '../utils/recommendDevelopers';

const { Title, Text, Paragraph } = Typography;

const CHART_COLORS = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#84cc16', // Lime
];

const getInitials = (name) => {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const InterviewAssignment = () => {
  const { message } = App.useApp();
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const { role, user } = useSelector((state) => state.auth);
  const displayName = (typeof user === 'string' ? user : user?.FullName || user?.fullName || user?.Username || user?.username) || 'Admin';

  const [companyName, setCompanyName] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedDev, setSelectedDev] = useState(null);
  const [chartSelectedDevKey, setChartSelectedDevKey] = useState(null);
  const [modalDev, setModalDev] = useState(null);
  const [interviewDate, setInterviewDate] = useState(dayjs());
  const [timeSlot, setTimeSlot] = useState('03:00 PM - 04:00 PM');
  const [timeZone, setTimeZone] = useState('PKT (UTC+5)');
  const [interviewType, setInterviewType] = useState('1st Round');
  const [meetingLink, setMeetingLink] = useState('');
  const [assignmentMode, setAssignmentMode] = useState('request'); // 'request' | 'direct'
  const [requestNotes, setRequestNotes] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [requestsDrawerOpen, setRequestsDrawerOpen] = useState(false);
  const [reassignTarget, setReassignTarget] = useState(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [comparisonDevKeys, setComparisonDevKeys] = useState([]);
  const [comparisonWeekStart, setComparisonWeekStart] = useState(dayjs().startOf('week'));

  const {
    data: companyNames = [],
    isLoading: companiesLoading,
    isError: companiesError,
    refetch: refetchCompanies,
  } = useGetInterviewCompanyNamesQuery();
  const {
    data: candidates = [],
    isLoading: candidatesLoading,
    isError: candidatesError,
    refetch: refetchCandidates,
  } = useGetInterviewCandidatesQuery({});
  const {
    data: paged,
    isFetching: companyIvFetching,
    isError: companyIvError,
    refetch: refetchCompanyIv,
  } = useGetInterviewsPagedQuery(
    { company: companyName, page: 1, limit: 1000 },
    { skip: !companyName }
  );
  const {
    data: calendar,
    isLoading: calendarLoading,
    isError: calendarError,
    refetch: refetchCalendar,
  } = useGetInterviewsForCalendarQuery();
  const [createInterview, { isLoading: assigning }] = useCreateInterviewMutation();
  const [deleteInterview, { isLoading: deleting }] = useDeleteInterviewMutation();

  // Schedule Requests hooks (Accept/Reject lifecycle)
  const {
    data: scheduleRequestsData,
    isLoading: requestsLoading,
    refetch: refetchRequests,
  } = useGetScheduleRequestsQuery({});
  const [createScheduleRequest, { isLoading: sendingRequest }] = useCreateScheduleRequestMutation();
  const [respondScheduleRequest, { isLoading: respondingRequest }] = useRespondScheduleRequestMutation();
  const [rescheduleScheduleRequest, { isLoading: reschedulingRequest }] = useRescheduleScheduleRequestMutation();
  const scheduleRequests = scheduleRequestsData?.data || [];
  const pendingRequestsCount = scheduleRequests.filter((r) => r.Status === 'Pending' || r.status === 'Pending').length;

  // Reschedule state
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState(null);
  const [rescheduleTimeSlot, setRescheduleTimeSlot] = useState('03:00 PM - 04:00 PM');
  const [rescheduleTimeZone, setRescheduleTimeZone] = useState('PKT (UTC+5)');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Unique JD skills available across all developers for filter pills & multi-select
  const availableSkills = useMemo(() => {
    const set = new Set();
    (candidates || []).forEach((c) => {
      (c.stacks || []).forEach((s) => {
        if (s && s.trim()) set.add(s.trim());
      });
    });
    ['React', 'Node.js', '.NET', 'Python', 'Angular', 'Java', 'SQL', 'AWS', 'Vue', 'React Native', 'TypeScript', 'Docker'].forEach((s) => set.add(s));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [candidates]);

  // Fetch developer's self-declared availability and unavailability
  const { data: devAvailData } = useGetDeveloperAvailabilityQuery({});
  const devAvailList = devAvailData?.data || [];
  // Build maps: unavail (Unavailable/Emergency) and freeSlots (Available with time slots)
  const { devUnavailByDate, devFreeSlotsByDate } = useMemo(() => {
    const unavail = {};
    const freeSlots = {};
    devAvailList.forEach((a) => {
      const candKey = (a.CandidateName ?? a.candidate_name ?? '').trim().toLowerCase();
      const dateKey = dayjs(a.AvailabilityDate ?? a.availability_date).format('YYYY-MM-DD');
      const status = (a.Status ?? a.status ?? '').toLowerCase();

      if (status === 'available') {
        if (!freeSlots[candKey]) freeSlots[candKey] = {};
        if (!freeSlots[candKey][dateKey]) freeSlots[candKey][dateKey] = [];
        freeSlots[candKey][dateKey].push(a);
      } else {
        if (!unavail[candKey]) unavail[candKey] = {};
        unavail[candKey][dateKey] = a;
      }
    });
    return { devUnavailByDate: unavail, devFreeSlotsByDate: freeSlots };
  }, [devAvailList]);

  // Get any declared unavailability for a developer on a specific date
  const getDevDeclaredUnavail = (devName, date) => {
    if (!devName || !date) return null;
    const candKey = devName.trim().toLowerCase();
    const dateKey = dayjs(date).format('YYYY-MM-DD');
    return devUnavailByDate[candKey]?.[dateKey] || null;
  };

  // Get any declared free slots for a developer on a specific date
  const getDevDeclaredFreeSlots = (devName, date) => {
    if (!devName || !date) return [];
    const candKey = devName.trim().toLowerCase();
    const dateKey = dayjs(date).format('YYYY-MM-DD');
    return devFreeSlotsByDate[candKey]?.[dateKey] || [];
  };

  const companyInterviews = paged?.data || [];
  const allDatedInterviews = calendar?.data || [];

  const heading = isDarkMode ? '#f1f5f9' : '#1e293b';
  const sub = isDarkMode ? '#94a3b8' : '#64748b';
  const cardBg = isDarkMode ? '#1c1942' : '#ffffff';
  const cardBorder = isDarkMode ? '#2e2a62' : '#e8e8f4';

  const summary = useMemo(
    () => (companyName ? companySummaryFromInterviews(companyInterviews, companyName) : null),
    [companyInterviews, companyName]
  );

  const recommended = useMemo(
    () => (companyName ? recommendDevelopers({ interviews: companyInterviews, candidates, companyName }) : []),
    [companyInterviews, candidates, companyName]
  );

  const recommendedKeys = useMemo(() => new Set(recommended.map((d) => d.key)), [recommended]);

  const getAugmentedDev = (dev) => {
    if (!dev) return null;
    const assignedInterview = companyName
      ? getUpcomingInterviewForDeveloper(allDatedInterviews, dev.name, companyName)
      : null;
    const alreadyAssigned = !!assignedInterview;
    const busy = !alreadyAssigned && hasUpcomingAnywhere(allDatedInterviews, dev.name);
    const cand = (candidates || []).find(
      (c) => (c.interviewee_name || c.IntervieweeName || '').trim().toLowerCase() === (dev.name || '').trim().toLowerCase()
    );
    const devStacks = dev.stacks || cand?.stacks || [];
    let matchPercent = 0;
    let matchingSkillsCount = 0;
    if (selectedSkills.length > 0) {
      matchingSkillsCount = selectedSkills.filter((sk) =>
        devStacks.some((ds) => ds.toLowerCase().includes(sk.toLowerCase()) || sk.toLowerCase().includes(ds.toLowerCase()))
      ).length;
      matchPercent = Math.round((matchingSkillsCount / selectedSkills.length) * 100);
    }
    return {
      ...dev,
      stacks: devStacks,
      experienceYears: dev.experienceYears || cand?.experience_years || 'Senior (5+ Yrs)',
      previousWithCompany: dev.count ?? dev.previousWithCompany ?? 0,
      assignedInterview,
      alreadyAssigned,
      available: !busy && !alreadyAssigned,
      matchPercent,
      matchingSkillsCount,
    };
  };

  const chartData = useMemo(() => {
    if (!recommended || !recommended.length) return [];
    return recommended.map((d, index) => {
      const interviewCount = (d.count && d.count > 0) ? d.count : (d.history?.length || 1);
      return {
        name: d.name,
        key: d.key,
        value: interviewCount,
        count: d.count || d.history?.length || 0,
        color: CHART_COLORS[index % CHART_COLORS.length],
        dev: d,
      };
    });
  }, [recommended]);

  const activeChartDev = useMemo(() => {
    if (!recommended || !recommended.length) return null;
    if (chartSelectedDevKey) {
      const found = recommended.find((d) => d.key === chartSelectedDevKey);
      if (found) return found;
    }
    return recommended[0];
  }, [recommended, chartSelectedDevKey]);

  const handleSliceClick = (entry) => {
    const item = entry?.payload || entry;
    const dev = item?.dev || recommended.find((d) => d.key === item?.key || d.name === item?.name);
    if (dev) {
      const augDev = getAugmentedDev(dev);
      setChartSelectedDevKey(dev.key);
      setModalDev(augDev);
      const el = document.getElementById(`dev-card-${dev.key}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  const CustomChartTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className="p-3 rounded-xl shadow-xl text-xs"
          style={{
            background: isDarkMode ? '#1e1b4b' : '#ffffff',
            border: `1px solid ${isDarkMode ? '#3730a3' : '#e0e7ff'}`,
            color: heading,
            minWidth: 180,
          }}
        >
          <div className="font-bold text-sm mb-1 flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
              style={{ background: data.color }}
            />
            <span>{data.name}</span>
          </div>
          <div style={{ color: sub }}>
            Interviews with {companyName}: <strong style={{ color: heading }}>{data.count}</strong>
          </div>
          {data.dev?.lastInterviewFor && (
            <div style={{ color: sub }} className="mt-0.5">
              Profile: <strong style={{ color: isDarkMode ? '#7dd3fc' : '#0369a1' }}>{data.dev.lastInterviewFor}</strong>
            </div>
          )}
          {data.dev?.stacks?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {data.dev.stacks.slice(0, 3).map((s) => (
                <Tag key={s} className="m-0 text-[10px]" style={{ borderRadius: 999 }}>{s}</Tag>
              ))}
            </div>
          )}
          <div className="mt-2 text-[11px] text-indigo-400 font-medium">
            👉 Click slice to open full card
          </div>
        </div>
      );
    }
    return null;
  };

  const companyAssignedInterviews = useMemo(() => {
    if (!companyName) return [];
    return getUpcomingAssignmentsForCompany(allDatedInterviews, companyName);
  }, [allDatedInterviews, companyName]);

  const allDevelopers = useMemo(() => {
    const list = (candidates || []).map((c) => {
      const name = c.interviewee_name || c.IntervieweeName || '';
      const key = name.trim().toLowerCase();
      const rec = recommended.find((d) => d.key === key);
      const assignedInterview = companyName
        ? getUpcomingInterviewForDeveloper(allDatedInterviews, name, companyName)
        : null;
      const alreadyAssigned = !!assignedInterview;
      const busyInterview = !alreadyAssigned ? getUpcomingInterviewForDeveloper(allDatedInterviews, name) : null;
      const busy = !!busyInterview;
      const devStacks = c.stacks || [];

      let matchPercent = 0;
      let matchingSkillsCount = 0;
      if (selectedSkills.length > 0) {
        matchingSkillsCount = selectedSkills.filter((sk) =>
          devStacks.some((ds) => ds.toLowerCase().includes(sk.toLowerCase()) || sk.toLowerCase().includes(ds.toLowerCase()))
        ).length;
        matchPercent = Math.round((matchingSkillsCount / selectedSkills.length) * 100);
      }

      return {
        name,
        key,
        email: c.email || '',
        stacks: devStacks,
        experienceYears: c.experience_years || 'Senior (5+ Yrs)',
        interviewCountTotal: c.interview_count ?? 0,
        previousWithCompany: rec?.count || 0,
        lastDate: rec?.lastDate || null,
        lastStatus: rec?.lastStatus || null,
        lastInterviewFor: rec?.lastInterviewFor || '',
        history: rec?.history || [],
        assignedInterview,
        alreadyAssigned,
        available: !busy && !alreadyAssigned,
        matchPercent,
        matchingSkillsCount,
      };
    }).filter((d) => d.name);

    const q = search.trim().toLowerCase();
    return list
      .filter((d) => {
        if (q) {
          const hay = `${d.name} ${(d.stacks || []).join(' ')} ${d.email}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (selectedSkills.length > 0 && d.matchingSkillsCount === 0) {
          return false;
        }
        if (filter === 'assigned') return d.alreadyAssigned;
        if (filter === 'previous') return d.previousWithCompany > 0;
        if (filter === 'never') return d.previousWithCompany === 0;
        if (filter === 'available') return d.available;
        if (filter === 'unavailable') return !d.available;
        return true;
      })
      .sort((a, b) => {
        if (selectedSkills.length > 0 && b.matchPercent !== a.matchPercent) {
          return b.matchPercent - a.matchPercent;
        }
        if (b.alreadyAssigned !== a.alreadyAssigned) return b.alreadyAssigned ? 1 : -1;
        if (b.previousWithCompany !== a.previousWithCompany) return b.previousWithCompany - a.previousWithCompany;
        return a.name.localeCompare(b.name);
      });
  }, [candidates, recommended, allDatedInterviews, companyName, search, filter, selectedSkills]);

  const loadError = companiesError || candidatesError || calendarError || (!!companyName && companyIvError);
  const loadingList = companiesLoading || candidatesLoading || calendarLoading || (!!companyName && companyIvFetching);

  const retry = () => {
    refetchCompanies();
    refetchCandidates();
    refetchCalendar();
    if (companyName) refetchCompanyIv();
  };

  const selectDeveloper = (dev) => {
    setSelectedDev(dev);
    setInterviewDate(dayjs());
  };

  const handleAssign = async () => {
    if (!companyName || !selectedDev) return;
    try {
      if (assignmentMode === 'request') {
        await createScheduleRequest({
          CandidateName: selectedDev.name,
          CompanyName: companyName,
          RequestedDate: interviewDate ? interviewDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
          TimeSlot: timeSlot,
          TimeZone: timeZone,
          InterviewType: interviewType || '1st Round',
          MeetingLink: meetingLink,
          Notes: requestNotes,
          RequestedBy: displayName,
          DeveloperEmail: selectedDev.email,
        }).unwrap();
        setConfirmOpen(false);
        message.success(`Interview request dispatched to ${selectedDev.name} for ${companyName}! Developer can now Accept or Reject.`);
        setSelectedDev(null);
        setReassignTarget(null);
        refetchRequests();
      } else {
        await createInterview({
          CompanyName: companyName,
          IntervieweeName: selectedDev.name,
          InterviewDate: interviewDate ? interviewDate.toISOString() : dayjs().toISOString(),
          Status: 'Scheduled',
          Stack: (selectedDev.stacks && selectedDev.stacks[0]) || undefined,
          InterviewType: interviewType || 'Scheduled',
        }).unwrap();
        setConfirmOpen(false);
        message.success('Interview directly scheduled successfully.');
        setSelectedDev(null);
        setReassignTarget(null);
        refetchCompanyIv();
        refetchCalendar();
        refetchCandidates();
      }
    } catch (err) {
      message.error('Assignment failed: ' + (err?.data?.message || err?.message || 'Please try again.'));
    }
  };

  const handleReassign = (req) => {
    setCompanyName(req.CompanyName || req.company_name);
    setReassignTarget(req);
    if (req.RequestedDate || req.requested_date) {
      setInterviewDate(dayjs(req.RequestedDate || req.requested_date));
    }
    setTimeSlot(req.TimeSlot || req.time_slot || '03:00 PM - 04:00 PM');
    setTimeZone(req.TimeZone || req.timezone || 'PKT (UTC+5)');
    setInterviewType(req.InterviewType || req.interview_type || '1st Round');
    setRequestsDrawerOpen(false);
    message.info(`Re-assigning interview for ${req.CompanyName || req.company_name}. Choose a suitable developer below.`);
    const el = document.getElementById('company-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleQuickRespond = async (id, action, reason = '') => {
    try {
      await respondScheduleRequest({ id, action, reason }).unwrap();
      message.success(`Request ${action}ed successfully.`);
      refetchRequests();
      refetchCalendar();
      refetchCompanyIv();
    } catch (err) {
      message.error(`Failed to ${action} request: ` + (err?.data?.message || err?.message || 'Error occurred'));
    }
  };

  const handleOpenReschedule = (req) => {
    setRescheduleTarget(req);
    const dateVal = req.RequestedDate || req.requested_date;
    setRescheduleDate(dateVal ? dayjs(dateVal) : dayjs());
    setRescheduleTimeSlot(req.TimeSlot || req.time_slot || '03:00 PM - 04:00 PM');
    setRescheduleTimeZone(req.TimeZone || req.timezone || 'PKT (UTC+5)');
    setRescheduleReason(req.Notes || req.notes || '');
    setRescheduleModalOpen(true);
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleTarget || !rescheduleDate) return;
    try {
      const id = rescheduleTarget.Id || rescheduleTarget.id;
      await rescheduleScheduleRequest({
        id,
        newDate: rescheduleDate.format('YYYY-MM-DD'),
        newTimeSlot: rescheduleTimeSlot,
        newTimeZone: rescheduleTimeZone,
        reason: rescheduleReason,
      }).unwrap();
      message.success(`Interview for ${rescheduleTarget.CandidateName || rescheduleTarget.candidate_name} rescheduled successfully!`);
      setRescheduleModalOpen(false);
      setRescheduleTarget(null);
      refetchRequests();
      refetchCalendar();
      if (companyName) refetchCompanyIv();
    } catch (err) {
      message.error('Failed to reschedule: ' + (err?.data?.message || err?.message || 'Error occurred'));
    }
  };

  const handleDeleteAssignment = async (interviewId, devName) => {
    if (!interviewId) {
      message.error('Interview ID not found for this assignment.');
      return;
    }
    try {
      await deleteInterview(interviewId).unwrap();
      message.success(`Assignment for ${devName || 'developer'} deleted successfully.`);
      if (selectedDev?.name === devName) {
        setSelectedDev(null);
      }
      refetchCompanyIv();
      refetchCalendar();
      refetchCandidates();
    } catch (err) {
      message.error('Failed to delete assignment: ' + (err?.data?.message || err?.message || 'Error occurred'));
    }
  };

  const DeveloperCard = ({ dev, recommendedCard }) => {
    const selected = selectedDev?.key === dev.key;
    const isChartSelected = chartSelectedDevKey === dev.key;
    const isAssigned = dev.alreadyAssigned;
    const assignedId = dev.assignedInterview?.Id ?? dev.assignedInterview?.id;
    const assignedDate = dev.assignedInterview?.InterviewDate ?? dev.assignedInterview?.interviewDate;

    return (
      <div id={`dev-card-${dev.key}`} className="h-full">
        <Card
          className="h-full"
          styles={{ body: { padding: 16 } }}
          style={{
            background: cardBg,
            border: isAssigned
              ? '2px solid #f59e0b'
              : selected
              ? '2px solid #4f46e5'
              : isChartSelected
              ? '2px solid #6366f1'
              : `1px solid ${cardBorder}`,
            borderRadius: 16,
            boxShadow: isAssigned
              ? '0 8px 24px -10px rgba(245,158,11,0.25)'
              : selected
              ? '0 10px 30px -12px rgba(79,70,229,0.35)'
              : isChartSelected
              ? '0 12px 32px -10px rgba(99,102,241,0.45)'
              : '0 8px 24px -12px rgba(79,70,229,0.08)',
            transition: 'all 0.25s ease',
          }}
        >
          <div className="flex items-start gap-3">
            <Avatar
              size={48}
              style={{
                background: isAssigned
                  ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                  : isChartSelected
                  ? 'linear-gradient(135deg,#4f46e5,#7c3aed)'
                  : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                fontWeight: 800,
              }}
            >
              {getInitials(dev.name)}
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Text strong style={{ color: heading, fontSize: 15 }}>{dev.name}</Text>
                {dev.experienceYears && (
                  <Tag color="cyan" className="m-0 font-semibold text-[11px]" style={{ borderRadius: 6 }}>
                    💼 {dev.experienceYears}
                  </Tag>
                )}
                {dev.previousWithCompany > 0 && (
                  <Tag color="purple" className="m-0 text-[11px]">Previously Interviewed</Tag>
                )}
                {isAssigned && <Tag color="orange" className="m-0 font-medium text-[11px]">Assigned</Tag>}
                {!isAssigned && (
                  <Tag color={dev.available ? 'success' : 'default'} className="m-0 text-[11px]">
                    {dev.available ? 'Available' : 'Unavailable'}
                  </Tag>
                )}
                {selectedSkills.length > 0 && (
                  <Tag
                    color={dev.matchPercent === 100 ? 'green' : dev.matchPercent > 0 ? 'geekblue' : 'default'}
                    className="m-0 font-bold text-[11px]"
                    style={{ borderRadius: 6 }}
                  >
                    {dev.matchPercent === 100
                      ? '🎯 100% JD Match'
                      : `⚡ ${dev.matchingSkillsCount}/${selectedSkills.length} JD Match`}
                  </Tag>
                )}
              </div>
              {dev.email && <div className="text-xs mt-0.5" style={{ color: sub }}>{dev.email}</div>}
              <div className="flex flex-wrap gap-1 mt-2">
                {(dev.stacks || []).length ? (
                  (dev.stacks || []).map((s) => {
                    const isMatched = selectedSkills.some(
                      (sk) => sk.toLowerCase().trim() === s.toLowerCase().trim() ||
                              s.toLowerCase().includes(sk.toLowerCase().trim())
                    );
                    return (
                      <Tag
                        key={s}
                        className="m-0 text-xs font-semibold transition-all"
                        style={{
                          borderRadius: 999,
                          background: isMatched ? '#4f46e5' : undefined,
                          color: isMatched ? '#ffffff' : undefined,
                          borderColor: isMatched ? '#4338ca' : undefined,
                          boxShadow: isMatched ? '0 2px 6px rgba(79,70,229,0.3)' : undefined,
                        }}
                      >
                        {isMatched ? `✓ ${s}` : s}
                      </Tag>
                    );
                  })
                ) : (
                  <Text type="secondary" className="text-xs">No stack on file</Text>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-1 text-xs" style={{ color: sub }}>
            {dev.experienceYears && (
              <div className="flex items-center gap-1.5 pb-0.5">
                <span style={{ color: sub }}>💼 Experience / Seniority:</span>
                <strong style={{ color: isDarkMode ? '#38bdf8' : '#0284c7' }}>{dev.experienceYears}</strong>
              </div>
            )}
            {isAssigned && assignedDate && (
              <div className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 py-1">
                <CalendarOutlined /> Scheduled: {dayjs(assignedDate).format('D MMM YYYY')}
              </div>
            )}
            {recommendedCard && (
              <div>Previously interviewed with {companyName}</div>
            )}
            {dev.lastDate && (
              <div>Last interview: {dev.lastDate.format('D MMM YYYY')}</div>
            )}
            {dev.lastStatus && (
              <div className="flex items-center gap-2">
                Result: <InterviewStatusBadge status={dev.lastStatus} record={dev.lastStatus} />
              </div>
            )}

            {/* Profile Owner & Developer info rows */}
            {dev.name && (
              <div className="flex items-center gap-1.5 pt-1">
                <UserOutlined style={{ color: '#4f46e5', fontSize: 11 }} />
                <span style={{ color: sub }}>Developer:</span>
                <strong style={{ color: isDarkMode ? '#e2e8f0' : '#1e293b' }}>{dev.name}</strong>
              </div>
            )}
            {dev.lastInterviewFor && (
              <div className="flex items-center gap-1.5">
                <InfoCircleOutlined style={{ color: '#0891b2', fontSize: 11 }} />
                <span style={{ color: sub }}>Profile:</span>
                <strong style={{ color: isDarkMode ? '#7dd3fc' : '#0369a1' }}>{dev.lastInterviewFor}</strong>
              </div>
            )}

            <div>
              Previous interviews with this company: <strong>{dev.previousWithCompany || 0}</strong>
            </div>
            {dev.interviewCountTotal != null && (
              <div>Total interviews: {dev.interviewCountTotal}</div>
            )}
          </div>

          {isAssigned ? (
            <Popconfirm
              title="Delete Assignment?"
              description={`Are you sure you want to remove ${dev.name}'s scheduled interview with ${companyName}?`}
              onConfirm={() => handleDeleteAssignment(assignedId, dev.name)}
              okText="Yes, Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true, loading: deleting }}
            >
              <Button
                danger
                block
                className="mt-4 font-semibold"
                icon={<DeleteOutlined />}
              >
                Delete Assignment
              </Button>
            </Popconfirm>
          ) : (
            <>
              {/* Self-declared unavailability warning on developer card */}
              {(() => {
                const selectedDate = interviewDate || dayjs();
                const declaredUnavail = getDevDeclaredUnavail(dev.name, selectedDate);
                if (!declaredUnavail) return null;
                const reason = declaredUnavail.ReasonType ?? declaredUnavail.reason_type ?? 'Unavailable';
                const notes = declaredUnavail.Notes ?? declaredUnavail.notes ?? '';
                return (
                  <Alert
                    type="warning"
                    showIcon
                    icon={<ExclamationCircleOutlined />}
                    className="mt-3"
                    style={{ borderRadius: 10 }}
                    message={
                      <span className="font-bold text-xs">
                        🟠 Self-Declared {reason} on {selectedDate.format('D MMM')}
                      </span>
                    }
                    description={notes ? <span className="text-xs">{notes}</span> : undefined}
                  />
                );
              })()}

              {/* Self-declared free slots indicator on developer card */}
              {(() => {
                const selectedDate = interviewDate || dayjs();
                const freeSlots = getDevDeclaredFreeSlots(dev.name, selectedDate);
                if (freeSlots.length === 0) return null;
                return (
                  <Alert
                    type="success"
                    showIcon
                    icon={<CheckCircleOutlined />}
                    className="mt-3"
                    style={{ borderRadius: 10 }}
                    message={
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-xs">
                          🟢 Declared Free on {selectedDate.format('D MMM')}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {freeSlots.map((s, idx) => (
                            <Tag key={idx} color="green" className="m-0 font-medium text-[11px]">
                              {s.StartTime ?? s.startTime ? `${s.StartTime ?? s.startTime} – ${s.EndTime ?? s.endTime}` : 'All Day'}
                              {(s.TimeZone ?? s.timeZone) ? ` (${s.TimeZone ?? s.timeZone})` : ''}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    }
                    description={
                      freeSlots.some((s) => s.Notes || s.notes) ? (
                        <span className="text-[11px] text-emerald-800 dark:text-emerald-300 italic">
                          {freeSlots.map((s) => s.Notes || s.notes).filter(Boolean).join('; ')}
                        </span>
                      ) : undefined
                    }
                  />
                );
              })()}
              <div className="flex items-center gap-2 mt-4">
                <Button
                  type={selected ? 'primary' : 'default'}
                  className="flex-1 font-medium"
                  disabled={!dev.available}
                  onClick={() => selectDeveloper(dev)}
                  style={selected ? { background: '#4f46e5', borderColor: '#4f46e5' } : undefined}
                >
                  {!dev.available ? 'Busy elsewhere' : selected ? 'Selected' : 'Select Developer'}
                </Button>
                <Tooltip title="View complete info card">
                  <Button
                    icon={<EyeOutlined />}
                    onClick={() => setModalDev(getAugmentedDev(dev))}
                  />
                </Tooltip>
              </div>
            </>
          )}
        </Card>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────
  // Multi-Developer Comparison Matrix Modal
  // ──────────────────────────────────────────────────────────────────
  const ComparisonMatrixModal = () => {
    const weekDays = Array.from({ length: 7 }, (_, i) => comparisonWeekStart.add(i, 'day'));
    const today = dayjs().format('YYYY-MM-DD');

    // All developers available for selection (from allDevelopers computed list)
    const devOptions = (candidates || []).map((c) => {
      const name = c.interviewee_name || c.IntervieweeName || '';
      return { key: name.trim().toLowerCase(), name };
    }).filter((d) => d.name);

    const selectedDevObjects = comparisonDevKeys
      .map((k) => devOptions.find((d) => d.key === k))
      .filter(Boolean);

    const COMP_COLORS = [
      { bg: '#ede9fe', border: '#7c3aed', text: '#4c1d95', dark_bg: 'rgba(124,58,237,0.18)', dark_border: '#7c3aed', dark_text: '#c4b5fd' },
      { bg: '#d1fae5', border: '#059669', text: '#064e3b', dark_bg: 'rgba(5,150,105,0.18)', dark_border: '#059669', dark_text: '#6ee7b7' },
      { bg: '#ffedd5', border: '#ea580c', text: '#7c2d12', dark_bg: 'rgba(234,88,12,0.18)', dark_border: '#ea580c', dark_text: '#fdba74' },
      { bg: '#dbeafe', border: '#2563eb', text: '#1e3a8a', dark_bg: 'rgba(37,99,235,0.18)', dark_border: '#2563eb', dark_text: '#93c5fd' },
      { bg: '#fce7f3', border: '#db2777', text: '#831843', dark_bg: 'rgba(219,39,119,0.18)', dark_border: '#db2777', dark_text: '#f9a8d4' },
    ];

    const getCellContent = (devName, day) => {
      const dateKey = day.format('YYYY-MM-DD');
      const devKey = devName.trim().toLowerCase();
      const freeSlots = devFreeSlotsByDate[devKey]?.[dateKey] || [];
      const isUnavail = !!devUnavailByDate[devKey]?.[dateKey];
      // Confirmed interviews on this day
      const interviews = allDatedInterviews.filter((iv) => {
        const ivName = (iv.IntervieweeName ?? iv.intervieweeName ?? '').trim().toLowerCase();
        const ivDate = dayjs(iv.InterviewDate ?? iv.interviewDate).format('YYYY-MM-DD');
        return ivName === devKey && ivDate === dateKey;
      });
      return { freeSlots, isUnavail, interviews };
    };

    const toggleDevKey = (key) => {
      setComparisonDevKeys((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : prev.length < 5 ? [...prev, key] : prev
      );
    };

    const headerBg = isDarkMode ? '#1a1740' : '#f8faff';
    const gridBorder = isDarkMode ? '#2e2a62' : '#e0e7ff';

    return (
      <Modal
        title={
          <div className="flex items-center gap-2">
            <AppstoreOutlined style={{ color: '#6366f1', fontSize: 20 }} />
            <span className="font-bold text-base" style={{ color: heading }}>Multi-Developer Availability Comparison</span>
          </div>
        }
        open={comparisonOpen}
        onCancel={() => setComparisonOpen(false)}
        footer={null}
        width={Math.min(1200, window.innerWidth * 0.96)}
        styles={{ body: { padding: 0 } }}
      >
        {/* Developer selector */}
        <div
          className="px-5 py-4 border-b"
          style={{ borderColor: gridBorder, background: headerBg }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <div className="text-sm font-bold mb-1.5" style={{ color: heading }}>
                Select Developers to Compare <span className="font-normal text-xs" style={{ color: sub }}>(max 5)</span>
              </div>
              <Select
                mode="multiple"
                showSearch
                allowClear
                placeholder="Pick 2–5 developers to compare availability..."
                value={comparisonDevKeys}
                onChange={(vals) => setComparisonDevKeys(vals.slice(0, 5))}
                style={{ width: '100%' }}
                maxTagCount={5}
                options={devOptions.map((d) => ({ value: d.key, label: d.name }))}
                filterOption={(input, opt) => (opt?.label || '').toLowerCase().includes(input.toLowerCase())}
              />
            </div>
            {/* Week navigation */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                icon={<LeftOutlined />}
                size="small"
                onClick={() => setComparisonWeekStart((w) => w.subtract(1, 'week'))}
              />
              <span className="text-sm font-semibold min-w-[140px] text-center" style={{ color: heading }}>
                {comparisonWeekStart.format('D MMM')} – {comparisonWeekStart.add(6, 'day').format('D MMM YYYY')}
              </span>
              <Button
                icon={<RightOutlined />}
                size="small"
                onClick={() => setComparisonWeekStart((w) => w.add(1, 'week'))}
              />
              <Button
                size="small"
                onClick={() => setComparisonWeekStart(dayjs().startOf('week'))}
                style={{ fontSize: 11 }}
              >
                Today
              </Button>
            </div>
          </div>

          {/* Color Legend */}
          {selectedDevObjects.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedDevObjects.map((dev, idx) => {
                const col = COMP_COLORS[idx % COMP_COLORS.length];
                return (
                  <div
                    key={dev.key}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{
                      background: isDarkMode ? col.dark_bg : col.bg,
                      border: `1.5px solid ${col.border}`,
                      color: isDarkMode ? col.dark_text : col.text,
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: col.border }}
                    />
                    {dev.name}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Grid */}
        {selectedDevObjects.length === 0 ? (
          <div className="p-10">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Select at least 2 developers above to compare their weekly availability side-by-side."
            />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                tableLayout: 'fixed',
                minWidth: 640,
              }}
            >
              {/* Header row: days */}
              <thead>
                <tr style={{ background: isDarkMode ? '#12102e' : '#f1f5f9' }}>
                  <th
                    style={{
                      width: 140,
                      padding: '10px 12px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 700,
                      color: sub,
                      borderBottom: `2px solid ${gridBorder}`,
                      borderRight: `1px solid ${gridBorder}`,
                    }}
                  >
                    Developer
                  </th>
                  {weekDays.map((day) => {
                    const isToday = day.format('YYYY-MM-DD') === today;
                    return (
                      <th
                        key={day.toString()}
                        style={{
                          padding: '10px 6px',
                          textAlign: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          color: isToday ? '#6366f1' : sub,
                          borderBottom: `2px solid ${gridBorder}`,
                          borderRight: `1px solid ${gridBorder}`,
                          background: isToday
                            ? (isDarkMode ? 'rgba(99,102,241,0.1)' : '#ede9fe')
                            : 'transparent',
                        }}
                      >
                        <div>{day.format('ddd')}</div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 900,
                            color: isToday ? '#6366f1' : heading,
                          }}
                        >
                          {day.format('D')}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 400, color: sub }}>
                          {day.format('MMM')}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Body rows: one row per developer */}
              <tbody>
                {selectedDevObjects.map((dev, devIdx) => {
                  const col = COMP_COLORS[devIdx % COMP_COLORS.length];
                  const augDev = getAugmentedDev(
                    allDevelopers.find((d) => d.key === dev.key) ||
                    recommended.find((d) => d.key === dev.key) ||
                    { name: dev.name, key: dev.key, stacks: [], available: true }
                  );
                  return (
                    <tr
                      key={dev.key}
                      style={{
                        background: isDarkMode ? 'transparent' : '#ffffff',
                        borderBottom: `1px solid ${gridBorder}`,
                      }}
                    >
                      {/* Dev name cell */}
                      <td
                        style={{
                          padding: '10px 12px',
                          borderRight: `1px solid ${gridBorder}`,
                          verticalAlign: 'top',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar
                            size={30}
                            style={{
                              background: col.border,
                              fontWeight: 800,
                              fontSize: 11,
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(dev.name)}
                          </Avatar>
                          <div className="min-w-0">
                            <div
                              className="font-bold text-xs truncate"
                              style={{ color: isDarkMode ? col.dark_text : col.text }}
                            >
                              {dev.name}
                            </div>
                            {augDev?.stacks?.slice(0, 2).map((s) => (
                              <Tag
                                key={s}
                                className="m-0 mr-0.5 mt-0.5"
                                style={{
                                  fontSize: 9,
                                  lineHeight: '14px',
                                  padding: '0 4px',
                                  borderRadius: 999,
                                }}
                              >
                                {s}
                              </Tag>
                            ))}
                          </div>
                        </div>
                        {/* Select button */}
                        <Button
                          size="small"
                          type="primary"
                          disabled={!augDev?.available}
                          onClick={() => {
                            if (augDev) {
                              selectDeveloper(augDev);
                              setComparisonOpen(false);
                              const el = document.getElementById('assign-section');
                              if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 200);
                            }
                          }}
                          className="mt-2 w-full"
                          style={{
                            fontSize: 10,
                            height: 22,
                            background: augDev?.available ? col.border : undefined,
                            borderColor: augDev?.available ? col.border : undefined,
                          }}
                          icon={<CheckSquareOutlined />}
                        >
                          {augDev?.available ? 'Select' : 'Busy'}
                        </Button>
                      </td>

                      {/* Day cells */}
                      {weekDays.map((day) => {
                        const isToday = day.format('YYYY-MM-DD') === today;
                        const { freeSlots, isUnavail, interviews } = getCellContent(dev.name, day);
                        const hasScheduled = interviews.length > 0;
                        const isPast = day.isBefore(dayjs(), 'day');

                        let cellBg = 'transparent';
                        if (isToday && !isDarkMode) cellBg = '#faf5ff';
                        if (isToday && isDarkMode) cellBg = 'rgba(99,102,241,0.05)';

                        return (
                          <td
                            key={day.toString()}
                            style={{
                              padding: 5,
                              verticalAlign: 'top',
                              borderRight: `1px solid ${gridBorder}`,
                              background: cellBg,
                              minHeight: 80,
                            }}
                          >
                            {/* Unavailable banner */}
                            {isUnavail && (
                              <div
                                className="rounded-lg text-center font-bold"
                                style={{
                                  fontSize: 9,
                                  padding: '3px 4px',
                                  background: isDarkMode ? 'rgba(239,68,68,0.2)' : '#fee2e2',
                                  color: isDarkMode ? '#fca5a5' : '#b91c1c',
                                  border: '1px solid #fca5a5',
                                  marginBottom: 3,
                                }}
                              >
                                🔴 Unavailable
                              </div>
                            )}

                            {/* Scheduled interview pills */}
                            {hasScheduled && interviews.map((iv, ivIdx) => (
                              <div
                                key={ivIdx}
                                className="rounded-lg text-center"
                                style={{
                                  fontSize: 9,
                                  padding: '3px 4px',
                                  background: isDarkMode ? 'rgba(245,158,11,0.2)' : '#fef3c7',
                                  color: isDarkMode ? '#fde68a' : '#92400e',
                                  border: '1px solid #fde68a',
                                  marginBottom: 3,
                                  fontWeight: 700,
                                }}
                              >
                                📅 {iv.CompanyName ?? iv.companyName ?? 'Interview'}
                              </div>
                            ))}

                            {/* Free slot pills */}
                            {freeSlots.map((slot, sIdx) => (
                              <Tooltip
                                key={sIdx}
                                title={
                                  <div style={{ fontSize: 11 }}>
                                    <div className="font-bold">{dev.name}</div>
                                    <div>{slot.StartTime ?? slot.startTime} – {slot.EndTime ?? slot.endTime}</div>
                                    {(slot.TimeZone ?? slot.timeZone) && <div>{slot.TimeZone ?? slot.timeZone}</div>}
                                    {(slot.Notes ?? slot.notes) && <div className="italic">{slot.Notes ?? slot.notes}</div>}
                                  </div>
                                }
                              >
                                <div
                                  style={{
                                    fontSize: 9,
                                    padding: '3px 4px',
                                    borderRadius: 6,
                                    marginBottom: 3,
                                    background: isDarkMode ? col.dark_bg : col.bg,
                                    border: `1px solid ${col.border}`,
                                    color: isDarkMode ? col.dark_text : col.text,
                                    fontWeight: 600,
                                    lineHeight: '1.3',
                                    cursor: 'default',
                                  }}
                                >
                                  🟢 {slot.StartTime ?? slot.startTime
                                    ? `${(slot.StartTime ?? slot.startTime).replace(':00', '')}–${(slot.EndTime ?? slot.endTime).replace(':00', '')}`
                                    : 'Free'}
                                </div>
                              </Tooltip>
                            ))}

                            {/* Empty state for past days */}
                            {!isUnavail && !hasScheduled && freeSlots.length === 0 && (
                              <div
                                style={{
                                  fontSize: 9,
                                  color: isPast ? (isDarkMode ? '#374151' : '#d1d5db') : (isDarkMode ? '#4b5563' : '#e5e7eb'),
                                  textAlign: 'center',
                                  paddingTop: 14,
                                }}
                              >
                                {isPast ? '—' : '·'}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend footer */}
        <div
          className="px-5 py-3 border-t flex flex-wrap gap-4 text-xs"
          style={{ borderColor: gridBorder, background: headerBg, color: sub }}
        >
          <span className="flex items-center gap-1.5">
            <span style={{ display:'inline-block', width:10, height:10, borderRadius:3, background:'#16a34a', border:'1px solid #16a34a' }} />
            Declared free slot
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ display:'inline-block', width:10, height:10, borderRadius:3, background: isDarkMode ? 'rgba(239,68,68,0.3)' : '#fee2e2', border:'1px solid #fca5a5' }} />
            Self-declared unavailable
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ display:'inline-block', width:10, height:10, borderRadius:3, background: isDarkMode ? 'rgba(245,158,11,0.3)' : '#fef3c7', border:'1px solid #fde68a' }} />
            Confirmed interview
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ display:'inline-block', width:10, height:10, borderRadius:3, background:'#6366f1', border:'1px solid #6366f1' }} />
            Today
          </span>
        </div>
      </Modal>
    );
  };

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, color: heading }}>
            Assign Developer Interview
          </Title>
          <Paragraph style={{ color: sub, marginBottom: 0, marginTop: 4 }}>
            Select a company and assign or request the most suitable developer for the interview.
          </Paragraph>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-start">
          <Button
            icon={<AppstoreOutlined />}
            size="large"
            onClick={() => {
              setComparisonWeekStart(dayjs().startOf('week'));
              setComparisonOpen(true);
            }}
            className="flex items-center gap-2 font-medium"
            style={{ borderRadius: 12, borderColor: '#6366f1', color: '#6366f1' }}
          >
            Compare Developers
          </Button>
          <Button
            icon={<ClockCircleOutlined />}
            size="large"
            onClick={() => setRequestsDrawerOpen(true)}
            className="flex items-center gap-2 font-medium"
            style={{ borderRadius: 12 }}
          >
            Interview Requests
            {pendingRequestsCount > 0 ? (
              <Badge count={pendingRequestsCount} />
            ) : (
              <Tag color="default" className="m-0 text-xs">{scheduleRequests.length}</Tag>
            )}
          </Button>
          <div className="flex items-center gap-2 rounded-2xl px-3 py-2" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
            <Avatar size={36} icon={<UserOutlined />} style={{ background: '#4f46e5' }} />
            <div>
              <div className="text-sm font-semibold" style={{ color: heading }}>{displayName}</div>
              <div className="text-[11px]" style={{ color: sub }}>{role || 'Admin'}</div>
            </div>
          </div>
        </div>
      </div>

      {reassignTarget && (
        <Alert
          type="warning"
          showIcon
          closable
          onClose={() => setReassignTarget(null)}
          message={<span className="font-bold">🔄 Re-assigning Interview Request</span>}
          description={
            <div className="text-xs space-y-1">
              <div>
                Developer <strong>{reassignTarget.CandidateName || reassignTarget.candidate_name}</strong> was unavailable or rejected the request for <strong>{reassignTarget.CompanyName || reassignTarget.company_name}</strong>.
              </div>
              {reassignTarget.RejectionReason && (
                <div className="text-red-600 font-medium">Rejection Reason: <em>"{reassignTarget.RejectionReason}"</em></div>
              )}
              <div className="text-slate-500">Pick another suitable developer below to send a fresh request with 1-click.</div>
            </div>
          }
        />
      )}

      {loadError && (
        <Alert
          type="error"
          showIcon
          message="Unable to load interview data. Please try again."
          action={<Button size="small" onClick={retry}>Retry</Button>}
        />
      )}

      <Card style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18 }} styles={{ body: { padding: 20 } }}>
        <Text strong style={{ color: heading }}>Step 1 — Select Company</Text>
        <div className="mt-3">
          <Select
            showSearch
            allowClear
            size="large"
            className="w-full"
            placeholder="Search or select a company..."
            loading={companiesLoading}
            value={companyName}
            onChange={(v) => {
              setCompanyName(v || null);
              setSelectedDev(null);
              setChartSelectedDevKey(null);
              setModalDev(null);
              setFilter('all');
            }}
            options={(Array.isArray(companyNames) ? companyNames : []).map((n) => ({ value: n, label: n }))}
            filterOption={(input, opt) => (opt?.label || '').toLowerCase().includes(input.toLowerCase())}
            suffixIcon={<SearchOutlined />}
          />
        </div>

        {companyName && (companyIvFetching && !companyInterviews.length ? (
          <Skeleton active className="mt-4" paragraph={{ rows: 2 }} />
        ) : summary ? (
          <div
            className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl p-4"
            style={{ background: isDarkMode ? '#12102e' : '#f6f6fd', border: `1px solid ${cardBorder}` }}
          >
            <Avatar size={56} icon={<BankOutlined />} style={{ background: '#4f46e5' }}>
              {getInitials(summary.name)}
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-bold" style={{ color: heading }}>{summary.name}</div>
              <div className="text-sm" style={{ color: sub }}>
                {summary.primaryStack ? `Primary stack: ${summary.primaryStack}` : 'Industry: —'}
              </div>
            </div>
            <div className="flex gap-6 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide" style={{ color: sub }}>Previous interviews</div>
                <div className="text-xl font-black" style={{ color: '#4f46e5' }}>{summary.interviewCount}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide" style={{ color: sub }}>Last interview</div>
                <div className="font-semibold" style={{ color: heading }}>
                  {summary.lastInterviewDate ? summary.lastInterviewDate.format('D MMM YYYY') : '—'}
                </div>
              </div>
            </div>
          </div>
        ) : null)}
      </Card>

      {!companyName ? (
        <Card style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18 }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Select a company to see recommended developers."
          />
        </Card>
      ) : (
        <>
          {companyAssignedInterviews.length > 0 && (
            <Card
              style={{
                background: isDarkMode ? '#17143a' : '#f5f3ff',
                border: '1.5px solid #818cf8',
                borderRadius: 18,
              }}
              styles={{ body: { padding: 18 } }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <Title level={4} style={{ margin: 0, color: heading, fontSize: 16 }}>
                    Assigned Developers for {companyName} ({companyAssignedInterviews.length})
                  </Title>
                </div>
                <Text style={{ fontSize: 12, color: sub }}>
                  Click &quot;Delete Assignment&quot; to unassign and make the developer available again
                </Text>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {companyAssignedInterviews.map((iv) => {
                  const id = iv.Id ?? iv.id;
                  const devName = iv.IntervieweeName ?? iv.intervieweeName ?? 'Unknown';
                  const dateStr = iv.InterviewDate ?? iv.interviewDate;
                  const status = iv.Status ?? iv.status ?? 'Scheduled';
                  const stack = iv.Stack ?? iv.stack;
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between p-3 rounded-xl gap-2"
                      style={{
                        background: cardBg,
                        border: `1px solid ${cardBorder}`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar size={40} style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', fontWeight: 800, flexShrink: 0 }}>
                          {getInitials(devName)}
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-bold text-sm truncate" style={{ color: heading }}>
                            {devName}
                          </div>
                          <div className="text-xs flex items-center gap-1.5 mt-0.5" style={{ color: sub }}>
                            <span>{dateStr ? dayjs(dateStr).format('D MMM YYYY') : '—'}</span>
                            <span>•</span>
                            <InterviewStatusBadge status={status} record={iv} />
                          </div>
                          {stack && (
                            <Tag className="mt-1 m-0 text-[10px]" style={{ borderRadius: 999 }}>{stack}</Tag>
                          )}
                        </div>
                      </div>
                      <Popconfirm
                        title="Delete Assignment?"
                        description={`Are you sure you want to remove ${devName}'s scheduled interview with ${companyName}?`}
                        onConfirm={() => handleDeleteAssignment(id, devName)}
                        okText="Yes, Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true, loading: deleting }}
                      >
                        <Button
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          className="flex-shrink-0 font-medium"
                        >
                          Delete
                        </Button>
                      </Popconfirm>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <div>
            <Title level={4} style={{ marginBottom: 4, color: heading }}>Recommended Developers</Title>
            <Space align="start">
              <InfoCircleOutlined style={{ color: '#4f46e5', marginTop: 3 }} />
              <Text style={{ color: sub }}>
                Based on previous interview history, these developers have already interviewed with this company.
              </Text>
            </Space>
          </div>

          {/* Donut / Pie Chart Overview Card for Recommended Developers */}
          {recommended.length > 0 && (
            <Card
              style={{
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                borderRadius: 18,
                boxShadow: isDarkMode ? '0 10px 30px rgba(0,0,0,0.3)' : '0 8px 24px rgba(79,70,229,0.06)',
              }}
              styles={{ body: { padding: 20 } }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <PieChartOutlined style={{ color: '#6366f1', fontSize: 18 }} />
                    <Title level={4} style={{ margin: 0, color: heading, fontSize: 16 }}>
                      Recommended Developers ({recommended.length})
                    </Title>
                  </div>
                  <Text style={{ fontSize: 12, color: sub }}>
                    Click any slice or name badge to open full card details
                  </Text>
                </div>
                {activeChartDev && (
                  <Tag color="purple" style={{ borderRadius: 999, padding: '3px 12px', fontSize: 12 }}>
                    Selected: <strong>{activeChartDev.name}</strong>
                  </Tag>
                )}
              </div>

              <Row gutter={[24, 24]} align="middle">
                {/* Left Column: Donut Chart & Legend Badges */}
                <Col xs={24} lg={12} xl={10}>
                  <div className="relative flex flex-col items-center justify-center">
                    <div style={{ width: '100%', height: 260 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={95}
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="name"
                            onClick={handleSliceClick}
                            cursor="pointer"
                          >
                            {chartData.map((entry) => (
                              <Cell
                                key={entry.key}
                                fill={entry.color}
                                stroke={chartSelectedDevKey === entry.key ? (isDarkMode ? '#ffffff' : '#1e1b4b') : (isDarkMode ? '#1e1942' : '#ffffff')}
                                strokeWidth={chartSelectedDevKey === entry.key ? 3 : 1.5}
                                style={{ outline: 'none', transition: 'all 0.2s ease' }}
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip content={<CustomChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Donut Center Counter */}
                    <div
                      className="absolute pointer-events-none flex flex-col items-center justify-center text-center"
                      style={{ top: 'calc(50% - 24px)' }}
                    >
                      <span className="text-2xl font-black leading-none" style={{ color: heading }}>
                        {recommended.length}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider mt-1" style={{ color: sub }}>
                        Recommended
                      </span>
                    </div>
                  </div>

                  {/* Interactive Legend Badges */}
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                    {chartData.map((item) => {
                      const isSelected = (chartSelectedDevKey || recommended[0]?.key) === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setChartSelectedDevKey(item.key);
                            const aug = getAugmentedDev(item.dev);
                            setModalDev(aug);
                            const el = document.getElementById(`dev-card-${item.key}`);
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                          }}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer"
                          style={{
                            background: isSelected
                              ? (isDarkMode ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.12)')
                              : (isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9'),
                            border: isSelected ? '1.5px solid #6366f1' : `1px solid ${cardBorder}`,
                            color: isSelected ? '#6366f1' : heading,
                            transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                          }}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: item.color }}
                          />
                          <span className="truncate max-w-[130px]">{item.name}</span>
                          <span className="text-[10px] opacity-75 font-normal">
                            ({item.count} iv)
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Col>

                {/* Right Column: Active Developer Information Card */}
                <Col xs={24} lg={12} xl={14}>
                  {activeChartDev && (() => {
                    const augDev = getAugmentedDev(activeChartDev);
                    const assignedDate = augDev.assignedInterview?.InterviewDate ?? augDev.assignedInterview?.interviewDate;
                    return (
                      <div
                        className="p-4 rounded-2xl flex flex-col justify-between h-full"
                        style={{
                          background: isDarkMode ? 'rgba(99,102,241,0.06)' : '#f8faff',
                          border: `1px solid ${isDarkMode ? '#3730a3' : '#c7d2fe'}`,
                        }}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <Avatar
                                size={52}
                                style={{
                                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                  fontWeight: 800,
                                }}
                              >
                                {getInitials(augDev.name)}
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-base" style={{ color: heading }}>
                                    {augDev.name}
                                  </span>
                                  {augDev.experienceYears && (
                                    <Tag color="cyan" className="m-0 font-semibold text-[11px]" style={{ borderRadius: 6 }}>
                                      💼 {augDev.experienceYears}
                                    </Tag>
                                  )}
                                  {augDev.alreadyAssigned ? (
                                    <Tag color="orange" className="m-0 font-medium text-[11px]">Assigned</Tag>
                                  ) : (
                                    <Tag color={augDev.available ? 'success' : 'default'} className="m-0 text-[11px]">
                                      {augDev.available ? 'Available' : 'Unavailable'}
                                    </Tag>
                                  )}
                                  {selectedSkills.length > 0 && (
                                    <Tag
                                      color={augDev.matchPercent === 100 ? 'green' : augDev.matchPercent > 0 ? 'geekblue' : 'default'}
                                      className="m-0 font-bold text-[11px]"
                                      style={{ borderRadius: 6 }}
                                    >
                                      {augDev.matchPercent === 100
                                        ? '🎯 100% JD Match'
                                        : `⚡ ${augDev.matchingSkillsCount}/${selectedSkills.length} JD Match`}
                                    </Tag>
                                  )}
                                </div>
                                {augDev.email && (
                                  <div className="text-xs" style={{ color: sub }}>
                                    {augDev.email}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              icon={<EyeOutlined />}
                              size="small"
                              onClick={() => setModalDev(augDev)}
                              style={{ borderRadius: 8 }}
                            >
                              Full Card
                            </Button>
                          </div>

                          {/* Tech Stacks */}
                          <div className="flex flex-wrap gap-1 mb-3">
                            {(augDev.stacks || []).length > 0 ? (
                              augDev.stacks.map((s) => (
                                <Tag key={s} className="m-0 text-xs" style={{ borderRadius: 999 }}>{s}</Tag>
                              ))
                            ) : (
                              <Text type="secondary" className="text-xs">No stack specified</Text>
                            )}
                          </div>

                          {/* Metrics Grid */}
                          <div
                            className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl mb-3"
                            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                          >
                            <div>
                              <div className="text-[11px]" style={{ color: sub }}>Interviews with {companyName}</div>
                              <div className="text-base font-black text-indigo-500">
                                {augDev.previousWithCompany || 0}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px]" style={{ color: sub }}>Profile / Owner</div>
                              <div className="text-xs font-semibold truncate" style={{ color: isDarkMode ? '#7dd3fc' : '#0369a1' }}>
                                {augDev.lastInterviewFor || '—'}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px]" style={{ color: sub }}>Last Result</div>
                              <div className="text-xs font-semibold mt-0.5">
                                {augDev.lastStatus ? (
                                  <InterviewStatusBadge status={augDev.lastStatus} record={augDev.lastStatus} />
                                ) : '—'}
                              </div>
                            </div>
                          </div>

                          {augDev.lastDate && (
                            <div className="text-xs flex items-center gap-1.5 mb-2" style={{ color: sub }}>
                              <CalendarOutlined style={{ color: '#6366f1' }} />
                              <span>Last Interview: <strong>{augDev.lastDate.format('D MMM YYYY')}</strong></span>
                            </div>
                          )}

                          {augDev.alreadyAssigned && assignedDate && (
                            <div className="font-semibold text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-2">
                              <CalendarOutlined /> Scheduled: {dayjs(assignedDate).format('D MMM YYYY')}
                            </div>
                          )}
                        </div>

                        {/* Card Action Buttons */}
                        <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: cardBorder }}>
                          <Button
                            type="primary"
                            className="flex-1 font-semibold"
                            disabled={!augDev.available}
                            onClick={() => selectDeveloper(augDev)}
                            style={{ background: '#4f46e5', borderColor: '#4f46e5' }}
                          >
                            {!augDev.available ? 'Busy Elsewhere' : selectedDev?.key === augDev.key ? 'Selected' : `Select ${augDev.name}`}
                          </Button>
                          <Button
                            icon={<EyeOutlined />}
                            onClick={() => setModalDev(augDev)}
                          >
                            View Full Card
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </Col>
              </Row>
            </Card>
          )}

          {loadingList && !recommended.length ? (
            <Row gutter={[14, 14]}>
              {[1, 2, 3].map((i) => (
                <Col xs={24} md={12} xl={8} key={i}><Card><Skeleton active avatar paragraph={{ rows: 4 }} /></Card></Col>
              ))}
            </Row>
          ) : recommended.length === 0 ? (
            <Alert
              type="info"
              showIcon
              message="No developer has previously interviewed with this company."
              description="Choose from All Developers below."
            />
          ) : (
            <Row gutter={[14, 14]}>
              {recommended.map((dev) => {
                const augDev = getAugmentedDev(dev);
                return (
                  <Col xs={24} md={12} xl={8} key={dev.key}>
                    <DeveloperCard
                      recommendedCard
                      dev={augDev}
                    />
                  </Col>
                );
              })}
            </Row>
          )}

          <Card style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18 }} styles={{ body: { padding: 20 } }}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
              <div>
                <Title level={4} style={{ margin: 0, color: heading }}>All Developers</Title>
                <Text style={{ color: sub }}>Search by name, skill, or email</Text>
              </div>
              <Input
                allowClear
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                placeholder="Search developer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ maxWidth: 320 }}
              />
            </div>

            {/* ─── JD Required Modules / Skills Filter Section ─── */}
            <div
              className="p-4 rounded-xl mb-4 transition-all"
              style={{
                background: isDarkMode ? '#1e1b4b' : '#f5f3ff',
                border: selectedSkills.length > 0 ? '1.5px solid #6366f1' : `1px solid ${isDarkMode ? '#312e81' : '#e0e7ff'}`,
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold flex items-center gap-1.5" style={{ color: isDarkMode ? '#e0e7ff' : '#4338ca' }}>
                    🎯 Filter by JD Required Modules / Skills:
                  </span>
                  {selectedSkills.length > 0 ? (
                    <Tag color="indigo" className="font-bold">
                      {selectedSkills.length} Required Skill{selectedSkills.length > 1 ? 's' : ''} Active
                    </Tag>
                  ) : (
                    <span className="text-xs text-slate-400">(Click pills or select from JD)</span>
                  )}
                </div>
                {selectedSkills.length > 0 && (
                  <Button
                    size="small"
                    type="link"
                    onClick={() => setSelectedSkills([])}
                    className="p-0 text-xs font-semibold text-rose-500 hover:text-rose-600"
                  >
                    ✕ Clear Skill Filters
                  </Button>
                )}
              </div>

              {/* Quick-click skill pills from JD */}
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                <span className="text-xs text-slate-500 font-medium mr-1">Quick Select:</span>
                {['React', 'Node.js', '.NET', 'Python', 'Angular', 'Java', 'SQL', 'AWS', 'Vue', 'React Native', 'TypeScript'].map((skill) => {
                  const isSelected = selectedSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedSkills(selectedSkills.filter((s) => s !== skill));
                        } else {
                          setSelectedSkills([...selectedSkills, skill]);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105'
                          : isDarkMode
                          ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-indigo-400'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400'
                      }`}
                    >
                      {isSelected ? `✓ ${skill}` : `+ ${skill}`}
                    </button>
                  );
                })}
              </div>

              {/* Multi-select dropdown */}
              <Select
                mode="multiple"
                allowClear
                className="w-full"
                placeholder="Search or pick all required skills from JD (e.g. React, .NET, AWS, Python, Angular...)"
                value={selectedSkills}
                onChange={setSelectedSkills}
                options={availableSkills.map((s) => ({ value: s, label: s }))}
              />

              {selectedSkills.length > 0 && (
                <div className="mt-2 text-xs font-semibold" style={{ color: isDarkMode ? '#a5b4fc' : '#4f46e5' }}>
                  ⚡ Showing developers ranked by JD skill match percentage ({allDevelopers.length} developers match).
                </div>
              )}
            </div>
            <Radio.Group
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              className="mb-4 flex flex-wrap"
            >
              <Radio.Button value="all">All Developers</Radio.Button>
              {companyAssignedInterviews.length > 0 && (
                <Radio.Button value="assigned">Assigned ({companyAssignedInterviews.length})</Radio.Button>
              )}
              <Radio.Button value="previous">Previously Interviewed</Radio.Button>
              <Radio.Button value="never">Never Interviewed</Radio.Button>
              <Radio.Button value="available">Available</Radio.Button>
              <Radio.Button value="unavailable">Unavailable</Radio.Button>
            </Radio.Group>

            {allDevelopers.length === 0 ? (
              <Empty description="No developers match these filters." />
            ) : (
              <Row gutter={[14, 14]}>
                {allDevelopers.map((dev) => (
                  <Col xs={24} md={12} xl={8} key={dev.key}>
                    <DeveloperCard
                      dev={{
                        ...dev,
                        previousWithCompany: recommendedKeys.has(dev.key) ? (dev.previousWithCompany || 0) : 0,
                      }}
                    />
                  </Col>
                ))}
              </Row>
            )}
          </Card>
        </>
      )}

      {/* Developer Assignment Modal / Popup */}
      <Modal
        open={Boolean(selectedDev && companyName)}
        onCancel={() => setSelectedDev(null)}
        width={Math.min(760, window.innerWidth - 24)}
        destroyOnClose
        centered
        title={
          <div className="flex items-center justify-between pr-6 py-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">💼</span>
              <span className="text-lg font-bold" style={{ color: heading }}>Interview Assignment Details</span>
            </div>
            {companyName && (
              <Tag color="#4f46e5" className="m-0 font-bold px-3 py-1 text-xs">
                Company: {companyName}
              </Tag>
            )}
          </div>
        }
        footer={null}
        styles={{
          content: {
            background: cardBg,
            borderRadius: 20,
            border: `1px solid ${cardBorder}`,
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          },
          header: {
            background: 'transparent',
            borderBottom: `1px solid ${cardBorder}`,
            paddingBottom: 12,
            marginBottom: 16,
          },
        }}
      >
        {selectedDev && (
          <div>
            <div
              className="flex items-center gap-3 mb-4 p-3.5 rounded-xl"
              style={{
                background: isDarkMode ? '#1e1b4b' : '#f5f3ff',
                border: `1px solid ${isDarkMode ? '#312e81' : '#e0e7ff'}`,
              }}
            >
              <Avatar size={54} style={{ background: '#4f46e5', fontWeight: 700, fontSize: 18 }}>
                {getInitials(selectedDev.name)}
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold truncate" style={{ color: heading }}>
                  {selectedDev.name}
                </div>
                <div className="text-xs" style={{ color: sub }}>
                  {(selectedDev.stacks || [])[0] || 'Developer'} · {selectedDev.email || 'No email on file'}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(selectedDev.stacks || []).map((s) => (
                    <Tag key={s} className="m-0 text-[11px]">{s}</Tag>
                  ))}
                </div>
              </div>
            </div>

            {/* Workflow Mode Selector */}
            <div
              className="mb-4 p-3.5 rounded-xl border"
              style={{ borderColor: cardBorder, background: isDarkMode ? 'rgba(255,255,255,0.02)' : '#fafafa' }}
            >
              <Text strong style={{ color: heading, display: 'block', marginBottom: 6 }}>Workflow Mode</Text>
              <Radio.Group value={assignmentMode} onChange={(e) => setAssignmentMode(e.target.value)} buttonStyle="solid">
                <Radio.Button value="request">
                  <Space><SendOutlined /> <span>Send Request (Accept / Reject Flow)</span></Space>
                </Radio.Button>
                <Radio.Button value="direct">
                  <Space><CheckCircleOutlined /> <span>Direct Schedule (Confirm Immediately)</span></Space>
                </Radio.Button>
              </Radio.Group>
              <div className="text-xs mt-2" style={{ color: sub }}>
                {assignmentMode === 'request'
                  ? '📨 Developer will receive an email & in-app notification to Accept or Reject this interview request before it is confirmed.'
                  : '⚡ Interview will be directly booked into the database and calendar without developer approval step.'}
              </div>
            </div>

            {/* Date, Time Slot, and Time Zone Grid */}
            <Row gutter={[16, 16]} className="mb-4">
              <Col xs={24} sm={8}>
                <Text strong style={{ color: heading, fontSize: 12 }}>Interview Date</Text>
                <DatePicker className="w-full mt-1" value={interviewDate} onChange={setInterviewDate} format="DD MMM YYYY" />
              </Col>
              <Col xs={24} sm={8}>
                <Text strong style={{ color: heading, fontSize: 12 }}>Time Slot</Text>
                <Select
                  className="w-full mt-1"
                  value={timeSlot}
                  onChange={setTimeSlot}
                  options={[
                    { value: '09:00 AM - 10:00 AM', label: '09:00 AM - 10:00 AM' },
                    { value: '10:00 AM - 11:00 AM', label: '10:00 AM - 11:00 AM' },
                    { value: '11:00 AM - 12:00 PM', label: '11:00 AM - 12:00 PM' },
                    { value: '02:00 PM - 03:00 PM', label: '02:00 PM - 03:00 PM' },
                    { value: '03:00 PM - 04:00 PM', label: '03:00 PM - 04:00 PM' },
                    { value: '04:00 PM - 05:00 PM', label: '04:00 PM - 05:00 PM' },
                    { value: '05:00 PM - 06:00 PM', label: '05:00 PM - 06:00 PM' },
                    { value: '06:00 PM - 07:00 PM', label: '06:00 PM - 07:00 PM' },
                    { value: '08:00 PM - 09:00 PM', label: '08:00 PM - 09:00 PM' },
                    { value: '10:00 PM - 11:00 PM', label: '10:00 PM - 11:00 PM' },
                  ]}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Text strong style={{ color: heading, fontSize: 12 }}><GlobalOutlined /> Time Zone</Text>
                <Select
                  className="w-full mt-1"
                  value={timeZone}
                  onChange={setTimeZone}
                  options={[
                    { value: 'PKT (UTC+5)', label: '🇵🇰 PKT (UTC+5) - Pakistan' },
                    { value: 'EST (UTC-5)', label: '🇺🇸 EST (UTC-5) - US Eastern' },
                    { value: 'CST (UTC-6)', label: '🇺🇸 CST (UTC-6) - US Central' },
                    { value: 'PST (UTC-8)', label: '🇺🇸 PST (UTC-8) - US Pacific' },
                    { value: 'GMT / UTC', label: '🌐 GMT / UTC' },
                    { value: 'BST (UTC+1)', label: '🇬🇧 BST (UTC+1) - UK' },
                    { value: 'IST (UTC+5:30)', label: '🇮🇳 IST (UTC+5:30) - India' },
                  ]}
                />
              </Col>
            </Row>

            {/* Round & Meeting Link */}
            <Row gutter={[16, 16]} className="mb-4">
              <Col xs={24} sm={12}>
                <Text strong style={{ color: heading, fontSize: 12 }}>Interview Round</Text>
                <Select
                  className="w-full mt-1"
                  value={interviewType}
                  onChange={setInterviewType}
                  options={[
                    { value: 'Screening Call', label: 'Screening Call' },
                    { value: 'Assessment Round', label: 'Assessment Round' },
                    { value: '1st Round', label: '1st Round' },
                    { value: '2nd Round', label: '2nd Round' },
                    { value: '3rd Round', label: '3rd Round' },
                    { value: 'Technical Round', label: 'Technical Round' },
                    { value: 'Client Round', label: 'Client Round' },
                    { value: 'HR Round', label: 'HR Round' },
                    { value: 'Final Round', label: 'Final Round' },
                  ]}
                />
              </Col>
              <Col xs={24} sm={12}>
                <Text strong style={{ color: heading, fontSize: 12 }}>Meeting Link (Optional)</Text>
                <Input
                  className="w-full mt-1"
                  placeholder="https://zoom.us/j/... or Google Meet"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                />
              </Col>
            </Row>

            <div className="mb-5">
              <Text strong style={{ color: heading, fontSize: 12 }}>Notes / Instructions for Developer</Text>
              <Input.TextArea
                className="mt-1"
                rows={3}
                placeholder="e.g. Focus on React and microservices architecture..."
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: cardBorder }}>
              <Button size="large" onClick={() => setSelectedDev(null)}>
                Cancel
              </Button>
              <Button
                type="primary"
                size="large"
                icon={assignmentMode === 'request' ? <SendOutlined /> : <CheckCircleOutlined />}
                disabled={selectedDev.alreadyAssigned}
                loading={assigning || sendingRequest}
                onClick={() => setConfirmOpen(true)}
                style={{ background: '#4f46e5', borderColor: '#4f46e5', minWidth: 220, fontWeight: 700 }}
              >
                {assignmentMode === 'request'
                  ? `Send Request to ${selectedDev.name}`
                  : `Direct Schedule Interview`}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        title={assignmentMode === 'request' ? '📨 Send Interview Request to Developer?' : '⚡ Confirm Interview Assignment?'}
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        okText={assignmentMode === 'request' ? 'Send Request' : 'Confirm Assignment'}
        cancelText="Cancel"
        onOk={handleAssign}
        confirmLoading={assigning || sendingRequest}
        okButtonProps={{ style: { background: '#4f46e5', borderColor: '#4f46e5' } }}
      >
        <Paragraph>
          {assignmentMode === 'request'
            ? `You are about to dispatch an interview request to ${selectedDev?.name} for ${companyName}.`
            : `You are about to directly assign ${selectedDev?.name} to an interview with ${companyName}.`}
        </Paragraph>
        <div className="space-y-2 text-sm p-3 rounded-xl" style={{ background: isDarkMode ? '#1e1b4b' : '#f8fafc', border: `1px solid ${cardBorder}` }}>
          <div><Text type="secondary">Company:</Text> <strong>{companyName}</strong></div>
          <div><Text type="secondary">Developer:</Text> <strong>{selectedDev?.name}</strong></div>
          <div><Text type="secondary">Date & Slot:</Text> <strong>{interviewDate ? interviewDate.format('D MMM YYYY') : '—'} ({timeSlot})</strong></div>
          <div><Text type="secondary">Time Zone:</Text> <Tag color="blue">{timeZone}</Tag></div>
          <div><Text type="secondary">Interview Round:</Text> <Tag color="purple">{interviewType}</Tag></div>
          {meetingLink && <div><Text type="secondary">Meeting Link:</Text> <span className="text-xs text-blue-500">{meetingLink}</span></div>}
        </div>

        {/* Warning if developer declared unavailability on selected date */}
        {(() => {
          if (!selectedDev || !interviewDate) return null;
          const declaredUnavail = getDevDeclaredUnavail(selectedDev.name, interviewDate);
          if (!declaredUnavail) return null;
          const reason = declaredUnavail.ReasonType ?? declaredUnavail.reason_type ?? 'Unavailable';
          const notes = declaredUnavail.Notes ?? declaredUnavail.notes ?? '';
          return (
            <Alert
              type="warning"
              showIcon
              className="mt-4"
              style={{ borderRadius: 12 }}
              message={
                <span className="font-bold">
                  ⚠️ Developer Self-Declared Unavailable
                </span>
              }
              description={
                <div className="text-sm">
                  <strong>{selectedDev.name}</strong> has marked <strong>{interviewDate.format('D MMM YYYY')}</strong> as <strong>{reason}</strong>.
                  {notes && <div className="mt-1 italic">"{notes}"</div>}
                  <div className="mt-1 text-amber-700">Developer will have the option to Accept or Reject based on their current schedule.</div>
                </div>
              }
            />
          );
        })()}

        {/* Info if developer declared free slots on selected date */}
        {(() => {
          if (!selectedDev || !interviewDate) return null;
          const freeSlots = getDevDeclaredFreeSlots(selectedDev.name, interviewDate);
          if (freeSlots.length === 0) return null;
          return (
            <Alert
              type="success"
              showIcon
              className="mt-4"
              style={{ borderRadius: 12 }}
              message={
                <span className="font-bold">
                  🟢 Developer Declared Free Time Slots
                </span>
              }
              description={
                <div className="text-sm">
                  <div><strong>{selectedDev.name}</strong> declared available slots on <strong>{interviewDate.format('D MMM YYYY')}</strong>:</div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {freeSlots.map((s, idx) => (
                      <Tag key={idx} color="green" className="text-xs font-semibold py-0.5 px-2">
                        {s.StartTime ?? s.startTime ? `${s.StartTime ?? s.startTime} – ${s.EndTime ?? s.endTime}` : 'All Day'}
                        {(s.TimeZone ?? s.timeZone) ? ` [${s.TimeZone ?? s.timeZone}]` : ''}
                      </Tag>
                    ))}
                  </div>
                  {freeSlots.some((s) => s.Notes || s.notes) && (
                    <div className="mt-1.5 text-xs italic text-emerald-800 dark:text-emerald-300">
                      Note: {freeSlots.map((s) => s.Notes || s.notes).filter(Boolean).join('; ')}
                    </div>
                  )}
                </div>
              }
            />
          );
        })()}
      </Modal>

      {/* Active Requests Drawer */}
      <Drawer
        title={<span className="font-bold flex items-center gap-2"><ClockCircleOutlined style={{ color: '#4f46e5' }} /> Interview Requests Lifecycle</span>}
        open={requestsDrawerOpen}
        onClose={() => setRequestsDrawerOpen(false)}
        width={Math.min(760, window.innerWidth * 0.95)}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Text type="secondary" className="text-xs">
              Manage all requests sent to developers and their responses (Accept / Reject).
            </Text>
            <Button size="small" onClick={() => refetchRequests()} loading={requestsLoading}>
              Refresh
            </Button>
          </div>

          {scheduleRequests.length === 0 ? (
            <Empty description="No interview requests sent yet." />
          ) : (
            <div className="space-y-3">
              {scheduleRequests.map((req) => {
                const status = req.Status || req.status || 'Pending';
                const isPending = status.toLowerCase() === 'pending';
                const isAccepted = status.toLowerCase() === 'accepted';
                const isRejected = status.toLowerCase() === 'rejected';
                const isRescheduled = status.toLowerCase() === 'rescheduled';

                return (
                  <div
                    key={req.Id || req.id}
                    className="p-4 rounded-xl border transition-all"
                    style={{
                      background: cardBg,
                      borderColor: isRejected ? '#fca5a5' : isAccepted ? '#86efac' : isRescheduled ? '#67e8f9' : isPending ? '#fde047' : cardBorder,
                    }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar size={34} style={{ background: '#4f46e5' }}>
                          {getInitials(req.CandidateName || req.candidate_name)}
                        </Avatar>
                        <div>
                          <div className="font-bold text-sm" style={{ color: heading }}>
                            {req.CandidateName || req.candidate_name}
                          </div>
                          <div className="text-xs" style={{ color: sub }}>
                            Company: <strong>{req.CompanyName || req.company_name}</strong>
                          </div>
                        </div>
                      </div>
                      <div>
                        {isPending && <Tag color="gold" icon={<ClockCircleOutlined />}>Pending Response</Tag>}
                        {isAccepted && <Tag color="green" icon={<CheckCircleOutlined />}>Accepted & Scheduled</Tag>}
                        {isRescheduled && <Tag color="cyan" icon={<CalendarOutlined />}>Rescheduled</Tag>}
                        {isRejected && <Tag color="red" icon={<CloseCircleOutlined />}>Rejected</Tag>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs py-2 my-1 border-t border-b" style={{ borderColor: cardBorder }}>
                      <div>
                        <span style={{ color: sub }}>Date:</span>{' '}
                        <strong>{dayjs(req.RequestedDate || req.requested_date).format('D MMM YYYY')}</strong>
                      </div>
                      <div>
                        <span style={{ color: sub }}>Time Slot:</span>{' '}
                        <strong>{req.TimeSlot || req.time_slot || 'TBD'}</strong>
                      </div>
                      <div>
                        <span style={{ color: sub }}>Time Zone:</span>{' '}
                        <Tag color="blue" className="m-0 text-[10px]">{req.TimeZone || req.timezone || 'PKT'}</Tag>
                      </div>
                      <div>
                        <span style={{ color: sub }}>Round:</span>{' '}
                        <strong>{req.InterviewType || req.interview_type || '1st Round'}</strong>
                      </div>
                      <div>
                        <span style={{ color: sub }}>Requested By:</span>{' '}
                        <span>{req.RequestedBy || req.requested_by || 'Admin'}</span>
                      </div>
                      <div>
                        <span style={{ color: sub }}>Sent:</span>{' '}
                        <span>{req.CreatedAt || req.created_at ? dayjs(req.CreatedAt || req.created_at).format('MMM D, h:mm A') : '—'}</span>
                      </div>
                    </div>

                    {req.Notes && (
                      <div className="text-xs mt-1" style={{ color: sub }}>
                        <strong>Notes:</strong> {req.Notes}
                      </div>
                    )}

                    {isRejected && (
                      <div className="mt-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900">
                        <div className="text-xs font-bold text-red-600 dark:text-red-400">
                          ❌ Rejection Reason: {req.RejectionReason || req.rejection_reason || 'Developer indicated unavailability.'}
                        </div>
                        <div className="mt-2">
                          <Button
                            type="primary"
                            size="small"
                            icon={<SwapOutlined />}
                            onClick={() => handleReassign(req)}
                            style={{ background: '#4f46e5', borderColor: '#4f46e5' }}
                          >
                            Reassign to another Developer
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Quick test buttons for Admin/Developer preview */}
                    {isPending && (
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t" style={{ borderColor: cardBorder }}>
                        <span className="text-xs text-slate-400">Respond:</span>
                        <Button
                          size="small"
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          loading={respondingRequest}
                          onClick={() => handleQuickRespond(req.Id || req.id, 'accept')}
                          style={{ background: '#10b981', borderColor: '#10b981' }}
                        >
                          Accept
                        </Button>
                        <Button
                          size="small"
                          danger
                          icon={<CloseCircleOutlined />}
                          loading={respondingRequest}
                          onClick={() => handleQuickRespond(req.Id || req.id, 'reject', 'Unavailable at this time slot')}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    {/* Action buttons for Accepted / Rescheduled cards */}
                    {(isAccepted || isRescheduled) && (
                      <div className="flex items-center justify-between mt-3 pt-2 border-t" style={{ borderColor: cardBorder }}>
                        <span className="text-xs text-slate-400">
                          {isRescheduled ? 'Interview is rescheduled and synced with calendar.' : 'Interview is confirmed and synced with calendar.'}
                        </span>
                        <Button
                          size="small"
                          icon={<CalendarOutlined />}
                          onClick={() => handleOpenReschedule(req)}
                          style={{ borderColor: '#06b6d4', color: '#0891b2', fontWeight: 600 }}
                        >
                          📅 Reschedule
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Drawer>

      {/* Reschedule Interview Modal */}
      <Modal
        title={
          <span className="font-bold flex items-center gap-2" style={{ color: heading }}>
            <CalendarOutlined style={{ color: '#0891b2' }} /> Reschedule Interview Request
          </span>
        }
        open={rescheduleModalOpen}
        onCancel={() => {
          setRescheduleModalOpen(false);
          setRescheduleTarget(null);
        }}
        okText="Confirm Reschedule"
        cancelText="Cancel"
        onOk={handleRescheduleSubmit}
        confirmLoading={reschedulingRequest}
        okButtonProps={{ style: { background: '#0891b2', borderColor: '#0891b2', fontWeight: 700 } }}
      >
        {rescheduleTarget && (
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-xl" style={{ background: isDarkMode ? '#111827' : '#f0fdf4', border: `1px solid ${cardBorder}` }}>
              <div className="text-xs text-slate-500">Candidate / Developer:</div>
              <div className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                {rescheduleTarget.CandidateName || rescheduleTarget.candidate_name}
              </div>
              <div className="text-xs text-slate-500 mt-1">Company:</div>
              <div className="font-bold text-sm" style={{ color: heading }}>
                {rescheduleTarget.CompanyName || rescheduleTarget.company_name}
              </div>
            </div>

            <div>
              <Text strong style={{ color: heading, fontSize: 12 }}>New Interview Date</Text>
              <DatePicker
                className="w-full mt-1"
                value={rescheduleDate}
                onChange={setRescheduleDate}
                format="DD MMM YYYY"
                allowClear={false}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Text strong style={{ color: heading, fontSize: 12 }}>New Time Slot</Text>
                <Select
                  className="w-full mt-1"
                  value={rescheduleTimeSlot}
                  onChange={setRescheduleTimeSlot}
                  options={[
                    { value: '09:00 AM - 10:00 AM', label: '09:00 AM - 10:00 AM' },
                    { value: '10:00 AM - 11:00 AM', label: '10:00 AM - 11:00 AM' },
                    { value: '11:00 AM - 12:00 PM', label: '11:00 AM - 12:00 PM' },
                    { value: '02:00 PM - 03:00 PM', label: '02:00 PM - 03:00 PM' },
                    { value: '03:00 PM - 04:00 PM', label: '03:00 PM - 04:00 PM' },
                    { value: '04:00 PM - 05:00 PM', label: '04:00 PM - 05:00 PM' },
                    { value: '05:00 PM - 06:00 PM', label: '05:00 PM - 06:00 PM' },
                    { value: '06:00 PM - 07:00 PM', label: '06:00 PM - 07:00 PM' },
                    { value: '08:00 PM - 09:00 PM', label: '08:00 PM - 09:00 PM' },
                    { value: '10:00 PM - 11:00 PM', label: '10:00 PM - 11:00 PM' },
                  ]}
                />
              </div>

              <div>
                <Text strong style={{ color: heading, fontSize: 12 }}><GlobalOutlined /> Time Zone</Text>
                <Select
                  className="w-full mt-1"
                  value={rescheduleTimeZone}
                  onChange={setRescheduleTimeZone}
                  options={[
                    { value: 'PKT (UTC+5)', label: '🇵🇰 PKT (UTC+5) - Pakistan' },
                    { value: 'EST (UTC-5)', label: '🇺🇸 EST (UTC-5) - US Eastern' },
                    { value: 'CST (UTC-6)', label: '🇺🇸 CST (UTC-6) - US Central' },
                    { value: 'PST (UTC-8)', label: '🇺🇸 PST (UTC-8) - US Pacific' },
                    { value: 'GMT / UTC', label: '🌐 GMT / UTC' },
                    { value: 'BST (UTC+1)', label: '🇬🇧 BST (UTC+1) - UK' },
                    { value: 'IST (UTC+5:30)', label: '🇮🇳 IST (UTC+5:30) - India' },
                  ]}
                />
              </div>
            </div>

            <div>
              <Text strong style={{ color: heading, fontSize: 12 }}>Reschedule Reason / Notes (Sent to Developer)</Text>
              <Input.TextArea
                rows={2}
                className="mt-1"
                placeholder="e.g. Client requested a 1-day postponement due to scheduling conflict..."
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
              />
            </div>

            {/* Check if candidate declared availability or unavailability on new date */}
            {(() => {
              if (!rescheduleTarget || !rescheduleDate) return null;
              const candName = rescheduleTarget.CandidateName || rescheduleTarget.candidate_name;
              const unavail = getDevDeclaredUnavail(candName, rescheduleDate);
              if (unavail) {
                return (
                  <Alert
                    type="warning"
                    showIcon
                    message="⚠️ Developer Marked Unavailable on this Date"
                    description={`${candName} declared: ${unavail.ReasonType || unavail.reason_type || 'Unavailable'}. They will receive an email update.`}
                  />
                );
              }
              const freeSlots = getDevDeclaredFreeSlots(candName, rescheduleDate);
              if (freeSlots.length > 0) {
                return (
                  <Alert
                    type="success"
                    showIcon
                    message="🟢 Developer Free Slots on this Date"
                    description={freeSlots.map((s, idx) => (
                      <Tag key={idx} color="green" className="mt-1">
                        {s.StartTime || s.startTime} - {s.EndTime || s.endTime}
                      </Tag>
                    ))}
                  />
                );
              }
              return null;
            })()}
          </div>
        )}
      </Modal>

      {/* Full Developer Information Modal */}
      <Modal
        title={
          modalDev ? (
            <div className="flex items-center gap-3">
              <Avatar
                size={38}
                style={{
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  fontWeight: 800,
                }}
              >
                {getInitials(modalDev.name)}
              </Avatar>
              <div>
                <div className="font-bold text-base leading-tight" style={{ color: heading }}>
                  {modalDev.name}
                </div>
                <div className="text-xs font-normal" style={{ color: sub }}>
                  Recommended Developer Profile & Interview Details
                </div>
              </div>
            </div>
          ) : 'Developer Details'
        }
        open={!!modalDev}
        onCancel={() => setModalDev(null)}
        footer={[
          <Button key="close" onClick={() => setModalDev(null)}>
            Close
          </Button>,
          modalDev && (
            <Button
              key="assign"
              type="primary"
              disabled={!modalDev.available}
              onClick={() => {
                selectDeveloper(modalDev);
                setModalDev(null);
                message.success(`${modalDev.name} selected for assignment`);
                const el = document.getElementById('assign-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{ background: '#4f46e5', borderColor: '#4f46e5' }}
            >
              {!modalDev.available ? 'Busy elsewhere' : 'Select Developer for Assignment'}
            </Button>
          ),
        ]}
        width={Math.min(650, window.innerWidth - 24)}
      >
        {modalDev && (
          <div className="space-y-4 pt-2">
            {/* Top overview row */}
            <div
              className="p-4 rounded-xl flex items-center justify-between gap-3"
              style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
            >
              <div>
                <div className="text-base font-bold" style={{ color: heading }}>{modalDev.name}</div>
                {modalDev.email && <div className="text-xs" style={{ color: sub }}>{modalDev.email}</div>}
                <div className="flex flex-wrap gap-1 mt-2">
                  {(modalDev.stacks || []).length > 0 ? (
                    modalDev.stacks.map((s) => (
                      <Tag key={s} className="m-0 text-xs" style={{ borderRadius: 999 }}>{s}</Tag>
                    ))
                  ) : (
                    <Text type="secondary" className="text-xs">No stack specified</Text>
                  )}
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                {modalDev.experienceYears && (
                  <Tag color="cyan" className="font-semibold text-xs px-2 py-0.5 m-0">
                    💼 {modalDev.experienceYears}
                  </Tag>
                )}
                {modalDev.alreadyAssigned ? (
                  <Tag color="orange" className="font-medium text-xs px-2.5 py-1 m-0">Already Assigned</Tag>
                ) : (
                  <Tag color={modalDev.available ? 'success' : 'default'} className="font-medium text-xs px-2.5 py-1 m-0">
                    {modalDev.available ? 'Available' : 'Unavailable'}
                  </Tag>
                )}
                {modalDev.previousWithCompany > 0 && (
                  <Tag color="purple" className="m-0 text-[10px]">Previously Interviewed</Tag>
                )}
              </div>
            </div>

            {/* Profile Owner & Company Banner */}
            <div
              className="p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              style={{
                background: isDarkMode ? 'rgba(14,165,233,0.1)' : '#f0f9ff',
                border: isDarkMode ? '1px solid rgba(14,165,233,0.2)' : '1px solid #bae6fd',
              }}
            >
              <div className="flex items-center gap-2">
                <InfoCircleOutlined style={{ color: '#0284c7' }} />
                <span className="text-xs" style={{ color: sub }}>Candidate Profile / Owner:</span>
                <strong style={{ color: isDarkMode ? '#7dd3fc' : '#0369a1' }}>
                  {modalDev.lastInterviewFor || 'Not specified'}
                </strong>
              </div>
              <div className="text-xs font-semibold" style={{ color: heading }}>
                Company: <span className="text-indigo-500">{companyName}</span>
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 rounded-xl text-center" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                <div className="text-[11px]" style={{ color: sub }}>Interviews Here</div>
                <div className="text-lg font-black text-indigo-500">
                  {modalDev.previousWithCompany ?? modalDev.count ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                <div className="text-[11px]" style={{ color: sub }}>Total Interviews</div>
                <div className="text-lg font-black" style={{ color: heading }}>
                  {modalDev.interviewCountTotal ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                <div className="text-[11px]" style={{ color: sub }}>Last Date</div>
                <div className="text-xs font-bold mt-1" style={{ color: heading }}>
                  {modalDev.lastDate ? modalDev.lastDate.format('D MMM YYYY') : '—'}
                </div>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                <div className="text-[11px]" style={{ color: sub }}>Last Result</div>
                <div className="mt-1">
                  {modalDev.lastStatus ? (
                    <InterviewStatusBadge status={modalDev.lastStatus} record={modalDev.lastStatus} />
                  ) : '—'}
                </div>
              </div>
            </div>

            {/* Self-Declared Unavailability Notice if any */}
            {(() => {
              const selectedDate = interviewDate || dayjs();
              const declaredUnavail = getDevDeclaredUnavail(modalDev.name, selectedDate);
              if (!declaredUnavail) return null;
              const reason = declaredUnavail.ReasonType ?? declaredUnavail.reason_type ?? 'Unavailable';
              const notes = declaredUnavail.Notes ?? declaredUnavail.notes ?? '';
              return (
                <Alert
                  type="warning"
                  showIcon
                  icon={<ExclamationCircleOutlined />}
                  style={{ borderRadius: 10 }}
                  message={<span className="font-bold text-xs">Self-Declared {reason} on {selectedDate.format('D MMM YYYY')}</span>}
                  description={notes ? <span className="text-xs">{notes}</span> : undefined}
                />
              );
            })()}

            {/* Self-Declared Free Slots Notice if any */}
            {(() => {
              const selectedDate = interviewDate || dayjs();
              const freeSlots = getDevDeclaredFreeSlots(modalDev.name, selectedDate);
              if (freeSlots.length === 0) return null;
              return (
                <Alert
                  type="success"
                  showIcon
                  icon={<CheckCircleOutlined />}
                  style={{ borderRadius: 10 }}
                  message={
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-xs">Declared Available Slots on {selectedDate.format('D MMM YYYY')}</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {freeSlots.map((s, idx) => (
                          <Tag key={idx} color="green" className="text-xs font-semibold">
                            {s.StartTime ?? s.startTime ? `${s.StartTime ?? s.startTime} – ${s.EndTime ?? s.endTime}` : 'All Day'}
                            {(s.TimeZone ?? s.timeZone) ? ` [${s.TimeZone ?? s.timeZone}]` : ''}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  }
                  description={
                    freeSlots.some((s) => s.Notes || s.notes) ? (
                      <span className="text-xs italic text-emerald-800 dark:text-emerald-300">
                        Note: {freeSlots.map((s) => s.Notes || s.notes).filter(Boolean).join('; ')}
                      </span>
                    ) : undefined
                  }
                />
              );
            })()}

            {/* Complete Company Interview History */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: sub }}>
                Previous Interview Records with {companyName}
              </div>
              {(modalDev.history || []).length === 0 ? (
                <div className="text-xs p-3 rounded-xl text-center" style={{ background: cardBg, border: `1px solid ${cardBorder}`, color: sub }}>
                  No detailed past interview records found.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {modalDev.history.map((h, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl flex items-center justify-between text-xs"
                      style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                    >
                      <div className="flex items-center gap-2">
                        <CalendarOutlined style={{ color: '#6366f1' }} />
                        <span className="font-medium" style={{ color: heading }}>
                          {h.date ? h.date.format('D MMM YYYY') : '—'}
                        </span>
                        {h.interviewFor && (
                          <Tag className="m-0 text-[10px]" color="cyan">
                            Profile: {h.interviewFor}
                          </Tag>
                        )}
                      </div>
                      <div>
                        {h.status ? (
                          <InterviewStatusBadge status={h.status} record={h.status} />
                        ) : (
                          <Tag>Completed</Tag>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Multi-Developer Comparison Matrix */}
      <ComparisonMatrixModal />
    </div>
  );
};

export default InterviewAssignment;

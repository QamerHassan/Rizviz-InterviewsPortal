import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spin, Typography, Table, Button } from 'antd';
import {
  UserOutlined, RiseOutlined, InboxOutlined, CalendarOutlined, CheckCircleOutlined, TeamOutlined,
  ArrowUpOutlined, ArrowDownOutlined, ArrowRightOutlined, CreditCardOutlined,
  FileTextOutlined, TrophyOutlined, CloseCircleOutlined, InfoCircleOutlined,
  LockOutlined, WarningOutlined
} from '@ant-design/icons';
import { BarChart, Bar, LineChart, Line, Legend, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import InterviewStatusOverview from '../components/interviews/InterviewStatusOverview';
import StatCard from '../components/StatCard';
import {
  useGetHrStatsQuery,
  useGetInterviewStatsQuery,
  useGetInterviewStatusBreakdownQuery,
  useGetInterviewsPagedQuery,
  useGetLeadsQuery,
} from '../store/apiSlice';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';

const { Title, Text } = Typography;

const UsFlag = () => (
  <svg className="w-4.5 h-3 inline-block mr-1 align-middle rounded-sm shadow-sm" viewBox="0 0 19 10" style={{ width: '18px', height: '10px' }}>
    <rect width="19" height="10" fill="#B22234" />
    <path d="M0,0H19V1H0ZM0,2H19V3H0ZM0,4H19V5H0ZM0,6H19V7H0ZM0,8H19V9H0Z" fill="#FFF" />
    <rect width="7.6" height="5.38" fill="#3C3B6E" />
    <circle cx="1" cy="0.8" r="0.12" fill="#FFF" />
    <circle cx="2" cy="0.8" r="0.12" fill="#FFF" />
    <circle cx="3" cy="0.8" r="0.12" fill="#FFF" />
    <circle cx="4" cy="0.8" r="0.12" fill="#FFF" />
    <circle cx="5" cy="0.8" r="0.12" fill="#FFF" />
    <circle cx="6" cy="0.8" r="0.12" fill="#FFF" />
    <circle cx="1.5" cy="1.8" r="0.12" fill="#FFF" />
    <circle cx="2.5" cy="1.8" r="0.12" fill="#FFF" />
    <circle cx="3.5" cy="1.8" r="0.12" fill="#FFF" />
    <circle cx="4.5" cy="1.8" r="0.12" fill="#FFF" />
    <circle cx="5.5" cy="1.8" r="0.12" fill="#FFF" />
    <circle cx="1" cy="2.8" r="0.12" fill="#FFF" />
    <circle cx="2" cy="2.8" r="0.12" fill="#FFF" />
    <circle cx="3" cy="2.8" r="0.12" fill="#FFF" />
    <circle cx="4" cy="2.8" r="0.12" fill="#FFF" />
    <circle cx="5" cy="2.8" r="0.12" fill="#FFF" />
    <circle cx="6" cy="2.8" r="0.12" fill="#FFF" />
  </svg>
);

const PkFlag = () => (
  <svg className="w-4.5 h-3 inline-block mr-1 align-middle rounded-sm shadow-sm" viewBox="0 0 300 200" style={{ width: '18px', height: '12px' }}>
    <rect width="300" height="200" fill="#01411C" />
    <rect width="75" height="200" fill="#FFFFFF" />
    <circle cx="180" cy="100" r="42" fill="#FFFFFF" />
    <circle cx="193" cy="88" r="42" fill="#01411C" />
    <polygon points="195,85 190,70 203,78 213,67 208,82 220,90 205,90 200,105 197,90 182,90" fill="#FFFFFF" transform="rotate(-35 200 85) scale(0.8)" />
  </svg>
);

const TimezoneClocks = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTz = (timeZone) => {
    try {
      return time.toLocaleTimeString('en-US', {
        timeZone,
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch (e) {
      return time.toLocaleTimeString();
    }
  };

  return (
    <div className="bg-white dark:bg-[#12102e] py-1.5 px-3 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
        </span>
        <span className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Live Timezones</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3 flex-1 justify-end">
        <div className="bg-slate-50/60 dark:bg-slate-800/30 px-2 py-0.5 rounded-xl border border-slate-100/50 dark:border-slate-800/20 text-center sm:text-right flex flex-col justify-center items-center sm:items-end">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <UsFlag /> CST
          </span>
          <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">{formatTz('America/Chicago')}</span>
        </div>
        <div className="bg-slate-50/60 dark:bg-slate-800/30 px-2 py-0.5 rounded-xl border border-slate-100/50 dark:border-slate-800/20 text-center sm:text-right flex flex-col justify-center items-center sm:items-end">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <UsFlag /> EST
          </span>
          <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">{formatTz('America/New_York')}</span>
        </div>
        <div className="bg-slate-50/60 dark:bg-slate-800/30 px-2 py-0.5 rounded-xl border border-slate-100/50 dark:border-slate-800/20 text-center sm:text-right flex flex-col justify-center items-center sm:items-end">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <PkFlag /> PKT
          </span>
          <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">{formatTz('Asia/Karachi')}</span>
        </div>
        <div className="bg-slate-50/60 dark:bg-slate-800/30 px-2 py-0.5 rounded-xl border border-slate-100/50 dark:border-slate-800/20 text-center sm:text-right flex flex-col justify-center items-center sm:items-end">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <PkFlag /> PK Local
          </span>
          <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">{formatTz('Asia/Karachi')}</span>
        </div>
      </div>
    </div>
  );
};

const INTERVIEW_ROLES = ['Interviewee', 'Job Hunter', 'Both'];

// ─── Personalized Portal Dashboard ───────────────────────────────────────────
const PortalDashboard = ({ isDarkMode }) => {
  const { interviewName, role } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const nameFilter = interviewName || '';

  const { data: myStats } = useGetInterviewStatsQuery();
  const { data: myBreakdown = [] } = useGetInterviewStatusBreakdownQuery(
    nameFilter
      ? (role === 'Job Hunter' || role === 'Both'
        ? { inv_to: nameFilter }
        : { candidate: nameFilter })
      : {}
  );

  const { data: myInterviews } = useGetInterviewsPagedQuery(
    nameFilter
      ? (role === 'Job Hunter' || role === 'Both'
        ? { inv_to: nameFilter, limit: 200 }
        : { candidate: nameFilter, limit: 200 })
      : { limit: 200 }
  );

  const { data: myLeadsData } = useGetLeadsQuery(
    nameFilter ? { interviewee: nameFilter } : {}
  );

  const totalMyInterviews = myInterviews?.total ?? 0;
  const myRecords = myInterviews?.data ?? [];
  const totalMyLeads = myLeadsData?.stats?.TotalLeads || 0;

  // Upcoming interviews (today or future)
  const todayStart = dayjs().startOf('day');
  const upcoming = myRecords
    .filter((r) => {
      const d = r.InterviewDate ?? r.interviewDate;
      return d && !dayjs(d).isBefore(todayStart, 'day');
    })
    .sort((a, b) => dayjs(a.InterviewDate ?? a.interviewDate).valueOf() - dayjs(b.InterviewDate ?? b.interviewDate).valueOf())
    .slice(0, 8);

  // Past interviews
  const past = myRecords
    .filter((r) => {
      const d = r.InterviewDate ?? r.interviewDate;
      return d && dayjs(d).isBefore(dayjs(), 'day');
    })
    .sort((a, b) => dayjs(b.InterviewDate ?? b.interviewDate).valueOf() - dayjs(a.InterviewDate ?? a.interviewDate).valueOf())
    .slice(0, 6);

  const comparisonData = [
    { name: 'Converted', Leads: myLeadsData?.stats?.LeadsConverted || 0, Interviews: myBreakdown.find(s => (s.status || '').toLowerCase() === 'converted')?.count || 0 },
    { name: 'Rejected', Leads: myLeadsData?.stats?.Rejected || 0, Interviews: myBreakdown.find(s => (s.status || '').toLowerCase() === 'rejected')?.count || 0 },
    { name: 'Dropped', Leads: myLeadsData?.stats?.Dropped || 0, Interviews: myBreakdown.find(s => (s.status || '').toLowerCase() === 'dropped')?.count || 0 },
    { name: 'Closed', Leads: myLeadsData?.stats?.Closed || 0, Interviews: myBreakdown.find(s => (s.status || '').toLowerCase() === 'closed')?.count || 0 },
    { name: 'Dead', Leads: myLeadsData?.stats?.Dead || 0, Interviews: myBreakdown.find(s => (s.status || '').toLowerCase() === 'dead')?.count || 0 },
  ];

  const trendData = [
    { month: 'Jan', Leads: Math.round(totalMyLeads * 0.15), Interviews: Math.round(totalMyInterviews * 0.12) },
    { month: 'Feb', Leads: Math.round(totalMyLeads * 0.18), Interviews: Math.round(totalMyInterviews * 0.15) },
    { month: 'Mar', Leads: Math.round(totalMyLeads * 0.22), Interviews: Math.round(totalMyInterviews * 0.20) },
    { month: 'Apr', Leads: Math.round(totalMyLeads * 0.25), Interviews: Math.round(totalMyInterviews * 0.25) },
    { month: 'May', Leads: Math.round(totalMyLeads * 0.28), Interviews: Math.round(totalMyInterviews * 0.30) },
    { month: 'Jun', Leads: Math.round(totalMyLeads * 0.35), Interviews: Math.round(totalMyInterviews * 0.35) },
  ];

  const proportionData = [
    { name: 'Leads', value: totalMyLeads },
    { name: 'Interviews', value: totalMyInterviews },
  ];
  const PROP_COLORS = ['#7c3aed', '#db2777'];


  const headingColor = isDarkMode ? '#f1f5f9' : '#1e293b';
  const subColor = isDarkMode ? '#94a3b8' : '#64748b';
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  const borderColor = isDarkMode ? '#334155' : '#e2e8f0';

  const statusColors = {
    Scheduled: '#4f46e5',
    Completed: '#10b981',
    Cancelled: '#ef4444',
    Dropped: '#f59e0b',
    Rejected: '#dc2626',
    Converted: '#059669',
    'Job Landed': '#7c3aed',
  };

  return (
    <div
      className="flex flex-col gap-1.5 h-auto lg:h-[calc(100vh-68px)] overflow-y-auto lg:overflow-hidden pr-0 lg:pr-1"
    >

      {/* ── Top Grid of Metric Cards & Timezones ── */}
      <Row gutter={[8, 8]}>
        <Col xs={12} md={6}>
          <div
            className="py-2 px-3 rounded-xl shadow-sm transition-all flex items-center gap-3 border h-full"
            style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm text-white flex-shrink-0" style={{ backgroundColor: '#2563eb' }}>
              <RiseOutlined />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-extrabold block uppercase tracking-wider leading-none" style={{ color: '#1e40af' }}>Leads</span>
              <span className="text-xl font-black block mt-0.5 leading-none" style={{ color: '#1e3a8a' }}>
                {totalMyLeads.toLocaleString()}
              </span>
            </div>
          </div>
        </Col>

        <Col xs={12} md={6}>
          <div
            onClick={() => navigate('/interviews')}
            className="py-2 px-3 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-3 cursor-pointer border h-full"
            style={{ background: '#f0fdfa', borderColor: '#99f6e4' }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm text-white flex-shrink-0" style={{ backgroundColor: '#0d9488' }}>
              <CalendarOutlined />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-extrabold block uppercase tracking-wider leading-none" style={{ color: '#0f766e' }}>Interviews</span>
              <span className="text-xl font-black block mt-0.5 leading-none" style={{ color: '#134e4a' }}>
                {totalMyInterviews.toLocaleString()}
              </span>
            </div>
          </div>
        </Col>

        <Col xs={24} md={12}>
          <TimezoneClocks />
        </Col>
      </Row>

      {/* ── Interview Status Breakdown ── */}
      <div className="bg-white dark:bg-[#12102e] py-1 px-2.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800/50">
        <div className="flex flex-col text-left mb-1">
          <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-100 leading-tight">Interview Status</span>
          <span className="text-[8px] text-slate-400 font-semibold leading-none">Click any status card to view filtered candidates</span>
        </div>
        <InterviewStatusOverview
          breakdown={myBreakdown}
          totalRows={totalMyInterviews}
          onToggle={(status) => navigate(`/interviews?status=${encodeURIComponent(status)}`)}
          onTotalClick={() => navigate('/interviews')}
          totalActive={false}
          loading={false}
          hideTotal={true}
        />
      </div>

      {/* ── Analytics (fills remaining height) ── */}
      <Card
        className="shadow-sm flex flex-col flex-none lg:flex-1 lg:min-h-0 overflow-hidden"
        style={{ borderRadius: 14 }}
        styles={{ body: { padding: '4px 8px 6px 8px', flex: 1, display: 'flex', flexDirection: 'column' } }}
        title={
          <div className="flex flex-col text-left">
            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 leading-tight">Leads & Interviews Analytics</span>
            <span className="text-[9px] text-slate-400 font-semibold mt-0.5 leading-none">Comprehensive recruitment pipeline stats and trends</span>
          </div>
        }
        variant="borderless"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 flex-1 lg:min-h-0">

          {/* Column 1: Bar Chart */}
          <div
            className="flex flex-col p-3 rounded-xl h-[260px] lg:h-auto lg:min-h-0"
            style={{ background: isDarkMode ? 'rgba(30,64,175,0.15)' : '#eff6ff', border: isDarkMode ? '1px solid rgba(30,64,175,0.2)' : '1px solid #bfdbfe' }}
          >
            <span className="text-[9px] uppercase font-black tracking-wider mb-1 text-left" style={{ color: isDarkMode ? '#93c5fd' : '#1e40af' }}>Status Comparison</span>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 6, right: 4, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e3a8a' : '#dbeafe'} />
                  <XAxis dataKey="name" stroke={isDarkMode ? '#93c5fd' : '#1d4ed8'} style={{ fontSize: 8, fontWeight: 'bold' }} />
                  <YAxis stroke={isDarkMode ? '#93c5fd' : '#1d4ed8'} style={{ fontSize: 8 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: isDarkMode ? '#0f172a' : '#eff6ff', border: '1px solid #93c5fd', borderRadius: '8px', fontSize: '10px' }} />
                  <Bar dataKey="Leads" fill="#1e40af" radius={[3, 3, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="Interviews" fill="#0ea5e9" radius={[3, 3, 0, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Column 2: Line Chart */}
          <div
            className="flex flex-col p-3 rounded-xl h-[260px] lg:h-auto lg:min-h-0"
            style={{ background: isDarkMode ? 'rgba(6,95,70,0.15)' : '#f0fdf4', border: isDarkMode ? '1px solid rgba(5,150,105,0.2)' : '1px solid #bbf7d0' }}
          >
            <span className="text-[9px] uppercase font-black tracking-wider mb-1 text-left" style={{ color: isDarkMode ? '#6ee7b7' : '#047857' }}>Monthly Trend</span>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 6, right: 4, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#064e3b' : '#dcfce7'} />
                  <XAxis dataKey="month" stroke={isDarkMode ? '#6ee7b7' : '#065f46'} style={{ fontSize: 8, fontWeight: 'bold' }} />
                  <YAxis stroke={isDarkMode ? '#6ee7b7' : '#065f46'} style={{ fontSize: 8 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: isDarkMode ? '#042f1e' : '#f0fdf4', border: '1px solid #6ee7b7', borderRadius: '8px', fontSize: '10px' }} />
                  <Line type="monotone" dataKey="Leads" stroke="#059669" strokeWidth={2} dot={{ r: 2.5, fill: '#059669' }} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Interviews" stroke="#d97706" strokeWidth={2} dot={{ r: 2.5, fill: '#d97706' }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Column 3: Pie Chart */}
          <div
            className="flex flex-col items-center justify-center p-3 rounded-xl h-[220px] lg:h-auto lg:min-h-0"
            style={{ background: isDarkMode ? 'rgba(109,40,217,0.15)' : '#faf5ff', border: isDarkMode ? '1px solid rgba(124,58,237,0.2)' : '1px solid #e9d5ff' }}
          >
            <span className="text-[9px] uppercase font-black tracking-wider mb-1" style={{ color: isDarkMode ? '#c4b5fd' : '#7c3aed' }}>Total Volume Share</span>
            <div className="relative flex items-center justify-center mb-2" style={{ width: 110, height: 110 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={proportionData} cx="50%" cy="50%" innerRadius={30} outerRadius={46} paddingAngle={4} dataKey="value">
                    {proportionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PROP_COLORS[index % PROP_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-sm font-black leading-none" style={{ color: isDarkMode ? '#c4b5fd' : '#6d28d9' }}>
                  {(totalMyLeads + totalMyInterviews).toLocaleString()}
                </span>
                <span className="text-[7px] uppercase font-bold leading-none mt-0.5" style={{ color: isDarkMode ? '#c4b5fd' : '#7c3aed' }}>Total</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 w-full text-[10px] font-bold text-left px-3">
              {proportionData.map((item, idx) => (
                <div key={item.name} className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5" style={{ color: isDarkMode ? '#c4b5fd' : '#5b21b6' }}>
                    <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: PROP_COLORS[idx % PROP_COLORS.length] }} />
                    {item.name}
                  </span>
                  <span className="font-extrabold" style={{ color: isDarkMode ? '#c4b5fd' : '#6d28d9' }}>{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </Card>

    </div>
  );
};

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const { role } = useSelector((state) => state.auth);

  const isInterviewPortalUser = INTERVIEW_ROLES.includes(role);

  // All hooks must run unconditionally (React rules of hooks)
  const { data: hrStats, isLoading: isHrLoading } = useGetHrStatsQuery(undefined, {
    skip: isInterviewPortalUser,
  });
  const { data: leadsData } = useGetLeadsQuery(undefined, {
    skip: isInterviewPortalUser,
  });
  const { data: interviewStats } = useGetInterviewStatsQuery(undefined, {
    skip: isInterviewPortalUser,
  });
  const { data: statusBreakdown = [] } = useGetInterviewStatusBreakdownQuery({}, {
    skip: isInterviewPortalUser,
  });

  // Portal users: show personalized dashboard
  if (isInterviewPortalUser) {
    return <PortalDashboard isDarkMode={isDarkMode} />;
  }

  if (isHrLoading && !hrStats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spin size="large" description="Loading dashboard details..." />
      </div>
    );
  }

  const totalEmployees = hrStats?.Headcount ?? hrStats?.headcount ?? 0;
  const activeEmployees = hrStats?.ActiveEmployees ?? hrStats?.activeEmployees ?? 0;
  const newJoinees = hrStats?.NewHiresThisMonth ?? hrStats?.newHiresThisMonth ?? 0;
  const totalAssets = hrStats?.TotalAssets ?? hrStats?.totalAssets ?? 0;
  const assignedAssets = hrStats?.AssignedAssets ?? hrStats?.assignedAssets ?? 0;

  const departmentData = (hrStats?.DepartmentDistribution ?? hrStats?.departmentDistribution ?? []).map((d) => ({
    name: d.DepartmentName ?? d.departmentName ?? 'Unknown',
    count: d.Count ?? d.count ?? 0,
  }));

  const interviewGraphData = statusBreakdown.map((s) => ({
    status: s.status || s.Status || 'Unknown',
    count: s.count || s.Count || 0,
  }));

  const totalInterviews = interviewStats?.total ?? 0;
  const totalLeads = leadsData?.stats?.TotalLeads || 0;

  const comparisonData = [
    { name: 'Converted', Leads: leadsData?.stats?.LeadsConverted || 0, Interviews: statusBreakdown.find(s => (s.status || '').toLowerCase() === 'converted')?.count || 0 },
    { name: 'Rejected', Leads: leadsData?.stats?.Rejected || 0, Interviews: statusBreakdown.find(s => (s.status || '').toLowerCase() === 'rejected')?.count || 0 },
    { name: 'Dropped', Leads: leadsData?.stats?.Dropped || 0, Interviews: statusBreakdown.find(s => (s.status || '').toLowerCase() === 'dropped')?.count || 0 },
    { name: 'Closed', Leads: leadsData?.stats?.Closed || 0, Interviews: statusBreakdown.find(s => (s.status || '').toLowerCase() === 'closed')?.count || 0 },
    { name: 'Dead', Leads: leadsData?.stats?.Dead || 0, Interviews: statusBreakdown.find(s => (s.status || '').toLowerCase() === 'dead')?.count || 0 },
  ];

  const trendData = [
    { month: 'Jan', Leads: Math.round(totalLeads * 0.15), Interviews: Math.round(totalInterviews * 0.12) },
    { month: 'Feb', Leads: Math.round(totalLeads * 0.18), Interviews: Math.round(totalInterviews * 0.15) },
    { month: 'Mar', Leads: Math.round(totalLeads * 0.22), Interviews: Math.round(totalInterviews * 0.20) },
    { month: 'Apr', Leads: Math.round(totalLeads * 0.25), Interviews: Math.round(totalInterviews * 0.25) },
    { month: 'May', Leads: Math.round(totalLeads * 0.28), Interviews: Math.round(totalInterviews * 0.30) },
    { month: 'Jun', Leads: Math.round(totalLeads * 0.35), Interviews: Math.round(totalInterviews * 0.35) },
  ];

  const proportionData = [
    { name: 'Leads', value: totalLeads },
    { name: 'Interviews', value: totalInterviews },
  ];
  const PROP_COLORS = ['#7c3aed', '#db2777'];

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const deptTableColumns = [
    {
      title: 'Department',
      dataIndex: 'name',
      key: 'name',
      className: 'font-semibold text-slate-700 dark:text-slate-200',
    },
    {
      title: 'Headcount',
      dataIndex: 'count',
      key: 'count',
      align: 'right',
      render: (text) => <span className="font-bold">{text}</span>,
    },
  ];

  return (
    <div
      className="flex flex-col gap-1.5 h-auto lg:h-[calc(100vh-68px)] overflow-y-auto lg:overflow-hidden pr-0 lg:pr-1"
    >

      {/* ── Top metric cards + timezone ── */}
      <Row gutter={[8, 8]}>
        <Col xs={12} md={6}>
          <div
            className="py-2 px-3 rounded-xl shadow-sm transition-all flex items-center gap-3 border h-full"
            style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm text-white flex-shrink-0" style={{ backgroundColor: '#2563eb' }}>
              <RiseOutlined />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-extrabold block uppercase tracking-wider leading-none" style={{ color: '#1e40af' }}>Leads</span>
              <span className="text-xl font-black block mt-0.5 leading-none" style={{ color: '#1e3a8a' }}>
                {(leadsData?.stats?.TotalLeads || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </Col>

        <Col xs={12} md={6}>
          <div
            onClick={() => navigate('/interviews')}
            className="py-2 px-3 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-3 cursor-pointer border h-full"
            style={{ background: '#f0fdfa', borderColor: '#99f6e4' }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm text-white flex-shrink-0" style={{ backgroundColor: '#0d9488' }}>
              <CalendarOutlined />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-extrabold block uppercase tracking-wider leading-none" style={{ color: '#0f766e' }}>Interviews</span>
              <span className="text-xl font-black block mt-0.5 leading-none" style={{ color: '#134e4a' }}>
                {totalInterviews.toLocaleString()}
              </span>
            </div>
          </div>
        </Col>

        <Col xs={24} md={12}>
          <TimezoneClocks />
        </Col>
      </Row>

      {/* ── Interview Status Breakdown ── */}
      <div className="bg-white dark:bg-[#12102e] py-1 px-2.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800/50">
        <div className="flex flex-col text-left mb-1">
          <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-100 leading-tight">Interview Status</span>
          <span className="text-[8px] text-slate-400 font-semibold leading-none">Click any status card to view filtered candidates</span>
        </div>
        <InterviewStatusOverview
          breakdown={statusBreakdown}
          totalRows={totalInterviews}
          onToggle={(status) => navigate(`/interviews?status=${encodeURIComponent(status)}`)}
          onTotalClick={() => navigate('/interviews')}
          totalActive={false}
          loading={false}
          hideTotal={true}
        />
      </div>

      {/* ── Analytics ── */}
      <Card
        className="shadow-sm flex flex-col flex-none lg:flex-1 lg:min-h-0 overflow-hidden"
        style={{ borderRadius: 14 }}
        styles={{ body: { padding: '4px 8px 6px 8px', flex: 1, display: 'flex', flexDirection: 'column' } }}
        title={
          <div className="flex flex-col text-left">
            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 leading-tight">Leads & Interviews Analytics</span>
            <span className="text-[9px] text-slate-400 font-semibold mt-0.5 leading-none">Comprehensive recruitment pipeline stats and trends</span>
          </div>
        }
        variant="borderless"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 flex-1 lg:min-h-0">

          {/* Status Comparison Bar Chart */}
          <div
            className="flex flex-col p-3 rounded-xl h-[260px] lg:h-auto lg:min-h-0"
            style={{ background: isDarkMode ? 'rgba(30,64,175,0.15)' : '#eff6ff', border: isDarkMode ? '1px solid rgba(30,64,175,0.2)' : '1px solid #bfdbfe' }}
          >
            <span className="text-[9px] uppercase font-black tracking-wider mb-1 text-left" style={{ color: isDarkMode ? '#93c5fd' : '#1e40af' }}>Status Comparison</span>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 6, right: 4, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e3a8a' : '#dbeafe'} />
                  <XAxis dataKey="name" stroke={isDarkMode ? '#93c5fd' : '#1d4ed8'} style={{ fontSize: 8, fontWeight: 'bold' }} />
                  <YAxis stroke={isDarkMode ? '#93c5fd' : '#1d4ed8'} style={{ fontSize: 8 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: isDarkMode ? '#0f172a' : '#eff6ff', border: '1px solid #93c5fd', borderRadius: '8px', fontSize: '10px' }} />
                  <Bar dataKey="Leads" fill="#1e40af" radius={[3, 3, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="Interviews" fill="#0ea5e9" radius={[3, 3, 0, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Trend Line Chart */}
          <div
            className="flex flex-col p-3 rounded-xl h-[260px] lg:h-auto lg:min-h-0"
            style={{ background: isDarkMode ? 'rgba(6,95,70,0.15)' : '#f0fdf4', border: isDarkMode ? '1px solid rgba(5,150,105,0.2)' : '1px solid #bbf7d0' }}
          >
            <span className="text-[9px] uppercase font-black tracking-wider mb-1 text-left" style={{ color: isDarkMode ? '#6ee7b7' : '#047857' }}>Monthly Trend</span>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 6, right: 4, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#064e3b' : '#dcfce7'} />
                  <XAxis dataKey="month" stroke={isDarkMode ? '#6ee7b7' : '#065f46'} style={{ fontSize: 8, fontWeight: 'bold' }} />
                  <YAxis stroke={isDarkMode ? '#6ee7b7' : '#065f46'} style={{ fontSize: 8 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: isDarkMode ? '#042f1e' : '#f0fdf4', border: '1px solid #6ee7b7', borderRadius: '8px', fontSize: '10px' }} />
                  <Line type="monotone" dataKey="Leads" stroke="#059669" strokeWidth={2} dot={{ r: 2.5, fill: '#059669' }} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Interviews" stroke="#d97706" strokeWidth={2} dot={{ r: 2.5, fill: '#d97706' }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Total Volume Share Pie Chart */}
          <div
            className="flex flex-col items-center justify-center p-3 rounded-xl h-[220px] lg:h-auto lg:min-h-0"
            style={{ background: isDarkMode ? 'rgba(109,40,217,0.15)' : '#faf5ff', border: isDarkMode ? '1px solid rgba(124,58,237,0.2)' : '1px solid #e9d5ff' }}
          >
            <span className="text-[9px] uppercase font-black tracking-wider mb-1" style={{ color: isDarkMode ? '#c4b5fd' : '#7c3aed' }}>Total Volume Share</span>
            <div className="relative flex items-center justify-center mb-2" style={{ width: 110, height: 110 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={proportionData} cx="50%" cy="50%" innerRadius={30} outerRadius={46} paddingAngle={4} dataKey="value">
                    {proportionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PROP_COLORS[index % PROP_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-sm font-black leading-none" style={{ color: isDarkMode ? '#c4b5fd' : '#6d28d9' }}>
                  {(totalLeads + totalInterviews).toLocaleString()}
                </span>
                <span className="text-[7px] uppercase font-bold leading-none mt-0.5" style={{ color: isDarkMode ? '#c4b5fd' : '#7c3aed' }}>Total</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 w-full text-[10px] font-bold text-left px-3">
              {proportionData.map((item, idx) => (
                <div key={item.name} className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5" style={{ color: isDarkMode ? '#c4b5fd' : '#5b21b6' }}>
                    <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: PROP_COLORS[idx % PROP_COLORS.length] }} />
                    {item.name}
                  </span>
                  <span className="font-extrabold" style={{ color: isDarkMode ? '#c4b5fd' : '#6d28d9' }}>{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </Card>

    </div>
  );
};

export default Dashboard;
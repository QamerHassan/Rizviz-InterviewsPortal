import React, { useState } from 'react';
import { Input, Row, Col, Typography, Spin } from 'antd';
import { SearchOutlined, TeamOutlined } from '@ant-design/icons';
import { useGetInterviewCandidatesQuery } from '../store/apiSlice';
import { useSelector } from 'react-redux';
import CandidateDrawer from '../components/interviews/CandidateDrawer';

const { Title, Text } = Typography;

const TABS = [
  { key: 'All', label: 'All', icon: '🌐' },
  { key: 'Profile Holder', label: 'Profile Holders', icon: '👤' },
  { key: 'BD', label: 'BDs', icon: '💼' },
  { key: 'Developer', label: 'Developers', icon: '💻' },
  { key: 'Manager & Team Lead', label: 'Managers & Team Leads', icon: '👑' },
  { key: 'IT', label: 'IT', icon: '⚡' },
  { key: 'Non-IT', label: 'Non-IT', icon: '🏢' },
];

const getAvatarGradient = (primaryCategory, isManager, isLead) => {
  if (isManager || isLead || primaryCategory === 'Manager' || primaryCategory === 'Team Lead') {
    return 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)';
  }
  if (primaryCategory === 'BD') {
    return 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)';
  }
  if (primaryCategory === 'Developer') {
    return 'linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)';
  }
  return 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
};

const getRoleBadgeStyle = (role, isDarkMode) => {
  switch (role) {
    case 'Manager':
      return {
        background: isDarkMode ? 'rgba(217,70,239,0.18)' : '#fdf4ff',
        color: isDarkMode ? '#f0abfc' : '#c026d3',
        border: `1px solid ${isDarkMode ? 'rgba(217,70,239,0.3)' : '#f5d0fe'}`,
      };
    case 'Team Lead':
      return {
        background: isDarkMode ? 'rgba(139,92,246,0.18)' : '#f3e8ff',
        color: isDarkMode ? '#c084fc' : '#7e22ce',
        border: `1px solid ${isDarkMode ? 'rgba(139,92,246,0.3)' : '#e9d5ff'}`,
      };
    case 'BD':
      return {
        background: isDarkMode ? 'rgba(245,158,11,0.18)' : '#fffbeb',
        color: isDarkMode ? '#fbbf24' : '#b45309',
        border: `1px solid ${isDarkMode ? 'rgba(245,158,11,0.3)' : '#fef3c7'}`,
      };
    case 'Developer':
      return {
        background: isDarkMode ? 'rgba(6,182,212,0.18)' : '#ecfeff',
        color: isDarkMode ? '#67e8f9' : '#0891b2',
        border: `1px solid ${isDarkMode ? 'rgba(6,182,212,0.3)' : '#cffaff'}`,
      };
    case 'Profile Holder':
    default:
      return {
        background: isDarkMode ? 'rgba(99,102,241,0.18)' : '#eef2ff',
        color: isDarkMode ? '#a5b4fc' : '#4338ca',
        border: `1px solid ${isDarkMode ? 'rgba(99,102,241,0.3)' : '#e0e7ff'}`,
      };
  }
};

const Candidates = () => {
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const { data: candidates = [], isFetching } = useGetInterviewCandidatesQuery(
    { search: search || undefined }
  );

  const headingColor = isDarkMode ? '#f1f5f9' : '#1e293b';
  const subColor = isDarkMode ? '#94a3b8' : '#64748b';

  // Category counts
  const allCount = candidates.length;
  const profileCount = candidates.filter((c) => (c.categories || []).includes('Profile Holder')).length;
  const bdCount = candidates.filter((c) => (c.categories || []).includes('BD')).length;
  const devCount = candidates.filter((c) => (c.categories || []).includes('Developer')).length;
  const managerCount = candidates.filter((c) =>
    (c.categories || []).some((cat) => ['Manager', 'Team Lead'].includes(cat))
  ).length;
  const itCount = candidates.filter((c) => c.it_status === 'IT').length;
  const nonItCount = candidates.filter((c) => c.it_status === 'Non-IT').length;

  const tabCounts = {
    All: allCount,
    'Profile Holder': profileCount,
    BD: bdCount,
    Developer: devCount,
    'Manager & Team Lead': managerCount,
    IT: itCount,
    'Non-IT': nonItCount,
  };

  // Filter candidates based on activeTab
  const filteredCandidates = candidates.filter((c) => {
    const cats = c.categories || [];
    if (activeTab === 'All') return true;
    if (activeTab === 'Profile Holder') return cats.includes('Profile Holder');
    if (activeTab === 'BD') return cats.includes('BD');
    if (activeTab === 'Developer') return cats.includes('Developer');
    if (activeTab === 'Manager & Team Lead') return cats.some((cat) => ['Manager', 'Team Lead'].includes(cat));
    if (activeTab === 'IT') return c.it_status === 'IT';
    if (activeTab === 'Non-IT') return c.it_status === 'Non-IT';
    return true;
  });

  return (
    <div className="space-y-5">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, color: headingColor }}>
            Candidates & Team Members
          </Title>
          <Text style={{ color: subColor, fontSize: 13 }}>
            {isFetching ? 'Loading...' : `${filteredCandidates.length} found (${candidates.length} total)`}
          </Text>
        </div>
        <Input
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          placeholder="Search by name, company, stack, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ maxWidth: 340 }}
          className="white-search-input rounded-lg"
        />
      </div>

      {/* ── Category Navigation Tabs ── */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl"
        style={{
          background: isDarkMode ? '#1e293b' : '#f8fafc',
          border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tabCounts[tab.key] ?? 0;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border-none"
              style={{
                background: isActive
                  ? isDarkMode ? '#6366f1' : '#4f46e5'
                  : 'transparent',
                color: isActive
                  ? '#ffffff'
                  : isDarkMode ? '#94a3b8' : '#64748b',
                boxShadow: isActive ? '0 4px 12px rgba(79, 70, 229, 0.25)' : 'none',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold"
                style={{
                  background: isActive
                    ? 'rgba(255,255,255,0.25)'
                    : isDarkMode ? '#334155' : '#e2e8f0',
                  color: isActive
                    ? '#ffffff'
                    : isDarkMode ? '#cbd5e1' : '#475569',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Card Grid ── */}
      {isFetching ? (
        <div className="flex items-center justify-center py-24">
          <Spin size="large" />
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <TeamOutlined style={{ fontSize: 56, color: '#d1d5db' }} />
          <Text type="secondary" style={{ fontSize: 14 }}>
            No personnel or candidates found for "{activeTab}"
          </Text>
        </div>
      ) : (
        <Row gutter={[14, 14]}>
          {filteredCandidates.map((c) => {
            const name         = c.interviewee_name || '';
            const initial      = (c.initial || name.charAt(0) || '?').toUpperCase();
            const interviews   = c.interview_count ?? 0;
            const leads        = c.leads_count ?? 0;
            const stacks       = c.stacks || [];
            const email        = c.email || '';
            const designation  = c.designation || '';
            const categories   = c.categories || ['Profile Holder'];
            const primaryCat   = c.primary_category || 'Profile Holder';
            const companies    = c.companies || [];
            const moreCount    = c.companies_more_count ?? 0;
            const converted    = c.converted_count ?? 0;
            const rejected     = c.rejected_count ?? 0;
            const dropped      = c.dropped_count ?? 0;
            const addedDate    = c.added_date
              ? new Date(c.added_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : null;

            const isManager = categories.includes('Manager');
            const isLead    = categories.includes('Team Lead');
            const avatarBg  = getAvatarGradient(primaryCat, isManager, isLead);

            return (
              <Col xs={24} sm={12} lg={8} xl={6} key={name}>
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(name)}
                  className="w-full text-left rounded-2xl p-4 transition-all hover:shadow-lg hover:-translate-y-0.5 group relative"
                  style={{
                    background: isDarkMode ? '#1e293b' : '#ffffff',
                    border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                    cursor: 'pointer',
                    display: 'block',
                  }}
                >
                  {/* Category Badges Top Header */}
                  <div className="flex flex-wrap items-center gap-1 mb-2.5">
                    {/* IT / Non-IT Badge */}
                    {c.it_status && (
                      <span
                        className="text-[10px] font-black px-2 py-0.5 rounded-full"
                        style={{
                          background: c.it_status === 'IT'
                            ? (isDarkMode ? 'rgba(16,185,129,0.18)' : '#ecfdf5')
                            : (isDarkMode ? 'rgba(245,158,11,0.18)' : '#fffbeb'),
                          color: c.it_status === 'IT'
                            ? (isDarkMode ? '#34d399' : '#059669')
                            : (isDarkMode ? '#fbbf24' : '#b45309'),
                          border: `1px solid ${c.it_status === 'IT'
                            ? (isDarkMode ? 'rgba(16,185,129,0.35)' : '#a7f3d0')
                            : (isDarkMode ? 'rgba(245,158,11,0.35)' : '#fde68a')}`,
                        }}
                      >
                        {c.it_status === 'IT' ? '⚡ IT' : '🏢 Non-IT'}
                      </span>
                    )}

                    {/* Exact Job Role from DB (e.g. BD-BDO, DEV, DEV-MNGR, BD-TL) */}
                    {c.job_role && (
                      <span
                        className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                        style={{
                          background: isDarkMode ? 'rgba(99,102,241,0.18)' : '#eff6ff',
                          color: isDarkMode ? '#a5b4fc' : '#2563eb',
                          border: `1px solid ${isDarkMode ? 'rgba(99,102,241,0.35)' : '#bfdbfe'}`,
                        }}
                      >
                        {c.job_role}
                      </span>
                    )}

                    {categories.map((cat) => {
                      const badgeStyle = getRoleBadgeStyle(cat, isDarkMode);
                      return (
                        <span
                          key={cat}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={badgeStyle}
                        >
                          {cat === 'BD' ? '💼 BD' : cat === 'Developer' ? '💻 Dev' : cat === 'Manager' ? '👑 Manager' : cat === 'Team Lead' ? '⚡ Team Lead' : '👤 Profile'}
                        </span>
                      );
                    })}
                  </div>

                  {/* Avatar + Name + Designation */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0 group-hover:scale-105 transition-transform shadow-md"
                      style={{ background: avatarBg }}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold truncate" style={{ color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>
                        {name}
                      </div>
                      {designation && (
                        <div className="text-[11px] font-semibold truncate" style={{ color: isDarkMode ? '#a5b4fc' : '#4f46e5' }} title={designation}>
                          {designation}
                        </div>
                      )}
                      {c.emp_role && c.emp_role !== designation && (
                        <div className="text-[10px] font-medium truncate" style={{ color: isDarkMode ? '#38bdf8' : '#0284c7' }} title={c.emp_role}>
                          {c.emp_role}
                        </div>
                      )}
                      {email && (
                        <div className="text-[10px] truncate" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                          {email}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Interviews / Leads ratio or Staff Tag */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex flex-col">
                      <span className="text-2xl font-black leading-none" style={{ color: '#6366f1' }}>
                        {interviews}
                        <span className="text-base font-semibold mx-0.5" style={{ color: isDarkMode ? '#475569' : '#cbd5e1' }}>/</span>
                        <span className="text-2xl font-black" style={{ color: '#10b981' }}>{leads}</span>
                      </span>
                      <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                        INTERVIEWS / LEADS
                      </span>
                    </div>
                    {addedDate ? (
                      <span className="text-[10px]" style={{ color: isDarkMode ? '#475569' : '#94a3b8' }}>
                        Added {addedDate}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: isDarkMode ? '#0f172a' : '#f1f5f9', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                        Company Staff
                      </span>
                    )}
                  </div>

                  {/* Stack tags */}
                  {stacks.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {stacks.map((s) => (
                        <span
                          key={s}
                          className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: isDarkMode ? 'rgba(99,102,241,0.18)' : '#eef2ff', color: isDarkMode ? '#a5b4fc' : '#4338ca' }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Company tags */}
                  {companies.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {companies.slice(0, 3).map((co) => (
                        <span
                          key={co}
                          className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                          style={{ background: isDarkMode ? '#0f172a' : '#f1f5f9', color: isDarkMode ? '#94a3b8' : '#475569' }}
                        >
                          {co}
                        </span>
                      ))}
                      {(moreCount > 0 || companies.length > 3) && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                          style={{ background: isDarkMode ? '#1e293b' : '#f1f5f9', color: isDarkMode ? '#64748b' : '#94a3b8', border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}` }}
                        >
                          +{moreCount + Math.max(0, companies.length - 3)} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Outcome badges */}
                  {(converted > 0 || rejected > 0 || dropped > 0) && (
                    <div className="flex flex-wrap gap-1 pt-2 border-t" style={{ borderColor: isDarkMode ? '#1e293b' : '#f1f5f9' }}>
                      {converted > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-semibold"
                          style={{ background: isDarkMode ? 'rgba(16,185,129,0.12)' : '#ecfdf5', color: '#059669' }}>
                          ✓ {converted} Converted
                        </span>
                      )}
                      {rejected > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-semibold"
                          style={{ background: isDarkMode ? 'rgba(239,68,68,0.12)' : '#fef2f2', color: '#dc2626' }}>
                          ✕ {rejected} Rejected
                        </span>
                      )}
                      {dropped > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-semibold"
                          style={{ background: isDarkMode ? 'rgba(245,158,11,0.12)' : '#fffbeb', color: '#d97706' }}>
                          ↓ {dropped} Dropped
                        </span>
                      )}
                    </div>
                  )}
                </button>
              </Col>
            );
          })}
        </Row>
      )}

      {/* ── Level 1 Drawer ── */}
      <CandidateDrawer
        candidateName={selectedCandidate}
        open={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
      />
    </div>
  );
};

export default Candidates;

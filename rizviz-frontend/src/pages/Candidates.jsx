import React, { useState } from 'react';
import { Input, Row, Col, Typography, Spin } from 'antd';
import { SearchOutlined, TeamOutlined } from '@ant-design/icons';
import { useGetInterviewCandidatesQuery, useGetExcelSessionStatusQuery } from '../store/apiSlice';
import { useSelector } from 'react-redux';
import CandidateDrawer from '../components/interviews/CandidateDrawer';
import ExcelUploadRequired from '../components/ExcelUploadRequired';

const { Title, Text } = Typography;

const Candidates = () => {
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const { role } = useSelector((state) => state.auth);
  const [search, setSearch] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const { data: uploadStatus } = useGetExcelSessionStatusQuery(undefined, {
    skip: role !== 'Admin',
  });

  const { data: candidates = [], isFetching } = useGetInterviewCandidatesQuery(
    { search: search || undefined }
  );

  if (role === 'Admin' && uploadStatus && !uploadStatus.hasUploaded) {
    return <ExcelUploadRequired />;
  }

  const headingColor = isDarkMode ? '#f1f5f9' : '#1e293b';
  const subColor = isDarkMode ? '#94a3b8' : '#64748b';

  return (
    <div className="space-y-5">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, color: headingColor }}>
            Candidates
          </Title>
          <Text style={{ color: subColor, fontSize: 13 }}>
            {isFetching ? 'Loading...' : `${candidates.length} candidate${candidates.length !== 1 ? 's' : ''} found`}
          </Text>
        </div>
        <Input
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          placeholder="Search by name, company, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ maxWidth: 320 }}
          className="white-search-input rounded-lg"
        />
      </div>

      {/* ── Card Grid ── */}
      {isFetching ? (
        <div className="flex items-center justify-center py-24">
          <Spin size="large" />
        </div>
      ) : candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <TeamOutlined style={{ fontSize: 56, color: '#d1d5db' }} />
          <Text type="secondary" style={{ fontSize: 14 }}>No candidates found</Text>
        </div>
      ) : (
        <Row gutter={[14, 14]}>
          {candidates.map((c) => {
            const name         = c.interviewee_name || '';
            const initial      = (c.initial || name.charAt(0) || '?').toUpperCase();
            const interviews   = c.interview_count ?? 0;
            const leads        = c.leads_count ?? 0;
            const stacks       = c.stacks || [];
            const email        = c.email || '';
            const companies    = c.companies || [];
            const moreCount    = c.companies_more_count ?? 0;
            const converted    = c.converted_count ?? 0;
            const rejected     = c.rejected_count ?? 0;
            const dropped      = c.dropped_count ?? 0;
            const addedDate    = c.added_date
              ? new Date(c.added_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : null;

            return (
              <Col xs={24} sm={12} lg={8} xl={6} key={name}>
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(name)}
                  className="w-full text-left rounded-2xl p-4 transition-all hover:shadow-lg hover:-translate-y-0.5 group"
                  style={{
                    background: isDarkMode ? '#1e293b' : '#ffffff',
                    border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                    cursor: 'pointer',
                    display: 'block',
                  }}
                >
                  {/* Avatar + Name */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0 group-hover:scale-105 transition-transform"
                      style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold truncate" style={{ color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>
                        {name}
                      </div>
                      {email && (
                        <div className="text-[10px] truncate" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                          {email}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Interviews / Leads ratio */}
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
                    {addedDate && (
                      <span className="text-[10px]" style={{ color: isDarkMode ? '#475569' : '#94a3b8' }}>
                        Added {addedDate}
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

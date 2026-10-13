import React, { useState } from 'react';
import { Modal, Drawer, Tabs, Spin, Tag, Typography, Row, Col, Card, Table, Button, Tooltip, message } from 'antd';
import {
  LinkOutlined, CopyOutlined, TeamOutlined, FileTextOutlined,
  CalendarOutlined, UserOutlined, BankOutlined, CheckCircleOutlined,
  ClockCircleOutlined, InfoCircleOutlined, DollarOutlined, SolutionOutlined
} from '@ant-design/icons';
import { useGetMktInterviewDetailsQuery } from '../../store/apiSlice';
import { STATUS_PILL_COLORS } from '../../utils/interviewStatusUtils';
import dayjs from 'dayjs';

const { Text, Title, Paragraph } = Typography;

const formatDT = (d) => (d ? dayjs(d).format('MMM D, YYYY h:mm A') : '—');
const formatD = (d) => (d ? dayjs(d).format('MMM D, YYYY') : '—');

export const InterviewMktDetailsContent = ({ interviewId, isDarkMode }) => {
  const { data, isLoading, isError } = useGetMktInterviewDetailsQuery(interviewId, {
    skip: !interviewId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spin size="large" tip="Loading complete marketing interview details..." />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 text-center text-rose-500 font-semibold">
        Could not load details from mkt tables for ID #{interviewId}.
      </div>
    );
  }

  const master = data.master || {};
  const detail = data.detail || {};
  const allDetails = data.details || [];
  const stakeholders = data.stakeholders || [];

  const cardStyle = {
    background: isDarkMode ? '#1e293b' : '#f8fafc',
    border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
    borderRadius: 12,
    padding: 14,
  };

  const labelStyle = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: isDarkMode ? '#94a3b8' : '#64748b',
    letterSpacing: '0.5px',
  };

  const valStyle = {
    fontSize: 13,
    fontWeight: 600,
    color: isDarkMode ? '#f1f5f9' : '#1e293b',
  };

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    message.success(`${label} copied to clipboard!`);
  };

  const stakeholderColumns = [
    {
      title: 'Stakeholder Name',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (t, r) => (
        <div>
          <span className="font-bold text-sm" style={{ color: isDarkMode ? '#f8fafc' : '#1e293b' }}>
            {t || '—'}
          </span>
          {r.shortcode && (
            <Tag className="ml-2 !text-[10px]" color="blue">
              {r.shortcode}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'IT / Non-IT',
      dataIndex: 'it_status',
      key: 'it_status',
      width: 100,
      render: (s) => s ? (
        <Tag color={s === 'IT' ? 'success' : 'warning'} className="font-bold !text-[11px]">
          {s === 'IT' ? '⚡ IT' : '🏢 Non-IT'}
        </Tag>
      ) : '—',
    },
    {
      title: 'Job Role (Database)',
      dataIndex: 'job_role',
      key: 'job_role',
      width: 130,
      render: (r, row) => (
        <div>
          {r && <Tag color="purple" className="font-extrabold !text-[11px]">{r}</Tag>}
          {row.job_role_desc && (
            <div className="text-[11px] text-slate-400 mt-0.5">{row.job_role_desc}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Employee Role',
      dataIndex: 'emp_role',
      key: 'emp_role',
      render: (r) => r ? <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">{r}</span> : '—',
    },
    {
      title: 'Service Type',
      dataIndex: 'service_type',
      key: 'service_type',
      width: 110,
      render: (s, r) => (
        <div>
          <span className="text-xs font-semibold">{s || '—'}</span>
          {r.service_subType && <span className="text-[10px] text-slate-400 block">{r.service_subType}</span>}
        </div>
      ),
    },
    {
      title: 'Commission / Salary',
      key: 'finance',
      width: 140,
      render: (_, r) => (
        <div className="text-xs">
          {r.Commision_amt != null && r.Commision_amt > 0 && (
            <div>Commission: <b>${r.Commision_amt}</b></div>
          )}
          {r.first_salary != null && r.first_salary > 0 && (
            <div>Salary: <b>${r.first_salary}</b></div>
          )}
          {(!r.Commision_amt && !r.first_salary) && <span className="text-slate-400">—</span>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── Header Badge Summary ── */}
      <div
        className="p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3"
        style={{
          background: isDarkMode ? 'rgba(99,102,241,0.12)' : '#eef2ff',
          border: `1px solid ${isDarkMode ? 'rgba(99,102,241,0.3)' : '#c7d2fe'}`,
        }}
      >
        <div className="flex items-center gap-3">
          <BankOutlined style={{ fontSize: 24, color: '#6366f1' }} />
          <div>
            <div className="font-extrabold text-base" style={{ color: isDarkMode ? '#f8fafc' : '#1e1b4b' }}>
              {master.company_name || 'Company Interview'}
            </div>
            <div className="text-xs font-medium text-slate-500">
              Interview Code: <span className="font-bold text-indigo-600 dark:text-indigo-400">#{master.interview_code}</span>
              {detail.interview_seq_code && ` • Seq: #${detail.interview_seq_code}`}
              {master.stack_name && ` • Stack: ${master.stack_name}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {master.position && <Tag color="blue" className="font-semibold">{master.position}</Tag>}
          {detail.intv_type && <Tag color="cyan" className="font-semibold">{detail.intv_type}</Tag>}
          {detail.intv_status && <Tag color="geekblue" className="font-bold">{detail.intv_status}</Tag>}
        </div>
      </div>

      <Tabs
        defaultActiveKey="master"
        type="card"
        items={[
          {
            key: 'master',
            label: (
              <span className="font-bold flex items-center gap-1.5">
                <BankOutlined /> mkt.interview_master
              </span>
            ),
            children: (
              <div className="space-y-3 pt-1">
                <Row gutter={[10, 10]}>
                  <Col xs={24} sm={12} md={8}>
                    <div style={cardStyle}>
                      <div style={labelStyle}>Company Name</div>
                      <div style={valStyle}>{master.company_name || '—'}</div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div style={cardStyle}>
                      <div style={labelStyle}>Job Position / Role</div>
                      <div style={valStyle}>{master.position || '—'}</div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div style={cardStyle}>
                      <div style={labelStyle}>Recruiter Name</div>
                      <div style={valStyle}>{master.recruiter_name || '—'}</div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div style={cardStyle}>
                      <div style={labelStyle}>Interview To</div>
                      <div style={valStyle}>
                        {master.interview_to === 1 ? 'TGS' : master.interview_to === 2 ? 'Silmun' : master.interview_to || '—'}
                      </div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div style={cardStyle}>
                      <div style={labelStyle}>Payscale (Rate / Unit)</div>
                      <div style={valStyle}>
                        {master.payscale_val != null
                          ? `$${master.payscale_val} ${master.payscale_unit || ''}`
                          : '—'}
                      </div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div style={cardStyle}>
                      <div style={labelStyle}>Job Reference</div>
                      <div style={valStyle}>{master.job_reference || '—'}</div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div style={cardStyle}>
                      <div style={labelStyle}>Staffing Firm</div>
                      <div style={valStyle}>{master.staffing_firm || '—'}</div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div style={cardStyle}>
                      <div style={labelStyle}>Implementation Partner</div>
                      <div style={valStyle}>{master.implementation_partner || '—'}</div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div style={cardStyle}>
                      <div style={labelStyle}>Direct / Self</div>
                      <div style={valStyle}>{master.direct_self === 'D' ? 'Direct' : 'Self'}</div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div style={cardStyle}>
                      <div style={labelStyle}>Job Landed Date</div>
                      <div style={valStyle}>{formatD(master.Job_landed_date)}</div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div style={cardStyle}>
                      <div style={labelStyle}>Overall Status</div>
                      <div style={valStyle}>{master.Overall_sts || '—'}</div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div style={cardStyle}>
                      <div style={labelStyle}>Added By (Insert User)</div>
                      <div style={valStyle}>
                        {master.insert_by || '—'}{' '}
                        {master.insert_time && (
                          <span className="text-[11px] text-slate-400 font-normal">
                            ({formatD(master.insert_time)})
                          </span>
                        )}
                      </div>
                    </div>
                  </Col>
                  {master.rejection_reason && (
                    <Col xs={24}>
                      <div style={{ ...cardStyle, borderLeft: '4px solid #ef4444', background: isDarkMode ? 'rgba(239,68,68,0.1)' : '#fef2f2' }}>
                        <div style={{ ...labelStyle, color: '#ef4444' }}>Rejection Reason</div>
                        <div style={{ ...valStyle, color: '#dc2626' }}>{master.rejection_reason}</div>
                      </div>
                    </Col>
                  )}
                  {master.remarks && (
                    <Col xs={24}>
                      <div style={cardStyle}>
                        <div style={labelStyle}>Master Remarks</div>
                        <div style={valStyle}>{master.remarks}</div>
                      </div>
                    </Col>
                  )}
                </Row>
              </div>
            ),
          },
          {
            key: 'detail',
            label: (
              <span className="font-bold flex items-center gap-1.5">
                <ClockCircleOutlined /> mkt.interview_detail ({allDetails.length} rounds)
              </span>
            ),
            children: (
              <div className="space-y-4 pt-1">
                {allDetails.map((dItem, idx) => (
                  <div
                    key={dItem.interview_seq_code || idx}
                    className="p-3.5 rounded-xl border mb-3"
                    style={{
                      background: isDarkMode ? '#1e293b' : '#ffffff',
                      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <Tag color="purple" className="font-bold">
                          Round #{idx + 1} (Seq: {dItem.interview_seq_code})
                        </Tag>
                        <span className="font-bold text-sm" style={{ color: isDarkMode ? '#f8fafc' : '#1e293b' }}>
                          {dItem.intv_type || 'Interview'}
                        </span>
                        <Tag color="cyan">{dItem.intv_status || 'Scheduled'}</Tag>
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {formatDT(dItem.intv_datetime)} {dItem.time_Zone && `(${dItem.time_Zone})`}
                      </div>
                    </div>

                    <Row gutter={[10, 10]}>
                      {dItem.meeting_link && (
                        <Col xs={24}>
                          <div
                            className="p-2.5 rounded-lg flex items-center justify-between gap-2"
                            style={{ background: isDarkMode ? '#0f172a' : '#f0fdf4', border: '1px solid #86efac' }}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <LinkOutlined style={{ color: '#16a34a', fontSize: 16 }} />
                              <a
                                href={dItem.meeting_link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-bold text-emerald-600 truncate underline"
                              >
                                {dItem.meeting_link}
                              </a>
                            </div>
                            <Button
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={() => copyToClipboard(dItem.meeting_link, 'Meeting Link')}
                            >
                              Copy
                            </Button>
                          </div>
                        </Col>
                      )}

                      {dItem.BD_feedback && (
                        <Col xs={24} md={12}>
                          <div style={cardStyle}>
                            <div style={labelStyle}>💼 BD Feedback</div>
                            <div style={valStyle}>{dItem.BD_feedback}</div>
                          </div>
                        </Col>
                      )}

                      {dItem.Dev_feedback && (
                        <Col xs={24} md={12}>
                          <div style={cardStyle}>
                            <div style={labelStyle}>💻 Developer Feedback</div>
                            <div style={valStyle}>{dItem.Dev_feedback}</div>
                          </div>
                        </Col>
                      )}

                      {dItem.barriers && (
                        <Col xs={24}>
                          <div style={{ ...cardStyle, borderLeft: '4px solid #f59e0b' }}>
                            <div style={{ ...labelStyle, color: '#f59e0b' }}>⚠️ Barriers / Challenges</div>
                            <div style={valStyle}>{dItem.barriers}</div>
                          </div>
                        </Col>
                      )}

                      {dItem.Notes && (
                        <Col xs={24}>
                          <div style={cardStyle}>
                            <div style={labelStyle}>📝 Detailed Notes</div>
                            <Paragraph
                              ellipsis={{ rows: 3, expandable: true, symbol: 'more' }}
                              style={{ margin: 0, fontSize: 12, color: isDarkMode ? '#cbd5e1' : '#334155' }}
                            >
                              {dItem.Notes}
                            </Paragraph>
                          </div>
                        </Col>
                      )}

                      {dItem.JD && (
                        <Col xs={24}>
                          <div style={cardStyle}>
                            <div style={labelStyle}>📋 Job Description (JD)</div>
                            <Paragraph
                              ellipsis={{ rows: 4, expandable: true, symbol: 'Show full JD' }}
                              style={{ margin: 0, fontSize: 12, color: isDarkMode ? '#cbd5e1' : '#334155', whiteSpace: 'pre-wrap' }}
                            >
                              {dItem.JD}
                            </Paragraph>
                          </div>
                        </Col>
                      )}

                      {(dItem.resume_file_name || dItem.jd_file_name) && (
                        <Col xs={24}>
                          <div className="flex gap-2 items-center text-xs text-slate-500">
                            {dItem.resume_file_name && <Tag color="blue">📄 Resume: {dItem.resume_file_name}</Tag>}
                            {dItem.jd_file_name && <Tag color="geekblue">📑 JD File: {dItem.jd_file_name}</Tag>}
                          </div>
                        </Col>
                      )}
                    </Row>
                  </div>
                ))}
              </div>
            ),
          },
          {
            key: 'stakeholders',
            label: (
              <span className="font-bold flex items-center gap-1.5">
                <TeamOutlined /> mkt.interview_stakeholders ({stakeholders.length})
              </span>
            ),
            children: (
              <div className="pt-1">
                {stakeholders.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    No stakeholders mapped in <code>mkt.interview_stakeholders</code> for interview #{master.interview_code}.
                  </div>
                ) : (
                  <Table
                    size="small"
                    columns={stakeholderColumns}
                    dataSource={stakeholders}
                    rowKey={(r) => `${r.interview_code}_${r.entity_code}_${r.service_type}`}
                    pagination={false}
                    className="rounded-lg overflow-hidden"
                  />
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

export const InterviewMktDetailsModal = ({ open, onClose, interviewId, isDarkMode }) => {
  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <SolutionOutlined style={{ color: '#6366f1', fontSize: 18 }} />
          <span className="font-bold text-base">
            Complete Marketing Interview Data (Master, Detail & Stakeholders)
          </span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={940}
      destroyOnHidden
      styles={{
        body: { maxHeight: '80vh', overflowY: 'auto', paddingRight: 8 },
      }}
    >
      <InterviewMktDetailsContent interviewId={interviewId} isDarkMode={isDarkMode} />
    </Modal>
  );
};

export default InterviewMktDetailsModal;

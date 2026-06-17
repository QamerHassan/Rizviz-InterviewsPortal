import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Card, Table, Button, Space, Tag, Modal, Form, Input, Select, Typography, App,
  Tooltip, Row, Col, InputNumber, DatePicker
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  EyeOutlined, LinkOutlined, CheckCircleFilled,
  FileTextOutlined, TrophyOutlined, CloseCircleOutlined, InfoCircleOutlined,
  LockOutlined, WarningOutlined
} from '@ant-design/icons';
import {
  useGetLeadsQuery,
  useCreateOrUpdateLeadMutation,
  useDeleteLeadMutation
} from '../store/apiSlice';
import InterviewStatusBadge from '../components/interviews/InterviewStatusBadge';
import StatCard from '../components/StatCard';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const Leads = () => {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const { role } = useSelector((state) => state.auth);

  // Permissions
  const canEdit = useMemo(() => {
    return ['Admin', 'HR', 'Manager', 'Employee'].includes(role);
  }, [role]);

  // States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [intervieweeFilter, setIntervieweeFilter] = useState('All');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [activeCardFilter, setActiveCardFilter] = useState(searchParams.get('filter') || 'all');

  useEffect(() => {
    const val = searchParams.get('filter');
    if (val) {
      setActiveCardFilter(val);
    }
  }, [searchParams]);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [form] = Form.useForm();

  // API Hooks
  const { data, isLoading, isFetching, refetch } = useGetLeadsQuery({
    search: search || undefined,
    status: statusFilter === 'All' ? undefined : statusFilter,
    interviewee: intervieweeFilter === 'All' ? undefined : intervieweeFilter,
    company: companyFilter === 'All' ? undefined : companyFilter,
  });

  const [createOrUpdateLead, { isLoading: isSaving }] = useCreateOrUpdateLeadMutation();
  const [deleteLead] = useDeleteLeadMutation();

  const leadsList = data?.data || [];
  const stats = data?.stats || {
    TotalLeads: 0,
    LeadsConverted: 0,
    Rejected: 0,
    Dropped: 0,
    Closed: 0,
    Dead: 0
  };
  const dropdowns = data?.dropdowns || {
    Interviewees: [],
    Companies: []
  };

  // Stat Card click filter logic
  const filteredLeads = useMemo(() => {
    if (activeCardFilter === 'all') return leadsList;
    return leadsList.filter((lead) => {
      const status = (lead.Status || '').toLowerCase();
      if (activeCardFilter === 'converted') {
        return status === 'converted' || lead.IsConverted;
      }
      if (activeCardFilter === 'rejected') {
        return status === 'rejected' || lead.HasRejected;
      }
      if (activeCardFilter === 'dropped') {
        return status === 'dropped' || lead.HasDropped;
      }
      if (activeCardFilter === 'closed') {
        return status === 'closed';
      }
      if (activeCardFilter === 'dead') {
        return status === 'dead';
      }
      return true;
    });
  }, [leadsList, activeCardFilter]);

  // Handle Form Submit (Create/Edit)
  const handleFormSubmit = async (values) => {
    try {
      const payload = {
        CompanyName: values.companyName,
        Status: values.status,
        Interviewee: values.interviewee,
        Notes: values.notes,
        IsManual: selectedLead ? selectedLead.IsManual : true,
        Rounds: values.rounds || 0,
        LastActivity: values.lastActivity ? values.lastActivity.toDate() : undefined
      };

      await createOrUpdateLead(payload).unwrap();
      message.success(selectedLead ? 'Lead updated successfully' : 'Lead created successfully');
      setIsFormModalOpen(false);
      form.resetFields();
      setSelectedLead(null);
    } catch (err) {
      message.error(err?.data?.message || 'Failed to save lead');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (record) => {
    setSelectedLead(record);
    form.setFieldsValue({
      companyName: record.CompanyName,
      status: record.Status,
      interviewee: record.Interviewee,
      notes: record.Notes,
      rounds: record.Rounds,
      lastActivity: record.LastActivity ? dayjs(record.LastActivity) : null
    });
    setIsFormModalOpen(true);
  };

  // Open Detail Modal
  const handleOpenDetail = (record) => {
    setSelectedLead(record);
    setIsDetailModalOpen(true);
  };

  // Delete Lead Override or Manual
  const handleDeleteLead = (record) => {
    modal.confirm({
      title: 'Are you sure you want to delete this lead record?',
      content: 'This will remove the manual entries or overrides for this company. Derived data from interviews will restore if they exist.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          if (record.Id > 0) {
            await deleteLead(record.Id).unwrap();
            message.success('Lead deleted successfully');
          } else {
            message.info('Cannot delete auto-derived leads without deleting the raw interviews.');
          }
        } catch (err) {
          message.error('Failed to delete lead');
        }
      }
    });
  };

  const handleCardClick = (cardName) => {
    if (activeCardFilter === cardName) {
      setActiveCardFilter('all');
    } else {
      setActiveCardFilter(cardName);
    }
  };

  const columns = [
    {
      title: 'Interviewee / Profile',
      dataIndex: 'Interviewee',
      key: 'Interviewee',
      ellipsis: true,
      sorter: (a, b) => (a.Interviewee || '').localeCompare(b.Interviewee || ''),
      render: (text) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {text || '—'}
        </span>
      ),
    },
    {
      title: 'Company',
      dataIndex: 'CompanyName',
      key: 'CompanyName',
      sorter: (a, b) => (a.CompanyName || '').localeCompare(b.CompanyName || ''),
      render: (text) => text || '—',
    },
    {
      title: 'Status',
      dataIndex: 'Status',
      key: 'Status',
      width: 130,
      render: (s) => <InterviewStatusBadge status={s} />,
    },
    {
      title: 'Rounds',
      dataIndex: 'Rounds',
      key: 'Rounds',
      width: 90,
      align: 'center',
      sorter: (a, b) => (a.Rounds || 0) - (b.Rounds || 0),
      render: (text) => <Tag color="blue" className="m-0 font-bold">{text || 0}</Tag>,
    },
    {
      title: 'Last Activity',
      dataIndex: 'LastActivity',
      key: 'LastActivity',
      width: 140,
      sorter: (a, b) => new Date(a.LastActivity || 0) - new Date(b.LastActivity || 0),
      render: (d) => {
        if (!d) return '—';
        return dayjs(d).format('MMM D, YYYY');
      },
    },
    {
      title: 'Interviews',
      key: 'Interviews',
      width: 130,
      align: 'center',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<LinkOutlined />}
          onClick={() => navigate(`/interviews?search=${encodeURIComponent(record.CompanyName)}`)}
          style={{ color: isDarkMode ? '#818cf8' : '#4f46e5' }}
        >
          View interviews
        </Button>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 130,
      align: 'center',
      render: (_, record) => (
        <Space size={8}>
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined style={{ color: isDarkMode ? '#818cf8' : '#4f46e5' }} />}
              onClick={() => handleOpenDetail(record)}
            />
          </Tooltip>
          {canEdit && (
            <>
              <Tooltip title="Edit Lead">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined style={{ color: '#f59e0b' }} />}
                  onClick={() => handleOpenEdit(record)}
                />
              </Tooltip>
              {record.Id > 0 && (
                <Tooltip title="Delete Manual Override">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteLead(record)}
                  />
                </Tooltip>
              )}
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 8px 24px 8px' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, color: isDarkMode ? '#f1f5f9' : '#1e293b', letterSpacing: '-0.02em', fontSize: '28px' }}>
            Leads Management
          </Title>
          <Paragraph style={{ color: isDarkMode ? '#94a3b8' : '#6b7280', marginTop: '4px', fontSize: '14px', marginBottom: 0 }}>
            Leads derived automatically from Excel sync or added manually by team members.
          </Paragraph>
        </div>
        <Space size={12}>
          <Button
            icon={<ReloadOutlined spin={isFetching} />}
            onClick={() => refetch()}
            className="flex items-center rounded-xl"
          >
            Refresh
          </Button>
          {canEdit && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setSelectedLead(null);
                form.resetFields();
                setIsFormModalOpen(true);
              }}
              className="bg-[#4f46e5] hover:bg-[#4338ca] border-0 flex items-center rounded-xl font-semibold"
            >
              Create Lead
            </Button>
          )}
        </Space>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
        <StatCard
          label="Total Leads"
          value={stats.TotalLeads}
          icon={<FileTextOutlined />}
          cardBg="#f5f3ff"
          iconBg="#4f46e5"
          colProps={{ span: 24 }}
          onClick={() => handleCardClick('all')}
          dimmed={activeCardFilter !== 'all'}
          cardStyle={{
            border: activeCardFilter === 'all' ? `2px solid ${isDarkMode ? '#818cf8' : '#4f46e5'}` : undefined,
            boxShadow: activeCardFilter === 'all' ? (isDarkMode ? '0 4px 12px rgba(129, 140, 248, 0.2)' : '0 4px 12px rgba(79, 70, 229, 0.2)') : undefined,
          }}
          size="small"
        />

        <StatCard
          label="Converted"
          value={stats.LeadsConverted}
          icon={<TrophyOutlined />}
          cardBg="#ecfdf5"
          iconBg="#10B981"
          colProps={{ span: 24 }}
          onClick={() => handleCardClick('converted')}
          dimmed={activeCardFilter !== 'all' && activeCardFilter !== 'converted'}
          cardStyle={{
            border: activeCardFilter === 'converted' ? '2px solid #10B981' : undefined,
            boxShadow: activeCardFilter === 'converted' ? '0 4px 12px rgba(16, 185, 129, 0.2)' : undefined,
          }}
          size="small"
        />

        <StatCard
          label="Rejected"
          value={stats.Rejected}
          icon={<CloseCircleOutlined />}
          cardBg="#eff6ff"
          iconBg="#3b82f6"
          colProps={{ span: 24 }}
          onClick={() => handleCardClick('rejected')}
          dimmed={activeCardFilter !== 'all' && activeCardFilter !== 'rejected'}
          cardStyle={{
            border: activeCardFilter === 'rejected' ? '2px solid #3b82f6' : undefined,
            boxShadow: activeCardFilter === 'rejected' ? '0 4px 12px rgba(59, 130, 246, 0.2)' : undefined,
          }}
          size="small"
        />

        <StatCard
          label="Dropped"
          value={stats.Dropped}
          icon={<InfoCircleOutlined />}
          cardBg="#fffbeb"
          iconBg="#f59e0b"
          colProps={{ span: 24 }}
          onClick={() => handleCardClick('dropped')}
          dimmed={activeCardFilter !== 'all' && activeCardFilter !== 'dropped'}
          cardStyle={{
            border: activeCardFilter === 'dropped' ? '2px solid #f59e0b' : undefined,
            boxShadow: activeCardFilter === 'dropped' ? '0 4px 12px rgba(245, 158, 11, 0.2)' : undefined,
          }}
          size="small"
        />

        <StatCard
          label="Closed"
          value={stats.Closed}
          icon={<LockOutlined />}
          cardBg="#f8fafc"
          iconBg="#64748b"
          colProps={{ span: 24 }}
          onClick={() => handleCardClick('closed')}
          dimmed={activeCardFilter !== 'all' && activeCardFilter !== 'closed'}
          cardStyle={{
            border: activeCardFilter === 'closed' ? '2px solid #64748b' : undefined,
            boxShadow: activeCardFilter === 'closed' ? '0 4px 12px rgba(100, 116, 139, 0.2)' : undefined,
          }}
          size="small"
        />

        <StatCard
          label="Dead Leads"
          value={stats.Dead}
          icon={<WarningOutlined />}
          cardBg="#fef2f2"
          iconBg="#ef4444"
          colProps={{ span: 24 }}
          onClick={() => handleCardClick('dead')}
          dimmed={activeCardFilter !== 'all' && activeCardFilter !== 'dead'}
          cardStyle={{
            border: activeCardFilter === 'dead' ? '2px solid #ef4444' : undefined,
            boxShadow: activeCardFilter === 'dead' ? '0 4px 12px rgba(239, 68, 68, 0.2)' : undefined,
          }}
          size="small"
        />
      </div>

      {/* ── Filters Bar ── white background, same style as Interviews */}
      <Card
        className="mb-6 rounded-2xl shadow-sm border-slate-200 dark:border-slate-800"
        style={{ background: isDarkMode ? '#1e293b' : '#ffffff' }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} lg={6}>
            <Input
              placeholder="Search company, candidate, BD, status..."
              prefix={<SearchOutlined className="text-slate-400" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              className="white-search-input rounded-lg"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Any Outcome"
              value={statusFilter}
              onChange={setStatusFilter}
              className="rounded-lg"
            >
              <Option value="All">Any Outcome</Option>
              <Option value="Scheduled">Scheduled</Option>
              <Option value="Converted">Converted</Option>
              <Option value="Rejected">Rejected</Option>
              <Option value="Dropped">Dropped</Option>
              <Option value="Closed">Closed</Option>
              <Option value="Dead">Dead</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="All Interviewees"
              value={intervieweeFilter}
              onChange={setIntervieweeFilter}
              showSearch
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
              className="rounded-lg"
            >
              <Option value="All">All Profiles</Option>
              {dropdowns.Interviewees.map(iv => (
                <Option key={iv} value={iv}>{iv}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="All Companies"
              value={companyFilter}
              onChange={setCompanyFilter}
              showSearch
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
              className="rounded-lg"
            >
              <Option value="All">All Companies</Option>
              {dropdowns.Companies.map(c => (
                <Option key={c} value={c}>{c}</Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Main Table */}
      <Card className="rounded-2xl shadow-sm border-slate-200 dark:border-slate-800" styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={filteredLeads}
          rowKey={(record) => record.Id ? record.Id : `${record.Interviewee}|${record.CompanyName}`}
          loading={isLoading}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            pageSizeOptions: ['10', '15', '20', '50'],
            showTotal: (total) => `Total ${total} leads`,
          }}
          scroll={{ x: 1200 }}
          className="leads-table"
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={selectedLead ? 'Edit Lead' : 'Create Manual Lead'}
        open={isFormModalOpen}
        onCancel={() => setIsFormModalOpen(false)}
        okText={isSaving ? 'Saving...' : 'Save Lead'}
        confirmLoading={isSaving}
        onOk={() => form.submit()}
        destroyOnClose
        className="rounded-2xl"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
          initialValues={{
            status: 'Scheduled',
            rounds: 1
          }}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="companyName"
            label="Company Name"
            rules={[{ required: true, message: 'Please enter company name' }]}
          >
            <Input placeholder="e.g. Acme Corporation" disabled={selectedLead && !selectedLead.IsManual} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="status"
                label="Outcome Status"
                rules={[{ required: true, message: 'Please select status' }]}
              >
                <Select placeholder="Select Status">
                  <Option value="Scheduled">Scheduled</Option>
                  <Option value="Converted">Converted</Option>
                  <Option value="Rejected">Rejected</Option>
                  <Option value="Dropped">Dropped</Option>
                  <Option value="Closed">Closed</Option>
                  <Option value="Dead">Dead</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="rounds"
                label="Interview Rounds"
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="interviewee"
            label="Interviewee / Profile"
            rules={[{ required: true, message: 'Please enter interviewee' }]}
          >
            <Input placeholder="e.g. Ammara Liaqat" disabled={selectedLead && !selectedLead.IsManual} />
          </Form.Item>

          <Form.Item
            name="lastActivity"
            label="Last Activity Date"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Notes"
          >
            <Input.TextArea placeholder="Add custom notes, contacts, or follow-up details..." rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail View Modal */}
      <Modal
        title="Lead Details"
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>Close</Button>,
          <Button
            key="interviews"
            type="primary"
            icon={<LinkOutlined />}
            onClick={() => {
              setIsDetailModalOpen(false);
              navigate(`/interviews?search=${encodeURIComponent(selectedLead?.CompanyName)}`);
            }}
          >
            View raw interviews
          </Button>
        ]}
        width={600}
        destroyOnClose
      >
        {selectedLead && (
          <div style={{ padding: '12px 0' }}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <span style={{ fontSize: 20, fontWeight: 'bold' }}>{selectedLead.CompanyName}</span>
                <div style={{ marginTop: 4 }}>
                  {selectedLead.IsManual ? (
                    <Tag color="cyan">Manually Entered</Tag>
                  ) : (
                    <Tag color="blue">Auto Derived ({selectedLead.Rounds} Interview Rounds)</Tag>
                  )}
                </div>
              </div>
              <InterviewStatusBadge status={selectedLead.Status} />
            </div>

            <Row gutter={[0, 16]} className="mb-4">
              <Col span={24}>
                <div className="flex flex-col">
                  <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Interviewee / Profile</span>
                  <span style={{ fontSize: 15 }} className="font-semibold text-slate-700 dark:text-slate-300">
                    {selectedLead.Interviewee || '—'}
                  </span>
                </div>
              </Col>

              <Col span={12}>
                <div className="flex flex-col">
                  <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Last Activity</span>
                  <span style={{ fontSize: 14 }}>
                    {selectedLead.LastActivity ? dayjs(selectedLead.LastActivity).format('MMMM D, YYYY') : '—'}
                  </span>
                </div>
              </Col>

              <Col span={12}>
                <div className="flex flex-col">
                  <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Converted Outcome</span>
                  <span style={{ fontSize: 14 }}>
                    {selectedLead.IsConverted || selectedLead.Status?.toLowerCase() === 'converted' ? (
                      <Tag color="success">Yes</Tag>
                    ) : (
                      <Tag color="default">No</Tag>
                    )}
                  </span>
                </div>
              </Col>
            </Row>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider block mb-2">Lead Notes</span>
              <div
                style={{
                  background: isDarkMode ? '#1e293b' : '#f8fafc',
                  padding: 12,
                  borderRadius: 8,
                  minHeight: 80,
                  whiteSpace: 'pre-line'
                }}
              >
                {selectedLead.Notes || 'No custom notes provided for this lead. You can click Edit to add notes.'}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Leads;

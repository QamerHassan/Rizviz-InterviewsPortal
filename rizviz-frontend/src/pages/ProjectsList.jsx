import React, { useState } from 'react';
import {
  Card, Row, Col, Typography, Button, Space, Tag, Modal, Form, Input, DatePicker, InputNumber, Select, Table, message, Divider, Alert
} from 'antd';
import {
  PlusOutlined, UserAddOutlined, TeamOutlined, DollarCircleOutlined, CalendarOutlined,
  AppstoreOutlined, CheckCircleOutlined, SearchOutlined, TableOutlined
} from '@ant-design/icons';
import {
  useGetProjectsQuery, useGetProjectStatsQuery, useCreateProjectMutation,
  useAssignProjectMemberMutation, useGetEmployeesQuery
} from '../store/apiSlice';
import { useSelector } from 'react-redux';
import StatCard from '../components/StatCard';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : 'N/A');

const statusColor = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('progress')) return 'processing';
  if (s.includes('complet') || s.includes('closed')) return 'success';
  if (s.includes('hold')) return 'warning';
  return 'default';
};

const ProjectsList = () => {
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const [search, setSearch] = useState('');
  const [statFilter, setStatFilter] = useState('all');
  const [viewMode, setViewMode] = useState('cards');
  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [isAssignVisible, setIsAssignVisible] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [createForm] = Form.useForm();
  const [assignForm] = Form.useForm();

  const { data: stats } = useGetProjectStatsQuery();
  const { data: projects = [], isLoading, refetch } = useGetProjectsQuery({
    metric: statFilter === 'all' ? '' : statFilter,
    search,
  });
  const { data: employees = [] } = useGetEmployeesQuery();
  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();
  const [assignMember, { isLoading: isAssigning }] = useAssignProjectMemberMutation();

  const totalProjects = stats?.Total ?? stats?.total ?? 0;
  const activeProjects = stats?.Active ?? stats?.active ?? 0;
  const totalAllocations = stats?.ResourceAllocations ?? stats?.resourceAllocations ?? 0;

  const statFilterLabels = {
    all: 'All projects from UAT',
    active: 'In-progress initiatives only',
    allocations: 'Projects with at least one team member',
  };

  const handleStatCardClick = (filter) => {
    setStatFilter((prev) => (prev === filter ? 'all' : filter));
  };

  const handleCreateSubmit = async (values) => {
    try {
      const dates = values.duration;
      await createProject({
        name: values.name,
        clientName: values.clientName,
        description: values.description,
        budget: values.budget,
        startDate: dates ? dates[0].toDate() : new Date(),
        endDate: dates ? dates[1].toDate() : new Date(),
      }).unwrap();
      message.success('Project created successfully.');
      setIsCreateVisible(false);
      createForm.resetFields();
      refetch();
    } catch (err) {
      message.error(err?.data?.message || 'Failed to create project.');
    }
  };

  const handleAssignSubmit = async (values) => {
    try {
      await assignMember({
        projectId: selectedProjectId,
        member: {
          employeeId: values.employeeId,
          roleInProject: values.roleInProject,
          allocationPercentage: values.allocationPercentage,
        },
      }).unwrap();
      message.success('Team member assigned to project.');
      setIsAssignVisible(false);
      assignForm.resetFields();
      refetch();
    } catch (err) {
      message.error(err?.data?.message || 'Failed to assign team member.');
    }
  };

  const openAssignModal = (projId) => {
    setSelectedProjectId(projId);
    setIsAssignVisible(true);
  };

  const labelColor = isDarkMode ? '#94a3b8' : '#6b7280';
  const strongColor = isDarkMode ? '#e2e8f0' : '#1e293b';

  const tableColumns = [
    { title: 'Code', dataIndex: 'ProjectCode', key: 'ProjectCode', width: 90, render: (t) => <span className="font-mono font-bold">{t}</span> },
    { title: 'Project Name', dataIndex: 'Name', key: 'Name', ellipsis: true, render: (t) => <span className="font-semibold">{t}</span> },
    { title: 'Client', dataIndex: 'ClientName', key: 'ClientName', width: 120, ellipsis: true },
    { title: 'Status', dataIndex: 'Status', key: 'Status', width: 110, render: (s) => <Tag color={statusColor(s)}>{s}</Tag> },
    { title: 'Team', key: 'team', width: 70, render: (_, r) => r.Members?.length ?? 0 },
    { title: 'Start', dataIndex: 'StartDate', key: 'StartDate', width: 100, render: formatDate },
    { title: 'End', dataIndex: 'EndDate', key: 'EndDate', width: 100, render: formatDate },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button type="link" size="small" icon={<UserAddOutlined />} onClick={() => openAssignModal(record.Id || record.id)}>
          Assign
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>
            Project Resource Management
            {!isLoading && totalProjects > 0 && (
              <span style={{ fontSize: 16, fontWeight: 500, color: '#64748b', marginLeft: 8 }}>
                ({totalProjects} from UAT database)
              </span>
            )}
          </Title>
          <Paragraph type="secondary" style={{ margin: 0, fontSize: 13, color: labelColor }}>
            Live data from <code>mkt.Projects</code> and <code>project_stakeholders</code> — click a summary card to filter
          </Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateVisible(true)}
          className="bg-[#4f46e5] hover:bg-[#4338ca] border-none font-semibold shadow-sm"
          style={{ borderRadius: '9999px', padding: '0 20px' }}>
          Create Project
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        <StatCard
          label="TOTAL PROJECTS"
          value={totalProjects}
          icon={<AppstoreOutlined />}
          cardBg="#f5f3ff"
          iconBg="#4f46e5"
          colProps={{ span: 24 }}
          onClick={() => handleStatCardClick('all')}
          active={statFilter === 'all'}
          size="small"
        />
        <StatCard
          label="ACTIVE INITIATIVES"
          value={activeProjects}
          icon={<CheckCircleOutlined />}
          cardBg="#ecfdf5"
          iconBg="#059669"
          colProps={{ span: 24 }}
          onClick={() => handleStatCardClick('active')}
          active={statFilter === 'active'}
          size="small"
        />
        <StatCard
          label="RESOURCE ALLOCATIONS"
          value={totalAllocations}
          icon={<TeamOutlined />}
          cardBg="#eff6ff"
          iconBg="#2563eb"
          colProps={{ span: 24 }}
          onClick={() => handleStatCardClick('allocations')}
          active={statFilter === 'allocations'}
          size="small"
        />
      </div>

      {statFilter !== 'all' && (
        <Paragraph className="!mb-0 text-xs font-semibold" style={{ color: isDarkMode ? '#818cf8' : '#4f46e5' }}>
          Showing {projects.length} projects · {statFilterLabels[statFilter]} (click again to clear)
        </Paragraph>
      )}

      <Alert
        type="info"
        showIcon
        className="!mb-0"
        message="Connected to live UAT. Team members come from project_stakeholders linked to employees."
      />

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search project, client, code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ maxWidth: 360 }}
          className="pill-input white-search-input"
        />
        <Space>
          <Button type={viewMode === 'cards' ? 'primary' : 'default'} icon={<AppstoreOutlined />} onClick={() => setViewMode('cards')}
            className={viewMode === 'cards' ? 'bg-[#4f46e5] border-none' : ''}>
            Cards
          </Button>
          <Button type={viewMode === 'table' ? 'primary' : 'default'} icon={<TableOutlined />} onClick={() => setViewMode('table')}
            className={viewMode === 'table' ? 'bg-[#4f46e5] border-none' : ''}>
            Table
          </Button>
        </Space>
      </div>

      {isLoading ? (
        <div className="text-center py-12" style={{ color: labelColor }}>Loading project data from UAT...</div>
      ) : projects.length === 0 ? (
        <Card className="text-center py-16">
          <Title level={4}>No projects match this filter</Title>
          <Text type="secondary">Try clearing the card filter or search term.</Text>
        </Card>
      ) : viewMode === 'table' ? (
        <Card variant="borderless" className="shadow-sm rounded-2xl overflow-hidden" styles={{ body: { padding: 0 } }}>
          <Table
            columns={tableColumns}
            dataSource={projects}
            rowKey={(r) => r.Id || r.id}
            pagination={{ defaultPageSize: 20, showSizeChanger: true, pageSizeOptions: ['20', '50', '100', '184'] }}
            scroll={{ x: 900 }}
            size="middle"
          />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {projects.map((project) => (
            <Col xs={24} lg={12} xl={8} key={project.Id || project.id}>
              <Card
                title={
                  <div className="flex items-center justify-between py-1 gap-2">
                    <span className="truncate font-bold" style={{ color: strongColor }}>{project.Name}</span>
                    <Tag color={statusColor(project.Status)} className="font-semibold uppercase text-xs shrink-0">{project.Status}</Tag>
                  </div>
                }
                variant="borderless"
                className="shadow-sm hover:shadow-md transition-shadow h-full"
                actions={[
                  <Button key="assign" type="text" icon={<UserAddOutlined />} onClick={() => openAssignModal(project.Id || project.id)}
                    style={{ fontWeight: 600, color: isDarkMode ? '#818cf8' : '#2563eb' }}>
                    Assign Resource
                  </Button>,
                ]}
              >
                <div className="space-y-3">
                  <div className="text-xs font-mono font-bold" style={{ color: labelColor }}>
                    {project.ProjectCode}
                    {project.ClientName && <span className="ml-2 font-sans">· {project.ClientName}</span>}
                  </div>
                  <p className="text-sm leading-relaxed line-clamp-3 min-h-[40px]" style={{ color: labelColor }}>
                    {project.Description || 'No description in UAT.'}
                  </p>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Text type="secondary" style={{ fontSize: 11 }}><DollarCircleOutlined /> Budget / Days</Text>
                      <div className="font-semibold text-sm">{project.Budget ? Number(project.Budget).toLocaleString() : '—'}</div>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary" style={{ fontSize: 11 }}><CalendarOutlined /> Timeline</Text>
                      <div className="font-semibold text-sm">{formatDate(project.StartDate)} – {formatDate(project.EndDate)}</div>
                    </Col>
                  </Row>
                  <Divider style={{ margin: '8px 0' }} />
                  <div className="flex items-center gap-2">
                    <TeamOutlined style={{ color: labelColor }} />
                    <span className="font-bold text-sm" style={{ color: isDarkMode ? '#c4b5fd' : '#4b5563' }}>
                      Team ({project.Members?.length || 0})
                    </span>
                  </div>
                  {project.Members && project.Members.length > 0 ? (
                    <Table
                      dataSource={project.Members.slice(0, 5)}
                      rowKey={(record, i) => `${record.EmployeeId}-${i}`}
                      size="small"
                      pagination={false}
                      columns={[
                        { title: 'Name', dataIndex: 'EmployeeName', ellipsis: true, render: (t) => <span className="font-semibold text-xs">{t}</span> },
                        { title: 'Role', dataIndex: 'RoleInProject', width: 80, render: (t) => <span className="text-xs">{t}</span> },
                        { title: '%', dataIndex: 'AllocationPercentage', width: 50, render: (pct) => <Tag color={pct >= 80 ? 'red' : 'green'} className="text-xs">{pct}%</Tag> },
                      ]}
                    />
                  ) : (
                    <Text type="secondary" className="text-xs italic">No stakeholders assigned in UAT.</Text>
                  )}
                  {(project.Members?.length || 0) > 5 && (
                    <Text type="secondary" className="text-xs">+{project.Members.length - 5} more members</Text>
                  )}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal title="Create New Project" open={isCreateVisible} onCancel={() => setIsCreateVisible(false)} footer={null}>
        <Form form={createForm} layout="vertical" onFinish={handleCreateSubmit} requiredMark="optional">
          <Form.Item name="name" label="Project Name" rules={[{ required: true, message: 'Name required' }]}>
            <Input placeholder="e.g. ERP Cloud Web Interface" />
          </Form.Item>
          <Form.Item name="clientName" label="Client Name" rules={[{ required: true, message: 'Client name required' }]}>
            <Input placeholder="Client Company Name" />
          </Form.Item>
          <Form.Item name="duration" label="Project Timeline" rules={[{ required: true, message: 'Duration required' }]}>
            <RangePicker className="w-full" />
          </Form.Item>
          <Form.Item name="budget" label="Project Budget (PKR)" rules={[{ required: true, message: 'Budget required' }]}>
            <InputNumber className="w-full" min={0} placeholder="Project Cost Limit" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Outline goals, stack details, or milestones" />
          </Form.Item>
          <div className="flex justify-end space-x-2 pt-4">
            <Button onClick={() => setIsCreateVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={isCreating} className="bg-[#4f46e5] border-none font-semibold">Create Project</Button>
          </div>
        </Form>
      </Modal>

      <Modal title="Assign Project Team Member" open={isAssignVisible} onCancel={() => setIsAssignVisible(false)} footer={null}>
        <Form form={assignForm} layout="vertical" onFinish={handleAssignSubmit}>
          <Form.Item name="employeeId" label="Employee" rules={[{ required: true, message: 'Please select employee!' }]}>
            <Select placeholder="Select Employee" showSearch optionFilterProp="children">
              {employees.map((e) => (
                <Option key={e.Id || e.id} value={e.Id || e.id}>{e.FullName} ({e.EmpCode})</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="roleInProject" label="Role in Project" rules={[{ required: true, message: 'Select role!' }]}>
            <Select placeholder="Select Role">
              <Option value="Lead Developer">Lead Developer</Option>
              <Option value="Full Stack Developer">Full Stack Developer</Option>
              <Option value="QA Automation Engineer">QA Automation Engineer</Option>
              <Option value="Project Coordinator">Project Coordinator</Option>
            </Select>
          </Form.Item>
          <Form.Item name="allocationPercentage" label="Allocation Percentage (%)" rules={[{ required: true, message: 'Input allocation' }]}>
            <InputNumber className="w-full" min={10} max={100} placeholder="e.g. 50" />
          </Form.Item>
          <div className="flex justify-end space-x-2 pt-4">
            <Button onClick={() => setIsAssignVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={isAssigning} className="bg-[#4f46e5] border-none font-semibold">Assign Resource</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectsList;

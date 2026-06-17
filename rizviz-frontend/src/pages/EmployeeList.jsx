import React, { useState } from 'react';
import { Table, Input, Button, Space, Select, Popconfirm, Card, Typography, Tooltip, message, Row, Col } from 'antd';
import { SearchOutlined, UserAddOutlined, EditOutlined, DeleteOutlined, DownloadOutlined, ClearOutlined, UserOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useGetEmployeesQuery, useGetEmployeeStatsQuery, useDeleteEmployeeMutation, useGetBranchesQuery, useGetDropdownsQuery } from '../store/apiSlice';
import { useSelector } from 'react-redux';
import { selectCanEdit } from '../store/authSlice';
import StatCard from '../components/StatCard';

const { Title, Paragraph } = Typography;

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Probation', label: 'Probation' },
  { value: 'In Active', label: 'In Active' },
  { value: 'Suspended', label: 'Suspended' },
  { value: 'Exit in Progress', label: 'Exit in Progress' },
  { value: 'Resigned', label: 'Resigned' },
  { value: 'Terminated', label: 'Terminated' },
  { value: 'Internal Transferred', label: 'Internal Transferred' },
];

const statusTagStyle = (status, isDarkMode) => {
  const s = status || '';
  let dotColor = '#10B981';
  let bgColor = isDarkMode ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.06)';
  let textColor = isDarkMode ? '#34d399' : '#047857';

  if (['Suspended', 'In Active', 'Exit in Progress', 'Probation'].includes(s)) {
    dotColor = '#F59E0B';
    bgColor = isDarkMode ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.06)';
    textColor = isDarkMode ? '#fbbf24' : '#B45309';
  } else if (['Terminated', 'Resigned', 'Internal Transferred'].includes(s)) {
    dotColor = '#EF4444';
    bgColor = isDarkMode ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.06)';
    textColor = isDarkMode ? '#f87171' : '#B91C1C';
  }

  return { dotColor, bgColor, textColor };
};

const EmployeeList = () => {
  const navigate = useNavigate();
  const { companyCode } = useSelector((state) => state.auth);
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const canEdit = useSelector(selectCanEdit);

  const [search, setSearch] = useState('');
  const [branchCode, setBranchCode] = useState(undefined);
  const [status, setStatus] = useState(undefined);
  const [statusGroup, setStatusGroup] = useState('all');

  const { data: stats } = useGetEmployeeStatsQuery();
  const { data: employeesRaw = [], isLoading, isFetching } = useGetEmployeesQuery({
    search, branchCode, status, statusGroup: statusGroup === 'all' ? undefined : statusGroup,
  });
  const employees = Array.isArray(employeesRaw) ? employeesRaw : [];

  const { data: branches = [] } = useGetBranchesQuery(companyCode);
  const { data: statusDropdowns = [] } = useGetDropdownsQuery('Status');
  const [deleteEmployee, { isLoading: isDeleting }] = useDeleteEmployeeMutation();

  const totalCount = stats?.Total ?? stats?.total ?? 0;
  const activeCount = stats?.Active ?? stats?.active ?? 0;
  const suspendedCount = stats?.SuspendedLeave ?? stats?.suspendedLeave ?? 0;
  const terminatedCount = stats?.Terminated ?? stats?.terminated ?? 0;

  const statusFilterOptions = Array.isArray(statusDropdowns) && statusDropdowns.length > 0
    ? statusDropdowns.map(d => ({ value: d.key || d.Key || d.value || d.Value, label: d.value || d.Value || d.key || d.Key }))
    : STATUS_OPTIONS;

  const handleClearFilters = () => {
    setSearch('');
    setBranchCode(undefined);
    setStatus(undefined);
    setStatusGroup('all');
  };

  const handleStatCardClick = (group) => {
    setStatus(undefined);
    setStatusGroup((prev) => (prev === group ? 'all' : group));
  };

  const handleDelete = async (id) => {
    try {
      await deleteEmployee(id).unwrap();
      message.success('Employee deleted successfully.');
    } catch (err) {
      message.error(err?.data?.message || 'Failed to delete employee.');
    }
  };

  const handleExportExcel = () => {
    if (employees.length === 0) { message.warning('No data to export.'); return; }
    const exportData = employees.map((emp) => ({
      'Employee Code': emp.EmpCode, 'Full Name': emp.FullName, 'CNIC': emp.CNIC,
      'Grade': emp.Grade, 'Employee Type': emp.Type, 'Status': emp.Status,
      'Gender': emp.Gender, 'IT / Non-IT': emp.ItOrNonIt, 'Department': emp.Department,
      'Designation': emp.Designation, 'Basic Salary': emp.BasicSalary,
      'Joining Date': emp.JoiningDate ? new Date(emp.JoiningDate).toLocaleDateString() : '',
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    const maxLens = {};
    exportData.forEach(row => { Object.keys(row).forEach(key => { const valStr = String(row[key] || ''); maxLens[key] = Math.max(maxLens[key] || 10, valStr.length, key.length); }); });
    worksheet['!cols'] = Object.keys(maxLens).map(key => ({ wch: maxLens[key] + 3 }));
    XLSX.writeFile(workbook, `Employee_List_${new Date().toISOString().split('T')[0]}.xlsx`);
    message.success('Employee list exported to Excel successfully.');
  };

  const columns = [
    {
      title: 'Emp Code', dataIndex: 'EmpCode', key: 'EmpCode',
      sorter: (a, b) => String(a.EmpCode).localeCompare(String(b.EmpCode)),
      render: (code) => <span className="font-mono font-bold">{code}</span>,
    },
    {
      title: 'Full Name', dataIndex: 'FullName', key: 'FullName',
      sorter: (a, b) => a.FullName.localeCompare(b.FullName),
      render: (name) => <span className="font-semibold">{name}</span>,
    },
    { title: 'CNIC', dataIndex: 'CNIC', key: 'CNIC' },
    { title: 'Department', dataIndex: 'Department', key: 'Department' },
    { title: 'Designation', dataIndex: 'Designation', key: 'Designation' },
    {
      title: 'Status', dataIndex: 'Status', key: 'Status',
      render: (statusVal) => {
        const { dotColor, bgColor, textColor } = statusTagStyle(statusVal, isDarkMode);
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ backgroundColor: bgColor, color: textColor }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
            {statusVal}
          </span>
        );
      },
    },
    {
      title: 'Action', key: 'action',
      hidden: !canEdit,
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Edit Profile">
            <Button type="text" icon={<EditOutlined className="text-blue-500" />}
              onClick={() => navigate(`/employees/edit/${record.Id || record.id}`)} />
          </Tooltip>
          <Tooltip title="Delete Employee">
            <Popconfirm title="Are you sure to delete this employee?"
              onConfirm={() => handleDelete(record.Id || record.id)}
              okText="Yes" cancelText="No" okButtonProps={{ loading: isDeleting, danger: true }}>
              <Button type="text" icon={<DeleteOutlined className="text-red-500" />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ].filter(col => !col.hidden);

  const branchOptions = Array.isArray(branches)
    ? branches.map(b => ({ value: b.branchCode || b.BranchCode, label: b.name || b.Name }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>
            Employee Directory
            {!isLoading && totalCount > 0 && (
              <span style={{ fontSize: 16, fontWeight: 500, color: '#64748b', marginLeft: 8 }}>
                ({totalCount} from UAT database)
              </span>
            )}
          </Title>
          <Paragraph type="secondary" style={{ margin: 0, fontSize: 13, color: isDarkMode ? '#94a3b8' : '#64748b' }}>
            Click a summary card to filter the table. Counts come from live HRMS status codes.
          </Paragraph>
        </div>
        <div className="flex flex-col xs:flex-row gap-2">
          {canEdit && (
            <Button type="primary" icon={<UserAddOutlined />} onClick={() => navigate('/employees/new')}
              className="bg-[#4f46e5] hover:bg-[#4338ca] border-none font-semibold shadow-sm"
              style={{ borderRadius: '9999px', padding: '0 20px' }}>
              Add Employee
            </Button>
          )}
          <Button type="default" icon={<DownloadOutlined />} onClick={handleExportExcel}
            className="font-semibold shadow-sm" style={{ borderRadius: '9999px', padding: '0 20px' }}>
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <StatCard
          label="TOTAL EMPLOYEES"
          value={totalCount}
          icon={<UserOutlined />}
          cardBg="#f5f3ff"
          iconBg="#4f46e5"
          colProps={{ span: 24 }}
          onClick={() => handleStatCardClick('all')}
          active={statusGroup === 'all' && !status}
          size="small"
        />
        <StatCard
          label="ACTIVE STAFF"
          value={activeCount}
          icon={<CheckCircleOutlined />}
          cardBg="#ecfdf5"
          iconBg="#059669"
          colProps={{ span: 24 }}
          onClick={() => handleStatCardClick('active')}
          active={statusGroup === 'active'}
          size="small"
        />
        <StatCard
          label="SUSPENDED / LEAVE"
          value={suspendedCount}
          icon={<WarningOutlined />}
          cardBg="#fffbeb"
          iconBg="#d97706"
          colProps={{ span: 24 }}
          onClick={() => handleStatCardClick('suspended')}
          active={statusGroup === 'suspended'}
          size="small"
        />
        <StatCard
          label="TERMINATED"
          value={terminatedCount}
          icon={<CloseCircleOutlined />}
          cardBg="#fef2f2"
          iconBg="#ef4444"
          colProps={{ span: 24 }}
          onClick={() => handleStatCardClick('terminated')}
          active={statusGroup === 'terminated'}
          size="small"
        />
      </div>

      <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 16 }}>
        <Row gutter={[12, 12]} className="mb-5">
          <Col xs={24} sm={8} md={7}>
            <Input placeholder="Search Name, Code, CNIC..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={search} onChange={(e) => setSearch(e.target.value)}
              allowClear className="w-full pill-input white-search-input" />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Select placeholder="Filter by Branch" value={branchCode} onChange={setBranchCode}
              options={branchOptions}
              allowClear className="w-full pill-select" />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Select
              placeholder="Filter by Status"
              value={status}
              onChange={(v) => { setStatus(v); setStatusGroup('all'); }}
              options={statusFilterOptions}
              allowClear
              className="w-full pill-select"
            />
          </Col>
          {(search || branchCode || status || statusGroup !== 'all') && (
            <Col xs={24} md={5} className="flex items-center">
              <Button type="text" danger icon={<ClearOutlined />} onClick={handleClearFilters}
                className="font-semibold text-xs rounded-full px-3">
                Clear Filters
              </Button>
            </Col>
          )}
        </Row>

        {(statusGroup !== 'all' || status) && (
          <Paragraph className="!mb-4 text-xs font-semibold" style={{ color: isDarkMode ? '#818cf8' : '#4f46e5' }}>
            Showing {employees.length} employee{employees.length === 1 ? '' : 's'}
            {statusGroup !== 'all' ? ` · card filter: ${statusGroup}` : ''}
            {status ? ` · status: ${status}` : ''}
          </Paragraph>
        )}

        <div style={{ overflowX: 'auto' }}>
          <Table
            columns={columns}
            dataSource={employees}
            rowKey={(record) => record.Id || record.id}
            loading={isLoading || isFetching}
            pagination={{ defaultPageSize: 10, showSizeChanger: true, responsive: true }}
            scroll={{ x: 700 }}
            size="middle"
          />
        </div>
      </Card>
    </div>
  );
};

export default EmployeeList;

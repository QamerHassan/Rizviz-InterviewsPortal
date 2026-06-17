import React, { useState } from 'react';
import { Card, Table, Tag, Button, Space, Modal, Form, Input, InputNumber, Select, DatePicker, Typography, message, Row, Col, Alert } from 'antd';
import { PlusOutlined, UserAddOutlined, RollbackOutlined, LaptopOutlined, CheckCircleOutlined, CodeSandboxOutlined, UserOutlined } from '@ant-design/icons';
import { useGetAssetsQuery, useCreateAssetMutation, useAssignAssetMutation, useReturnAssetMutation, useGetEmployeesQuery } from '../store/apiSlice';
import { useSelector } from 'react-redux';
import { selectCanEdit } from '../store/authSlice';
import StatCard from '../components/StatCard';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;
const { Option } = Select;

const InventoryList = () => {
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const canEdit = useSelector(selectCanEdit);

  const [isRegisterVisible, setIsRegisterVisible] = useState(false);
  const [isAssignVisible, setIsAssignVisible] = useState(false);
  const [isReturnVisible, setIsReturnVisible] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const [registerForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [returnForm] = Form.useForm();

  const { data: assets = [], isLoading, refetch } = useGetAssetsQuery();
  const { data: employees = [] } = useGetEmployeesQuery();
  const [createAsset, { isLoading: isCreating }] = useCreateAssetMutation();
  const [assignAsset, { isLoading: isAssigning }] = useAssignAssetMutation();
  const [returnAsset, { isLoading: isReturning }] = useReturnAssetMutation();

  const handleRegisterSubmit = async (values) => {
    try {
      await createAsset(values).unwrap();
      message.success('Asset registered successfully.');
      setIsRegisterVisible(false);
      registerForm.resetFields();
      refetch();
    } catch { message.error('Failed to register asset.'); }
  };

  const handleAssignSubmit = async (values) => {
    try {
      await assignAsset({ assetId: selectedAsset.Id || selectedAsset.id, employeeId: values.employeeId, assignedDate: values.assignedDate.toDate(), condition: values.condition }).unwrap();
      message.success('Asset assigned successfully.');
      setIsAssignVisible(false);
      assignForm.resetFields();
      refetch();
    } catch { message.error('Asset assignment failed.'); }
  };

  const handleReturnSubmit = async (values) => {
    try {
      await returnAsset({ assignmentId: selectedAsset.Id || selectedAsset.id, condition: values.condition }).unwrap();
      message.success('Asset returned to inventory.');
      setIsReturnVisible(false);
      returnForm.resetFields();
      refetch();
    } catch { message.error('Failed to return asset.'); }
  };

  const columns = [
    { title: 'Asset Code', dataIndex: 'AssetCode', key: 'AssetCode', render: (text) => <span className="font-mono font-bold">{text}</span> },
    { title: 'Asset Name', dataIndex: 'Name', key: 'Name', render: (text) => <span className="font-semibold">{text}</span> },
    { title: 'Category', dataIndex: 'Category', key: 'Category' },
    { title: 'Serial Number', dataIndex: 'SerialNumber', key: 'SerialNumber' },
    { title: 'Purchase Value', dataIndex: 'Value', render: (val) => `PKR ${val?.toLocaleString() ?? 0}` },
    {
      title: 'Status', dataIndex: 'Status',
      render: (status) => {
        let color = 'green';
        if (status === 'Assigned') color = 'blue';
        if (status === 'Maintenance' || status === 'In Repair' || status === 'Under Maintenance') color = 'orange';
        if (status === 'Cancelled' || status === 'Scrapped') color = 'red';
        return <Tag color={color} className="font-semibold uppercase text-xs">{status || '—'}</Tag>;
      },
    },
    {
      title: 'Assigned To', dataIndex: 'AssignedToEmployeeName',
      render: (name) => name
        ? <span style={{ color: isDarkMode ? '#c4b5fd' : '#4f46e5', fontWeight: 600 }}>{name}</span>
        : <span style={{ color: isDarkMode ? '#64748b' : '#9ca3af' }}>Available</span>,
    },
    canEdit && {
      title: 'Actions', key: 'actions',
      render: (_, record) => (
        <Space size="small">
          {record.Status === 'Available' ? (
            <Button type="primary" size="small" icon={<UserAddOutlined />}
              onClick={() => { setSelectedAsset(record); setIsAssignVisible(true); }}
              className="bg-blue-600 hover:bg-blue-700 border-none font-semibold flex items-center">
              Assign
            </Button>
          ) : (
            <Button type="default" size="small" icon={<RollbackOutlined />}
              onClick={() => { setSelectedAsset(record); setIsReturnVisible(true); }}
              className="font-semibold flex items-center">
              Return
            </Button>
          )}
        </Space>
      ),
    },
  ].filter(Boolean);

  const normStatus = (s) => (s || '').trim();
  const isMaintenance = (s) => {
    const t = normStatus(s).toLowerCase();
    return t === 'maintenance' || t === 'in repair' || t === 'under maintenance';
  };
  const totalAssetsCount = assets.length;
  const assignedCount = assets.filter((a) => normStatus(a.Status) === 'Assigned').length;
  const availableCount = assets.filter((a) => normStatus(a.Status) === 'Available').length;
  const maintenanceCount = assets.filter((a) => isMaintenance(a.Status)).length;
  const filteredAssets = assets.filter((a) => {
    if (statusFilter === 'assigned') return normStatus(a.Status) === 'Assigned';
    if (statusFilter === 'available') return normStatus(a.Status) === 'Available';
    if (statusFilter === 'maintenance') return isMaintenance(a.Status);
    return true;
  });

  const handleStatusCardClick = (filter) => {
    setStatusFilter((prev) => (prev === filter ? 'all' : filter));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>
            Asset Inventory Register
          </Title>
          <Paragraph type="secondary" style={{ margin: 0, fontSize: 13, color: isDarkMode ? '#94a3b8' : '#64748b' }}>
            Live data from Accounting_System_UAT — inventory.assets &amp; inventory sheet.
          </Paragraph>
        </div>
        {canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsRegisterVisible(true)}
            className="bg-[#4f46e5] hover:bg-[#4338ca] border-none font-semibold shadow-sm"
            style={{ borderRadius: '9999px', padding: '0 20px' }}>
            Register Asset
          </Button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <StatCard
          label="TOTAL TRACKED"
          value={totalAssetsCount}
          icon={<LaptopOutlined />}
          cardBg="#fffbeb"
          iconBg="#d97706"
          colProps={{ span: 24 }}
          onClick={() => handleStatusCardClick('all')}
          active={statusFilter === 'all'}
          size="small"
        />
        <StatCard
          label="ASSIGNED"
          value={assignedCount}
          icon={<UserOutlined />}
          cardBg="#eff6ff"
          iconBg="#2563eb"
          colProps={{ span: 24 }}
          onClick={() => handleStatusCardClick('assigned')}
          active={statusFilter === 'assigned'}
          size="small"
        />
        <StatCard
          label="AVAILABLE"
          value={availableCount}
          icon={<CheckCircleOutlined />}
          cardBg="#ecfdf5"
          iconBg="#059669"
          colProps={{ span: 24 }}
          onClick={() => handleStatusCardClick('available')}
          active={statusFilter === 'available'}
          size="small"
        />
        <StatCard
          label="MAINTENANCE"
          value={maintenanceCount}
          icon={<CodeSandboxOutlined />}
          cardBg="#f5f3ff"
          iconBg="#4f46e5"
          colProps={{ span: 24 }}
          onClick={() => handleStatusCardClick('maintenance')}
          active={statusFilter === 'maintenance'}
          size="small"
        />
      </div>

      <Alert
        type="info"
        showIcon
        className="!mb-0"
        title="Asset data is loaded from UAT (inventory.assets). Stat cards and the table update automatically on page load."
      />

      {/* Table */}
      <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 16 }}>
        <div style={{ overflowX: 'auto' }}>
          <Table columns={columns} dataSource={filteredAssets}
            rowKey={(record) => record.Id || record.id}
            loading={isLoading}
            pagination={{ defaultPageSize: 10, responsive: true }}
            scroll={{ x: 700 }} size="middle" />
        </div>
      </Card>

      {/* Register Modal */}
      <Modal title="Register New Hardware Asset" open={isRegisterVisible}
        onCancel={() => setIsRegisterVisible(false)} footer={null}>
        <Form form={registerForm} layout="vertical" onFinish={handleRegisterSubmit} requiredMark="optional">
          <Form.Item name="Name" label="Asset Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input placeholder="e.g. Dell Latitude 5420" />
          </Form.Item>
          <Row gutter={[12, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item name="Category" label="Category" rules={[{ required: true, message: 'Category is required' }]}>
                <Select placeholder="Select Category">
                  <Option value="Laptop">Laptop Computer</Option>
                  <Option value="SIM">SIM Card / Mobile</Option>
                  <Option value="Vehicle">Company Vehicle</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="SerialNumber" label="Serial Number" rules={[{ required: true, message: 'Serial number required' }]}>
                <Input placeholder="SN / Asset Tag" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="Value" label="Purchase Value (PKR)" rules={[{ required: true, message: 'Value is required' }]}>
            <InputNumber className="w-full" min={0} placeholder="Asset Cost" />
          </Form.Item>
          <Form.Item name="Remarks" label="Remarks">
            <Input.TextArea placeholder="Condition details or warranty description" />
          </Form.Item>
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4">
            <Button onClick={() => setIsRegisterVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={isCreating} className="bg-[#4f46e5] hover:bg-[#4338ca] border-none font-semibold">Register</Button>
          </div>
        </Form>
      </Modal>

      {/* Assign Modal */}
      <Modal title={`Assign Asset: ${selectedAsset?.Name}`} open={isAssignVisible}
        onCancel={() => setIsAssignVisible(false)} footer={null}>
        <Form form={assignForm} layout="vertical" onFinish={handleAssignSubmit}>
          <Form.Item name="employeeId" label="Assign to Employee" rules={[{ required: true, message: 'Please select employee!' }]}>
            <Select placeholder="Select Employee" showSearch optionFilterProp="children">
              {employees.map(e => <Option key={e.Id || e.id} value={e.Id || e.id}>{e.FullName} ({e.EmpCode})</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="assignedDate" label="Assignment Date" rules={[{ required: true, message: 'Please select date' }]}>
            <DatePicker className="w-full" defaultPickerValue={dayjs()} />
          </Form.Item>
          <Form.Item name="condition" label="Initial Condition" rules={[{ required: true, message: 'State condition' }]}>
            <Select placeholder="Select Condition">
              <Option value="New">Brand New</Option>
              <Option value="Excellent">Excellent Condition</Option>
              <Option value="Good">Good / Used</Option>
              <Option value="Fair">Fair / Needs Upgrade</Option>
            </Select>
          </Form.Item>
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4">
            <Button onClick={() => setIsAssignVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={isAssigning} className="bg-[#4f46e5] hover:bg-[#4338ca] border-none font-semibold">Confirm Assignment</Button>
          </div>
        </Form>
      </Modal>

      {/* Return Modal */}
      <Modal title={`Return Asset: ${selectedAsset?.Name}`} open={isReturnVisible}
        onCancel={() => setIsReturnVisible(false)} footer={null}>
        <Form form={returnForm} layout="vertical" onFinish={handleReturnSubmit}>
          <Form.Item name="condition" label="Returning Condition" rules={[{ required: true, message: 'State return condition' }]}>
            <Select placeholder="Select Returning Condition">
              <Option value="Excellent">Excellent (No damage)</Option>
              <Option value="Good">Good Condition</Option>
              <Option value="Damaged">Damaged / Needs Repair</Option>
            </Select>
          </Form.Item>
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4">
            <Button onClick={() => setIsReturnVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={isReturning} className="bg-[#4f46e5] hover:bg-[#4338ca] border-none font-semibold">Confirm Return</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default InventoryList;

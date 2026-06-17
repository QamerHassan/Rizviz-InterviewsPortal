import React from 'react';
import { Card, Table, Typography, Tag } from 'antd';
import { useGetAuditLogsQuery } from '../store/apiSlice';
import { useSelector } from 'react-redux';

const { Title, Paragraph } = Typography;

const AuditLogs = () => {
  const { data: logs = [], isLoading } = useGetAuditLogsQuery();
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);

  const columns = [
    {
      title: 'Log ID',
      dataIndex: 'Id',
      key: 'Id',
      render: (id) => <span className="font-mono text-gray-400">#{id}</span>,
    },
    {
      title: 'Username',
      dataIndex: 'Username',
      key: 'Username',
      render: (text) => <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>{text}</span>,
    },
    {
      title: 'Action Triggered',
      dataIndex: 'Action',
      key: 'Action',
      render: (text) => <span className={`font-semibold ${isDarkMode ? 'text-indigo-400' : 'text-[#0B3C7B]'}`}>{text}</span>,
    },
    {
      title: 'Module',
      dataIndex: 'Module',
      key: 'Module',
      render: (text) => {
        let color = 'blue';
        if (text === 'Auth') color = 'purple';
        else if (text === 'HR') color = 'orange';
        else if (text === 'Payroll') color = 'magenta';
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: 'IP Address',
      dataIndex: 'IpAddress',
      key: 'IpAddress',
      render: (text) => <span className="font-mono text-xs text-gray-400">{text || 'localhost'}</span>,
    },
    {
      title: 'Timestamp (UTC)',
      dataIndex: 'Timestamp',
      key: 'Timestamp',
      render: (d) => d ? new Date(d).toLocaleString() : 'N/A',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Title level={2} style={{ margin: 0, fontWeight: 800, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>
          Security Audit Registry
        </Title>
        <Paragraph type="secondary" style={{ margin: 0, fontSize: 13, color: isDarkMode ? '#94a3b8' : '#64748b' }}>
          Monitor user access logins, credential modifications, and financial payroll processes.
        </Paragraph>
      </div>

      <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 16 }}>
        <div style={{ overflowX: 'auto' }}>
          <Table
            columns={columns}
            dataSource={logs}
            rowKey={(record) => record.Id || record.id}
            loading={isLoading}
            pagination={{ defaultPageSize: 15 }}
          />
        </div>
      </Card>
    </div>
  );
};

export default AuditLogs;

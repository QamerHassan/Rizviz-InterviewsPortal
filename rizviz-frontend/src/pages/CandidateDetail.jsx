import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetCandidateDetailQuery } from '../store/apiSlice';
import { Card, Table, Tag, Button, Spin, Typography, Row, Col, Empty } from 'antd';
import { ArrowLeftOutlined, BankOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const formatDate = (d) => (d ? dayjs(d).format('DD MMM YYYY') : '—');

const CandidateDetail = () => {
  const { name } = useParams();
  const navigate = useNavigate();
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const { data, isLoading, error } = useGetCandidateDetailQuery(name);

  const records = data?.records || [];
  const headingColor = isDarkMode ? '#f1f5f9' : '#1e293b';
  const labelColor = isDarkMode ? '#94a3b8' : '#64748b';
  const cardBorder = isDarkMode ? '#334155' : '#f1f5f9';

  const columns = [
    { title: 'Inv To', dataIndex: 'InvTo', key: 'InvTo', width: 90 },
    { title: 'Sr', dataIndex: 'Sr', key: 'Sr', width: 70 },
    { title: 'Job Hunter Name', dataIndex: 'JobHunterName', key: 'JobHunterName', ellipsis: true },
    { title: 'Job Profile', dataIndex: 'InterviewFor', key: 'InterviewFor', ellipsis: true },
    { title: 'Company Name', dataIndex: 'CompanyName', key: 'CompanyName', render: (t) => <Tag color="blue">{t || '—'}</Tag> },
    { title: 'Job Start', dataIndex: 'JobStartDate', key: 'JobStartDate', width: 110, render: formatDate },
    { title: 'Job Close', dataIndex: 'JobCloseDate', key: 'JobCloseDate', width: 110, render: formatDate },
  ];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/interviews')}>Back</Button>
        <Empty description={`No rows for "${decodeURIComponent(name)}"`} />
      </div>
    );
  }

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/interviews')} style={{ color: '#4f46e5', marginBottom: 16 }}>
        Back to Interviews
      </Button>
      <Title level={3} style={{ color: headingColor, marginBottom: 4 }}>{decodeURIComponent(name)}</Title>
      <Text style={{ color: labelColor }}>{records.length} row(s) from your Excel data</Text>

      <Row gutter={16} style={{ margin: '20px 0' }}>
        <Col><Card size="small"><Text type="secondary">Rows</Text><div className="text-2xl font-bold">{records.length}</div></Card></Col>
        <Col><Card size="small"><Text type="secondary">Companies</Text><div className="text-2xl font-bold">{data?.summary?.companyCount ?? 0}</div></Card></Col>
      </Row>

      <Card
        bordered={false}
        style={{ borderRadius: 16, border: `1px solid ${cardBorder}` }}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${cardBorder}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BankOutlined style={{ color: '#4f46e5' }} />
          <Text strong>Excel columns for this candidate</Text>
        </div>
        <Table
          columns={columns}
          dataSource={records}
          rowKey={(r) => r.Id}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          scroll={{ x: 900 }}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default CandidateDetail;

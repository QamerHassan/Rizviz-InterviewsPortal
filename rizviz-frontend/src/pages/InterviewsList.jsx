import React, { useState } from 'react';
import { Card, Table, Tabs, Button, Space, Tag, Modal, Form, Input, DatePicker, Select, Rate, Badge, Typography, message, Tooltip, InputNumber } from 'antd';
import { PlusOutlined, ScheduleOutlined, StarOutlined, UserOutlined, CheckCircleOutlined, AppstoreOutlined } from '@ant-design/icons';
import {
  useGetInterviewsQuery,
  useScheduleInterviewMutation,
  useUpdateInterviewFeedbackMutation,
  useGetCandidatesQuery,
  useUpdateCandidateStatusMutation,
  useGetJobsQuery,
  useCreateJobMutation
} from '../store/apiSlice';
import { useSelector } from 'react-redux';
import StatCard from '../components/StatCard';

const { Title, Paragraph } = Typography;
const { Option } = Select;

const InterviewsList = () => {
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [pipelineStatusFilter, setPipelineStatusFilter] = useState('all');
  
  const [isScheduleVisible, setIsScheduleVisible] = useState(false);
  const [isFeedbackVisible, setIsFeedbackVisible] = useState(false);
  const [isJobVisible, setIsJobVisible] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  
  const [scheduleForm] = Form.useForm();
  const [feedbackForm] = Form.useForm();
  const [jobForm] = Form.useForm();

  const { data: interviews = [], isLoading: isInterviewsLoading, refetch: refetchInterviews } = useGetInterviewsQuery();
  const { data: candidates = [], isLoading: isCandidatesLoading, refetch: refetchCandidates } = useGetCandidatesQuery();
  const { data: jobs = [], isLoading: isJobsLoading, refetch: refetchJobs } = useGetJobsQuery();

  const [scheduleInterview, { isLoading: isScheduling }] = useScheduleInterviewMutation();
  const [updateFeedback, { isLoading: isSubmittingFeedback }] = useUpdateInterviewFeedbackMutation();
  const [updateCandidateStatus, { isLoading: isUpdatingStatus }] = useUpdateCandidateStatusMutation();
  const [createJob, { isLoading: isCreatingJob }] = useCreateJobMutation();

  const handleScheduleSubmit = async (values) => {
    try {
      const payload = {
        candidateId: values.candidateId,
        candidateName: candidates.find(c => c.Id === values.candidateId)?.FullName || 'Unknown',
        jobTitle: candidates.find(c => c.Id === values.candidateId)?.JobTitle || 'Specialist Position',
        scheduleTime: values.scheduleTime.toDate(),
        interviewerName: values.interviewerName,
        round: values.round,
        status: 'Scheduled',
        feedback: ''
      };
      await scheduleInterview(payload).unwrap();
      message.success('Interview scheduled successfully.');
      setIsScheduleVisible(false);
      scheduleForm.resetFields();
      refetchInterviews();
      
      await updateCandidateStatus({ candidateId: values.candidateId, status: 'Interview' }).unwrap();
      refetchCandidates();
    } catch {
      message.error('Failed to schedule interview.');
    }
  };

  const handleFeedbackSubmit = async (values) => {
    try {
      await updateFeedback({
        interviewId: selectedInterview.Id,
        feedback: values.feedback,
        rating: values.rating.toString()
      }).unwrap();
      message.success('Interview evaluation saved.');
      setIsFeedbackVisible(false);
      feedbackForm.resetFields();
      refetchInterviews();
    } catch {
      message.error('Failed to save evaluation.');
    }
  };

  const handleJobSubmit = async (values) => {
    try {
      await createJob(values).unwrap();
      message.success('Job posting created successfully.');
      setIsJobVisible(false);
      jobForm.resetFields();
      refetchJobs();
    } catch {
      message.error('Failed to create job posting.');
    }
  };

  const handleStatusChange = async (candidateId, newStatus) => {
    try {
      await updateCandidateStatus({ candidateId, status: newStatus }).unwrap();
      message.success(`Candidate status moved to ${newStatus}.`);
      refetchCandidates();
    } catch {
      message.error('Failed to update candidate status.');
    }
  };

  const pipelineColumns = [
    {
      title: 'Candidate Name',
      dataIndex: 'FullName',
      key: 'FullName',
      render: (text) => <span className="font-semibold">{text}</span>,
    },
    {
      title: 'Position Applied',
      dataIndex: 'JobTitle',
      key: 'JobTitle',
    },
    {
      title: 'Experience',
      dataIndex: 'ExperienceYears',
      key: 'ExperienceYears',
    },
    {
      title: 'Pipeline Stage',
      dataIndex: 'PipelineStatus',
      key: 'PipelineStatus',
      render: (status) => {
        let color = 'gold';
        if (status === 'Interview') color = 'blue';
        else if (status === 'Hired') color = 'green';
        else if (status === 'Rejected') color = 'red';
        return <Tag color={color} className="font-semibold uppercase text-xs">{status}</Tag>;
      },
    },
    {
      title: 'Applied Date',
      dataIndex: 'AppliedDate',
      render: (d) => d ? new Date(d).toLocaleDateString() : 'N/A',
    },
    {
      title: 'Screening Action',
      key: 'actions',
      render: (_, record) => (
        <Select
          value={record.PipelineStatus}
          onChange={(val) => handleStatusChange(record.Id || record.id, val)}
          style={{ width: 140 }}
          loading={isUpdatingStatus}
        >
          <Option value="Applied">Applied</Option>
          <Option value="Shortlisted">Shortlisted</Option>
          <Option value="Interview">Interview</Option>
          <Option value="Hired">Hired</Option>
          <Option value="Rejected">Rejected</Option>
        </Select>
      ),
    },
  ];

  const interviewColumns = [
    {
      title: 'Candidate',
      dataIndex: 'CandidateName',
      key: 'CandidateName',
      render: (text) => <span className="font-semibold">{text}</span>,
    },
    {
      title: 'Job Position',
      dataIndex: 'JobTitle',
      key: 'JobTitle',
    },
    {
      title: 'Round Name',
      dataIndex: 'Round',
      key: 'Round',
    },
    {
      title: 'Interviewer',
      dataIndex: 'InterviewerName',
      key: 'InterviewerName',
    },
    {
      title: 'Date & Time',
      dataIndex: 'ScheduleTime',
      render: (d) => d ? new Date(d).toLocaleString() : 'N/A',
    },
    {
      title: 'Evaluation',
      key: 'evaluation',
      render: (_, record) => (
        <Space size="small">
          {record.Feedback ? (
            <Tooltip title={record.Feedback}>
              <Badge status="success" text={`Rated ${record.Rating || 'N/A'}/5`} />
            </Tooltip>
          ) : (
            <Button
              type="primary"
              size="small"
              icon={<StarOutlined />}
              onClick={() => {
                setSelectedInterview(record);
                setIsFeedbackVisible(true);
              }}
              className="bg-amber-500 hover:bg-amber-600 border-none font-semibold flex items-center"
            >
              Evaluate
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'pipeline',
      label: 'Recruitment Pipelines',
      children: (
        <Card variant="borderless" className="shadow-sm" style={{ overflowX: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <Table
              columns={pipelineColumns}
              dataSource={pipelineStatusFilter === 'hired'
                ? candidates.filter((c) => c.PipelineStatus === 'Hired')
                : candidates}
              rowKey={(record) => record.Id || record.id}
              loading={isCandidatesLoading}
              scroll={{ x: 650 }}
              size="middle"
            />
          </div>
        </Card>
      ),
    },
    {
      key: 'interviews',
      label: 'Interview Schedule',
      children: (
        <Card variant="borderless" className="shadow-sm" style={{ overflowX: 'hidden' }}>
          <div className="flex justify-end mb-4">
            <Button
              type="primary"
              icon={<ScheduleOutlined />}
              onClick={() => setIsScheduleVisible(true)}
              className="bg-[#4f46e5] hover:bg-[#4338ca] border-none font-semibold"
            >
              Schedule Interview
            </Button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <Table
              columns={interviewColumns}
              dataSource={interviews}
              rowKey={(record) => record.Id || record.id}
              loading={isInterviewsLoading}
              scroll={{ x: 650 }}
              size="middle"
            />
          </div>
        </Card>
      ),
    },
    {
      key: 'jobs',
      label: 'Active Job Postings',
      children: (
        <Card variant="borderless" className="shadow-sm" style={{ overflowX: 'hidden' }}>
          <div className="flex justify-end mb-4">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsJobVisible(true)}
              className="bg-[#4f46e5] hover:bg-[#4338ca] border-none font-semibold"
            >
              Create Job Posting
            </Button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <Table
              dataSource={jobs.filter((j) => j.Status === 'Active' || activeTab !== 'jobs')}
              rowKey="Id"
              loading={isJobsLoading}
              scroll={{ x: 550 }}
              size="middle"
              columns={[
                {
                  title: 'Job Title',
                  dataIndex: 'Title',
                  render: (text) => <span className="font-semibold">{text}</span>,
                },
                {
                  title: 'Department',
                  dataIndex: 'Department',
                },
                {
                  title: 'Vacancies',
                  dataIndex: 'OpeningsCount',
                },
                {
                  title: 'Status',
                  dataIndex: 'Status',
                  render: (status) => <Tag color="green">{status}</Tag>,
                },
                {
                  title: 'Posted',
                  dataIndex: 'PostedDate',
                  render: (d) => d ? new Date(d).toLocaleDateString() : 'N/A',
                },
              ]}
            />
          </div>
        </Card>
      ),
    },
  ];

  const totalInterviews = interviews.length;
  const pipelineCandidates = candidates.length;
  const activeJobsCount = jobs.filter(j => j.Status === 'Active').length || jobs.length;
  const hiredCount = candidates.filter(c => c.PipelineStatus === 'Hired').length;

  const handleStatCardClick = (target) => {
    if (target === 'interviews') {
      setActiveTab('interviews');
      return;
    }
    if (target === 'jobs') {
      setActiveTab('jobs');
      return;
    }
    setActiveTab('pipeline');
    setPipelineStatusFilter(target === 'hired' ? 'hired' : 'all');
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>
            Interviews Portal
          </Title>
          <Paragraph type="secondary" style={{ margin: 0, fontSize: 13, color: isDarkMode ? '#94a3b8' : '#64748b' }}>
            Manage job openings, screen candidates, and capture interview feedback.
          </Paragraph>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <StatCard
          label="TOTAL INTERVIEWS"
          value={totalInterviews}
          icon={<ScheduleOutlined />}
          cardBg="#eff6ff"
          iconBg="#2563eb"
          colProps={{ span: 24 }}
          onClick={() => handleStatCardClick('interviews')}
          active={activeTab === 'interviews'}
          clickLabel="Open schedule"
          activeLabel="Schedule open"
          size="small"
        />
        <StatCard
          label="CANDIDATES"
          value={pipelineCandidates}
          icon={<UserOutlined />}
          cardBg="#f5f3ff"
          iconBg="#4f46e5"
          colProps={{ span: 24 }}
          onClick={() => handleStatCardClick('pipeline')}
          active={activeTab === 'pipeline' && pipelineStatusFilter === 'all'}
          size="small"
        />
        <StatCard
          label="OPEN POSTINGS"
          value={activeJobsCount}
          icon={<AppstoreOutlined />}
          cardBg="#fffbeb"
          iconBg="#d97706"
          colProps={{ span: 24 }}
          onClick={() => handleStatCardClick('jobs')}
          active={activeTab === 'jobs'}
          clickLabel="Open jobs"
          activeLabel="Jobs open"
          size="small"
        />
        <StatCard
          label="CONVERTED / HIRED"
          value={hiredCount}
          icon={<CheckCircleOutlined />}
          cardBg="#ecfdf5"
          iconBg="#059669"
          colProps={{ span: 24 }}
          onClick={() => handleStatCardClick('hired')}
          active={activeTab === 'pipeline' && pipelineStatusFilter === 'hired'}
          size="small"
        />
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
        className="font-semibold"
        style={{ overflowX: 'auto' }}
      />

      {/* Schedule Interview Modal */}
      <Modal
        title="Schedule Interview"
        open={isScheduleVisible}
        onCancel={() => setIsScheduleVisible(false)}
        footer={null}
      >
        <Form form={scheduleForm} layout="vertical" onFinish={handleScheduleSubmit}>
          <Form.Item name="candidateId" label="Candidate" rules={[{ required: true, message: 'Please select candidate' }]}>
            <Select placeholder="Select Candidate">
              {candidates.filter(c => c.PipelineStatus !== 'Hired' && c.PipelineStatus !== 'Rejected').map(c => (
                <Option key={c.Id || c.id} value={c.Id || c.id}>{c.FullName} ({c.JobTitle || 'Specialist'})</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="round" label="Interview Round" rules={[{ required: true, message: 'Specify round description' }]}>
            <Select placeholder="Select Round">
              <Option value="Technical Round 1">Technical Round 1</Option>
              <Option value="Technical Round 2">Technical Round 2</Option>
              <Option value="HR Screening">HR Screening</Option>
              <Option value="Final Management Round">Final Management Round</Option>
            </Select>
          </Form.Item>
          <Form.Item name="interviewerName" label="Interviewer Name" rules={[{ required: true, message: 'Interviewer required' }]}>
            <Input placeholder="Interviewer Name" />
          </Form.Item>
          <Form.Item name="scheduleTime" label="Schedule Date & Time" rules={[{ required: true, message: 'Specify date and time' }]}>
            <DatePicker showTime className="w-full" />
          </Form.Item>
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4">
            <Button onClick={() => setIsScheduleVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={isScheduling} className="bg-[#4f46e5] hover:bg-[#4338ca] border-none font-semibold">
              Schedule
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Evaluation Feedback Modal */}
      <Modal
        title={`Evaluation: ${selectedInterview?.CandidateName}`}
        open={isFeedbackVisible}
        onCancel={() => setIsFeedbackVisible(false)}
        footer={null}
      >
        <Form form={feedbackForm} layout="vertical" onFinish={handleFeedbackSubmit}>
          <Form.Item name="rating" label="Performance Rating" rules={[{ required: true }]}>
            <Rate />
          </Form.Item>
          <Form.Item name="feedback" label="Interviewer Evaluation Summary" rules={[{ required: true, message: 'Please provide feedback!' }]}>
            <Input.TextArea placeholder="Provide technical skills feedback and recommendations." />
          </Form.Item>
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4">
            <Button onClick={() => setIsFeedbackVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={isSubmittingFeedback} className="bg-[#4f46e5] hover:bg-[#4338ca] border-none font-semibold">
              Save Evaluation
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Create Job Posting Modal */}
      <Modal
        title="Create Job Posting"
        open={isJobVisible}
        onCancel={() => setIsJobVisible(false)}
        footer={null}
      >
        <Form form={jobForm} layout="vertical" onFinish={handleJobSubmit} requiredMark="optional">
          <Form.Item name="Title" label="Job Title" rules={[{ required: true, message: 'Job title is required' }]}>
            <Input placeholder="e.g. Senior C# Engineer" />
          </Form.Item>
          <Form.Item name="Department" label="Department" rules={[{ required: true, message: 'Select department' }]}>
            <Select placeholder="Select Department">
              <Option value="Technology">Technology</Option>
              <Option value="HR">HR</Option>
              <Option value="Operations">Operations</Option>
            </Select>
          </Form.Item>
          <Form.Item name="OpeningsCount" label="Number of Openings" rules={[{ required: true, message: 'Specify vacancies' }]}>
            <InputNumber className="w-full" min={1} placeholder="Open Vacancies" />
          </Form.Item>
          <Form.Item name="Description" label="Job Description">
            <Input.TextArea placeholder="Outline roles and responsibilities" />
          </Form.Item>
          <Form.Item name="Requirements" label="Requirements Summary">
            <Input.TextArea placeholder="Provide stack details and years of experience needed" />
          </Form.Item>
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4">
            <Button onClick={() => setIsJobVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={isCreatingJob} className="bg-[#4f46e5] hover:bg-[#4338ca] border-none font-semibold">
              Publish
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default InterviewsList;

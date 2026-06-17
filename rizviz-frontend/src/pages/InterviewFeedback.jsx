import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Table, Card, Button, Input, Select, Tag, Modal, Form, 
  App, Row, Col, DatePicker, Spin, Tooltip, Typography
} from 'antd';
import { 
  SearchOutlined, PlusOutlined, AudioOutlined,
  StopOutlined, PlayCircleOutlined, AudioMutedOutlined,
  RobotOutlined, SaveOutlined, ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { 
  useGetFeedbacksQuery,
  useSaveFeedbackMutation, useDeleteFeedbackMutation 
} from '../store/apiSlice';
import {
  interviewers as allInterviewers,
  interviewees as allInterviewees,
  companies as allCompanies,
  statuses as allStatuses,
  allInterviews
} from '../data/interviewData';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

const API_BASE_URL = 'http://localhost:5000/api/interviewfeedback';

const saveFeedback = async (feedbackData) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/feedback`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        sr: feedbackData.sr,
        feedbackText: feedbackData.feedbackText,
        rating: feedbackData.rating,
        strengths: feedbackData.strengths,
        weaknesses: feedbackData.weaknesses,
        recommendation: feedbackData.recommendation,
        feedbackBy: feedbackData.feedbackBy,
        feedbackDate: feedbackData.feedbackDate ?? new Date().toISOString().split('T')[0],
        aiProcessedFeedback: feedbackData.aiProcessedFeedback,
      }),
    });
    const result = await response.json();
    if (response.ok && result.success) {
      return { success: true, data: result };
    } else {
      return { success: false, error: result.message };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const fetchInterviews = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/interviews`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const result = await response.json();
    if (response.ok && result.success) {
      return result;
    } else {
      return { success: false };
    }
  } catch (err) {
    return { success: false };
  }
};

const InterviewFeedback = () => {
  const { message } = App.useApp();
  const [search, setSearch] = useState('');
  const [recommendationFilter, setRecommendationFilter] = useState('All');
  const [stackFilter, setStackFilter] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [form] = Form.useForm();
  
  const { token, role } = useSelector(state => state.auth);
  const isAdmin = role === 'Admin';

  // Queries & Mutations
  const { data: feedbacks, isLoading, refetch } = useGetFeedbacksQuery({ 
    search: search || undefined, 
    recommendation: recommendationFilter === 'All' ? undefined : recommendationFilter,
    stack: stackFilter === 'All' ? undefined : stackFilter,
  });
  const [saveFeedbackMutation, { isLoading: isSaving }] = useSaveFeedbackMutation();
  const [deleteFeedback] = useDeleteFeedbackMutation();

  // Local state for Voice / Text input mode
  const [inputMode, setInputMode] = useState('voice');

  // Get logged in user's name
  const loggedInUserName = useMemo(() => {
    try {
      const interviewName = localStorage.getItem('interviewName');
      if (interviewName) return interviewName;
      const u = localStorage.getItem('user');
      if (u) {
        const parsed = JSON.parse(u);
        return parsed?.fullName || parsed?.name || parsed?.username || '';
      }
      return '';
    } catch {
      return '';
    }
  }, []);

  // User's own interviews — the dropdown list for Sr selection
  const userInterviews = useMemo(() => {
    if (!loggedInUserName) return allInterviews;
    const nameLower = loggedInUserName.trim().toLowerCase();
    return allInterviews.filter(
      r => r.interviewee && r.interviewee.trim().toLowerCase() === nameLower
    );
  }, [loggedInUserName]);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // AI Processing State
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [urduTranscript, setUrduTranscript] = useState('');
  const [aiFeedback, setAiFeedback] = useState(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState('');

  // Local filter state for dropdowns
  const [selectedInterviewer, setSelectedInterviewer] = useState(null);

  // Interviewees filtered by selected interviewer
  const filteredInterviewees = useMemo(() => {
    if (!selectedInterviewer) return allInterviewees;
    const interviewerRows = allInterviews.filter(
      r => r.interviewer && r.interviewer.trim() === selectedInterviewer
    );
    const names = new Set(interviewerRows.map(r => r.interviewee).filter(Boolean));
    if (names.size === 0) return allInterviewees;
    return allInterviewees.filter(i => names.has(i.value));
  }, [selectedInterviewer]);


  // Table Columns
  const columns = [
    {
      title: 'Sr',
      dataIndex: 'Sr',
      key: 'Sr',
      render: (text) => text || '—'
    },
    {
      title: 'Date',
      dataIndex: 'InterviewDate',
      key: 'InterviewDate',
      render: (date) => date ? dayjs(date).format('MMM DD, YYYY') : '—'
    },
    {
      title: 'Interviewee',
      dataIndex: 'IntervieweeName',
      key: 'IntervieweeName',
      render: (text) => <span className="font-semibold text-slate-700 dark:text-slate-300">{text || '—'}</span>
    },
    {
      title: 'Job Hunter',
      dataIndex: 'InterviewerName',
      key: 'InterviewerName',
      render: (text) => text || '—'
    },
    {
      title: 'Company',
      dataIndex: 'CompanyName',
      key: 'CompanyName',
      render: (text) => text || '—'
    },
    {
      title: 'Interview Type',
      dataIndex: 'InterviewType',
      key: 'InterviewType',
      render: (type) => type ? <Tag color="blue">{type}</Tag> : '—'
    },
    {
      title: 'Status',
      dataIndex: 'Status',
      key: 'Status',
      render: (status) => {
        if (!status) return '—';
        let color = 'default';
        const s = status.toLowerCase();
        if (s.includes('selected') || s.includes('hired') || s.includes('completed')) color = 'success';
        else if (s.includes('rejected') || s.includes('cancel')) color = 'error';
        else if (s.includes('resched') || s.includes('postpone') || s.includes('progress') || s.includes('pending')) color = 'warning';
        return <Tag color={color}>{status}</Tag>;
      }
    },
    {
      title: 'Inv. To',
      dataIndex: 'InvTo',
      key: 'InvTo',
      render: (text) => text || '—'
    },
    {
      title: 'Job Profile',
      dataIndex: 'InterviewFor',
      key: 'InterviewFor',
      render: (text) => text || '—'
    },
    {
      title: 'Job Start Date',
      dataIndex: 'JobStartDate',
      key: 'JobStartDate',
      render: (date) => date ? dayjs(date).format('MMM DD, YYYY') : '—'
    },
    {
      title: 'Feedback',
      key: 'actions',
      render: (_, record) => (
        <div className="flex gap-2">
          <Button type="link" size="small" onClick={() => handleOpenDetail(record)}>View</Button>
          {isAdmin && (
            <Button type="link" danger size="small" onClick={() => handleDelete(record.Id)}>Delete</Button>
          )}
        </div>
      )
    }
  ];


  const handleOpenDetail = (record) => {
    setSelectedFeedback(record);
    setIsDetailModalOpen(true);
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this feedback?',
      okText: 'Yes, Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteFeedback(id).unwrap();
          message.success('Feedback deleted');
        } catch (err) {
          message.error('Failed to delete');
        }
      }
    });
  };

  const resetFormState = () => {
    form.resetFields();
    setAudioBlob(null);
    setAudioUrl('');
    setRecordingTime(0);
    setUrduTranscript('');
    setAiFeedback(null);
    setUploadedAudioUrl('');
  };

  const handleOpenModal = () => {
    resetFormState();
    setInputMode('voice');
    setIsModalOpen(true);

    const defaultName = loggedInUserName || localStorage.getItem('interviewName') || '';
    form.setFieldsValue({
      intervieweeName: defaultName,
      interviewerName: defaultName
    });
    setSelectedInterviewer(defaultName);

    // Auto-fill company if there's a match in interviews for the candidate
    const row = allInterviews.find(r => r.interviewee && r.interviewee.trim().toLowerCase() === defaultName.toLowerCase());
    if (row?.company) {
      form.setFieldsValue({ companyName: row.company });
    }
  };

  const handleInterviewerChange = (val) => {
    setSelectedInterviewer(val);
    const defaultName = loggedInUserName || localStorage.getItem('interviewName') || '';
    if (defaultName) {
      form.setFieldsValue({ intervieweeName: defaultName });
      const row = allInterviews.find(r =>
        r.interviewee && r.interviewee.trim().toLowerCase() === defaultName.toLowerCase() &&
        (!val || (r.interviewer && r.interviewer.trim().toLowerCase() === val.toLowerCase()))
      );
      if (row?.company) {
        form.setFieldsValue({ companyName: row.company });
      }
    } else {
      form.setFieldsValue({ intervieweeName: undefined, companyName: undefined });
    }
  };

  const handleSrChange = (val) => {
    const row = allInterviews.find(r => r.sr === parseInt(val, 10));
    if (row) {
      const defaultName = loggedInUserName || localStorage.getItem('interviewName') || '';
      form.setFieldsValue({
        interviewerName: row.interviewer || undefined,
        intervieweeName: defaultName || row.interviewee || undefined,
        companyName: row.company || undefined,
        interviewType: row.type || undefined,
        interviewDate: row.date ? dayjs(row.date) : undefined,
      });
      setSelectedInterviewer(row.interviewer || null);
    }
  };

  const handleIntervieweeChange = (val) => {
    // Auto-fill company from allInterviews when interviewee is selected
    const row = allInterviews.find(r =>
      r.interviewee === val &&
      (!selectedInterviewer || r.interviewer === selectedInterviewer)
    );
    if (row?.company) {
      form.setFieldsValue({ companyName: row.company });
    }
  };

  // --- Audio Recording Logic ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      message.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl('');
    setRecordingTime(0);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // --- AI Logic ---
  const processAudioWithAI = async () => {
    if (!audioBlob) {
      message.error("Please record audio first.");
      return;
    }

    // 1. Transcribe
    setIsTranscribing(true);
    let transcriptStr = '';
    let uploadedUrl = '';
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'feedback.webm');

      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/feedback/transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ? `${data.error}: ${data.detail}` : data.message || 'Failed to transcribe');
      
      transcriptStr = data.transcript;
      console.log("Transcript received:", transcriptStr);

      if (!transcriptStr || transcriptStr.trim().length < 5) {
        throw new Error("Could not hear audio clearly. Please re-record.");
      }

      uploadedUrl = data.audioFileUrl;
      setUrduTranscript(transcriptStr);
      setUploadedAudioUrl(uploadedUrl);
      message.success('Transcription complete!');
    } catch (err) {
      message.error(err.message);
      setIsTranscribing(false);
      return;
    } finally {
      setIsTranscribing(false);
    }

    // 2. Enhance
    if (!transcriptStr) return;
    setIsEnhancing(true);

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/feedback/enhance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ urduText: transcriptStr })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ? `${data.error}: ${data.detail}` : data.message || 'Failed to enhance');

      setAiFeedback(data);
      form.setFieldsValue({
        recommendation: 'Recommended',
        englishSummary: data.translatedText
      });
      message.success('AI enhancement complete!');
    } catch (err) {
      message.error(err.message);
    } finally {
      setIsEnhancing(false);
    }
  };

  // --- Submit ---
  const handleFormSubmit = async (values) => {
    try {
      const textVal = inputMode === 'text' ? values.feedbackText : urduTranscript;
      const token = localStorage.getItem('token');

      const payload = {
        // Core interview fields
        sr:               values.sr ? parseInt(values.sr, 10) : null,
        interviewerName:  values.interviewerName || '',
        intervieweeName:  values.intervieweeName || '',
        companyName:      values.companyName || '',
        interviewType:    values.interviewType || '',
        interviewDate:    values.interviewDate ? values.interviewDate.toISOString() : null,
        // Feedback content
        urduTranscript:   urduTranscript || '',
        englishFeedback:  values.englishSummary || textVal || '',
        communication:    '',
        technicalSkills:  '',
        strengths:        values.strengths || '',
        weaknesses:       values.weaknesses || '',
        recommendation:   values.recommendation || 'Recommended',
        // Google Sheets extra fields
        rating:           values.rating ? parseInt(values.rating, 10) : 0,
        feedbackBy:       values.interviewerName || '',
        feedbackDate:     values.interviewDate
                            ? values.interviewDate.format('YYYY-MM-DD')
                            : new Date().toISOString().split('T')[0],
        audioFileUrl:     audioUrl || '',
      };

      console.log("Submitting feedback for Sr:", payload.sr);

      const res = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/feedback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await res.json();

      if (res.ok && result.success) {
        if (result.sheetSynced) {
          message.success('Feedback saved and synced to Google Sheets! ✅');
        } else {
          message.warning('Saved to database, but Google Sheet sync failed. It will retry automatically.');
        }
        setIsModalOpen(false);
        refetch();
      } else {
        message.error(result.message || 'Failed to save feedback');
      }
    } catch (err) {
      message.error(err.message || 'Failed to save feedback');
    }
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        {/* Left: Title + Button */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white m-0">
            {stackFilter !== 'All' ? `${stackFilter} Interviews Feedback` : 'Interview Feedback'}
          </h1>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="small"
            className="add-feedback-button"
            style={{ alignSelf: 'flex-start' }}
            onClick={handleOpenModal}
          >
            Add Feedback
          </Button>
        </div>

        {/* Right: Stack Select */}
        <div>
          <Select
            value={stackFilter}
            onChange={(v) => setStackFilter(v)}
            style={{ minWidth: 160 }}
            showSearch
            optionFilterProp="children"
          >
            <Option value="All">All Stacks</Option>
            <Option value="AI/ML">AI/ML</Option>
            <Option value="Snow">Snow</Option>
            <Option value="Data">Data</Option>
            <Option value="DevOps">DevOps</Option>
          </Select>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6 rounded-2xl shadow-sm border-slate-200 dark:border-slate-800">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} lg={8}>
            <Input
              placeholder="Search candidate, interviewer, company..."
              prefix={<SearchOutlined className="text-slate-400" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              className="white-search-input rounded-lg"
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Select
              style={{ width: '100%' }}
              value={recommendationFilter}
              onChange={setRecommendationFilter}
              className="rounded-lg"
            >
              <Option value="All">All Recommendations</Option>
              <Option value="Recommended">Recommended</Option>
              <Option value="Not Recommended">Not Recommended</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Main Table */}
      <Card className="rounded-2xl shadow-sm border-slate-200 dark:border-slate-800" styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={feedbacks || []}
          rowKey="Id"
          loading={isLoading}
          pagination={{ pageSize: 15 }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* CREATE FEEDBACK MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <RobotOutlined className="text-indigo-500 text-xl" />
            <span className="text-lg font-bold">AI Interview Feedback</span>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        width={Math.min(800, window.innerWidth * 0.95)}
        footer={null}
        className="rounded-2xl"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
          className="mt-4"
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="sr"
                label="Select Your Interview (Sr. #)"
                rules={[{ required: true, message: 'Please select which interview this feedback is for' }]}
              >
                <Select
                  showSearch
                  placeholder="Pick an interview to give feedback for"
                  onChange={val => handleSrChange(String(val))}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={userInterviews.map(r => ({
                    value: r.sr,
                    label: `Sr ${r.sr} — ${r.company} (${r.date ? new Date(r.date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : ''})`
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="interviewerName" label="Interviewer" rules={[{ required: true }]}>
                <Select
                  showSearch
                  placeholder="Select Interviewer"
                  onChange={handleInterviewerChange}
                  filterOption={(input, option) =>
                    (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {allInterviewers.map((item, index) => (
                    <Option key={`interviewer-${index}`} value={item.value}>{item.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="interviewDate" label="Interview Date" rules={[{ required: true }]}>
                <DatePicker className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="interviewType" label="Interview Type" rules={[{ required: true }]}>
                <Select placeholder="Select Type">
                  <Option value="Technical">Technical</Option>
                  <Option value="HR">HR</Option>
                  <Option value="Final Round">Final Round</Option>
                  <Option value="Client Round">Client Round</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="intervieweeName" label="Candidate (Interviewee)" rules={[{ required: true }]}>
                <Input disabled placeholder="Current User Name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="companyName" label="Company" rules={[{ required: true }]}>
                <Select
                  showSearch
                  placeholder="Auto-filled or type to search"
                  filterOption={(input, option) =>
                    (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {allCompanies.map((item, index) => (
                    <Option key={`company-${index}`} value={item.value}>{item.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div className="flex gap-2 mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <Button 
              type={inputMode === 'voice' ? 'primary' : 'text'} 
              onClick={() => setInputMode('voice')}
              className="flex-1 rounded-lg font-semibold"
            >
              🎤 Voice
            </Button>
            <Button 
              type={inputMode === 'text' ? 'primary' : 'text'} 
              onClick={() => setInputMode('text')}
              className="flex-1 rounded-lg font-semibold"
            >
              ⌨️ Text
            </Button>
          </div>

          {inputMode === 'voice' ? (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <AudioOutlined className="text-blue-500" /> Voice Feedback Recording (Urdu/English)
              </h3>
              
              <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-lg shadow-inner mb-4">
                {!isRecording && !audioUrl && (
                  <Button 
                    type="primary" 
                    danger 
                    shape="circle" 
                    icon={<AudioOutlined />} 
                    size="large" 
                    className="w-16 h-16 flex items-center justify-center"
                    onClick={startRecording}
                  />
                )}
                {isRecording && (
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-mono text-red-500 mb-4 animate-pulse">
                      {formatTime(recordingTime)}
                    </div>
                    <Button 
                      shape="circle" 
                      icon={<StopOutlined />} 
                      size="large" 
                      className="w-16 h-16 flex items-center justify-center bg-red-100 hover:bg-red-200 border-red-300 text-red-600"
                      onClick={stopRecording}
                    />
                  </div>
                )}
                {audioUrl && !isRecording && (
                  <div className="w-full flex flex-col items-center gap-4">
                    <audio src={audioUrl} controls className="w-full max-w-md" />
                    <div className="flex gap-2">
                      <Button onClick={resetRecording} icon={<ReloadOutlined />}>Re-record</Button>
                      <Button 
                        type="primary" 
                        onClick={processAudioWithAI} 
                        icon={<RobotOutlined />}
                        loading={isTranscribing || isEnhancing}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        {isTranscribing ? 'Transcribing...' : isEnhancing ? 'AI Enhancing...' : 'Process with AI'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              {urduTranscript && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded text-right border border-blue-100 dark:border-blue-800" dir="rtl">
                  <Text type="secondary" className="block text-xs mb-1 text-left" dir="ltr">Transcribed Urdu Text (Whisper):</Text>
                  {urduTranscript}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <PlusOutlined className="text-blue-500" /> Written Feedback (Urdu/English)
              </h3>
              <Form.Item name="feedbackText" rules={[{ required: true, message: 'Please type your feedback' }]}>
                <TextArea 
                  rows={5} 
                  style={{ minHeight: '120px' }} 
                  placeholder="Type your feedback here..." 
                />
              </Form.Item>
              <div className="flex justify-end mt-2">
                <Button 
                  type="primary" 
                  onClick={async () => {
                    const text = form.getFieldValue('feedbackText');
                    if (!text || text.trim().length < 5) {
                      message.error("Please type some feedback first.");
                      return;
                    }
                    setIsEnhancing(true);
                    try {
                      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/feedback/enhance`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ urduText: text })
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.message || 'Failed to enhance');
                      setAiFeedback(data);
                      form.setFieldsValue({
                        recommendation: 'Recommended',
                        englishSummary: data.translatedText
                      });
                      message.success('AI processing complete!');
                    } catch (err) {
                      message.error(err.message);
                    } finally {
                      setIsEnhancing(false);
                    }
                  }} 
                  icon={<RobotOutlined />}
                  loading={isEnhancing}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Process with AI
                </Button>
              </div>
            </div>
          )}

          {aiFeedback && (
            <div className="animate-fade-in bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/30 mb-6">
              <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-3 flex items-center gap-2">
                <RobotOutlined /> AI Generated English Feedback (Editable)
              </h3>
              
              <Form.Item name="englishSummary" label="English Translation">
                <TextArea rows={5} />
              </Form.Item>
              <Form.Item name="recommendation" label="Recommendation">
                <Select>
                  <Option value="Recommended">Recommended</Option>
                  <Option value="Not Recommended">Not Recommended</Option>
                </Select>
              </Form.Item>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
            <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Form.Item noStyle shouldUpdate>
              {() => {
                const hasFeedbackText = form.getFieldValue('feedbackText');
                const isDisabled = !aiFeedback && !urduTranscript && (inputMode !== 'text' || !hasFeedbackText);
                return (
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={isSaving}
                    icon={<SaveOutlined />}
                    disabled={!!isDisabled}
                  >
                    Save Feedback
                  </Button>
                );
              }}
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal
        title={<span className="font-bold text-lg">Feedback Details</span>}
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[<Button key="close" onClick={() => setIsDetailModalOpen(false)}>Close</Button>]}
        width={Math.min(700, window.innerWidth * 0.95)}
      >
        {selectedFeedback && (
          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
              <div>
                <Text type="secondary" className="block text-xs uppercase">Candidate</Text>
                <span className="font-semibold">{selectedFeedback.IntervieweeName}</span>
              </div>
              <div>
                <Text type="secondary" className="block text-xs uppercase">Company</Text>
                <span className="font-semibold">{selectedFeedback.CompanyName}</span>
              </div>
              <div>
                <Text type="secondary" className="block text-xs uppercase">Interviewer</Text>
                <span>{selectedFeedback.InterviewerName}</span>
              </div>
              <div>
                <Text type="secondary" className="block text-xs uppercase">Date & Type</Text>
                <span>{dayjs(selectedFeedback.InterviewDate).format('MMM DD, YYYY')} ({selectedFeedback.InterviewType})</span>
              </div>
            </div>

            {selectedFeedback.AudioFileUrl && (
              <div>
                <Text type="secondary" className="block text-xs uppercase mb-2">Original Audio</Text>
                <audio src={`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${selectedFeedback.AudioFileUrl}`} controls className="w-full" />
              </div>
            )}

            <div>
              <Text type="secondary" className="block text-xs uppercase mb-1">Recommendation</Text>
              {selectedFeedback.Recommendation === 'Recommended' ? (
                <Tag color="success" className="text-base px-3 py-1">Recommended</Tag>
              ) : (
                <Tag color="error" className="text-base px-3 py-1">Not Recommended</Tag>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Text type="secondary" className="block text-xs uppercase">English Feedback</Text>
                <p className="m-0 mt-1 whitespace-pre-wrap">{selectedFeedback.EnglishFeedback}</p>
              </div>
              {selectedFeedback.Communication && (
                <div>
                  <Text type="secondary" className="block text-xs uppercase">Communication</Text>
                  <p className="m-0 mt-1 whitespace-pre-wrap">{selectedFeedback.Communication}</p>
                </div>
              )}
              {selectedFeedback.TechnicalSkills && (
                <div>
                  <Text type="secondary" className="block text-xs uppercase">Technical Skills</Text>
                  <p className="m-0 mt-1 whitespace-pre-wrap">{selectedFeedback.TechnicalSkills}</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedFeedback.Strengths && (
                  <div>
                    <Text type="secondary" className="block text-xs uppercase">Strengths</Text>
                    <p className="m-0 mt-1 whitespace-pre-wrap">{selectedFeedback.Strengths}</p>
                  </div>
                )}
                {selectedFeedback.Weaknesses && (
                  <div>
                    <Text type="secondary" className="block text-xs uppercase">Weaknesses</Text>
                    <p className="m-0 mt-1 whitespace-pre-wrap">{selectedFeedback.Weaknesses}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InterviewFeedback;

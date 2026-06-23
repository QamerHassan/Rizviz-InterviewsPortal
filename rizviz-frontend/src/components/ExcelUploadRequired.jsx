import React, { useState } from 'react';
import { Upload, Button, Card, Typography, Table, Badge, Modal, App } from 'antd';
import { InboxOutlined, FileExcelOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { 
  useSyncUploadInterviewsMutation, 
  useConfirmExcelUploadMutation,
  apiSlice 
} from '../store/apiSlice';

const { Dragger } = Upload;
const { Title, Text, Paragraph } = Typography;

const ExcelUploadRequired = () => {
  const { message } = App.useApp();
  const dispatch = useDispatch();
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  
  const [syncUpload, { isLoading: isSyncing }] = useSyncUploadInterviewsMutation();
  const [confirmUpload, { isLoading: isConfirming }] = useConfirmExcelUploadMutation();
  
  const [pendingDiff, setPendingDiff] = useState(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

  const handleUploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const hide = message.loading('Uploading and parsing your Excel sheet...', 0);
    try {
      const response = await syncUpload(formData).unwrap();
      hide();
      
      if (response.requiresConfirmation) {
        setPendingDiff(response.diff);
        setIsDiffModalOpen(true);
      } else {
        message.success(response.message || 'Excel loaded successfully. Enjoy your workspace!');
        dispatch(apiSlice.util.invalidateTags(['Interviews', 'Leads']));
      }
    } catch (err) {
      hide();
      message.error(err?.data?.message || 'Failed to upload Excel. Make sure required columns are present.');
    }
    return false; // Prevent auto-upload by AntD Upload
  };

  const handleConfirmSync = async () => {
    try {
      await confirmUpload().unwrap();
      message.success('Workspace updated successfully.');
      setIsDiffModalOpen(false);
      setPendingDiff(null);
      dispatch(apiSlice.util.invalidateTags(['Interviews', 'Leads']));
    } catch (err) {
      message.error(err?.data?.message || 'Sync confirmation failed.');
    }
  };

  const addedColumns = [
    { title: 'SR', dataIndex: 'Sr', key: 'Sr', width: 60 },
    { title: 'Candidate', dataIndex: 'IntervieweeName', key: 'IntervieweeName', className: 'font-bold' },
    { title: 'Company', dataIndex: 'CompanyName', key: 'CompanyName' },
    { title: 'Status', dataIndex: 'Status', key: 'Status', render: (val) => <Badge status="success" text={val} /> },
  ];

  const deletedColumns = [
    { title: 'SR', dataIndex: 'Sr', key: 'Sr', width: 60 },
    { title: 'Candidate', dataIndex: 'IntervieweeName', key: 'IntervieweeName', className: 'line-through text-red-500' },
    { title: 'Company', dataIndex: 'CompanyName', key: 'CompanyName' },
    { title: 'Status', dataIndex: 'Status', key: 'Status', render: (val) => <Badge status="error" text={val} /> },
  ];

  const updatedColumns = [
    { title: 'SR', dataIndex: 'sr', key: 'sr', width: 60 },
    { title: 'Candidate', dataIndex: 'intervieweeName', key: 'intervieweeName', className: 'font-bold' },
    { title: 'Field Changed', dataIndex: 'changedField', key: 'changedField' },
    { 
      title: 'Old Value', 
      dataIndex: 'oldValue', 
      key: 'oldValue', 
      render: (val) => <span className="line-through text-red-400">{val || 'N/A'}</span> 
    },
    { 
      title: 'New Value', 
      dataIndex: 'newValue', 
      key: 'newValue', 
      render: (val) => <span className="text-emerald-500 font-extrabold">{val || 'N/A'}</span> 
    },
  ];

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4 py-8">
      <Card 
        className="w-full max-w-2xl shadow-xl border border-slate-100/50 dark:border-slate-800/40 rounded-3xl overflow-hidden"
        style={{
          background: isDarkMode ? 'linear-gradient(135deg, #161245 0%, #0d0a24 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f3f4ff 100%)'
        }}
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-500 mb-4 text-3xl">
            <FileExcelOutlined />
          </div>
          <Title level={2} style={{ margin: 0 }}>Initialize Workspace</Title>
          <Paragraph type="secondary" className="mt-2 text-sm max-w-md mx-auto">
            Please upload your recruitment Excel file. No interview data will be loaded until you initialize your session.
          </Paragraph>
        </div>

        <Dragger
          accept=".xlsx,.csv"
          multiple={false}
          beforeUpload={handleUploadFile}
          showUploadList={false}
          disabled={isSyncing}
          className="border-dashed border-2 hover:border-indigo-500 transition-all rounded-2xl p-6 bg-slate-50/50 dark:bg-slate-900/40"
        >
          <p className="ant-upload-drag-icon text-indigo-500 text-4xl mb-2">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text font-bold text-slate-700 dark:text-slate-200">
            Click or drag Excel/CSV file to this area to upload
          </p>
          <p className="ant-upload-hint text-xs text-slate-400 mt-1">
            Required columns: <Text code>SR.NO</Text>, <Text code>IntervieweeName</Text>
          </p>
        </Dragger>

        <div className="mt-6 border-t pt-4 border-slate-100 dark:border-slate-800">
          <Text className="text-[10px] font-extrabold uppercase tracking-wider block text-slate-400 mb-2">
            Column Validation Checklist
          </Text>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <CheckCircleOutlined className="text-emerald-500" /> SR.NO (For sequence ordering)
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <CheckCircleOutlined className="text-emerald-500" /> IntervieweeName (Candidate)
            </div>
          </div>
        </div>
      </Card>

      <Modal
        title={
          <div className="flex items-center gap-2 border-b pb-3 mb-2">
            <WarningOutlined className="text-amber-500" />
            <Title level={4} style={{ margin: 0 }}>Review Changes Before Confirmation</Title>
          </div>
        }
        open={isDiffModalOpen}
        onOk={handleConfirmSync}
        onCancel={() => setIsDiffModalOpen(false)}
        okText="Confirm Sync"
        okButtonProps={{ className: 'bg-indigo-600 hover:bg-indigo-700', loading: isConfirming }}
        cancelText="Cancel"
        width={750}
        centered
      >
        {pendingDiff && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <Text type="secondary" className="block mb-2">
              This Excel file contains changes compared to the active session data. Please review the diff list below:
            </Text>

            {(pendingDiff.inserted || []).length > 0 && (
              <Card 
                size="small" 
                title={<span className="text-emerald-600 font-black"><Badge status="success" /> New Candidates to Add ({(pendingDiff.inserted || []).length})</span>} 
                className="border-emerald-100 bg-emerald-50/20 dark:bg-emerald-950/10"
              >
                <Table 
                  dataSource={pendingDiff.inserted} 
                  columns={addedColumns} 
                  rowKey={(r) => r.Sr || r.IntervieweeName} 
                  pagination={false} 
                  size="small" 
                />
              </Card>
            )}

            {(pendingDiff.deleted || []).length > 0 && (
              <Card 
                size="small" 
                title={<span className="text-rose-600 font-black"><Badge status="error" /> Candidates to Remove ({(pendingDiff.deleted || []).length})</span>} 
                className="border-rose-100 bg-rose-50/20 dark:bg-rose-950/10"
              >
                <Table 
                  dataSource={pendingDiff.deleted} 
                  columns={deletedColumns} 
                  rowKey={(r) => r.Sr || r.IntervieweeName} 
                  pagination={false} 
                  size="small" 
                />
              </Card>
            )}

            {(pendingDiff.updated || []).length > 0 && (
              <Card 
                size="small" 
                title={<span className="text-amber-600 font-black"><Badge status="warning" /> Candidates to Modify ({(pendingDiff.updated || []).length})</span>} 
                className="border-amber-100 bg-amber-50/20 dark:bg-amber-950/10"
              >
                <Table 
                  dataSource={pendingDiff.updated} 
                  columns={updatedColumns} 
                  rowKey={(r) => r.id || Math.random()} 
                  pagination={false} 
                  size="small" 
                />
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ExcelUploadRequired;

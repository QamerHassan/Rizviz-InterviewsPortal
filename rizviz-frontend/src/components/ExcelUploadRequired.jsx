import React, { useState } from 'react';
import { Upload, Button, Table, Badge, Modal, App } from 'antd';
import { InboxOutlined, WarningOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  useSyncUploadInterviewsMutation,
  useConfirmExcelUploadMutation,
  apiSlice,
} from '../store/apiSlice';

const { Dragger } = Upload;

const ExcelUploadRequired = () => {
  const { message } = App.useApp();
  const dispatch = useDispatch();
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);

  const [syncUpload, { isLoading: isSyncing }] = useSyncUploadInterviewsMutation();
  const [confirmUpload, { isLoading: isConfirming }] = useConfirmExcelUploadMutation();

  const [pendingDiff, setPendingDiff] = useState(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

  // Core upload function
  const doUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const hide = message.loading('Uploading...', 0);
    try {
      const response = await syncUpload(formData).unwrap();
      hide();

      if (response.requiresConfirmation) {
        setPendingDiff(response.diff);
        setIsDiffModalOpen(true);
      } else {
        dispatch(apiSlice.util.invalidateTags(['Interviews', 'Leads']));
      }
    } catch (err) {
      hide();
      message.error(err?.data?.message || 'Upload failed.');
    }
  };

  const handleUploadFile = (file) => {
    doUpload(file);
    return false; // prevent AntD auto-upload
  };


  const handleConfirmSync = async () => {
    try {
      await confirmUpload().unwrap();
      setIsDiffModalOpen(false);
      setPendingDiff(null);
      dispatch(apiSlice.util.invalidateTags(['Interviews', 'Leads']));
    } catch (err) {
      message.error(err?.data?.message || 'Sync confirmation failed.');
    }
  };

  const addedColumns = [
    { title: 'SR', dataIndex: 'Sr', key: 'Sr', width: 60 },
    { title: 'Candidate', dataIndex: 'IntervieweeName', key: 'IntervieweeName' },
    { title: 'Company', dataIndex: 'CompanyName', key: 'CompanyName' },
    { title: 'Status', dataIndex: 'Status', key: 'Status', render: (val) => <Badge status="success" text={val} /> },
  ];
  const deletedColumns = [
    { title: 'SR', dataIndex: 'Sr', key: 'Sr', width: 60 },
    { title: 'Candidate', dataIndex: 'IntervieweeName', key: 'IntervieweeName' },
    { title: 'Company', dataIndex: 'CompanyName', key: 'CompanyName' },
    { title: 'Status', dataIndex: 'Status', key: 'Status', render: (val) => <Badge status="error" text={val} /> },
  ];
  const updatedColumns = [
    { title: 'SR', dataIndex: 'sr', key: 'sr', width: 60 },
    { title: 'Candidate', dataIndex: 'intervieweeName', key: 'intervieweeName' },
    { title: 'Field', dataIndex: 'changedField', key: 'changedField' },
    { title: 'Old', dataIndex: 'oldValue', key: 'oldValue', render: (v) => <span style={{ textDecoration: 'line-through', color: '#f87171' }}>{v || 'N/A'}</span> },
    { title: 'New', dataIndex: 'newValue', key: 'newValue', render: (v) => <span style={{ color: '#34d399', fontWeight: 700 }}>{v || 'N/A'}</span> },
  ];

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

      {/* Single large upload button */}
      <Dragger
        accept=".xlsx,.csv"
        multiple={false}
        beforeUpload={handleUploadFile}
        showUploadList={false}
        disabled={isSyncing}
        openFileDialogOnClick
        style={{ background: 'transparent', border: 'none', padding: 0 }}
      >
        <Button
          type="primary"
          size="large"
          icon={<InboxOutlined style={{ fontSize: 22 }} />}
          loading={isSyncing}
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            border: 'none',
            borderRadius: 14,
            height: 68,
            paddingInline: 56,
            fontSize: 20,
            fontWeight: 700,
            boxShadow: '0 6px 28px rgba(79,70,229,0.38)',
          }}
        >
          Upload Excel
        </Button>
      </Dragger>

      {/* ── Diff confirmation modal ── */}
      <Modal
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WarningOutlined style={{ color: '#f59e0b' }} />
            Review Changes Before Confirmation
          </span>
        }
        open={isDiffModalOpen}
        onOk={handleConfirmSync}
        onCancel={() => setIsDiffModalOpen(false)}
        okText="Confirm Sync"
        okButtonProps={{ loading: isConfirming }}
        cancelText="Cancel"
        width={750}
        centered
      >
        {pendingDiff && (
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {(pendingDiff.inserted || []).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>
                  <Badge status="success" /> New ({(pendingDiff.inserted || []).length})
                </div>
                <Table dataSource={pendingDiff.inserted} columns={addedColumns} rowKey={(r) => r.Sr || r.IntervieweeName} pagination={false} size="small" />
              </div>
            )}
            {(pendingDiff.deleted || []).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>
                  <Badge status="error" /> Removed ({(pendingDiff.deleted || []).length})
                </div>
                <Table dataSource={pendingDiff.deleted} columns={deletedColumns} rowKey={(r) => r.Sr || r.IntervieweeName} pagination={false} size="small" />
              </div>
            )}
            {(pendingDiff.updated || []).length > 0 && (
              <div>
                <div style={{ fontWeight: 700, color: '#d97706', marginBottom: 8 }}>
                  <Badge status="warning" /> Modified ({(pendingDiff.updated || []).length})
                </div>
                <Table dataSource={pendingDiff.updated} columns={updatedColumns} rowKey={(r) => r.id || Math.random()} pagination={false} size="small" />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ExcelUploadRequired;

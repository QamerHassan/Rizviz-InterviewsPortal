import React, { useState, useEffect, useRef } from 'react';
import { Modal, Table, Badge, Typography, Button, Card } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { apiSlice, useLazyGetLastSyncResultQuery } from '../store/apiSlice';

const { Text, Title } = Typography;

const ExcelSyncPoller = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, token, role } = useSelector((state) => state.auth);
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const [diffData, setDiffData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [getLastSyncResult] = useLazyGetLastSyncResultQuery();
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Allow any admin role (case-insensitive)
    if (!isAuthenticated || !token || !role || role.toLowerCase() !== 'admin') {
      return;
    }

    const checkChanges = async () => {
      try {
        const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiBase}/excel/check-changes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;
        const data = await response.json();
        if (data.hasChanges) {
          dispatch(apiSlice.util.invalidateTags(['Interviews', 'Leads']));
          setDiffData(data);
          setIsModalOpen(true);
        }
      } catch (err) {
        console.warn('[ExcelPoller] check-changes failed:', err);
      }
    };

    // Poll every 5 seconds
    const interval = setInterval(checkChanges, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, token, role, dispatch]);

  useEffect(() => {
    if (!isAuthenticated || !token || !role || role.toLowerCase() !== 'admin') {
      return;
    }

    const handleSyncComplete = async () => {
      try {
        const result = await getLastSyncResult().unwrap();
        const changes = result.changes || [];
        
        const inserted = [];
        const deleted = [];
        const updated = [];
        
        changes.forEach(c => {
          const changeType = (c.changeType || c.ChangeType || '').toLowerCase();
          if (changeType === 'new row' || changeType === 'newrow' || changeType === 'added') {
            inserted.push({
              Sr: c.sr ?? c.Sr,
              IntervieweeName: c.intervieweeName ?? c.IntervieweeName,
              CompanyName: c.companyName ?? c.CompanyName,
              Status: c.newRow?.Status || c.newRow?.status || 'Scheduled'
            });
          } else if (changeType === 'deleted') {
            deleted.push({
              Sr: c.sr ?? c.Sr,
              IntervieweeName: c.intervieweeName ?? c.IntervieweeName,
              CompanyName: c.companyName ?? c.CompanyName,
              Status: c.oldRow?.Status || c.oldRow?.status || 'Deleted'
            });
          } else {
            const rowFields = c.rowFields || [];
            const changedFields = rowFields.filter(f => f.changed ?? f.Changed);
            
            if (changedFields.length > 0) {
              changedFields.forEach(f => {
                updated.push({
                  id: `${c.sr ?? c.Sr}-${f.column || f.Column}`,
                  sr: c.sr ?? c.Sr,
                  intervieweeName: c.intervieweeName ?? c.IntervieweeName,
                  changedField: f.column || f.Column,
                  oldValue: f.before || f.Before,
                  newValue: f.after || f.After
                });
              });
            } else {
              const fieldChanges = c.fieldChanges || [];
              fieldChanges.forEach((fc, idx) => {
                const parts = fc.split(':');
                const fieldName = parts[0]?.trim() || 'Field';
                const valParts = parts[1]?.split('→');
                const oldVal = valParts[0]?.trim() || '';
                const newVal = valParts[1]?.trim() || '';
                
                updated.push({
                  id: `${c.sr ?? c.Sr}-${fieldName}-${idx}`,
                  sr: c.sr ?? c.Sr,
                  intervieweeName: c.intervieweeName ?? c.IntervieweeName,
                  changedField: fieldName,
                  oldValue: oldVal,
                  newValue: newVal
                });
              });
            }
          }
        });
        
        if (inserted.length > 0 || deleted.length > 0 || updated.length > 0) {
          dispatch(apiSlice.util.invalidateTags(['Interviews', 'Leads']));
          
          setDiffData({
            fileName: result.fileName || 'your uploaded Excel file',
            inserted,
            deleted,
            updated
          });
          setIsModalOpen(true);
        }
      } catch (err) {
        console.warn('[ExcelPoller] Failed to fetch last sync result:', err);
      }
    };

    window.addEventListener('excel-sync-complete', handleSyncComplete);
    return () => {
      window.removeEventListener('excel-sync-complete', handleSyncComplete);
    };
  }, [isAuthenticated, token, role, dispatch, getLastSyncResult]);

  // ── Real-time disk-level file-change handler (via SignalR → TopNavbar → window event) ───
  useEffect(() => {
    if (!isAuthenticated || !role || role.toLowerCase() !== 'admin') return;

    const handleFileChanged = (event) => {
      const data = event.detail;
      if (!data?.hasChanges) return;

      console.log('[ExcelPoller] excel-file-changed received:', data);

      // Map inserted rows (already in the right format from backend)
      const inserted = (data.inserted || []).map(i => ({
        Sr: i.Sr ?? i.sr,
        IntervieweeName: i.IntervieweeName ?? i.intervieweeName,
        CompanyName: i.CompanyName ?? i.companyName,
        Status: i.Status ?? i.status ?? 'Scheduled',
      }));

      // Map deleted rows
      const deleted = (data.deleted || []).map(i => ({
        Sr: i.Sr ?? i.sr,
        IntervieweeName: i.IntervieweeName ?? i.intervieweeName,
        CompanyName: i.CompanyName ?? i.companyName,
        Status: i.Status ?? i.status ?? 'Deleted',
      }));

      // Map updated rows — backend sends { Sr, CandidateName, CompanyName, changes: [{ Field, OldValue, NewValue }] }
      const updated = [];
      (data.updated || []).forEach(u => {
        const sr = u.Sr ?? u.sr;
        const name = u.CandidateName ?? u.candidateName ?? u.intervieweeName ?? '';
        (u.changes || u.Changes || []).forEach((c, idx) => {
          updated.push({
            id: `${sr}-${c.Field ?? c.field}-${idx}`,
            sr,
            intervieweeName: name,
            changedField: c.Field ?? c.field,
            oldValue: c.OldValue ?? c.oldValue,
            newValue: c.NewValue ?? c.newValue,
          });
        });
      });

      dispatch(apiSlice.util.invalidateTags(['Interviews', 'Leads']));
      setDiffData({
        fileName: data.fileName || 'your uploaded Excel file',
        inserted,
        deleted,
        updated,
      });
      setIsModalOpen(true);
    };

    window.addEventListener('excel-file-changed', handleFileChanged);
    return () => window.removeEventListener('excel-file-changed', handleFileChanged);
  }, [isAuthenticated, role, dispatch]);

  const inserted = diffData?.inserted || [];
  const deleted  = diffData?.deleted  || [];
  const updated  = diffData?.updated  || [];

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
    <Modal
      title={
        <div className="flex items-center gap-2 border-b pb-3 mb-2">
          <SyncOutlined className="text-indigo-500 animate-spin" />
          <Title level={4} style={{ margin: 0 }}>Local Excel File Updated</Title>
        </div>
      }
      open={isModalOpen}
      onOk={() => setIsModalOpen(false)}
      onCancel={() => setIsModalOpen(false)}
      footer={[
        <Button key="ok" type="primary" onClick={() => setIsModalOpen(false)} className="bg-indigo-600 hover:bg-indigo-700">
          Dismiss
        </Button>
      ]}
      width={750}
      centered
      className="excel-sync-modal"
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        <Text type="secondary" className="block mb-2">
          The background file sync system detected updates to <Text strong>{diffData?.fileName || 'your uploaded Excel file'}</Text>. 
          Your dashboard and data views have been refreshed automatically. Here is the summary of what changed:
        </Text>

        {inserted.length > 0 && (
          <Card 
            size="small" 
            title={<span className="text-emerald-600 font-black"><Badge status="success" /> New Rows Added ({inserted.length})</span>} 
            className="border-emerald-100 bg-emerald-50/20 dark:bg-emerald-950/10"
          >
            <Table 
              dataSource={inserted} 
              columns={addedColumns} 
              rowKey={(r) => r.Sr || r.IntervieweeName} 
              pagination={false} 
              size="small" 
            />
          </Card>
        )}

        {deleted.length > 0 && (
          <Card 
            size="small" 
            title={<span className="text-rose-600 font-black"><Badge status="error" /> Rows Removed ({deleted.length})</span>} 
            className="border-rose-100 bg-rose-50/20 dark:bg-rose-950/10"
          >
            <Table 
              dataSource={deleted} 
              columns={deletedColumns} 
              rowKey={(r) => r.Sr || r.IntervieweeName} 
              pagination={false} 
              size="small" 
            />
          </Card>
        )}

        {updated.length > 0 && (
          <Card 
            size="small" 
            title={<span className="text-amber-600 font-black"><Badge status="warning" /> Rows Modified ({updated.length})</span>} 
            className="border-amber-100 bg-amber-50/20 dark:bg-amber-950/10"
          >
            <Table 
              dataSource={updated} 
              columns={updatedColumns} 
              rowKey={(r) => r.id || Math.random()} 
              pagination={false} 
              size="small" 
            />
          </Card>
        )}
      </div>
    </Modal>
  );
};

export default ExcelSyncPoller;

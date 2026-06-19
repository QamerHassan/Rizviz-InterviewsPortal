import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card, Table, Button, Space, Tag, Modal, Form, Input, DatePicker, Select, Typography, App,
  Tooltip, InputNumber, Row, Col, Radio, Alert, Upload, Avatar
} from 'antd';
import {
  PlusOutlined, UserOutlined,
  ReloadOutlined, EditOutlined, DeleteOutlined, ImportOutlined,
  DownloadOutlined, SearchOutlined, FilterOutlined, AppstoreOutlined, UnorderedListOutlined,
  CalendarOutlined, HistoryOutlined, SyncOutlined, TeamOutlined
} from '@ant-design/icons';
import CandidateDrawer from '../components/interviews/CandidateDrawer';
import {
  useGetInterviewsPagedQuery,
  useGetInterviewStatsQuery,
  useGetInterviewStatusBreakdownQuery,
  useGetInterviewCandidateNamesQuery,
  useGetInterviewCompanyNamesQuery,
  useCreateInterviewMutation,
  useUpdateInterviewMutation,
  useDeleteInterviewMutation,
  useSeedInterviewsMutation,
  useRefreshInterviewsFromExcelMutation,
  useGetInterviewSyncStatusQuery,
  useGetInterviewHistoryQuery,
} from '../store/apiSlice';
import { useSelector } from 'react-redux';
import InterviewStatusBadge from '../components/interviews/InterviewStatusBadge';
import InterviewSyncSummaryModal from '../components/interviews/InterviewSyncSummaryModal';
import InterviewHistoryModal from '../components/interviews/InterviewHistoryModal';
import InterviewStatusOverview from '../components/interviews/InterviewStatusOverview';
import { getInterviewRowStatus } from '../utils/interviewStatusUtils';
import {
  buildInterviewTableColumns,
  buildExportHeaders,
  rowToExportLine,
  parseRawRowJson,
} from '../utils/interviewTableColumns';
import dayjs from 'dayjs';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

const formatDate = (d) => {
  if (d == null || d === '' || String(d).toLowerCase() === '(blank)') return '—';
  const parsed = dayjs(d);
  return parsed.isValid() ? parsed.format('MMM D, YYYY') : '—';
};

const Interviews = () => {
  const { message } = App.useApp();
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const { role, interviewName } = useSelector((state) => state.auth);
  const isAdmin = role === 'Admin';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewType, setViewType] = useState('table');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('All');
  const [candidateFilter, setCandidateFilter] = useState('All');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [recentOnly, setRecentOnly] = useState(false);
  const [statFilter, setStatFilter] = useState('all');
  const [stackFilter, setStackFilter] = useState('All');
  const [dateFromFilter, setDateFromFilter] = useState(() => {
    const fromUrl = searchParams.get('date_from');
    if (fromUrl) return dayjs(fromUrl);
    const saved = localStorage.getItem('interviews_date_from');
    return saved ? dayjs(saved) : null;
  });
  const [dateToFilter, setDateToFilter] = useState(() => {
    const toUrl = searchParams.get('date_to');
    if (toUrl) return dayjs(toUrl);
    const saved = localStorage.getItem('interviews_date_to');
    return saved ? dayjs(saved) : null;
  });
  const [showDatePicker, setShowDatePicker] = useState(() => {
    return !!(
      searchParams.get('date_from') || searchParams.get('date_to') ||
      localStorage.getItem('interviews_date_from') || localStorage.getItem('interviews_date_to')
    );
  });
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const lastSyncedRef = useRef(null);
  const [syncSummary, setSyncSummary] = useState(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [noChangesModalOpen, setNoChangesModalOpen] = useState(false);
  const [lastChangeBySr, setLastChangeBySr] = useState({});
  const [historyInterview, setHistoryInterview] = useState(null);

  // --- Client-side file fingerprint for zero-upload optimization ---
  const FINGERPRINT_KEY = 'interview_file_fingerprint';

  const dateFrom = dateFromFilter ? dayjs(dateFromFilter).format('YYYY-MM-DD') : '';
  const dateTo = dateToFilter ? dayjs(dateToFilter).format('YYYY-MM-DD') : '';

   const listFilters = useMemo(() => ({
     search,
     company: companyFilter === 'All' ? '' : companyFilter,
     candidate: candidateFilter === 'All' ? '' : candidateFilter,
     date_from: dateFrom,
     date_to: dateTo,
     metric: statFilter === 'all' ? '' : statFilter,
   }), [search, companyFilter, candidateFilter, dateFrom, dateTo, statFilter]);

  /** Status cards: full dataset for user (no date window) so every status appears */
  const statusOverviewFilters = useMemo(() => ({
    search,
    company: companyFilter === 'All' ? '' : companyFilter,
    candidate: candidateFilter === 'All' ? '' : candidateFilter,
  }), [search, companyFilter, candidateFilter]);

  const statusesParam = selectedStatuses.length > 0
    ? selectedStatuses.join(',')
    : (statusFilter === 'All' ? '' : statusFilter);

  useEffect(() => {
    // Support both ?status=cancelled and legacy ?statuses=...
    const fromUrl = searchParams.get('status') || searchParams.get('statuses');
    const searchFromUrl = searchParams.get('search');
    if (searchFromUrl !== null) setSearch(searchFromUrl);
    if (!fromUrl) return;
    const parsed = fromUrl.split(',').map((s) => s.trim()).filter(Boolean);
    // Exclusive: only take the first one
    if (parsed.length) setSelectedStatuses([parsed[0]]);
  }, [searchParams]);

  const handleDateFromChange = (date) => {
    setDateFromFilter(date);
    setCurrentPage(1);
    const formatted = date ? dayjs(date).format('YYYY-MM-DD') : null;
    if (formatted) localStorage.setItem('interviews_date_from', formatted);
    else localStorage.removeItem('interviews_date_from');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (formatted) next.set('date_from', formatted);
      else next.delete('date_from');
      return next;
    }, { replace: true });
  };
  const handleDateToChange = (date) => {
    setDateToFilter(date);
    setCurrentPage(1);
    const formatted = date ? dayjs(date).format('YYYY-MM-DD') : null;
    if (formatted) localStorage.setItem('interviews_date_to', formatted);
    else localStorage.removeItem('interviews_date_to');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (formatted) next.set('date_to', formatted);
      else next.delete('date_to');
      return next;
    }, { replace: true });
  };
  const toggleDatePicker = () => {
    if (showDatePicker) {
      // Closing — clear everything
      setDateFromFilter(null);
      setDateToFilter(null);
      setShowDatePicker(false);
      localStorage.removeItem('interviews_date_from');
      localStorage.removeItem('interviews_date_to');
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('date_from');
        next.delete('date_to');
        return next;
      }, { replace: true });
    } else {
      setShowDatePicker(true);
    }
  };

  const statusScopeLabel = isAdmin
    ? 'All interviews — admin view'
    : `Your interviews${interviewName ? ` (${interviewName})` : ''}`;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();

  const { data: pagedData, isLoading, isFetching: isPagedFetching, refetch: refetchPaged } = useGetInterviewsPagedQuery({
    page: viewType === 'grid' ? 1 : currentPage,
    limit: viewType === 'grid' ? 500 : pageSize,
    ...listFilters,
    statuses: statusesParam,
  });

  const { data: stats, isFetching: isStatsFetching, refetch: refetchStats } = useGetInterviewStatsQuery();
  const {
    data: statusBreakdown = [],
    isFetching: statusBreakdownLoading,
    refetch: refetchStatusBreakdown,
  } = useGetInterviewStatusBreakdownQuery(statusOverviewFilters);
  const { data: syncStatus, isFetching: isSyncStatusFetching, refetch: refetchSyncStatus } = useGetInterviewSyncStatusQuery(undefined, {
    pollingInterval: 5000,
  });
  const { data: candidateNames = [] } = useGetInterviewCandidateNamesQuery();
  const { data: companyNames = [] } = useGetInterviewCompanyNamesQuery();

  const isRefreshing = isPagedFetching || isStatsFetching || statusBreakdownLoading || isSyncStatusFetching;

  useEffect(() => {
    const ts = syncStatus?.lastSyncedAt ?? syncStatus?.LastSyncedAt;
    if (!ts) return;
    const key = String(ts);
    if (lastSyncedRef.current && lastSyncedRef.current !== key) {
      // A new sync happened (either local auto-sync or our watcher upload)
      // Refetch all data so the table reflects the latest DB state
      refetchPaged();
      refetchStats();
      refetchStatusBreakdown();
      refetchSyncStatus();

      // Also fetch the sync result so we can show the summary popup
      // (same as clicking "Refresh" manually — gives the user a diff view)
      refreshFromExcel().unwrap()
        .then((result) => {
          const changed = (result.updatedRows ?? result.UpdatedRows ?? 0) +
                          (result.insertedRows ?? result.InsertedRows ?? 0);
          if (changed > 0) {
            setSyncSummary(result);
            const bySr = {};
            (result.changes || []).forEach((c) => {
              const sr = c.sr ?? c.Sr;
              if (sr != null) bySr[sr] = c;
            });
            setLastChangeBySr(bySr);
            setSyncModalOpen(true);
            message.success(`${changed} row(s) updated from Excel — see sync summary.`);
          }
        })
        .catch(() => { /* silent — data was already refreshed above */ });
    }
    lastSyncedRef.current = key;
  }, [syncStatus]); // eslint-disable-line react-hooks/exhaustive-deps


  const rows = Array.isArray(pagedData?.data) ? pagedData.data : [];

  const totalRows = stats?.total ?? 0;

  const handleStatCardClick = () => {
    setStatFilter('all');
    setSelectedStatuses([]);
    setSearchParams({}, { replace: true });
    setCurrentPage(1);
  };

  const handleStatusToggle = (status) => {
    setStatusFilter('All');
    setSelectedStatuses((prev) => {
      // Exclusive: if this status is already selected, toggle it off (show all)
      // Otherwise set ONLY this one status as the filter
      const isActive = prev.some((s) => s.toLowerCase() === status.toLowerCase());
      if (isActive) {
        // Toggle off → clear filter
        setSearchParams({}, { replace: true });
        return [];
      } else {
        // Exclusive select → replace any previous filter with just this one
        setSearchParams({ status: status.toLowerCase() }, { replace: true });
        return [status];
      }
    });
    setCurrentPage(1);
  };

  const [createInterview, { isLoading: isCreating }] = useCreateInterviewMutation();
  const [updateInterview, { isLoading: isUpdating }] = useUpdateInterviewMutation();
  const [deleteInterview] = useDeleteInterviewMutation();
  const [seedInterviews, { isLoading: isSeeding }] = useSeedInterviewsMutation();
  const [refreshFromExcel, { isLoading: isSyncing }] = useRefreshInterviewsFromExcelMutation();
  const { data: historyRows = [], isFetching: historyLoading } = useGetInterviewHistoryQuery(
    historyInterview?.Id,
    { skip: !historyInterview?.Id }
  );

  const handleRefreshFromExcel = async () => {
    // Step 1: Fetch the latest sync status to get the server-side file fingerprint
    const statusResult = await refetchSyncStatus();
    const latestStatus = statusResult?.data ?? syncStatus;
    const serverModified = latestStatus?.sourceFileLastModified ?? latestStatus?.SourceFileLastModified;

    // Step 2: Compare with stored fingerprint in localStorage
    const storedFingerprint = localStorage.getItem(FINGERPRINT_KEY);
    const currentFingerprint = serverModified ? String(serverModified) : null;

    if (currentFingerprint && storedFingerprint === currentFingerprint) {
      // Fingerprints match — file has not changed, skip the upload entirely
      setNoChangesModalOpen(true);
      return;
    }

    // Step 3: Fingerprint is new or different — proceed with actual sync
    try {
      const result = await refreshFromExcel().unwrap();
      setSyncSummary(result);
      const bySr = {};
      (result.changes || []).forEach((c) => {
        const sr = c.sr ?? c.Sr;
        if (sr != null) bySr[sr] = c;
      });
      setLastChangeBySr(bySr);
      setSyncModalOpen(true);
      const changed = result.updatedRows ?? result.UpdatedRows ?? 0;
      message.success(
        changed > 0
          ? `${changed} row(s) updated from Excel. See sync summary for details.`
          : (result.message || 'Interview data synced from Excel.')
      );
      refetchStats();
      refetchPaged();
      refetchStatusBreakdown();
      // After successful sync, store the new fingerprint
      const newStatus = await refetchSyncStatus();
      const newModified = newStatus?.data?.sourceFileLastModified ?? newStatus?.data?.SourceFileLastModified;
      if (newModified) {
        localStorage.setItem(FINGERPRINT_KEY, String(newModified));
      }
    } catch (err) {
      message.error(err?.data?.message || 'Excel sync failed. Check network path and API logs.');
    }
  };

  const getRowHighlightClass = (record) => {
    const status = getInterviewRowStatus(record);
    const lower = status.toLowerCase();
    if (lower.includes('cancel')) return 'interviews-row-cancelled';
    if (lower.includes('postpon') || lower.includes('resched')) return 'interviews-row-postponed';
    const touched = record.UpdatedAt || record.LastSyncedAt;
    if (touched && dayjs(touched).isSame(dayjs(), 'day')) return 'interviews-row-changed-today';
    return '';
  };

  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const hide = message.loading('Replacing data from your file...', 0);
    try {
      const res = await seedInterviews(formData).unwrap();
      hide();
      message.success(res.message || `Imported ${res.count} rows from Excel/CSV.`);
      refetchStats();
      refetchPaged();
      refetchStatusBreakdown();
    } catch (err) {
      hide();
      message.error(err?.data?.message || 'Upload failed.');
    }
    return false;
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete this row?',
      okType: 'danger',
      onOk: async () => {
        await deleteInterview(id).unwrap();
        message.success('Deleted.');
        refetchStats();
        refetchPaged();
        refetchStatusBreakdown();
      },
    });
  };

  const handleOpenAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleOpenEdit = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      JobStartDate: record.JobStartDate ? dayjs(record.JobStartDate) : null,
      JobCloseDate: record.JobCloseDate ? dayjs(record.JobCloseDate) : null,
    });
    setIsModalVisible(true);
  };

  const handleFormSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        JobStartDate: values.JobStartDate ? values.JobStartDate.toISOString() : null,
        JobCloseDate: values.JobCloseDate ? values.JobCloseDate.toISOString() : null,
      };
      if (editingRecord) {
        await updateInterview({ id: editingRecord.Id, ...payload }).unwrap();
        message.success('Updated.');
      } else {
        await createInterview(payload).unwrap();
        message.success('Added.');
      }
      setIsModalVisible(false);
      refetchStats();
      refetchPaged();
      refetchStatusBreakdown();
    } catch {
      message.error('Save failed.');
    }
  };

  const handleExport = () => {
    if (!rows.length) return message.warning('No rows to export.');
    const headers = buildExportHeaders(rows);
    const csv = [
      headers.join(','),
      ...rows.map((r) => rowToExportLine(r, headers).join(',')),
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `interviews-${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
  };

  const labelColor = isDarkMode ? '#94a3b8' : '#64748b';
  const strongColor = isDarkMode ? '#f1f5f9' : '#1e293b';
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';

  const hasExcelColumns = useMemo(
    () => rows.some((r) => Object.keys(parseRawRowJson(r)).length > 0),
    [rows]
  );

  const dataColumns = useMemo(
    () => buildInterviewTableColumns(rows, { formatDate, navigate }),
    [rows, navigate]
  );

  const tableColumns = useMemo(() => {
    const statusCol = hasExcelColumns
      ? [{
        title: 'Status',
        dataIndex: 'Status',
        key: 'Status',
        width: 110,
        fixed: 'right',
        render: (_, record) => <InterviewStatusBadge status={getInterviewRowStatus(record)} />,
      }]
      : [];

    const actionCol = isAdmin ? [{
      title: 'Action',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Change history">
            <Button type="text" size="small" icon={<HistoryOutlined />} onClick={() => setHistoryInterview(record)} />
          </Tooltip>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)} />
          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.Id)} />
        </Space>
      ),
    }] : [];

    return [
      ...dataColumns,
      ...statusCol,
      ...actionCol,
    ];
  }, [dataColumns, hasExcelColumns, isAdmin]);

  const tableScrollX = Math.max(1400, tableColumns.reduce((sum, c) => sum + (c.width || 120), 0));

  return (
    <div className="space-y-5" style={{ overflowX: 'visible' }}>
      <div className="flex flex-col gap-3">
        {/* Top row: title */}
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, color: strongColor, position: 'relative', zIndex: 1 }}>
            {stackFilter && stackFilter !== 'All' ? `${stackFilter} Interviews` : 'Interviews'}
          </Title>
        </div>

        {/* Bottom row: stack filter + action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={stackFilter}
            onChange={(v) => { setStackFilter(v); setCurrentPage(1); }}
            style={{ minWidth: 140 }}
            showSearch
            optionFilterProp="children"
            placeholder="Filter by Stack"
          >
            <Option value="All">All Stacks</Option>
            <Option value="AI/ML">AI/ML</Option>
            <Option value="Snow">Snow</Option>
            <Option value="Data">Data</Option>
            <Option value="DevOps">DevOps</Option>
          </Select>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <Tooltip title="Sync from network Excel">
              <Button
                icon={<SyncOutlined />}
                loading={isSyncing}
                onClick={handleRefreshFromExcel}
                className="border-[#4f46e5] text-[#4f46e5]"
              >
                Refresh
              </Button>
            </Tooltip>
            <Radio.Group value={viewType} onChange={(e) => setViewType(e.target.value)} buttonStyle="solid" className="interviews-view-toggle">
              <Radio.Button value="table"><UnorderedListOutlined /> List</Radio.Button>
              <Radio.Button value="grid"><AppstoreOutlined /> Grid</Radio.Button>
            </Radio.Group>
             {isAdmin && (
              <Upload accept=".csv,.xlsx,.xls" showUploadList={false} beforeUpload={handleUpload}>
                <Button icon={<ImportOutlined />} loading={isSeeding}>Upload Excel</Button>
              </Upload>
            )}
          </div>
        </div>
      </div>

      <InterviewStatusOverview
        breakdown={statusBreakdown}
        totalRows={totalRows}
        selectedStatuses={selectedStatuses}
        onToggle={handleStatusToggle}
        onTotalClick={handleStatCardClick}
        totalActive={statFilter === 'all' && selectedStatuses.length === 0}
        loading={statusBreakdownLoading}
        scopeLabel={null}
        singleLine={true}
      />

      {selectedStatuses.length > 0 && (
        <Paragraph className="!mb-0 text-xs font-semibold" style={{ color: '#4f46e5' }}>
          Showing {pagedData?.total ?? 0} rows · Status: {selectedStatuses[0]}
          {' '}<span style={{ fontWeight: 400, color: '#94a3b8' }}>(click card again to clear)</span>
        </Paragraph>
      )}

      {/* ── Filter Bar ── */}
      <Card
        className="rounded-2xl shadow-sm border-slate-200 dark:border-slate-800"
        style={{ background: isDarkMode ? '#1e293b' : '#ffffff' }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} lg={6}>
            <Input
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Search name, company, role, job hunter..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              allowClear
              className="white-search-input rounded-lg"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Select value={companyFilter} onChange={(v) => { setCompanyFilter(v); setCurrentPage(1); }} className="w-full" showSearch optionFilterProp="children">
              <Option value="All">All Companies</Option>
              {companyNames.map((n) => <Option key={n} value={n}>{n}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Select
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setSelectedStatuses([]);
                setSearchParams({}, { replace: true });
                setCurrentPage(1);
              }}
              className="w-full"
            >
              <Option value="All">Any Outcome</Option>
              <Option value="Scheduled">Scheduled</Option>
              <Option value="Converted">Converted</Option>
              <Option value="Rejected">Rejected</Option>
              <Option value="Dropped">Dropped</Option>
              <Option value="Closed">Closed</Option>
              <Option value="Dead">Dead</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Select value={candidateFilter} onChange={(v) => { setCandidateFilter(v); setCurrentPage(1); }} className="w-full" showSearch optionFilterProp="children">
              <Option value="All">All Profiles</Option>
              {candidateNames.map((n) => <Option key={n} value={n}>{n}</Option>)}
            </Select>
          </Col>

          <Col xs={24} sm={24} lg={12}>
            <div className="flex flex-wrap items-center gap-2">
              <Tooltip title="Filter by Date Range">
                <Button
                  icon={<CalendarOutlined />}
                  onClick={toggleDatePicker}
                  className={showDatePicker ? 'border-[#4f46e5] text-[#4f46e5]' : ''}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {showDatePicker ? 'Clear Dates' : 'Date Filter'}
                </Button>
              </Tooltip>
              {showDatePicker && (
                <>
                  <DatePicker
                    value={dateFromFilter}
                    onChange={handleDateFromChange}
                    placeholder="From"
                    style={{ minWidth: 130 }}
                    format="MMM D, YYYY"
                  />
                  <DatePicker
                    value={dateToFilter}
                    onChange={handleDateToChange}
                    placeholder="To"
                    style={{ minWidth: 130 }}
                    format="MMM D, YYYY"
                  />
                </>
              )}
            </div>
          </Col>

        </Row>
      </Card>

      {viewType === 'table' ? (
        <Card variant="borderless" className="shadow-sm rounded-2xl overflow-hidden" styles={{ body: { padding: 0 } }}>
          <div className="w-full overflow-x-auto">
            <Table
              className="interviews-portal-table"
              columns={tableColumns}
              dataSource={rows}
              rowKey="Id"
              loading={isLoading}
              rowClassName={(record, i) => {
                const highlight = getRowHighlightClass(record);
                if (highlight) return highlight;
                return i % 2 === 1 ? 'interviews-row-alt' : '';
              }}
              pagination={{
                current: currentPage,
                pageSize,
                total: pagedData?.total || 0,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (t, r) => `${r[0]}-${r[1]} of ${t} rows`,
                onChange: (p, s) => { setCurrentPage(p); setPageSize(s); },
              }}
              scroll={{ x: tableScrollX }}
              size="middle"
            />
          </div>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="text-center py-16">
          <UserOutlined style={{ fontSize: 48, color: '#d1d5db' }} />
          <Title level={4}>No rows — upload your Excel file</Title>
        </Card>
      ) : (
        <Row gutter={[12, 12]}>
          {rows.map((r) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={r.Id}>
              <Card
                size="small"
                className="shadow-sm h-full"
                style={{ background: cardBg, borderRadius: 12 }}
                extra={
                  <Space size={4}>
                    {lastChangeBySr[r.Sr] && (
                      <Tag color="volcano" className="!m-0 text-[10px]">
                        {(lastChangeBySr[r.Sr].changeType ?? lastChangeBySr[r.Sr].ChangeType) || 'Changed'}
                      </Tag>
                    )}
                    <InterviewStatusBadge status={getInterviewRowStatus(r)} />
                  </Space>
                }
                title={<span className="font-bold">{r.CompanyName || 'No company'}</span>}
              >
                <div className="space-y-1 text-sm">
                  <div><Text type="secondary">Sr:</Text> {r.Sr ?? '—'}</div>
                  <div><Text type="secondary">Inv To:</Text> {r.InvTo || '—'}</div>
                  <div><Text type="secondary">Interviewee:</Text>{' '}
                    <button type="button" className="text-purple-600 font-semibold border-0 bg-transparent p-0 cursor-pointer" onClick={() => r.IntervieweeName && setSelectedCandidate(r.IntervieweeName)}>
                      {r.IntervieweeName || '—'}
                    </button>
                  </div>
                  <div className="line-clamp-2"><Text type="secondary">Job Profile:</Text> {r.InterviewFor || '—'}</div>
                  <div><Text type="secondary">Job Hunter:</Text> {r.JobHunterName || '—'}</div>
                  <div className="pt-1 border-t border-gray-100 dark:border-slate-700 flex justify-between text-xs">
                    <span>Start: {formatDate(r.JobStartDate)}</span>
                    <span>Close: {formatDate(r.JobCloseDate)}</span>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal title={editingRecord ? 'Edit row' : 'Add row'} open={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null} width={720} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={handleFormSubmit} className="mt-4">
          <Row gutter={16}>
            <Col span={8}><Form.Item name="InvTo" label="Inv To" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="Sr" label="Sr"><InputNumber className="w-full" /></Form.Item></Col>
            <Col span={8}><Form.Item name="JobHunterName" label="Job Hunter Name"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="InterviewFor" label="Job Profile"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="IntervieweeName" label="Interviewee Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="CompanyName" label="Company Name"><Input /></Form.Item></Col>
            <Col span={6}><Form.Item name="JobStartDate" label="Job Start Date"><DatePicker className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="JobCloseDate" label="Job Close Date"><DatePicker className="w-full" /></Form.Item></Col>
          </Row>
          <div className="flex justify-end gap-2 pt-4">
            <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={isCreating || isUpdating} className="bg-[#4f46e5] border-none">Save</Button>
          </div>
        </Form>
      </Modal>

      <InterviewSyncSummaryModal
        open={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        summary={syncSummary}
      />
      <InterviewHistoryModal
        open={!!historyInterview}
        onClose={() => setHistoryInterview(null)}
        interview={historyInterview}
        history={historyRows}
        loading={historyLoading}
      />

      {/* No-changes modal — shown when file fingerprint matches (zero server load) */}
      <Modal
        open={noChangesModalOpen}
        onCancel={() => setNoChangesModalOpen(false)}
        footer={[
          <Button key="close" type="primary" className="bg-[#4f46e5] border-none" onClick={() => setNoChangesModalOpen(false)}>
            Close
          </Button>
        ]}
        title={
          <span className="flex items-center gap-2 font-bold text-base">
            <span style={{ color: '#059669' }}>✓</span> No Changes Detected
          </span>
        }
        width={420}
      >
        <div className="py-4 text-center space-y-3">
          <div style={{ fontSize: 48 }}>✅</div>
          <Text strong className="text-base block">Your data is already up to date.</Text>
          <Text type="secondary" className="text-sm block">
            The Excel file has not been modified since the last sync. No upload was sent to the server.
          </Text>
          {(syncStatus?.lastSyncedAt ?? syncStatus?.LastSyncedAt) && (
            <Text type="secondary" className="text-xs block">
              Last synced: {dayjs(syncStatus.lastSyncedAt ?? syncStatus.LastSyncedAt).format('MMM D, YYYY h:mm A')}
            </Text>
          )}
        </div>
      </Modal>
      <CandidateDrawer
        candidateName={selectedCandidate}
        open={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
      />
    </div>
  );
};

export default Interviews;

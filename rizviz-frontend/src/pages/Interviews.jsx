import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card, Table, Button, Space, Tag, Modal, Form, Input, DatePicker, Select, Typography, App,
  Tooltip, InputNumber, Row, Col, Radio, Alert, Upload, Popconfirm, TimePicker, Tabs, Checkbox,
} from 'antd';
import {
  PlusOutlined, UserOutlined,
  ReloadOutlined, EditOutlined, DeleteOutlined, ImportOutlined,
  SaveOutlined, CloseOutlined,
  DownloadOutlined, SearchOutlined, AppstoreOutlined, UnorderedListOutlined,
  CalendarOutlined, HistoryOutlined, SyncOutlined, LinkOutlined,
  FileTextOutlined, DollarOutlined, ClockCircleOutlined, CheckCircleOutlined, SolutionOutlined, EyeOutlined,
} from '@ant-design/icons';
import CandidateDrawer from '../components/interviews/CandidateDrawer';
import InterviewMktDetailsModal, { InterviewMktDetailsContent } from '../components/interviews/InterviewMktDetailsModal';
import {
  useGetInterviewsPagedQuery,
  useGetInterviewStatsQuery,
  useGetInterviewStatusBreakdownQuery,
  useGetInterviewCandidateNamesQuery,
  useGetInterviewCompanyNamesQuery,
  useGetInterviewStackNamesQuery,
  useGetInterviewJobHunterNamesQuery,
  useGetInterviewInvToNamesQuery,
  useGetInterviewBdDevNamesQuery,
  useCreateInterviewMutation,
  useUpdateInterviewMutation,
  useDeleteInterviewMutation,
  useSeedInterviewsMutation,
  useSyncUploadInterviewsMutation,
  useRefreshInterviewsFromExcelMutation,
  useGetInterviewSyncStatusQuery,
  useLazyGetLastSyncResultQuery,
  useGetInterviewHistoryQuery,
  useGetFilekeyTodayQuery,
  useLazySearchArchiveQuery,
  useGetProfileOwnersQuery,
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
  formatDateTime,
} from '../utils/interviewTableColumns';
import dayjs from 'dayjs';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

const DEFAULT_STACKS = ['Snow', 'AI/Ml', 'DevOps', 'Data Sc.'];

const formatDate = (d) => {
  if (d == null || d === '' || String(d).toLowerCase() === '(blank)') return '—';
  const parsed = dayjs(d);
  return parsed.isValid() ? parsed.format('MMM D, YYYY') : '—';
};

const Interviews = () => {
  const { message } = App.useApp();
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const { role, interviewName, user } = useSelector((state) => state.auth);
  const isAdmin = role === 'Admin';
  const isInterviewee = role === 'Interviewee';
  const currentUserCandidate = (interviewName || user?.fullName || user?.FullName || user?.username || '').trim();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewType, setViewType] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'grid' : 'table'));
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('All');
  const [candidateFilter, setCandidateFilter] = useState(() => (isInterviewee && currentUserCandidate ? currentUserCandidate : 'All'));
  const [companyFilter, setCompanyFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [recentOnly, setRecentOnly] = useState(false);
  const [statFilter, setStatFilter] = useState('all');
  const [stackFilter, setStackFilter] = useState('All');
  const [dateFromFilter, setDateFromFilter] = useState(() => {
    const fromUrl = searchParams.get('date_from');
    if (fromUrl) return dayjs(fromUrl);
    if (searchParams.get('all_dates') === 'true') return null;
    const saved = localStorage.getItem('interviews_date_from');
    if (saved) return dayjs(saved);
    return dayjs();
  });
  const [dateToFilter, setDateToFilter] = useState(() => {
    const toUrl = searchParams.get('date_to');
    if (toUrl) return dayjs(toUrl);
    if (searchParams.get('all_dates') === 'true') return null;
    const saved = localStorage.getItem('interviews_date_to');
    if (saved) return dayjs(saved);
    return dayjs();
  });
  const [showDatePicker, setShowDatePicker] = useState(true);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const lastSyncedRef = useRef(null);
  const [syncSummary, setSyncSummary] = useState(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [noChangesModalOpen, setNoChangesModalOpen] = useState(false);
  const [lastChangeBySr, setLastChangeBySr] = useState({});
  const [historyInterview, setHistoryInterview] = useState(null);
  const [mktModalInterviewId, setMktModalInterviewId] = useState(null);

  // ── Archive search state ──────────────────────────────────────────────────
  const [archiveDateFrom, setArchiveDateFrom] = useState(null);
  const [archiveDateTo, setArchiveDateTo] = useState(null);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archivePanelOpen, setArchivePanelOpen] = useState(false);
  const [triggerArchiveSearch, archiveResult] = useLazySearchArchiveQuery();
  const archiveRows = archiveResult?.data?.data || [];
  const archiveTotal = archiveResult?.data?.total || 0;
  const archiveLoading = archiveResult?.isFetching || archiveResult?.isLoading || false;

  // ── Archive inline editing state ──────────────────────────────────────────
  const [archiveEditingKey, setArchiveEditingKey] = useState('');
  const [archiveEditForm] = Form.useForm();
  const isArchiveEditing = useCallback((record) => String(record.Id) === archiveEditingKey, [archiveEditingKey]);

  const startArchiveEdit = useCallback((record) => {
    archiveEditForm.setFieldsValue({
      ...record,
      InterviewDate: record.InterviewDate ? dayjs(record.InterviewDate) : null,
      JobStartDate:  record.JobStartDate  ? dayjs(record.JobStartDate)  : null,
      JobCloseDate:  record.JobCloseDate  ? dayjs(record.JobCloseDate)  : null,
    });
    setArchiveEditingKey(String(record.Id));
  }, [archiveEditForm]);

  const cancelArchiveEdit = useCallback(() => {
    setArchiveEditingKey('');
    archiveEditForm.resetFields();
  }, [archiveEditForm]);
  // ── End archive inline editing state ─────────────────────────────────────

  const handleArchiveSearch = () => {
    if (!archiveDateFrom && !archiveDateTo && !archiveSearch.trim()) {
      message.warning('Enter a date range or search term to look up past interviews.');
      return;
    }
    const candidateQuery = (isInterviewee && currentUserCandidate)
      ? (archiveSearch.trim() ? `${archiveSearch.trim()} ${currentUserCandidate}` : currentUserCandidate)
      : (archiveSearch.trim() || undefined);

    triggerArchiveSearch({
      from:   archiveDateFrom ? dayjs(archiveDateFrom).format('YYYY-MM-DD') : undefined,
      to:     archiveDateTo   ? dayjs(archiveDateTo).format('YYYY-MM-DD')   : undefined,
      search: candidateQuery,
      limit:  500,
    });
  };

  const handleArchiveClear = () => {
    setArchiveDateFrom(null);
    setArchiveDateTo(null);
    setArchiveSearch('');
    setArchiveEditingKey('');
    archiveEditForm.resetFields();
    setArchivePanelOpen(false);
  };
  // ── End archive search state ──────────────────────────────────────────────

  // --- Client-side file fingerprint for zero-upload optimization ---
  const FINGERPRINT_KEY = 'interview_file_fingerprint';

  const dateFrom = dateFromFilter ? dayjs(dateFromFilter).format('YYYY-MM-DD') : '';
  const dateTo = dateToFilter ? dayjs(dateToFilter).format('YYYY-MM-DD') : '';

  const effectiveCandidate = (isInterviewee && currentUserCandidate)
    ? currentUserCandidate
    : (candidateFilter === 'All' ? '' : candidateFilter);

   const listFilters = useMemo(() => ({
     search,
     company: companyFilter === 'All' ? '' : companyFilter,
     candidate: effectiveCandidate,
     date_from: dateFrom,
     date_to: dateTo,
     metric: statFilter === 'all' ? '' : statFilter,
     stack: stackFilter === 'All' ? '' : stackFilter,
   }), [search, companyFilter, effectiveCandidate, dateFrom, dateTo, statFilter, stackFilter]);

  /** Status cards: full dataset for user (no date window) so every status appears */
  const statusOverviewFilters = useMemo(() => ({
    search,
    company: companyFilter === 'All' ? '' : companyFilter,
    candidate: effectiveCandidate,
    stack: stackFilter === 'All' ? '' : stackFilter,
  }), [search, companyFilter, effectiveCandidate, stackFilter]);

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

  const isTodayActive = useMemo(() => {
    if (!dateFromFilter || !dateToFilter) return false;
    const todayStr = dayjs().format('YYYY-MM-DD');
    return dayjs(dateFromFilter).format('YYYY-MM-DD') === todayStr &&
           dayjs(dateToFilter).format('YYYY-MM-DD') === todayStr;
  }, [dateFromFilter, dateToFilter]);

  const handleSetToday = () => {
    const today = dayjs();
    setDateFromFilter(today);
    setDateToFilter(today);
    setShowDatePicker(true);
    const formatted = today.format('YYYY-MM-DD');
    localStorage.setItem('interviews_date_from', formatted);
    localStorage.setItem('interviews_date_to', formatted);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('date_from', formatted);
      next.set('date_to', formatted);
      next.delete('all_dates');
      return next;
    }, { replace: true });
    setCurrentPage(1);
  };

  const handleClearDateFilter = () => {
    setDateFromFilter(null);
    setDateToFilter(null);
    localStorage.removeItem('interviews_date_from');
    localStorage.removeItem('interviews_date_to');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('date_from');
      next.delete('date_to');
      next.set('all_dates', 'true');
      return next;
    }, { replace: true });
    setCurrentPage(1);
  };

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
      next.delete('all_dates');
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
      next.delete('all_dates');
      return next;
    }, { replace: true });
  };

  const toggleDatePicker = () => {
    if (showDatePicker && !dateFromFilter && !dateToFilter) {
      setShowDatePicker(false);
    } else {
      setShowDatePicker(true);
    }
  };

  const statusScopeLabel = isAdmin
    ? 'All interviews — admin view'
    : `Your interviews${interviewName ? ` (${interviewName})` : ''}`;

  // ── Add-Interview modal state ─────────────────────────────────────────────
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();

  // ── Inline row editing state (callbacks defined after mutations below) ─────
  const [editingKey, setEditingKey] = useState('');
  const [editForm] = Form.useForm();
  const isEditing = useCallback((record) => String(record.Id) === editingKey, [editingKey]);

  const cancelInlineEdit = useCallback(() => {
    setEditingKey('');
    editForm.resetFields();
  }, [editForm]);

  const startInlineEdit = useCallback((record) => {
    editForm.setFieldsValue({
      ...record,
      InterviewDate: record.InterviewDate ? dayjs(record.InterviewDate) : null,
      JobStartDate:  record.JobStartDate  ? dayjs(record.JobStartDate)  : null,
      JobCloseDate:  record.JobCloseDate  ? dayjs(record.JobCloseDate)  : null,
    });
    setEditingKey(String(record.Id));
  }, [editForm]);
  // ── saveInlineEdit is declared after mutations (see below) ─────────────────

  const { data: pagedData, isLoading, isFetching: isPagedFetching, isError: isPagedError, refetch: refetchPaged } = useGetInterviewsPagedQuery({
    page: viewType === 'grid' ? 1 : currentPage,
    limit: viewType === 'grid' ? 500 : pageSize,
    ...listFilters,
    statuses: statusesParam,
  }, {
    pollingInterval: 5000,
  });

  const { data: stats, isFetching: isStatsFetching, refetch: refetchStats } = useGetInterviewStatsQuery(
    isInterviewee && currentUserCandidate ? { candidate: currentUserCandidate } : {},
    { pollingInterval: 5000 }
  );
  const {
    data: statusBreakdown = [],
    isFetching: statusBreakdownLoading,
    refetch: refetchStatusBreakdown,
  } = useGetInterviewStatusBreakdownQuery(statusOverviewFilters, {
    pollingInterval: 5000,
  });
  const { data: syncStatus, isFetching: isSyncStatusFetching, refetch: refetchSyncStatus } = useGetInterviewSyncStatusQuery(undefined, {
    pollingInterval: 5000,
  });

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const handleRefreshDb = async () => {
    setIsManualRefreshing(true);
    try {
      await Promise.all([
        refetchPaged(),
        refetchStats(),
        refetchStatusBreakdown(),
      ]);
      message.success('Interviews refreshed from database.');
    } catch (e) {
      message.error('Failed to refresh interviews.');
    } finally {
      setIsManualRefreshing(false);
    }
  };
  const { data: candidateNames = [] } = useGetInterviewCandidateNamesQuery();
  const { data: companyNames = [] } = useGetInterviewCompanyNamesQuery();
  const { data: stackNames = [] } = useGetInterviewStackNamesQuery();
  const { data: jobHunterNames = [] } = useGetInterviewJobHunterNamesQuery();
  const { data: invToNames = [] } = useGetInterviewInvToNamesQuery();
  const { data: bdDevNames = [] } = useGetInterviewBdDevNamesQuery();
  const { data: profileOwners = [] } = useGetProfileOwnersQuery();
  const [triggerGetLastSyncResult] = useLazyGetLastSyncResultQuery();

  // ── FileKey: fetched on page load; date comes from server only ──────────────
  const { data: filekeyData, error: filekeyError } = useGetFilekeyTodayQuery(undefined, {
    // skip: false — always run; server returns 400 on weekends (isWeekend flag)
  });
  // On weekdays the response is in `data`; on weekends it's a 400 in `error.data`
  const filekeyPayload = filekeyData ?? filekeyError?.data ?? null;
  const todayFileKey   = filekeyPayload?.fileKey  ?? null;
  const isWeekendDay   = filekeyPayload?.isWeekend ?? false;

  const allStacks = useMemo(() => {
    const combined = [...DEFAULT_STACKS, ...stackNames];
    const seen = new Set();
    const result = [];
    for (const item of combined) {
      if (item && typeof item === 'string') {
        const lower = item.trim().toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          result.push(item.trim());
        }
      }
    }
    return result.sort((a, b) => a.localeCompare(b));
  }, [stackNames]);

  const isRefreshing = isManualRefreshing || isPagedFetching || isStatsFetching || statusBreakdownLoading || isSyncStatusFetching;

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

      // Fetch the last sync result details from database/memory cache to show popup
      triggerGetLastSyncResult().unwrap()
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
  const [syncUploadInterviews, { isLoading: isSyncUploading }] = useSyncUploadInterviewsMutation();
  const [refreshFromExcel, { isLoading: isSyncing }] = useRefreshInterviewsFromExcelMutation();
  const { data: historyRows = [], isFetching: historyLoading } = useGetInterviewHistoryQuery(
    historyInterview?.Id,
    { skip: !historyInterview?.Id }
  );

  // ── saveInlineEdit: declared here so updateInterview/refetch* are in scope ──
  const saveInlineEdit = useCallback(async (record) => {
    try {
      const values = await editForm.validateFields();
      const payload = {
        ...record,
        ...values,
        InterviewDate: values.InterviewDate ? (dayjs.isDayjs(values.InterviewDate) ? values.InterviewDate.format('YYYY-MM-DD') : values.InterviewDate) : null,
        JobStartDate:  values.JobStartDate  ? (dayjs.isDayjs(values.JobStartDate)  ? values.JobStartDate.format('YYYY-MM-DD')  : values.JobStartDate)  : null,
        JobCloseDate:  values.JobCloseDate  ? (dayjs.isDayjs(values.JobCloseDate)  ? values.JobCloseDate.format('YYYY-MM-DD')  : values.JobCloseDate)  : null,
        InterviewCharges:    Number(values.InterviewCharges    ?? record.InterviewCharges    ?? 0),
        JhDue:               Number(values.JhDue               ?? record.JhDue               ?? 0),
        FirstPaymentOnJob:   Number(values.FirstPaymentOnJob   ?? record.FirstPaymentOnJob   ?? 0),
        SecondPaymentOnJob:  Number(values.SecondPaymentOnJob  ?? record.SecondPaymentOnJob  ?? 0),
        BalancePayable:      Number(values.BalancePayable      ?? record.BalancePayable      ?? 0),
      };
      await updateInterview({ id: record.Id ?? record.id, ...payload }).unwrap();
      message.success('Saved to database.');
      setEditingKey('');
      editForm.resetFields();
      refetchStats();
      refetchPaged();
      refetchStatusBreakdown();
    } catch (err) {
      if (err?.errorFields) return; // validation errors — stay in edit mode
      message.error(err?.data?.message || err?.message || 'Save failed.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editForm, updateInterview, refetchStats, refetchPaged, refetchStatusBreakdown, message]);
  // ── End inline editing callbacks ───────────────────────────────────────────

  const handleRefreshFromExcel = async () => {
    // Perform actual server-side file sync (works on both localhost and production using the persistently saved Excel file)
    const hide = message.loading('Syncing data from Excel...', 0);
    try {
      const result = await refreshFromExcel().unwrap();
      hide();
      const deletedCount = (result.changes || []).filter(c => String(c.changeType || c.ChangeType || '').toLowerCase() === 'deleted').length;
      const changed = (result.updatedRows ?? result.UpdatedRows ?? 0) +
                      (result.insertedRows ?? result.InsertedRows ?? 0) +
                      deletedCount;

      if (changed > 0) {
        setSyncSummary(result);
        const bySr = {};
        (result.changes || []).forEach((c) => {
          const sr = c.sr ?? c.Sr;
          if (sr != null) bySr[sr] = c;
        });
        setLastChangeBySr(bySr);
        setSyncModalOpen(true);
        message.success(`${changed} row(s) updated from Excel. See sync summary for details.`);
      } else {
        setNoChangesModalOpen(true);
      }
      refetchStats();
      refetchPaged();
      refetchStatusBreakdown();
    } catch (err) {
      hide();
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

  // Core upload handler
  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const hide = message.loading('Syncing data from your file...', 0);
    try {
      const result = await syncUploadInterviews(formData).unwrap();
      hide();

      const deletedCount = (result.changes || []).filter(c => String(c.changeType || c.ChangeType || '').toLowerCase() === 'deleted').length;
      const changed = (result.updatedRows ?? result.UpdatedRows ?? 0) +
                      (result.insertedRows ?? result.InsertedRows ?? 0) +
                      deletedCount;

      if (changed > 0) {
        setSyncSummary(result);
        const bySr = {};
        (result.changes || []).forEach((c) => {
          const sr = c.sr ?? c.Sr;
          if (sr != null) bySr[sr] = c;
        });
        setLastChangeBySr(bySr);
        setSyncModalOpen(true);
        message.success(`${changed} row(s) updated from your file. See sync summary for details.`);
      } else {
        setNoChangesModalOpen(true);
      }
      refetchStats();
      refetchPaged();
      refetchStatusBreakdown();
    } catch (err) {
      hide();
      message.error(err?.data?.message || 'Upload sync failed. Check file structure and try again.');
    }
    return false;
  };

  const handleDelete = async (id) => {
    if (!id) {
      message.error('Invalid interview record ID.');
      return;
    }
    const hide = message.loading('Deleting interview from database...', 0);
    try {
      await deleteInterview(id).unwrap();
      hide();
      message.success('Interview deleted permanently from database.');
      refetchStats();
      refetchPaged();
      refetchStatusBreakdown();
    } catch (err) {
      hide();
      const errorMsg = err?.data?.message || err?.message || (typeof err?.error === 'string' ? err.error : null);
      message.error(errorMsg || 'Delete failed. The row was not removed.');
    }
  };


  const handleOpenAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      DirectSelf: 'Self',
      TimeZone: 'EST',
      Status: 'Scheduled',
      InterviewType: 'Technical',
      PayscaleUnit: '/yr',
      InterviewDate: dayjs(),
      InvTo: 'TGS',
      JobLanded: false,
    });
    setIsModalVisible(true);
  };

  const handleOpenEdit = (record) => {
    setEditingRecord(record);
    const intDate = record.InterviewDate ? dayjs(record.InterviewDate) : null;
    const jobLandedDate = record.JobLandedDate || (record.Status === 'Hired' ? record.JobCloseDate : null);
    form.setFieldsValue({
      ...record,
      DirectSelf: record.DirectSelf || record.direct_self || 'Self',
      Location: record.Location || record.location || record.position || '',
      LeadName: record.LeadName || record.lead_name || record.lead_code || '',
      StaffingFirm: record.StaffingFirm || record.staffing_firm || '',
      ImplementationPartner: record.ImplementationPartner || record.implementation_partner || '',
      PayscaleVal: record.PayscaleVal ?? record.payscale_val ?? null,
      PayscaleUnit: record.PayscaleUnit || record.payscale_unit || '/yr',
      RecruiterName: record.RecruiterName || record.recruiter_name || '',
      JobLanded: !!(record.JobLanded || jobLandedDate || record.Status === 'Hired'),
      JobLandedDate: jobLandedDate ? dayjs(jobLandedDate) : null,
      JobReference: record.JobReference || record.job_reference || '',
      RejectionReason: record.RejectionReason || record.rejection_reason || '',
      Remarks: record.Remarks || record.remarks || '',
      TimeZone: record.TimeZone || record.time_zone || record.time_Zone || 'EST',
      ClientFeedback: record.ClientFeedback || record.client_feedback || record.BD_feedback || '',
      MeetingLink: record.MeetingLink || record.meeting_link || '',
      SearchName: record.SearchName || '',
      JobStartDate: record.JobStartDate ? dayjs(record.JobStartDate) : null,
      JobCloseDate: record.JobCloseDate ? dayjs(record.JobCloseDate) : null,
      InterviewDate: intDate,
      InterviewTime: intDate && (intDate.hour() !== 0 || intDate.minute() !== 0) ? intDate : null,
    });
    setIsModalVisible(true);
  };

  const handleFormSubmit = async (values) => {
    try {
      const payload = {
        ...(editingRecord || {}),
        ...values,
        DirectSelf: values.DirectSelf || 'Self',
        Location: values.Location || '',
        LeadName: values.LeadName || '',
        StaffingFirm: values.StaffingFirm || '',
        ImplementationPartner: values.ImplementationPartner || '',
        PayscaleVal: values.PayscaleVal != null && values.PayscaleVal !== '' ? Number(values.PayscaleVal) : null,
        PayscaleUnit: values.PayscaleUnit || '/yr',
        RecruiterName: values.RecruiterName || '',
        JobLandedDate: values.JobLandedDate ? (dayjs.isDayjs(values.JobLandedDate) ? values.JobLandedDate.format('YYYY-MM-DD') : values.JobLandedDate) : null,
        JobReference: values.JobReference || '',
        RejectionReason: values.RejectionReason || '',
        Remarks: values.Remarks || '',
        TimeZone: values.TimeZone || 'EST',
        ClientFeedback: values.ClientFeedback || '',
        MeetingLink: values.MeetingLink || '',
        SearchName: values.SearchName || '',
        JobStartDate: values.JobStartDate ? (dayjs.isDayjs(values.JobStartDate) ? values.JobStartDate.format('YYYY-MM-DD') : values.JobStartDate) : null,
        JobCloseDate: values.JobCloseDate ? (dayjs.isDayjs(values.JobCloseDate) ? values.JobCloseDate.format('YYYY-MM-DD') : values.JobCloseDate) : null,
        // Combine InterviewDate + InterviewTime into a single ISO datetime
        InterviewDate: (() => {
          const dateVal = values.InterviewDate;
          const timeVal = values.InterviewTime;
          if (!dateVal) return null;
          const base = dayjs.isDayjs(dateVal) ? dateVal : dayjs(dateVal);
          if (timeVal && dayjs.isDayjs(timeVal)) {
            return base.hour(timeVal.hour()).minute(timeVal.minute()).second(0).format('YYYY-MM-DDTHH:mm:ss');
          }
          return base.format('YYYY-MM-DD');
        })(),
        InterviewCharges: Number(values.InterviewCharges ?? editingRecord?.InterviewCharges ?? 0),
        JhDue: Number(values.JhDue ?? editingRecord?.JhDue ?? 0),
        FirstPaymentOnJob: Number(values.FirstPaymentOnJob ?? editingRecord?.FirstPaymentOnJob ?? 0),
        SecondPaymentOnJob: Number(values.SecondPaymentOnJob ?? editingRecord?.SecondPaymentOnJob ?? 0),
        BalancePayable: Number(values.BalancePayable ?? editingRecord?.BalancePayable ?? 0),
      };
      if (editingRecord) {
        await updateInterview({ id: editingRecord.Id ?? editingRecord.id, ...payload }).unwrap();
        message.success('Interview updated in database.');
      } else {
        await createInterview(payload).unwrap();
        message.success('Interview saved to database.');
      }
      setIsModalVisible(false);
      refetchStats();
      refetchPaged();
      refetchStatusBreakdown();
    } catch (err) {
      message.error(err?.data?.message || err?.message || 'Save failed. Changes were not written to the database.');
    }
  };

  const handleExport = () => {
    if (!rows.length) return message.warning('No rows to export.');
    const headers = buildExportHeaders(rows);
    const csv = [
      headers.join(','),
      ...rows.map((r) => rowToExportLine(r, headers).join(',')),
    ].join('\n');
    // ── Use today's FileKey as the filename when available ──────────────────
    const filename = todayFileKey
      ? `${todayFileKey}.csv`
      : `interviews-${dayjs().format('YYYY-MM-DD')}.csv`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = filename;
    a.click();
  };

  const labelColor = isDarkMode ? '#94a3b8' : '#64748b';
  const strongColor = isDarkMode ? '#f1f5f9' : '#1e293b';
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';

  const hasExcelColumns = useMemo(
    () => rows.some((r) => Object.keys(parseRawRowJson(r)).length > 0),
    [rows]
  );

  // ── Inline editable cell renderer ────────────────────────────────────────
  const EditableCell = useCallback(({
    editing, dataIndex, inputType, record, index, children, ...restProps
  }) => {
    let inputNode;
    if (inputType === 'date') {
      inputNode = <DatePicker className="w-full" size="small" format="MMM D, YYYY" />;
    } else if (inputType === 'number') {
      inputNode = <InputNumber className="w-full" size="small" min={0} />;
    } else if (dataIndex === 'Status') {
      inputNode = (
        <Select size="small" style={{ minWidth: 110 }}>
          <Option value="Scheduled">Scheduled</Option>
          <Option value="Converted">Converted</Option>
          <Option value="Rejected">Rejected</Option>
          <Option value="Dropped">Dropped</Option>
          <Option value="Closed">Closed</Option>
          <Option value="Dead">Dead</Option>
          <Option value="Postponed">Postponed</Option>
        </Select>
      );
    } else {
      inputNode = <Input size="small" />;
    }
    return (
      <td {...restProps}>
        {editing ? (
          <Form.Item name={dataIndex} style={{ margin: 0 }}>
            {inputNode}
          </Form.Item>
        ) : children}
      </td>
    );
  }, []);
  // ── End editable cell renderer ────────────────────────────────────────────

  const dataColumns = useMemo(
    () => buildInterviewTableColumns(rows, { formatDate, navigate }),
    [rows, navigate]
  );

  // Map of dataIndex → input type for inline editing
  const INLINE_INPUT_TYPE = {
    InterviewDate:      'date',
    JobStartDate:       'date',
    JobCloseDate:       'date',
    InterviewCharges:   'number',
    JhDue:              'number',
    FirstPaymentOnJob:  'number',
    SecondPaymentOnJob: 'number',
    BalancePayable:     'number',
    Sr:                 'number',
  };

  const tableColumns = useMemo(() => {
    // Model columns with editing support
    const modelEditableCols = [
      { title: 'Inv To',        dataIndex: 'InvTo',            key: 'InvTo',            width: 90,  editable: true },
      { title: 'Sr',            dataIndex: 'Sr',               key: 'Sr',               width: 70,  editable: true },
      { title: 'BD / Added By', dataIndex: 'JobHunterName',    key: 'JobHunterName',    width: 140, editable: true, ellipsis: true,
        render: (t, record) => isEditing(record) ? undefined : (
          <Tooltip title={`Added by BD: ${t || 'Unassigned'}`}>
            <span className="font-semibold" style={{ color: '#0284c7' }}>{t || '—'}</span>
          </Tooltip>
        ) },
      { title: 'Job Profile',   dataIndex: 'InterviewFor',     key: 'InterviewFor',     width: 150, editable: true, ellipsis: true },
      { title: 'Developer (Interviewee)', dataIndex: 'IntervieweeName', key: 'IntervieweeName', width: 160, editable: true,
        render: (t, record) => isEditing(record) ? undefined : (
          <button type="button" className="font-semibold text-left hover:underline border-0 bg-transparent cursor-pointer p-0" style={{ color: '#7c3aed' }}
            onClick={() => t && navigate(`/interviews/candidates/${encodeURIComponent(t)}`)}>
            {t || '—'}
          </button>
        ) },
      { title: 'Company',       dataIndex: 'CompanyName',      key: 'CompanyName',      width: 130, editable: true,
        render: (t, record) => isEditing(record) ? undefined : <Tag color="blue" className="m-0">{t || '—'}</Tag> },
      { title: 'Type',          dataIndex: 'InterviewType',    key: 'InterviewType',    width: 100, editable: true, ellipsis: true },
      { title: 'Stack',         dataIndex: 'Stack',            key: 'Stack',            width: 100, editable: true },
      { title: 'Status',        dataIndex: 'Status',           key: 'Status',           width: 120, editable: true,
        render: (s, record) => isEditing(record) ? undefined : <InterviewStatusBadge status={getInterviewRowStatus(record)} record={record} /> },
      { title: 'Interview Date & Time', dataIndex: 'InterviewDate', key: 'InterviewDate', width: 155, editable: true,
        render: (d, record) => isEditing(record) ? undefined : formatDateTime(d, record?.TimeZone ?? record?.timeZone) },
      { title: 'Job Start',     dataIndex: 'JobStartDate',     key: 'JobStartDate',     width: 110, editable: true, render: (d, record) => isEditing(record) ? undefined : formatDate(d) },
      { title: 'Job Close',     dataIndex: 'JobCloseDate',     key: 'JobCloseDate',     width: 110, editable: true, render: (d, record) => isEditing(record) ? undefined : formatDate(d) },
      { title: 'Charges',       dataIndex: 'InterviewCharges', key: 'InterviewCharges', width: 90,  editable: true, render: (t, record) => isEditing(record) ? undefined : (t ?? '—') },
      { title: 'JH Due',        dataIndex: 'JhDue',            key: 'JhDue',            width: 85,  editable: true, render: (t, record) => isEditing(record) ? undefined : (t ?? '—') },
      { title: '1st Pay',       dataIndex: 'FirstPaymentOnJob',  key: 'FirstPaymentOnJob',  width: 85, editable: true, render: (t, record) => isEditing(record) ? undefined : (t ?? '—') },
      { title: '2nd Pay',       dataIndex: 'SecondPaymentOnJob', key: 'SecondPaymentOnJob', width: 85, editable: true, render: (t, record) => isEditing(record) ? undefined : (t ?? '—') },
      { title: 'Balance',       dataIndex: 'BalancePayable',   key: 'BalancePayable',   width: 90,  editable: true, render: (t, record) => isEditing(record) ? undefined : (t ?? '—') },
    ];

    // Standard model columns with inline editing support on all rows
    const baseCols = modelEditableCols.map((col) => {
      if (!col.editable) return col;
      return {
        ...col,
        onCell: (record) => ({
          record,
          dataIndex: col.dataIndex,
          inputType: INLINE_INPUT_TYPE[col.dataIndex] || 'text',
          editing: isEditing(record),
        }),
      };
    });

    const actionCol = [{
      title: 'Action',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => {
        if (record.Id < 0) {
          return <Tag color="purple" style={{ fontFamily: 'monospace', fontSize: 11, margin: 0 }}>Archived</Tag>;
        }
        if (isEditing(record)) {
          // Inline edit mode — show Save / Cancel
          return (
            <Space size={4}>
              <Tooltip title="Save">
                <Button
                  type="primary"
                  size="small"
                  icon={<SaveOutlined />}
                  loading={isUpdating}
                  onClick={() => saveInlineEdit(record)}
                  style={{ background: '#059669', border: 'none' }}
                />
              </Tooltip>
              <Tooltip title="Cancel">
                <Button size="small" icon={<CloseOutlined />} onClick={cancelInlineEdit} />
              </Tooltip>
            </Space>
          );
        }
        // Normal mode — show All Details / History / Edit (inline) / Delete
        return (
          <Space size={4}>
            <Tooltip title="View Complete Data (Master, Detail & Stakeholders)">
              <Button
                type="text"
                size="small"
                icon={<SolutionOutlined style={{ color: '#6366f1', fontSize: 15 }} />}
                onClick={() => setMktModalInterviewId(record.Id ?? record.id ?? record.InterviewCode)}
                disabled={!!editingKey}
              />
            </Tooltip>
            <Tooltip title="Change history">
              <Button type="text" size="small" icon={<HistoryOutlined />} onClick={() => setHistoryInterview(record)} disabled={!!editingKey} />
            </Tooltip>
            <Tooltip title="Edit inline">
              <Button type="text" size="small" icon={<EditOutlined />} onClick={() => startInlineEdit(record)} disabled={!!editingKey} />
            </Tooltip>
            <Popconfirm
              title="Delete this record?"
              description="This cannot be undone and will permanently delete it from the database."
              okText="Delete"
              okType="danger"
              onConfirm={() => handleDelete(record.Id ?? record.id)}
              disabled={!!editingKey}
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} disabled={!!editingKey} />
            </Popconfirm>
          </Space>
        );
      },
    }];

    return [...baseCols, ...actionCol];
  }, [dataColumns, hasExcelColumns, isEditing, editingKey, isUpdating, startInlineEdit, cancelInlineEdit, saveInlineEdit, navigate]);

  const tableScrollX = Math.max(1400, tableColumns.reduce((sum, c) => sum + (c.width || 120), 0));

  return (
    <div className="space-y-5" style={{ overflowX: 'visible' }}>
      {isPagedError && (
        <Alert
          type="error"
          showIcon
          message="Unable to load interview data from the database. Please try again."
          action={<Button size="small" onClick={() => refetchPaged()}>Retry</Button>}
        />
      )}
      <div className="flex flex-col gap-3">

        {/* ── FileKey Banner ─────────────────────────────────────────── */}
        {isWeekendDay ? (
          <div
            id="filekey-weekend-banner"
            style={{
              background: isDarkMode
                ? 'linear-gradient(90deg, #3b2a00 0%, #1e293b 100%)'
                : 'linear-gradient(90deg, #fff7ed 0%, #fef3c7 100%)',
              border: '1.5px solid #f59e0b',
              borderRadius: 10,
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 14,
              color: isDarkMode ? '#fcd34d' : '#92400e',
              fontWeight: 600,
            }}
          >
            <span style={{ fontSize: 20 }}>🏖️</span>
            <span>Weekend hai — aaj file generate nahi hogi</span>
          </div>
        ) : todayFileKey ? (
          <div
            id="filekey-today-banner"
            style={{
              background: isDarkMode
                ? 'linear-gradient(90deg, #0f2027 0%, #1e293b 100%)'
                : 'linear-gradient(90deg, #ede9fe 0%, #e0f2fe 100%)',
              border: `1.5px solid ${isDarkMode ? '#6d28d9' : '#7c3aed'}`,
              borderRadius: 10,
              padding: '8px 18px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 13,
              color: isDarkMode ? '#c4b5fd' : '#4c1d95',
              fontWeight: 600,
              alignSelf: 'flex-start',
            }}
          >
            <span style={{ fontSize: 18 }}>&#128193;</span>
            <span>Today&apos;s File:&nbsp;</span>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: 14,
                color: isDarkMode ? '#a78bfa' : '#5b21b6',
                letterSpacing: 1,
              }}
            >
              {todayFileKey}
            </span>
          </div>
        ) : null}
        {/* ── End FileKey Banner ───────────────────────────────────────── */}

        {/* Top row: title */}
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, color: strongColor, position: 'relative', zIndex: 1 }}>
            {isInterviewee && currentUserCandidate
              ? `${currentUserCandidate}'s Interviews`
              : (isTodayActive ? `Today's Interviews (${dayjs().format('MMM D, YYYY')})` : (stackFilter && stackFilter !== 'All' ? `${stackFilter} Interviews` : 'Interviews'))}
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
            {allStacks.map((s) => <Option key={s} value={s}>{s}</Option>)}
          </Select>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {isAdmin && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenAdd}
                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', border: 'none', fontWeight: 600 }}
              >
                Add Interview
              </Button>
            )}
            <Tooltip title="Refresh interviews directly from database">
              <Button
                icon={<ReloadOutlined spin={isRefreshing} />}
                loading={isRefreshing}
                onClick={handleRefreshDb}
                className="border-[#4f46e5] text-[#4f46e5] font-semibold"
              >
                Refresh
              </Button>
            </Tooltip>
            {isAdmin && (
              <Tooltip title="Sync from network Excel">
                <Button
                  icon={<SyncOutlined />}
                  loading={isSyncing}
                  onClick={handleRefreshFromExcel}
                  className="border-slate-300 dark:border-slate-700"
                >
                  Sync Excel
                </Button>
              </Tooltip>
            )}
            <Radio.Group value={viewType} onChange={(e) => setViewType(e.target.value)} buttonStyle="solid" className="interviews-view-toggle">
              <Radio.Button value="table"><UnorderedListOutlined /> List</Radio.Button>
              <Radio.Button value="grid"><AppstoreOutlined /> Grid</Radio.Button>
            </Radio.Group>
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
            {isInterviewee && currentUserCandidate ? (
              <div
                className="flex items-center gap-2 px-3 rounded-lg border h-[32px]"
                style={{
                  borderColor: isDarkMode ? '#6366f1' : '#c7d2fe',
                  background: isDarkMode ? '#1e1b4b' : '#eef2ff',
                  color: isDarkMode ? '#c7d2fe' : '#4338ca',
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                <UserOutlined />
                <span className="truncate">{currentUserCandidate} (My Profile)</span>
              </div>
            ) : (
              <Select value={candidateFilter} onChange={(v) => { setCandidateFilter(v); setCurrentPage(1); }} className="w-full" showSearch optionFilterProp="children">
                <Option value="All">All Profiles</Option>
                {candidateNames.map((n) => <Option key={n} value={n}>{n}</Option>)}
              </Select>
            )}
          </Col>

          <Col xs={24} sm={24} lg={12}>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type={isTodayActive ? 'primary' : 'default'}
                icon={<CalendarOutlined />}
                onClick={handleSetToday}
                style={{
                  whiteSpace: 'nowrap',
                  fontWeight: isTodayActive ? 700 : 500,
                  ...(isTodayActive ? { background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', border: 'none' } : {})
                }}
              >
                Today
              </Button>
              <Button
                type={!dateFromFilter && !dateToFilter ? 'primary' : 'default'}
                onClick={handleClearDateFilter}
                style={{
                  whiteSpace: 'nowrap',
                  fontWeight: (!dateFromFilter && !dateToFilter) ? 700 : 500,
                  ...((!dateFromFilter && !dateToFilter) ? { background: '#0284c7', color: '#fff', border: 'none' } : {})
                }}
              >
                All Dates
              </Button>
              <DatePicker
                value={dateFromFilter}
                onChange={handleDateFromChange}
                placeholder="From"
                style={{ minWidth: 125 }}
                format="MMM D, YYYY"
              />
              <DatePicker
                value={dateToFilter}
                onChange={handleDateToChange}
                placeholder="To"
                style={{ minWidth: 125 }}
                format="MMM D, YYYY"
              />
              {isTodayActive && (
                <Tag color="purple" className="m-0 font-semibold" style={{ padding: '2px 8px' }}>
                  Today: {dayjs().format('MMM D, YYYY')}
                </Tag>
              )}
            </div>
          </Col>

        </Row>
      </Card>

      {/* ── Archive Search Panel ───────────────────────────────────────────── */}
      <Card
        id="archive-search-panel"
        className="rounded-2xl shadow-sm"
        style={{
          background: isDarkMode
            ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
            : 'linear-gradient(135deg, #f8faff 0%, #ede9fe 100%)',
          border: `1.5px solid ${isDarkMode ? '#4f46e5' : '#a5b4fc'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: archivePanelOpen ? 14 : 0 }}>
          <HistoryOutlined style={{ color: '#7c3aed', fontSize: 18 }} />
          <span style={{ fontWeight: 700, fontSize: 15, color: isDarkMode ? '#a78bfa' : '#4c1d95' }}>
            Past Interviews Archive
          </span>
          <Button
            type="link"
            size="small"
            style={{ color: '#7c3aed', marginLeft: 'auto' }}
            onClick={() => setArchivePanelOpen(v => !v)}
          >
            {archivePanelOpen ? '▲ Collapse' : '▼ Search'}
          </Button>
        </div>

        {archivePanelOpen && (
          <>
            {/* ── Search controls ── */}
            <Row gutter={[10, 10]} align="middle" style={{ marginTop: 4 }}>
              <Col xs={24} sm={12} md={5}>
                <DatePicker
                  value={archiveDateFrom}
                  onChange={setArchiveDateFrom}
                  placeholder="From date"
                  style={{ width: '100%' }}
                  format="MMM D, YYYY"
                />
              </Col>
              <Col xs={24} sm={12} md={5}>
                <DatePicker
                  value={archiveDateTo}
                  onChange={setArchiveDateTo}
                  placeholder="To date"
                  style={{ width: '100%' }}
                  format="MMM D, YYYY"
                />
              </Col>
              <Col xs={24} sm={24} md={10}>
                <Input
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="Search name, company, role…"
                  value={archiveSearch}
                  onChange={e => setArchiveSearch(e.target.value)}
                  onPressEnter={handleArchiveSearch}
                  allowClear
                />
              </Col>
              <Col xs={24} sm={24} md={4}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    onClick={handleArchiveSearch}
                    loading={archiveLoading}
                    style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', border: 'none', flex: 1 }}
                  >
                    Search
                  </Button>
                  <Button onClick={handleArchiveClear} icon={<ReloadOutlined />} />
                </div>
              </Col>
            </Row>

            {/* ── Results table with full CRUD ── */}
            {archiveResult?.isSuccess && (
              <>
                <div style={{ margin: '12px 0 6px', fontSize: 13, color: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 500 }}>
                  {archiveTotal === 0
                    ? 'No interviews found for the given criteria.'
                    : `Found ${archiveTotal} record${archiveTotal !== 1 ? 's' : ''}`}
                </div>

                {archiveRows.length > 0 && (
                  <div className="w-full overflow-x-auto" style={{ marginTop: 4 }}>
                    <Form form={archiveEditForm} component={false}>
                      <Table
                        size="small"
                        dataSource={archiveRows}
                        rowKey={r => String(r.Id)}
                        loading={archiveLoading}
                        pagination={{ pageSize: 20, showSizeChanger: false, showTotal: t => `${t} rows` }}
                        scroll={{ x: 2000 }}
                        style={{ borderRadius: 10, overflow: 'hidden' }}
                        components={{ body: { cell: EditableCell } }}
                        rowClassName={r => isArchiveEditing(r) ? 'interviews-row-editing' : ''}
                        columns={[
                          {
                            title: 'Sr', dataIndex: 'Sr', width: 60,
                            onCell: r => ({ record: r, dataIndex: 'Sr', inputType: 'number', editing: isArchiveEditing(r) }),
                          },
                          {
                            title: 'Inv To', dataIndex: 'InvTo', width: 90,
                            onCell: r => ({ record: r, dataIndex: 'InvTo', inputType: 'text', editing: isArchiveEditing(r) }),
                          },
                          {
                            title: 'Interviewee', dataIndex: 'IntervieweeName', width: 140,
                            onCell: r => ({ record: r, dataIndex: 'IntervieweeName', inputType: 'text', editing: isArchiveEditing(r) }),
                          },
                          {
                            title: 'Company', dataIndex: 'CompanyName', width: 140,
                            render: (t, r) => isArchiveEditing(r) ? undefined : <Tag color="blue" className="m-0">{t || '—'}</Tag>,
                            onCell: r => ({ record: r, dataIndex: 'CompanyName', inputType: 'text', editing: isArchiveEditing(r) }),
                          },
                          {
                            title: 'Job Profile', dataIndex: 'InterviewFor', width: 150,
                            onCell: r => ({ record: r, dataIndex: 'InterviewFor', inputType: 'text', editing: isArchiveEditing(r) }),
                          },
                          {
                            title: 'Job Hunter', dataIndex: 'JobHunterName', width: 130,
                            onCell: r => ({ record: r, dataIndex: 'JobHunterName', inputType: 'text', editing: isArchiveEditing(r) }),
                          },
                          {
                            title: 'Type', dataIndex: 'InterviewType', width: 110,
                            onCell: r => ({ record: r, dataIndex: 'InterviewType', inputType: 'text', editing: isArchiveEditing(r) }),
                          },
                          {
                            title: 'Stack', dataIndex: 'Stack', width: 100,
                            onCell: r => ({ record: r, dataIndex: 'Stack', inputType: 'text', editing: isArchiveEditing(r) }),
                          },
                          {
                            title: 'Status', dataIndex: 'Status', width: 110,
                            render: (s, r) => isArchiveEditing(r) ? undefined : <InterviewStatusBadge status={s || 'Scheduled'} record={r} />,
                            onCell: r => ({ record: r, dataIndex: 'Status', editing: isArchiveEditing(r) }),
                          },
                          {
                            title: 'Interview Date', dataIndex: 'InterviewDate', width: 120,
                            render: (d, r) => isArchiveEditing(r) ? undefined : formatDate(d),
                            onCell: r => ({ record: r, dataIndex: 'InterviewDate', inputType: 'date', editing: isArchiveEditing(r) }),
                          },
                          {
                            title: 'Job Start', dataIndex: 'JobStartDate', width: 110,
                            render: (d, r) => isArchiveEditing(r) ? undefined : formatDate(d),
                            onCell: r => ({ record: r, dataIndex: 'JobStartDate', inputType: 'date', editing: isArchiveEditing(r) }),
                          },
                          {
                            title: 'Job Close', dataIndex: 'JobCloseDate', width: 110,
                            render: (d, r) => isArchiveEditing(r) ? undefined : formatDate(d),
                            onCell: r => ({ record: r, dataIndex: 'JobCloseDate', inputType: 'date', editing: isArchiveEditing(r) }),
                          },
                          {
                            title: 'First Salary', dataIndex: 'FirstSalary', width: 110,
                            onCell: r => ({ record: r, dataIndex: 'FirstSalary', inputType: 'text', editing: isArchiveEditing(r) }),
                          },
                          {
                            title: 'Charges', dataIndex: 'InterviewCharges', width: 90,
                            render: (v, r) => isArchiveEditing(r) ? undefined : (v ? `Rs ${Number(v).toLocaleString()}` : '—'),
                            onCell: r => ({ record: r, dataIndex: 'InterviewCharges', inputType: 'number', editing: isArchiveEditing(r) }),
                          },
                          {
                            title: 'JH Due', dataIndex: 'JhDue', width: 90,
                            render: (v, r) => isArchiveEditing(r) ? undefined : (v ? `Rs ${Number(v).toLocaleString()}` : '—'),
                            onCell: r => ({ record: r, dataIndex: 'JhDue', inputType: 'number', editing: isArchiveEditing(r) }),
                          },
                          {
                            title: '1st Pay', dataIndex: 'FirstPaymentOnJob', width: 90,
                            render: (v, r) => isArchiveEditing(r) ? undefined : (v ? `Rs ${Number(v).toLocaleString()}` : '—'),
                            onCell: r => ({ record: r, dataIndex: 'FirstPaymentOnJob', inputType: 'number', editing: isArchiveEditing(r) }),
                          },
                          {
                            title: '2nd Pay', dataIndex: 'SecondPaymentOnJob', width: 90,
                            render: (v, r) => isArchiveEditing(r) ? undefined : (v ? `Rs ${Number(v).toLocaleString()}` : '—'),
                            onCell: r => ({ record: r, dataIndex: 'SecondPaymentOnJob', inputType: 'number', editing: isArchiveEditing(r) }),
                          },
                          {
                            title: 'Balance', dataIndex: 'BalancePayable', width: 90,
                            render: (v, r) => isArchiveEditing(r) ? undefined : (v ? `Rs ${Number(v).toLocaleString()}` : '—'),
                            onCell: r => ({ record: r, dataIndex: 'BalancePayable', inputType: 'number', editing: isArchiveEditing(r) }),
                          },
                          {
                            title: 'JH Suggest', dataIndex: 'JhSuggest', width: 120,
                            onCell: r => ({ record: r, dataIndex: 'JhSuggest', inputType: 'text', editing: isArchiveEditing(r) }),
                          },
                          {
                            title: 'Actions',
                            key: 'arch-actions',
                            width: 140,
                            fixed: 'right',
                            render: (_, record) => {
                              if (isArchiveEditing(record)) {
                                return (
                                  <Space size={4}>
                                    <Tooltip title="Save">
                                      <Button
                                        type="primary"
                                        size="small"
                                        icon={<SaveOutlined />}
                                        loading={isUpdating}
                                        style={{ background: '#059669', border: 'none' }}
                                        onClick={async () => {
                                          try {
                                            const values = await archiveEditForm.validateFields();
                                            const payload = {
                                              ...record,
                                              ...values,
                                              InterviewDate: values.InterviewDate ? (dayjs.isDayjs(values.InterviewDate) ? values.InterviewDate.format('YYYY-MM-DD') : values.InterviewDate) : null,
                                              JobStartDate:  values.JobStartDate  ? (dayjs.isDayjs(values.JobStartDate)  ? values.JobStartDate.format('YYYY-MM-DD')  : values.JobStartDate)  : null,
                                              JobCloseDate:  values.JobCloseDate  ? (dayjs.isDayjs(values.JobCloseDate)  ? values.JobCloseDate.format('YYYY-MM-DD')  : values.JobCloseDate)  : null,
                                              InterviewCharges:   Number(values.InterviewCharges   ?? record.InterviewCharges   ?? 0),
                                              JhDue:              Number(values.JhDue              ?? record.JhDue              ?? 0),
                                              FirstPaymentOnJob:  Number(values.FirstPaymentOnJob  ?? record.FirstPaymentOnJob  ?? 0),
                                              SecondPaymentOnJob: Number(values.SecondPaymentOnJob ?? record.SecondPaymentOnJob ?? 0),
                                              BalancePayable:     Number(values.BalancePayable     ?? record.BalancePayable     ?? 0),
                                            };
                                            await updateInterview({ id: record.Id, ...payload }).unwrap();
                                            message.success('Saved to database.');
                                            setArchiveEditingKey('');
                                            archiveEditForm.resetFields();
                                            handleArchiveSearch();
                                            refetchStats();
                                            refetchPaged();
                                          } catch (err) {
                                            if (err?.errorFields) return;
                                            message.error(err?.data?.message || 'Save failed.');
                                          }
                                        }}
                                      />
                                    </Tooltip>
                                    <Tooltip title="Cancel">
                                      <Button size="small" icon={<CloseOutlined />} onClick={cancelArchiveEdit} />
                                    </Tooltip>
                                  </Space>
                                );
                              }
                              return (
                                <Space size={4}>
                                  <Tooltip title="Edit">
                                    <Button
                                      type="text" size="small" icon={<EditOutlined />}
                                      onClick={() => startArchiveEdit(record)}
                                      disabled={!!archiveEditingKey}
                                    />
                                  </Tooltip>
                                  <Popconfirm
                                    title="Delete this record?"
                                    description="This will permanently remove it from the database."
                                    okText="Delete" okType="danger"
                                    onConfirm={async () => {
                                      try {
                                        await deleteInterview(record.Id).unwrap();
                                        message.success('Deleted.');
                                        handleArchiveSearch();
                                        refetchStats();
                                        refetchPaged();
                                      } catch (err) {
                                        message.error(err?.data?.message || 'Delete failed.');
                                      }
                                    }}
                                    disabled={!!archiveEditingKey}
                                  >
                                    <Button type="text" size="small" danger icon={<DeleteOutlined />} disabled={!!archiveEditingKey} />
                                  </Popconfirm>
                                </Space>
                              );
                            },
                          },
                        ]}
                      />
                    </Form>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Card>
      {/* ── End Archive Search Panel ──────────────────────────────────────── */}

      {viewType === 'table' ? (
        <Card variant="borderless" className="shadow-sm rounded-2xl overflow-hidden" styles={{ body: { padding: 0 } }}>
          <div className="w-full overflow-x-auto">
            <Form form={editForm} component={false}>
              <Table
                className="interviews-portal-table"
                components={!hasExcelColumns ? { body: { cell: EditableCell } } : undefined}
                columns={tableColumns}
                dataSource={rows}
                rowKey="Id"
                expandable={{
                  expandedRowRender: (record) => (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 my-1">
                      <InterviewMktDetailsContent interviewId={record.Id ?? record.id ?? record.InterviewCode} isDarkMode={isDarkMode} />
                    </div>
                  ),
                  rowExpandable: (record) => (record.Id ?? record.id) > 0,
                }}
                loading={isLoading || isPagedFetching}
                locale={{ emptyText: 'No interviews in the database yet.' }}
                rowClassName={(record, i) => {
                  if (record.Id < 0) return 'interviews-row-archived';
                  if (isEditing(record)) return 'interviews-row-editing';
                  const highlight = getRowHighlightClass(record);
                  if (highlight) return highlight;
                  return i % 2 === 1 ? 'interviews-row-alt' : '';
                }}
                pagination={{
                  current: currentPage,
                  pageSize,
                  total: pagedData?.total || 0,
                  showSizeChanger: true,
                  pageSizeOptions: ['10', '20', '30', '40', '50', '100'],
                  showTotal: (t, r) => `${r[0]}-${r[1]} of ${t} rows`,
                  onChange: (p, s) => { cancelInlineEdit(); setCurrentPage(p); setPageSize(s); },
                }}
                scroll={{ x: tableScrollX }}
                size="middle"
              />
            </Form>
          </div>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="text-center py-16">
          <UserOutlined style={{ fontSize: 48, color: '#d1d5db' }} />
          <Title level={4}>No interviews in the database yet</Title>
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
                    <InterviewStatusBadge status={getInterviewRowStatus(r)} record={r} />
                  </Space>
                }
                title={<span className="font-bold">{r.CompanyName || 'No company'}</span>}
              >
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between items-center">
                    <div><Text type="secondary">Sr:</Text> <span className="font-bold">#{r.Sr ?? '—'}</span></div>
                    {r.InvTo && <Tag color="cyan" className="m-0 text-[11px] font-bold">{r.InvTo}</Tag>}
                  </div>
                  <div>
                    <Text type="secondary">Developer (Interviewee):</Text>{' '}
                    <button type="button" className="text-purple-600 font-semibold border-0 bg-transparent p-0 cursor-pointer hover:underline" onClick={() => r.IntervieweeName && setSelectedCandidate(r.IntervieweeName)}>
                      {r.IntervieweeName || '—'}
                    </button>
                  </div>
                  <div className="line-clamp-2"><Text type="secondary">Job Profile:</Text> {r.InterviewFor || '—'}</div>
                  <div>
                    <Text type="secondary">BD / Added By:</Text>{' '}
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{r.JobHunterName || '—'}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 mt-1">
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Interview Date & Time</div>
                    <div className="mt-0.5">{formatDateTime(r.InterviewDate, r.TimeZone ?? r.timeZone)}</div>
                  </div>
                  <div className="pt-2 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center text-xs">
                    <span className="text-slate-500">Start: {formatDate(r.JobStartDate)}</span>
                    <Button
                      size="small"
                      type="link"
                      icon={<SolutionOutlined />}
                      className="p-0 font-bold text-indigo-600 dark:text-indigo-400"
                      onClick={() => setMktModalInterviewId(r.Id ?? r.id ?? r.InterviewCode)}
                    >
                      All Details
                    </Button>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title={
          <span style={{ fontSize: 17, fontWeight: 700 }}>
            {editingRecord ? '✏️ Edit Interview' : '➕ Add Interview'}
          </span>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={Math.min(860, window.innerWidth - 24)}
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
          <Tabs
            defaultActiveKey="basic"
            type="card"
            items={[
              {
                key: 'basic',
                label: '📋 Basic Info',
                children: (
                  <>
                    {/* Row 1: Inv To / Sr / Job Hunter */}
                    <Row gutter={[12, 12]}>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item name="InvTo" label="Inv To" rules={[{ required: true, message: 'Inv To is required' }]}>
                          <Select
                            mode="combobox"
                            placeholder="e.g. TGS, Silmun"
                            showSearch
                            allowClear
                            optionFilterProp="value"
                            filterOption={(input, option) =>
                              (option?.value ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                          >
                            {invToNames.map((n) => (
                              <Option key={n} value={n}>{n}</Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item name="Sr" label="Sr #">
                          <InputNumber className="w-full" placeholder="Serial No." />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={24} md={8}>
                        <Form.Item name="JobHunterName" label="Job Hunter Name">
                          <Select
                            mode="combobox"
                            placeholder="Select or type job hunter"
                            showSearch
                            allowClear
                            optionFilterProp="value"
                            filterOption={(input, option) =>
                              (option?.value ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                          >
                            {jobHunterNames.map((n) => (
                              <Option key={n} value={n}>{n}</Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* Row 2: Profile Owner / Developer */}
                    <Row gutter={[12, 12]}>
                      <Col xs={24} sm={12}>
                        <Form.Item name="InterviewFor" label="Profile Owner (Whose Profile)">
                          <Select
                            placeholder="Select Profile Owner"
                            showSearch
                            allowClear
                            optionFilterProp="children"
                            onChange={(val) => {
                              const po = profileOwners.find((p) => p.name === val);
                              if (po?.stack) form.setFieldValue('Stack', po.stack);
                            }}
                          >
                            {profileOwners.map((po) => (
                              <Option key={po.name} value={po.name}>
                                {po.name}{po.stack ? ` (${po.stack})` : ''}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item name="IntervieweeName" label="Developer / Interviewee Name" rules={[{ required: true, message: 'Candidate name is required' }]}>
                          <Select
                            mode="combobox"
                            placeholder="Select or type developer name"
                            showSearch
                            allowClear
                            optionFilterProp="value"
                            filterOption={(input, option) =>
                              (option?.value ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                          >
                            {candidateNames.map((n) => (
                              <Option key={n} value={n}>{n}</Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* Row 3: Company / Type / Stack */}
                    <Row gutter={[12, 12]}>
                      <Col xs={24} sm={12} md={12}>
                        <Form.Item name="CompanyName" label="Company Name" rules={[{ required: true, message: 'Company is required' }]}>
                          <Select
                            mode="combobox"
                            placeholder="Select or type company name"
                            showSearch
                            allowClear
                            optionFilterProp="value"
                            filterOption={(input, option) =>
                              (option?.value ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                          >
                            {companyNames.map((n) => (
                              <Option key={n} value={n}>{n}</Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Form.Item name="InterviewType" label="Interview Type">
                          <Select placeholder="Select type" allowClear showSearch>
                            <Option value="Screening Call">Screening Call</Option>
                            <Option value="Assessment Round">Assessment Round</Option>
                            <Option value="1st Round">1st Round</Option>
                            <Option value="2nd Round">2nd Round</Option>
                            <Option value="3rd Round">3rd Round</Option>
                            <Option value="4th Round">4th Round</Option>
                            <Option value="5th Round">5th Round</Option>
                            <Option value="6th Round">6th Round</Option>
                            <Option value="7th Round">7th Round</Option>
                            <Option value="8th Round">8th Round</Option>
                            <Option value="9th Round">9th Round</Option>
                            <Option value="10th Round">10th Round</Option>
                            <Option value="11th Round">11th Round</Option>
                            <Option value="12th Round">12th Round</Option>
                            <Option value="13th Round">13th Round</Option>
                            <Option value="14th Round">14th Round</Option>
                            <Option value="Final Round">Final Round</Option>
                            <Option value="Technical">Technical</Option>
                            <Option value="Client">Client</Option>
                            <Option value="HR">HR</Option>
                            <Option value="Other">Other</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Form.Item name="Stack" label="Stack">
                          <Select placeholder="Stack" allowClear showSearch>
                            {allStacks.map((s) => <Option key={s} value={s}>{s}</Option>)}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* Row 4: Interview Date / Interview Time / Time Zone / Status */}
                    <Row gutter={[12, 12]}>
                      <Col xs={24} sm={12} md={7}>
                        <Form.Item name="InterviewDate" label="Interview Date">
                          <DatePicker className="w-full" format="MMM D, YYYY" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={7}>
                        <Form.Item name="InterviewTime" label="Interview Time">
                          <TimePicker className="w-full" format="h:mm A" use12Hours placeholder="e.g. 9:30 AM" minuteStep={15} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={6} md={4}>
                        <Form.Item name="TimeZone" label="Time Zone">
                          <Select placeholder="TZ">
                            <Option value="EST">EST</Option>
                            <Option value="CST">CST</Option>
                            <Option value="PST">PST</Option>
                            <Option value="PKT">PKT</Option>
                            <Option value="IST">IST</Option>
                            <Option value="UTC">UTC</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={6} md={6}>
                        <Form.Item name="Status" label="Status">
                          <Select placeholder="Select Status" showSearch>
                            <Option value="Scheduled">Scheduled</Option>
                            <Option value="Passed">Passed</Option>
                            <Option value="Failed">Failed</Option>
                            <Option value="Converted">Converted</Option>
                            <Option value="Rejected">Rejected</Option>
                            <Option value="Cancelled">Cancelled</Option>
                            <Option value="Re-Scheduled">Re-Scheduled</Option>
                            <Option value="Dropped">Dropped</Option>
                            <Option value="Closed">Closed</Option>
                            <Option value="Dead">Dead</Option>
                            <Option value="Postponed">Postponed</Option>
                            <Option value="Hired">Hired</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* Row 5: Direct/Self / Location */}
                    <Row gutter={[12, 12]}>
                      <Col xs={24} sm={8}>
                        <Form.Item name="DirectSelf" label="Direct / Self">
                          <Select placeholder="Direct or Self">
                            <Option value="Direct">Direct</Option>
                            <Option value="Self">Self</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Form.Item name="Location" label="Location / Branch">
                          <Select placeholder="Select location" allowClear showSearch mode="combobox"
                            filterOption={(input, option) => (option?.value ?? '').toLowerCase().includes(input.toLowerCase())}
                          >
                            <Option value="Johar Town Head Office">Johar Town Head Office</Option>
                            <Option value="Jubilee Office Branch">Jubilee Office Branch</Option>
                            <Option value="Bahria Town Branch">Bahria Town Branch</Option>
                            <Option value="Foreign Branch">Foreign Branch</Option>
                            <Option value="Home">Home</Option>
                            <Option value="Remote">Remote</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Form.Item name="LeadName" label="Lead Name">
                          <Input placeholder="Lead / Source name" />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* Row 6: Staffing Firm / Implementation Partner */}
                    <Row gutter={[12, 12]}>
                      <Col xs={24} sm={12}>
                        <Form.Item name="StaffingFirm" label="Staffing Firm">
                          <Input placeholder="Staffing Agency / Firm Name" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item name="ImplementationPartner" label="Implementation Partner">
                          <Input placeholder="Implementation Partner Name" />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* Row 7: Recruiter */}
                    <Row gutter={[12, 12]}>
                      <Col xs={24} sm={12}>
                        <Form.Item name="RecruiterName" label="Recruiter Name">
                          <Input placeholder="Recruiter / Contact Person" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item name="JobReference" label="Job Reference / Code">
                          <Input placeholder="Job Reference Number or Code" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ),
              },
              {
                key: 'pay',
                label: '💰 Job & Pay',
                children: (
                  <>
                    {/* Row: Job Dates */}
                    <Row gutter={[12, 12]}>
                      <Col xs={24} sm={8}>
                        <Form.Item name="JobStartDate" label="Job Start Date">
                          <DatePicker className="w-full" format="MMM D, YYYY" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Form.Item name="JobCloseDate" label="Job Close Date">
                          <DatePicker className="w-full" format="MMM D, YYYY" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Form.Item name="JobLandedDate" label="Job Landed Date">
                          <DatePicker className="w-full" format="MMM D, YYYY" />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* Row: Pay Scale */}
                    <Row gutter={[12, 12]}>
                      <Col xs={24} sm={10}>
                        <Form.Item label="Pay Scale (Rate)">
                          <Input.Group compact>
                            <Form.Item name="PayscaleVal" noStyle>
                              <InputNumber
                                style={{ width: '65%' }}
                                min={0}
                                placeholder="Amount"
                              />
                            </Form.Item>
                            <Form.Item name="PayscaleUnit" noStyle>
                              <Select style={{ width: '35%' }}>
                                <Option value="/hr">/hr</Option>
                                <Option value="/yr">/yr</Option>
                                <Option value="/mo">/mo</Option>
                              </Select>
                            </Form.Item>
                          </Input.Group>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={14}>
                        <Form.Item name="FirstSalary" label="First Salary / Offer">
                          <Input placeholder="e.g. $80,000/yr" />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* Row: Financials */}
                    <Row gutter={[12, 12]}>
                      <Col xs={24} sm={8}>
                        <Form.Item name="InterviewCharges" label="Interview Charges">
                          <InputNumber className="w-full" min={0} placeholder="0" prefix="$" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Form.Item name="JhDue" label="JH Due">
                          <InputNumber className="w-full" min={0} placeholder="0" prefix="$" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Form.Item name="BalancePayable" label="Balance Payable">
                          <InputNumber className="w-full" min={0} placeholder="0" prefix="$" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={[12, 12]}>
                      <Col xs={24} sm={8}>
                        <Form.Item name="FirstPaymentOnJob" label="1st Payment On Job">
                          <InputNumber className="w-full" min={0} placeholder="0" prefix="$" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Form.Item name="SecondPaymentOnJob" label="2nd Payment On Job">
                          <InputNumber className="w-full" min={0} placeholder="0" prefix="$" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Form.Item name="JhSuggest" label="JH Suggestion">
                          <Input placeholder="Job Hunter's suggestion" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ),
              },
              {
                key: 'notes',
                label: '📝 Notes & Links',
                children: (
                  <>
                    {/* BD / Search Name */}
                    <Row gutter={[12, 12]}>
                      <Col xs={24} sm={12}>
                        <Form.Item name="SearchName" label="BD / Dev Name">
                          <Select
                            mode="combobox"
                            placeholder="Select or type BD / Dev name"
                            showSearch
                            allowClear
                            filterOption={(input, option) =>
                              (option?.value ?? option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                          >
                            {/* BD group */}
                            {bdDevNames.filter(x => x.type === 'BD').length > 0 && (
                              <Select.OptGroup label="🟦 BD / Job Hunters">
                                {bdDevNames
                                  .filter(x => x.type === 'BD')
                                  .map(x => (
                                    <Option key={`bd-${x.name}`} value={x.name}>{x.name}</Option>
                                  ))}
                              </Select.OptGroup>
                            )}
                            {/* DEV group */}
                            {bdDevNames.filter(x => x.type === 'DEV').length > 0 && (
                              <Select.OptGroup label="🟩 Developers">
                                {bdDevNames
                                  .filter(x => x.type === 'DEV')
                                  .map(x => (
                                    <Option key={`dev-${x.name}`} value={x.name}>{x.name}</Option>
                                  ))}
                              </Select.OptGroup>
                            )}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item name="MeetingLink" label={<><LinkOutlined /> Meeting Link</>}>
                          <Input placeholder="https://zoom.us/j/... or Teams link" />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* File Attachments */}
                    <Row gutter={[12, 12]}>
                      <Col xs={24} sm={12}>
                        <Form.Item label="📄 JD Attachment (PDF)">
                          <Upload
                            accept=".pdf,.doc,.docx"
                            maxCount={1}
                            beforeUpload={() => false}
                            listType="text"
                          >
                            <Button icon={<DownloadOutlined />} block style={{ textAlign: 'left' }}>
                              Select JD File
                            </Button>
                          </Upload>
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="📋 Resume Attachment (PDF)">
                          <Upload
                            accept=".pdf,.doc,.docx"
                            maxCount={1}
                            beforeUpload={() => false}
                            listType="text"
                          >
                            <Button icon={<DownloadOutlined />} block style={{ textAlign: 'left' }}>
                              Select Resume File
                            </Button>
                          </Upload>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item name="ClientFeedback" label={<><FileTextOutlined /> Client Feedback / BD Feedback</>}>
                          <Input.TextArea rows={3} placeholder="Client's feedback after interview..." />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item name="RejectionReason" label="Rejection Reason">
                          <Input.TextArea rows={2} placeholder="Why was the candidate rejected?" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item name="Remarks" label="Remarks / Notes">
                          <Input.TextArea rows={3} placeholder="General remarks or additional notes..." />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ),
              },
            ]}
          />

          <div className="flex justify-end gap-2 pt-4 border-t mt-2">
            <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isCreating || isUpdating}
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', border: 'none', fontWeight: 600 }}
            >
              {editingRecord ? 'Update Interview' : 'Save Interview'}
            </Button>
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

      <InterviewMktDetailsModal
        open={!!mktModalInterviewId}
        onClose={() => setMktModalInterviewId(null)}
        interviewId={mktModalInterviewId}
        isDarkMode={isDarkMode}
      />

    </div>
  );
};

export default Interviews;

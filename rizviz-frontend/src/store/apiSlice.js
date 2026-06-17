import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { logOut, setCredentials } from './authSlice';

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.REACT_APP_API_URL || 'https://localhost:5001/api',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // Try to refresh token
    const refreshToken = api.getState().auth.refreshToken;
    const token = api.getState().auth.token;

    if (refreshToken && token) {
      const refreshResult = await baseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          body: { token, refreshToken },
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        api.dispatch(setCredentials(refreshResult.data));
        // Retry the original query
        result = await baseQuery(args, api, extraOptions);
      } else {
        api.dispatch(logOut());
        api.dispatch(apiSlice.util.resetApiState());
      }
    } else {
      api.dispatch(logOut());
      api.dispatch(apiSlice.util.resetApiState());
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Employees', 'Assets', 'Projects', 'Interviews', 'Candidates', 'Jobs', 'Payroll', 'AuditLogs', 'Leads', 'Feedback', 'Users'],
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['AuditLogs'],
    }),
    completeSetup: builder.mutation({
      query: (body) => ({
        url: '/auth/complete-setup',
        method: 'POST',
        body,
      }),
    }),
    getUsers: builder.query({
      query: () => '/auth/users',
      providesTags: ['Users'],
    }),
    resetPassword: builder.mutation({
      query: (body) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Users'],
    }),
    getAuditLogs: builder.query({
      query: () => '/auth/audit-logs',
      providesTags: ['AuditLogs'],
    }),

    // Setup endpoints
    getCompanies: builder.query({
      query: () => '/setup/companies',
    }),
    getBranches: builder.query({
      query: (companyCode) => `/setup/branches?companyCode=${companyCode || ''}`,
    }),
    getDropdowns: builder.query({
      query: (category) => `/setup/dropdowns?category=${category || ''}`,
    }),

    // Employee endpoints
    getEmployeeStats: builder.query({
      query: () => '/employee/stats',
      providesTags: ['Employees'],
    }),
    getEmployees: builder.query({
      query: ({ search, branchCode, status, statusGroup } = {}) => {
        let params = [];
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        if (branchCode) params.push(`branchCode=${encodeURIComponent(branchCode)}`);
        if (status) params.push(`status=${encodeURIComponent(status)}`);
        if (statusGroup) params.push(`statusGroup=${encodeURIComponent(statusGroup)}`);
        const queryStr = params.length > 0 ? `?${params.join('&')}` : '';
        return `/employee${queryStr}`;
      },
      transformResponse: (response) => (Array.isArray(response) ? response : []),
      providesTags: ['Employees'],
    }),
    getEmployeeById: builder.query({
      query: (id) => `/employee/${id}`,
      providesTags: (result, error, id) => [{ type: 'Employees', id }],
    }),
    createEmployee: builder.mutation({
      query: (employee) => ({
        url: '/employee',
        method: 'POST',
        body: employee,
      }),
      invalidatesTags: ['Employees'],
    }),
    updateEmployee: builder.mutation({
      query: ({ id, ...employee }) => ({
        url: `/employee/${id}`,
        method: 'PUT',
        body: employee,
      }),
      invalidatesTags: (result, error, { id }) => ['Employees', { type: 'Employees', id }],
    }),
    deleteEmployee: builder.mutation({
      query: (id) => ({
        url: `/employee/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Employees'],
    }),
    getSalaryHistory: builder.query({
      query: (id) => `/employee/${id}/salary-history`,
    }),
    getEmployeeDocuments: builder.query({
      query: (id) => `/employee/${id}/documents`,
    }),
    uploadEmployeeDocument: builder.mutation({
      query: ({ id, formData }) => ({
        url: `/employee/${id}/documents`,
        method: 'POST',
        body: formData,
      }),
    }),

    // Payroll endpoints
    getMonthlyPayroll: builder.query({
      query: ({ year, month }) => `/payroll/monthly/${year}/${month}`,
      transformResponse: (response) => (Array.isArray(response) ? response : []),
      providesTags: ['Payroll'],
    }),
    processPayroll: builder.mutation({
      query: (payrollRequest) => ({
        url: '/payroll/process',
        method: 'POST',
        body: payrollRequest,
      }),
      invalidatesTags: ['Payroll'],
    }),
    getPayslip: builder.query({
      query: ({ employeeId, month, year }) => `/payroll/payslip/${employeeId}/${month}/${year}`,
    }),

    // Inventory/Asset endpoints
    getAssets: builder.query({
      query: ({ category, status } = {}) => {
        let params = [];
        if (category) params.push(`category=${encodeURIComponent(category)}`);
        if (status) params.push(`status=${encodeURIComponent(status)}`);
        const queryStr = params.length > 0 ? `?${params.join('&')}` : '';
        return `/inventory/assets${queryStr}`;
      },
      providesTags: ['Assets'],
    }),
    createAsset: builder.mutation({
      query: (asset) => ({
        url: '/inventory/assets',
        method: 'POST',
        body: asset,
      }),
      invalidatesTags: ['Assets'],
    }),
    assignAsset: builder.mutation({
      query: (assignment) => ({
        url: '/inventory/assets/assign',
        method: 'POST',
        body: assignment,
      }),
      invalidatesTags: ['Assets'],
    }),
    returnAsset: builder.mutation({
      query: ({ assignmentId, condition }) => ({
        url: `/inventory/assets/return/${assignmentId}`,
        method: 'PUT',
        body: JSON.stringify(condition),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      invalidatesTags: ['Assets'],
    }),

    // Project endpoints
    getProjectStats: builder.query({
      query: () => '/projects/stats',
      providesTags: ['Projects'],
    }),
    getProjects: builder.query({
      query: ({ metric = '', search = '' } = {}) => {
        const params = [];
        if (metric && metric !== 'all') params.push(`metric=${encodeURIComponent(metric)}`);
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        const qs = params.length ? `?${params.join('&')}` : '';
        return `/projects${qs}`;
      },
      transformResponse: (response) => (Array.isArray(response) ? response : []),
      providesTags: ['Projects'],
    }),
    createProject: builder.mutation({
      query: (project) => ({
        url: '/projects',
        method: 'POST',
        body: project,
      }),
      invalidatesTags: ['Projects'],
    }),
    assignProjectMember: builder.mutation({
      query: ({ projectId, member }) => ({
        url: `/projects/${projectId}/assign-member`,
        method: 'POST',
        body: member,
      }),
      invalidatesTags: ['Projects'],
    }),

    // Recruitment endpoints
    getInterviews: builder.query({
      query: () => '/interviews',
      providesTags: ['Interviews'],
    }),
    scheduleInterview: builder.mutation({
      query: (interview) => ({
        url: '/interviews',
        method: 'POST',
        body: interview,
      }),
      invalidatesTags: ['Interviews'],
    }),
    updateInterviewFeedback: builder.mutation({
      query: ({ interviewId, feedback, rating }) => ({
        url: `/interviews/${interviewId}/feedback`,
        method: 'PUT',
        body: { feedback, rating },
      }),
      invalidatesTags: ['Interviews'],
    }),
    getCandidates: builder.query({
      query: ({ jobId } = {}) => `/interviews/candidates${jobId ? `?jobId=${jobId}` : ''}`,
      providesTags: ['Candidates'],
    }),
    updateCandidateStatus: builder.mutation({
      query: ({ candidateId, status }) => ({
        url: `/interviews/candidates/${candidateId}/status`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: ['Candidates', 'Employees'],
    }),
    getJobs: builder.query({
      query: () => '/interviews/jobs',
      providesTags: ['Jobs'],
    }),
    createJob: builder.mutation({
      query: (job) => ({
        url: '/interviews/jobs',
        method: 'POST',
        body: job,
      }),
      invalidatesTags: ['Jobs'],
    }),

    // New Interviews Module endpoints
    getInterviewsPaged: builder.query({
      query: ({ page = 1, limit = 20, search = '', inv_to = '', interview_type = '', company = '', status = '', statuses = '', candidate = '', date_from = '', date_to = '', metric = '', stack = '' } = {}) => {
        let params = [];
        if (page) params.push(`page=${page}`);
        if (limit) params.push(`limit=${limit}`);
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        if (inv_to) params.push(`inv_to=${encodeURIComponent(inv_to)}`);
        if (interview_type) params.push(`interview_type=${encodeURIComponent(interview_type)}`);
        if (company) params.push(`company=${encodeURIComponent(company)}`);
        if (statuses) params.push(`statuses=${encodeURIComponent(statuses)}`);
        else if (status) params.push(`status=${encodeURIComponent(status)}`);
        if (candidate) params.push(`candidate=${encodeURIComponent(candidate)}`);
        if (date_from) params.push(`date_from=${encodeURIComponent(date_from)}`);
        if (date_to) params.push(`date_to=${encodeURIComponent(date_to)}`);
        if (metric && metric !== 'all') params.push(`metric=${encodeURIComponent(metric)}`);
        if (stack) params.push(`stack=${encodeURIComponent(stack)}`);
        const queryStr = params.length > 0 ? `?${params.join('&')}` : '';
        return `/interviews${queryStr}`;
      },
      transformResponse: (response) => ({
        data: Array.isArray(response?.data) ? response.data : [],
        total: response?.total ?? 0,
        page: response?.page ?? 1,
        limit: response?.limit ?? 20,
      }),
      providesTags: ['Interviews'],
    }),
    getInterviewCandidateNames: builder.query({
      query: () => '/interviews/candidate-names',
      providesTags: ['Interviews'],
    }),
    getInterviewCompanyNames: builder.query({
      query: () => '/interviews/company-names',
      providesTags: ['Interviews'],
    }),
    getInterviewStats: builder.query({
      query: () => '/interviews/stats',
      providesTags: ['Interviews'],
    }),
    getInterviewStatusBreakdown: builder.query({
      query: ({ search = '', inv_to = '', interview_type = '', company = '', candidate = '', date_from = '', date_to = '', metric = '', stack = '' } = {}) => {
        const params = [];
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        if (inv_to) params.push(`inv_to=${encodeURIComponent(inv_to)}`);
        if (interview_type) params.push(`interview_type=${encodeURIComponent(interview_type)}`);
        if (company) params.push(`company=${encodeURIComponent(company)}`);
        if (candidate) params.push(`candidate=${encodeURIComponent(candidate)}`);
        if (date_from) params.push(`date_from=${encodeURIComponent(date_from)}`);
        if (date_to) params.push(`date_to=${encodeURIComponent(date_to)}`);
        if (metric && metric !== 'all') params.push(`metric=${encodeURIComponent(metric)}`);
        if (stack) params.push(`stack=${encodeURIComponent(stack)}`);
        const queryStr = params.length > 0 ? `?${params.join('&')}` : '';
        return `/interviews/status-breakdown${queryStr}`;
      },
      transformResponse: (response) => {
        const list = Array.isArray(response?.statuses) ? response.statuses : [];
        return list.map((item) => ({
          status: item.status ?? item.Status ?? '',
          count: item.count ?? item.Count ?? 0,
        })).filter((x) => x.status);
      },
      providesTags: ['Interviews'],
    }),
    getInterviewsForCalendar: builder.query({
      query: () => '/interviews/calendar',
      transformResponse: (response) => ({
        data: Array.isArray(response?.data) ? response.data : [],
        total: response?.total ?? 0,
      }),
      providesTags: ['Interviews'],
    }),
    getInterviewCandidates: builder.query({
      query: ({ month, search } = {}) => {
        const params = [];
        if (month) params.push(`month=${encodeURIComponent(month)}`);
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        const queryStr = params.length > 0 ? `?${params.join('&')}` : '';
        return `/interviews/candidates${queryStr}`;
      },
      providesTags: ['Interviews'],
    }),
    createInterview: builder.mutation({
      query: (interview) => ({
        url: '/interviews',
        method: 'POST',
        body: interview,
      }),
      invalidatesTags: ['Interviews'],
    }),
    updateInterview: builder.mutation({
      query: ({ id, ...interview }) => ({
        url: `/interviews/${id}`,
        method: 'PUT',
        body: interview,
      }),
      invalidatesTags: ['Interviews'],
    }),
    deleteInterview: builder.mutation({
      query: (id) => ({
        url: `/interviews/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Interviews'],
    }),
    seedInterviews: builder.mutation({
      query: (formData) => ({
        url: '/interviews/seed',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Interviews'],
    }),
    seedQamerDemoWeek: builder.mutation({
      query: () => ({
        url: '/interviews/seed/qamer-demo',
        method: 'POST',
      }),
      invalidatesTags: ['Interviews'],
    }),
    getCandidateDetail: builder.query({
      query: (name) => `/interviews/candidate/${encodeURIComponent(name)}`,
      providesTags: ['Interviews'],
    }),
    refreshInterviewsFromExcel: builder.mutation({
      query: () => ({
        url: '/interviews/refresh',
        method: 'POST',
      }),
      invalidatesTags: ['Interviews'],
    }),
    getInterviewSyncStatus: builder.query({
      query: () => '/interviews/sync-status',
    }),
    getInterviewHistory: builder.query({
      query: (id) => `/interviews/${id}/history`,
    }),

    // Dashboard endpoints
    getHrStats: builder.query({
      query: () => '/dashboard/hr-stats',
    }),
    getPayrollStats: builder.query({
      query: () => '/dashboard/payroll-stats',
    }),

    // Reports endpoints
    getEmployeeReport: builder.query({
      query: ({ branchCode, status }) => `/reports/employees?branchCode=${branchCode || ''}&status=${status || ''}`,
    }),
    getPayrollReport: builder.query({
      query: ({ year, month }) => `/reports/payroll?year=${year}&month=${month}`,
    }),
    getAssetReport: builder.query({
      query: ({ category, status }) => `/reports/assets?category=${category || ''}&status=${status || ''}`,
    }),
    getLeads: builder.query({
      query: ({ search, status, interviewee, company, bdCloser } = {}) => {
        let params = [];
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        if (status) params.push(`status=${encodeURIComponent(status)}`);
        if (interviewee) params.push(`interviewee=${encodeURIComponent(interviewee)}`);
        if (company) params.push(`company=${encodeURIComponent(company)}`);
        if (bdCloser) params.push(`bdCloser=${encodeURIComponent(bdCloser)}`);
        const queryStr = params.length > 0 ? `?${params.join('&')}` : '';
        return `/leads${queryStr}`;
      },
      providesTags: ['Leads', 'Interviews'],
    }),
    createOrUpdateLead: builder.mutation({
      query: (lead) => ({
        url: '/leads',
        method: 'POST',
        body: lead,
      }),
      invalidatesTags: ['Leads', 'Interviews'],
    }),
    deleteLead: builder.mutation({
      query: (id) => ({
        url: `/leads/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Leads', 'Interviews'],
    }),

    // ─── Feedback endpoints ────────────────────────────────────────────────
    getFeedbacks: builder.query({
      query: ({ search, recommendation, stack } = {}) => {
        let params = [];
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        if (recommendation) params.push(`recommendation=${encodeURIComponent(recommendation)}`);
        if (stack && stack !== 'All') params.push(`stack=${encodeURIComponent(stack)}`);
        const qs = params.length > 0 ? `?${params.join('&')}` : '';
        return `/feedback${qs}`;
      },
      providesTags: ['Feedback'],
    }),
    getFeedbackById: builder.query({
      query: (id) => `/feedback/${id}`,
      providesTags: ['Feedback'],
    }),
    saveFeedback: builder.mutation({
      query: (feedback) => ({
        url: '/feedback',
        method: 'POST',
        body: feedback,
      }),
      invalidatesTags: ['Feedback'],
    }),
    deleteFeedback: builder.mutation({
      query: (id) => ({
        url: `/feedback/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Feedback'],
    }),
    getFeedbackDropdowns: builder.query({
      query: () => '/feedback/dropdowns',
    }),
  }),
});

export const {
  useLoginMutation,
  useCompleteSetupMutation,
  useGetUsersQuery,
  useResetPasswordMutation,
  useGetAuditLogsQuery,
  useGetCompaniesQuery,
  useGetBranchesQuery,
  useGetDropdownsQuery,
  useGetEmployeeStatsQuery,
  useGetEmployeesQuery,
  useGetEmployeeByIdQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useGetSalaryHistoryQuery,
  useGetEmployeeDocumentsQuery,
  useUploadEmployeeDocumentMutation,
  useGetMonthlyPayrollQuery,
  useProcessPayrollMutation,
  useGetPayslipQuery,
  useGetAssetsQuery,
  useCreateAssetMutation,
  useAssignAssetMutation,
  useReturnAssetMutation,
  useGetProjectStatsQuery,
  useGetProjectsQuery,
  useCreateProjectMutation,
  useAssignProjectMemberMutation,
  useGetInterviewsQuery,
  useScheduleInterviewMutation,
  useUpdateInterviewFeedbackMutation,
  useGetCandidatesQuery,
  useUpdateCandidateStatusMutation,
  useGetJobsQuery,
  useCreateJobMutation,
  useGetInterviewsPagedQuery,
  useGetInterviewStatsQuery,
  useGetInterviewStatusBreakdownQuery,
  useGetInterviewsForCalendarQuery,
  useGetInterviewCandidatesQuery,
  useGetInterviewCandidateNamesQuery,
  useGetInterviewCompanyNamesQuery,
  useCreateInterviewMutation,
  useUpdateInterviewMutation,
  useDeleteInterviewMutation,
  useSeedInterviewsMutation,
  useSeedQamerDemoWeekMutation,
  useGetCandidateDetailQuery,
  useRefreshInterviewsFromExcelMutation,
  useGetInterviewSyncStatusQuery,
  useGetInterviewHistoryQuery,
  useGetHrStatsQuery,
  useGetPayrollStatsQuery,
  useGetEmployeeReportQuery,
  useGetPayrollReportQuery,
  useGetAssetReportQuery,
  useGetLeadsQuery,
  useCreateOrUpdateLeadMutation,
  useDeleteLeadMutation,
  useGetFeedbacksQuery,
  useGetFeedbackByIdQuery,
  useSaveFeedbackMutation,
  useDeleteFeedbackMutation,
  useGetFeedbackDropdownsQuery,
} = apiSlice;

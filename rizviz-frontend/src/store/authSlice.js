import { createSlice } from '@reduxjs/toolkit';

const getInitialState = () => {
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
  const role = localStorage.getItem('role');
  const interviewName = localStorage.getItem('interviewName') || '';
  const companyCode = localStorage.getItem('companyCode');
  const branchCode = localStorage.getItem('branchCode');
  const userId = localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId'), 10) : null;
  const isFirstLogin = localStorage.getItem('isFirstLogin') === 'true';

  return {
    token,
    refreshToken,
    user,
    role,
    interviewName,
    companyCode,
    branchCode,
    userId,
    isFirstLogin,
    isAuthenticated: !!token,
  };
};

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    setCredentials: (state, action) => {
      const p = action.payload;
      // Handle both PascalCase (API response) and camelCase (legacy/fallback)
      const token         = p.Token         || p.token;
      const refreshToken  = p.RefreshToken  || p.refreshToken;
      const username      = p.Username      || p.username;
      const fullName      = p.FullName      || p.fullName;
      const role          = p.Role          || p.role;
      const interviewName = p.InterviewName || p.interviewName || '';
      const companyCode   = p.CompanyCode   || p.companyCode;
      const branchCode    = p.BranchCode    || p.branchCode;
      const userId        = p.UserId        || p.userId || null;
      const isFirstLogin  = p.IsFirstLogin  ?? p.isFirstLogin ?? false;

      state.token         = token;
      state.refreshToken  = refreshToken;
      state.user          = { username, fullName };
      state.role          = role;
      state.interviewName = interviewName;
      state.companyCode   = companyCode;
      state.branchCode    = branchCode;
      state.userId        = userId;
      state.isFirstLogin  = isFirstLogin;
      state.isAuthenticated = true;

      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify({ username, fullName }));
      localStorage.setItem('role', role);
      localStorage.setItem('interviewName', interviewName);
      localStorage.setItem('companyCode', companyCode || '');
      localStorage.setItem('branchCode', branchCode || '');
      localStorage.setItem('isFirstLogin', isFirstLogin ? 'true' : 'false');
      if (userId) localStorage.setItem('userId', userId);
    },
    clearFirstLogin: (state) => {
      state.isFirstLogin = false;
      localStorage.setItem('isFirstLogin', 'false');
    },
    logOut: (state) => {
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.role = null;
      state.interviewName = '';
      state.companyCode = null;
      state.branchCode = null;
      state.userId = null;
      state.isFirstLogin = false;
      state.isAuthenticated = false;

      localStorage.clear();
    },
  },
});

export const { setCredentials, clearFirstLogin, logOut } = authSlice.actions;
export default authSlice.reducer;

// ========== RBAC Helper Selectors ==========
export const selectIsAdmin = (state) => state.auth.role === 'Admin';
export const selectIsManager = (state) => state.auth.role === 'Manager';
export const selectIsEmployee = (state) => state.auth.role === 'Employee';
export const selectCanEdit = (state) => state.auth.role === 'Admin';
export const selectCanViewAll = (state) => state.auth.role === 'Admin' || state.auth.role === 'HR';
export const selectCanViewBranch = (state) => ['Admin', 'HR', 'Manager'].includes(state.auth.role);

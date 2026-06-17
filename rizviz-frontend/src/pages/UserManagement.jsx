import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useGetUsersQuery, useResetPasswordMutation } from '../store/apiSlice';
import './UserManagement.css';

export default function UserManagement() {
  const role = useSelector((s) => s.auth.role);
  const { data: users = [], isLoading, refetch } = useGetUsersQuery();
  const [resetPassword, { isLoading: isResetting }] = useResetPasswordMutation();

  const [search, setSearch] = useState('');
  const [targetUser, setTargetUser]   = useState(null);
  const [tempPassword, setTempPassword] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Only Admin / HR can access
  if (!['Admin', 'HR'].includes(role)) {
    return (
      <div className="um-access-denied">
        <span>🔒</span>
        <p>You don't have permission to access this page.</p>
      </div>
    );
  }

  const filtered = users.filter((u) =>
    (u.Username || u.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.FullName  || u.fullName  || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.RoleName  || u.role      || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleReset = async (e) => {
    e.preventDefault();
    if (!tempPassword || tempPassword.length < 4) {
      showToast('Temporary password must be at least 4 characters.', 'error');
      return;
    }
    try {
      await resetPassword({
        Username: targetUser.Username || targetUser.username,
        TempPassword: tempPassword,
      }).unwrap();
      showToast(`Password reset for "${targetUser.Username || targetUser.username}". They must change it on next login.`);
      setTargetUser(null);
      setTempPassword('');
      refetch();
    } catch (err) {
      showToast(err?.data?.message || 'Reset failed. Try again.', 'error');
    }
  };

  return (
    <div className="um-page">
      {/* Toast */}
      {toast && (
        <div className={`um-toast um-toast--${toast.type}`}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="um-header">
        <div>
          <h1 className="um-title">User Management</h1>
          <p className="um-subtitle">Manage login credentials and force password resets</p>
        </div>
        <button className="um-refresh-btn" onClick={refetch} title="Refresh">
          🔄
        </button>
      </div>

      {/* Search */}
      <div className="um-toolbar">
        <div className="um-search-wrap">
          <span className="um-search-icon">🔍</span>
          <input
            id="um-search"
            type="text"
            className="um-search-input"
            placeholder="Search by name, username or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="um-count">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="um-loading">Loading users…</div>
      ) : (
        <div className="um-table-wrap">
          <table className="um-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Interview Name</th>
                <th>Status</th>
                <th>First Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="um-empty">No users found.</td></tr>
              ) : filtered.map((u, i) => {
                const username   = u.Username    || u.username    || '—';
                const fullName   = u.FullName    || u.fullName    || '—';
                const roleName   = u.RoleName    || u.role        || '—';
                const intName    = u.InterviewName || u.interviewName || '—';
                const isActive   = u.IsActive    ?? u.isActive    ?? true;
                const firstLogin = u.IsFirstLogin ?? u.isFirstLogin ?? false;
                return (
                  <tr key={i} className={!isActive ? 'um-row--inactive' : ''}>
                    <td>
                      <div className="um-user-cell">
                        <div className="um-avatar">{fullName.charAt(0).toUpperCase()}</div>
                        <span>{fullName}</span>
                      </div>
                    </td>
                    <td><code className="um-code">{username}</code></td>
                    <td>
                      <span className={`um-role-badge um-role-badge--${roleName.toLowerCase()}`}>
                        {roleName}
                      </span>
                    </td>
                    <td>{intName}</td>
                    <td>
                      <span className={`um-status-badge ${isActive ? 'um-status-badge--active' : 'um-status-badge--inactive'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {firstLogin ? (
                        <span className="um-first-badge">⚠ Pending Setup</span>
                      ) : (
                        <span className="um-done-badge">✓ Done</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="um-reset-btn"
                        onClick={() => { setTargetUser(u); setTempPassword(''); }}
                        title={`Reset password for ${username}`}
                      >
                        🔑 Reset Password
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reset Password Modal */}
      {targetUser && (
        <div className="um-modal-backdrop" onClick={() => setTargetUser(null)}>
          <div className="um-modal" onClick={(e) => e.stopPropagation()}>
            <div className="um-modal-header">
              <span>🔑 Reset Password</span>
              <button className="um-modal-close" onClick={() => setTargetUser(null)}>✕</button>
            </div>
            <div className="um-modal-body">
              <p className="um-modal-info">
                You are resetting the password for{' '}
                <strong>{targetUser.FullName || targetUser.fullName}</strong>
                {' '}(<code>{targetUser.Username || targetUser.username}</code>).
              </p>
              <p className="um-modal-info">
                The user will be forced to complete account setup again on their next login.
              </p>
              <form onSubmit={handleReset} autoComplete="off">
                <label className="um-modal-label">Temporary Password</label>
                <input
                  id="um-temp-password"
                  type="text"
                  className="um-modal-input"
                  placeholder="e.g. Temp@1234"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  autoComplete="off"
                />
                <div className="um-modal-actions">
                  <button type="button" className="um-modal-cancel" onClick={() => setTargetUser(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="um-modal-confirm" disabled={isResetting}>
                    {isResetting ? '…' : 'Reset & Notify'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

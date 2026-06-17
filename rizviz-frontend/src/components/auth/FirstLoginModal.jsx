import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearFirstLogin, logOut } from '../../store/authSlice';
import { useCompleteSetupMutation } from '../../store/apiSlice';
import './FirstLoginModal.css';

export default function FirstLoginModal() {
  const dispatch = useDispatch();
  const isFirstLogin = useSelector((s) => s.auth.isFirstLogin);
  const currentUsername = useSelector((s) => s.auth.user?.username || '');

  const [newUsername, setNewUsername]       = useState('');
  const [newPassword, setNewPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors]                 = useState({});
  const [success, setSuccess]               = useState(false);
  const [showPwd, setShowPwd]               = useState(false);

  const [completeSetup, { isLoading }] = useCompleteSetupMutation();

  if (!isFirstLogin) return null;

  const validate = () => {
    const e = {};
    if (!newUsername || newUsername.trim().length < 3)
      e.newUsername = 'Username must be at least 3 characters.';
    if (!newPassword || newPassword.length < 6)
      e.newPassword = 'Password must be at least 6 characters.';
    if (newPassword !== confirmPassword)
      e.confirmPassword = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await completeSetup({
        OldUsername: currentUsername,
        NewUsername: newUsername.trim(),
        NewPassword: newPassword,
      }).unwrap();
      setSuccess(true);
      setTimeout(() => {
        dispatch(logOut());
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      setErrors({ api: err?.data?.message || 'Something went wrong. Please try again.' });
    }
  };

  return (
    <div className="flm-backdrop">
      <div className="flm-card">
        {/* Header */}
        <div className="flm-header">
          <div className="flm-shield-icon">🔐</div>
          <h2 className="flm-title">Complete Your Account Setup</h2>
          <p className="flm-subtitle">
            To secure your account, please choose a new username and password.
            Your password must be strong.
          </p>
        </div>

        {success ? (
          <div className="flm-success">
            <span className="flm-success-icon">✅</span>
            <p>Account secured! Logging you out to verify your new credentials…</p>
          </div>
        ) : (
          <form className="flm-form" onSubmit={handleSubmit} autoComplete="off">
            {/* New Username */}
            <div className="flm-field">
              <label className="flm-label">New Username</label>
              <input
                id="flm-new-username"
                type="text"
                className={`flm-input ${errors.newUsername ? 'flm-input--error' : ''}`}
                placeholder="Choose a unique username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                autoComplete="off"
              />
              {errors.newUsername && <span className="flm-error-msg">{errors.newUsername}</span>}
            </div>

            {/* New Password */}
            <div className="flm-field">
              <label className="flm-label">New Password</label>
              <div className="flm-input-wrap">
                <input
                  id="flm-new-password"
                  type={showPwd ? 'text' : 'password'}
                  className={`flm-input ${errors.newPassword ? 'flm-input--error' : ''}`}
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button type="button" className="flm-eye-btn" onClick={() => setShowPwd(!showPwd)}>
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.newPassword && <span className="flm-error-msg">{errors.newPassword}</span>}
            </div>

            {/* Confirm Password */}
            <div className="flm-field">
              <label className="flm-label">Confirm Password</label>
              <input
                id="flm-confirm-password"
                type={showPwd ? 'text' : 'password'}
                className={`flm-input ${errors.confirmPassword ? 'flm-input--error' : ''}`}
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              {errors.confirmPassword && <span className="flm-error-msg">{errors.confirmPassword}</span>}
            </div>

            {/* API error */}
            {errors.api && <div className="flm-api-error">{errors.api}</div>}

            {/* Disclaimer */}
            <div className="flm-disclaimer">
              <span className="flm-disclaimer-icon">ℹ️</span>
              Once saved, your temporary password will expire and you will be logged out to verify
              your new credentials.
            </div>

            <button
              id="flm-submit-btn"
              type="submit"
              className="flm-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flm-spinner" />
              ) : (
                'Save & Secure My Account'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

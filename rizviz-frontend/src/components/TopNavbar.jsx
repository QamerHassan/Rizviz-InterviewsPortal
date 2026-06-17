import React, { useState, useEffect, useRef } from 'react';
import { Layout, Dropdown, Space, Avatar, Typography, Select, Button, App, Badge, List, Popover, Modal, Descriptions } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  DownOutlined,
  GlobalOutlined,
  DeploymentUnitOutlined,
  MenuOutlined,
  BellOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { Input } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { logOut, setCredentials } from '../store/authSlice';
import { apiSlice, useGetCompaniesQuery, useGetBranchesQuery } from '../store/apiSlice';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import dayjs from 'dayjs';

const { Header } = Layout;
const { Text } = Typography;

const TopNavbar = ({ onMobileMenuClick, isMobile, sidebarCollapsed, onSidebarToggle }) => {
  const dispatch = useDispatch();
  const { message, notification: notificationApi } = App.useApp();
  const { user, role, token, interviewName, companyCode, branchCode } = useSelector((state) => state.auth);
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);

  const { data: companies = [] } = useGetCompaniesQuery();
  const { data: branches = [] } = useGetBranchesQuery(companyCode, { skip: !companyCode });

  // Notifications state loaded from localStorage to survive page refresh
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('notifications');
    return saved ? JSON.parse(saved) : [];
  });

  // Click details modal states
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  // Sync notifications to localStorage on update
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Helper to compute relative time ago
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} minutes ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} hours ago`;
    const diffDays = Math.floor(diffHour / 24);
    return `${diffDays} days ago`;
  };

  // Helper to map notification type to correct icon indicator
  const getNotificationIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('cancel')) {
      return <span style={{ marginRight: 8, fontSize: 15 }}>❌</span>;
    }
    if (t.includes('reschedule') || t.includes('add') || t.includes('new')) {
      return <span style={{ marginRight: 8, fontSize: 15 }}>📅</span>;
    }
    return <span style={{ marginRight: 8, fontSize: 15 }}>🔔</span>;
  };


  // Stable ref for notificationApi so it doesn't cause effect re-runs on every render
  const notificationApiRef = useRef(notificationApi);
  useEffect(() => { notificationApiRef.current = notificationApi; }, [notificationApi]);

  // Stable ref for user so we can use it inside the effect without it being a dep
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // SignalR Real-time Connection Setup
  // Dependencies: only primitive values that genuinely change the connection target
  useEffect(() => {
    const currentToken = token;
    const currentUsername = user?.username;

    if (!currentToken || !currentUsername) {
      console.warn('[SignalR] Skipping connection — no token or username:', { token: !!currentToken, username: currentUsername });
      return;
    }

    const host = window.location.hostname;
    const hubUrl = `http://${host}:5000/hubs/notifications`;

    console.log(`[SignalR] 🔌 Initializing connection to: ${hubUrl}`);
    console.log(`[SignalR] User context: username=${currentUsername} | role=${role} | interviewName='${interviewName}'`);

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => currentToken
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    // Listen for Registered ack from server
    connection.on('Registered', (success) => {
      console.log(`[SignalR] ✅ Server confirmed registration: success=${success}`);
    });

    connection.on('ReceiveNotification', (notificationData) => {
      console.log('[SignalR] 🔔 ReceiveNotification fired! Raw data:', notificationData);
      console.log('[SignalR] Message:', notificationData?.Message || notificationData?.message);
      console.log('[SignalR] Type:', notificationData?.Type || notificationData?.type);

      // Play a subtle modern synthetic chime to grab attention
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } catch (e) {
        console.warn('[SignalR] Audio chime blocked:', e.message);
      }

      // Add to notifications list
      dispatch(apiSlice.util.invalidateTags(['Interviews']));

      setNotifications(prev => [
        {
          id: notificationData.Id || notificationData.id || Math.random().toString(),
          message: notificationData.Message || notificationData.message,
          timestamp: notificationData.Timestamp || notificationData.timestamp || new Date().toISOString(),
          type: notificationData.Type || notificationData.type,
          isRead: false,
          sr: notificationData.Sr ?? notificationData.sr,
          intervieweeName: notificationData.IntervieweeName ?? notificationData.intervieweeName,
          jobHunterName: notificationData.JobHunterName ?? notificationData.jobHunterName,
          companyName: notificationData.CompanyName ?? notificationData.companyName,
          changedField: notificationData.ChangedField ?? notificationData.changedField,
          oldValue: notificationData.OldValue ?? notificationData.oldValue,
          newValue: notificationData.NewValue ?? notificationData.newValue
        },
        ...prev
      ]);
      console.log('[SignalR] ✅ Notification added to state');

      // Pop an AntD toast notification — use ref so we don't put notificationApi in dep array
      notificationApiRef.current.info({
        message: 'New Update',
        description: notificationData.Message || notificationData.message,
        placement: 'topRight',
        duration: 5
      });
    });

    connection.start()
      .then(() => {
        console.log(`[SignalR] ✅ Connected! State: ${connection.state} | ConnectionId: ${connection.connectionId}`);
        
        const currentInterviewName = (localStorage.getItem('interviewName') || interviewName || '').trim();
        const targetGroup = role === 'Admin' ? 'Admins' : currentInterviewName.toLowerCase();
        console.log(`[SignalR] Invoking JoinGroup(groupName='${targetGroup}')`);
        if (currentInterviewName) {
          connection.invoke('JoinGroup', targetGroup)
            .then(() => console.log(`[SignalR] ✅ JoinGroup() invoke sent successfully for '${targetGroup}'`))
            .catch(err => console.error('[SignalR] ❌ JoinGroup() invoke failed:', err));
        } else {
          console.warn('[SignalR] Skipping JoinGroup() — interviewName is empty/Admin');
        }

        console.log(`[SignalR] Invoking Register(username='${currentUsername}', interviewName='${currentInterviewName}', role='${role || ''}')`);
        connection.invoke('Register', currentUsername, currentInterviewName, role || '')
          .then(() => console.log('[SignalR] ✅ Register() invoke sent successfully'))
          .catch(err => console.error('[SignalR] ❌ Registration invoke failed:', err));
      })
      .catch(err => console.error('[SignalR] ❌ Connection failed:', err));

    connection.onreconnecting(err => console.warn('[SignalR] ⚠ Reconnecting...', err));
    connection.onreconnected(connId => {
      console.log(`[SignalR] ✅ Reconnected! New connectionId: ${connId}`);
      
      const currentInterviewName = (localStorage.getItem('interviewName') || interviewName || '').trim();
      const targetGroup = role === 'Admin' ? 'Admins' : currentInterviewName.toLowerCase();
      if (currentInterviewName) {
        connection.invoke('JoinGroup', targetGroup)
          .then(() => console.log(`[SignalR] ✅ JoinGroup() after reconnect complete`))
          .catch(err => console.error('[SignalR] ❌ JoinGroup() after reconnect failed:', err));
      }
      connection.invoke('Register', currentUsername, currentInterviewName, role || '')
        .catch(err => console.error('[SignalR] ❌ Re-registration after reconnect failed:', err));
    });

    connection.onclose(err => console.error('[SignalR] ❌ Connection closed:', err));

    return () => {
      console.log('[SignalR] 🔌 Stopping connection (cleanup)');
      connection.stop();
    };
    // Only re-run when actual auth identity changes — NOT notificationApi (new obj each render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.username, role, interviewName]);

  const handleLogout = () => {
    // Clear ALL localStorage data
    localStorage.clear();
    // Reset RTK Query state
    dispatch(apiSlice.util.resetApiState());
    // Clear auth state
    dispatch(logOut());
    message.success('Logged out successfully');
  };

  const handleCompanyChange = (value) => {
    const firstBranch = branches.find(b => (b.companyCode || b.CompanyCode) === value)?.branchCode ||
      branches.find(b => (b.companyCode || b.CompanyCode) === value)?.BranchCode || '';
    dispatch(setCredentials({
      token: token,
      refreshToken: localStorage.getItem('refreshToken'),
      username: user.username,
      fullName: user.fullName,
      role: role,
      interviewName: interviewName,
      companyCode: value,
      branchCode: firstBranch
    }));
    message.info(`Switched to Company: ${value}`);
  };

  const handleBranchChange = (value) => {
    dispatch(setCredentials({
      token: token,
      refreshToken: localStorage.getItem('refreshToken'),
      username: user.username,
      fullName: user.fullName,
      role: role,
      interviewName: interviewName,
      companyCode: companyCode,
      branchCode: value
    }));
    message.info(`Switched to Branch: ${value}`);
  };

  const handleMarkAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  // Click handler to mark as read and show detail Modal
  const handleNotificationClick = (item) => {
    handleMarkAsRead(item.id);
    setSelectedNotification(item);
    setIsDetailModalVisible(true);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const notificationContent = (
    <div style={{ width: 340 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 8, marginBottom: 8 }}>
        <Text strong>Notifications</Text>
        <Space>
          {notifications.length > 0 && (
            <Button type="link" size="small" onClick={handleMarkAllAsRead} style={{ padding: 0, fontSize: 12 }}>
              Mark all as read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button type="link" size="small" danger onClick={handleClearNotifications} style={{ padding: 0, fontSize: 12 }}>
              Clear
            </Button>
          )}
        </Space>
      </div>
      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#bfbfbf' }}>
          <BellOutlined style={{ fontSize: 24, marginBottom: 8, display: 'inline-block' }} />
          <Text type="secondary" style={{ display: 'block' }}>No notifications yet</Text>
        </div>
      ) : (
        <List
          size="small"
          dataSource={notifications}
          style={{ overflowY: 'auto', maxHeight: 320 }}
          renderItem={item => (
            <List.Item
              style={{
                padding: '10px 12px',
                borderRadius: 6,
                borderBottom: '1px solid #f0f0f0',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'block',
                marginBottom: 6,
                borderLeft: !item.isRead ? '4px solid #3b82f6' : '4px solid #94a3b8',
                backgroundColor: !item.isRead ? (isDarkMode ? '#1e293b' : '#eff6ff') : (isDarkMode ? '#0f172a' : '#f8fafc')
              }}
              onClick={() => handleNotificationClick(item)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  {getNotificationIcon(item.type)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  <Text style={{
                    fontSize: 13,
                    color: item.isRead ? (isDarkMode ? '#94a3b8' : '#64748b') : (isDarkMode ? '#f8fafc' : '#1e293b'),
                    fontWeight: !item.isRead ? 'bold' : 'normal',
                    lineHeight: '1.4',
                    display: 'block'
                  }}>
                    {item.message}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>
                    {getTimeAgo(item.timestamp)}
                  </Text>
                </div>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  );

  const userMenuItems = [
    {
      key: '1',
      label: (
        <div style={{ padding: '4px 12px' }}>
          <Text strong style={{ display: 'block' }}>{user?.fullName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{role}</Text>
        </div>
      ),
    },
    {
      key: 'divider',
      type: 'divider',
    },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Header
      className={`border-b shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}
      style={{
        minHeight: 48,
        height: 48,
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Left Side: Mobile hamburger OR desktop compact switchers */}
      <div className="flex items-center gap-4 min-w-0 flex-1 overflow-hidden">
        {/* Mobile hamburger */}
        {isMobile ? (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={onMobileMenuClick}
            style={{ fontSize: 18, flexShrink: 0 }}
          />
        ) : null}

        {/* Company selector */}
        <div className="hidden lg:flex items-center flex-wrap gap-2 overflow-hidden ml-4">
          <div className="flex items-center min-w-0">
            <GlobalOutlined className="mr-1 text-[#4f46e5] flex-shrink-0" />
            <span className={`hidden lg:inline font-semibold text-xs uppercase tracking-wider mr-1 whitespace-nowrap ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
              Company:
            </span>
            <Select
              value={companyCode}
              onChange={handleCompanyChange}
              options={companies.map(c => {
                const name = c.name || c.Name || '';
                const label = name.toLowerCase().includes('rizviz int')
                  ? 'Rizviz International Impex'
                  : name;
                return { value: c.companyCode || c.CompanyCode, label };
              })}
              style={{ width: 260 }}
              size="small"
              variant="borderless"
              className="bg-[#f0f0fa] dark:bg-[#1c1942] rounded-full"
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0, marginLeft: 'auto' }}>
        {/* Real-time Notification Bell Popover */}
        <Popover
          content={notificationContent}
          title={null}
          trigger="click"
          placement="bottomRight"
          overlayStyle={{ zIndex: 1100 }}
        >
          <div
            style={{ position: 'relative', display: 'inline-flex', cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            aria-label="Notifications"
          >
            <Badge
              count={unreadCount}
              size="small"
              offset={[-2, 2]}
              style={{ pointerEvents: 'none' }}
            >
              <Button
                type="text"
                shape="circle"
                icon={<BellOutlined style={{ fontSize: 18, color: isDarkMode ? '#e2e8f0' : '#475569' }} />}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}
              />
            </Badge>
          </div>
        </Popover>

        <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
          <Space className={`cursor-pointer p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}`}>
            <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=Business&clothing=blazerAndShirt" style={{ backgroundColor: '#e2e8f0' }} icon={<UserOutlined />} size="large" />
            <div className="hidden md:flex flex-col text-left ml-1">
              <Text strong className="text-sm leading-tight" style={{ color: isDarkMode ? '#f8fafc' : '#111827' }}>
                {user?.fullName || 'Mollay Alex'}
              </Text>
              <Text type="secondary" className="text-xs leading-none mt-0.5" style={{ color: isDarkMode ? '#94a3b8' : '#6b7280' }}>
                {role || 'UI/UX Designer'}
              </Text>
            </div>
          </Space>
        </Dropdown>
      </div>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
            {selectedNotification && getNotificationIcon(selectedNotification.type)}
            <span style={{ fontSize: 16, fontWeight: 600 }}>Interview Notification Details</span>
          </div>
        }
        open={isDetailModalVisible}
        onOk={() => setIsDetailModalVisible(false)}
        onCancel={() => setIsDetailModalVisible(false)}
        okText="Close"
        cancelButtonProps={{ style: { display: 'none' } }}
        centered
        width={Math.min(500, window.innerWidth * 0.95)}
      >
        {selectedNotification ? (
          <div style={{ marginTop: 16 }}>
            <Descriptions bordered column={1} size="small" labelStyle={{ width: '150px', fontWeight: 500 }}>
              <Descriptions.Item label="SR Number">
                <Text strong>{selectedNotification.sr ?? 'N/A'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Interviewee Name">
                {selectedNotification.intervieweeName ?? 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Job Hunter Name">
                {selectedNotification.jobHunterName ?? 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Company Name">
                {selectedNotification.companyName ?? 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="What Changed">
                <Badge status="processing" text={selectedNotification.changedField || 'Data Update'} />
              </Descriptions.Item>
              <Descriptions.Item label="Old Value">
                <span style={{ color: '#ef4444', textDecoration: selectedNotification.oldValue ? 'line-through' : 'none' }}>
                  {selectedNotification.oldValue || 'N/A'}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="New Value">
                <span style={{ color: '#22c55e', fontWeight: 'bold' }}>
                  {selectedNotification.newValue || 'N/A'}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Change Time">
                {dayjs(selectedNotification.timestamp).format('DD MMM YYYY, hh:mm A')}
              </Descriptions.Item>
            </Descriptions>
          </div>
        ) : null}
      </Modal>
    </Header>
  );
};

export default TopNavbar;

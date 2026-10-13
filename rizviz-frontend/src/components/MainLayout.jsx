import React, { useState, useEffect, useRef } from 'react';
import { Layout, Menu, Button, Drawer, theme } from 'antd';
import logo from '../assets/logo.png';
import {
  DashboardOutlined,
  UserOutlined,
  DollarCircleOutlined,
  InboxOutlined,
  ProjectOutlined,
  ScheduleOutlined,
  CalendarOutlined,
  AuditOutlined,
  SafetyCertificateOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  RiseOutlined,
  RobotOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toggleDarkMode } from '../store/themeSlice';
import TopNavbar from './TopNavbar';
import { PlusOutlined } from '@ant-design/icons';

const { Sider, Content } = Layout;

const SIDEBAR_WIDTH = 290;
const SIDEBAR_COLLAPSED_WIDTH = 72; // thin icon rail always visible
const MOBILE_BREAKPOINT = 768;

const PORTAL_ROLES = ['Interviewee', 'Job Hunter', 'Both'];

const MainLayout = () => {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);
  const hoverTimeout = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useSelector((state) => state.auth);
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const dispatch = useDispatch();
  const isPortalUser = PORTAL_ROLES.includes(role);

  // isExpanded = hovered OR pinned
  const isExpanded = hovered || pinned;

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => setHovered(false), 150);
  };

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isAdmin = role === 'Admin' || role === 'HR';
  const isManagerOrAbove = isAdmin || role === 'Manager';

  const allMenuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">Main Dashboard</Link>,
      roles: ['Admin', 'Interviewee', 'Job Hunter', 'Both'],
    },
    // {
    //   key: '/leads',
    //   icon: <RiseOutlined />,
    //   label: <Link to="/leads">Leads</Link>,
    //   roles: null,
    // },
    {
      key: '/interviews/calendar',
      icon: <CalendarOutlined />,
      label: <Link to="/interviews/calendar">Interview Calendar</Link>,
      roles: null,
    },
    {
      key: '/interviews',
      icon: <ScheduleOutlined />,
      label: <Link to="/interviews">All Interviews(Stack Wise)</Link>,
      roles: null,
    },
    {
      key: '/interviews/assign',
      icon: <UserOutlined />,
      label: <Link to="/interviews/assign">Assign Interview</Link>,
      roles: ['Admin'],
    },
    {
      key: '/interviews/feedback',
      icon: <RobotOutlined />,
      label: <Link to="/interviews/feedback">Interview Feedback</Link>,
      roles: null,
    },
    {
      key: '/candidates',
      icon: <TeamOutlined />,
      label: <Link to="/candidates">Candidates</Link>,
      roles: ['Admin'],
    },
    // {
    //   key: '/employees',
    //   icon: <UserOutlined />,
    //   label: <Link to="/employees">HR & Employees</Link>,
    //   roles: ['Admin'],
    // },
    // {
    //   key: '/payroll',
    //   icon: <DollarCircleOutlined />,
    //   label: <Link to="/payroll">Payroll Process</Link>,
    //   roles: ['Admin'],
    // },
    // {
    //   key: '/inventory',
    //   icon: <InboxOutlined />,
    //   label: <Link to="/inventory">Asset Register</Link>,
    //   roles: ['Admin'],
    // },
    // {
    //   key: '/projects',
    //   icon: <ProjectOutlined />,
    //   label: <Link to="/projects">Project Allocations</Link>,
    //   roles: ['Admin'],
    // },
    // {
    //   key: '/recruitment',
    //   icon: <ScheduleOutlined />,
    //   label: <Link to="/recruitment">Recruitment</Link>,
    //   roles: ['Admin'],
    // },
    // {
    //   key: '/reports',
    //   icon: <AuditOutlined />,
    //   label: <Link to="/reports">Reports Center</Link>,
    //   roles: ['Admin'],
    // },
    // {
    //   key: '/audit-logs',
    //   icon: <SafetyCertificateOutlined />,
    //   label: <Link to="/audit-logs">Audit Logs</Link>,
    //   roles: ['Admin'],
    // },
  ];

  const menuItems = allMenuItems.filter(
    (item) => item.roles === null || item.roles.includes(role)
  );

  const pathname = location.pathname;
  const selectedKeys = pathname.startsWith('/interviews/feedback')
    ? ['/interviews/feedback']
    : pathname.startsWith('/interviews/calendar')
      ? ['/interviews/calendar']
      : pathname.startsWith('/interviews/assign')
        ? ['/interviews/assign']
        : pathname.startsWith('/interviews')
          ? ['/interviews']
          : pathname.startsWith('/candidates')
            ? ['/candidates']
            : ['/' + pathname.split('/')[1]];

  const SidebarContent = ({ drawerMode = false, expanded = true }) => (
    <div className="flex flex-col h-full" style={{ overflow: 'hidden' }}>
      {/* Logo area */}
      <div
        className={`flex items-center justify-center border-b px-4 ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}
        style={{
          height: expanded ? 110 : 64,
          borderBottomColor: isDarkMode ? '#1e1b4b' : '#eaeaf8',
          transition: 'height 0.3s cubic-bezier(0.4,0,0.2,1)',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {expanded ? (
          <div className="flex items-center justify-center w-full px-4">
            <img
              src={logo}
              alt="Rizviz Logo"
              className="h-44 w-auto object-contain"
              style={{
                mixBlendMode: isDarkMode ? 'screen' : 'multiply',
                filter: isDarkMode ? 'invert(1) brightness(1.2)' : 'none',
                margin: '-36px 0',
                transition: 'all 0.3s ease',
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center w-full">
            <img
              src={logo}
              alt="Rizviz Logo"
              className="h-10 w-auto object-contain"
              style={{
                mixBlendMode: isDarkMode ? 'screen' : 'multiply',
                filter: isDarkMode ? 'invert(1) brightness(1.2)' : 'none',
                transition: 'all 0.3s ease',
              }}
            />
          </div>
        )}
      </div>

      {/* Menu Area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col" style={{ overflow: expanded ? 'auto' : 'hidden' }}>
        <Menu
          theme={isDarkMode ? "dark" : "light"}
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          inlineCollapsed={!expanded}
          style={{ borderRight: 0, marginTop: 8, background: 'transparent' }}
        />
      </div>

      {/* Footer controls */}
      <div className={`border-t p-3 space-y-0.5 ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}
        style={{ borderTopColor: isDarkMode ? '#1c1942' : '#eaeaf8', overflow: 'hidden' }}>

        {/* Dark mode toggle */}
        <div
          onClick={() => dispatch(toggleDarkMode())}
          className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
            isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-gray-50 text-[#475569]'
          }`}
          style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}
        >
          <span className="flex items-center gap-2">
            {isDarkMode ? (
              <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
            {expanded && (isDarkMode ? 'Light Mode' : 'Dark Mode')}
          </span>
          {expanded && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold flex-shrink-0 ${
              isDarkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-purple-50 text-purple-600'
            }`}>Toggle</span>
          )}
        </div>

        {/* Pin sidebar */}
        {expanded && (
          <div
            onClick={() => setPinned(p => !p)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-gray-50 text-[#475569]'
            }`}
            style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}
          >
            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {pinned
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 19l8-8-8-8m0 16l8-8-8-8" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              }
            </svg>
            {pinned ? 'Unpin Sidebar' : 'Pin Sidebar'}
          </div>
        )}

        {/* Sign out */}
        <div
          onClick={() => {
            localStorage.clear();
            window.location.href = '/login';
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
            isDarkMode ? 'hover:bg-red-950/20 text-red-400' : 'hover:bg-red-50 text-red-500'
          }`}
          style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}
        >
          <svg className="w-3.5 h-3.5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          {expanded && 'Sign out'}
        </div>
      </div>
    </div>
  );

  const sidebarBg = isDarkMode ? '#12102e' : '#f0f0fa';

  return (
    <Layout style={{ minHeight: '100vh', position: 'relative' }}>

      {/* Edge Hover Trigger Bar — triggers sidebar reveal when cursor nears left edge */}
      {!isMobile && !pinned && (
        <div
          onMouseEnter={handleMouseEnter}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: 16,
            height: '100vh',
            zIndex: 198,
            cursor: 'pointer',
          }}
          title="Hover to reveal menu"
        />
      )}

      {/* Floating Edge Tab indicator when sidebar is hidden */}
      {!isMobile && !pinned && !isExpanded && (
        <div
          onMouseEnter={handleMouseEnter}
          onClick={() => setHovered(true)}
          style={{
            position: 'fixed',
            left: 0,
            top: 76,
            zIndex: 199,
            background: isDarkMode ? '#1e1b4b' : '#ffffff',
            border: `1px solid ${isDarkMode ? '#312e81' : '#e0e7ff'}`,
            borderLeft: 'none',
            borderRadius: '0 8px 8px 0',
            padding: '8px 5px',
            cursor: 'pointer',
            boxShadow: '2px 2px 8px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          title="Hover to show menu"
        >
          <MenuUnfoldOutlined style={{ fontSize: 14, color: '#4f46e5' }} />
        </div>
      )}

      {/* Desktop Sidebar — slides in/out on hover */}
      {!isMobile && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            width: SIDEBAR_WIDTH,
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            background: sidebarBg,
            zIndex: 300,
            transform: isExpanded ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.28s ease',
            boxShadow: isExpanded ? '6px 0 28px rgba(0,0,0,0.22)' : 'none',
            overflow: 'hidden',
          }}
        >
          <SidebarContent expanded={true} />
        </div>
      )}

      {/* Mobile Drawer Sidebar */}
      {isMobile && (
        <Drawer
          placement="left"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          closable={false}
          styles={{ body: { padding: 0, background: sidebarBg } }}
          style={{ width: SIDEBAR_WIDTH }}
        >
          <div style={{ background: sidebarBg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <SidebarContent drawerMode={true} expanded={true} />
          </div>
        </Drawer>
      )}

      {/* Main Content Area — 0 margin when unpinned for 100% full screen width */}
      <Layout
        style={{
          marginLeft: !isMobile && pinned ? SIDEBAR_WIDTH : 0,
          transition: 'margin-left 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          minWidth: 0,
          minHeight: '100vh',
        }}
      >
        <TopNavbar
          onMobileMenuClick={() => setMobileOpen(true)}
          isMobile={isMobile}
          sidebarCollapsed={!isExpanded}
          onSidebarToggle={() => {
            if (!pinned) {
              setPinned(true);
              setHovered(true);
            } else {
              setPinned(false);
              setHovered(false);
            }
          }}
        />

        <Content
          style={{
            margin: location.pathname.includes('/interviews/calendar')
              ? 0
              : isMobile ? '8px 4px' : '10px 16px',
            padding: 0,
            minHeight: 280,
            background: 'transparent',
            borderRadius: location.pathname.includes('/interviews/calendar') ? 0 : borderRadiusLG,
            overflowX: isMobile ? 'auto' : 'hidden',
            overflowY: (location.pathname === '/dashboard' && !isMobile) ? 'hidden' : 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;

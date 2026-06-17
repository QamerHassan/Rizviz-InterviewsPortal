import React, { useState, useEffect } from 'react';
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
const SIDEBAR_COLLAPSED_WIDTH = 80;
const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

const PORTAL_ROLES = ['Interviewee', 'Job Hunter', 'Both'];

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);

  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useSelector((state) => state.auth);
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const dispatch = useDispatch();
  const isPortalUser = PORTAL_ROLES.includes(role);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setIsMobile(w < MOBILE_BREAKPOINT);
      if (w < MOBILE_BREAKPOINT) {
        setCollapsed(true);
      } else if (w >= MOBILE_BREAKPOINT && w < TABLET_BREAKPOINT) {
        setCollapsed(true); // Auto-collapse on tablet
      } else {
        setCollapsed(false); // Auto-expand on desktop
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      : pathname.startsWith('/interviews')
        ? ['/interviews']
        : pathname.startsWith('/candidates')
          ? ['/candidates']
          : ['/' + pathname.split('/')[1]];

  const SidebarContent = ({ drawerMode = false }) => (
    <div className="flex flex-col h-full">
      <div
        className={`flex items-center justify-center border-b px-4 ${isDarkMode ? 'border-slate-800' : 'border-gray-100'
          }`}
        style={{
          height: (!drawerMode && collapsed) ? 64 : 110,
          borderBottomColor: isDarkMode ? '#1e1b4b' : '#eaeaf8',
          transition: 'all 0.2s ease'
        }}
      >
        {(!drawerMode && collapsed) ? (
          <div className="flex items-center justify-center w-full">
            <img
              src={logo}
              alt="Rizviz Logo"
              className="h-12 w-auto object-contain"
              style={{
                mixBlendMode: isDarkMode ? 'screen' : 'multiply',
                filter: isDarkMode ? 'invert(1) brightness(1.2)' : 'none',
                transition: 'all 0.2s ease',
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center w-full px-4">
            <img
              src={logo}
              alt="Rizviz Logo"
              className="h-44 w-auto object-contain"
              style={{
                mixBlendMode: isDarkMode ? 'screen' : 'multiply',
                filter: isDarkMode ? 'invert(1) brightness(1.2)' : 'none',
                margin: '-36px 0',
                transition: 'all 0.2s ease',
              }}
            />
          </div>
        )}
      </div>

      {/* Menu Area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col">
        <Menu
          theme={isDarkMode ? "dark" : "light"}
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          style={{ borderRight: 0, marginTop: 8, background: 'transparent' }}
        />
      </div>



      {/* Footer controls */}
      <div className={`border-t p-3 space-y-0.5 ${isDarkMode ? 'border-slate-800' : 'border-gray-100'
        }`} style={{ borderTopColor: isDarkMode ? '#1c1942' : '#eaeaf8' }}>
        <div
          onClick={() => dispatch(toggleDarkMode())}
          className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${isDarkMode
            ? 'hover:bg-slate-800 text-slate-300'
            : 'hover:bg-gray-50 text-[#475569]'
            }`}
        >
          <span className="flex items-center gap-2">
            {isDarkMode ? (
              <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${isDarkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-purple-50 text-purple-600'
            }`}>Toggle</span>
        </div>

        <div
          onClick={() => setCollapsed(!collapsed)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${isDarkMode
            ? 'hover:bg-slate-800 text-slate-300'
            : 'hover:bg-gray-50 text-[#475569]'
            }`}
        >
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          Collapse Sidebar
        </div>

        <div
          onClick={() => {
            localStorage.clear();
            window.location.href = '/login';
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-red-950/20 text-red-400' : 'hover:bg-red-50 text-red-500'
            }`}
        >
          <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Sign out
        </div>
      </div>
    </div>
  );

  const siderMargin = isMobile ? 0 : (collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH);
  const sidebarBg = isDarkMode ? '#12102e' : '#f0f0fa';

  return (
    <Layout style={{ minHeight: '100vh' }}>

      {/* Desktop/Tablet Sidebar */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          theme={isDarkMode ? "dark" : "light"}
          width={SIDEBAR_WIDTH}
          collapsedWidth={SIDEBAR_COLLAPSED_WIDTH}
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            background: sidebarBg,
            zIndex: 200,
          }}
        >
          <SidebarContent />
        </Sider>
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
            <SidebarContent drawerMode={true} />
          </div>
        </Drawer>
      )}

      {/* Main Content Area */}
      <Layout
        style={{
          marginLeft: siderMargin,
          transition: 'margin-left 0.2s ease',
          minWidth: 0,
        }}
      >
        <TopNavbar
          onMobileMenuClick={() => setMobileOpen(true)}
          isMobile={isMobile}
          sidebarCollapsed={collapsed}
          onSidebarToggle={() => setCollapsed(!collapsed)}
        />

        <Content
          style={{
            margin: isMobile ? '8px 4px' : '10px 16px',
            padding: isMobile ? '0px' : '0px',
            minHeight: 280,
            background: 'transparent',
            borderRadius: borderRadiusLG,
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

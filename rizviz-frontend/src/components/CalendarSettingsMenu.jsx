import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dropdown,
  Button,
  Modal,
  Form,
  Select,
  Switch,
  TimePicker,
  Input,
  Tag,
  Radio,
  Tabs,
  Badge,
  Card,
  Space,
  Typography,
  Divider,
  Tooltip,
  List,
  Popconfirm,
  message,
} from 'antd';
import {
  SettingOutlined,
  DeleteOutlined,
  BgColorsOutlined,
  PrinterOutlined,
  AppstoreAddOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  UndoOutlined,
  ClearOutlined,
  SyncOutlined,
  GlobalOutlined,
  BellOutlined,
  ThunderboltOutlined,
  VideoCameraOutlined,
  CalendarOutlined,
  MessageOutlined,
  RobotOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { setDarkMode } from '../store/themeSlice';
import dayjs from 'dayjs';

const { Text, Title, Paragraph } = Typography;

// Storage keys
export const CALENDAR_SETTINGS_KEY = 'rizviz_calendar_settings';
export const CALENDAR_TRASH_KEY = 'rizviz_calendar_trash';
export const CALENDAR_ADDONS_KEY = 'rizviz_calendar_addons';
export const CALENDAR_DENSITY_KEY = 'rizviz_calendar_density';

export const getStoredCalendarSettings = () => {
  try {
    const raw = localStorage.getItem(CALENDAR_SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse calendar settings', e);
  }
  return {
    defaultView: 'week',
    weekStartsOn: 'sunday',
    startHour: '08:00',
    endHour: '20:00',
    primaryTimezone: 'EST',
    secondaryTimezone: 'PKT',
    timeFormat: '12h',
    soundAlerts: true,
    autoSyncInterval: 'realtime',
    showRecruiterAvatars: true,
    showRoundBadges: true,
    showStackTags: true,
    density: 'comfortable',
    accentColor: '#4f46e5',
  };
};

export const getStoredTrash = () => {
  try {
    const raw = localStorage.getItem(CALENDAR_TRASH_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse trash items', e);
  }
  return [];
};

export const saveToTrash = (interviewItem) => {
  if (!interviewItem) return;
  try {
    const current = getStoredTrash();
    const trashedItem = {
      ...interviewItem,
      trashId: 'trash_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      deletedAt: new Date().toISOString(),
    };
    const updated = [trashedItem, ...current].slice(0, 100); // keep up to 100
    localStorage.setItem(CALENDAR_TRASH_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('calendar-trash-updated', { detail: updated }));
    return trashedItem;
  } catch (e) {
    console.error('Failed to save to trash', e);
  }
};

const DEFAULT_ADDONS = [
  {
    id: 'google-meet',
    name: 'Google Meet & Calendar Sync',
    developer: 'Google Workspace',
    category: 'Video & Calendar',
    icon: '📹',
    rating: '4.9',
    installs: '24K+',
    installed: true,
    description: 'Auto-generate Google Meet conference links and sync technical interviews two-ways with Google Calendar.',
    fields: [
      { key: 'calendarId', label: 'Primary Google Calendar ID', placeholder: 'primary@company.com' },
      { key: 'autoAttachMeet', label: 'Automatically attach Meet link to new interviews', type: 'boolean', defaultValue: true }
    ]
  },
  {
    id: 'zoom-meetings',
    name: 'Zoom for Tech Interviews',
    developer: 'Zoom Video Communications',
    category: 'Video Meetings',
    icon: '⚡',
    rating: '4.8',
    installs: '18K+',
    installed: false,
    description: 'Create unique Zoom meeting rooms with passcodes and candidate waiting rooms directly from the scheduler.',
    fields: [
      { key: 'zoomAccountId', label: 'Zoom Account ID', placeholder: 'us04web.zoom.us' },
      { key: 'zoomApiKey', label: 'Server-to-Server OAuth Client ID', placeholder: 'Enter Client ID' }
    ]
  },
  {
    id: 'slack-bot',
    name: 'Slack Candidate Alerts',
    developer: 'Slack Technologies',
    category: 'Notifications',
    icon: '💬',
    rating: '4.9',
    installs: '15K+',
    installed: true,
    description: 'Broadcast real-time interview bookings, cancellations, and developer availability notifications into #recruitment.',
    fields: [
      { key: 'webhookUrl', label: 'Slack Webhook URL', placeholder: 'https://hooks.slack.com/services/...' },
      { key: 'channel', label: 'Notification Channel', placeholder: '#interview-alerts' }
    ]
  },
  {
    id: 'whatsapp-sms',
    name: 'WhatsApp & SMS Reminders',
    developer: 'Twilio Cloud Sync',
    category: 'Communication',
    icon: '📱',
    rating: '4.7',
    installs: '9K+',
    installed: false,
    description: 'Send automated WhatsApp and SMS interview reminders to candidates and interviewers 1 hour before scheduled call.',
    fields: [
      { key: 'twilioSid', label: 'Twilio Account SID', placeholder: 'ACxxxxxxxxxxxx' },
      { key: 'senderPhone', label: 'Sender Phone Number', placeholder: '+1 555 019 2831' }
    ]
  },
  {
    id: 'ai-copilot',
    name: 'AI Interview Notes & Transcriber',
    developer: 'Rizviz Intelligence',
    category: 'AI Tools',
    icon: '🤖',
    rating: '5.0',
    installs: '31K+',
    installed: true,
    description: 'Record audio, transcribe live coding interviews, and automatically summarize strengths, weaknesses, and ratings.',
    fields: [
      { key: 'model', label: 'AI Model Choice', placeholder: 'Gemini 1.5 Pro / GPT-4o' },
      { key: 'autoScorecard', label: 'Auto-generate scorecard after interview completion', type: 'boolean', defaultValue: true }
    ]
  },
  {
    id: 'ms-teams',
    name: 'Microsoft Teams & Outlook',
    developer: 'Microsoft Corporation',
    category: 'Video & Calendar',
    icon: '🏢',
    rating: '4.6',
    installs: '11K+',
    installed: false,
    description: 'Synchronize interview schedules directly with Microsoft Outlook 365 and generate Microsoft Teams meeting links.',
    fields: [
      { key: 'tenantId', label: 'Azure Tenant ID', placeholder: 'xxxxxxxx-xxxx-xxxx' },
      { key: 'clientId', label: 'Azure Application Client ID', placeholder: 'xxxxxxxx-xxxx-xxxx' }
    ]
  }
];

const CalendarSettingsMenu = ({
  currentView,
  setViewMode,
  selectedDay = dayjs(),
  interviews = [],
  onRestoreInterview,
  onSearchFocus,
  compact = false,
}) => {
  const dispatch = useDispatch();
  const isDarkMode = useSelector((state) => state.theme?.isDarkMode);

  // Settings State
  const [settings, setSettings] = useState(getStoredCalendarSettings);
  const [trashList, setTrashList] = useState(getStoredTrash);
  const [addonsList, setAddonsList] = useState(() => {
    try {
      const raw = localStorage.getItem(CALENDAR_ADDONS_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_ADDONS;
    } catch {
      return DEFAULT_ADDONS;
    }
  });

  // Modals Visibility
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isAddonsOpen, setIsAddonsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Active configure add-on
  const [configuredAddon, setConfiguredAddon] = useState(null);
  const [addonConfigForm] = Form.useForm();

  // Search filter for trash
  const [trashSearch, setTrashSearch] = useState('');

  // Print Setup Form
  const [printType, setPrintType] = useState('grid'); // 'grid' | 'agenda'
  const [printOrientation, setPrintOrientation] = useState('landscape'); // 'portrait' | 'landscape'
  const [printRange, setPrintRange] = useState('week'); // 'today' | 'week' | 'month'

  // Settings Form
  const [settingsForm] = Form.useForm();

  // Listen for storage / custom updates
  useEffect(() => {
    const handleTrashUpdate = (e) => {
      if (e.detail) setTrashList(e.detail);
      else setTrashList(getStoredTrash());
    };
    window.addEventListener('calendar-trash-updated', handleTrashUpdate);
    return () => window.removeEventListener('calendar-trash-updated', handleTrashUpdate);
  }, []);

  // Save settings helper
  const handleSaveSettings = (values) => {
    const updated = {
      ...settings,
      ...values,
      startHour: values.startHour ? (dayjs.isDayjs(values.startHour) ? values.startHour.format('HH:mm') : values.startHour) : settings.startHour,
      endHour: values.endHour ? (dayjs.isDayjs(values.endHour) ? values.endHour.format('HH:mm') : values.endHour) : settings.endHour,
    };
    setSettings(updated);
    localStorage.setItem(CALENDAR_SETTINGS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('calendar-settings-changed', { detail: updated }));
    if (setViewMode && values.defaultView && currentView !== values.defaultView) {
      setViewMode(values.defaultView);
    }
    message.success('Calendar settings saved successfully');
    setIsSettingsOpen(false);
  };

  // Trash handlers
  const handleRestoreItem = (item) => {
    const remaining = trashList.filter((t) => t.trashId !== item.trashId);
    setTrashList(remaining);
    localStorage.setItem(CALENDAR_TRASH_KEY, JSON.stringify(remaining));
    window.dispatchEvent(new CustomEvent('calendar-trash-updated', { detail: remaining }));

    if (onRestoreInterview) {
      onRestoreInterview(item);
    }
    message.success(`Restored interview for ${item.IntervieweeName || item.intervieweeName || 'candidate'}`);
  };

  const handlePermanentDeleteItem = (trashId) => {
    const remaining = trashList.filter((t) => t.trashId !== trashId);
    setTrashList(remaining);
    localStorage.setItem(CALENDAR_TRASH_KEY, JSON.stringify(remaining));
    window.dispatchEvent(new CustomEvent('calendar-trash-updated', { detail: remaining }));
    message.info('Permanently deleted from Trash');
  };

  const handleEmptyTrash = () => {
    setTrashList([]);
    localStorage.setItem(CALENDAR_TRASH_KEY, JSON.stringify([]));
    window.dispatchEvent(new CustomEvent('calendar-trash-updated', { detail: [] }));
    message.success('Trash emptied');
  };

  // Appearance handlers
  const handleThemeChange = (mode) => {
    if (mode === 'dark') {
      dispatch(setDarkMode(true));
    } else if (mode === 'light') {
      dispatch(setDarkMode(false));
    } else if (mode === 'system') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      dispatch(setDarkMode(prefersDark));
    }
  };

  const handleDensityChange = (density) => {
    const updated = { ...settings, density };
    setSettings(updated);
    localStorage.setItem(CALENDAR_SETTINGS_KEY, JSON.stringify(updated));
    localStorage.setItem(CALENDAR_DENSITY_KEY, density);
    window.dispatchEvent(new CustomEvent('calendar-settings-changed', { detail: updated }));
    message.success(`Switched to ${density} view density`);
  };

  const handleAccentChange = (accentColor) => {
    const updated = { ...settings, accentColor };
    setSettings(updated);
    localStorage.setItem(CALENDAR_SETTINGS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('calendar-settings-changed', { detail: updated }));
    message.success('Accent color updated');
  };

  // Add-on install/configure handler
  const handleToggleAddon = (addonId) => {
    const updated = addonsList.map((a) => {
      if (a.id === addonId) {
        const nextState = !a.installed;
        message.info(`${a.name} is now ${nextState ? 'Installed & Active' : 'Uninstalled'}`);
        return { ...a, installed: nextState };
      }
      return a;
    });
    setAddonsList(updated);
    localStorage.setItem(CALENDAR_ADDONS_KEY, JSON.stringify(updated));
  };

  // Print execution handler
  const handleExecutePrint = () => {
    setIsPrintOpen(false);

    // Apply print-specific style attributes
    const styleEl = document.createElement('style');
    styleEl.id = 'rizviz-custom-print-style';
    styleEl.innerHTML = `
      @media print {
        @page {
          size: ${printOrientation};
          margin: 10mm;
        }
        body {
          background: #fff !important;
          color: #000 !important;
        }
        /* Hide app sidebars, top navbars, modal backdrops, and action buttons */
        header, .ant-layout-header, aside, .ant-layout-sider, button, .ant-btn,
        .ant-modal-root, .ant-message, [role="button"], .no-print {
          display: none !important;
        }
        /* Ensure calendar and print area fills entire printed page */
        #calendar-main-view, .calendar-printable-area {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          overflow: visible !important;
        }
        .printable-agenda-container {
          display: block !important;
        }
      }
    `;
    document.head.appendChild(styleEl);

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        const existing = document.getElementById('rizviz-custom-print-style');
        if (existing) existing.remove();
      }, 1000);
    }, 200);
  };

  // Filtered trash records
  const filteredTrash = useMemo(() => {
    if (!trashSearch.trim()) return trashList;
    const q = trashSearch.toLowerCase();
    return trashList.filter((item) => {
      const dev = (item.IntervieweeName || item.intervieweeName || '').toLowerCase();
      const comp = (item.CompanyName || item.companyName || '').toLowerCase();
      const stack = (item.Stack || item.stack || '').toLowerCase();
      const jh = (item.JobHunterName || item.jobHunterName || '').toLowerCase();
      return dev.includes(q) || comp.includes(q) || stack.includes(q) || jh.includes(q);
    });
  }, [trashList, trashSearch]);

  // Dropdown menu items matching user screenshot exactly
  const menuItems = [
    {
      key: 'settings',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 2px', fontSize: 14 }}>
          <SettingOutlined style={{ fontSize: 16 }} />
          <span>Settings</span>
        </div>
      ),
      onClick: () => {
        settingsForm.setFieldsValue({
          defaultView: settings.defaultView,
          weekStartsOn: settings.weekStartsOn,
          startHour: dayjs(settings.startHour, 'HH:mm'),
          endHour: dayjs(settings.endHour, 'HH:mm'),
          primaryTimezone: settings.primaryTimezone,
          secondaryTimezone: settings.secondaryTimezone,
          timeFormat: settings.timeFormat,
          soundAlerts: settings.soundAlerts,
          autoSyncInterval: settings.autoSyncInterval,
          showRecruiterAvatars: settings.showRecruiterAvatars,
          showRoundBadges: settings.showRoundBadges,
          showStackTags: settings.showStackTags,
        });
        setIsSettingsOpen(true);
      },
    },
    {
      key: 'trash',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px', fontSize: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <DeleteOutlined style={{ fontSize: 16 }} />
            <span>Trash</span>
          </div>
          {trashList.length > 0 && (
            <Badge count={trashList.length} size="small" style={{ backgroundColor: '#ef4444' }} />
          )}
        </div>
      ),
      onClick: () => setIsTrashOpen(true),
    },
    {
      type: 'divider',
    },
    {
      key: 'appearance',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 2px', fontSize: 14 }}>
          <BgColorsOutlined style={{ fontSize: 16 }} />
          <span>Appearance</span>
        </div>
      ),
      onClick: () => setIsAppearanceOpen(true),
    },
    {
      key: 'print',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 2px', fontSize: 14 }}>
          <PrinterOutlined style={{ fontSize: 16 }} />
          <span>Print</span>
        </div>
      ),
      onClick: () => setIsPrintOpen(true),
    },
    {
      type: 'divider',
    },
    {
      key: 'addons',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px', fontSize: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AppstoreAddOutlined style={{ fontSize: 16 }} />
            <span>Get add-ons</span>
          </div>
          <Tag color="purple" style={{ fontSize: 10, padding: '0 6px', lineHeight: '18px', margin: 0, borderRadius: 10 }}>
            New
          </Tag>
        </div>
      ),
      onClick: () => setIsAddonsOpen(true),
    },
  ];

  return (
    <>
      {/* ── Google Calendar Header Icons (Search, Help, Settings) ── */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? 3 : 6 }}>
        {/* Search Icon (Desktop only) */}
        {!compact && (
          <Tooltip title="Search interviews ( / )">
            <Button
              type="text"
              shape="circle"
              icon={<SearchOutlined style={{ fontSize: 17, color: isDarkMode ? '#cbd5e1' : '#475569' }} />}
              onClick={() => {
                if (onSearchFocus) onSearchFocus();
              }}
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          </Tooltip>
        )}

        {/* Support / Help Icon (Desktop only) */}
        {!compact && (
          <Tooltip title="Support & Keyboard Shortcuts">
            <Button
              type="text"
              shape="circle"
              icon={<QuestionCircleOutlined style={{ fontSize: 17, color: isDarkMode ? '#cbd5e1' : '#475569' }} />}
              onClick={() => setIsHelpOpen(true)}
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          </Tooltip>
        )}

        {/* Settings Gear Dropdown Button */}
        <Dropdown
          menu={{ items: menuItems }}
          trigger={['click']}
          placement="bottomRight"
          overlayStyle={{ minWidth: 210, zIndex: 1200 }}
        >
          <Tooltip title="Settings menu">
            <Button
              type="text"
              shape="circle"
              icon={<SettingOutlined style={{ fontSize: compact ? 15 : 18, color: isDarkMode ? '#cbd5e1' : '#475569' }} />}
              style={{
                width: compact ? 28 : 36,
                height: compact ? 28 : 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                transition: 'all 0.2s',
              }}
            />
          </Tooltip>
        </Dropdown>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          1. SETTINGS MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 6 }}>
            <SettingOutlined style={{ color: '#4f46e5', fontSize: 20 }} />
            <span style={{ fontSize: 17, fontWeight: 600 }}>Calendar & System Settings</span>
          </div>
        }
        open={isSettingsOpen}
        onCancel={() => setIsSettingsOpen(false)}
        footer={null}
        width={640}
        centered
        destroyOnClose
      >
        <Form
          form={settingsForm}
          layout="vertical"
          onFinish={handleSaveSettings}
          initialValues={{
            defaultView: settings.defaultView,
            weekStartsOn: settings.weekStartsOn,
            startHour: dayjs(settings.startHour, 'HH:mm'),
            endHour: dayjs(settings.endHour, 'HH:mm'),
            primaryTimezone: settings.primaryTimezone,
            secondaryTimezone: settings.secondaryTimezone,
            timeFormat: settings.timeFormat,
            soundAlerts: settings.soundAlerts,
            autoSyncInterval: settings.autoSyncInterval,
            showRecruiterAvatars: settings.showRecruiterAvatars,
            showRoundBadges: settings.showRoundBadges,
            showStackTags: settings.showStackTags,
          }}
        >
          <Tabs
            defaultActiveKey="view"
            items={[
              {
                key: 'view',
                label: 'View & Schedule',
                children: (
                  <div style={{ paddingTop: 8 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <Form.Item name="defaultView" label="Default Calendar View">
                        <Select
                          options={[
                            { value: 'day', label: '1 Day' },
                            { value: '2days', label: '2 Days' },
                            { value: '3days', label: '3 Days' },
                            { value: '4days', label: '4 Days' },
                            { value: '5days', label: '5 Days (Work week)' },
                            { value: 'week', label: '7 Days (Week)' },
                            { value: 'month', label: 'Month' },
                          ]}
                        />
                      </Form.Item>

                      <Form.Item name="weekStartsOn" label="Week Starts On">
                        <Select
                          options={[
                            { value: 'sunday', label: 'Sunday' },
                            { value: 'monday', label: 'Monday' },
                            { value: 'saturday', label: 'Saturday' },
                          ]}
                        />
                      </Form.Item>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <Form.Item name="startHour" label="Timeline Start Hour">
                        <TimePicker format="HH:mm" minuteStep={30} style={{ width: '100%' }} />
                      </Form.Item>

                      <Form.Item name="endHour" label="Timeline End Hour">
                        <TimePicker format="HH:mm" minuteStep={30} style={{ width: '100%' }} />
                      </Form.Item>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <Form.Item name="primaryTimezone" label="Primary Timezone">
                        <Select
                          options={[
                            { value: 'EST', label: 'EST / EDT (US Eastern - New York)' },
                            { value: 'PKT', label: 'PKT (Pakistan Standard Time)' },
                            { value: 'PST', label: 'PST / PDT (US Pacific - SF)' },
                            { value: 'CST', label: 'CST / CDT (US Central - Chicago)' },
                            { value: 'LOCAL', label: 'Browser Local Timezone' },
                          ]}
                        />
                      </Form.Item>

                      <Form.Item name="secondaryTimezone" label="Secondary Dual Timezone">
                        <Select
                          options={[
                            { value: 'PKT', label: 'PKT (Pakistan Standard Time)' },
                            { value: 'EST', label: 'EST / EDT (US Eastern)' },
                            { value: 'PST', label: 'PST / PDT (US Pacific)' },
                            { value: 'GMT', label: 'GMT / UTC' },
                          ]}
                        />
                      </Form.Item>
                    </div>

                    <Form.Item name="timeFormat" label="Time Display Format">
                      <Radio.Group>
                        <Radio value="12h">12-Hour (e.g. 1:00 PM)</Radio>
                        <Radio value="24h">24-Hour (e.g. 13:00)</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </div>
                ),
              },
              {
                key: 'display',
                label: 'Display & Chips',
                children: (
                  <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>Recruiter Color Avatars</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Show colorful recruiter badges on interview cards</div>
                      </div>
                      <Form.Item name="showRecruiterAvatars" valuePropName="checked" noStyle>
                        <Switch />
                      </Form.Item>
                    </div>
                    <Divider style={{ margin: '4px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>Round Badges</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Display ordinal round chips (1st, 2nd, Final round)</div>
                      </div>
                      <Form.Item name="showRoundBadges" valuePropName="checked" noStyle>
                        <Switch />
                      </Form.Item>
                    </div>
                    <Divider style={{ margin: '4px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>Tech Stack Tags</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Show React, .NET, DevOps tags directly on calendar pills</div>
                      </div>
                      <Form.Item name="showStackTags" valuePropName="checked" noStyle>
                        <Switch />
                      </Form.Item>
                    </div>
                  </div>
                ),
              },
              {
                key: 'alerts',
                label: 'Alerts & Sync',
                children: (
                  <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>Audio Notification Chimes</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Play soft synthetic chime when new interviews or updates arrive</div>
                      </div>
                      <Form.Item name="soundAlerts" valuePropName="checked" noStyle>
                        <Switch />
                      </Form.Item>
                    </div>
                    <Divider style={{ margin: '4px 0' }} />

                    <Form.Item name="autoSyncInterval" label="Real-time Synchronization Mode">
                      <Select
                        options={[
                          { value: 'realtime', label: 'SignalR Real-time WebSockets (Instant)' },
                          { value: '30s', label: 'Continuous Background Poll (Every 30s)' },
                          { value: '1m', label: 'Polling Every 1 Minute' },
                          { value: 'manual', label: 'Manual Refresh Only' },
                        ]}
                      />
                    </Form.Item>
                  </div>
                ),
              },
            ]}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
            <Button onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ backgroundColor: '#4f46e5' }}>
              Save Settings
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          2. TRASH MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DeleteOutlined style={{ color: '#ef4444', fontSize: 20 }} />
              <span style={{ fontSize: 17, fontWeight: 600 }}>Trash ({trashList.length})</span>
            </div>
            {trashList.length > 0 && (
              <Popconfirm
                title="Empty Trash"
                description="Are you sure you want to permanently delete all items in trash?"
                onConfirm={handleEmptyTrash}
                okText="Yes, Empty"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger icon={<ClearOutlined />}>
                  Empty Trash
                </Button>
              </Popconfirm>
            )}
          </div>
        }
        open={isTrashOpen}
        onCancel={() => setIsTrashOpen(false)}
        footer={null}
        width={720}
        centered
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search deleted interviews by candidate, stack, company..."
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            value={trashSearch}
            onChange={(e) => setTrashSearch(e.target.value)}
            allowClear
            style={{ borderRadius: 8 }}
          />
        </div>

        {filteredTrash.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
            <DeleteOutlined style={{ fontSize: 42, marginBottom: 12, opacity: 0.5 }} />
            <div style={{ fontSize: 16, fontWeight: 500, color: '#64748b' }}>Trash is empty</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
              When you delete or cancel interviews from the calendar, they will appear here so you can restore them anytime.
            </div>
          </div>
        ) : (
          <List
            dataSource={filteredTrash}
            style={{ maxHeight: 420, overflowY: 'auto' }}
            renderItem={(item) => {
              const devName = item.IntervieweeName || item.intervieweeName || 'Unknown Candidate';
              const comp = item.CompanyName || item.companyName || 'Unknown Company';
              const stack = item.Stack || item.stack || 'General';
              const jh = item.JobHunterName || item.jobHunterName || '';
              const dateVal = item.InterviewDate || item.interviewDate;

              return (
                <List.Item
                  key={item.trashId || item.Sr || item.sr}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    marginBottom: 8,
                    border: '1px solid #e2e8f0',
                    background: isDarkMode ? '#1e293b' : '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, paddingRight: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text strong style={{ fontSize: 15 }}>
                        {devName}
                      </Text>
                      <Tag color="blue">{stack}</Tag>
                      <Tag color="default">{comp}</Tag>
                      {jh && <Tag color="orange">JH: {jh}</Tag>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: 12, color: '#64748b' }}>
                      {dateVal && (
                        <span>
                          📅 Scheduled: <strong>{dayjs(dateVal).format('DD MMM YYYY, hh:mm A')}</strong>
                        </span>
                      )}
                      <span>
                        🗑️ Trashed: <em>{dayjs(item.deletedAt).format('MMM D, hh:mm A')}</em>
                      </span>
                    </div>
                  </div>

                  <Space>
                    <Tooltip title="Restore interview back to calendar">
                      <Button
                        type="primary"
                        size="small"
                        icon={<UndoOutlined />}
                        style={{ backgroundColor: '#10b981' }}
                        onClick={() => handleRestoreItem(item)}
                      >
                        Restore
                      </Button>
                    </Tooltip>

                    <Popconfirm
                      title="Delete Permanently"
                      description="Delete this interview permanently? This cannot be undone."
                      onConfirm={() => handlePermanentDeleteItem(item.trashId)}
                      okText="Delete"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                    >
                      <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                </List.Item>
              );
            }}
          />
        )}
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          3. APPEARANCE MODAL (Density & Colors)
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 6 }}>
            <BgColorsOutlined style={{ color: '#4f46e5', fontSize: 20 }} />
            <span style={{ fontSize: 17, fontWeight: 600 }}>Appearance & Density</span>
          </div>
        }
        open={isAppearanceOpen}
        onCancel={() => setIsAppearanceOpen(false)}
        footer={[
          <Button key="done" type="primary" onClick={() => setIsAppearanceOpen(false)} style={{ backgroundColor: '#4f46e5' }}>
            Done
          </Button>,
        ]}
        width={540}
        centered
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingTop: 8 }}>
          {/* Theme Selector */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
              Theme Mode
            </Text>
            <Radio.Group
              value={isDarkMode ? 'dark' : 'light'}
              onChange={(e) => handleThemeChange(e.target.value)}
              buttonStyle="solid"
              style={{ display: 'flex', width: '100%' }}
            >
              <Radio.Button value="light" style={{ flex: 1, textAlign: 'center', height: 42, lineHeight: '40px' }}>
                ☀️ Light Mode
              </Radio.Button>
              <Radio.Button value="dark" style={{ flex: 1, textAlign: 'center', height: 42, lineHeight: '40px' }}>
                🌙 Dark Mode
              </Radio.Button>
              <Radio.Button value="system" style={{ flex: 1, textAlign: 'center', height: 42, lineHeight: '40px' }}>
                💻 Device System
              </Radio.Button>
            </Radio.Group>
          </div>

          {/* Density Selector */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
              Information Density
            </Text>
            <Text type="secondary" style={{ display: 'block', marginBottom: 10, fontSize: 12 }}>
              Controls chip padding, font sizing, and row height across calendar views.
            </Text>
            <Radio.Group
              value={settings.density || 'comfortable'}
              onChange={(e) => handleDensityChange(e.target.value)}
              style={{ display: 'flex', gap: 12 }}
            >
              <Card
                hoverable
                style={{
                  flex: 1,
                  borderRadius: 10,
                  cursor: 'pointer',
                  borderColor: (settings.density || 'comfortable') === 'comfortable' ? '#4f46e5' : undefined,
                  borderWidth: (settings.density || 'comfortable') === 'comfortable' ? 2 : 1,
                }}
                bodyStyle={{ padding: 14 }}
                onClick={() => handleDensityChange('comfortable')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text strong>Comfortable</Text>
                  {(settings.density || 'comfortable') === 'comfortable' && <CheckCircleOutlined style={{ color: '#4f46e5' }} />}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Spacious event cards, generous padding, best for high-res monitors.
                </div>
              </Card>

              <Card
                hoverable
                style={{
                  flex: 1,
                  borderRadius: 10,
                  cursor: 'pointer',
                  borderColor: settings.density === 'compact' ? '#4f46e5' : undefined,
                  borderWidth: settings.density === 'compact' ? 2 : 1,
                }}
                bodyStyle={{ padding: 14 }}
                onClick={() => handleDensityChange('compact')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text strong>Compact</Text>
                  {settings.density === 'compact' && <CheckCircleOutlined style={{ color: '#4f46e5' }} />}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Condensed row heights, smaller chips, fits more events per screen.
                </div>
              </Card>
            </Radio.Group>
          </div>

          {/* Calendar Accent Color */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
              Calendar Accent Theme
            </Text>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { name: 'Indigo', color: '#4f46e5' },
                { name: 'Emerald', color: '#10b981' },
                { name: 'Ocean', color: '#0284c7' },
                { name: 'Purple', color: '#7c3aed' },
                { name: 'Rose', color: '#e11d48' },
                { name: 'Amber', color: '#d97706' },
              ].map((c) => {
                const isSelected = settings.accentColor === c.color;
                return (
                  <div
                    key={c.color}
                    onClick={() => handleAccentChange(c.color)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      backgroundColor: c.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      border: isSelected ? '3px solid #fff' : 'none',
                      boxShadow: isSelected ? `0 0 0 2px ${c.color}` : 'none',
                      transition: 'transform 0.15s',
                    }}
                    title={c.name}
                  >
                    {isSelected && <CheckOutlined style={{ color: '#fff', fontSize: 16 }} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Live Preview Box */}
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: isDarkMode ? '#0f172a' : '#f1f5f9',
              border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>
              LIVE PREVIEW:
            </div>
            <div
              style={{
                backgroundColor: settings.accentColor || '#4f46e5',
                color: '#fff',
                borderRadius: 8,
                padding: settings.density === 'compact' ? '4px 8px' : '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: settings.density === 'compact' ? 12 : 14 }}>
                  Mollay Alex (React / .NET)
                </span>
                <Tag color="cyan" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}>
                  1st Round
                </Tag>
              </div>
              <span style={{ fontSize: 12, opacity: 0.9 }}>10:00 AM – 11:00 AM</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          4. PRINT SETUP MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 6 }}>
            <PrinterOutlined style={{ color: '#4f46e5', fontSize: 20 }} />
            <span style={{ fontSize: 17, fontWeight: 600 }}>Print Calendar Schedule</span>
          </div>
        }
        open={isPrintOpen}
        onCancel={() => setIsPrintOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsPrintOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handleExecutePrint}
            style={{ backgroundColor: '#4f46e5' }}
          >
            Print Now
          </Button>,
        ]}
        width={560}
        centered
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 8 }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Print Layout
            </Text>
            <Radio.Group
              value={printType}
              onChange={(e) => setPrintType(e.target.value)}
              buttonStyle="solid"
              style={{ display: 'flex', width: '100%' }}
            >
              <Radio.Button value="grid" style={{ flex: 1, textAlign: 'center' }}>
                📅 Visual Calendar Grid
              </Radio.Button>
              <Radio.Button value="agenda" style={{ flex: 1, textAlign: 'center' }}>
                📋 Schedule Agenda List
              </Radio.Button>
            </Radio.Group>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Page Orientation
              </Text>
              <Select
                value={printOrientation}
                onChange={setPrintOrientation}
                style={{ width: '100%' }}
                options={[
                  { value: 'landscape', label: 'Landscape (Recommended for Week/Month)' },
                  { value: 'portrait', label: 'Portrait (Standard Paper)' },
                ]}
              />
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Date Range
              </Text>
              <Select
                value={printRange}
                onChange={setPrintRange}
                style={{ width: '100%' }}
                options={[
                  { value: 'today', label: `Today (${selectedDay.format('MMM D')})` },
                  { value: 'week', label: 'Current Week Schedule' },
                  { value: 'month', label: `Entire Month (${selectedDay.format('MMMM YYYY')})` },
                ]}
              />
            </div>
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 8,
              background: isDarkMode ? '#1e293b' : '#f8fafc',
              border: '1px solid #e2e8f0',
              fontSize: 13,
              color: '#64748b',
            }}
          >
            💡 <strong>Printer Tip:</strong> Browser navigation buttons, sidebar menus, and headers are automatically hidden during printing for a clean paper presentation.
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          5. GET ADD-ONS MODAL (Marketplace)
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AppstoreAddOutlined style={{ color: '#8b5cf6', fontSize: 22 }} />
              <span style={{ fontSize: 17, fontWeight: 600 }}>Rizviz Calendar Add-ons & Integrations</span>
            </div>
            <Tag color="purple">Workspace Integrations</Tag>
          </div>
        }
        open={isAddonsOpen}
        onCancel={() => setIsAddonsOpen(false)}
        footer={null}
        width={760}
        centered
        destroyOnClose
      >
        <div style={{ maxHeight: 520, overflowY: 'auto', paddingRight: 6 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
            {addonsList.map((addon) => (
              <Card
                key={addon.id}
                style={{
                  borderRadius: 12,
                  borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                  background: isDarkMode ? '#1e293b' : '#ffffff',
                }}
                bodyStyle={{ padding: '16px 20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 24,
                        flexShrink: 0,
                      }}
                    >
                      {addon.icon}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 16 }}>{addon.name}</span>
                        <Tag color="cyan">{addon.category}</Tag>
                        <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>⭐ {addon.rating}</span>
                      </div>

                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        By {addon.developer} • {addon.installs} active users
                      </div>

                      <Paragraph style={{ fontSize: 13, color: isDarkMode ? '#cbd5e1' : '#475569', marginTop: 6, marginBottom: 0 }}>
                        {addon.description}
                      </Paragraph>
                    </div>
                  </div>

                  <Space direction="vertical" align="end" style={{ flexShrink: 0 }}>
                    <Button
                      type={addon.installed ? 'default' : 'primary'}
                      style={{
                        backgroundColor: addon.installed ? undefined : '#4f46e5',
                        borderColor: addon.installed ? '#10b981' : undefined,
                        color: addon.installed ? '#10b981' : undefined,
                        fontWeight: 600,
                        minWidth: 100,
                      }}
                      onClick={() => handleToggleAddon(addon.id)}
                    >
                      {addon.installed ? 'Installed ✓' : 'Install'}
                    </Button>

                    {addon.installed && (
                      <Button
                        size="small"
                        type="link"
                        style={{ padding: 0 }}
                        onClick={() => {
                          setConfiguredAddon(addon);
                          addonConfigForm.setFieldsValue(addon.config || {});
                        }}
                      >
                        Configure ⚙️
                      </Button>
                    )}
                  </Space>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Modal>

      {/* ── Add-on Configuration Sub-Modal ── */}
      <Modal
        title={`Configure ${configuredAddon?.name}`}
        open={!!configuredAddon}
        onCancel={() => setConfiguredAddon(null)}
        onOk={() => {
          message.success(`${configuredAddon?.name} configuration saved!`);
          setConfiguredAddon(null);
        }}
        okText="Save Integration"
        centered
      >
        <Form form={addonConfigForm} layout="vertical" style={{ marginTop: 16 }}>
          {configuredAddon?.fields?.map((f) => (
            <Form.Item key={f.key} name={f.key} label={f.label}>
              {f.type === 'boolean' ? <Switch defaultChecked={f.defaultValue} /> : <Input placeholder={f.placeholder} />}
            </Form.Item>
          ))}
        </Form>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          6. HELP & SHORTCUTS MODAL (?)
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 6 }}>
            <QuestionCircleOutlined style={{ color: '#4f46e5', fontSize: 20 }} />
            <span style={{ fontSize: 17, fontWeight: 600 }}>Help & Keyboard Shortcuts</span>
          </div>
        }
        open={isHelpOpen}
        onCancel={() => setIsHelpOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsHelpOpen(false)} style={{ backgroundColor: '#4f46e5' }}>
            Got it
          </Button>,
        ]}
        width={600}
        centered
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 6 }}>
          <div>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
              ⌨️ Keyboard Shortcuts
            </Text>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                background: isDarkMode ? '#1e293b' : '#f8fafc',
                padding: 12,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
            >
              {[
                { key: 'T', desc: 'Jump to Today' },
                { key: '1 – 6', desc: 'Switch Day View (1 to 6 days)' },
                { key: 'W', desc: 'Week view (7 days)' },
                { key: 'M', desc: 'Month view' },
                { key: '/', desc: 'Quick search interviews' },
                { key: 'Ctrl + P', desc: 'Print calendar schedule' },
                { key: 'Delete', desc: 'Move interview to Trash' },
                { key: 'Esc', desc: 'Close any active modal' },
              ].map((s) => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px' }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>{s.desc}</span>
                  <Tag style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.key}</Tag>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
              🎨 Status Badges & Color Codes
            </Text>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Tag color="blue">Scheduled</Tag>
              <Tag color="green">Done / Completed</Tag>
              <Tag color="orange">Pending Request</Tag>
              <Tag color="red">Cancelled / Trashed</Tag>
              <Tag color="purple">Unavailable Slot</Tag>
            </div>
          </div>

          <div>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 4 }}>
              💡 Quick Tips
            </Text>
            <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
              <li>Click anywhere on a timeline slot to quickly schedule an interview.</li>
              <li>Mark developer unavailability to alert recruiters in real-time via SignalR.</li>
              <li>Deleted interviews remain in <strong>Trash</strong> where you can restore them at any time.</li>
            </ul>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CalendarSettingsMenu;

import React from 'react';
import { Row, Col, Typography, Spin } from 'antd';
import {
  FilterOutlined, ScheduleOutlined, CloseCircleOutlined, LockOutlined,
  CalendarOutlined, InfoCircleOutlined, WarningOutlined, TrophyOutlined
} from '@ant-design/icons';
import StatCard from '../StatCard';
import { STATUS_PILL_COLORS } from '../../utils/interviewStatusUtils';

const { Text } = Typography;
const STATUS_CARD_HEIGHT = 90;

const getPalette = (status) => {
  const key = String(status || '').trim().toLowerCase();
  return STATUS_PILL_COLORS[key] || STATUS_PILL_COLORS.default;
};

const getStatusIcon = (status) => {
  const s = String(status || '').trim().toLowerCase();
  if (s === 'rejected') return <CloseCircleOutlined />;
  if (s === 'closed') return <LockOutlined />;
  if (s === 'dropped') return <InfoCircleOutlined />;
  if (s.includes('change') || s === 'date changed' || s === 'datechanged') return <CalendarOutlined />;
  if (s.includes('reschedule')) return <ScheduleOutlined />;
  if (s === 'dead') return <WarningOutlined />;
  if (s === 'converted' || s === 'shortlisted' || s === 'hired') return <TrophyOutlined />;
  if (s === 'scheduled') return <CalendarOutlined />;
  return <FilterOutlined />;
};

const InterviewStatusOverview = ({
  breakdown = [],
  totalRows = 0,
  selectedStatuses = [],
  onToggle,
  onTotalClick,
  totalActive = false,
  loading = false,
  scopeLabel,
  hideTotal = false,
  singleLine = false,
}) => {
  const handleToggle = (status) => {
    if (typeof onToggle === 'function') onToggle(status);
  };

  const hasActiveFilter = selectedStatuses.length > 0;

  const totalCard = (
    <StatCard
      label="TOTAL INTERVIEWS"
      value={totalRows}
      icon={<ScheduleOutlined />}
      cardBg="#f5f3ff"
      iconBg="#6d28d9"
      colProps={{ span: 24 }}
      onClick={onTotalClick}
      active={totalActive}
      dimmed={hasActiveFilter && !totalActive}
      cardStyle={{ minHeight: STATUS_CARD_HEIGHT }}
      size="small"
    />
  );

  return (
    <div className="space-y-1">
      {scopeLabel && (
        <Text type="secondary" className="text-xs block">{scopeLabel}</Text>
      )}

      {loading && breakdown.length === 0 ? (
        <div className="flex justify-center py-6">
          <Spin />
        </div>
      ) : breakdown.length === 0 ? (
        <Row gutter={[8, 8]} align="stretch">
          {!hideTotal && (
            <Col xs={24} sm={12} md={6}>
              {totalCard}
            </Col>
          )}
          <Col xs={24} sm={12} md={hideTotal ? 24 : 18}>
            <div className="h-full rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 px-4 py-6 text-center flex items-center justify-center">
              <Text type="secondary">No status values yet — refresh from Excel on the Interviews page.</Text>
            </div>
          </Col>
        </Row>
      ) : singleLine ? (
        <div className="flex flex-row flex-nowrap gap-2 w-full overflow-x-auto pb-1.5 scrollbar-thin">
          {!hideTotal && (
            <div className="flex-[1.5] min-w-[140px]">
              {totalCard}
            </div>
          )}

          {breakdown.map(({ status, count }) => {
            const active = selectedStatuses.some(
              (s) => s.toLowerCase() === status.toLowerCase()
            );
            const palette = getPalette(status);
            const dimmed = hasActiveFilter && !active;

            return (
              <div key={status} className="flex-1 min-w-[95px]">
                <StatCard
                  label={status.toUpperCase()}
                  value={count}
                  icon={getStatusIcon(status)}
                  cardBg={palette.bg}
                  iconBg={palette.text}
                  colProps={{ span: 24 }}
                  onClick={() => handleToggle(status)}
                  active={active}
                  dimmed={dimmed}
                  cardStyle={{ minHeight: STATUS_CARD_HEIGHT }}
                  size="small"
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
          {!hideTotal && (
            <div style={{ flex: '1 1 120px', minWidth: '100px' }}>
              {totalCard}
            </div>
          )}

          {breakdown.map(({ status, count }) => {
            const active = selectedStatuses.some(
              (s) => s.toLowerCase() === status.toLowerCase()
            );
            const palette = getPalette(status);
            const dimmed = hasActiveFilter && !active;

            return (
              <div key={status} style={{ flex: '1 1 120px', minWidth: '100px' }}>
                <StatCard
                  label={status.toUpperCase()}
                  value={count}
                  icon={getStatusIcon(status)}
                  cardBg={palette.bg}
                  iconBg={palette.text}
                  colProps={{ span: 24 }}
                  onClick={() => handleToggle(status)}
                  active={active}
                  dimmed={dimmed}
                  cardStyle={{ minHeight: STATUS_CARD_HEIGHT }}
                  size="small"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InterviewStatusOverview;

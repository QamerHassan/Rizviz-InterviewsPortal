import React from 'react';
import { Tag } from 'antd';
import { STATUS_PILL_COLORS } from '../../utils/interviewStatusUtils';

const InterviewStatusBadge = ({ status }) => {
  const label = status || 'Scheduled';
  const key = String(label).trim().toLowerCase();
  const style = STATUS_PILL_COLORS[key] || STATUS_PILL_COLORS.default;
  
  return (
    <Tag 
      style={{ 
        backgroundColor: style.bg, 
        color: style.text, 
        borderColor: style.border,
        fontWeight: 600,
        borderRadius: '6px',
        padding: '2px 8px'
      }} 
      className="m-0"
    >
      {label}
    </Tag>
  );
};

export default InterviewStatusBadge;

import React from 'react';
import './PageHeader.css';

export default function PageHeader({ icon: Icon, title, subtitle, iconColor }) {
  return (
    <div className="page-header">
      <div className="page-header-icon" style={{ background: `${iconColor || 'var(--red-primary)'}22`, border: `1px solid ${iconColor || 'var(--red-primary)'}44` }}>
        <Icon size={20} style={{ color: iconColor || 'var(--red-primary)' }} />
      </div>
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}

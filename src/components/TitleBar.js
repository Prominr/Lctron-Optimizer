import React from 'react';
import { Minus, Square, X, Zap } from 'lucide-react';
import './TitleBar.css';

export default function TitleBar() {
  const minimize = () => window.electronAPI?.minimizeWindow();
  const maximize = () => window.electronAPI?.maximizeWindow();
  const close = () => window.electronAPI?.closeWindow();

  return (
    <div className="titlebar drag-region">
      <div className="titlebar-left no-drag">
        <div className="titlebar-logo">
          <Zap size={16} className="logo-icon" />
          <span className="logo-text">Lctron</span>
        </div>
      </div>
      <div className="titlebar-center drag-region">
        <span className="titlebar-title">OPTIMIZER</span>
      </div>
      <div className="titlebar-controls no-drag">
        <button className="ctrl-btn minimize" onClick={minimize}>
          <Minus size={12} />
        </button>
        <button className="ctrl-btn maximize" onClick={maximize}>
          <Square size={11} />
        </button>
        <button className="ctrl-btn close" onClick={close}>
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

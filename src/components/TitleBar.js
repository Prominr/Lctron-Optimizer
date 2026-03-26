import React from 'react';
import { Minus, Square, X } from 'lucide-react';
import './TitleBar.css';

export default function TitleBar() {
  const minimize = () => window.electronAPI?.minimizeWindow();
  const maximize = () => window.electronAPI?.maximizeWindow();
  const close = () => window.electronAPI?.closeWindow();

  return (
    <div className="titlebar drag-region">
      <div className="titlebar-left no-drag">
        <div className="titlebar-logo">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="18" height="18" style={{flexShrink:0}} className="logo-icon">
            <rect width="256" height="256" fill="#0a0a0a"/>
            <rect x="124" y="48" width="8" height="120" fill="#ff2020"/>
            <polygon points="132,52 132,148 210,148" fill="#ff2020"/>
            <polygon points="128,56 128,140 80,140" fill="#8b0000"/>
            <polygon points="72,148 184,148 196,172 60,172" fill="#ff2020"/>
            <path d="M0,195 Q20,182 40,195 Q60,208 80,195 Q100,182 120,195 Q140,208 160,195 Q180,182 200,195 Q220,208 240,195 Q248,191 256,195" stroke="#ff2020" strokeWidth="3.5" fill="none"/>
            <path d="M0,210 Q20,197 40,210 Q60,223 80,210 Q100,197 120,210 Q140,223 160,210 Q180,197 200,210 Q220,223 240,210 Q248,206 256,210" stroke="#ff2020" strokeWidth="3.5" fill="none"/>
          </svg>
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

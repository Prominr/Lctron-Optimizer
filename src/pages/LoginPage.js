import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Loader, Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import './LoginPage.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isValidEmail(email) {
  return EMAIL_RE.test(email.trim());
}

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('signin'); // signin | signup
  const [status, setStatus] = useState('idle'); // idle | waiting | loading | error
  const [errorMsg, setErrorMsg] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return;
    const unsub = window.electronAPI.onGoogleLoginResult((result) => {
      if (result.success) {
        onLogin(result.user);
      } else {
        setStatus('error');
        setErrorMsg(result.error || 'Google sign-in failed. Please try again.');
      }
    });
    return () => { if (unsub) unsub(); };
  }, [onLogin]);

  const resetFields = () => { setName(''); setEmail(''); setPassword(''); setErrorMsg(''); setStatus('idle'); };
  const switchMode = (m) => { setMode(m); resetFields(); };

  const handleGoogleLogin = () => {
    setStatus('waiting');
    setErrorMsg('');
    if (window.electronAPI) {
      window.electronAPI.startGoogleLogin();
    } else {
      setTimeout(() => onLogin({ name: 'Dev User', email: 'dev@lctron.app', picture: null }), 1200);
    }
  };

  const handleEmailAuth = async () => {
    setErrorMsg('');
    if (!isValidEmail(email)) { setErrorMsg('Please enter a valid email address.'); return; }
    if (password.length < 6) { setErrorMsg('Password must be at least 6 characters.'); return; }
    if (mode === 'signup' && name.trim().length < 2) { setErrorMsg('Please enter your name.'); return; }
    setStatus('loading');
    try {
      let result;
      if (window.electronAPI) {
        result = mode === 'signup'
          ? await window.electronAPI.emailRegister(name.trim(), email.trim(), password)
          : await window.electronAPI.emailLogin(email.trim(), password);
      } else {
        result = { success: true, user: { name: name || 'Dev User', email, picture: null } };
      }
      if (result.success) {
        onLogin(result.user);
      } else {
        setStatus('error');
        setErrorMsg(result.error || 'Authentication failed.');
      }
    } catch (e) {
      setStatus('error');
      setErrorMsg(e.message || 'An error occurred.');
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleEmailAuth(); };
  const isLoading = status === 'loading';

  return (
    <div className="login-page">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        <div className="login-brand">
          <div className="login-logo"><Zap size={28} style={{ color: '#e03030' }} /></div>
          <span className="login-brand-name">Lctron</span>
          <span className="login-brand-tag">Optimizer</span>
        </div>

        <div className="login-divider" />

        <div className="login-body">
          <div className="login-tabs">
            <button className={`login-tab ${mode === 'signin' ? 'active' : ''}`} onClick={() => switchMode('signin')}>Sign In</button>
            <button className={`login-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => switchMode('signup')}>Sign Up</button>
          </div>

          <AnimatePresence mode="wait">
            {status === 'waiting' ? (
              <motion.div key="waiting" className="login-waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Loader size={18} className="login-spin" />
                <span>Waiting for Google sign-in...</span>
                <p className="login-waiting-sub">Complete sign-in in your browser, then return here.</p>
                <button className="login-cancel" onClick={() => setStatus('idle')}>Cancel</button>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="login-form-wrap">
                {errorMsg && <div className="login-error">{errorMsg}</div>}

                <div className="login-fields">
                  {mode === 'signup' && (
                    <div className="login-field">
                      <User size={14} className="login-field-icon" />
                      <input className="login-input" type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} onKeyDown={handleKeyDown} autoComplete="name" disabled={isLoading} />
                    </div>
                  )}
                  <div className="login-field">
                    <Mail size={14} className="login-field-icon" />
                    <input className={`login-input ${email && !isValidEmail(email) ? 'invalid' : ''}`} type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKeyDown} autoComplete="email" disabled={isLoading} />
                  </div>
                  <div className="login-field">
                    <Lock size={14} className="login-field-icon" />
                    <input className="login-input" type={showPass ? 'text' : 'password'} placeholder={mode === 'signup' ? 'Create password (min 6 chars)' : 'Password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyDown} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} disabled={isLoading} />
                    <button className="login-eye" onClick={() => setShowPass(p => !p)} tabIndex={-1}>
                      {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                <button className="login-email-btn" onClick={handleEmailAuth} disabled={isLoading}>
                  {isLoading
                    ? <><Loader size={14} className="login-spin" /> {mode === 'signin' ? 'Signing in...' : 'Creating account...'}</>
                    : (mode === 'signin' ? 'Sign in' : 'Create account')}
                </button>

                <div className="login-or"><span>or</span></div>

                <button className="login-google-btn" onClick={handleGoogleLogin} disabled={isLoading}>
                  <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  {mode === 'signin' ? 'Continue with Google' : 'Sign up with Google'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="login-footer">Your data stays on your device. Credentials are stored locally and encrypted.</p>
      </motion.div>
    </div>
  );
}

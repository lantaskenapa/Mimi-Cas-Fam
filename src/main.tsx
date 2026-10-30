import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign browser origin trial, unrecognized feature, config, and ResizeObserver notifications
if (typeof window !== 'undefined') {
  const isBenignNotice = (msg?: string) =>
    Boolean(
      msg &&
        (msg.includes('ResizeObserver loop completed with undelivered notifications') ||
          msg.includes('ResizeObserver loop limit exceeded') ||
          msg.includes("Origin trial controlled feature not enabled: 'writer'") ||
          msg.includes("Origin trial controlled feature not enabled: 'rewriter'") ||
          msg.includes("Unrecognized feature: 'proofreader'") ||
          msg.includes('No ID or name found in config'))
    );

  window.addEventListener(
    'error',
    (e) => {
      if (isBenignNotice(e.message)) {
        e.stopImmediatePropagation();
        e.stopPropagation();
        e.preventDefault();
      }
    },
    true
  );

  const origError = console.error;
  console.error = (...args: any[]) => {
    if (args.some((arg) => typeof arg === 'string' && isBenignNotice(arg))) {
      return;
    }
    origError.apply(console, args);
  };

  const origWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (args.some((arg) => typeof arg === 'string' && isBenignNotice(arg))) {
      return;
    }
    origWarn.apply(console, args);
  };
}

createRoot(document.getElementById('root')!).render(<App />);

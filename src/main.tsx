import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign browser ResizeObserver loop undelivered notifications
if (typeof window !== 'undefined') {
  const isResizeObserverError = (msg?: string) =>
    Boolean(
      msg &&
        (msg.includes('ResizeObserver loop completed with undelivered notifications') ||
          msg.includes('ResizeObserver loop limit exceeded'))
    );

  window.addEventListener(
    'error',
    (e) => {
      if (isResizeObserverError(e.message)) {
        e.stopImmediatePropagation();
        e.stopPropagation();
        e.preventDefault();
      }
    },
    true
  );

  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    if (args.some((arg) => typeof arg === 'string' && isResizeObserverError(arg))) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

createRoot(document.getElementById('root')!).render(<App />);

import { useCallback, useEffect, useRef, useState } from 'react';

export default function DismissiblePanel({ as: Element = 'section', noticeKey, onClose, autoClose = 10000, children, className = '', ...props }) {
  const [dismissed, setDismissed] = useState(() => Symbol('visible'));
  const timer = useRef(null);
  const closeHandler = useRef(onClose);
  const panel = useRef(null);
  useEffect(() => { closeHandler.current = onClose; }, [onClose]);
  const close = useCallback(() => {
    clearTimeout(timer.current);
    setDismissed(noticeKey);
    closeHandler.current?.();
  }, [noticeKey]);
  const startTimer = useCallback(() => {
    clearTimeout(timer.current);
    if (autoClose > 0) timer.current = setTimeout(close, autoClose);
  }, [autoClose, close]);
  useEffect(() => {
    if (!panel.current?.contains(document.activeElement)) startTimer();
    return () => clearTimeout(timer.current);
  }, [startTimer]);
  if (dismissed === noticeKey) return null;
  return <Element {...props} ref={panel} className={`${className} dismissible-panel`} onFocusCapture={() => clearTimeout(timer.current)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) startTimer(); }}>
    <button type="button" className="notice-close" aria-label="Cerrar aviso" title="Cerrar aviso" onClick={close}>×</button>
    {children}
  </Element>;
}

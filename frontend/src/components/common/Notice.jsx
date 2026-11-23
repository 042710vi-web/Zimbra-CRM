import { formatMoneyInText } from '../../utils/formatters.js';
import DismissiblePanel from './DismissiblePanel.jsx';

export default function Notice({ notice, noticeKey = notice }) {
  if (!notice) return null;
  return <DismissiblePanel as="div" noticeKey={noticeKey} className={`notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{formatMoneyInText(notice.text)}</DismissiblePanel>;
}

import { useState } from 'react';
import { Copy, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '../context/ToastContext';

/** Meeting code + copy link + WhatsApp + QR code (scan with a phone to join). */
export default function InviteShare({ roomId, title = 'my meeting' }) {
  const toast = useToast();
  const [showQr, setShowQr] = useState(false);
  const link = `${window.location.origin}/room/${roomId}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast('Invite link copied');
    } catch {
      toast(`Share this code: ${roomId}`);
    }
  };

  return (
    <div className="invite">
      <div className="invite-box">
        <code>{roomId}</code>
        <button type="button" className="btn btn-ghost" onClick={copy}>
          <Copy size={16} /> Copy link
        </button>
        <a
          className="btn btn-ghost"
          target="_blank"
          rel="noreferrer"
          href={`https://wa.me/?text=${encodeURIComponent(`Join "${title}" on Huddle: ${link}`)}`}
        >
          WhatsApp
        </a>
        <button type="button" className="btn btn-ghost" onClick={() => setShowQr((v) => !v)} aria-expanded={showQr}>
          <QrCode size={16} /> {showQr ? 'Hide QR' : 'QR code'}
        </button>
      </div>
      {showQr && (
        <div className="qr">
          <QRCodeSVG value={link} size={168} bgColor="#ffffff" fgColor="#0e1a2b" marginSize={2} />
          <p className="muted">Scan with a phone camera to join.</p>
        </div>
      )}
    </div>
  );
}

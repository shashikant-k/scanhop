import { QRCodeSVG } from 'qrcode.react';
import { planQr } from '@/src/core/qr';
import styles from './App.module.css';

/** On-screen size of the QR code in CSS pixels. Dense codes get more room. */
const SIZE = { normal: 240, dense: 420 } as const;

/** Blank border around the code, in QR squares. Scanners need at least 4. */
const QUIET_ZONE = 4;

interface QrCardProps {
  /** The exact text the QR code carries. */
  url: string;
}

export function QrCard({ url }: QrCardProps) {
  const plan = planQr(url);

  if (!plan.ok) {
    return (
      <p className={styles.message} role="alert">
        This address is too long to fit in a QR code ({plan.bytes.toLocaleString()} bytes; the limit
        is {plan.maxBytes.toLocaleString()}).
      </p>
    );
  }

  return (
    // Always black on white, whatever the theme: inverted codes scan poorly.
    <div className={styles.qr}>
      <QRCodeSVG
        value={url}
        level={plan.level}
        size={plan.dense ? SIZE.dense : SIZE.normal}
        marginSize={QUIET_ZONE}
        bgColor="#ffffff"
        fgColor="#000000"
        title={`QR code for ${url}`}
      />
    </div>
  );
}

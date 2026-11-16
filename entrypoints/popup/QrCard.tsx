import type { Ref } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QUIET_ZONE, qrPixelSize, type ErrorCorrectionLevel } from '@/src/core/qr';
import styles from './App.module.css';

interface QrCardProps {
  /** The exact text the QR code carries. */
  url: string;
  level: ErrorCorrectionLevel;
  /** Squares along one side of the code, from `planQr`. */
  modules: number;
  /** Gives access to the drawn SVG, used to save it as an image. */
  ref?: Ref<SVGSVGElement>;
}

export function QrCard({ url, level, modules, ref }: QrCardProps) {
  return (
    // Always black on white, whatever the theme: inverted codes scan poorly.
    <div className={styles.qr}>
      <QRCodeSVG
        ref={ref}
        value={url}
        level={level}
        size={qrPixelSize(modules)}
        marginSize={QUIET_ZONE}
        bgColor="#ffffff"
        fgColor="#000000"
        title={`QR code for ${url}`}
      />
    </div>
  );
}

import type { Ref } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { ErrorCorrectionLevel } from '@/src/core/qr';
import styles from './App.module.css';

/** On-screen size of the QR code in CSS pixels. Dense codes get more room. */
const SIZE = { normal: 240, dense: 420 } as const;

/** Blank border around the code, in QR squares. Scanners need at least 4. */
const QUIET_ZONE = 4;

interface QrCardProps {
  /** The exact text the QR code carries. */
  url: string;
  level: ErrorCorrectionLevel;
  /** Draw the code larger because it has many small squares. */
  dense: boolean;
  /** Gives access to the drawn SVG, used to save it as an image. */
  ref?: Ref<SVGSVGElement>;
}

export function QrCard({ url, level, dense, ref }: QrCardProps) {
  return (
    // Always black on white, whatever the theme: inverted codes scan poorly.
    <div className={styles.qr}>
      <QRCodeSVG
        ref={ref}
        value={url}
        level={level}
        size={dense ? SIZE.dense : SIZE.normal}
        marginSize={QUIET_ZONE}
        bgColor="#ffffff"
        fgColor="#000000"
        title={`QR code for ${url}`}
      />
    </div>
  );
}

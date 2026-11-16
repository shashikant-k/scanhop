import { useEffect, useState, type RefObject } from 'react';
import { pngFileName, saveBlob, svgToPngBlob } from './exportPng';
import styles from './App.module.css';

/** How long "Copied" and error notes stay on screen. */
const FEEDBACK_MS = 2000;

interface ActionsProps {
  /** The link the QR code carries. */
  url: string;
  /** The QR code currently on screen. */
  qrRef: RefObject<SVGSVGElement | null>;
}

export function Actions({ url, qrRef }: ActionsProps) {
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(''), FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [feedback]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setFeedback('Link copied');
    } catch {
      setFeedback('Could not copy the link');
    }
  }

  async function saveImage() {
    try {
      if (!qrRef.current) throw new Error('No QR code on screen');
      saveBlob(await svgToPngBlob(qrRef.current), pngFileName(url));
      setFeedback('Image saved');
    } catch {
      setFeedback('Could not save the image');
    }
  }

  return (
    <>
      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={copyLink}>
          Copy link
        </button>
        <button type="button" className={styles.button} onClick={saveImage}>
          Save QR image
        </button>
      </div>
      {/* Always present so screen readers announce changes. */}
      <p className={styles.feedback} aria-live="polite">
        {feedback}
      </p>
    </>
  );
}

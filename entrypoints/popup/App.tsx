import { useEffect, useRef, useState } from 'react';
import { getActiveTab, readVideoTime, type ActiveTab } from '@/src/browser/activeTab';
import { readShareRequest } from '@/src/browser/contextMenu';
import { planQr } from '@/src/core/qr';
import { resolveTarget, type ShareTarget } from '@/src/core/target';
import { formatTimestamp, parseYouTube } from '@/src/core/youtube';
import { Actions } from './Actions';
import { QrCard } from './QrCard';
import { UNSUPPORTED, WARNINGS } from './messages';
import styles from './App.module.css';

type TabState =
  | { status: 'loading' }
  | {
      status: 'ready';
      tab: ActiveTab | null;
      /** Playback position of a YouTube video in the tab, when there is one. */
      videoSeconds: number | null;
    }
  | { status: 'failed' };

/**
 * Work out which page to share and, for a YouTube video, where playback is.
 *
 * Opened from the toolbar, that is the active tab. Opened from the right-click
 * menu, the page address arrives in this page's own query string instead.
 */
async function loadTab(search: string): Promise<Extract<TabState, { status: 'ready' }>> {
  const request = readShareRequest(search);
  const tab: ActiveTab | null = request
    ? { url: request.url, id: request.tabId }
    : await getActiveTab();
  const isVideo = tab?.url ? parseYouTube(tab.url)?.kind === 'video' : false;
  const videoSeconds = isVideo && tab?.id != null ? await readVideoTime(tab.id) : null;
  return { status: 'ready', tab, videoSeconds };
}

function heading(target: Exclude<ShareTarget, { kind: 'unsupported' }>): string {
  if (target.kind === 'web') return 'Scan to open on your phone';
  const isMusic = target.link.kind !== 'short' && target.link.site === 'music';
  return isMusic ? 'Scan to open in YouTube Music' : 'Scan to open in the YouTube app';
}

interface AppProps {
  /** Query string of the popup page. Overridable for tests. */
  search?: string;
}

export function App({ search = window.location.search }: AppProps) {
  const [state, setState] = useState<TabState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    loadTab(search).then(
      (ready) => !cancelled && setState(ready),
      () => !cancelled && setState({ status: 'failed' }),
    );
    return () => {
      cancelled = true;
    };
  }, [search]);

  return (
    <main className={styles.app}>
      <Content state={state} />
    </main>
  );
}

function Content({ state }: { state: TabState }) {
  if (state.status === 'loading') {
    return <p className={styles.message}>Reading this tab…</p>;
  }

  if (state.status === 'failed') {
    return (
      <p className={styles.message} role="alert">
        ScanHop could not read this tab. Close this popup and try again.
      </p>
    );
  }

  return <Share url={state.tab?.url} videoSeconds={state.videoSeconds} />;
}

interface ShareProps {
  url: string | undefined;
  videoSeconds: number | null;
}

function Share({ url, videoSeconds }: ShareProps) {
  // Only offer the option when the video has actually been played a little.
  const canStartAtTime = videoSeconds != null && videoSeconds >= 1;
  const [startAtTime, setStartAtTime] = useState(true);
  const qrRef = useRef<SVGSVGElement>(null);

  const target = resolveTarget(url, {
    startSeconds: canStartAtTime && startAtTime ? videoSeconds : undefined,
  });

  if (target.kind === 'unsupported') {
    const { title, detail } = UNSUPPORTED[target.reason];
    return (
      <div className={styles.message} role="alert">
        <h1 className={styles.heading}>{title}</h1>
        <p>{detail}</p>
      </div>
    );
  }

  const plan = planQr(target.url);

  if (!plan.ok) {
    return (
      <div className={styles.message} role="alert">
        <h1 className={styles.heading}>This address is too long for a QR code</h1>
        <p>
          It is {plan.bytes.toLocaleString()} bytes; a QR code holds at most{' '}
          {plan.maxBytes.toLocaleString()}.
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className={styles.heading}>{heading(target)}</h1>
      <QrCard ref={qrRef} url={target.url} level={plan.level} dense={plan.dense} />
      {canStartAtTime && (
        <label className={styles.option}>
          <input
            type="checkbox"
            checked={startAtTime}
            onChange={(event) => setStartAtTime(event.target.checked)}
          />
          Start at {formatTimestamp(videoSeconds)}
        </label>
      )}
      <p className={styles.url} title={target.url}>
        {target.url}
      </p>
      <Actions url={target.url} qrRef={qrRef} />
      {target.warnings.map((warning) => (
        <p key={warning} className={styles.warning} role="status">
          {WARNINGS[warning]}
        </p>
      ))}
    </>
  );
}

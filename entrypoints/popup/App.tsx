import { useEffect, useState } from 'react';
import { getActiveTab, readVideoTime, type ActiveTab } from '@/src/browser/activeTab';
import { resolveTarget, type ShareTarget } from '@/src/core/target';
import { formatTimestamp, parseYouTube } from '@/src/core/youtube';
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

/** Read the tab and, for a YouTube video, where playback currently is. */
async function loadTab(): Promise<Extract<TabState, { status: 'ready' }>> {
  const tab = await getActiveTab();
  const isVideo = tab?.url ? parseYouTube(tab.url)?.kind === 'video' : false;
  const videoSeconds = isVideo && tab?.id != null ? await readVideoTime(tab.id) : null;
  return { status: 'ready', tab, videoSeconds };
}

function heading(target: Exclude<ShareTarget, { kind: 'unsupported' }>): string {
  if (target.kind === 'web') return 'Scan to open on your phone';
  const isMusic = target.link.kind !== 'short' && target.link.site === 'music';
  return isMusic ? 'Scan to open in YouTube Music' : 'Scan to open in the YouTube app';
}

export function App() {
  const [state, setState] = useState<TabState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    loadTab().then(
      (ready) => !cancelled && setState(ready),
      () => !cancelled && setState({ status: 'failed' }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <>
      <h1 className={styles.heading}>{heading(target)}</h1>
      <QrCard url={target.url} />
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
      {target.warnings.map((warning) => (
        <p key={warning} className={styles.warning} role="status">
          {WARNINGS[warning]}
        </p>
      ))}
    </>
  );
}

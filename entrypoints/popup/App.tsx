import { useEffect, useState } from 'react';
import { getActiveTab, type ActiveTab } from '@/src/browser/activeTab';
import { resolveTarget, type ShareTarget } from '@/src/core/target';
import { QrCard } from './QrCard';
import styles from './App.module.css';

type TabState =
  { status: 'loading' } | { status: 'ready'; tab: ActiveTab | null } | { status: 'failed' };

function heading(target: Exclude<ShareTarget, { kind: 'unsupported' }>): string {
  if (target.kind === 'web') return 'Scan to open on your phone';
  const isMusic = target.link.kind !== 'short' && target.link.site === 'music';
  return isMusic ? 'Scan to open in YouTube Music' : 'Scan to open in the YouTube app';
}

export function App() {
  const [state, setState] = useState<TabState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    getActiveTab().then(
      (tab) => !cancelled && setState({ status: 'ready', tab }),
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

  const target = resolveTarget(state.tab?.url);

  if (target.kind === 'unsupported') {
    return (
      <p className={styles.message} role="alert">
        This page can’t be opened on a phone.
      </p>
    );
  }

  return (
    <>
      <h1 className={styles.heading}>{heading(target)}</h1>
      <QrCard url={target.url} />
      <p className={styles.url} title={target.url}>
        {target.url}
      </p>
    </>
  );
}

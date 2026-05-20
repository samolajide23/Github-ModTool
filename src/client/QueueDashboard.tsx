import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { navigateTo } from '@devvit/web/client';
import {
  QUEUE_PAGE_SIZE,
  type ModActionKind,
  type ModActionOptions,
  type QueueItemDto,
  type QueueResponse,
  type QueueSettingsDto,
} from '../shared/api.js';
import { formatWeightRule } from '../shared/format-weight-rule.js';
import { formatScoreBreakdownLines } from '../shared/format-score-breakdown.js';
import { formatScoreNumber, roundScoreValue } from '../shared/format-score-number.js';
import {
  DEFAULT_QUEUE_SORT,
  QUEUE_SORT_OPTIONS,
  queueSortSubtitle,
  sortQueueItems,
  type QueueSortMode,
} from '../shared/sort-queue-items.js';
import { ModActionDialog, type ConfirmableAction } from './components/ModActionDialog.js';
import { Toast } from './components/Toast.js';
import { openInstallSettingsHelp } from './open-settings-help.js';
import { useMockQueue } from './hooks/useMockQueue.js';
import { useQueue } from './hooks/useQueue.js';
import { useToast } from './hooks/useToast.js';
import { setScrollRootLocked } from './setup-touch-scroll.js';

const scoreTone = (total: number): string => {
  if (total >= 20) return 'critical';
  if (total >= 10) return 'high';
  if (total >= 5) return 'medium';
  return 'low';
};

const formatRefreshed = (iso: string | null): string => {
  if (!iso) return 'Not refreshed yet';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

type KindFilter = 'all' | 'post' | 'comment';

type PendingConfirm = {
  item: QueueItemDto;
  action: ConfirmableAction;
};

const QueueFilters = ({
  kindFilter,
  minScore,
  sortMode,
  onKindChange,
  onMinScoreChange,
  onSortChange,
}: {
  kindFilter: KindFilter;
  minScore: number;
  sortMode: QueueSortMode;
  onKindChange: (v: KindFilter) => void;
  onMinScoreChange: (v: number) => void;
  onSortChange: (v: QueueSortMode) => void;
}) => {
  const onPostsClick = () => {
    onKindChange(kindFilter === 'post' ? 'all' : 'post');
  };

  const onCommentsClick = () => {
    onKindChange(kindFilter === 'comment' ? 'all' : 'comment');
  };

  const clampScore = (n: number) =>
    roundScoreValue(Math.min(999_999, Math.max(0, Number.isFinite(n) ? n : 0)));

  return (
    <div className="queue-filters">
      <div className="queue-filters__kinds" role="tablist" aria-label="Posts or comments">
        <button
          type="button"
          role="tab"
          aria-selected={kindFilter === 'post'}
          title="Show posts only. Tap again to show all types."
          className={`queue-filters__kind${kindFilter === 'post' ? ' queue-filters__kind--active' : ''}`}
          onClick={onPostsClick}
        >
          Posts
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={kindFilter === 'comment'}
          title="Show comments only. Tap again to show all types."
          className={`queue-filters__kind${kindFilter === 'comment' ? ' queue-filters__kind--active' : ''}`}
          onClick={onCommentsClick}
        >
          Comments
        </button>
      </div>
      <div className="queue-filters__sort">
        <label className="queue-filters__sort-label" htmlFor="queue-sort-select">
          Sort
        </label>
        <select
          id="queue-sort-select"
          className="queue-filters__sort-select"
          value={sortMode}
          onChange={(e) => onSortChange(e.target.value as QueueSortMode)}
        >
          {QUEUE_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="queue-filters__min-score">
        <div className="queue-filters__min-score-head">
          <span className="queue-filters__min-score-label" id="queue-min-score-label">
            Minimum score
          </span>
          <span className="queue-filters__min-score-hint" id="queue-min-score-hint">
            Only show items at or above this total
          </span>
        </div>
        <div
          className="queue-filters__stepper"
          role="group"
          aria-labelledby="queue-min-score-label"
          aria-describedby="queue-min-score-hint"
        >
          <button
            type="button"
            className="queue-filters__stepper-btn"
            aria-label="Decrease minimum score"
            disabled={minScore <= 0}
            onClick={() => onMinScoreChange(clampScore(minScore - 0.5))}
          >
            −
          </button>
          <input
            id="queue-min-score-input"
            className="queue-filters__score-input"
            type="number"
            inputMode="decimal"
            min={0}
            max={999999}
            step="any"
            value={minScore}
            aria-valuemin={0}
            aria-valuemax={999999}
            aria-valuenow={minScore}
            onChange={(e) => onMinScoreChange(clampScore(Number(e.target.value)))}
          />
          <button
            type="button"
            className="queue-filters__stepper-btn"
            aria-label="Increase minimum score"
            onClick={() => onMinScoreChange(clampScore(minScore + 0.5))}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

const QueueCard = ({
  item,
  settings,
  mock,
  acting,
  onAction,
  onRequestConfirm,
}: {
  item: QueueItemDto;
  settings: QueueSettingsDto;
  mock?: boolean;
  acting: boolean;
  onAction: (id: string, action: ModActionKind, options?: ModActionOptions) => void;
  onRequestConfirm: (item: QueueItemDto, action: ConfirmableAction) => void;
}) => {
  const tone = scoreTone(item.breakdown.total);
  const lockToggle = item.locked
    ? { action: 'unlock' as const, label: 'Unlock' }
    : { action: 'lock' as const, label: 'Lock' };
  const reportToggle = item.ignoringReports
    ? { action: 'unignore-reports' as const, label: 'Unignore' }
    : { action: 'ignore-reports' as const, label: 'Ignore' };

  const breakdownLines = formatScoreBreakdownLines(item.breakdown, settings.weights);

  return (
    <li className={`queue-card${acting ? ' queue-card--acting' : ''}`}>
      <div className="queue-card__main">
        <div className="queue-card__score-col">
          <span className={`queue-card__score queue-card__score--${tone}`}>
            {formatScoreNumber(item.breakdown.total)}
          </span>
          <span className="queue-card__score-label">pts</span>
        </div>
        <div className="queue-card__body">
          <div className="queue-card__meta">
            <span className={`pill pill--${item.kind}`}>{item.kind}</span>
            <span className="pill">{item.authorName}</span>
            {item.flairText && <span className="pill pill--flair">{item.flairText}</span>}
            {item.locked && <span className="pill">locked</span>}
            {item.ignoringReports && <span className="pill">ignoring reports</span>}
            {mock && <span className="pill">mock</span>}
          </div>
          <h3 className="queue-card__title">{item.title}</h3>
          <p className="queue-card__breakdown">{item.breakdownShort}</p>
          <details className="queue-card__details">
            <summary>Why this score?</summary>
            <ul className="score-lines">
              {breakdownLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
        </div>
      </div>
      <div className="queue-card__actions">
        <button
          type="button"
          className="btn btn--small"
          disabled={acting}
          onClick={() => navigateTo(item.url)}
        >
          Open
        </button>
        <button
          type="button"
          className="btn btn--small btn--positive"
          disabled={acting}
          onClick={() => onAction(item.id, 'approve')}
        >
          Approve
        </button>
        <button
          type="button"
          className="btn btn--small btn--danger"
          disabled={acting}
          onClick={() => onRequestConfirm(item, 'remove')}
        >
          Remove
        </button>
        <button
          type="button"
          className="btn btn--small btn--danger"
          disabled={acting}
          onClick={() => onRequestConfirm(item, 'spam')}
        >
          Spam
        </button>
        <button
          type="button"
          className="btn btn--small btn--danger"
          disabled={acting}
          onClick={() => onRequestConfirm(item, 'ban-user')}
        >
          Ban user
        </button>
        <button
          type="button"
          className="btn btn--small btn--neutral"
          disabled={acting}
          onClick={() => onAction(item.id, lockToggle.action)}
        >
          {lockToggle.label}
        </button>
        <button
          type="button"
          className="btn btn--small btn--neutral"
          disabled={acting}
          onClick={() => onAction(item.id, reportToggle.action)}
        >
          {reportToggle.label}
        </button>
      </div>
    </li>
  );
};

const SettingsIcon = () => (
  <svg
    className="btn-icon-svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const formatQueueMeta = (
  data: QueueResponse,
  visibleCount: number,
  filteredCount: number
): string => {
  const totalInQueue = data.totalInQueue ?? data.itemCount;
  const parts = [
    `r/${data.subredditName}`,
    `${visibleCount} shown`,
  ];

  if (filteredCount !== visibleCount) {
    parts.push(`${filteredCount} match filters`);
  }

  parts.push(`${totalInQueue} in queue`);

  parts.push(`v${data.appVersion}`);

  if (data.refreshedAt) {
    parts.push(`Updated ${formatRefreshed(data.refreshedAt)}`);
  }

  return parts.join(' · ');
};

const SettingsSummary = ({
  settings,
  subredditName,
  settingsFromInstall,
  mock,
}: {
  settings: QueueSettingsDto;
  subredditName: string;
  settingsFromInstall: boolean;
  mock?: boolean;
}) => (
  <>
    {!mock && !settingsFromInstall && (
      <p className="dashboard__banner dashboard__banner--warn">
        Using default scoring rules. Save your settings on the live subreddit, then refresh.
      </p>
    )}
    {!mock && (
      <p className="settings-hint">
        Edit rules in settings, then tap <strong>Refresh</strong>.{' '}
        <button
          type="button"
          className="link-btn"
          onClick={() => void openInstallSettingsHelp(subredditName)}
        >
          How to open settings
        </button>
      </p>
    )}
    {!mock && settings.autoRemoveAboveScore > 0 && (
      <p className="dashboard__banner dashboard__banner--auto-remove" role="status">
        <strong>Auto-remove is on:</strong> each queue refresh may remove up to 15 items with total
        score ≥ {settings.autoRemoveAboveScore}
        {settings.autoRemoveMinReports > 0 ? (
          <>
            {' '}
            and at least <strong>{settings.autoRemoveMinReports}</strong> user report
            {settings.autoRemoveMinReports === 1 ? '' : 's'}.
          </>
        ) : (
          <> (no minimum report count — score-only gate).</>
        )}{' '}
        Check the audit log after refresh.
      </p>
    )}
    <dl className="settings-dl">
      <div className="settings-dl__row">
        <dt>Banned keywords</dt>
        <dd>{settings.bannedKeywords || '—'}</dd>
      </div>
      <div className="settings-dl__row">
        <dt>Low karma threshold</dt>
        <dd>{settings.lowKarmaThreshold}</dd>
      </div>
      <div className="settings-dl__row">
        <dt>Young account max days</dt>
        <dd>{settings.youngAccountMaxDays}</dd>
      </div>
      <div className="settings-dl__row">
        <dt>Auto-remove score</dt>
        <dd>
          {settings.autoRemoveAboveScore > 0
            ? `≥ ${settings.autoRemoveAboveScore} pts (enabled)`
            : 'Off (0)'}
        </dd>
      </div>
      <div className="settings-dl__row">
        <dt>Auto-remove min reports</dt>
        <dd>
          {settings.autoRemoveAboveScore > 0
            ? settings.autoRemoveMinReports > 0
              ? `${settings.autoRemoveMinReports} user report(s) required`
              : 'None (score only)'
            : '—'}
        </dd>
      </div>
    </dl>
    <ul className="rules-list">
      {[
        formatWeightRule('Reports', settings.weights.reports, 'per report'),
        formatWeightRule('Banned keywords', settings.weights.bannedKeyword, 'per match'),
        formatWeightRule(
          'Low-karma author',
          settings.weights.lowKarmaAuthor,
          'flat if below threshold'
        ),
        formatWeightRule(
          'Repeat reports',
          settings.weights.repeatedReporter,
          'per extra event'
        ),
        formatWeightRule(
          'Time in queue',
          settings.weights.queueAgePerHour,
          'per hour waiting'
        ),
        formatWeightRule('Young account', settings.weights.youngAccount, 'flat bonus'),
        formatWeightRule('Mod reports', settings.weights.modReport, 'per mod report'),
      ].map((rule) => (
        <li key={rule.label}>
          <span className="rules-list__label">{rule.label}</span>
          <span className="rules-list__value">{rule.value}</span>
        </li>
      ))}
    </ul>
  </>
);

const ToolSection = ({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) => (
  <section className="tool-section" aria-labelledby={id}>
    <header className="tool-section__header">
      <h2 className="tool-section__title" id={id}>
        {title}
      </h2>
      {subtitle && <p className="tool-section__subtitle">{subtitle}</p>}
    </header>
    {children}
  </section>
);

type DashboardViewProps = {
  mock: boolean;
  accessDenied?: boolean;
  data: QueueResponse | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  actingOnId: string | null;
  refresh: () => void;
  performAction: (id: string, action: ModActionKind, options?: ModActionOptions) => void;
};

const DashboardView = ({
  mock,
  accessDenied = false,
  data,
  error,
  loading,
  refreshing,
  actingOnId,
  refresh,
  performAction,
}: DashboardViewProps) => {
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [minScore, setMinScore] = useState(0);
  const [sortMode, setSortMode] = useState<QueueSortMode>(DEFAULT_QUEUE_SORT);
  const [visibleLimit, setVisibleLimit] = useState(QUEUE_PAGE_SIZE);
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  useEffect(() => {
    setScrollRootLocked(pending !== null);
    return () => setScrollRootLocked(false);
  }, [pending]);

  useEffect(() => {
    setVisibleLimit(QUEUE_PAGE_SIZE);
  }, [data?.refreshedAt, kindFilter, minScore, sortMode]);

  const filteredItems = useMemo(() => {
    if (!data) {
      return [];
    }
    const filtered = data.items.filter((item) => {
      if (kindFilter !== 'all' && item.kind !== kindFilter) {
        return false;
      }
      return item.breakdown.total >= minScore;
    });
    return sortQueueItems(filtered, sortMode);
  }, [data, kindFilter, minScore, sortMode]);

  const visibleItems = useMemo(
    () => filteredItems.slice(0, visibleLimit),
    [filteredItems, visibleLimit]
  );

  const remainingFiltered = Math.max(0, filteredItems.length - visibleLimit);
  const totalInQueue = data?.totalInQueue ?? data?.itemCount ?? 0;
  const hiddenByFetchCap = Math.max(0, totalInQueue - (data?.items.length ?? 0));

  const handleConfirm = (options: ModActionOptions) => {
    if (!pending) {
      return;
    }
    void performAction(pending.item.id, pending.action, options);
    setPending(null);
  };

  if (!mock && !loading && accessDenied) {
    return (
      <main className="dashboard dashboard--access-denied">
        <div className="access-denied" role="alert">
          <h1 className="access-denied__title">QueueIQ</h1>
          <p className="access-denied__message">
            {error && !/\bundefined\b/i.test(error)
              ? error
              : 'Only moderators of this community can use QueueIQ.'}
          </p>
          <p className="access-denied__hint">
            This dashboard is for community moderators. If you are a mod, open QueueIQ from the
            subreddit mod menu.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard">
      {pending && data && (
        <ModActionDialog
          item={pending.item}
          action={pending.action}
          removalReasons={data.removalReasons}
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
        />
      )}

      <header className="dashboard__chrome">
        <div className="dashboard__header">
          <div>
            <h1 className="dashboard__title">QueueIQ</h1>
            {!loading && data ? (
              <p className="dashboard__meta">
                {formatQueueMeta(data, visibleItems.length, filteredItems.length)}
              </p>
            ) : (
              <p className="dashboard__meta">Prioritized mod queue</p>
            )}
          </div>
          {!mock && (
            <div className="dashboard__actions">
              {data?.settingsUrl && (
                <button
                  type="button"
                  className="btn btn--icon"
                  title="Open settings"
                  aria-label="Open settings"
                  onClick={() => navigateTo(data.settingsUrl)}
                >
                  <SettingsIcon />
                </button>
              )}
              <button
                type="button"
                className="btn btn--primary"
                disabled={loading || refreshing}
                onClick={() => void refresh()}
              >
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          )}
        </div>
      </header>

      {mock && (
        <p className="dashboard__banner dashboard__banner--mock">
          Local preview — run <code>npm run demo</code> in your project
        </p>
      )}

      <ToolSection
        id="priority-queue"
        title="Queue"
        subtitle={queueSortSubtitle(sortMode)}
      >
        {!loading && data && (
          <QueueFilters
            kindFilter={kindFilter}
            minScore={minScore}
            sortMode={sortMode}
            onKindChange={setKindFilter}
            onMinScoreChange={setMinScore}
            onSortChange={setSortMode}
          />
        )}

        {loading && <p className="loading-state">Loading queue…</p>}

        {error && !loading && (
          <p className="error-state" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && data && filteredItems.length === 0 && (
          <p className="empty-state">
            {data.items.length === 0
              ? 'Mod queue is empty.'
              : 'No items match your filters.'}
          </p>
        )}

        {!loading && !error && data && filteredItems.length > 0 && (
          <>
            <ol className="queue-list">
              {visibleItems.map((item) => (
                <QueueCard
                  key={item.id}
                  item={item}
                  settings={data.settings}
                  mock={mock}
                  acting={actingOnId === item.id}
                  onAction={(id, action, opts) => void performAction(id, action, opts)}
                  onRequestConfirm={(it, action) => setPending({ item: it, action })}
                />
              ))}
            </ol>
            {remainingFiltered > 0 && (
              <div className="queue-load-more">
                <button
                  type="button"
                  className="btn btn--neutral queue-load-more__btn"
                  onClick={() =>
                    setVisibleLimit((current) => current + QUEUE_PAGE_SIZE)
                  }
                >
                  Load {Math.min(QUEUE_PAGE_SIZE, remainingFiltered)} more
                </button>
                <p className="queue-load-more__hint">
                  {remainingFiltered} more matching your filters
                </p>
              </div>
            )}
            {hiddenByFetchCap > 0 && (
              <p className="queue-load-more__cap">
                Showing top {data.items.length} of {totalInQueue} queued items. Refresh after
                clearing the list to load the next batch.
              </p>
            )}
          </>
        )}
      </ToolSection>

      {!loading && data && (
        <details className="tool-section tool-section--collapsible">
          <summary className="tool-section__summary">
            <span className="tool-section__summary-title">Scoring rules</span>
            <span className="tool-section__summary-hint">Read-only · tap to expand</span>
          </summary>
          <div className="tool-section__body">
            <SettingsSummary
              settings={data.settings}
              subredditName={data.subredditName}
              settingsFromInstall={data.settingsFromInstall}
              mock={mock}
            />
          </div>
        </details>
      )}

      {!loading && data && data.auditLog.length > 0 && (
        <details className="tool-section tool-section--collapsible">
          <summary className="tool-section__summary">
            <span className="tool-section__summary-title">Audit log</span>
            <span className="tool-section__summary-hint">Recent mod actions</span>
          </summary>
          <div className="tool-section__body">
            <ul className="audit-log">
              {data.auditLog.map((entry) => (
                <li key={`${entry.at}-${entry.targetId}-${entry.action}`}>
                  <time dateTime={entry.at}>{formatRefreshed(entry.at)}</time>
                  <span>
                    <strong>{entry.mod}</strong> · {entry.action} ·{' '}
                    <code>{entry.targetId}</code>
                    {entry.detail ? ` — ${entry.detail}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </main>
  );
};

const DashboardLive = () => {
  const { message, showToast, clearToast } = useToast();
  const {
    data,
    error,
    loading,
    refreshing,
    actingOnId,
    accessDenied,
    refresh,
    performAction,
  } = useQueue(showToast);

  return (
    <>
      <Toast message={message} onDismiss={clearToast} />
      <DashboardView
        mock={false}
        accessDenied={accessDenied}
        data={data}
        error={error}
        loading={loading}
        refreshing={refreshing}
        actingOnId={actingOnId}
        refresh={refresh}
        performAction={performAction}
      />
    </>
  );
};

const DashboardMock = () => {
  const { message, showToast, clearToast } = useToast();
  const { data, refresh, actingOnId, performAction } = useMockQueue(showToast);

  return (
    <>
      <Toast message={message} onDismiss={clearToast} />
      <DashboardView
        mock
        data={data}
        error={null}
        loading={false}
        refreshing={false}
        actingOnId={actingOnId}
        refresh={refresh}
        performAction={performAction}
      />
    </>
  );
};

export const Dashboard = ({ mock = false }: { mock?: boolean }) =>
  mock ? <DashboardMock /> : <DashboardLive />;

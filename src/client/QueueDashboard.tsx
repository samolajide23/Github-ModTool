import type { ReactNode } from 'react';
import { navigateTo } from '@devvit/web/client';
import type { QueueItemDto, QueueResponse, QueueSettingsDto } from '../shared/api.js';
import { openInstallSettingsHelp } from './open-settings-help.js';
import { useMockQueue } from './hooks/useMockQueue.js';
import { useQueue } from './hooks/useQueue.js';

const scoreTone = (total: number): string => {
  if (total >= 20) return 'critical';
  if (total >= 10) return 'high';
  if (total >= 5) return 'medium';
  return 'low';
};

const urgencyLabel = (total: number): string => {
  if (total >= 20) return 'Critical';
  if (total >= 10) return 'High';
  if (total >= 5) return 'Medium';
  return 'Low';
};

const formatRefreshed = (iso: string | null): string => {
  if (!iso) return 'Not refreshed yet';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const formatWeightRule = (
  label: string,
  multiplier: number,
  unit: string
): { label: string; value: string } => ({
  label,
  value:
    multiplier === 0
      ? 'disabled'
      : unit.includes('flat')
        ? `+${multiplier} ${unit}`
        : `×${multiplier} ${unit}`,
});

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

const QueueCard = ({
  item,
  rank,
  mock,
}: {
  item: QueueItemDto;
  rank: number;
  mock?: boolean;
}) => {
  const tone = scoreTone(item.breakdown.total);

  return (
    <li className="queue-card">
      <span className="queue-card__rank">#{rank}</span>
      <div className="queue-card__score-col">
        <span className={`queue-card__urgency queue-card__urgency--${tone}`}>
          {urgencyLabel(item.breakdown.total)}
        </span>
        <span className={`queue-card__score queue-card__score--${tone}`}>
          {item.breakdown.total}
        </span>
        <span className="queue-card__score-label">pts</span>
      </div>
      <div className="queue-card__body">
        <div className="queue-card__meta">
          <span className={`pill pill--${item.kind}`}>{item.kind}</span>
          <span className="pill">{item.authorName}</span>
          {mock && <span className="pill">mock</span>}
        </div>
        <h3 className="queue-card__title">{item.title}</h3>
        <p className="queue-card__breakdown">{item.breakdownShort}</p>
      </div>
      {!mock && (
        <button
          type="button"
          className="btn queue-card__open"
          onClick={() => navigateTo(item.url)}
        >
          Review
        </button>
      )}
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
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const SettingsSteps = ({ subredditName }: { subredditName: string }) => (
  <ol className="settings-steps">
    <li>
      Open <strong>r/{subredditName}</strong> (not the <code>?playtest=</code> URL)
    </li>
    <li>
      Tap <strong>Mod Tools</strong> (shield in the subreddit header)
    </li>
    <li>
      Or open{' '}
      <strong>
        <a href={`https://developers.reddit.com/r/${subredditName}/apps/queue-toolk`}>
          Install settings
        </a>
      </strong>{' '}
      (must be logged in as mod)
    </li>
    <li>
      Or use Mod Tools menu → <strong>Configure QueueIQ settings</strong>
    </li>
    <li>Save, return here, tap <strong>Refresh scores</strong></li>
  </ol>
);

const SettingsSummary = ({
  settings,
  subredditName,
  settingsUrl,
  settingsFromInstall,
  mock,
}: {
  settings: QueueSettingsDto;
  subredditName: string;
  settingsUrl: string;
  settingsFromInstall: boolean;
  mock?: boolean;
}) => (
  <>
    {!mock && !settingsFromInstall && (
      <p className="dashboard__banner dashboard__banner--warn">
        Showing default scoring — Install settings could not be loaded (common in playtest).
        Open the live subreddit dashboard after saving settings.
      </p>
    )}
    <div className="settings-hint-row">
      <p className="settings-hint">
        Change keywords and weights in Install settings, then tap Refresh scores.
      </p>
      <div className="settings-hint-row__actions">
        {!mock && (
          <button
            type="button"
            className="btn btn--icon btn--icon-lg"
            title="Open Install settings"
            aria-label="Open Install settings"
            onClick={() => navigateTo(settingsUrl)}
          >
            <SettingsIcon />
            <span className="btn__label">Settings</span>
          </button>
        )}
        <button
          type="button"
          className="btn"
          title="Show step-by-step help"
          onClick={() => void openInstallSettingsHelp(subredditName)}
        >
          How to
        </button>
      </div>
    </div>
    <SettingsSteps subredditName={subredditName} />
    <dl className="settings-dl">
      <div className="settings-dl__row">
        <dt>Banned keywords</dt>
        <dd>{settings.bannedKeywords || '—'}</dd>
      </div>
      <div className="settings-dl__row">
        <dt>Low karma threshold</dt>
        <dd>{settings.lowKarmaThreshold}</dd>
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
      ].map((rule) => (
        <li key={rule.label}>
          <span className="rules-list__label">{rule.label}</span>
          <span className="rules-list__value">{rule.value}</span>
        </li>
      ))}
    </ul>
  </>
);

type DashboardViewProps = {
  mock: boolean;
  data: QueueResponse | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;
};

const DashboardView = ({
  mock,
  data,
  error,
  loading,
  refreshing,
  refresh,
}: DashboardViewProps) => (
  <main className="dashboard">
    <header className="dashboard__chrome">
      <p className="dashboard__eyebrow">Moderator tool</p>
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__title">QueueIQ</h1>
          <p className="dashboard__tagline">Prioritized mod queue — logic only, no AI</p>
        </div>
        {!mock && (
          <div className="dashboard__actions">
            {data?.settingsUrl && (
              <button
                type="button"
                className="btn btn--icon"
                title="Open Install settings"
                aria-label="Open Install settings"
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
              {refreshing ? 'Refreshing…' : 'Refresh scores'}
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

    {!loading && !error && data && (
      <ToolSection
        id="overview"
        title="Overview"
        subtitle="Current queue status for this community"
      >
        <dl className="stats-grid">
          <div className="stat">
            <dt>Community</dt>
            <dd>r/{data.subredditName}</dd>
          </div>
          <div className="stat">
            <dt>Items scored</dt>
            <dd>{data.itemCount}</dd>
          </div>
          <div className="stat">
            <dt>Last refresh</dt>
            <dd>{formatRefreshed(data.refreshedAt)}</dd>
          </div>
          <div className="stat">
            <dt>Top priority</dt>
            <dd>
              {data.items[0]
                ? `${data.items[0].breakdown.total} pts · ${urgencyLabel(data.items[0].breakdown.total)}`
                : '—'}
            </dd>
          </div>
        </dl>
      </ToolSection>
    )}

    {!loading && data && (
      <ToolSection
        id="install-settings"
        title="Scoring rules"
        subtitle="Values below come from Install settings (read-only on this post)"
      >
        <SettingsSummary
          settings={data.settings}
          subredditName={data.subredditName}
          settingsUrl={data.settingsUrl}
          settingsFromInstall={data.settingsFromInstall}
          mock={mock}
        />
      </ToolSection>
    )}

    <ToolSection
      id="priority-queue"
      title="Priority queue"
      subtitle="Review highest scores first — tap Review to open in mod queue"
    >
      {loading && <p className="loading-state">Loading prioritized queue…</p>}

      {error && !loading && (
        <p className="error-state" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && data && data.items.length === 0 && (
        <p className="empty-state">Mod queue is empty — nothing to triage.</p>
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <ol className="queue-list">
          {data.items.map((item, index) => (
            <QueueCard key={item.id} item={item} rank={index + 1} mock={mock} />
          ))}
        </ol>
      )}
    </ToolSection>

    <ToolSection
      id="mod-workflow"
      title="Mod workflow"
      subtitle="Also available from Mod Tools without opening this post"
    >
      <ul className="workflow-list">
        <li>Install settings — keywords, karma threshold, and point values</li>
        <li>View prioritized mod queue — text list in Mod Tools</li>
        <li>Review top priority item — jump to #1 in queue</li>
        <li>QueueIQ score — breakdown on any post or comment</li>
      </ul>
    </ToolSection>
  </main>
);

const DashboardLive = () => {
  const { data, error, loading, refreshing, refresh } = useQueue();
  return (
    <DashboardView
      mock={false}
      data={data}
      error={error}
      loading={loading}
      refreshing={refreshing}
      refresh={refresh}
    />
  );
};

const DashboardMock = () => {
  const { data, refresh } = useMockQueue();
  return (
    <DashboardView
      mock
      data={data}
      error={null}
      loading={false}
      refreshing={false}
      refresh={refresh}
    />
  );
};

export const Dashboard = ({ mock = false }: { mock?: boolean }) =>
  mock ? <DashboardMock /> : <DashboardLive />;

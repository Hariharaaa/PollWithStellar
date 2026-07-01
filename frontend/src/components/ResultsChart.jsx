export default function ResultsChart({ options, voteCounts, userVotedIndex, loading }) {
  const total = voteCounts.reduce((a, b) => a + b, 0);

  const COLORS = [
    'var(--color-rust)',
    'var(--color-ts)',
    'var(--color-go)',
    'var(--color-python)',
  ];

  return (
    <div className="results-chart" aria-label="Poll results">
      <div className="results-header">
        <h3 className="results-title">Live Results</h3>
        <div className="results-meta">
          <span className="total-votes">{total} vote{total !== 1 ? 's' : ''}</span>
          {loading && <span className="refreshing-dot" title="Refreshing…" />}
        </div>
      </div>

      <div className="results-bars">
        {options.map((option, i) => {
          const count = voteCounts[i] ?? 0;
          const pct = total === 0 ? 0 : Math.round((count / total) * 100);
          const isUserVote = userVotedIndex === i;

          return (
            <div key={option} className={`result-row ${isUserVote ? 'user-voted' : ''}`}>
              <div className="result-label-row">
                <span className="result-option-name">
                  {option}
                  {isUserVote && <span className="your-vote-badge">Your vote</span>}
                </span>
                <span className="result-stats">{count} ({pct}%)</span>
              </div>
              <div className="result-bar-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className="result-bar-fill"
                  style={{
                    width: `${pct}%`,
                    background: COLORS[i % COLORS.length],
                    boxShadow: isUserVote ? `0 0 12px ${COLORS[i % COLORS.length]}` : 'none',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {total === 0 && (
        <p className="no-votes-yet">No votes yet — be the first!</p>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import WalletConnect from './components/WalletConnect.jsx';
import PollCard from './components/PollCard.jsx';
import ResultsChart from './components/ResultsChart.jsx';
import { getResults, hasVoted as checkHasVoted, CONTRACT_ID, EXPLORER_BASE } from './lib/contract.js';

const POLL_INTERVAL_MS = 5000;

export default function App() {
  const [address, setAddress] = useState(null);
  const [pollData, setPollData] = useState({ question: '', options: [], voteCounts: [] });
  const [userHasVoted, setUserHasVoted] = useState(false);
  const [userVotedIndex, setUserVotedIndex] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [initError, setInitError] = useState(null);

  // ── Fetch live results ────────────────────────────────────────────────────
  const fetchResults = useCallback(async (quiet = false) => {
    if (!quiet) setResultsLoading(true);
    try {
      const data = await getResults();
      setPollData(data);
      setInitError(null);
    } catch (err) {
      console.error('[App] getResults error:', err);
      if (!quiet) setInitError('Could not load poll data. Is the contract deployed?');
    } finally {
      if (!quiet) setResultsLoading(false);
    }
  }, []);

  // ── Initial load + polling interval ──────────────────────────────────────
  useEffect(() => {
    fetchResults(false);
    const id = setInterval(() => fetchResults(true), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchResults]);

  // ── Check voted status when wallet connects ────────────────────────────────
  useEffect(() => {
    if (!address) {
      setUserHasVoted(false);
      setUserVotedIndex(null);
      return;
    }
    checkHasVoted(address).then((voted) => {
      setUserHasVoted(voted);
    });
  }, [address]);

  function handleVoteCast(optionIndex) {
    setUserHasVoted(true);
    setUserVotedIndex(optionIndex);
    // Immediately refresh results
    setTimeout(() => fetchResults(true), 1500);
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">LivePoll</span>
            <span className="logo-badge">Testnet</span>
          </div>
        </div>
        <div className="header-right">
          <WalletConnect
            address={address}
            onConnect={(addr) => setAddress(addr)}
            onDisconnect={() => { setAddress(null); setUserHasVoted(false); setUserVotedIndex(null); }}
          />
        </div>
      </header>

      <main className="app-main">
        {/* Hero glow */}
        <div className="hero-glow" aria-hidden="true" />

        {initError ? (
          <div className="init-error" role="alert">
            <span>⚠️</span>
            <div>
              <strong>Poll Unavailable</strong>
              <p>{initError}</p>
              <button className="btn btn-ghost btn-sm" onClick={() => fetchResults(false)}>Retry</button>
            </div>
          </div>
        ) : resultsLoading && !pollData.question ? (
          <div className="loading-state">
            <div className="loader" />
            <p>Loading poll…</p>
          </div>
        ) : (
          <div className="poll-layout">
            <PollCard
              question={pollData.question}
              options={pollData.options}
              address={address}
              hasVoted={userHasVoted}
              userVotedIndex={userVotedIndex}
              onVoteCast={handleVoteCast}
            />
            <ResultsChart
              options={pollData.options}
              voteCounts={pollData.voteCounts}
              userVotedIndex={userVotedIndex}
              loading={resultsLoading}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>
          Deployed on <strong>Stellar Testnet</strong> · Contract:{' '}
          <a
            href={`${EXPLORER_BASE}/contract/${CONTRACT_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            {CONTRACT_ID.slice(0, 8)}…{CONTRACT_ID.slice(-6)}
          </a>
        </p>
        <p>Results refresh every {POLL_INTERVAL_MS / 1000}s</p>
      </footer>
    </div>
  );
}

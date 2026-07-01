import { useState, useEffect, useCallback } from 'react';
import WalletConnect from './components/WalletConnect.jsx';
import PollCard from './components/PollCard.jsx';
import ResultsChart from './components/ResultsChart.jsx';
import { getResults, hasVoted as checkHasVoted, CONTRACT_ID, EXPLORER_BASE } from './lib/contract.js';
import { ErrorType } from './lib/errors.js';

const POLL_INTERVAL_MS = 5000;

export default function App() {
  const [wallet, setWallet] = useState(null);
  const [pollData, setPollData] = useState({ question: '', options: [], voteCounts: [] });
  const [userHasVoted, setUserHasVoted] = useState(false);
  const [userVotedIndex, setUserVotedIndex] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [initError, setInitError] = useState(null);
  
  // Real-time polish states
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [progressPct, setProgressPct] = useState(0);

  // Global Error Toasts
  const [toastHistory, setToastHistory] = useState([]);

  const showError = useCallback((error) => {
    const id = Date.now() + Math.random();
    setToastHistory((prev) => [...prev, { ...error, id }]);
    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      setToastHistory((prev) => prev.filter((t) => t.id !== id));
    }, 8000);
  }, []);

  const dismissToast = (id) => {
    setToastHistory((prev) => prev.filter((t) => t.id !== id));
  };

  // ── Fetch live results ────────────────────────────────────────────────────
  const fetchResults = useCallback(async (quiet = false) => {
    if (!quiet) setResultsLoading(true);
    try {
      const data = await getResults();
      setPollData(data);
      setInitError(null);
      setLastUpdated(Date.now());
      setProgressPct(0); // reset progress ring
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

  // ── Progress Ring Animation ──────────────────────────────────────────────
  useEffect(() => {
    const tickMs = 100;
    const intervalId = setInterval(() => {
      setProgressPct((prev) => {
        const next = prev + (tickMs / POLL_INTERVAL_MS) * 100;
        return next > 100 ? 100 : next;
      });
    }, tickMs);
    return () => clearInterval(intervalId);
  }, []);

  // ── Check voted status when wallet connects ────────────────────────────────
  useEffect(() => {
    if (!wallet?.address) {
      setUserHasVoted(false);
      setUserVotedIndex(null);
      return;
    }
    checkHasVoted(wallet.address).then((voted) => {
      setUserHasVoted(voted);
    });
  }, [wallet?.address]);

  function handleVoteCast(optionIndex) {
    setUserHasVoted(true);
    setUserVotedIndex(optionIndex);
    // Immediately refresh results
    setTimeout(() => fetchResults(true), 1500);
  }

  const copyContractId = () => {
    navigator.clipboard.writeText(CONTRACT_ID);
    showError({ type: 'SUCCESS', message: 'Contract ID copied to clipboard!' });
  };

  const getSecondsAgo = () => Math.floor((Date.now() - lastUpdated) / 1000);
  const [secondsAgo, setSecondsAgo] = useState(getSecondsAgo());
  
  useEffect(() => {
    const id = setInterval(() => setSecondsAgo(getSecondsAgo()), 1000);
    return () => clearInterval(id);
  }, [lastUpdated]);

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
            wallet={wallet}
            onConnect={(w) => setWallet(w)}
            onDisconnect={() => { setWallet(null); setUserHasVoted(false); setUserVotedIndex(null); }}
            showError={showError}
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
              address={wallet?.address}
              hasVoted={userHasVoted}
              userVotedIndex={userVotedIndex}
              onVoteCast={handleVoteCast}
              showError={showError}
            />
            
            <div className="results-container">
              <div className="results-header-wrapper">
                <h2>Live Results</h2>
                <div className="live-indicator">
                  <span className="live-text">Updated {secondsAgo}s ago</span>
                  <div className="progress-ring-container">
                    <svg width="16" height="16" viewBox="0 0 16 16" className="progress-ring">
                      <circle cx="8" cy="8" r="6" className="ring-bg" />
                      <circle cx="8" cy="8" r="6" className="ring-fg" 
                        strokeDasharray="37.7" 
                        strokeDashoffset={37.7 - (37.7 * progressPct) / 100} 
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <ResultsChart
                options={pollData.options}
                voteCounts={pollData.voteCounts}
                userVotedIndex={userVotedIndex}
                loading={resultsLoading}
              />
            </div>
          </div>
        )}

        <details className="how-it-works">
          <summary>How this works</summary>
          <div className="how-it-works-content">
            <p><strong>1. Connect:</strong> Use Freighter, xBull, or Lobstr on Stellar Testnet.</p>
            <p><strong>2. Vote:</strong> Voting signs a smart contract transaction. No fees if you use Friendbot!</p>
            <p><strong>3. Verify:</strong> Results are read directly from the Soroban blockchain every 5 seconds.</p>
          </div>
        </details>
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
          <button className="btn-icon" onClick={copyContractId} title="Copy Contract ID">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
        </p>
      </footer>

      {/* Global Error Toasts */}
      <div className="toast-container">
        {toastHistory.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type?.toLowerCase() || 'info'}`}>
            <div className="toast-icon">
              {toast.type === ErrorType.WALLET_NOT_FOUND && '🔌'}
              {toast.type === ErrorType.USER_REJECTED && '🚫'}
              {toast.type === ErrorType.INSUFFICIENT_BALANCE && '💸'}
              {toast.type === 'SUCCESS' ? '✅' : (toast.type === ErrorType.UNKNOWN ? '❌' : '')}
            </div>
            <div className="toast-content">
              <strong>
                {toast.type === ErrorType.WALLET_NOT_FOUND && 'Wallet Not Found'}
                {toast.type === ErrorType.USER_REJECTED && 'Request Rejected'}
                {toast.type === ErrorType.INSUFFICIENT_BALANCE && 'Insufficient Balance'}
                {toast.type === 'SUCCESS' && 'Success'}
                {toast.type === ErrorType.UNKNOWN && 'Error'}
              </strong>
              <p>{toast.message}</p>
              {toast.type === ErrorType.INSUFFICIENT_BALANCE && (
                <a href="https://friendbot.stellar.org/" target="_blank" rel="noopener noreferrer" className="toast-link">Fund with Friendbot →</a>
              )}
            </div>
            <button className="toast-close" onClick={() => dismissToast(toast.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

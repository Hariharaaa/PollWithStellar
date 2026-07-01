import { useState } from 'react';
import { castVote } from '../lib/contract.js';
import { signTransaction } from '../lib/wallet.js';
import { classifyError, ErrorType, ERROR_MESSAGES } from '../lib/errors.js';
import TxStatus from './TxStatus.jsx';

const OPTION_EMOJIS = ['🦀', '🟦', '🐹', '🐍'];

export default function PollCard({
  question,
  options,
  address,
  hasVoted,
  userVotedIndex,
  onVoteCast,
}) {
  const [txStatus, setTxStatus] = useState('Idle');
  const [txHash, setTxHash] = useState(null);
  const [txError, setTxError] = useState(null);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState(null);

  async function handleVote(index) {
    if (!address) return;
    setVoting(true);
    setError(null);
    setTxHash(null);
    setTxError(null);
    setTxStatus('Preparing');

    try {
      const hash = await castVote(address, index, signTransaction, setTxStatus);
      setTxHash(hash);
      setTxStatus('Success');
      onVoteCast(index);
    } catch (err) {
      console.error('[PollCard] vote error:', err);
      const type = classifyError(err);

      if (err.message?.includes('already voted')) {
        setTxError('You have already voted in this poll.');
      } else {
        setError({ type, message: ERROR_MESSAGES[type] });
      }
      setTxStatus('Failed');
    } finally {
      setVoting(false);
    }
  }

  function dismissTx() {
    setTxStatus('Idle');
    setTxHash(null);
    setTxError(null);
    setError(null);
  }

  const canVote = !!address && !hasVoted && !voting;

  return (
    <div className="poll-card">
      <div className="poll-question-section">
        <div className="poll-chip">LIVE POLL</div>
        <h2 className="poll-question">{question || 'Loading poll…'}</h2>
      </div>

      {!address && (
        <div className="poll-connect-hint">
          <span>👆</span> Connect your wallet to vote
        </div>
      )}

      {hasVoted && (
        <div className="already-voted-notice">
          ✅ You've voted! Results are updating live below.
        </div>
      )}

      <div className="vote-options">
        {options.map((option, i) => {
          const isMyVote = userVotedIndex === i;
          return (
            <button
              key={option}
              id={`vote-option-${i}`}
              className={`vote-btn ${isMyVote ? 'vote-btn-selected' : ''} ${hasVoted && !isMyVote ? 'vote-btn-dim' : ''}`}
              onClick={() => handleVote(i)}
              disabled={!canVote}
              aria-pressed={isMyVote}
            >
              <span className="vote-btn-emoji">{OPTION_EMOJIS[i] || '🔵'}</span>
              <span className="vote-btn-label">{option}</span>
              {isMyVote && <span className="vote-btn-check">✓</span>}
            </button>
          );
        })}
      </div>

      {error && (
        <div className={`error-banner error-${error.type.toLowerCase()}`} role="alert">
          <span className="error-icon">
            {error.type === ErrorType.WALLET_NOT_FOUND && '🔌'}
            {error.type === ErrorType.USER_REJECTED && '🚫'}
            {error.type === ErrorType.INSUFFICIENT_BALANCE && '💸'}
            {error.type === ErrorType.UNKNOWN && '❌'}
          </span>
          <div>
            <strong>
              {error.type === ErrorType.WALLET_NOT_FOUND && 'Wallet Not Found'}
              {error.type === ErrorType.USER_REJECTED && 'Transaction Rejected'}
              {error.type === ErrorType.INSUFFICIENT_BALANCE && 'Insufficient Balance'}
              {error.type === ErrorType.UNKNOWN && 'Error'}
            </strong>
            <p>{error.message}</p>
            {error.type === ErrorType.INSUFFICIENT_BALANCE && (
              <a href="https://friendbot.stellar.org" target="_blank" rel="noopener noreferrer" className="error-link">
                Get testnet XLM from Friendbot →
              </a>
            )}
          </div>
          <button className="error-close" onClick={() => setError(null)} aria-label="Dismiss">✕</button>
        </div>
      )}

      <TxStatus
        status={txStatus}
        txHash={txHash}
        error={txError}
        onDismiss={dismissTx}
      />
    </div>
  );
}

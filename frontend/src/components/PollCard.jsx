import { useState } from 'react';
import { castVote } from '../lib/contract.js';
import { signTransaction } from '../lib/wallet.js';
import { classifyError, ERROR_MESSAGES } from '../lib/errors.js';
import TxStatus from './TxStatus.jsx';

const OPTION_EMOJIS = ['🦀', '🟦', '🐹', '🐍'];

export default function PollCard({
  question,
  options,
  address,
  hasVoted,
  userVotedIndex,
  onVoteCast,
  showError
}) {
  const [txStatus, setTxStatus] = useState('Idle');
  const [txHash, setTxHash] = useState(null);
  const [txError, setTxError] = useState(null);
  const [voting, setVoting] = useState(false);

  async function handleVote(index) {
    if (!address) return;
    setVoting(true);
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
        showError({ type, message: ERROR_MESSAGES[type] });
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

      <TxStatus
        status={txStatus}
        txHash={txHash}
        error={txError}
        onDismiss={dismissTx}
      />
    </div>
  );
}

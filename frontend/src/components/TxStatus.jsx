import { EXPLORER_BASE } from '../lib/contract.js';

const STATUS_CONFIG = {
  Preparing: { icon: '⚙️', label: 'Preparing transaction…', class: 'status-preparing', step: 1 },
  Signing:   { icon: '✍️', label: 'Waiting for wallet signature…', class: 'status-signing', step: 2 },
  Submitting:{ icon: '📡', label: 'Submitting to network…', class: 'status-submitting', step: 3 },
  Pending:   { icon: '⏳', label: 'Awaiting confirmation…', class: 'status-pending', step: 4 },
  Success:   { icon: '✅', label: 'Vote confirmed!', class: 'status-success', step: 5 },
  Failed:    { icon: '❌', label: 'Transaction failed', class: 'status-failed', step: 0 },
};

const STEPS = ['Preparing', 'Signing', 'Submitting', 'Pending', 'Success'];

export default function TxStatus({ status, txHash, error, onDismiss }) {
  if (!status || status === 'Idle') return null;

  const config = STATUS_CONFIG[status] || {};
  const isTerminal = status === 'Success' || status === 'Failed';
  const currentStep = config.step || 0;

  return (
    <div className={`tx-status-card ${config.class}`} role="status" aria-live="polite">
      <div className="tx-status-header">
        <span className="tx-status-icon">{config.icon}</span>
        <div className="tx-status-info">
          <p className="tx-status-label">{config.label}</p>
          {txHash && status === 'Success' && (
            <a
              className="tx-hash-link"
              href={`${EXPLORER_BASE}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              title={txHash}
            >
              View on Stellar Expert: {txHash.slice(0, 8)}…{txHash.slice(-6)}
            </a>
          )}
          {error && status === 'Failed' && (
            <p className="tx-error-reason">{error}</p>
          )}
        </div>
        {isTerminal && onDismiss && (
          <button className="tx-dismiss" onClick={onDismiss} aria-label="Dismiss">✕</button>
        )}
      </div>

      {/* Progress stepper */}
      {status !== 'Failed' && (
        <div className="tx-steps" aria-label="Transaction progress">
          {STEPS.map((step, i) => {
            const stepNum = i + 1;
            const done = currentStep > stepNum;
            const active = currentStep === stepNum;
            return (
              <div key={step} className={`tx-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
                <div className="tx-step-dot">
                  {done ? '✓' : stepNum}
                </div>
                <span className="tx-step-label">{step}</span>
                {i < STEPS.length - 1 && <div className={`tx-step-line ${done ? 'done' : ''}`} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

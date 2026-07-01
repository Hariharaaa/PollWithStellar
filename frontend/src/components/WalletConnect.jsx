import { useState } from 'react';
import { connectWallet, disconnectWallet } from '../lib/wallet.js';
import { classifyError, ErrorType, ERROR_MESSAGES } from '../lib/errors.js';

export default function WalletConnect({ address, onConnect, onDisconnect }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      const { address: addr } = await connectWallet();
      onConnect(addr);
    } catch (err) {
      console.error('[WalletConnect] connect error:', err);
      const type = classifyError(err);
      // Don't show error if user simply closed the modal
      if (err?.message !== 'The user closed the modal.' && err?.code !== -1) {
        setError({ type, message: ERROR_MESSAGES[type] });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    await disconnectWallet();
    onDisconnect();
    setError(null);
  }

  function shortAddr(addr) {
    if (!addr) return '';
    return addr.slice(0, 6) + '…' + addr.slice(-4);
  }

  return (
    <div className="wallet-connect">
      {address ? (
        <div className="wallet-connected">
          <div className="wallet-badge">
            <span className="wallet-dot" />
            <span className="wallet-addr" title={address}>{shortAddr(address)}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleDisconnect}>
            Disconnect
          </button>
        </div>
      ) : (
        <button
          id="connect-wallet-btn"
          className="btn btn-primary"
          onClick={handleConnect}
          disabled={loading}
        >
          {loading ? (
            <span className="btn-inner"><span className="spinner" /> Connecting…</span>
          ) : (
            <span className="btn-inner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 12V22H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" />
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
              </svg>
              Connect Wallet
            </span>
          )}
        </button>
      )}

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
              {error.type === ErrorType.USER_REJECTED && 'Request Rejected'}
              {error.type === ErrorType.INSUFFICIENT_BALANCE && 'Insufficient Balance'}
              {error.type === ErrorType.UNKNOWN && 'Connection Error'}
            </strong>
            <p>{error.message}</p>
            {error.type === ErrorType.WALLET_NOT_FOUND && (
              <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer" className="error-link">
                Install Freighter →
              </a>
            )}
          </div>
          <button className="error-close" onClick={() => setError(null)} aria-label="Dismiss">✕</button>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { connectWallet, disconnectWallet } from '../lib/wallet.js';
import { classifyError, ErrorType, ERROR_MESSAGES } from '../lib/errors.js';

export default function WalletConnect({ wallet, onConnect, onDisconnect, showError }) {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const walletData = await connectWallet();
      onConnect(walletData);
    } catch (err) {
      console.error('[WalletConnect] connect error:', err);
      const type = classifyError(err);
      if (err?.message !== 'The user closed the modal.' && err?.code !== -1) {
        showError({ type, message: ERROR_MESSAGES[type] });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    await disconnectWallet();
    onDisconnect();
  }

  function shortAddr(addr) {
    if (!addr) return '';
    return addr.slice(0, 6) + '…' + addr.slice(-4);
  }

  return (
    <div className="wallet-connect">
      {wallet ? (
        <div className="wallet-connected">
          {wallet.walletIcon && <img src={wallet.walletIcon} alt={wallet.walletName} className="wallet-icon-img" width="20" height="20" />}
          <div className="wallet-badge">
            <span className="wallet-dot" />
            <span className="wallet-addr" title={wallet.address}>
              {wallet.walletName ? `${wallet.walletName}: ` : ''}{shortAddr(wallet.address)}
            </span>
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
    </div>
  );
}

/**
 * Classifies errors from wallet/Stellar operations into one of 4 types.
 * These are surfaced in the UI — not just logged to console.
 */

export const ErrorType = {
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  USER_REJECTED: 'USER_REJECTED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  UNKNOWN: 'UNKNOWN',
};

export const ERROR_MESSAGES = {
  [ErrorType.WALLET_NOT_FOUND]:
    'Wallet extension not found. Please install Freighter or xBull and refresh.',
  [ErrorType.USER_REJECTED]:
    'Vote cancelled — you rejected the request in your wallet',
  [ErrorType.INSUFFICIENT_BALANCE]:
    'Insufficient balance to cover transaction fee',
  [ErrorType.UNKNOWN]: 'An unexpected error occurred. Check the console for details.',
};

/**
 * Inspect an error from StellarWalletsKit or Stellar SDK and return an ErrorType.
 * @param {unknown} err
 * @returns {keyof typeof ErrorType}
 */
export function classifyError(err) {
  if (!err) return ErrorType.UNKNOWN;

  const msg = (err?.message || err?.toString() || '').toLowerCase();
  const code = err?.code ?? err?.error?.code ?? null;

  // Wallet extension missing
  if (
    msg.includes('no wallet') ||
    msg.includes('not found') ||
    msg.includes('not installed') ||
    msg.includes('freighter is not defined') ||
    msg.includes('extension') ||
    code === -32601
  ) {
    return ErrorType.WALLET_NOT_FOUND;
  }

  // User rejected / cancelled
  if (
    msg.includes('user rejected') ||
    msg.includes('user denied') ||
    msg.includes('cancelled') ||
    msg.includes('canceled') ||
    msg.includes('declined') ||
    code === 4001
  ) {
    return ErrorType.USER_REJECTED;
  }

  // Balance too low
  if (
    msg.includes('insufficient') ||
    msg.includes('balance') ||
    msg.includes('tx_insufficient_balance') ||
    msg.includes('fee') ||
    msg.includes('op_underfunded')
  ) {
    return ErrorType.INSUFFICIENT_BALANCE;
  }

  return ErrorType.UNKNOWN;
}

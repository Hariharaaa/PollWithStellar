/**
 * wallet.js — StellarWalletsKit v2.x integration
 *
 * v2.x uses:
 *  - Static class methods on StellarWalletsKit
 *  - Module classes imported from subpaths
 *  - Networks enum from @creit.tech/stellar-wallets-kit/types
 */

// Main kit + types
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit/sdk';
import { Networks } from '@creit.tech/stellar-wallets-kit/types';

// Wallet modules via explicit subpaths (not re-exported from main entry)
import { FreighterModule } from '@creit.tech/stellar-wallets-kit/modules/freighter';
import { xBullModule } from '@creit.tech/stellar-wallets-kit/modules/xbull';
import { LobstrModule } from '@creit.tech/stellar-wallets-kit/modules/lobstr';

export { Networks };

let _initialized = false;

/**
 * Initialize the wallet kit with all three supported wallets (idempotent).
 */
export function initWalletKit() {
  if (_initialized) return;
  StellarWalletsKit.init({
    network: Networks.TESTNET,
    modules: [
      new FreighterModule(),
      new xBullModule(),
      new LobstrModule(),
    ],
  });
  _initialized = true;
}

/**
 * Open the SWK auth modal and wait for the user to connect a wallet.
 * Resolves with { address } on success, rejects on cancel/error.
 *
 * Error codes:
 *  -1 = user closed modal (not installed or dismissed)
 *  -3 = no wallet set
 *
 * @returns {Promise<{ address: string }>}
 */
export async function connectWallet() {
  initWalletKit();
  const { address } = await StellarWalletsKit.authModal();
  const mod = StellarWalletsKit.selectedModule;
  return { 
    address, 
    walletName: mod?.productName || 'Wallet', 
    walletIcon: mod?.productIcon || '' 
  };
}

/**
 * Get the active connected address from kit memory.
 * Throws { code: -1 } if no wallet is connected.
 *
 * @returns {Promise<string>}
 */
export async function getAddress() {
  const { address } = await StellarWalletsKit.getAddress();
  return address;
}

/**
 * Sign a transaction XDR using the currently active wallet module.
 *
 * @param {{ xdr: string, networkPassphrase: string, address: string }} params
 * @returns {Promise<{ signedTxXdr: string }>}
 */
export async function signTransaction(params) {
  return StellarWalletsKit.signTransaction(params.xdr, {
    networkPassphrase: params.networkPassphrase,
    address: params.address,
  });
}

/**
 * Disconnect the active wallet and reset kit state.
 */
export async function disconnectWallet() {
  try {
    await StellarWalletsKit.disconnect();
  } catch {
    // ignore if nothing was connected
  }
  _initialized = false;
}

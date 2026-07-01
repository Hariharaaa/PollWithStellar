import * as StellarSdk from '@stellar/stellar-sdk';

// ── Configuration ─────────────────────────────────────────────────────────────
// CONTRACT_ID is injected after deployment. Replace PLACEHOLDER with real ID.
export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || 'PLACEHOLDER_CONTRACT_ID';
export const NETWORK = 'testnet';
export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
export const RPC_URL = 'https://soroban-testnet.stellar.org';
export const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet';

// ── RPC client ────────────────────────────────────────────────────────────────
let _server = null;
function getServer() {
  if (!_server) {
    _server = new StellarSdk.rpc.Server(RPC_URL, { allowHttp: false });
  }
  return _server;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function scValToNative(val) {
  return StellarSdk.scValToNative(val);
}

// ── getResults ────────────────────────────────────────────────────────────────
/**
 * Simulate get_results() on the contract and parse the response.
 * Returns { question: string, options: string[], voteCounts: number[] }
 */
export async function getResults() {
  const server = getServer();
  const contract = new StellarSdk.Contract(CONTRACT_ID);

  const account = new StellarSdk.Account(
    'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
    '0'
  );

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('get_results'))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);

  if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  // The result is a struct — parse the XDR return value
  const retVal = simResult.result?.retval;
  if (!retVal) throw new Error('No return value from get_results simulation');

  const native = scValToNative(retVal);

  // native is an object with keys: question, options, vote_counts
  return {
    question: native.question,
    options: Array.from(native.options),
    voteCounts: Array.from(native.vote_counts).map(Number),
  };
}

// ── hasVoted ──────────────────────────────────────────────────────────────────
/**
 * Check whether a given address has already voted.
 * @param {string} address - Stellar public key
 * @returns {Promise<boolean>}
 */
export async function hasVoted(address) {
  const server = getServer();
  const contract = new StellarSdk.Contract(CONTRACT_ID);

  const account = new StellarSdk.Account(address, '0');

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'has_voted',
        StellarSdk.Address.fromString(address).toScVal()
      )
    )
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);

  if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
    // If poll not initialized or address never voted, return false
    return false;
  }

  const retVal = simResult.result?.retval;
  if (!retVal) return false;
  return scValToNative(retVal) === true;
}

// ── castVote ──────────────────────────────────────────────────────────────────
/**
 * Build, sign (via signTx callback), and submit a vote transaction.
 * @param {string} voterAddress - Stellar public key
 * @param {number} optionIndex - 0-indexed option to vote for
 * @param {(xdr: string) => Promise<{signedTxXdr: string}>} signTx - from StellarWalletsKit
 * @param {(status: string) => void} onStatus - status callback
 * @returns {Promise<string>} transaction hash
 */
export async function castVote(voterAddress, optionIndex, signTx, onStatus) {
  const server = getServer();
  const contract = new StellarSdk.Contract(CONTRACT_ID);

  onStatus('Preparing');

  // Load real account sequence
  const accountData = await server.getAccount(voterAddress);
  const account = new StellarSdk.Account(voterAddress, accountData.sequence);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: '100000', // 0.01 XLM — generous for Soroban
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'vote',
        StellarSdk.Address.fromString(voterAddress).toScVal(),
        StellarSdk.nativeToScVal(optionIndex, { type: 'u32' })
      )
    )
    .setTimeout(60)
    .build();

  // Simulate to get footprint
  const simResult = await server.simulateTransaction(tx);
  if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
    const msg = simResult.error || 'Simulation error';
    if (msg.includes('already voted')) throw new Error('already voted');
    throw new Error(msg);
  }

  // Assemble with footprint
  const preparedTx = StellarSdk.rpc.assembleTransaction(tx, simResult).build();

  onStatus('Signing');

  // Sign via wallet
  const { signedTxXdr } = await signTx({
    xdr: preparedTx.toXDR(),
    networkPassphrase: NETWORK_PASSPHRASE,
    address: voterAddress,
  });

  onStatus('Submitting');

  // Submit
  const submitResult = await server.sendTransaction(
    StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE)
  );

  if (submitResult.status === 'ERROR') {
    throw new Error(submitResult.errorResult?.result().toString() || 'Submit failed');
  }

  const txHash = submitResult.hash;
  onStatus('Pending');

  // Poll for confirmation (up to 60s)
  const start = Date.now();
  while (Date.now() - start < 60_000) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusResp = await server.getTransaction(txHash);
    if (statusResp.status === 'SUCCESS') {
      onStatus('Success');
      return txHash;
    }
    if (statusResp.status === 'FAILED') {
      throw new Error(`Transaction failed: ${statusResp.resultXdr}`);
    }
  }

  throw new Error('Transaction timed out waiting for confirmation');
}

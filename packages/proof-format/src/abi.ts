/**
 * Canonical ABI serialization (ADR-0001, cross-language binding).
 *
 * Registry public-input anchoring is defined as
 *
 *     publicInputHash = keccak256(abi.encode(uint256[] publicInputs))   [Solidity]
 *
 * This module is the single shared implementation of that encoding for every
 * non-Solidity consumer (engine, CLI, tooling, integration harness). It MUST
 * byte-for-byte match what Solidity's `abi.encode` produces for a dynamic
 * `uint256[]`: one 32-byte offset word (`0x20`), one 32-byte length word,
 * then N left-padded 32-byte value words. Every word is 32 bytes wide —
 * never the 1-byte shortcut `0x20` — or the digest silently diverges from
 * the chain's.
 */

import { bytesToHex } from '@noble/hashes/utils';
import { keccak_256 } from '@noble/hashes/sha3';

/** Big-endian left-padded 32-byte word (64 hex chars). */
function word(v: bigint | number | string): string {
  const hex = BigInt(v).toString(16);
  if (hex.length > 64) throw new RangeError(`value too large for uint256 word: ${hex}`);
  return '0'.repeat(64 - hex.length) + hex;
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/**
 * ABI-encode a dynamic `uint256[]`. Returns the same hex as Solidity's
 * `abi.encode(uint256[] memory)` — offset word, length word, value words.
 */
export function encodePublicInputValues(values: readonly (bigint | number | string)[]): string {
  return `0x${word(0x20)}${word(values.length)}${values.map(word).join('')}`;
}

/**
 * Canonical public-input anchor: keccak256 of the ABI encoding.
 * MUST equal Solidity `keccak256(abi.encode(publicInputs))`.
 */
export function publicInputHash(values: readonly (bigint | number | string)[]): string {
  return `0x${bytesToHex(keccak_256(hexToBytes(encodePublicInputValues(values).slice(2))))}`;
}

/**
 * Canonical bytes32 rendering of a circuitId — the exact value produced by
 * Solidity's `bytes32("poseidon-preimage")` (left-aligned string bytes,
 * right-padded with zero bytes, 32 bytes total).
 */
export function circuitIdBytes32(circuitId: string): string {
  const encoded = new TextEncoder().encode(circuitId);
  if (encoded.length > 32) throw new RangeError(`circuitId longer than 32 bytes: ${circuitId}`);
  return `0x${bytesToHex(encoded).padEnd(64, '0')}`;
}
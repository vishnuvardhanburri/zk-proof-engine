/**
 * Canonical ABI encoding regression (TypeScript side).
 *
 * Asserts proof-format's `encodePublicInputValues` / `publicInputHash`
 * byte-for-byte against `contracts/test/fixtures/canonical-vectors.json` —
 * the spec file generated from Solidity's own `abi.encode` output. The
 * Solidity counterpart (`contracts/test/CanonicalHash.t.sol`) asserts the
 * same file, so a divergence between languages fails one side or the other.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { circuitIdBytes32, encodePublicInputValues, publicInputHash } from '../src/abi.js';

interface Vector {
  label: string;
  values: string[];
  enc: string;
  hash: string;
}

const specUrl = new URL('../../../contracts/test/fixtures/canonical-vectors.json', import.meta.url);
const spec = JSON.parse(readFileSync(specUrl, 'utf8')) as { vectors: Vector[] };

describe('circuitIdBytes32 (Solidity bytes32 string cast equivalence)', () => {
  it('right-pads like bytes32("poseidon-preimage")', () => {
    expect(circuitIdBytes32('poseidon-preimage')).toBe(
      '0x706f736569646f6e2d707265696d616765000000000000000000000000000000',
    );
  });

  it('rejects circuitIds longer than 32 bytes', () => {
    expect(() => circuitIdBytes32('x'.repeat(33))).toThrow(RangeError);
  });
});

describe('canonical ABI public-input encoding (Solidity ground truth)', () => {
  for (const v of spec.vectors) {
    it(`encodes ${v.label} byte-identically to abi.encode`, () => {
      expect(encodePublicInputValues(v.values)).toBe(v.enc);
    });

    it(`hashes ${v.label} to the Solidity anchor`, () => {
      expect(publicInputHash(v.values)).toBe(v.hash);
    });
  }
});
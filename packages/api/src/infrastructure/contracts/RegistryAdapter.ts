/**
 * Registry adapter — ethers v5 over the *compiled* ABI artifact
 * (contracts/out/ZKVerifierRegistry.sol/ZKVerifierRegistry.json). Implements
 * the registry read/write ports (§20). All BYTES32 arguments and the public
 * anchor come from proof-format — this class never hashes, ABI-encodes, or
 * does field math.
 */

import { readFileSync } from 'node:fs';
import { ethers } from 'ethers';
import { circuitIdBytes32 } from '@zkpe/proof-format';
import type { Groth16Proof } from '@zkpe/proof-format';
import type { ChainCircuitConfig, ProofStatusEntry, RegistryInfo } from '../../domain/entities.js';
import { DomainError } from '../../domain/errors.js';
import type { RegistryWritePort, TracerPort } from '../../domain/ports.js';
import { findRepoRoot, registryAbiPath } from '../util/paths.js';

export interface RegistryAdapterConfig {
  rpcUrl: string;
  proxy?: string;
  privateKey?: string;
  abiPath?: string;
}

export class RegistryAdapter {
  private readonly provider: ethers.providers.JsonRpcProvider;
  private readonly proxy: string | null;
  private readonly abi: ethers.ContractInterface;
  private readonly write: RegistryWritePort | null;

  constructor(cfg: RegistryAdapterConfig, private readonly tracer: TracerPort) {
    if (!cfg.rpcUrl) throw new DomainError('INTERNAL', { detail: 'RegistryAdapter requires rpcUrl' });
    this.provider = new ethers.providers.JsonRpcProvider(cfg.rpcUrl);
    this.proxy = cfg.proxy ? cfg.proxy.toLowerCase() : null;
    const abiPath = cfg.abiPath ?? registryAbiPath(findRepoRoot(import.meta.url));
    this.abi = JSON.parse(readFileSync(abiPath, 'utf8')).abi as ethers.ContractInterface;
    this.write =
      this.proxy && cfg.privateKey
        ? new WriteRegistry(this.provider, this.proxy, this.abi, cfg.privateKey, tracer)
        : null;
  }

  hasWrite(): boolean {
    return this.write !== null;
  }

  writer(): RegistryWritePort | null {
    return this.write;
  }

  private contract(): ethers.Contract {
    if (!this.proxy) throw new DomainError('OUT-OF-SERVICE', { detail: 'registry proxy not configured' });
    return new ethers.Contract(this.proxy, this.abi, this.provider);
  }

  async getCircuit(circuitId: string): Promise<ChainCircuitConfig | null> {
    const span = this.tracer.startSpan('registry.getCircuit', { circuitId });
    try {
      const [verifier, vkHashRaw, active] = await this.contract().circuits(circuitIdBytes32(circuitId));
      if (verifier === ethers.constants.AddressZero) return null;
      const vkHash = String(vkHashRaw).toLowerCase();
      return {
        verifier: String(verifier).toLowerCase(),
        vkHash: ethers.utils.hexZeroPad(vkHash, 32),
        active: Boolean(active),
      };
    } finally {
      span.end();
    }
  }

  async getProofStatus(circuitId: string, anchorHex: string): Promise<ProofStatusEntry> {
    const span = this.tracer.startSpan('registry.getProofStatus');
    try {
      const [status, provedAt] = await this.contract().getProofStatus(
        circuitIdBytes32(circuitId),
        anchorHex,
      );
      return {
        status: Number(status) === 1 ? 'proved' : Number(status) === 2 ? 'revoked' : 'unproved',
        provedAt: provedAt.toString(),
      };
    } finally {
      span.end();
    }
  }

  async registryInfo(circuitIds: string[]): Promise<RegistryInfo> {
    const span = this.tracer.startSpan('registry.registryInfo');
    try {
      const c = this.contract();
      const [schemaVersion, totalProofs, paused] = await Promise.all([
        c.getSchemaVersion(),
        c.totalProofs(),
        c.paused(),
      ]);
      const circuits: RegistryInfo['circuits'] = {};
      for (const id of circuitIds) {
        const cfg = await this.getCircuit(id).catch(() => null);
        if (cfg) circuits[id] = cfg;
      }
      return {
        proxy: this.proxy ?? '',
        schemaVersion: schemaVersion.toString(),
        totalProofs: totalProofs.toString(),
        paused: Boolean(paused),
        circuits,
      };
    } finally {
      span.end();
    }
  }

  async healthy(): Promise<boolean> {
    if (!this.proxy) return false;
    try {
      await this.contract().getSchemaVersion();
      return true;
    } catch {
      return false;
    }
  }
}

class WriteRegistry implements RegistryWritePort {
  private readonly contract: ethers.Contract;

  constructor(
    provider: ethers.providers.JsonRpcProvider,
    proxy: string,
    abi: ethers.ContractInterface,
    privateKey: string,
    private readonly tracer: TracerPort,
  ) {
    this.contract = new ethers.Contract(proxy, abi, new ethers.Wallet(privateKey, provider));
  }

  async registerProof(circuitId: string, proof: Groth16Proof, publicInputs: string[]): Promise<{ txHash: string }> {
    const span = this.tracer.startSpan('registry.registerProof', { circuitId });
    try {
      const [verifier, vkHash] = await this.contract.circuits(circuitIdBytes32(circuitId));
      if (verifier === ethers.constants.AddressZero) {
        throw new Error(`circuit ${circuitId} not registered on-chain`);
      }
      const vkHashHex = ethers.utils.hexZeroPad(String(vkHash).toLowerCase(), 32);
      const a = proof.pi_a.slice(0, 2).map((n) => ethers.BigNumber.from(n));
      // snarkjs serializes the G2 Fp2 coefficients imaginary-first; the
      // snarkjs-generated Verifier.sol expects real-first — swap each pair.
      const b = proof.pi_b.slice(0, 2).map((row: [string, string]) => [row[1], row[0]].map((n) => ethers.BigNumber.from(n)));
      const c = proof.pi_c.slice(0, 2).map((n) => ethers.BigNumber.from(n));

      const tx = await this.contract.registerProof(
        circuitIdBytes32(circuitId),
        vkHashHex,
        a,
        b,
        c,
        publicInputs.map((n) => ethers.BigNumber.from(n)),
      );
      await tx.wait(1);
      span.setAttributes({ txHash: tx.hash });
      span.ok('registered');
      return { txHash: tx.hash };
    } finally {
      span.end();
    }
  }
}
import { VK_TREE_HEIGHT } from '@aztec/constants';
import { makeTuple } from '@aztec/foundation/array';
import { Fr } from '@aztec/foundation/fields';
import { BufferReader, type Tuple, serializeToBuffer } from '@aztec/foundation/serialize';

import type { UInt32 } from '../types/shared.js';
import { VerificationKeyData } from '../vks/verification_key.js';
import { PrivateKernelCircuitPublicInputs } from './private_kernel_circuit_public_inputs.js';

/**
 * Data of the previous kernel iteration in the chain of kernels.
 */
export class PrivateKernelData {
  // NOTE: as of move to honk and client IVC, previous private kernels no longer come with their proof
  // as we do client IVC not recursive verification. We need to ensure the public inputs here is properly constrained, TODO(https://github.com/AztecProtocol/barretenberg/issues/1048)
  constructor(
    /**
     * Public inputs of the previous kernel.
     */
    public publicInputs: PrivateKernelCircuitPublicInputs,
    /**
     * Verification key of the previous kernel.
     */
    public verificationKey: VerificationKeyData,
    /**
     * Index of the previous kernel's vk in a tree of vks.
     */
    public vkIndex: UInt32,
    /**
     * Sibling path of the previous kernel's vk in a tree of vks.
     */
    public vkPath: Tuple<Fr, typeof VK_TREE_HEIGHT>,
  ) {}

  /**
   * Serialize this as a buffer.
   * @returns The buffer.
   */
  toBuffer() {
    return serializeToBuffer(this.publicInputs, this.verificationKey, this.vkIndex, this.vkPath);
  }

  static fromBuffer(buffer: Buffer | BufferReader): PrivateKernelData {
    const reader = BufferReader.asReader(buffer);
    return new this(
      reader.readObject(PrivateKernelCircuitPublicInputs),
      reader.readObject(VerificationKeyData),
      reader.readNumber(),
      reader.readArray(VK_TREE_HEIGHT, Fr),
    );
  }

  static empty(): PrivateKernelData {
    return new PrivateKernelData(
      PrivateKernelCircuitPublicInputs.empty(),
      VerificationKeyData.empty(),
      0,
      makeTuple(VK_TREE_HEIGHT, Fr.zero),
    );
  }
}

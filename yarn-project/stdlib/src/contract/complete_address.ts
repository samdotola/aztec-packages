import { Fr } from '@aztec/foundation/fields';
import { hexSchemaFor } from '@aztec/foundation/schemas';
import { BufferReader, serializeToBuffer } from '@aztec/foundation/serialize';
import { bufferToHex } from '@aztec/foundation/string';

import { AztecAddress } from '../aztec-address/index.js';
import { computeAddress, computePreaddress, deriveKeys } from '../keys/index.js';
import { PublicKeys } from '../keys/public_keys.js';
import { computePartialAddress } from './contract_address.js';
import type { PartialAddress } from './partial_address.js';

/**
 * A complete address is a combination of an Aztec address, a public key and a partial address.
 *
 * @remarks We have introduced this type because it is common that these 3 values are used together. They are commonly
 *          used together because it is the information needed to send user a note.
 * @remarks See the link below for details about how address is computed:
 *          https://github.com/AztecProtocol/aztec-packages/blob/master/docs/docs/concepts/foundation/accounts/keys.md#addresses-partial-addresses-and-public-keys
 */
export class CompleteAddress {
  private constructor(
    /** Contract address (typically of an account contract) */
    public address: AztecAddress,
    /** User public keys */
    public publicKeys: PublicKeys,
    /** Partial key corresponding to the public key to the address. */
    public partialAddress: PartialAddress,
  ) {}

  static async create(
    address: AztecAddress,
    publicKeys: PublicKeys,
    partialAddress: PartialAddress,
  ): Promise<CompleteAddress> {
    const completeAddress = new CompleteAddress(address, publicKeys, partialAddress);
    await completeAddress.validate();
    return completeAddress;
  }

  /** Size in bytes of an instance */
  static readonly SIZE_IN_BYTES = 32 * 10;

  static get schema() {
    return hexSchemaFor(CompleteAddress);
  }

  toJSON() {
    return this.toString();
  }

  static async random(): Promise<CompleteAddress> {
    return await this.fromSecretKeyAndPartialAddress(Fr.random(), Fr.random());
  }

  static async fromSecretKeyAndPartialAddress(secretKey: Fr, partialAddress: Fr): Promise<CompleteAddress> {
    const { publicKeys } = await deriveKeys(secretKey);
    const address = await computeAddress(publicKeys, partialAddress);

    return new CompleteAddress(address, publicKeys, partialAddress);
  }

  async getPreaddress() {
    return computePreaddress(await this.publicKeys.hash(), this.partialAddress);
  }

  static async fromSecretKeyAndInstance(
    secretKey: Fr,
    instance: Parameters<typeof computePartialAddress>[0],
  ): Promise<CompleteAddress> {
    const partialAddress = await computePartialAddress(instance);
    return CompleteAddress.fromSecretKeyAndPartialAddress(secretKey, partialAddress);
  }

  /** Throws if the address is not correctly derived from the public key and partial address.*/
  public async validate() {
    const expectedAddress = await computeAddress(this.publicKeys, this.partialAddress);

    if (!expectedAddress.equals(this.address)) {
      throw new Error(
        `Address cannot be derived from public keys and partial address (received ${this.address.toString()}, derived ${expectedAddress.toString()})`,
      );
    }
  }

  /**
   * Gets a readable string representation of the complete address.
   * @returns A readable string representation of the complete address.
   */
  public toReadableString(): string {
    return `Address: ${this.address.toString()}\nMaster Nullifier Public Key: ${this.publicKeys.masterNullifierPublicKey.toString()}\nMaster Incoming Viewing Public Key: ${this.publicKeys.masterIncomingViewingPublicKey.toString()}\nMaster Outgoing Viewing Public Key: ${this.publicKeys.masterOutgoingViewingPublicKey.toString()}\nMaster Tagging Public Key: ${this.publicKeys.masterTaggingPublicKey.toString()}\nPartial Address: ${this.partialAddress.toString()}\n`;
  }

  /**
   * Determines if this CompleteAddress instance is equal to the given CompleteAddress instance.
   * Equality is based on the content of their respective buffers.
   *
   * @param other - The CompleteAddress instance to compare against.
   * @returns True if the buffers of both instances are equal, false otherwise.
   */
  equals(other: CompleteAddress): boolean {
    return (
      this.address.equals(other.address) &&
      this.publicKeys.equals(other.publicKeys) &&
      this.partialAddress.equals(other.partialAddress)
    );
  }

  /**
   * Converts the CompleteAddress instance into a Buffer.
   * This method should be used when encoding the address for storage, transmission or serialization purposes.
   *
   * @returns A Buffer representation of the CompleteAddress instance.
   */
  toBuffer(): Buffer {
    return serializeToBuffer([this.address, this.publicKeys, this.partialAddress]);
  }

  /**
   * Creates an CompleteAddress instance from a given buffer or BufferReader.
   * If the input is a Buffer, it wraps it in a BufferReader before processing.
   * Throws an error if the input length is not equal to the expected size.
   *
   * @param buffer - The input buffer or BufferReader containing the address data.
   * @returns - A new CompleteAddress instance with the extracted address data.
   */
  static fromBuffer(buffer: Buffer | BufferReader): Promise<CompleteAddress> {
    const reader = BufferReader.asReader(buffer);
    const address = reader.readObject(AztecAddress);
    const publicKeys = reader.readObject(PublicKeys);
    const partialAddress = reader.readObject(Fr);
    return CompleteAddress.create(address, publicKeys, partialAddress);
  }

  /**
   * Create a CompleteAddress instance from a hex-encoded string.
   * The input 'address' should be prefixed with '0x' or not, and have exactly 128 hex characters representing the x and y coordinates.
   * Throws an error if the input length is invalid or coordinate values are out of range.
   *
   * @param address - The hex-encoded string representing the complete address.
   * @returns A Point instance.
   */
  static fromString(address: string): Promise<CompleteAddress> {
    return CompleteAddress.fromBuffer(Buffer.from(address.replace(/^0x/i, ''), 'hex'));
  }

  /**
   * Convert the CompleteAddress to a hexadecimal string representation, with a "0x" prefix.
   * The resulting string will have a length of 66 characters (including the prefix).
   *
   * @returns A hexadecimal string representation of the CompleteAddress.
   */
  toString(): string {
    return bufferToHex(this.toBuffer());
  }
}

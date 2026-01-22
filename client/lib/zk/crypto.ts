// ZK Cryptographic utilities for PRAXIS
// Uses browser-native crypto for real cryptographic operations

/**
 * Convert a hex string to bytes
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Convert bytes to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * SHA-256 hash using browser crypto
 */
export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hashBuffer);
}

/**
 * Poseidon-like hash (simplified for browser - uses SHA-256 as base)
 * In production, this would use actual Poseidon implementation
 */
export async function poseidonHash(inputs: bigint[]): Promise<bigint> {
  // Concatenate inputs as 32-byte big-endian values
  const data = new Uint8Array(inputs.length * 32);
  for (let i = 0; i < inputs.length; i++) {
    const bytes = bigintToBytes32(inputs[i]);
    data.set(bytes, i * 32);
  }

  const hash = await sha256(data);
  return bytes32ToBigint(hash);
}

/**
 * Convert bigint to 32 bytes (big-endian)
 */
export function bigintToBytes32(value: bigint): Uint8Array {
  const bytes = new Uint8Array(32);
  let v = value;
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return bytes;
}

/**
 * Convert 32 bytes to bigint (big-endian)
 */
export function bytes32ToBigint(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let i = 0; i < 32; i++) {
    result = (result << 8n) | BigInt(bytes[i]);
  }
  return result;
}

/**
 * Generate a random field element (256-bit)
 */
export function randomFieldElement(): bigint {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytes32ToBigint(bytes);
}

/**
 * Compute Merkle root from leaves
 */
export async function computeMerkleRoot(leaves: bigint[]): Promise<bigint> {
  if (leaves.length === 0) return 0n;
  if (leaves.length === 1) return leaves[0];

  // Pad to power of 2
  const paddedLeaves = [...leaves];
  while (paddedLeaves.length & (paddedLeaves.length - 1)) {
    paddedLeaves.push(0n);
  }

  let currentLevel = paddedLeaves;
  while (currentLevel.length > 1) {
    const nextLevel: bigint[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const hash = await poseidonHash([currentLevel[i], currentLevel[i + 1]]);
      nextLevel.push(hash);
    }
    currentLevel = nextLevel;
  }

  return currentLevel[0];
}

/**
 * Generate Merkle proof for a leaf
 */
export async function generateMerkleProof(
  leaves: bigint[],
  leafIndex: number
): Promise<{ path: bigint[]; indices: boolean[] }> {
  if (leaves.length === 0 || leafIndex >= leaves.length) {
    return { path: [], indices: [] };
  }

  // Pad to power of 2
  const paddedLeaves = [...leaves];
  while (paddedLeaves.length & (paddedLeaves.length - 1)) {
    paddedLeaves.push(0n);
  }

  const path: bigint[] = [];
  const indices: boolean[] = [];
  let currentIndex = leafIndex;
  let currentLevel = paddedLeaves;

  while (currentLevel.length > 1) {
    const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
    path.push(currentLevel[siblingIndex] || 0n);
    indices.push(currentIndex % 2 === 1); // true if we're on the right

    // Build next level
    const nextLevel: bigint[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const hash = await poseidonHash([currentLevel[i], currentLevel[i + 1] || 0n]);
      nextLevel.push(hash);
    }
    currentLevel = nextLevel;
    currentIndex = Math.floor(currentIndex / 2);
  }

  return { path, indices };
}

/**
 * Verify a Merkle proof
 */
export async function verifyMerkleProof(
  leaf: bigint,
  root: bigint,
  path: bigint[],
  indices: boolean[]
): Promise<boolean> {
  let current = leaf;

  for (let i = 0; i < path.length; i++) {
    if (indices[i]) {
      // Current is on the right
      current = await poseidonHash([path[i], current]);
    } else {
      // Current is on the left
      current = await poseidonHash([current, path[i]]);
    }
  }

  return current === root;
}

/**
 * Convert an Ethereum address to a field element
 */
export function addressToField(address: string): bigint {
  const cleanAddress = address.toLowerCase().startsWith("0x")
    ? address.slice(2)
    : address;
  return BigInt("0x" + cleanAddress);
}

/**
 * Generate a commitment (hash of multiple values)
 */
export async function generateCommitment(values: bigint[]): Promise<bigint> {
  return poseidonHash(values);
}

/**
 * Pedersen-like commitment (simplified)
 * C = H(value || blinding)
 */
export async function pedersenCommit(
  value: bigint,
  blinding: bigint
): Promise<bigint> {
  return poseidonHash([value, blinding]);
}

/**
 * Verify a Pedersen commitment
 */
export async function verifyPedersenCommit(
  commitment: bigint,
  value: bigint,
  blinding: bigint
): Promise<boolean> {
  const computed = await poseidonHash([value, blinding]);
  return computed === commitment;
}

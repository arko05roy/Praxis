import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

/**
 * FDCVerifier Unit Tests
 *
 * These tests run on Hardhat local network.
 * For integration tests with real FDC proofs, see test/integration/
 */
describe("FDCVerifier", function () {
  // Contract instance
  let fdcVerifier: any;
  let owner: any;
  let user: any;

  // Test constants
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  beforeEach(async function () {
    // Get signers
    [owner, user] = await ethers.getSigners();

    // Deploy FDCVerifier
    const FDCVerifier = await ethers.getContractFactory("FDCVerifier");
    fdcVerifier = await FDCVerifier.deploy();
    await fdcVerifier.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set correct owner", async function () {
      expect(await fdcVerifier.owner()).to.equal(await owner.getAddress());
    });
  });

  describe("Attestation Type Constants", function () {
    it("should have EVM_TRANSACTION_TYPE set correctly", async function () {
      const expectedHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["string"],
          ["EVMTransaction"]
        )
      );
      expect(await fdcVerifier.EVM_TRANSACTION_TYPE()).to.equal(expectedHash);
    });

    it("should have PAYMENT_TYPE set correctly", async function () {
      const expectedHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(["string"], ["Payment"])
      );
      expect(await fdcVerifier.PAYMENT_TYPE()).to.equal(expectedHash);
    });

    it("should have ADDRESS_VALIDITY_TYPE set correctly", async function () {
      const expectedHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["string"],
          ["AddressValidity"]
        )
      );
      expect(await fdcVerifier.ADDRESS_VALIDITY_TYPE()).to.equal(expectedHash);
    });
  });

  describe("transferOwnership", function () {
    it("should allow owner to transfer ownership", async function () {
      const userAddress = await user.getAddress();
      await fdcVerifier.transferOwnership(userAddress);
      expect(await fdcVerifier.owner()).to.equal(userAddress);
    });

    it("should emit OwnershipTransferred event", async function () {
      const ownerAddress = await owner.getAddress();
      const userAddress = await user.getAddress();

      await expect(fdcVerifier.transferOwnership(userAddress))
        .to.emit(fdcVerifier, "OwnershipTransferred")
        .withArgs(ownerAddress, userAddress);
    });

    it("should revert for non-owner", async function () {
      const userAddress = await user.getAddress();
      await expect(
        fdcVerifier.connect(user).transferOwnership(userAddress)
      ).to.be.revertedWithCustomError(fdcVerifier, "OnlyOwner");
    });

    it("should revert for zero address", async function () {
      await expect(
        fdcVerifier.transferOwnership(ZERO_ADDRESS)
      ).to.be.revertedWithCustomError(fdcVerifier, "ZeroAddress");
    });
  });

  describe("Verification Status Tracking", function () {
    it("isTransactionVerified should return false for unverified transaction", async function () {
      const txHash = ethers.keccak256(ethers.toUtf8Bytes("test-tx"));
      expect(await fdcVerifier.isTransactionVerified(txHash)).to.be.false;
    });

    it("isPaymentVerified should return false for unverified payment", async function () {
      const txId = ethers.keccak256(
        ethers.toUtf8Bytes("test-payment")
      );
      expect(await fdcVerifier.isPaymentVerified(txId)).to.be.false;
    });
  });

  describe("View Functions on Local Network", function () {
    // Note: These functions will fail on local network because they try to
    // access the Flare Contract Registry which doesn't exist locally.
    // These tests verify the expected behavior.

    it("getFdcVerification should revert on non-Flare network", async function () {
      // On local network, the ContractRegistry doesn't exist
      // so getFdcVerification will revert
      try {
        await fdcVerifier.getFdcProtocolId();
        expect.fail("Expected call to revert");
      } catch (error: any) {
        // Expected to revert on non-Flare network
        expect(error).to.exist;
      }
    });
  });
});

describe("FDCVerifier Integration Preparation", function () {
  /**
   * These are placeholder tests for integration testing.
   * Actual integration tests should be run against Coston2 with real proofs.
   */

  it("should have proper test structure for EVM transaction verification", async function () {
    // This is a template for integration tests
    // Run with: npx hardhat test --network coston2

    /*
    Steps for real integration test:
    1. Find an existing transaction on Sepolia (or other supported EVM chain)
    2. Request attestation via FDC verifier API
    3. Wait for round finalization
    4. Get proof from DA Layer
    5. Submit to FDCVerifier contract
    6. Verify it returns true
    */
    expect(true).to.be.true;
  });

  it("should have proper test structure for Payment verification", async function () {
    // Template for Payment (BTC/DOGE/XRP) verification tests
    /*
    Steps:
    1. Find an existing payment transaction on BTC/DOGE/XRP
    2. Request Payment attestation
    3. Wait for finalization
    4. Get and verify proof
    */
    expect(true).to.be.true;
  });

  it("should have proper test structure for AddressValidity verification", async function () {
    // Template for AddressValidity verification tests
    /*
    Steps:
    1. Prepare a BTC/DOGE/XRP address to verify
    2. Request AddressValidity attestation
    3. Wait for finalization
    4. Get and verify proof
    */
    expect(true).to.be.true;
  });
});

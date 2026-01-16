import { expect } from "chai";
import { network } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = await network.connect();

/**
 * ExposureManager Comprehensive Test Suite
 *
 * This test suite exhaustively validates the ExposureManager contract which:
 * - Tracks and limits exposure to individual assets
 * - Prevents concentration risk by limiting any single asset to 30% of vault
 * - Supports custom per-asset exposure limits
 * - Works with ExecutionVault and ExecutionController
 *
 * Tests run against Flare mainnet fork to ensure realistic environment.
 *
 * ADVERSARIAL APPROACH:
 * - Every public/external function is tested for access control bypass
 * - Boundary conditions (0%, 30%, 100%) are explicitly tested
 * - Arithmetic edge cases (overflow, underflow, division by zero) are probed
 * - State consistency is verified after every mutation
 * - Ordering attacks and interaction effects are explored
 * - Unexpected caller sequences are tested
 */
describe("ExposureManager", function () {
  this.timeout(120000);

  // Contract instances
  let exposureManager: any;
  let executionVault: any;
  let mockUsdc: any;

  // Signers
  let owner: SignerWithAddress;
  let controller: SignerWithAddress;
  let nonOwner: SignerWithAddress;
  let attacker: SignerWithAddress;

  // Test asset addresses (simulated)
  let assetA: SignerWithAddress;
  let assetB: SignerWithAddress;
  let assetC: SignerWithAddress;

  // Constants matching contract
  const BPS = 10000n;
  const DEFAULT_MAX_SINGLE_ASSET_BPS = 3000n; // 30%
  const ONE_USD = 10n ** 6n; // Assuming 6 decimals for USD amounts
  const MILLION_USD = 1_000_000n * ONE_USD;
  const TOTAL_VAULT_ASSETS = 1_000_000n * ONE_USD; // $1M total vault

  before(async function () {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    if (chainId !== 14n) {
      console.log(`Skipping - not on Flare fork (chainId: ${chainId})`);
      this.skip();
    }

    [owner, controller, nonOwner, attacker, assetA, assetB, assetC] = await ethers.getSigners();
    console.log(`Test owner: ${await owner.getAddress()}`);
    console.log(`Controller: ${await controller.getAddress()}`);
  });

  beforeEach(async function () {
    // Deploy MockERC20 for vault base asset
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUsdc = await MockERC20.deploy("Mock USDC", "mUSDC", 6);
    await mockUsdc.waitForDeployment();

    // Deploy ExecutionVault (dependency for ExposureManager)
    const ExecutionVault = await ethers.getContractFactory("ExecutionVault");
    executionVault = await ExecutionVault.deploy(
      await mockUsdc.getAddress(),
      "PRAXIS LP Token",
      "pxLP"
    );
    await executionVault.waitForDeployment();

    // Deploy ExposureManager
    const ExposureManager = await ethers.getContractFactory("ExposureManager");
    exposureManager = await ExposureManager.deploy(await executionVault.getAddress());
    await exposureManager.waitForDeployment();

    // Configure: set the execution controller
    await exposureManager.setExecutionController(await controller.getAddress());
  });

  // =============================================================
  //                    DEPLOYMENT TESTS
  // =============================================================

  describe("Deployment and Initialization", function () {
    it("should deploy with correct owner", async function () {
      expect(await exposureManager.owner()).to.equal(await owner.getAddress());
    });

    it("should deploy with correct vault address", async function () {
      expect(await exposureManager.vault()).to.equal(await executionVault.getAddress());
    });

    it("should have BPS constant of 10000", async function () {
      expect(await exposureManager.BPS()).to.equal(BPS);
    });

    it("should have DEFAULT_MAX_SINGLE_ASSET_BPS of 3000 (30%)", async function () {
      expect(await exposureManager.DEFAULT_MAX_SINGLE_ASSET_BPS()).to.equal(DEFAULT_MAX_SINGLE_ASSET_BPS);
    });

    it("should initialize maxSingleAssetBps to default (3000)", async function () {
      expect(await exposureManager.maxSingleAssetBps()).to.equal(DEFAULT_MAX_SINGLE_ASSET_BPS);
    });

    it("should have zero address for execution controller initially before setting", async function () {
      // Deploy a fresh instance without setting controller
      const ExposureManager = await ethers.getContractFactory("ExposureManager");
      const freshManager = await ExposureManager.deploy(await executionVault.getAddress());
      await freshManager.waitForDeployment();

      expect(await freshManager.executionController()).to.equal(ethers.ZeroAddress);
    });

    it("should reject zero address for vault in constructor", async function () {
      const ExposureManager = await ethers.getContractFactory("ExposureManager");
      await expect(
        ExposureManager.deploy(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(exposureManager, "ZeroAddress");
    });

    it("should have no initial exposure for any asset", async function () {
      const randomAsset = ethers.Wallet.createRandom().address;
      expect(await exposureManager.assetExposure(randomAsset)).to.equal(0n);
    });

    it("should have no custom limits for any asset initially", async function () {
      const randomAsset = ethers.Wallet.createRandom().address;
      expect(await exposureManager.customAssetLimits(randomAsset)).to.equal(0n);
    });
  });

  // =============================================================
  //                  RECORD EXPOSURE TESTS
  // =============================================================

  describe("recordExposure()", function () {
    const assetAddress = () => assetA.getAddress();

    describe("Access Control", function () {
      it("should reject calls from non-controller", async function () {
        await expect(
          exposureManager.connect(nonOwner).recordExposure(
            await assetAddress(),
            100n * ONE_USD,
            TOTAL_VAULT_ASSETS
          )
        ).to.be.revertedWithCustomError(exposureManager, "OnlyController");
      });

      it("should reject calls from owner (owner is not controller)", async function () {
        // Remove controller setting to ensure owner is not controller
        const ExposureManager = await ethers.getContractFactory("ExposureManager");
        const freshManager = await ExposureManager.deploy(await executionVault.getAddress());
        await freshManager.waitForDeployment();

        await expect(
          freshManager.recordExposure(
            await assetAddress(),
            100n * ONE_USD,
            TOTAL_VAULT_ASSETS
          )
        ).to.be.revertedWithCustomError(freshManager, "OnlyController");
      });

      it("should allow calls from execution controller", async function () {
        const exposureAmount = 100_000n * ONE_USD; // 10% of $1M
        await exposureManager.connect(controller).recordExposure(
          await assetAddress(),
          exposureAmount,
          TOTAL_VAULT_ASSETS
        );

        expect(await exposureManager.assetExposure(await assetAddress())).to.equal(exposureAmount);
      });
    });

    describe("Exposure Limits Enforcement", function () {
      it("should allow exposure up to exactly 30% of vault", async function () {
        const maxExposure = (TOTAL_VAULT_ASSETS * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS;

        await exposureManager.connect(controller).recordExposure(
          await assetAddress(),
          maxExposure,
          TOTAL_VAULT_ASSETS
        );

        expect(await exposureManager.assetExposure(await assetAddress())).to.equal(maxExposure);
      });

      it("should reject exposure exceeding 30% of vault", async function () {
        const maxExposure = (TOTAL_VAULT_ASSETS * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS;
        const excessExposure = maxExposure + 1n;

        await expect(
          exposureManager.connect(controller).recordExposure(
            await assetAddress(),
            excessExposure,
            TOTAL_VAULT_ASSETS
          )
        ).to.be.revertedWithCustomError(exposureManager, "AssetExposureLimitExceeded");
      });

      it("should reject cumulative exposure exceeding 30%", async function () {
        const halfMax = (TOTAL_VAULT_ASSETS * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS / 2n;

        // First exposure: 15%
        await exposureManager.connect(controller).recordExposure(
          await assetAddress(),
          halfMax,
          TOTAL_VAULT_ASSETS
        );

        // Second exposure: 15% - total would be 30%, should succeed
        await exposureManager.connect(controller).recordExposure(
          await assetAddress(),
          halfMax,
          TOTAL_VAULT_ASSETS
        );

        expect(await exposureManager.assetExposure(await assetAddress())).to.equal(halfMax * 2n);

        // Third exposure: even 1 wei should fail
        await expect(
          exposureManager.connect(controller).recordExposure(
            await assetAddress(),
            1n,
            TOTAL_VAULT_ASSETS
          )
        ).to.be.revertedWithCustomError(exposureManager, "AssetExposureLimitExceeded");
      });

      it("should allow zero exposure recording (no-op)", async function () {
        await exposureManager.connect(controller).recordExposure(
          await assetAddress(),
          0n,
          TOTAL_VAULT_ASSETS
        );

        expect(await exposureManager.assetExposure(await assetAddress())).to.equal(0n);
      });

      it("should handle zero total vault assets (max exposure is 0)", async function () {
        // With 0 total vault assets, 30% of 0 is 0
        // Any exposure > 0 should fail
        await expect(
          exposureManager.connect(controller).recordExposure(
            await assetAddress(),
            1n,
            0n
          )
        ).to.be.revertedWithCustomError(exposureManager, "AssetExposureLimitExceeded");
      });

      it("should scale max exposure with vault size", async function () {
        const smallVault = 100_000n * ONE_USD; // $100k
        const largeVault = 10_000_000n * ONE_USD; // $10M

        const smallMax = (smallVault * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS;
        const largeMax = (largeVault * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS;

        // Small vault: max 30% of $100k = $30k
        await exposureManager.connect(controller).recordExposure(
          await assetAddress(),
          smallMax,
          smallVault
        );

        // Now if vault grows, the same exposure is still valid against larger vault
        const canAdd = await exposureManager.canAddExposure(
          await assetAddress(),
          0n,
          largeVault
        );
        expect(canAdd).to.be.true;
      });
    });

    describe("Event Emission", function () {
      it("should emit ExposureAdded event", async function () {
        const exposureAmount = 100_000n * ONE_USD;
        const asset = await assetAddress();

        await expect(
          exposureManager.connect(controller).recordExposure(
            asset,
            exposureAmount,
            TOTAL_VAULT_ASSETS
          )
        ).to.emit(exposureManager, "ExposureAdded")
          .withArgs(asset, exposureAmount, exposureAmount);
      });

      it("should emit correct total exposure in event", async function () {
        const asset = await assetAddress();
        const first = 50_000n * ONE_USD;
        const second = 100_000n * ONE_USD;

        await exposureManager.connect(controller).recordExposure(
          asset,
          first,
          TOTAL_VAULT_ASSETS
        );

        await expect(
          exposureManager.connect(controller).recordExposure(
            asset,
            second,
            TOTAL_VAULT_ASSETS
          )
        ).to.emit(exposureManager, "ExposureAdded")
          .withArgs(asset, second, first + second);
      });
    });

    describe("State Consistency", function () {
      it("should correctly accumulate exposure across multiple calls", async function () {
        const asset = await assetAddress();
        const amounts = [10_000n * ONE_USD, 20_000n * ONE_USD, 30_000n * ONE_USD];
        let totalExpected = 0n;

        for (const amount of amounts) {
          await exposureManager.connect(controller).recordExposure(
            asset,
            amount,
            TOTAL_VAULT_ASSETS
          );
          totalExpected += amount;
          expect(await exposureManager.assetExposure(asset)).to.equal(totalExpected);
        }
      });

      it("should track exposure independently per asset", async function () {
        const assetAddressA = await assetA.getAddress();
        const assetAddressB = await assetB.getAddress();

        const amountA = 100_000n * ONE_USD;
        const amountB = 200_000n * ONE_USD;

        await exposureManager.connect(controller).recordExposure(
          assetAddressA,
          amountA,
          TOTAL_VAULT_ASSETS
        );

        await exposureManager.connect(controller).recordExposure(
          assetAddressB,
          amountB,
          TOTAL_VAULT_ASSETS
        );

        expect(await exposureManager.assetExposure(assetAddressA)).to.equal(amountA);
        expect(await exposureManager.assetExposure(assetAddressB)).to.equal(amountB);
      });
    });
  });

  // =============================================================
  //                  REMOVE EXPOSURE TESTS
  // =============================================================

  describe("removeExposure()", function () {
    const assetAddress = () => assetA.getAddress();
    const initialExposure = 200_000n * ONE_USD;

    beforeEach(async function () {
      // Setup: add initial exposure
      await exposureManager.connect(controller).recordExposure(
        await assetAddress(),
        initialExposure,
        TOTAL_VAULT_ASSETS
      );
    });

    describe("Access Control", function () {
      it("should reject calls from non-controller", async function () {
        await expect(
          exposureManager.connect(nonOwner).removeExposure(
            await assetAddress(),
            50_000n * ONE_USD
          )
        ).to.be.revertedWithCustomError(exposureManager, "OnlyController");
      });

      it("should allow calls from execution controller", async function () {
        const removeAmount = 50_000n * ONE_USD;
        await exposureManager.connect(controller).removeExposure(
          await assetAddress(),
          removeAmount
        );

        expect(await exposureManager.assetExposure(await assetAddress())).to.equal(initialExposure - removeAmount);
      });
    });

    describe("Exposure Reduction", function () {
      it("should reduce exposure by exact amount", async function () {
        const removeAmount = 50_000n * ONE_USD;
        await exposureManager.connect(controller).removeExposure(
          await assetAddress(),
          removeAmount
        );

        expect(await exposureManager.assetExposure(await assetAddress())).to.equal(initialExposure - removeAmount);
      });

      it("should reduce exposure to zero", async function () {
        await exposureManager.connect(controller).removeExposure(
          await assetAddress(),
          initialExposure
        );

        expect(await exposureManager.assetExposure(await assetAddress())).to.equal(0n);
      });

      it("should handle removal greater than current exposure (clamp to 0)", async function () {
        const excessRemoval = initialExposure * 2n;
        await exposureManager.connect(controller).removeExposure(
          await assetAddress(),
          excessRemoval
        );

        // Should clamp to 0, not underflow
        expect(await exposureManager.assetExposure(await assetAddress())).to.equal(0n);
      });

      it("should handle removal from zero exposure", async function () {
        const assetWithNoExposure = await assetB.getAddress();
        await exposureManager.connect(controller).removeExposure(
          assetWithNoExposure,
          100_000n * ONE_USD
        );

        // Should remain 0
        expect(await exposureManager.assetExposure(assetWithNoExposure)).to.equal(0n);
      });

      it("should handle zero removal (no-op)", async function () {
        await exposureManager.connect(controller).removeExposure(
          await assetAddress(),
          0n
        );

        expect(await exposureManager.assetExposure(await assetAddress())).to.equal(initialExposure);
      });
    });

    describe("Event Emission", function () {
      it("should emit ExposureRemoved event", async function () {
        const removeAmount = 50_000n * ONE_USD;
        const asset = await assetAddress();

        await expect(
          exposureManager.connect(controller).removeExposure(asset, removeAmount)
        ).to.emit(exposureManager, "ExposureRemoved")
          .withArgs(asset, removeAmount, initialExposure - removeAmount);
      });

      it("should emit correct remaining exposure when clamped to zero", async function () {
        const excessRemoval = initialExposure * 2n;
        const asset = await assetAddress();

        await expect(
          exposureManager.connect(controller).removeExposure(asset, excessRemoval)
        ).to.emit(exposureManager, "ExposureRemoved")
          .withArgs(asset, excessRemoval, 0n);
      });
    });

    describe("State Consistency After Removal", function () {
      it("should allow new exposure after removal", async function () {
        // Remove all
        await exposureManager.connect(controller).removeExposure(
          await assetAddress(),
          initialExposure
        );

        // Should be able to add again
        const newExposure = 150_000n * ONE_USD;
        await exposureManager.connect(controller).recordExposure(
          await assetAddress(),
          newExposure,
          TOTAL_VAULT_ASSETS
        );

        expect(await exposureManager.assetExposure(await assetAddress())).to.equal(newExposure);
      });
    });
  });

  // =============================================================
  //                   VIEW FUNCTIONS TESTS
  // =============================================================

  describe("View Functions", function () {
    const assetAddress = () => assetA.getAddress();

    describe("canAddExposure()", function () {
      it("should return true when exposure is within limit", async function () {
        const canAdd = await exposureManager.canAddExposure(
          await assetAddress(),
          100_000n * ONE_USD,
          TOTAL_VAULT_ASSETS
        );
        expect(canAdd).to.be.true;
      });

      it("should return true when exposure is exactly at limit", async function () {
        const maxExposure = (TOTAL_VAULT_ASSETS * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS;
        const canAdd = await exposureManager.canAddExposure(
          await assetAddress(),
          maxExposure,
          TOTAL_VAULT_ASSETS
        );
        expect(canAdd).to.be.true;
      });

      it("should return false when exposure exceeds limit", async function () {
        const maxExposure = (TOTAL_VAULT_ASSETS * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS;
        const canAdd = await exposureManager.canAddExposure(
          await assetAddress(),
          maxExposure + 1n,
          TOTAL_VAULT_ASSETS
        );
        expect(canAdd).to.be.false;
      });

      it("should account for existing exposure", async function () {
        const existingExposure = 200_000n * ONE_USD;
        await exposureManager.connect(controller).recordExposure(
          await assetAddress(),
          existingExposure,
          TOTAL_VAULT_ASSETS
        );

        const maxExposure = (TOTAL_VAULT_ASSETS * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS;
        const remaining = maxExposure - existingExposure;

        expect(await exposureManager.canAddExposure(await assetAddress(), remaining, TOTAL_VAULT_ASSETS)).to.be.true;
        expect(await exposureManager.canAddExposure(await assetAddress(), remaining + 1n, TOTAL_VAULT_ASSETS)).to.be.false;
      });

      it("should return true for zero amount", async function () {
        const canAdd = await exposureManager.canAddExposure(
          await assetAddress(),
          0n,
          TOTAL_VAULT_ASSETS
        );
        expect(canAdd).to.be.true;
      });

      it("should return false for any amount when vault is empty", async function () {
        const canAdd = await exposureManager.canAddExposure(
          await assetAddress(),
          1n,
          0n
        );
        expect(canAdd).to.be.false;
      });
    });

    describe("getExposure()", function () {
      it("should return current exposure and max allowed", async function () {
        const exposure = 100_000n * ONE_USD;
        await exposureManager.connect(controller).recordExposure(
          await assetAddress(),
          exposure,
          TOTAL_VAULT_ASSETS
        );

        const [currentExposure, maxAllowed] = await exposureManager.getExposure(
          await assetAddress(),
          TOTAL_VAULT_ASSETS
        );

        expect(currentExposure).to.equal(exposure);
        expect(maxAllowed).to.equal((TOTAL_VAULT_ASSETS * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS);
      });

      it("should return zero exposure for unknown asset", async function () {
        const unknownAsset = ethers.Wallet.createRandom().address;
        const [currentExposure, maxAllowed] = await exposureManager.getExposure(
          unknownAsset,
          TOTAL_VAULT_ASSETS
        );

        expect(currentExposure).to.equal(0n);
        expect(maxAllowed).to.equal((TOTAL_VAULT_ASSETS * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS);
      });

      it("should update max allowed based on vault size", async function () {
        const [, maxSmall] = await exposureManager.getExposure(await assetAddress(), 100_000n * ONE_USD);
        const [, maxLarge] = await exposureManager.getExposure(await assetAddress(), 10_000_000n * ONE_USD);

        expect(maxLarge).to.be.gt(maxSmall);
        expect(maxSmall).to.equal((100_000n * ONE_USD * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS);
        expect(maxLarge).to.equal((10_000_000n * ONE_USD * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS);
      });
    });

    describe("getExposureUtilization()", function () {
      it("should return 0 when no exposure", async function () {
        const utilization = await exposureManager.getExposureUtilization(
          await assetAddress(),
          TOTAL_VAULT_ASSETS
        );
        expect(utilization).to.equal(0n);
      });

      it("should return correct utilization percentage", async function () {
        const maxExposure = (TOTAL_VAULT_ASSETS * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS;
        const halfExposure = maxExposure / 2n;

        await exposureManager.connect(controller).recordExposure(
          await assetAddress(),
          halfExposure,
          TOTAL_VAULT_ASSETS
        );

        const utilization = await exposureManager.getExposureUtilization(
          await assetAddress(),
          TOTAL_VAULT_ASSETS
        );

        // 50% utilization = 5000 bps
        expect(utilization).to.equal(5000n);
      });

      it("should return 10000 (100%) when at max exposure", async function () {
        const maxExposure = (TOTAL_VAULT_ASSETS * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS;

        await exposureManager.connect(controller).recordExposure(
          await assetAddress(),
          maxExposure,
          TOTAL_VAULT_ASSETS
        );

        const utilization = await exposureManager.getExposureUtilization(
          await assetAddress(),
          TOTAL_VAULT_ASSETS
        );

        expect(utilization).to.equal(10000n);
      });

      it("should return 0 when max exposure is 0 (empty vault)", async function () {
        const utilization = await exposureManager.getExposureUtilization(
          await assetAddress(),
          0n
        );
        expect(utilization).to.equal(0n);
      });
    });

    describe("getAvailableExposure()", function () {
      it("should return full max when no current exposure", async function () {
        const available = await exposureManager.getAvailableExposure(
          await assetAddress(),
          TOTAL_VAULT_ASSETS
        );
        const maxExposure = (TOTAL_VAULT_ASSETS * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS;

        expect(available).to.equal(maxExposure);
      });

      it("should return remaining capacity after exposure", async function () {
        const existingExposure = 100_000n * ONE_USD;
        await exposureManager.connect(controller).recordExposure(
          await assetAddress(),
          existingExposure,
          TOTAL_VAULT_ASSETS
        );

        const available = await exposureManager.getAvailableExposure(
          await assetAddress(),
          TOTAL_VAULT_ASSETS
        );

        const maxExposure = (TOTAL_VAULT_ASSETS * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS;
        expect(available).to.equal(maxExposure - existingExposure);
      });

      it("should return 0 when at max exposure", async function () {
        const maxExposure = (TOTAL_VAULT_ASSETS * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS;
        await exposureManager.connect(controller).recordExposure(
          await assetAddress(),
          maxExposure,
          TOTAL_VAULT_ASSETS
        );

        const available = await exposureManager.getAvailableExposure(
          await assetAddress(),
          TOTAL_VAULT_ASSETS
        );

        expect(available).to.equal(0n);
      });

      it("should return 0 when exposure exceeds max (vault shrinkage scenario)", async function () {
        // Add exposure at large vault size
        await exposureManager.connect(controller).recordExposure(
          await assetAddress(),
          200_000n * ONE_USD,
          TOTAL_VAULT_ASSETS
        );

        // Check available with smaller vault (simulating vault losses)
        const smallerVault = 500_000n * ONE_USD; // $500k
        const available = await exposureManager.getAvailableExposure(
          await assetAddress(),
          smallerVault
        );

        // Max for smaller vault is 30% of $500k = $150k
        // Current exposure is $200k > $150k, so available should be 0
        expect(available).to.equal(0n);
      });
    });

    describe("getMaxExposureForAsset()", function () {
      it("should return default max exposure (30%)", async function () {
        const maxExposure = await exposureManager.getMaxExposureForAsset(
          await assetAddress(),
          TOTAL_VAULT_ASSETS
        );

        expect(maxExposure).to.equal((TOTAL_VAULT_ASSETS * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS);
      });

      it("should return custom limit when set", async function () {
        const customLimitBps = 1000n; // 10%
        await exposureManager.setCustomAssetLimit(await assetAddress(), customLimitBps);

        const maxExposure = await exposureManager.getMaxExposureForAsset(
          await assetAddress(),
          TOTAL_VAULT_ASSETS
        );

        expect(maxExposure).to.equal((TOTAL_VAULT_ASSETS * customLimitBps) / BPS);
      });

      it("should return 0 for empty vault", async function () {
        const maxExposure = await exposureManager.getMaxExposureForAsset(
          await assetAddress(),
          0n
        );
        expect(maxExposure).to.equal(0n);
      });

      it("should scale correctly with vault size", async function () {
        const vaultSizes = [100_000n * ONE_USD, 1_000_000n * ONE_USD, 10_000_000n * ONE_USD];

        for (const vaultSize of vaultSizes) {
          const maxExposure = await exposureManager.getMaxExposureForAsset(
            await assetAddress(),
            vaultSize
          );
          expect(maxExposure).to.equal((vaultSize * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS);
        }
      });
    });

    describe("getBatchExposures()", function () {
      it("should return exposures for multiple assets", async function () {
        const assets = [await assetA.getAddress(), await assetB.getAddress(), await assetC.getAddress()];
        const amounts = [100_000n * ONE_USD, 150_000n * ONE_USD, 50_000n * ONE_USD];

        // Record exposures
        for (let i = 0; i < assets.length; i++) {
          await exposureManager.connect(controller).recordExposure(
            assets[i],
            amounts[i],
            TOTAL_VAULT_ASSETS
          );
        }

        const [exposures, maxAllowed] = await exposureManager.getBatchExposures(
          assets,
          TOTAL_VAULT_ASSETS
        );

        expect(exposures.length).to.equal(3);
        expect(maxAllowed.length).to.equal(3);

        for (let i = 0; i < assets.length; i++) {
          expect(exposures[i]).to.equal(amounts[i]);
          expect(maxAllowed[i]).to.equal((TOTAL_VAULT_ASSETS * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS);
        }
      });

      it("should handle empty array", async function () {
        const [exposures, maxAllowed] = await exposureManager.getBatchExposures(
          [],
          TOTAL_VAULT_ASSETS
        );

        expect(exposures.length).to.equal(0);
        expect(maxAllowed.length).to.equal(0);
      });

      it("should handle assets with different custom limits", async function () {
        const assetAddressA = await assetA.getAddress();
        const assetAddressB = await assetB.getAddress();

        // Set custom limit for assetA (10%)
        await exposureManager.setCustomAssetLimit(assetAddressA, 1000n);

        const [exposures, maxAllowed] = await exposureManager.getBatchExposures(
          [assetAddressA, assetAddressB],
          TOTAL_VAULT_ASSETS
        );

        expect(maxAllowed[0]).to.equal((TOTAL_VAULT_ASSETS * 1000n) / BPS); // 10%
        expect(maxAllowed[1]).to.equal((TOTAL_VAULT_ASSETS * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS); // 30%
      });
    });
  });

  // =============================================================
  //                   ADMIN FUNCTIONS TESTS
  // =============================================================

  describe("Admin Functions", function () {
    describe("setExecutionController()", function () {
      it("should allow owner to set controller", async function () {
        const newController = await nonOwner.getAddress();
        await exposureManager.setExecutionController(newController);
        expect(await exposureManager.executionController()).to.equal(newController);
      });

      it("should reject zero address", async function () {
        await expect(
          exposureManager.setExecutionController(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(exposureManager, "ZeroAddress");
      });

      it("should reject non-owner", async function () {
        await expect(
          exposureManager.connect(nonOwner).setExecutionController(await nonOwner.getAddress())
        ).to.be.revertedWithCustomError(exposureManager, "OwnableUnauthorizedAccount");
      });

      it("should allow updating controller multiple times", async function () {
        const addr1 = await assetA.getAddress();
        const addr2 = await assetB.getAddress();

        await exposureManager.setExecutionController(addr1);
        expect(await exposureManager.executionController()).to.equal(addr1);

        await exposureManager.setExecutionController(addr2);
        expect(await exposureManager.executionController()).to.equal(addr2);
      });
    });

    describe("setVault()", function () {
      it("should allow owner to update vault", async function () {
        const newVault = await nonOwner.getAddress();
        await exposureManager.setVault(newVault);
        expect(await exposureManager.vault()).to.equal(newVault);
      });

      it("should reject zero address", async function () {
        await expect(
          exposureManager.setVault(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(exposureManager, "ZeroAddress");
      });

      it("should reject non-owner", async function () {
        await expect(
          exposureManager.connect(nonOwner).setVault(await nonOwner.getAddress())
        ).to.be.revertedWithCustomError(exposureManager, "OwnableUnauthorizedAccount");
      });
    });

    describe("setMaxSingleAsset()", function () {
      it("should allow owner to update default max", async function () {
        const newMax = 5000n; // 50%
        await exposureManager.setMaxSingleAsset(newMax);
        expect(await exposureManager.maxSingleAssetBps()).to.equal(newMax);
      });

      it("should emit MaxExposureUpdated event", async function () {
        const oldMax = await exposureManager.maxSingleAssetBps();
        const newMax = 5000n;

        await expect(exposureManager.setMaxSingleAsset(newMax))
          .to.emit(exposureManager, "MaxExposureUpdated")
          .withArgs(oldMax, newMax);
      });

      it("should allow setting to 0 (effectively blocking all exposure)", async function () {
        await exposureManager.setMaxSingleAsset(0n);
        expect(await exposureManager.maxSingleAssetBps()).to.equal(0n);

        // Should not be able to add any exposure
        await expect(
          exposureManager.connect(controller).recordExposure(
            await assetA.getAddress(),
            1n,
            TOTAL_VAULT_ASSETS
          )
        ).to.be.revertedWithCustomError(exposureManager, "AssetExposureLimitExceeded");
      });

      it("should allow setting to 100% (10000 bps)", async function () {
        await exposureManager.setMaxSingleAsset(BPS);
        expect(await exposureManager.maxSingleAssetBps()).to.equal(BPS);

        // Should be able to add 100% exposure
        await exposureManager.connect(controller).recordExposure(
          await assetA.getAddress(),
          TOTAL_VAULT_ASSETS,
          TOTAL_VAULT_ASSETS
        );
      });

      it("should reject value exceeding 100% (10000 bps)", async function () {
        await expect(
          exposureManager.setMaxSingleAsset(BPS + 1n)
        ).to.be.revertedWithCustomError(exposureManager, "ArrayLengthMismatch");
      });

      it("should reject non-owner", async function () {
        await expect(
          exposureManager.connect(nonOwner).setMaxSingleAsset(5000n)
        ).to.be.revertedWithCustomError(exposureManager, "OwnableUnauthorizedAccount");
      });
    });

    describe("setCustomAssetLimit()", function () {
      it("should allow owner to set custom limit", async function () {
        const asset = await assetA.getAddress();
        const customLimit = 1000n; // 10%

        await exposureManager.setCustomAssetLimit(asset, customLimit);
        expect(await exposureManager.customAssetLimits(asset)).to.equal(customLimit);
      });

      it("should emit CustomLimitSet event", async function () {
        const asset = await assetA.getAddress();
        const customLimit = 1000n;

        await expect(exposureManager.setCustomAssetLimit(asset, customLimit))
          .to.emit(exposureManager, "CustomLimitSet")
          .withArgs(asset, customLimit);
      });

      it("should override default limit in calculations", async function () {
        const asset = await assetA.getAddress();
        const customLimit = 1000n; // 10%

        await exposureManager.setCustomAssetLimit(asset, customLimit);

        const maxExposure = await exposureManager.getMaxExposureForAsset(asset, TOTAL_VAULT_ASSETS);
        expect(maxExposure).to.equal((TOTAL_VAULT_ASSETS * customLimit) / BPS);
      });

      it("should allow setting to 0 (use default)", async function () {
        const asset = await assetA.getAddress();

        // Set custom limit first
        await exposureManager.setCustomAssetLimit(asset, 1000n);

        // Set back to 0
        await exposureManager.setCustomAssetLimit(asset, 0n);
        expect(await exposureManager.customAssetLimits(asset)).to.equal(0n);

        // Should use default now
        const maxExposure = await exposureManager.getMaxExposureForAsset(asset, TOTAL_VAULT_ASSETS);
        expect(maxExposure).to.equal((TOTAL_VAULT_ASSETS * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS);
      });

      it("should reject zero address for asset", async function () {
        await expect(
          exposureManager.setCustomAssetLimit(ethers.ZeroAddress, 1000n)
        ).to.be.revertedWithCustomError(exposureManager, "ZeroAddress");
      });

      it("should reject limit exceeding 100%", async function () {
        await expect(
          exposureManager.setCustomAssetLimit(await assetA.getAddress(), BPS + 1n)
        ).to.be.revertedWithCustomError(exposureManager, "ArrayLengthMismatch");
      });

      it("should reject non-owner", async function () {
        await expect(
          exposureManager.connect(nonOwner).setCustomAssetLimit(await assetA.getAddress(), 1000n)
        ).to.be.revertedWithCustomError(exposureManager, "OwnableUnauthorizedAccount");
      });

      it("should allow different custom limits per asset", async function () {
        const assetAddressA = await assetA.getAddress();
        const assetAddressB = await assetB.getAddress();

        await exposureManager.setCustomAssetLimit(assetAddressA, 1000n); // 10%
        await exposureManager.setCustomAssetLimit(assetAddressB, 5000n); // 50%

        expect(await exposureManager.customAssetLimits(assetAddressA)).to.equal(1000n);
        expect(await exposureManager.customAssetLimits(assetAddressB)).to.equal(5000n);

        const maxA = await exposureManager.getMaxExposureForAsset(assetAddressA, TOTAL_VAULT_ASSETS);
        const maxB = await exposureManager.getMaxExposureForAsset(assetAddressB, TOTAL_VAULT_ASSETS);

        expect(maxA).to.equal((TOTAL_VAULT_ASSETS * 1000n) / BPS);
        expect(maxB).to.equal((TOTAL_VAULT_ASSETS * 5000n) / BPS);
      });
    });

    describe("removeCustomAssetLimit()", function () {
      it("should allow owner to remove custom limit", async function () {
        const asset = await assetA.getAddress();

        // Set custom limit
        await exposureManager.setCustomAssetLimit(asset, 1000n);
        expect(await exposureManager.customAssetLimits(asset)).to.equal(1000n);

        // Remove it
        await exposureManager.removeCustomAssetLimit(asset);
        expect(await exposureManager.customAssetLimits(asset)).to.equal(0n);
      });

      it("should emit CustomLimitRemoved event", async function () {
        const asset = await assetA.getAddress();
        await exposureManager.setCustomAssetLimit(asset, 1000n);

        await expect(exposureManager.removeCustomAssetLimit(asset))
          .to.emit(exposureManager, "CustomLimitRemoved")
          .withArgs(asset);
      });

      it("should revert to default limit after removal", async function () {
        const asset = await assetA.getAddress();

        await exposureManager.setCustomAssetLimit(asset, 1000n); // 10%
        await exposureManager.removeCustomAssetLimit(asset);

        const maxExposure = await exposureManager.getMaxExposureForAsset(asset, TOTAL_VAULT_ASSETS);
        expect(maxExposure).to.equal((TOTAL_VAULT_ASSETS * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS);
      });

      it("should be idempotent (no error on removing non-existent limit)", async function () {
        const asset = await assetA.getAddress();
        // No custom limit set, but removal should still work
        await exposureManager.removeCustomAssetLimit(asset);
        expect(await exposureManager.customAssetLimits(asset)).to.equal(0n);
      });

      it("should reject non-owner", async function () {
        await expect(
          exposureManager.connect(nonOwner).removeCustomAssetLimit(await assetA.getAddress())
        ).to.be.revertedWithCustomError(exposureManager, "OwnableUnauthorizedAccount");
      });
    });

    describe("forceSetExposure()", function () {
      it("should allow owner to force set exposure", async function () {
        const asset = await assetA.getAddress();
        const forcedAmount = 500_000n * ONE_USD;

        await exposureManager.forceSetExposure(asset, forcedAmount);
        expect(await exposureManager.assetExposure(asset)).to.equal(forcedAmount);
      });

      it("should allow setting exposure above normal limits", async function () {
        const asset = await assetA.getAddress();
        const excessAmount = TOTAL_VAULT_ASSETS; // 100% exposure

        await exposureManager.forceSetExposure(asset, excessAmount);
        expect(await exposureManager.assetExposure(asset)).to.equal(excessAmount);
      });

      it("should allow setting exposure to zero", async function () {
        const asset = await assetA.getAddress();

        // First set some exposure
        await exposureManager.forceSetExposure(asset, 100_000n * ONE_USD);

        // Then force to zero
        await exposureManager.forceSetExposure(asset, 0n);
        expect(await exposureManager.assetExposure(asset)).to.equal(0n);
      });

      it("should reject non-owner", async function () {
        await expect(
          exposureManager.connect(nonOwner).forceSetExposure(await assetA.getAddress(), 100n)
        ).to.be.revertedWithCustomError(exposureManager, "OwnableUnauthorizedAccount");
      });

      it("should not emit any event (emergency function)", async function () {
        const asset = await assetA.getAddress();
        const tx = await exposureManager.forceSetExposure(asset, 100_000n * ONE_USD);
        const receipt = await tx.wait();

        // Filter for ExposureAdded or ExposureRemoved events
        const exposureEvents = receipt?.logs.filter((log: any) => {
          try {
            const parsed = exposureManager.interface.parseLog(log);
            return parsed?.name === "ExposureAdded" || parsed?.name === "ExposureRemoved";
          } catch { return false; }
        });

        expect(exposureEvents?.length || 0).to.equal(0);
      });
    });

    describe("resetExposures()", function () {
      it("should allow owner to reset multiple exposures", async function () {
        const assets = [await assetA.getAddress(), await assetB.getAddress()];

        // Set some exposures
        for (const asset of assets) {
          await exposureManager.connect(controller).recordExposure(
            asset,
            100_000n * ONE_USD,
            TOTAL_VAULT_ASSETS
          );
        }

        // Reset
        await exposureManager.resetExposures(assets);

        // Verify all reset to 0
        for (const asset of assets) {
          expect(await exposureManager.assetExposure(asset)).to.equal(0n);
        }
      });

      it("should handle empty array", async function () {
        await exposureManager.resetExposures([]);
        // Should not revert
      });

      it("should handle assets with no exposure", async function () {
        const assets = [await assetA.getAddress()];
        await exposureManager.resetExposures(assets);
        expect(await exposureManager.assetExposure(assets[0])).to.equal(0n);
      });

      it("should reject non-owner", async function () {
        await expect(
          exposureManager.connect(nonOwner).resetExposures([await assetA.getAddress()])
        ).to.be.revertedWithCustomError(exposureManager, "OwnableUnauthorizedAccount");
      });
    });
  });

  // =============================================================
  //                   CUSTOM LIMITS INTERACTION TESTS
  // =============================================================

  describe("Custom Limits Interaction", function () {
    it("should enforce custom limit lower than default", async function () {
      const asset = await assetA.getAddress();
      const customLimit = 1000n; // 10% instead of 30%

      await exposureManager.setCustomAssetLimit(asset, customLimit);

      const customMax = (TOTAL_VAULT_ASSETS * customLimit) / BPS;

      // Should allow up to custom limit
      await exposureManager.connect(controller).recordExposure(
        asset,
        customMax,
        TOTAL_VAULT_ASSETS
      );

      // Should reject above custom limit
      await expect(
        exposureManager.connect(controller).recordExposure(
          asset,
          1n,
          TOTAL_VAULT_ASSETS
        )
      ).to.be.revertedWithCustomError(exposureManager, "AssetExposureLimitExceeded");
    });

    it("should enforce custom limit higher than default", async function () {
      const asset = await assetA.getAddress();
      const customLimit = 5000n; // 50% instead of 30%

      await exposureManager.setCustomAssetLimit(asset, customLimit);

      const customMax = (TOTAL_VAULT_ASSETS * customLimit) / BPS;
      const defaultMax = (TOTAL_VAULT_ASSETS * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS;

      // Should allow above default but within custom
      await exposureManager.connect(controller).recordExposure(
        asset,
        defaultMax + 1n,
        TOTAL_VAULT_ASSETS
      );

      // Continue adding up to custom max
      const remaining = customMax - defaultMax - 1n;
      await exposureManager.connect(controller).recordExposure(
        asset,
        remaining,
        TOTAL_VAULT_ASSETS
      );

      // Should reject above custom limit
      await expect(
        exposureManager.connect(controller).recordExposure(
          asset,
          1n,
          TOTAL_VAULT_ASSETS
        )
      ).to.be.revertedWithCustomError(exposureManager, "AssetExposureLimitExceeded");
    });

    it("should allow different limits for different assets simultaneously", async function () {
      const assetAddressA = await assetA.getAddress();
      const assetAddressB = await assetB.getAddress();
      const assetAddressC = await assetC.getAddress();

      // A: 10%, B: 50%, C: default 30%
      await exposureManager.setCustomAssetLimit(assetAddressA, 1000n);
      await exposureManager.setCustomAssetLimit(assetAddressB, 5000n);

      const maxA = (TOTAL_VAULT_ASSETS * 1000n) / BPS;
      const maxB = (TOTAL_VAULT_ASSETS * 5000n) / BPS;
      const maxC = (TOTAL_VAULT_ASSETS * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS;

      await exposureManager.connect(controller).recordExposure(assetAddressA, maxA, TOTAL_VAULT_ASSETS);
      await exposureManager.connect(controller).recordExposure(assetAddressB, maxB, TOTAL_VAULT_ASSETS);
      await exposureManager.connect(controller).recordExposure(assetAddressC, maxC, TOTAL_VAULT_ASSETS);

      expect(await exposureManager.assetExposure(assetAddressA)).to.equal(maxA);
      expect(await exposureManager.assetExposure(assetAddressB)).to.equal(maxB);
      expect(await exposureManager.assetExposure(assetAddressC)).to.equal(maxC);
    });
  });

  // =============================================================
  //                 EDGE CASES AND BOUNDARY CONDITIONS
  // =============================================================

  describe("Edge Cases and Boundary Conditions", function () {
    describe("Arithmetic Edge Cases", function () {
      it("should handle very large vault sizes without overflow", async function () {
        const largeVault = ethers.parseUnits("1000000000000", 6); // $1 trillion
        const asset = await assetA.getAddress();

        const maxExposure = await exposureManager.getMaxExposureForAsset(asset, largeVault);
        expect(maxExposure).to.equal((largeVault * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS);

        await exposureManager.connect(controller).recordExposure(
          asset,
          maxExposure,
          largeVault
        );

        expect(await exposureManager.assetExposure(asset)).to.equal(maxExposure);
      });

      it("should handle very small exposure amounts", async function () {
        const asset = await assetA.getAddress();
        const tinyAmount = 1n;

        await exposureManager.connect(controller).recordExposure(
          asset,
          tinyAmount,
          TOTAL_VAULT_ASSETS
        );

        expect(await exposureManager.assetExposure(asset)).to.equal(tinyAmount);
      });

      it("should handle exposure equal to total vault (with 100% limit)", async function () {
        const asset = await assetA.getAddress();

        // Set 100% limit
        await exposureManager.setMaxSingleAsset(BPS);

        await exposureManager.connect(controller).recordExposure(
          asset,
          TOTAL_VAULT_ASSETS,
          TOTAL_VAULT_ASSETS
        );

        expect(await exposureManager.assetExposure(asset)).to.equal(TOTAL_VAULT_ASSETS);
      });

      it("should handle utilization calculation with maxed exposure", async function () {
        const asset = await assetA.getAddress();
        const maxExposure = (TOTAL_VAULT_ASSETS * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS;

        await exposureManager.connect(controller).recordExposure(
          asset,
          maxExposure,
          TOTAL_VAULT_ASSETS
        );

        const utilization = await exposureManager.getExposureUtilization(asset, TOTAL_VAULT_ASSETS);
        expect(utilization).to.equal(BPS); // 100% utilization of limit
      });
    });

    describe("Vault Size Change Scenarios", function () {
      it("should handle vault growth (exposure becomes safer)", async function () {
        const asset = await assetA.getAddress();
        const initialVault = 100_000n * ONE_USD;
        const grownVault = 1_000_000n * ONE_USD;

        // Record 30% of small vault
        const exposure = (initialVault * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS;
        await exposureManager.connect(controller).recordExposure(
          asset,
          exposure,
          initialVault
        );

        // With larger vault, same exposure is now only 3%
        const canAdd = await exposureManager.canAddExposure(asset, 0n, grownVault);
        expect(canAdd).to.be.true;

        // Can add more exposure now
        const additionalCapacity = await exposureManager.getAvailableExposure(asset, grownVault);
        expect(additionalCapacity).to.be.gt(0n);
      });

      it("should handle vault shrinkage (exposure becomes riskier)", async function () {
        const asset = await assetA.getAddress();
        const initialVault = 1_000_000n * ONE_USD;
        const shrunkVault = 100_000n * ONE_USD;

        // Record 15% of large vault = $150k
        const exposure = (initialVault * 1500n) / BPS;
        await exposureManager.connect(controller).recordExposure(
          asset,
          exposure,
          initialVault
        );

        // With smaller vault, max is 30% of $100k = $30k
        // Current exposure $150k > $30k limit
        const available = await exposureManager.getAvailableExposure(asset, shrunkVault);
        expect(available).to.equal(0n);

        // Cannot add any more
        await expect(
          exposureManager.connect(controller).recordExposure(
            asset,
            1n,
            shrunkVault
          )
        ).to.be.revertedWithCustomError(exposureManager, "AssetExposureLimitExceeded");
      });
    });

    describe("Multiple Assets Total Exposure", function () {
      it("should allow multiple assets each at max limit", async function () {
        const assets = [await assetA.getAddress(), await assetB.getAddress(), await assetC.getAddress()];
        const maxPerAsset = (TOTAL_VAULT_ASSETS * DEFAULT_MAX_SINGLE_ASSET_BPS) / BPS;

        // Each asset can be at 30% independently (90% total is allowed)
        for (const asset of assets) {
          await exposureManager.connect(controller).recordExposure(
            asset,
            maxPerAsset,
            TOTAL_VAULT_ASSETS
          );
          expect(await exposureManager.assetExposure(asset)).to.equal(maxPerAsset);
        }
      });

      it("should track assets independently when one is removed", async function () {
        const assetAddressA = await assetA.getAddress();
        const assetAddressB = await assetB.getAddress();

        const amountA = 200_000n * ONE_USD;
        const amountB = 150_000n * ONE_USD;

        await exposureManager.connect(controller).recordExposure(assetAddressA, amountA, TOTAL_VAULT_ASSETS);
        await exposureManager.connect(controller).recordExposure(assetAddressB, amountB, TOTAL_VAULT_ASSETS);

        // Remove all exposure from A
        await exposureManager.connect(controller).removeExposure(assetAddressA, amountA);

        // B should be unaffected
        expect(await exposureManager.assetExposure(assetAddressA)).to.equal(0n);
        expect(await exposureManager.assetExposure(assetAddressB)).to.equal(amountB);
      });
    });

    describe("Controller Change Scenarios", function () {
      it("should allow new controller to operate after change", async function () {
        const newController = nonOwner;
        const asset = await assetA.getAddress();

        await exposureManager.setExecutionController(await newController.getAddress());

        // Old controller should no longer work
        await expect(
          exposureManager.connect(controller).recordExposure(asset, 100n, TOTAL_VAULT_ASSETS)
        ).to.be.revertedWithCustomError(exposureManager, "OnlyController");

        // New controller should work
        await exposureManager.connect(newController).recordExposure(
          asset,
          100_000n * ONE_USD,
          TOTAL_VAULT_ASSETS
        );
      });
    });

    describe("Default vs Custom Limit Transitions", function () {
      it("should handle setting custom limit when exposure exists", async function () {
        const asset = await assetA.getAddress();
        const exposure = 200_000n * ONE_USD; // 20%

        // Record exposure under default limit
        await exposureManager.connect(controller).recordExposure(
          asset,
          exposure,
          TOTAL_VAULT_ASSETS
        );

        // Set stricter custom limit (10%)
        await exposureManager.setCustomAssetLimit(asset, 1000n);

        // Existing exposure ($200k) exceeds new limit ($100k)
        // Should not be able to add more
        await expect(
          exposureManager.connect(controller).recordExposure(
            asset,
            1n,
            TOTAL_VAULT_ASSETS
          )
        ).to.be.revertedWithCustomError(exposureManager, "AssetExposureLimitExceeded");

        // But removal should still work
        await exposureManager.connect(controller).removeExposure(asset, exposure);
        expect(await exposureManager.assetExposure(asset)).to.equal(0n);
      });

      it("should handle removing custom limit when exposure exceeds default", async function () {
        const asset = await assetA.getAddress();

        // Set high custom limit (50%)
        await exposureManager.setCustomAssetLimit(asset, 5000n);

        // Record 40% exposure (above default 30%, within custom 50%)
        const exposure = (TOTAL_VAULT_ASSETS * 4000n) / BPS;
        await exposureManager.connect(controller).recordExposure(
          asset,
          exposure,
          TOTAL_VAULT_ASSETS
        );

        // Remove custom limit (reverts to 30%)
        await exposureManager.removeCustomAssetLimit(asset);

        // Existing exposure (40%) exceeds new default (30%)
        // Should not be able to add more
        await expect(
          exposureManager.connect(controller).recordExposure(
            asset,
            1n,
            TOTAL_VAULT_ASSETS
          )
        ).to.be.revertedWithCustomError(exposureManager, "AssetExposureLimitExceeded");
      });
    });
  });

  // =============================================================
  //                     ACCESS CONTROL SUMMARY
  // =============================================================

  describe("Access Control Summary", function () {
    it("should reject all controller-only functions from non-controller", async function () {
      const asset = await assetA.getAddress();

      await expect(
        exposureManager.connect(nonOwner).recordExposure(asset, 100n, TOTAL_VAULT_ASSETS)
      ).to.be.revertedWithCustomError(exposureManager, "OnlyController");

      await expect(
        exposureManager.connect(nonOwner).removeExposure(asset, 100n)
      ).to.be.revertedWithCustomError(exposureManager, "OnlyController");
    });

    it("should reject all owner-only functions from non-owner", async function () {
      const asset = await assetA.getAddress();

      await expect(
        exposureManager.connect(nonOwner).setExecutionController(await nonOwner.getAddress())
      ).to.be.revertedWithCustomError(exposureManager, "OwnableUnauthorizedAccount");

      await expect(
        exposureManager.connect(nonOwner).setVault(await nonOwner.getAddress())
      ).to.be.revertedWithCustomError(exposureManager, "OwnableUnauthorizedAccount");

      await expect(
        exposureManager.connect(nonOwner).setMaxSingleAsset(5000n)
      ).to.be.revertedWithCustomError(exposureManager, "OwnableUnauthorizedAccount");

      await expect(
        exposureManager.connect(nonOwner).setCustomAssetLimit(asset, 1000n)
      ).to.be.revertedWithCustomError(exposureManager, "OwnableUnauthorizedAccount");

      await expect(
        exposureManager.connect(nonOwner).removeCustomAssetLimit(asset)
      ).to.be.revertedWithCustomError(exposureManager, "OwnableUnauthorizedAccount");

      await expect(
        exposureManager.connect(nonOwner).forceSetExposure(asset, 100n)
      ).to.be.revertedWithCustomError(exposureManager, "OwnableUnauthorizedAccount");

      await expect(
        exposureManager.connect(nonOwner).resetExposures([asset])
      ).to.be.revertedWithCustomError(exposureManager, "OwnableUnauthorizedAccount");
    });
  });

  // =============================================================
  //                 INVARIANT-STYLE CHECKS
  // =============================================================

  describe("Invariant Checks", function () {
    it("should maintain: current exposure <= max exposure when adding through recordExposure", async function () {
      const asset = await assetA.getAddress();
      const iterations = 10;
      let totalAdded = 0n;

      // Add exposure incrementally
      for (let i = 0; i < iterations; i++) {
        const canAddBefore = await exposureManager.canAddExposure(
          asset,
          10_000n * ONE_USD,
          TOTAL_VAULT_ASSETS
        );

        if (canAddBefore) {
          await exposureManager.connect(controller).recordExposure(
            asset,
            10_000n * ONE_USD,
            TOTAL_VAULT_ASSETS
          );
          totalAdded += 10_000n * ONE_USD;

          const current = await exposureManager.assetExposure(asset);
          const max = await exposureManager.getMaxExposureForAsset(asset, TOTAL_VAULT_ASSETS);

          expect(current).to.be.lte(max);
          expect(current).to.equal(totalAdded);
        }
      }
    });

    it("should maintain: exposure >= 0 after any sequence of remove operations", async function () {
      const asset = await assetA.getAddress();

      // Add some exposure
      await exposureManager.connect(controller).recordExposure(
        asset,
        100_000n * ONE_USD,
        TOTAL_VAULT_ASSETS
      );

      // Remove more than exists multiple times
      const removalAmounts = [50_000n * ONE_USD, 100_000n * ONE_USD, 200_000n * ONE_USD];

      for (const amount of removalAmounts) {
        await exposureManager.connect(controller).removeExposure(asset, amount);
        const current = await exposureManager.assetExposure(asset);
        expect(current).to.be.gte(0n);
      }
    });

    it("should maintain: assetExposure mapping consistency with getBatchExposures", async function () {
      const assets = [await assetA.getAddress(), await assetB.getAddress()];
      const amounts = [100_000n * ONE_USD, 150_000n * ONE_USD];

      for (let i = 0; i < assets.length; i++) {
        await exposureManager.connect(controller).recordExposure(
          assets[i],
          amounts[i],
          TOTAL_VAULT_ASSETS
        );
      }

      const [batchExposures, ] = await exposureManager.getBatchExposures(assets, TOTAL_VAULT_ASSETS);

      for (let i = 0; i < assets.length; i++) {
        const directExposure = await exposureManager.assetExposure(assets[i]);
        expect(directExposure).to.equal(batchExposures[i]);
      }
    });
  });
});

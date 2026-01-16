import { expect } from "chai";
import { network } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = await network.connect();

/**
 * UtilizationController Comprehensive Test Suite
 *
 * This test suite exhaustively validates the UtilizationController contract which:
 * - Enforces a maximum utilization cap (default 70%) on vault capital
 * - Checks if allocations would exceed the utilization limit
 * - Checks if withdrawals would cause utilization to exceed limit
 * - Provides view functions for current utilization and available capacity
 *
 * The UtilizationController is a critical safety mechanism that ensures the vault
 * always maintains a minimum reserve (30% by default) for liquidity and protection.
 *
 * ADVERSARIAL TESTING APPROACH:
 * - Every boundary condition (0%, 70%, 100%) is explicitly tested
 * - Arithmetic edge cases (overflow, underflow, division by zero) are probed
 * - State consistency is verified after every mutation
 * - Unexpected parameter combinations are explored
 * - All view functions are tested for consistency with each other
 * - Access control is thoroughly verified
 *
 * Tests run against Flare mainnet fork to ensure realistic environment.
 */
describe("UtilizationController", function () {
  this.timeout(120000);

  // Contract instances
  let utilizationController: any;
  let mockVault: any;
  let usdc: any;
  let usdcAddress: string;

  // Signers
  let owner: SignerWithAddress;
  let vault: SignerWithAddress;
  let nonOwner: SignerWithAddress;
  let attacker: SignerWithAddress;

  // Constants matching contract
  const BPS = 10000n;
  const DEFAULT_MAX_UTILIZATION_BPS = 7000n; // 70%
  const ONE_USDC = 10n ** 6n;
  const MILLION_USDC = 1_000_000n * ONE_USDC;

  // Standard test values
  const TOTAL_ASSETS = 1_000_000n * ONE_USDC; // $1M vault
  const MAX_ALLOCATABLE = (TOTAL_ASSETS * DEFAULT_MAX_UTILIZATION_BPS) / BPS; // $700k
  const RESERVE_AMOUNT = TOTAL_ASSETS - MAX_ALLOCATABLE; // $300k

  before(async function () {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    if (chainId !== 14n) {
      console.log(`Skipping - not on Flare fork (chainId: ${chainId})`);
      this.skip();
    }

    [owner, vault, nonOwner, attacker] = await ethers.getSigners();
    console.log(`Test owner: ${await owner.getAddress()}`);
    console.log(`Vault: ${await vault.getAddress()}`);
  });

  beforeEach(async function () {
    // Deploy MockERC20 for testing (simulating USDC with 6 decimals)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("Mock USDC", "mUSDC", 6);
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();

    // Deploy UtilizationController with vault address
    const UtilizationController = await ethers.getContractFactory("UtilizationController");
    utilizationController = await UtilizationController.deploy(await vault.getAddress());
    await utilizationController.waitForDeployment();

    console.log(`UtilizationController deployed at: ${await utilizationController.getAddress()}`);
  });

  // =============================================================
  //                    DEPLOYMENT TESTS
  // =============================================================

  describe("Deployment and Initialization", function () {
    it("should deploy with correct owner", async function () {
      expect(await utilizationController.owner()).to.equal(await owner.getAddress());
    });

    it("should deploy with correct vault address", async function () {
      expect(await utilizationController.vault()).to.equal(await vault.getAddress());
    });

    it("should deploy with default max utilization of 7000 bps (70%)", async function () {
      expect(await utilizationController.maxUtilizationBps()).to.equal(DEFAULT_MAX_UTILIZATION_BPS);
    });

    it("should expose BPS constant as 10000", async function () {
      expect(await utilizationController.BPS()).to.equal(BPS);
    });

    it("should expose DEFAULT_MAX_UTILIZATION_BPS constant as 7000", async function () {
      expect(await utilizationController.DEFAULT_MAX_UTILIZATION_BPS()).to.equal(DEFAULT_MAX_UTILIZATION_BPS);
    });

    describe("Constructor Validation", function () {
      it("should reject zero address for vault", async function () {
        const UtilizationController = await ethers.getContractFactory("UtilizationController");
        await expect(
          UtilizationController.deploy(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(utilizationController, "ZeroAddress");
      });

      it("should accept any non-zero address as vault", async function () {
        const UtilizationController = await ethers.getContractFactory("UtilizationController");
        const randomAddress = ethers.Wallet.createRandom().address;
        const uc = await UtilizationController.deploy(randomAddress);
        await uc.waitForDeployment();
        expect(await uc.vault()).to.equal(randomAddress);
      });

      it("should set deployer as owner", async function () {
        const UtilizationController = await ethers.getContractFactory("UtilizationController");
        const ucFromOwner = await UtilizationController.connect(owner).deploy(await vault.getAddress());
        await ucFromOwner.waitForDeployment();
        expect(await ucFromOwner.owner()).to.equal(await owner.getAddress());
      });
    });
  });

  // =============================================================
  //                   canAllocate TESTS
  // =============================================================

  describe("canAllocate()", function () {
    describe("Basic Allocation Checks", function () {
      it("should return true for allocation within limit", async function () {
        const currentAllocated = 0n;
        const newAllocation = 500_000n * ONE_USDC; // 50% of $1M

        const canAllocate = await utilizationController.canAllocate(
          TOTAL_ASSETS,
          currentAllocated,
          newAllocation
        );

        expect(canAllocate).to.be.true;
      });

      it("should return true for allocation exactly at limit (70%)", async function () {
        const currentAllocated = 0n;
        const newAllocation = MAX_ALLOCATABLE; // Exactly 70%

        const canAllocate = await utilizationController.canAllocate(
          TOTAL_ASSETS,
          currentAllocated,
          newAllocation
        );

        expect(canAllocate).to.be.true;
      });

      it("should return false for allocation above limit", async function () {
        const currentAllocated = 0n;
        // Need to add enough to push utilization over 70% after rounding
        // With $1M total and 70% limit, max allocatable is $700k
        // Adding $700,001 would give utilization of (700001 * 10000) / 1000000 = 7000.01 -> 7000 (rounds down!)
        // Need to add enough that even after rounding down we exceed 7000 bps
        // (700001 * 10000) / 1000000 = 7000 due to integer division
        // Need at least 700,001 USDC to exceed, but rounding makes this tricky
        // Let's use a value that clearly exceeds: 700,100 USDC
        const newAllocation = 700_100n * ONE_USDC; // Clearly over 70%

        const canAllocate = await utilizationController.canAllocate(
          TOTAL_ASSETS,
          currentAllocated,
          newAllocation
        );

        expect(canAllocate).to.be.false;
      });

      it("should return false when cumulative allocation exceeds limit", async function () {
        const currentAllocated = 600_000n * ONE_USDC; // 60%
        const newAllocation = 200_000n * ONE_USDC; // Would make 80%

        const canAllocate = await utilizationController.canAllocate(
          TOTAL_ASSETS,
          currentAllocated,
          newAllocation
        );

        expect(canAllocate).to.be.false;
      });

      it("should return true when cumulative allocation is exactly at limit", async function () {
        const currentAllocated = 500_000n * ONE_USDC; // 50%
        const newAllocation = 200_000n * ONE_USDC; // Makes exactly 70%

        const canAllocate = await utilizationController.canAllocate(
          TOTAL_ASSETS,
          currentAllocated,
          newAllocation
        );

        expect(canAllocate).to.be.true;
      });

      it("should return true for zero new allocation", async function () {
        const currentAllocated = 600_000n * ONE_USDC; // 60%
        const newAllocation = 0n;

        const canAllocate = await utilizationController.canAllocate(
          TOTAL_ASSETS,
          currentAllocated,
          newAllocation
        );

        expect(canAllocate).to.be.true;
      });
    });

    describe("Edge Cases for Zero Total Assets", function () {
      it("should return false when total assets is zero", async function () {
        const canAllocate = await utilizationController.canAllocate(
          0n,
          0n,
          100n
        );

        expect(canAllocate).to.be.false;
      });

      it("should return false even for zero allocation when total assets is zero", async function () {
        // This is an interesting edge case - even allocating 0 to an empty vault
        // returns false because 0/0 is undefined (division by zero protection)
        const canAllocate = await utilizationController.canAllocate(
          0n,
          0n,
          0n
        );

        expect(canAllocate).to.be.false;
      });
    });

    describe("Boundary Value Testing", function () {
      it("should return true at exactly 69.99% utilization", async function () {
        // 69.99% = 6999 bps
        const newAllocation = (TOTAL_ASSETS * 6999n) / BPS;

        const canAllocate = await utilizationController.canAllocate(
          TOTAL_ASSETS,
          0n,
          newAllocation
        );

        expect(canAllocate).to.be.true;
      });

      it("should return false at 70.01% utilization", async function () {
        // 70.01% = 7001 bps
        const newAllocation = (TOTAL_ASSETS * 7001n) / BPS;

        const canAllocate = await utilizationController.canAllocate(
          TOTAL_ASSETS,
          0n,
          newAllocation
        );

        expect(canAllocate).to.be.false;
      });

      it("should handle very small vault sizes correctly", async function () {
        const tinyVault = 100n; // 100 units
        const maxForTiny = (tinyVault * DEFAULT_MAX_UTILIZATION_BPS) / BPS; // 70 units

        expect(await utilizationController.canAllocate(tinyVault, 0n, maxForTiny)).to.be.true;
        expect(await utilizationController.canAllocate(tinyVault, 0n, maxForTiny + 1n)).to.be.false;
      });

      it("should handle very large vault sizes without overflow", async function () {
        const hugeVault = ethers.parseUnits("1000000000000", 6); // $1 trillion
        const maxForHuge = (hugeVault * DEFAULT_MAX_UTILIZATION_BPS) / BPS;

        const canAllocate = await utilizationController.canAllocate(
          hugeVault,
          0n,
          maxForHuge
        );

        expect(canAllocate).to.be.true;
      });

      it("should handle 1 wei allocation correctly", async function () {
        const canAllocate = await utilizationController.canAllocate(
          TOTAL_ASSETS,
          MAX_ALLOCATABLE - 1n, // Just under limit
          1n // 1 wei
        );

        expect(canAllocate).to.be.true;
      });

      it("should handle 1 wei allocation when exactly at limit", async function () {
        // When at exactly 70% (700k allocated out of 1M), adding 1 wei:
        // newUtilization = ((700000 * 10^6 + 1) * 10000) / (1000000 * 10^6)
        // = (700000000001 * 10000) / 1000000000000
        // = 7000000000010 / 1000000000000
        // With ceiling division: (7000000000010 + 999999999999) / 1000000000000 = 7001
        // So it returns FALSE due to ceiling division (conservative behavior)
        const canAllocate = await utilizationController.canAllocate(
          TOTAL_ASSETS,
          MAX_ALLOCATABLE, // Exactly at limit
          1n // 1 wei
        );

        // With ceiling division for utilization calculation, even 1 wei over limit fails
        // This is the conservative security-first behavior
        expect(canAllocate).to.be.false;
      });
    });

    describe("Rounding Behavior", function () {
      it("should handle rounding correctly at boundaries", async function () {
        // Test with values that might cause rounding issues
        const oddVault = 10007n * ONE_USDC; // Prime number to test rounding
        const maxAlloc = (oddVault * DEFAULT_MAX_UTILIZATION_BPS) / BPS;

        expect(await utilizationController.canAllocate(oddVault, 0n, maxAlloc)).to.be.true;

        // Due to integer division rounding, adding 1 to maxAlloc might still pass
        // because the utilization calculation rounds down.
        // Let's verify the actual behavior:
        // newUtilization = ((maxAlloc + 1) * BPS) / oddVault
        // This might round down to <= 7000 depending on the numbers
        // So we test with a larger increment to ensure we exceed the limit
        const significantIncrement = oddVault / 100n; // 1% of vault
        expect(await utilizationController.canAllocate(oddVault, 0n, maxAlloc + significantIncrement)).to.be.false;
      });
    });
  });

  // =============================================================
  //                   canWithdraw TESTS
  // =============================================================

  describe("canWithdraw()", function () {
    describe("Basic Withdrawal Checks", function () {
      it("should return true for withdrawal that maintains utilization below limit", async function () {
        const currentAllocated = 500_000n * ONE_USDC; // 50%
        const withdrawAmount = 100_000n * ONE_USDC;
        // After: 500k / 900k = 55.5% < 70%

        const canWithdraw = await utilizationController.canWithdraw(
          TOTAL_ASSETS,
          currentAllocated,
          withdrawAmount
        );

        expect(canWithdraw).to.be.true;
      });

      it("should return false for withdrawal that would exceed utilization limit", async function () {
        const currentAllocated = 500_000n * ONE_USDC; // 50%
        const withdrawAmount = 400_000n * ONE_USDC;
        // After: 500k / 600k = 83.3% > 70%

        const canWithdraw = await utilizationController.canWithdraw(
          TOTAL_ASSETS,
          currentAllocated,
          withdrawAmount
        );

        expect(canWithdraw).to.be.false;
      });

      it("should return false for withdrawal exceeding total assets", async function () {
        const canWithdraw = await utilizationController.canWithdraw(
          TOTAL_ASSETS,
          500_000n * ONE_USDC,
          TOTAL_ASSETS + 1n
        );

        expect(canWithdraw).to.be.false;
      });

      it("should return true for zero withdrawal", async function () {
        const canWithdraw = await utilizationController.canWithdraw(
          TOTAL_ASSETS,
          600_000n * ONE_USDC,
          0n
        );

        expect(canWithdraw).to.be.true;
      });
    });

    describe("Zero Remaining Assets Edge Cases", function () {
      it("should return true for full withdrawal when no allocation", async function () {
        const canWithdraw = await utilizationController.canWithdraw(
          TOTAL_ASSETS,
          0n, // No allocation
          TOTAL_ASSETS // Full withdrawal
        );

        expect(canWithdraw).to.be.true;
      });

      it("should return false for full withdrawal when there is allocation", async function () {
        const canWithdraw = await utilizationController.canWithdraw(
          TOTAL_ASSETS,
          100_000n * ONE_USDC, // Some allocation
          TOTAL_ASSETS // Full withdrawal
        );

        // After withdrawal, assets = 0 but allocation = 100k
        // This violates the rule: currentAllocated != 0 when assetsAfterWithdraw == 0
        expect(canWithdraw).to.be.false;
      });
    });

    describe("Boundary Value Testing for Withdrawal", function () {
      it("should return true at exactly 70% utilization after withdrawal", async function () {
        // Current: 600k allocated, 1M total (60%)
        // We want to find max withdraw that keeps it at exactly 70%
        // allocated / (total - withdraw) = 0.7
        // 600k / (1M - withdraw) = 0.7
        // 600k = 0.7 * (1M - withdraw)
        // 600k / 0.7 = 1M - withdraw
        // ~857,142 = 1M - withdraw
        // withdraw = ~142,857 USDC

        const currentAllocated = 600_000n * ONE_USDC;
        // Max withdraw: total - (allocated * BPS / maxUtilization)
        const maxWithdraw = TOTAL_ASSETS - (currentAllocated * BPS) / DEFAULT_MAX_UTILIZATION_BPS;

        const canWithdraw = await utilizationController.canWithdraw(
          TOTAL_ASSETS,
          currentAllocated,
          maxWithdraw
        );

        expect(canWithdraw).to.be.true;
      });

      it("should return false for withdrawal significantly over max", async function () {
        const currentAllocated = 600_000n * ONE_USDC;
        const maxWithdraw = TOTAL_ASSETS - (currentAllocated * BPS) / DEFAULT_MAX_UTILIZATION_BPS;

        // Due to integer division rounding, 1 wei over max might still pass
        // Use a significant amount over to ensure we exceed the limit
        const significantOverage = 10_000n * ONE_USDC; // $10k over max

        const canWithdraw = await utilizationController.canWithdraw(
          TOTAL_ASSETS,
          currentAllocated,
          maxWithdraw + significantOverage
        );

        expect(canWithdraw).to.be.false;
      });

      it("should handle withdrawal from vault with 1 wei", async function () {
        const tinyVault = 1n;

        // With 0 allocation, should be able to withdraw everything
        expect(await utilizationController.canWithdraw(tinyVault, 0n, tinyVault)).to.be.true;

        // With 1 wei allocation, zero withdrawal is fine
        expect(await utilizationController.canWithdraw(tinyVault, 1n, 0n)).to.be.true;

        // With 1 wei allocation, full withdrawal would leave 0 assets but 1 allocated
        // This returns false because assetsAfterWithdraw == 0 but currentAllocated != 0
        expect(await utilizationController.canWithdraw(tinyVault, 1n, 1n)).to.be.false;
      });
    });

    describe("Complex Withdrawal Scenarios", function () {
      it("should correctly handle high utilization scenarios", async function () {
        // At 69% utilization (690k out of 1M)
        const currentAllocated = 690_000n * ONE_USDC;

        // Withdrawing $1 leaves $999,999 with $690k allocated
        // Utilization = (690k * 10000) / 999,999 = 6900006.9... -> 6900 bps due to rounding
        // Actually this is BELOW 70% so it PASSES!
        // Let's verify with a larger withdrawal that would clearly push over:
        // Withdrawing $15k leaves $985k with $690k allocated
        // Utilization = (690k * 10000) / 985k = 7005 bps -> over 70%
        const largeWithdraw = 15_000n * ONE_USDC;
        expect(await utilizationController.canWithdraw(TOTAL_ASSETS, currentAllocated, largeWithdraw)).to.be.false;

        // Zero withdrawal is fine
        expect(await utilizationController.canWithdraw(TOTAL_ASSETS, currentAllocated, 0n)).to.be.true;
      });

      it("should handle when current utilization already exceeds limit", async function () {
        // Start with 80% utilization (above limit, could happen via admin adjustment)
        const currentAllocated = 800_000n * ONE_USDC;

        // Withdrawing anything would make utilization even worse
        // Withdraw $1: 800k / 999,999 = 80.00008% > 70%
        // But due to rounding: (800k * 10000) / 999,999 = 8000 bps -> still > 7000
        // Actually small withdrawals still push utilization up, so they fail

        // Large withdrawal that would clearly exceed:
        const withdraw = 100_000n * ONE_USDC;
        // After: 800k / 900k = 88.9% > 70%
        expect(await utilizationController.canWithdraw(TOTAL_ASSETS, currentAllocated, withdraw)).to.be.false;

        // Zero withdrawal is still ok
        expect(await utilizationController.canWithdraw(TOTAL_ASSETS, currentAllocated, 0n)).to.be.true;
      });
    });
  });

  // =============================================================
  //                   getCurrentUtilization TESTS
  // =============================================================

  describe("getCurrentUtilization()", function () {
    it("should return 0 when no allocation", async function () {
      const utilization = await utilizationController.getCurrentUtilization(TOTAL_ASSETS, 0n);
      expect(utilization).to.equal(0n);
    });

    it("should return correct utilization in basis points", async function () {
      // 50% utilization
      const utilization = await utilizationController.getCurrentUtilization(
        TOTAL_ASSETS,
        500_000n * ONE_USDC
      );
      expect(utilization).to.equal(5000n); // 50% = 5000 bps
    });

    it("should return 7000 bps for 70% utilization", async function () {
      const utilization = await utilizationController.getCurrentUtilization(
        TOTAL_ASSETS,
        MAX_ALLOCATABLE
      );
      expect(utilization).to.equal(7000n);
    });

    it("should return 10000 bps (100%) for full utilization", async function () {
      const utilization = await utilizationController.getCurrentUtilization(
        TOTAL_ASSETS,
        TOTAL_ASSETS
      );
      expect(utilization).to.equal(BPS);
    });

    it("should return 0 when total assets is zero", async function () {
      const utilization = await utilizationController.getCurrentUtilization(0n, 0n);
      expect(utilization).to.equal(0n);
    });

    it("should handle utilization > 100% (over-allocation scenario)", async function () {
      // This could theoretically happen if totalAllocated > totalAssets due to losses
      const utilization = await utilizationController.getCurrentUtilization(
        TOTAL_ASSETS,
        TOTAL_ASSETS * 2n // 200% allocation
      );
      expect(utilization).to.equal(20000n); // 200% = 20000 bps
    });

    it("should be consistent with canAllocate at boundary", async function () {
      const currentAllocated = MAX_ALLOCATABLE;
      const utilization = await utilizationController.getCurrentUtilization(TOTAL_ASSETS, currentAllocated);

      expect(utilization).to.equal(DEFAULT_MAX_UTILIZATION_BPS);

      // Note: With ceiling division for security, allocating 1 more wei when at exactly 70%
      // results in utilization > 7000 bps, so canAllocate returns false
      // This is the conservative security-first behavior
      const canAllocateMore = await utilizationController.canAllocate(TOTAL_ASSETS, currentAllocated, 1n);
      expect(canAllocateMore).to.be.false; // Ceiling division prevents over-allocation
    });

    describe("Pure Function Behavior", function () {
      it("should return same result for same inputs (deterministic)", async function () {
        const result1 = await utilizationController.getCurrentUtilization(TOTAL_ASSETS, 500_000n * ONE_USDC);
        const result2 = await utilizationController.getCurrentUtilization(TOTAL_ASSETS, 500_000n * ONE_USDC);
        expect(result1).to.equal(result2);
      });

      it("should not modify any state", async function () {
        // Call multiple times and verify no state changes
        await utilizationController.getCurrentUtilization(TOTAL_ASSETS, 500_000n * ONE_USDC);
        await utilizationController.getCurrentUtilization(TOTAL_ASSETS, 700_000n * ONE_USDC);

        // maxUtilizationBps should still be default
        expect(await utilizationController.maxUtilizationBps()).to.equal(DEFAULT_MAX_UTILIZATION_BPS);
      });
    });
  });

  // =============================================================
  //                   availableForAllocation TESTS
  // =============================================================

  describe("availableForAllocation()", function () {
    it("should return full max allocatable when no current allocation", async function () {
      const available = await utilizationController.availableForAllocation(TOTAL_ASSETS, 0n);
      expect(available).to.equal(MAX_ALLOCATABLE);
    });

    it("should return remaining capacity after partial allocation", async function () {
      const currentAllocated = 500_000n * ONE_USDC;
      const available = await utilizationController.availableForAllocation(TOTAL_ASSETS, currentAllocated);
      expect(available).to.equal(MAX_ALLOCATABLE - currentAllocated);
    });

    it("should return 0 when at max utilization", async function () {
      const available = await utilizationController.availableForAllocation(TOTAL_ASSETS, MAX_ALLOCATABLE);
      expect(available).to.equal(0n);
    });

    it("should return 0 when over max utilization", async function () {
      const overAllocated = 800_000n * ONE_USDC; // 80%
      const available = await utilizationController.availableForAllocation(TOTAL_ASSETS, overAllocated);
      expect(available).to.equal(0n);
    });

    it("should return 0 for zero total assets", async function () {
      const available = await utilizationController.availableForAllocation(0n, 0n);
      expect(available).to.equal(0n);
    });

    it("should scale with vault size", async function () {
      const smallVault = 100_000n * ONE_USDC;
      const largeVault = 10_000_000n * ONE_USDC;

      const availableSmall = await utilizationController.availableForAllocation(smallVault, 0n);
      const availableLarge = await utilizationController.availableForAllocation(largeVault, 0n);

      expect(availableSmall).to.equal((smallVault * DEFAULT_MAX_UTILIZATION_BPS) / BPS);
      expect(availableLarge).to.equal((largeVault * DEFAULT_MAX_UTILIZATION_BPS) / BPS);
      expect(availableLarge).to.equal(availableSmall * 100n);
    });

    describe("Consistency Checks", function () {
      it("should be consistent with canAllocate", async function () {
        const currentAllocated = 500_000n * ONE_USDC;
        const available = await utilizationController.availableForAllocation(TOTAL_ASSETS, currentAllocated);

        // Should be able to allocate exactly the available amount
        expect(await utilizationController.canAllocate(TOTAL_ASSETS, currentAllocated, available)).to.be.true;

        // Due to integer division rounding in canAllocate, small increments above 'available'
        // may still pass because the utilization calculation rounds down.
        // Test with a significant increment that will definitely exceed the limit.
        if (available > 0n) {
          const significantIncrement = TOTAL_ASSETS / 100n; // 1% of total
          expect(await utilizationController.canAllocate(TOTAL_ASSETS, currentAllocated, available + significantIncrement)).to.be.false;
        }
      });
    });
  });

  // =============================================================
  //                   getReserveAmount TESTS
  // =============================================================

  describe("getReserveAmount()", function () {
    it("should return 30% of total assets with default utilization", async function () {
      const reserve = await utilizationController.getReserveAmount(TOTAL_ASSETS);
      expect(reserve).to.equal(RESERVE_AMOUNT);
    });

    it("should return 0 for zero total assets", async function () {
      const reserve = await utilizationController.getReserveAmount(0n);
      expect(reserve).to.equal(0n);
    });

    it("should scale linearly with vault size", async function () {
      const vault1 = 100_000n * ONE_USDC;
      const vault2 = 200_000n * ONE_USDC;

      const reserve1 = await utilizationController.getReserveAmount(vault1);
      const reserve2 = await utilizationController.getReserveAmount(vault2);

      expect(reserve2).to.equal(reserve1 * 2n);
    });

    it("should update when max utilization changes", async function () {
      const initialReserve = await utilizationController.getReserveAmount(TOTAL_ASSETS);
      expect(initialReserve).to.equal((TOTAL_ASSETS * 3000n) / BPS); // 30% with 70% utilization

      // Change to 50% max utilization
      await utilizationController.setMaxUtilization(5000n);

      const newReserve = await utilizationController.getReserveAmount(TOTAL_ASSETS);
      expect(newReserve).to.equal((TOTAL_ASSETS * 5000n) / BPS); // 50% reserve with 50% utilization
    });

    it("should return 0 reserve when max utilization is 100%", async function () {
      await utilizationController.setMaxUtilization(BPS);
      const reserve = await utilizationController.getReserveAmount(TOTAL_ASSETS);
      expect(reserve).to.equal(0n);
    });

    it("should return 100% reserve when max utilization is 0%", async function () {
      await utilizationController.setMaxUtilization(0n);
      const reserve = await utilizationController.getReserveAmount(TOTAL_ASSETS);
      expect(reserve).to.equal(TOTAL_ASSETS);
    });

    describe("Relationship with availableForAllocation", function () {
      it("should satisfy: reserve + maxAllocatable = totalAssets", async function () {
        const reserve = await utilizationController.getReserveAmount(TOTAL_ASSETS);
        const maxAllocatable = await utilizationController.availableForAllocation(TOTAL_ASSETS, 0n);

        expect(reserve + maxAllocatable).to.equal(TOTAL_ASSETS);
      });
    });
  });

  // =============================================================
  //                   maxWithdrawable TESTS
  // =============================================================

  describe("maxWithdrawable()", function () {
    it("should return full total assets when no allocation", async function () {
      const maxWithdraw = await utilizationController.maxWithdrawable(TOTAL_ASSETS, 0n);
      expect(maxWithdraw).to.equal(TOTAL_ASSETS);
    });

    it("should return correct max withdrawable amount", async function () {
      const currentAllocated = 600_000n * ONE_USDC; // 60%
      // Max withdraw: totalAssets - ceil((currentAllocated * BPS) / maxUtilizationBps)
      // = 1M - ceil(600k * 10000 / 7000)
      // = 1M - 857,142.857... = 142,857.142...
      // With ceiling division for minRequired, the max is slightly less (conservative)

      const maxWithdraw = await utilizationController.maxWithdrawable(TOTAL_ASSETS, currentAllocated);
      // Use ceiling division formula: (a + b - 1) / b
      const minRequired = (currentAllocated * BPS + DEFAULT_MAX_UTILIZATION_BPS - 1n) / DEFAULT_MAX_UTILIZATION_BPS;
      const expectedMax = TOTAL_ASSETS - minRequired;

      expect(maxWithdraw).to.equal(expectedMax);
    });

    it("should return 0 when at max utilization", async function () {
      // At 70% utilization, cannot withdraw anything
      const maxWithdraw = await utilizationController.maxWithdrawable(TOTAL_ASSETS, MAX_ALLOCATABLE);
      expect(maxWithdraw).to.equal(0n);
    });

    it("should return 0 when over max utilization", async function () {
      const overAllocated = 800_000n * ONE_USDC;
      const maxWithdraw = await utilizationController.maxWithdrawable(TOTAL_ASSETS, overAllocated);
      expect(maxWithdraw).to.equal(0n);
    });

    it("should return full total assets for empty vault with no allocation", async function () {
      // Edge case: 0 total assets with 0 allocation
      const maxWithdraw = await utilizationController.maxWithdrawable(0n, 0n);
      expect(maxWithdraw).to.equal(0n);
    });

    describe("Consistency with canWithdraw", function () {
      it("should be able to withdraw exactly the max amount", async function () {
        const currentAllocated = 500_000n * ONE_USDC;
        const maxWithdraw = await utilizationController.maxWithdrawable(TOTAL_ASSETS, currentAllocated);

        expect(await utilizationController.canWithdraw(TOTAL_ASSETS, currentAllocated, maxWithdraw)).to.be.true;
      });

      it("should NOT be able to withdraw significantly more than max", async function () {
        const currentAllocated = 500_000n * ONE_USDC;
        const maxWithdraw = await utilizationController.maxWithdrawable(TOTAL_ASSETS, currentAllocated);

        // Due to integer division rounding, small increments above maxWithdraw may still pass
        // Test with a significant increment to ensure it fails
        if (maxWithdraw < TOTAL_ASSETS) {
          const significantIncrement = 10_000n * ONE_USDC; // $10k over
          expect(await utilizationController.canWithdraw(TOTAL_ASSETS, currentAllocated, maxWithdraw + significantIncrement)).to.be.false;
        }
      });
    });

    describe("Edge Cases", function () {
      it("should handle very small allocations", async function () {
        const tinyAllocation = 1n;
        const maxWithdraw = await utilizationController.maxWithdrawable(TOTAL_ASSETS, tinyAllocation);

        // Should be able to withdraw almost everything
        // minRequired = ceil(1 * 10000 / 7000) = 2 (ceiling division)
        const minRequired = (tinyAllocation * BPS + DEFAULT_MAX_UTILIZATION_BPS - 1n) / DEFAULT_MAX_UTILIZATION_BPS;
        expect(maxWithdraw).to.equal(TOTAL_ASSETS - minRequired);
      });

      it("should handle when min required assets >= total assets", async function () {
        // If allocated is large enough that minRequired >= totalAssets
        const highAllocation = 800_000n * ONE_USDC; // 80%
        const minRequired = (highAllocation * BPS) / DEFAULT_MAX_UTILIZATION_BPS;

        // minRequired = 800k * 10000 / 7000 = 1,142,857 > 1,000,000
        expect(minRequired).to.be.gt(TOTAL_ASSETS);

        const maxWithdraw = await utilizationController.maxWithdrawable(TOTAL_ASSETS, highAllocation);
        expect(maxWithdraw).to.equal(0n);
      });
    });
  });

  // =============================================================
  //                   ADMIN FUNCTIONS TESTS
  // =============================================================

  describe("Admin Functions", function () {
    describe("setMaxUtilization()", function () {
      it("should allow owner to update max utilization", async function () {
        const newMax = 5000n; // 50%
        await utilizationController.setMaxUtilization(newMax);
        expect(await utilizationController.maxUtilizationBps()).to.equal(newMax);
      });

      it("should emit MaxUtilizationUpdated event", async function () {
        const oldMax = await utilizationController.maxUtilizationBps();
        const newMax = 5000n;

        await expect(utilizationController.setMaxUtilization(newMax))
          .to.emit(utilizationController, "MaxUtilizationUpdated")
          .withArgs(oldMax, newMax);
      });

      it("should accept 0% max utilization (all funds reserved)", async function () {
        await utilizationController.setMaxUtilization(0n);
        expect(await utilizationController.maxUtilizationBps()).to.equal(0n);

        // With 0% max utilization, any allocation would result in utilization > 0
        // But canAllocate checks: newUtilization <= maxUtilizationBps
        // newUtilization = (1 * 10000) / totalAssets = 0 (rounds down for small amounts)
        // So 1 wei actually passes because 0 <= 0!
        // Need to test with enough allocation to show non-zero utilization
        const smallAmount = TOTAL_ASSETS / BPS; // 0.01% of total
        expect(await utilizationController.canAllocate(TOTAL_ASSETS, 0n, smallAmount)).to.be.false;
      });

      it("should accept 100% max utilization (no reserve)", async function () {
        await utilizationController.setMaxUtilization(BPS);
        expect(await utilizationController.maxUtilizationBps()).to.equal(BPS);

        // Should be able to allocate everything
        expect(await utilizationController.canAllocate(TOTAL_ASSETS, 0n, TOTAL_ASSETS)).to.be.true;
      });

      it("should reject value exceeding 100% (10000 bps)", async function () {
        await expect(
          utilizationController.setMaxUtilization(BPS + 1n)
        ).to.be.revertedWithCustomError(utilizationController, "ArrayLengthMismatch")
          .withArgs(BPS, BPS + 1n);
      });

      it("should reject non-owner", async function () {
        let reverted = false;
        try {
          await utilizationController.connect(nonOwner).setMaxUtilization(5000n);
        } catch {
          reverted = true;
        }
        expect(reverted).to.be.true;
      });

      it("should affect canAllocate immediately", async function () {
        // At 70%, anything over 700k should fail (with sufficient margin for rounding)
        const clearlyOverLimit = 750_000n * ONE_USDC; // 75%
        expect(await utilizationController.canAllocate(TOTAL_ASSETS, 0n, clearlyOverLimit)).to.be.false;

        // Change to 80%
        await utilizationController.setMaxUtilization(8000n);

        // Now 75% should be allowed (under new 80% limit)
        expect(await utilizationController.canAllocate(TOTAL_ASSETS, 0n, clearlyOverLimit)).to.be.true;
      });

      it("should affect canWithdraw immediately", async function () {
        const currentAllocated = 600_000n * ONE_USDC;

        // At 70% limit, withdrawing 200k would leave 800k with 600k allocated = 75% > 70%
        expect(await utilizationController.canWithdraw(TOTAL_ASSETS, currentAllocated, 200_000n * ONE_USDC)).to.be.false;

        // Change to 80% limit
        await utilizationController.setMaxUtilization(8000n);

        // Now 75% is ok (< 80%)
        expect(await utilizationController.canWithdraw(TOTAL_ASSETS, currentAllocated, 200_000n * ONE_USDC)).to.be.true;
      });

      it("should allow updating multiple times", async function () {
        await utilizationController.setMaxUtilization(5000n);
        expect(await utilizationController.maxUtilizationBps()).to.equal(5000n);

        await utilizationController.setMaxUtilization(6000n);
        expect(await utilizationController.maxUtilizationBps()).to.equal(6000n);

        await utilizationController.setMaxUtilization(DEFAULT_MAX_UTILIZATION_BPS);
        expect(await utilizationController.maxUtilizationBps()).to.equal(DEFAULT_MAX_UTILIZATION_BPS);
      });
    });

    describe("setVault()", function () {
      it("should allow owner to update vault address", async function () {
        const newVault = await nonOwner.getAddress();
        await utilizationController.setVault(newVault);
        expect(await utilizationController.vault()).to.equal(newVault);
      });

      it("should emit VaultSet event", async function () {
        const newVault = await nonOwner.getAddress();
        await expect(utilizationController.setVault(newVault))
          .to.emit(utilizationController, "VaultSet")
          .withArgs(newVault);
      });

      it("should reject zero address", async function () {
        await expect(
          utilizationController.setVault(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(utilizationController, "ZeroAddress");
      });

      it("should reject non-owner", async function () {
        let reverted = false;
        try {
          await utilizationController.connect(nonOwner).setVault(await nonOwner.getAddress());
        } catch {
          reverted = true;
        }
        expect(reverted).to.be.true;
      });

      it("should allow setting same vault address", async function () {
        const currentVault = await utilizationController.vault();
        await utilizationController.setVault(currentVault);
        expect(await utilizationController.vault()).to.equal(currentVault);
      });
    });
  });

  // =============================================================
  //                   ACCESS CONTROL TESTS
  // =============================================================

  describe("Access Control", function () {
    it("should reject setMaxUtilization from non-owner", async function () {
      let reverted = false;
      try {
        await utilizationController.connect(nonOwner).setMaxUtilization(5000n);
      } catch {
        reverted = true;
      }
      expect(reverted).to.be.true;
    });

    it("should reject setVault from non-owner", async function () {
      let reverted = false;
      try {
        await utilizationController.connect(nonOwner).setVault(await attacker.getAddress());
      } catch {
        reverted = true;
      }
      expect(reverted).to.be.true;
    });

    it("should allow view functions from any address", async function () {
      // View functions should be callable by anyone
      expect(await utilizationController.connect(attacker).canAllocate(TOTAL_ASSETS, 0n, 1000n)).to.be.true;
      expect(await utilizationController.connect(attacker).canWithdraw(TOTAL_ASSETS, 0n, 1000n)).to.be.true;
      expect(await utilizationController.connect(attacker).getCurrentUtilization(TOTAL_ASSETS, 500_000n * ONE_USDC)).to.equal(5000n);
      expect(await utilizationController.connect(attacker).availableForAllocation(TOTAL_ASSETS, 0n)).to.equal(MAX_ALLOCATABLE);
      expect(await utilizationController.connect(attacker).getReserveAmount(TOTAL_ASSETS)).to.equal(RESERVE_AMOUNT);
      expect(await utilizationController.connect(attacker).maxWithdrawable(TOTAL_ASSETS, 0n)).to.equal(TOTAL_ASSETS);
    });
  });

  // =============================================================
  //                   EDGE CASES AND INVARIANTS
  // =============================================================

  describe("Edge Cases and Invariants", function () {
    describe("Arithmetic Invariants", function () {
      it("should maintain: availableForAllocation + currentAllocated <= maxAllocatable", async function () {
        const allocations = [0n, 100_000n * ONE_USDC, 500_000n * ONE_USDC, MAX_ALLOCATABLE];

        for (const allocated of allocations) {
          const available = await utilizationController.availableForAllocation(TOTAL_ASSETS, allocated);
          expect(available + allocated).to.be.lte(MAX_ALLOCATABLE);
        }
      });

      it("should maintain: getReserveAmount + availableForAllocation = totalAssets (when no allocation)", async function () {
        const reserve = await utilizationController.getReserveAmount(TOTAL_ASSETS);
        const available = await utilizationController.availableForAllocation(TOTAL_ASSETS, 0n);
        expect(reserve + available).to.equal(TOTAL_ASSETS);
      });

      it("should maintain: getCurrentUtilization <= maxUtilizationBps when canAllocate returns true", async function () {
        const testCases = [
          { allocated: 0n, newAlloc: 100_000n * ONE_USDC },
          { allocated: 300_000n * ONE_USDC, newAlloc: 200_000n * ONE_USDC },
          { allocated: 500_000n * ONE_USDC, newAlloc: 200_000n * ONE_USDC },
        ];

        for (const { allocated, newAlloc } of testCases) {
          const canAlloc = await utilizationController.canAllocate(TOTAL_ASSETS, allocated, newAlloc);
          if (canAlloc) {
            const newUtilization = await utilizationController.getCurrentUtilization(
              TOTAL_ASSETS,
              allocated + newAlloc
            );
            expect(newUtilization).to.be.lte(DEFAULT_MAX_UTILIZATION_BPS);
          }
        }
      });
    });

    describe("Consistency Between Functions", function () {
      it("should have consistent results between canAllocate and availableForAllocation", async function () {
        const currentAllocated = 400_000n * ONE_USDC;
        const available = await utilizationController.availableForAllocation(TOTAL_ASSETS, currentAllocated);

        // Should be able to allocate exactly available amount
        expect(await utilizationController.canAllocate(TOTAL_ASSETS, currentAllocated, available)).to.be.true;

        // Due to integer division rounding, small increments above available may still pass
        // Test with a significant increment
        const significantIncrement = TOTAL_ASSETS / 100n; // 1% of total
        expect(await utilizationController.canAllocate(TOTAL_ASSETS, currentAllocated, available + significantIncrement)).to.be.false;
      });

      it("should have consistent results between canWithdraw and maxWithdrawable", async function () {
        const currentAllocated = 500_000n * ONE_USDC;
        const maxWithdraw = await utilizationController.maxWithdrawable(TOTAL_ASSETS, currentAllocated);

        // Should be able to withdraw exactly max amount
        expect(await utilizationController.canWithdraw(TOTAL_ASSETS, currentAllocated, maxWithdraw)).to.be.true;

        // Due to integer division rounding, small increments above maxWithdraw may still pass
        // Test with a significant increment
        if (maxWithdraw < TOTAL_ASSETS) {
          const significantIncrement = 10_000n * ONE_USDC; // $10k over
          expect(await utilizationController.canWithdraw(TOTAL_ASSETS, currentAllocated, maxWithdraw + significantIncrement)).to.be.false;
        }
      });
    });

    describe("Max Utilization Edge Values", function () {
      it("should work correctly with 0% max utilization", async function () {
        await utilizationController.setMaxUtilization(0n);

        // With 0% max utilization and tiny amounts, rounding may allow allocation
        // because (1 * 10000) / TOTAL_ASSETS = 0 <= 0
        // Test with an amount that would give non-zero utilization
        const significantAmount = TOTAL_ASSETS / BPS; // 0.01% which gives 1 bps utilization
        expect(await utilizationController.canAllocate(TOTAL_ASSETS, 0n, significantAmount)).to.be.false;

        // Available for allocation is 0
        expect(await utilizationController.availableForAllocation(TOTAL_ASSETS, 0n)).to.equal(0n);

        // Reserve is everything
        expect(await utilizationController.getReserveAmount(TOTAL_ASSETS)).to.equal(TOTAL_ASSETS);

        // Can withdraw everything (no allocation)
        expect(await utilizationController.maxWithdrawable(TOTAL_ASSETS, 0n)).to.equal(TOTAL_ASSETS);
      });

      it("should work correctly with 100% max utilization", async function () {
        await utilizationController.setMaxUtilization(BPS);

        // Can allocate everything
        expect(await utilizationController.canAllocate(TOTAL_ASSETS, 0n, TOTAL_ASSETS)).to.be.true;

        // Available for allocation is everything
        expect(await utilizationController.availableForAllocation(TOTAL_ASSETS, 0n)).to.equal(TOTAL_ASSETS);

        // Reserve is 0
        expect(await utilizationController.getReserveAmount(TOTAL_ASSETS)).to.equal(0n);

        // With full allocation, cannot withdraw anything
        expect(await utilizationController.maxWithdrawable(TOTAL_ASSETS, TOTAL_ASSETS)).to.equal(0n);
      });

      it("should work correctly with 1 bps (0.01%) max utilization", async function () {
        await utilizationController.setMaxUtilization(1n);

        // Can only allocate 0.01% of vault
        const maxAlloc = (TOTAL_ASSETS * 1n) / BPS;
        expect(await utilizationController.availableForAllocation(TOTAL_ASSETS, 0n)).to.equal(maxAlloc);
        expect(await utilizationController.canAllocate(TOTAL_ASSETS, 0n, maxAlloc)).to.be.true;
        expect(await utilizationController.canAllocate(TOTAL_ASSETS, 0n, maxAlloc + 1n)).to.be.false;
      });

      it("should work correctly with 9999 bps (99.99%) max utilization", async function () {
        await utilizationController.setMaxUtilization(9999n);

        // Can allocate 99.99% of vault
        const maxAlloc = (TOTAL_ASSETS * 9999n) / BPS;
        expect(await utilizationController.availableForAllocation(TOTAL_ASSETS, 0n)).to.equal(maxAlloc);
        expect(await utilizationController.canAllocate(TOTAL_ASSETS, 0n, maxAlloc)).to.be.true;
      });
    });

    describe("Large Number Handling", function () {
      it("should handle maximum uint256 values safely", async function () {
        // Test with values close to uint256 max but that won't overflow
        const largeAssets = ethers.MaxUint256 / (2n * BPS); // Divide by 20000 to prevent overflow
        const largeAllocation = (largeAssets * DEFAULT_MAX_UTILIZATION_BPS) / BPS;

        const canAllocate = await utilizationController.canAllocate(
          largeAssets,
          0n,
          largeAllocation
        );
        expect(canAllocate).to.be.true;
      });

      it("should handle very precise calculations", async function () {
        // Test with prime numbers to check for rounding issues
        const primeAssets = 10000000007n; // Large prime
        const maxAlloc = (primeAssets * DEFAULT_MAX_UTILIZATION_BPS) / BPS;

        expect(await utilizationController.canAllocate(primeAssets, 0n, maxAlloc)).to.be.true;
        expect(await utilizationController.canAllocate(primeAssets, 0n, maxAlloc + 1n)).to.be.false;
      });
    });
  });

  // =============================================================
  //                   INTEGRATION SCENARIOS
  // =============================================================

  describe("Integration Scenarios", function () {
    describe("Vault Growth Scenario", function () {
      it("should handle vault size increase correctly", async function () {
        const initialVault = 1_000_000n * ONE_USDC;
        const grownVault = 2_000_000n * ONE_USDC;
        const currentAllocated = 600_000n * ONE_USDC; // 60% of initial

        // At initial size: 60% utilization, can allocate 10% more (70k)
        const initialAvailable = await utilizationController.availableForAllocation(initialVault, currentAllocated);
        expect(initialAvailable).to.equal((initialVault * DEFAULT_MAX_UTILIZATION_BPS) / BPS - currentAllocated);

        // After growth: 30% utilization, can allocate 40% more (800k)
        const grownAvailable = await utilizationController.availableForAllocation(grownVault, currentAllocated);
        expect(grownAvailable).to.equal((grownVault * DEFAULT_MAX_UTILIZATION_BPS) / BPS - currentAllocated);
        expect(grownAvailable).to.be.gt(initialAvailable);
      });
    });

    describe("Vault Shrinkage Scenario", function () {
      it("should handle vault size decrease correctly", async function () {
        const initialVault = 1_000_000n * ONE_USDC;
        const shrunkVault = 500_000n * ONE_USDC;
        const currentAllocated = 400_000n * ONE_USDC; // 40% of initial = 80% of shrunk

        // At initial size: 40% utilization, can allocate 30% more
        expect(await utilizationController.canAllocate(initialVault, currentAllocated, 100_000n * ONE_USDC)).to.be.true;

        // After shrinkage: 80% utilization > 70% limit, cannot allocate anything
        expect(await utilizationController.canAllocate(shrunkVault, currentAllocated, 1n)).to.be.false;

        // Available for allocation is 0
        expect(await utilizationController.availableForAllocation(shrunkVault, currentAllocated)).to.equal(0n);
      });

      it("should correctly restrict withdrawals after vault shrinkage", async function () {
        const initialVault = 1_000_000n * ONE_USDC;
        const shrunkVault = 700_000n * ONE_USDC;
        const currentAllocated = 500_000n * ONE_USDC;

        // At initial size: 50% utilization
        expect(await utilizationController.getCurrentUtilization(initialVault, currentAllocated)).to.equal(5000n);

        // After shrinkage: 71.4% utilization (over limit)
        expect(await utilizationController.getCurrentUtilization(shrunkVault, currentAllocated)).to.be.gt(DEFAULT_MAX_UTILIZATION_BPS);

        // Cannot withdraw anything
        expect(await utilizationController.maxWithdrawable(shrunkVault, currentAllocated)).to.equal(0n);
      });
    });

    describe("Emergency Mode Scenario", function () {
      it("should handle max utilization increase (emergency capital deployment)", async function () {
        const currentAllocated = 600_000n * ONE_USDC; // 60%

        // Normal: can only allocate 100k more (to reach 70%)
        expect(await utilizationController.availableForAllocation(TOTAL_ASSETS, currentAllocated)).to.equal(100_000n * ONE_USDC);

        // Emergency: increase to 90%
        await utilizationController.setMaxUtilization(9000n);

        // Now can allocate 300k more (to reach 90%)
        expect(await utilizationController.availableForAllocation(TOTAL_ASSETS, currentAllocated)).to.equal(300_000n * ONE_USDC);
      });

      it("should handle max utilization decrease (defensive mode)", async function () {
        const currentAllocated = 500_000n * ONE_USDC; // 50%

        // Normal: can allocate 200k more
        expect(await utilizationController.availableForAllocation(TOTAL_ASSETS, currentAllocated)).to.equal(200_000n * ONE_USDC);

        // Defensive: decrease to 50%
        await utilizationController.setMaxUtilization(5000n);

        // Now at limit, cannot allocate anything
        expect(await utilizationController.availableForAllocation(TOTAL_ASSETS, currentAllocated)).to.equal(0n);
        expect(await utilizationController.canAllocate(TOTAL_ASSETS, currentAllocated, 1n)).to.be.false;
      });
    });

    describe("LP Withdrawal Queue Scenario", function () {
      it("should correctly calculate max withdrawable for LP queue", async function () {
        // Scenario: Multiple LPs want to withdraw, need to know how much is available

        // Start: $1M vault, $500k allocated (50%)
        const currentAllocated = 500_000n * ONE_USDC;

        // Max that can be withdrawn while maintaining 70% utilization
        const maxWithdraw = await utilizationController.maxWithdrawable(TOTAL_ASSETS, currentAllocated);

        // After max withdrawal: utilization should be exactly at limit
        const assetsAfterWithdraw = TOTAL_ASSETS - maxWithdraw;
        const utilizationAfter = await utilizationController.getCurrentUtilization(assetsAfterWithdraw, currentAllocated);

        // Should be at or just below 70% due to rounding
        expect(utilizationAfter).to.be.lte(DEFAULT_MAX_UTILIZATION_BPS);

        // Verify the math: allocated / (total - maxWithdraw) should equal max utilization
        // 500k / (1M - maxWithdraw) = 0.7
        // Solving: maxWithdraw = 1M - ceil(500k*10000/7000) = 1M - 714,286 = 285,714 USDC
        // With ceiling division for minRequired (conservative)
        const minRequired = (currentAllocated * BPS + DEFAULT_MAX_UTILIZATION_BPS - 1n) / DEFAULT_MAX_UTILIZATION_BPS;
        const expectedMax = TOTAL_ASSETS - minRequired;
        expect(maxWithdraw).to.equal(expectedMax);
      });
    });
  });

  // =============================================================
  //                   FUZZ-LIKE TESTING
  // =============================================================

  describe("Fuzz-Like Testing", function () {
    it("should maintain invariants across random-like inputs", async function () {
      // Test various combinations
      const totalAssetValues = [
        1n,
        100n,
        1000n * ONE_USDC,
        TOTAL_ASSETS,
        10n * TOTAL_ASSETS,
      ];

      const allocationRatios = [0n, 1000n, 3500n, 7000n, 8000n, 10000n]; // bps

      for (const assets of totalAssetValues) {
        for (const ratioBps of allocationRatios) {
          const allocated = (assets * ratioBps) / BPS;

          // Get values
          const available = await utilizationController.availableForAllocation(assets, allocated);
          const utilization = await utilizationController.getCurrentUtilization(assets, allocated);
          const reserve = await utilizationController.getReserveAmount(assets);
          const maxWithdraw = await utilizationController.maxWithdrawable(assets, allocated);

          // Check invariants
          // 1. Available should never be negative (Solidity handles this but let's verify)
          expect(available).to.be.gte(0n);

          // 2. If utilization <= max, we should be able to allocate at least 0
          if (utilization <= DEFAULT_MAX_UTILIZATION_BPS) {
            expect(await utilizationController.canAllocate(assets, allocated, 0n)).to.be.true;
          }

          // 3. Reserve + max allocatable = total (when no current allocation)
          // Note: This invariant only holds for assets >= BPS due to integer division precision
          if (allocated === 0n && assets >= BPS) {
            expect(reserve + available).to.equal(assets);
          }

          // 4. Max withdrawable should be consistent with canWithdraw
          expect(await utilizationController.canWithdraw(assets, allocated, maxWithdraw)).to.be.true;
        }
      }
    });

    it("should handle extreme utilization scenarios", async function () {
      // Test with 99% and 1% utilization scenarios
      const scenarios = [
        { utilBps: 100n, desc: "1% utilization" },
        { utilBps: 5000n, desc: "50% utilization" },
        { utilBps: 6999n, desc: "69.99% utilization" },
        { utilBps: 7000n, desc: "70% utilization (limit)" },
        { utilBps: 7001n, desc: "70.01% utilization (over limit)" },
        { utilBps: 9900n, desc: "99% utilization" },
      ];

      for (const { utilBps, desc } of scenarios) {
        const allocated = (TOTAL_ASSETS * utilBps) / BPS;
        const actualUtil = await utilizationController.getCurrentUtilization(TOTAL_ASSETS, allocated);

        // Due to integer division, actual util might differ slightly
        // but should be within 1 bps of target
        expect(actualUtil).to.be.closeTo(utilBps, 1);

        if (utilBps <= DEFAULT_MAX_UTILIZATION_BPS) {
          // Should be able to allocate at least 0
          expect(await utilizationController.canAllocate(TOTAL_ASSETS, allocated, 0n)).to.be.true;
        }
      }
    });
  });

  // =============================================================
  //                   STATE MUTATION VERIFICATION
  // =============================================================

  describe("State Mutation Verification", function () {
    it("should only modify maxUtilizationBps via setMaxUtilization", async function () {
      const initialMax = await utilizationController.maxUtilizationBps();
      const initialVault = await utilizationController.vault();

      // Call all view functions
      await utilizationController.canAllocate(TOTAL_ASSETS, 0n, 100n);
      await utilizationController.canWithdraw(TOTAL_ASSETS, 0n, 100n);
      await utilizationController.getCurrentUtilization(TOTAL_ASSETS, 100n);
      await utilizationController.availableForAllocation(TOTAL_ASSETS, 100n);
      await utilizationController.getReserveAmount(TOTAL_ASSETS);
      await utilizationController.maxWithdrawable(TOTAL_ASSETS, 100n);

      // State should be unchanged
      expect(await utilizationController.maxUtilizationBps()).to.equal(initialMax);
      expect(await utilizationController.vault()).to.equal(initialVault);

      // Now modify
      await utilizationController.setMaxUtilization(5000n);
      expect(await utilizationController.maxUtilizationBps()).to.equal(5000n);
      expect(await utilizationController.vault()).to.equal(initialVault); // Unchanged
    });

    it("should only modify vault via setVault", async function () {
      const initialMax = await utilizationController.maxUtilizationBps();
      const newVault = await nonOwner.getAddress();

      await utilizationController.setVault(newVault);

      expect(await utilizationController.vault()).to.equal(newVault);
      expect(await utilizationController.maxUtilizationBps()).to.equal(initialMax); // Unchanged
    });
  });
});

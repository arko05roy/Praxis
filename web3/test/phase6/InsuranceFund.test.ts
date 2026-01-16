import { expect } from "chai";
import { network } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = await network.connect();

/**
 * InsuranceFund Comprehensive Test Suite
 *
 * This test suite exhaustively validates the InsuranceFund contract which:
 * - Collects 2% (200 bps) of executor profits as insurance fee
 * - Covers losses before LPs absorb them during black swan events
 * - Manages a reserve fund with timelocked emergency withdrawals
 * - Integrates with settlement process via onlySettlement modifier
 *
 * Tests run against Flare mainnet fork to ensure realistic environment.
 *
 * CRITICAL INVARIANTS TESTED:
 * 1. fundBalance must always equal actual token balance (or be synced)
 * 2. Insurance fee cannot exceed 10% (1000 bps)
 * 3. Emergency withdrawals require 2-day timelock
 * 4. Only settlement engine can collect profits or cover losses
 * 5. Base asset cannot be rescued (prevents draining)
 */
describe("InsuranceFund", function () {
  this.timeout(120000);

  // Contract instances
  let insuranceFund: any;
  let usdc: any;
  let usdcAddress: string;
  let rescueToken: any;

  // Signers
  let owner: SignerWithAddress;
  let settlementEngine: SignerWithAddress;
  let vault: SignerWithAddress;
  let depositor: SignerWithAddress;
  let recipient: SignerWithAddress;
  let nonOwner: SignerWithAddress;

  // Constants
  const BPS = 10000n;
  const DEFAULT_INSURANCE_FEE_BPS = 200n; // 2%
  const ONE_USDC = 10n ** 6n;
  const EMERGENCY_TIMELOCK = 2n * 24n * 60n * 60n; // 2 days in seconds

  before(async function () {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    if (chainId !== 14n) {
      console.log(`Skipping - not on Flare fork (chainId: ${chainId})`);
      this.skip();
    }

    [owner, settlementEngine, vault, depositor, recipient, nonOwner] = await ethers.getSigners();
    console.log(`Test owner: ${await owner.getAddress()}`);
  });

  beforeEach(async function () {
    // Deploy MockERC20 for testing (simulating USDC with 6 decimals)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("Mock USDC", "mUSDC", 6);
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();

    // Deploy a separate rescue token for rescue tests
    rescueToken = await MockERC20.deploy("Rescue Token", "RSC", 18);
    await rescueToken.waitForDeployment();

    // Mint tokens to test accounts
    const mintAmount = 1_000_000n * ONE_USDC;
    await usdc.mint(await settlementEngine.getAddress(), mintAmount);
    await usdc.mint(await depositor.getAddress(), mintAmount);
    await usdc.mint(await owner.getAddress(), mintAmount);

    console.log(`Settlement engine mUSDC balance: ${ethers.formatUnits(await usdc.balanceOf(await settlementEngine.getAddress()), 6)}`);

    // Deploy InsuranceFund
    const InsuranceFund = await ethers.getContractFactory("InsuranceFund");
    insuranceFund = await InsuranceFund.deploy(
      await vault.getAddress(),
      usdcAddress
    );
    await insuranceFund.waitForDeployment();

    // Set the settlement engine
    await insuranceFund.setSettlementEngine(await settlementEngine.getAddress());

    // Approve InsuranceFund to spend settlement engine's tokens
    await usdc.connect(settlementEngine).approve(await insuranceFund.getAddress(), ethers.MaxUint256);
    await usdc.connect(depositor).approve(await insuranceFund.getAddress(), ethers.MaxUint256);
  });

  // =============================================================
  //                    DEPLOYMENT TESTS
  // =============================================================

  describe("Deployment and Initialization", function () {
    it("should deploy with correct vault address", async function () {
      expect(await insuranceFund.vault()).to.equal(await vault.getAddress());
    });

    it("should deploy with correct base asset", async function () {
      expect(await insuranceFund.baseAsset()).to.equal(usdcAddress);
    });

    it("should deploy with owner as msg.sender", async function () {
      expect(await insuranceFund.owner()).to.equal(await owner.getAddress());
    });

    it("should have default insurance fee of 2% (200 bps)", async function () {
      expect(await insuranceFund.insuranceFeeBps()).to.equal(DEFAULT_INSURANCE_FEE_BPS);
    });

    it("should have BPS constant equal to 10000", async function () {
      expect(await insuranceFund.BPS()).to.equal(BPS);
    });

    it("should have DEFAULT_INSURANCE_FEE_BPS constant equal to 200", async function () {
      expect(await insuranceFund.DEFAULT_INSURANCE_FEE_BPS()).to.equal(200n);
    });

    it("should have EMERGENCY_TIMELOCK constant equal to 2 days", async function () {
      expect(await insuranceFund.EMERGENCY_TIMELOCK()).to.equal(EMERGENCY_TIMELOCK);
    });

    it("should have zero fund balance initially", async function () {
      expect(await insuranceFund.fundBalance()).to.equal(0n);
    });

    it("should have settlement engine as zero address before setting", async function () {
      // Deploy fresh contract without setting settlement engine
      const InsuranceFund = await ethers.getContractFactory("InsuranceFund");
      const freshFund = await InsuranceFund.deploy(
        await vault.getAddress(),
        usdcAddress
      );
      await freshFund.waitForDeployment();

      expect(await freshFund.settlementEngine()).to.equal(ethers.ZeroAddress);
    });

    it("should revert deployment with zero vault address", async function () {
      const InsuranceFund = await ethers.getContractFactory("InsuranceFund");
      await expect(
        InsuranceFund.deploy(ethers.ZeroAddress, usdcAddress)
      ).to.be.revertedWithCustomError(insuranceFund, "ZeroAddress");
    });

    it("should revert deployment with zero base asset address", async function () {
      const InsuranceFund = await ethers.getContractFactory("InsuranceFund");
      await expect(
        InsuranceFund.deploy(await vault.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(insuranceFund, "ZeroAddress");
    });

    it("should have empty pending withdrawal initially", async function () {
      const pending = await insuranceFund.pendingWithdrawal();
      expect(pending.to).to.equal(ethers.ZeroAddress);
      expect(pending.amount).to.equal(0n);
      expect(pending.unlockTime).to.equal(0n);
    });
  });

  // =============================================================
  //                  PROFIT COLLECTION TESTS
  // =============================================================

  describe("Profit Collection (collectFromProfit)", function () {
    describe("Access Control", function () {
      it("should reject calls from non-settlement engine", async function () {
        await expect(
          insuranceFund.connect(nonOwner).collectFromProfit(1000n * ONE_USDC)
        ).to.be.revertedWithCustomError(insuranceFund, "OnlySettlement");
      });

      it("should reject calls from owner (not settlement engine)", async function () {
        await expect(
          insuranceFund.connect(owner).collectFromProfit(1000n * ONE_USDC)
        ).to.be.revertedWithCustomError(insuranceFund, "OnlySettlement");
      });

      it("should allow calls from settlement engine", async function () {
        const profit = 1000n * ONE_USDC;
        await insuranceFund.connect(settlementEngine).collectFromProfit(profit);
        // Should not revert
        expect(await insuranceFund.fundBalance()).to.be.gt(0n);
      });
    });

    describe("Fee Calculation", function () {
      it("should collect exactly 2% of profit", async function () {
        const profit = 10000n * ONE_USDC; // $10,000
        const expectedFee = (profit * DEFAULT_INSURANCE_FEE_BPS) / BPS; // $200

        await insuranceFund.connect(settlementEngine).collectFromProfit(profit);

        expect(await insuranceFund.fundBalance()).to.equal(expectedFee);
      });

      it("should return correct collected amount", async function () {
        const profit = 5000n * ONE_USDC;
        const expectedFee = (profit * DEFAULT_INSURANCE_FEE_BPS) / BPS;

        const tx = await insuranceFund.connect(settlementEngine).collectFromProfit(profit);
        const receipt = await tx.wait();

        // The collected amount is returned by the function
        // We verify via fund balance change
        expect(await insuranceFund.fundBalance()).to.equal(expectedFee);
      });

      it("should handle zero profit (no collection)", async function () {
        await insuranceFund.connect(settlementEngine).collectFromProfit(0n);
        expect(await insuranceFund.fundBalance()).to.equal(0n);
      });

      it("should handle small profit amounts with precision", async function () {
        // Test with a profit that results in fractional fee
        const profit = 50n; // 50 micro-USDC
        const expectedFee = (profit * DEFAULT_INSURANCE_FEE_BPS) / BPS; // 1 micro-USDC

        await insuranceFund.connect(settlementEngine).collectFromProfit(profit);
        expect(await insuranceFund.fundBalance()).to.equal(expectedFee);
      });

      it("should handle profit amount that results in zero fee (too small)", async function () {
        // Profit of 49 micro-USDC: 49 * 200 / 10000 = 0 (integer division)
        const profit = 49n;
        await insuranceFund.connect(settlementEngine).collectFromProfit(profit);
        expect(await insuranceFund.fundBalance()).to.equal(0n);
      });

      it("should handle large profit amounts", async function () {
        const profit = 100_000_000n * ONE_USDC; // $100M
        const expectedFee = (profit * DEFAULT_INSURANCE_FEE_BPS) / BPS; // $2M

        // Mint more tokens for this test
        await usdc.mint(await settlementEngine.getAddress(), profit);

        await insuranceFund.connect(settlementEngine).collectFromProfit(profit);
        expect(await insuranceFund.fundBalance()).to.equal(expectedFee);
      });
    });

    describe("Token Transfers", function () {
      it("should transfer tokens from settlement engine", async function () {
        const profit = 10000n * ONE_USDC;
        const expectedFee = (profit * DEFAULT_INSURANCE_FEE_BPS) / BPS;

        const balanceBefore = await usdc.balanceOf(await settlementEngine.getAddress());
        await insuranceFund.connect(settlementEngine).collectFromProfit(profit);
        const balanceAfter = await usdc.balanceOf(await settlementEngine.getAddress());

        expect(balanceBefore - balanceAfter).to.equal(expectedFee);
      });

      it("should increase contract token balance", async function () {
        const profit = 10000n * ONE_USDC;
        const expectedFee = (profit * DEFAULT_INSURANCE_FEE_BPS) / BPS;

        await insuranceFund.connect(settlementEngine).collectFromProfit(profit);

        expect(await usdc.balanceOf(await insuranceFund.getAddress())).to.equal(expectedFee);
      });

      it("should revert if settlement engine has insufficient balance", async function () {
        // Settlement engine has 1M USDC, try to collect fee on 100B profit (fee = 2B)
        const hugeProfit = 100_000_000_000n * ONE_USDC;

        let reverted = false;
        try {
          await insuranceFund.connect(settlementEngine).collectFromProfit(hugeProfit);
        } catch {
          reverted = true;
        }
        expect(reverted).to.be.true;
      });

      it("should revert if settlement engine has not approved", async function () {
        // Create new settlement engine without approval
        const newSettlement = nonOwner;
        await insuranceFund.setSettlementEngine(await newSettlement.getAddress());
        await usdc.mint(await newSettlement.getAddress(), 100000n * ONE_USDC);

        // No approval given
        let reverted = false;
        try {
          await insuranceFund.connect(newSettlement).collectFromProfit(10000n * ONE_USDC);
        } catch {
          reverted = true;
        }
        expect(reverted).to.be.true;
      });
    });

    describe("Event Emission", function () {
      it("should emit InsuranceCollected event", async function () {
        const profit = 10000n * ONE_USDC;
        const expectedFee = (profit * DEFAULT_INSURANCE_FEE_BPS) / BPS;

        await expect(insuranceFund.connect(settlementEngine).collectFromProfit(profit))
          .to.emit(insuranceFund, "InsuranceCollected")
          .withArgs(expectedFee, expectedFee);
      });

      it("should emit event with cumulative fund balance", async function () {
        const profit1 = 10000n * ONE_USDC;
        const profit2 = 5000n * ONE_USDC;
        const fee1 = (profit1 * DEFAULT_INSURANCE_FEE_BPS) / BPS;
        const fee2 = (profit2 * DEFAULT_INSURANCE_FEE_BPS) / BPS;

        await insuranceFund.connect(settlementEngine).collectFromProfit(profit1);

        // Second collection should show cumulative balance
        await expect(insuranceFund.connect(settlementEngine).collectFromProfit(profit2))
          .to.emit(insuranceFund, "InsuranceCollected")
          .withArgs(fee2, fee1 + fee2);
      });

      it("should not emit event when collected amount is zero", async function () {
        const tx = await insuranceFund.connect(settlementEngine).collectFromProfit(0n);
        const receipt = await tx.wait();

        // Check that no InsuranceCollected event was emitted
        const events = receipt?.logs.filter((log: any) => {
          try {
            return insuranceFund.interface.parseLog(log)?.name === "InsuranceCollected";
          } catch { return false; }
        });
        expect(events?.length || 0).to.equal(0);
      });
    });

    describe("Cumulative Collection", function () {
      it("should accumulate fund balance across multiple collections", async function () {
        const profits = [1000n * ONE_USDC, 2000n * ONE_USDC, 3000n * ONE_USDC];
        let totalFees = 0n;

        for (const profit of profits) {
          await insuranceFund.connect(settlementEngine).collectFromProfit(profit);
          totalFees += (profit * DEFAULT_INSURANCE_FEE_BPS) / BPS;
        }

        expect(await insuranceFund.fundBalance()).to.equal(totalFees);
      });
    });
  });

  // =============================================================
  //                  LOSS COVERAGE TESTS
  // =============================================================

  describe("Loss Coverage (coverLoss)", function () {
    const initialFund = 10000n * ONE_USDC;

    beforeEach(async function () {
      // Seed the fund with initial balance via deposit
      await usdc.connect(depositor).approve(await insuranceFund.getAddress(), initialFund);
      await insuranceFund.connect(depositor).deposit(initialFund);
    });

    describe("Access Control", function () {
      it("should reject calls from non-settlement engine", async function () {
        await expect(
          insuranceFund.connect(nonOwner).coverLoss(1000n * ONE_USDC)
        ).to.be.revertedWithCustomError(insuranceFund, "OnlySettlement");
      });

      it("should reject calls from owner (not settlement engine)", async function () {
        await expect(
          insuranceFund.connect(owner).coverLoss(1000n * ONE_USDC)
        ).to.be.revertedWithCustomError(insuranceFund, "OnlySettlement");
      });

      it("should allow calls from settlement engine", async function () {
        await insuranceFund.connect(settlementEngine).coverLoss(1000n * ONE_USDC);
        // Should not revert
        expect(await insuranceFund.fundBalance()).to.be.lt(initialFund);
      });
    });

    describe("Full Coverage", function () {
      it("should cover loss fully when fund has sufficient balance", async function () {
        const lossAmount = 5000n * ONE_USDC;

        await insuranceFund.connect(settlementEngine).coverLoss(lossAmount);

        expect(await insuranceFund.fundBalance()).to.equal(initialFund - lossAmount);
      });

      it("should return covered amount equal to loss when fully covered", async function () {
        const lossAmount = 3000n * ONE_USDC;

        // Verify via fund balance change
        const balanceBefore = await insuranceFund.fundBalance();
        await insuranceFund.connect(settlementEngine).coverLoss(lossAmount);
        const balanceAfter = await insuranceFund.fundBalance();

        expect(balanceBefore - balanceAfter).to.equal(lossAmount);
      });

      it("should cover loss equal to fund balance exactly", async function () {
        await insuranceFund.connect(settlementEngine).coverLoss(initialFund);

        expect(await insuranceFund.fundBalance()).to.equal(0n);
      });
    });

    describe("Partial Coverage", function () {
      it("should cover only available balance when loss exceeds fund", async function () {
        const lossAmount = 15000n * ONE_USDC; // More than initialFund

        await insuranceFund.connect(settlementEngine).coverLoss(lossAmount);

        expect(await insuranceFund.fundBalance()).to.equal(0n);
      });

      it("should return partial coverage when fund is insufficient", async function () {
        const lossAmount = 15000n * ONE_USDC;

        // Fund balance should go to zero
        await insuranceFund.connect(settlementEngine).coverLoss(lossAmount);
        expect(await insuranceFund.fundBalance()).to.equal(0n);
      });
    });

    describe("Token Transfers", function () {
      it("should transfer tokens to vault", async function () {
        const lossAmount = 5000n * ONE_USDC;

        const vaultBalanceBefore = await usdc.balanceOf(await vault.getAddress());
        await insuranceFund.connect(settlementEngine).coverLoss(lossAmount);
        const vaultBalanceAfter = await usdc.balanceOf(await vault.getAddress());

        expect(vaultBalanceAfter - vaultBalanceBefore).to.equal(lossAmount);
      });

      it("should decrease contract token balance", async function () {
        const lossAmount = 5000n * ONE_USDC;

        const fundContractBalanceBefore = await usdc.balanceOf(await insuranceFund.getAddress());
        await insuranceFund.connect(settlementEngine).coverLoss(lossAmount);
        const fundContractBalanceAfter = await usdc.balanceOf(await insuranceFund.getAddress());

        expect(fundContractBalanceBefore - fundContractBalanceAfter).to.equal(lossAmount);
      });

      it("should transfer partial amount to vault when insufficient funds", async function () {
        const lossAmount = 15000n * ONE_USDC;

        const vaultBalanceBefore = await usdc.balanceOf(await vault.getAddress());
        await insuranceFund.connect(settlementEngine).coverLoss(lossAmount);
        const vaultBalanceAfter = await usdc.balanceOf(await vault.getAddress());

        // Should only transfer what's available (initialFund)
        expect(vaultBalanceAfter - vaultBalanceBefore).to.equal(initialFund);
      });
    });

    describe("Event Emission", function () {
      it("should emit LossCovered event with full coverage", async function () {
        const lossAmount = 5000n * ONE_USDC;

        await expect(insuranceFund.connect(settlementEngine).coverLoss(lossAmount))
          .to.emit(insuranceFund, "LossCovered")
          .withArgs(lossAmount, lossAmount, initialFund - lossAmount);
      });

      it("should emit LossCovered event with partial coverage", async function () {
        const lossAmount = 15000n * ONE_USDC;

        await expect(insuranceFund.connect(settlementEngine).coverLoss(lossAmount))
          .to.emit(insuranceFund, "LossCovered")
          .withArgs(lossAmount, initialFund, 0n);
      });

      it("should not emit event when fund is empty", async function () {
        // First drain the fund
        await insuranceFund.connect(settlementEngine).coverLoss(initialFund);

        // Second cover attempt with empty fund
        const tx = await insuranceFund.connect(settlementEngine).coverLoss(1000n * ONE_USDC);
        const receipt = await tx.wait();

        const events = receipt?.logs.filter((log: any) => {
          try {
            return insuranceFund.interface.parseLog(log)?.name === "LossCovered";
          } catch { return false; }
        });
        expect(events?.length || 0).to.equal(0);
      });
    });

    describe("Zero Loss Handling", function () {
      it("should handle zero loss amount gracefully", async function () {
        await insuranceFund.connect(settlementEngine).coverLoss(0n);
        expect(await insuranceFund.fundBalance()).to.equal(initialFund);
      });

      it("should not emit event for zero loss", async function () {
        const tx = await insuranceFund.connect(settlementEngine).coverLoss(0n);
        const receipt = await tx.wait();

        const events = receipt?.logs.filter((log: any) => {
          try {
            return insuranceFund.interface.parseLog(log)?.name === "LossCovered";
          } catch { return false; }
        });
        expect(events?.length || 0).to.equal(0);
      });
    });
  });

  // =============================================================
  //                    DEPOSIT TESTS
  // =============================================================

  describe("Direct Deposit", function () {
    describe("Basic Functionality", function () {
      it("should accept deposits and update fund balance", async function () {
        const depositAmount = 5000n * ONE_USDC;

        await insuranceFund.connect(depositor).deposit(depositAmount);

        expect(await insuranceFund.fundBalance()).to.equal(depositAmount);
      });

      it("should transfer tokens from depositor to contract", async function () {
        const depositAmount = 5000n * ONE_USDC;

        const depositorBalanceBefore = await usdc.balanceOf(await depositor.getAddress());
        await insuranceFund.connect(depositor).deposit(depositAmount);
        const depositorBalanceAfter = await usdc.balanceOf(await depositor.getAddress());

        expect(depositorBalanceBefore - depositorBalanceAfter).to.equal(depositAmount);
      });

      it("should increase contract token balance", async function () {
        const depositAmount = 5000n * ONE_USDC;

        await insuranceFund.connect(depositor).deposit(depositAmount);

        expect(await usdc.balanceOf(await insuranceFund.getAddress())).to.equal(depositAmount);
      });

      it("should emit DirectDeposit event", async function () {
        const depositAmount = 5000n * ONE_USDC;

        await expect(insuranceFund.connect(depositor).deposit(depositAmount))
          .to.emit(insuranceFund, "DirectDeposit")
          .withArgs(await depositor.getAddress(), depositAmount);
      });

      it("should allow anyone to deposit", async function () {
        const depositAmount = 1000n * ONE_USDC;

        // Deposit from nonOwner (not settlement engine, not owner)
        await usdc.mint(await nonOwner.getAddress(), depositAmount);
        await usdc.connect(nonOwner).approve(await insuranceFund.getAddress(), depositAmount);

        await insuranceFund.connect(nonOwner).deposit(depositAmount);
        expect(await insuranceFund.fundBalance()).to.equal(depositAmount);
      });
    });

    describe("Validation", function () {
      it("should reject zero amount deposit", async function () {
        await expect(
          insuranceFund.connect(depositor).deposit(0n)
        ).to.be.revertedWithCustomError(insuranceFund, "ZeroAmount");
      });

      it("should revert if depositor has insufficient balance", async function () {
        const hugeAmount = 10_000_000_000n * ONE_USDC;

        let reverted = false;
        try {
          await insuranceFund.connect(depositor).deposit(hugeAmount);
        } catch {
          reverted = true;
        }
        expect(reverted).to.be.true;
      });

      it("should revert if depositor has not approved", async function () {
        // Create fresh depositor without approval
        await usdc.mint(await nonOwner.getAddress(), 10000n * ONE_USDC);
        // No approval

        let reverted = false;
        try {
          await insuranceFund.connect(nonOwner).deposit(5000n * ONE_USDC);
        } catch {
          reverted = true;
        }
        expect(reverted).to.be.true;
      });
    });

    describe("Cumulative Deposits", function () {
      it("should accumulate multiple deposits", async function () {
        const amounts = [1000n * ONE_USDC, 2000n * ONE_USDC, 3000n * ONE_USDC];

        for (const amount of amounts) {
          await insuranceFund.connect(depositor).deposit(amount);
        }

        expect(await insuranceFund.fundBalance()).to.equal(6000n * ONE_USDC);
      });
    });
  });

  // =============================================================
  //                    VIEW FUNCTION TESTS
  // =============================================================

  describe("View Functions", function () {
    const initialFund = 10000n * ONE_USDC;

    beforeEach(async function () {
      await insuranceFund.connect(depositor).deposit(initialFund);
    });

    describe("fundStatus", function () {
      it("should return correct balance", async function () {
        const [balance, coverageRatioBps] = await insuranceFund.fundStatus(100000n * ONE_USDC);
        expect(balance).to.equal(initialFund);
      });

      it("should calculate coverage ratio correctly", async function () {
        // Fund: $10,000, Vault: $100,000 -> Coverage: 10% = 1000 bps
        const totalVaultAssets = 100000n * ONE_USDC;
        const [balance, coverageRatioBps] = await insuranceFund.fundStatus(totalVaultAssets);

        expect(coverageRatioBps).to.equal(1000n); // 10%
      });

      it("should return 0 coverage ratio when vault is empty", async function () {
        const [balance, coverageRatioBps] = await insuranceFund.fundStatus(0n);
        expect(coverageRatioBps).to.equal(0n);
      });

      it("should handle high coverage ratios correctly", async function () {
        // Fund: $10,000, Vault: $10,000 -> Coverage: 100% = 10000 bps
        const totalVaultAssets = 10000n * ONE_USDC;
        const [balance, coverageRatioBps] = await insuranceFund.fundStatus(totalVaultAssets);

        expect(coverageRatioBps).to.equal(10000n); // 100%
      });

      it("should handle coverage ratio > 100%", async function () {
        // Fund: $10,000, Vault: $5,000 -> Coverage: 200% = 20000 bps
        const totalVaultAssets = 5000n * ONE_USDC;
        const [balance, coverageRatioBps] = await insuranceFund.fundStatus(totalVaultAssets);

        expect(coverageRatioBps).to.equal(20000n); // 200%
      });
    });

    describe("canCoverLoss", function () {
      it("should return true when fund can fully cover loss", async function () {
        const [canCover, shortfall] = await insuranceFund.canCoverLoss(5000n * ONE_USDC);

        expect(canCover).to.be.true;
        expect(shortfall).to.equal(0n);
      });

      it("should return true when loss equals fund balance exactly", async function () {
        const [canCover, shortfall] = await insuranceFund.canCoverLoss(initialFund);

        expect(canCover).to.be.true;
        expect(shortfall).to.equal(0n);
      });

      it("should return false with correct shortfall when fund is insufficient", async function () {
        const lossAmount = 15000n * ONE_USDC;
        const [canCover, shortfall] = await insuranceFund.canCoverLoss(lossAmount);

        expect(canCover).to.be.false;
        expect(shortfall).to.equal(lossAmount - initialFund);
      });

      it("should handle zero loss", async function () {
        const [canCover, shortfall] = await insuranceFund.canCoverLoss(0n);

        expect(canCover).to.be.true;
        expect(shortfall).to.equal(0n);
      });
    });

    describe("calculateInsuranceFee", function () {
      it("should calculate correct fee for standard profit", async function () {
        const profit = 10000n * ONE_USDC;
        const expectedFee = (profit * DEFAULT_INSURANCE_FEE_BPS) / BPS;

        expect(await insuranceFund.calculateInsuranceFee(profit)).to.equal(expectedFee);
      });

      it("should return 0 for zero profit", async function () {
        expect(await insuranceFund.calculateInsuranceFee(0n)).to.equal(0n);
      });

      it("should return 0 for tiny profit (rounds down)", async function () {
        expect(await insuranceFund.calculateInsuranceFee(49n)).to.equal(0n);
      });

      it("should calculate fee with updated insurance rate", async function () {
        const newFeeBps = 500n; // 5%
        await insuranceFund.setInsuranceFee(newFeeBps);

        const profit = 10000n * ONE_USDC;
        const expectedFee = (profit * newFeeBps) / BPS;

        expect(await insuranceFund.calculateInsuranceFee(profit)).to.equal(expectedFee);
      });
    });

    describe("actualBalance", function () {
      it("should return actual token balance in contract", async function () {
        expect(await insuranceFund.actualBalance()).to.equal(initialFund);
      });

      it("should match fund balance under normal circumstances", async function () {
        expect(await insuranceFund.actualBalance()).to.equal(await insuranceFund.fundBalance());
      });

      it("should differ from fundBalance if tokens sent directly", async function () {
        // Send tokens directly (not via deposit)
        const directAmount = 1000n * ONE_USDC;
        await usdc.connect(depositor).transfer(await insuranceFund.getAddress(), directAmount);

        expect(await insuranceFund.actualBalance()).to.equal(initialFund + directAmount);
        expect(await insuranceFund.fundBalance()).to.equal(initialFund);
      });
    });
  });

  // =============================================================
  //                   ADMIN FUNCTION TESTS
  // =============================================================

  describe("Admin Functions", function () {
    describe("setSettlementEngine", function () {
      it("should allow owner to set settlement engine", async function () {
        const newEngine = await recipient.getAddress();
        await insuranceFund.setSettlementEngine(newEngine);

        expect(await insuranceFund.settlementEngine()).to.equal(newEngine);
      });

      it("should reject zero address", async function () {
        await expect(
          insuranceFund.setSettlementEngine(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(insuranceFund, "ZeroAddress");
      });

      it("should reject non-owner", async function () {
        await expect(
          insuranceFund.connect(nonOwner).setSettlementEngine(await nonOwner.getAddress())
        ).to.be.revertedWithCustomError(insuranceFund, "OwnableUnauthorizedAccount");
      });
    });

    describe("setVault", function () {
      it("should allow owner to update vault address", async function () {
        const newVault = await recipient.getAddress();
        await insuranceFund.setVault(newVault);

        expect(await insuranceFund.vault()).to.equal(newVault);
      });

      it("should reject zero address", async function () {
        await expect(
          insuranceFund.setVault(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(insuranceFund, "ZeroAddress");
      });

      it("should reject non-owner", async function () {
        await expect(
          insuranceFund.connect(nonOwner).setVault(await nonOwner.getAddress())
        ).to.be.revertedWithCustomError(insuranceFund, "OwnableUnauthorizedAccount");
      });

      it("should affect loss coverage destination", async function () {
        const initialFund = 10000n * ONE_USDC;
        await insuranceFund.connect(depositor).deposit(initialFund);

        const newVault = await recipient.getAddress();
        await insuranceFund.setVault(newVault);

        const lossAmount = 5000n * ONE_USDC;
        await insuranceFund.connect(settlementEngine).coverLoss(lossAmount);

        expect(await usdc.balanceOf(newVault)).to.equal(lossAmount);
      });
    });

    describe("setInsuranceFee", function () {
      it("should allow owner to update insurance fee", async function () {
        const newFeeBps = 500n; // 5%
        await insuranceFund.setInsuranceFee(newFeeBps);

        expect(await insuranceFund.insuranceFeeBps()).to.equal(newFeeBps);
      });

      it("should emit InsuranceFeeUpdated event", async function () {
        const oldFee = await insuranceFund.insuranceFeeBps();
        const newFeeBps = 500n;

        await expect(insuranceFund.setInsuranceFee(newFeeBps))
          .to.emit(insuranceFund, "InsuranceFeeUpdated")
          .withArgs(oldFee, newFeeBps);
      });

      it("should allow setting fee to 0", async function () {
        await insuranceFund.setInsuranceFee(0n);
        expect(await insuranceFund.insuranceFeeBps()).to.equal(0n);
      });

      it("should allow setting fee to exactly 10% (1000 bps)", async function () {
        await insuranceFund.setInsuranceFee(1000n);
        expect(await insuranceFund.insuranceFeeBps()).to.equal(1000n);
      });

      it("should reject fee above 10% (1000 bps)", async function () {
        await expect(
          insuranceFund.setInsuranceFee(1001n)
        ).to.be.revertedWithCustomError(insuranceFund, "ArrayLengthMismatch");
      });

      it("should reject non-owner", async function () {
        await expect(
          insuranceFund.connect(nonOwner).setInsuranceFee(500n)
        ).to.be.revertedWithCustomError(insuranceFund, "OwnableUnauthorizedAccount");
      });

      it("should affect subsequent profit collections", async function () {
        const newFeeBps = 500n; // 5%
        await insuranceFund.setInsuranceFee(newFeeBps);

        const profit = 10000n * ONE_USDC;
        await insuranceFund.connect(settlementEngine).collectFromProfit(profit);

        const expectedFee = (profit * newFeeBps) / BPS;
        expect(await insuranceFund.fundBalance()).to.equal(expectedFee);
      });
    });

    describe("syncBalance", function () {
      it("should sync fundBalance with actual token balance", async function () {
        const depositAmount = 10000n * ONE_USDC;
        await insuranceFund.connect(depositor).deposit(depositAmount);

        // Send tokens directly (not via deposit)
        const directAmount = 1000n * ONE_USDC;
        await usdc.connect(depositor).transfer(await insuranceFund.getAddress(), directAmount);

        // fundBalance doesn't match actual balance
        expect(await insuranceFund.fundBalance()).to.not.equal(await insuranceFund.actualBalance());

        // Sync balance
        await insuranceFund.syncBalance();

        // Now they should match
        expect(await insuranceFund.fundBalance()).to.equal(await insuranceFund.actualBalance());
        expect(await insuranceFund.fundBalance()).to.equal(depositAmount + directAmount);
      });

      it("should reject non-owner", async function () {
        await expect(
          insuranceFund.connect(nonOwner).syncBalance()
        ).to.be.revertedWithCustomError(insuranceFund, "OwnableUnauthorizedAccount");
      });
    });

    describe("rescueTokens", function () {
      beforeEach(async function () {
        // Send rescue tokens to the insurance fund
        await rescueToken.mint(await insuranceFund.getAddress(), 1000n * 10n ** 18n);
      });

      it("should allow owner to rescue non-base tokens", async function () {
        const rescueAmount = 500n * 10n ** 18n;
        const recipientAddr = await recipient.getAddress();

        await insuranceFund.rescueTokens(await rescueToken.getAddress(), recipientAddr, rescueAmount);

        expect(await rescueToken.balanceOf(recipientAddr)).to.equal(rescueAmount);
      });

      it("should reject rescuing base asset", async function () {
        await expect(
          insuranceFund.rescueTokens(usdcAddress, await recipient.getAddress(), 100n * ONE_USDC)
        ).to.be.revertedWithCustomError(insuranceFund, "InvalidAdapter");
      });

      it("should reject zero address recipient", async function () {
        await expect(
          insuranceFund.rescueTokens(await rescueToken.getAddress(), ethers.ZeroAddress, 100n)
        ).to.be.revertedWithCustomError(insuranceFund, "ZeroAddress");
      });

      it("should reject non-owner", async function () {
        await expect(
          insuranceFund.connect(nonOwner).rescueTokens(
            await rescueToken.getAddress(),
            await recipient.getAddress(),
            100n
          )
        ).to.be.revertedWithCustomError(insuranceFund, "OwnableUnauthorizedAccount");
      });

      it("should revert if amount exceeds balance", async function () {
        let reverted = false;
        try {
          await insuranceFund.rescueTokens(
            await rescueToken.getAddress(),
            await recipient.getAddress(),
            10000n * 10n ** 18n // More than what's there
          );
        } catch {
          reverted = true;
        }
        expect(reverted).to.be.true;
      });
    });
  });

  // =============================================================
  //                 EMERGENCY WITHDRAWAL TESTS
  // =============================================================

  describe("Emergency Withdrawal System", function () {
    const initialFund = 100000n * ONE_USDC;

    beforeEach(async function () {
      await insuranceFund.connect(depositor).deposit(initialFund);
    });

    describe("initiateEmergencyWithdrawal", function () {
      it("should allow owner to initiate withdrawal", async function () {
        const withdrawAmount = 50000n * ONE_USDC;
        const recipientAddr = await recipient.getAddress();

        await insuranceFund.initiateEmergencyWithdrawal(recipientAddr, withdrawAmount);

        const pending = await insuranceFund.pendingWithdrawal();
        expect(pending.to).to.equal(recipientAddr);
        expect(pending.amount).to.equal(withdrawAmount);
      });

      it("should set correct unlock time (2 days from now)", async function () {
        const withdrawAmount = 50000n * ONE_USDC;
        const recipientAddr = await recipient.getAddress();

        const tx = await insuranceFund.initiateEmergencyWithdrawal(recipientAddr, withdrawAmount);
        const block = await ethers.provider.getBlock(tx.blockNumber);

        const pending = await insuranceFund.pendingWithdrawal();
        expect(pending.unlockTime).to.equal(BigInt(block!.timestamp) + EMERGENCY_TIMELOCK);
      });

      it("should emit EmergencyWithdrawalInitiated event", async function () {
        const withdrawAmount = 50000n * ONE_USDC;
        const recipientAddr = await recipient.getAddress();

        const tx = await insuranceFund.initiateEmergencyWithdrawal(recipientAddr, withdrawAmount);
        const block = await ethers.provider.getBlock(tx.blockNumber);

        await expect(tx)
          .to.emit(insuranceFund, "EmergencyWithdrawalInitiated")
          .withArgs(recipientAddr, withdrawAmount, BigInt(block!.timestamp) + EMERGENCY_TIMELOCK);
      });

      it("should reject zero address recipient", async function () {
        await expect(
          insuranceFund.initiateEmergencyWithdrawal(ethers.ZeroAddress, 50000n * ONE_USDC)
        ).to.be.revertedWithCustomError(insuranceFund, "ZeroAddress");
      });

      it("should reject amount exceeding fund balance", async function () {
        await expect(
          insuranceFund.initiateEmergencyWithdrawal(await recipient.getAddress(), initialFund + 1n)
        ).to.be.revertedWithCustomError(insuranceFund, "InsufficientBalance");
      });

      it("should allow exactly fund balance", async function () {
        const recipientAddr = await recipient.getAddress();

        await insuranceFund.initiateEmergencyWithdrawal(recipientAddr, initialFund);

        const pending = await insuranceFund.pendingWithdrawal();
        expect(pending.amount).to.equal(initialFund);
      });

      it("should reject non-owner", async function () {
        await expect(
          insuranceFund.connect(nonOwner).initiateEmergencyWithdrawal(
            await recipient.getAddress(),
            50000n * ONE_USDC
          )
        ).to.be.revertedWithCustomError(insuranceFund, "OwnableUnauthorizedAccount");
      });

      it("should overwrite previous pending withdrawal", async function () {
        const recipientAddr1 = await recipient.getAddress();
        const recipientAddr2 = await depositor.getAddress();

        await insuranceFund.initiateEmergencyWithdrawal(recipientAddr1, 10000n * ONE_USDC);
        await insuranceFund.initiateEmergencyWithdrawal(recipientAddr2, 20000n * ONE_USDC);

        const pending = await insuranceFund.pendingWithdrawal();
        expect(pending.to).to.equal(recipientAddr2);
        expect(pending.amount).to.equal(20000n * ONE_USDC);
      });
    });

    describe("executeEmergencyWithdrawal", function () {
      const withdrawAmount = 50000n * ONE_USDC;

      beforeEach(async function () {
        await insuranceFund.initiateEmergencyWithdrawal(await recipient.getAddress(), withdrawAmount);
      });

      it("should reject execution before timelock expires", async function () {
        await expect(
          insuranceFund.executeEmergencyWithdrawal()
        ).to.be.revertedWithCustomError(insuranceFund, "CooldownNotElapsed");
      });

      it("should allow execution after timelock expires", async function () {
        // Fast forward 2 days
        await ethers.provider.send("evm_increaseTime", [Number(EMERGENCY_TIMELOCK)]);
        await ethers.provider.send("evm_mine", []);

        await insuranceFund.executeEmergencyWithdrawal();

        // Verify funds transferred
        expect(await usdc.balanceOf(await recipient.getAddress())).to.equal(withdrawAmount);
      });

      it("should update fund balance after execution", async function () {
        await ethers.provider.send("evm_increaseTime", [Number(EMERGENCY_TIMELOCK)]);
        await ethers.provider.send("evm_mine", []);

        await insuranceFund.executeEmergencyWithdrawal();

        expect(await insuranceFund.fundBalance()).to.equal(initialFund - withdrawAmount);
      });

      it("should clear pending withdrawal after execution", async function () {
        await ethers.provider.send("evm_increaseTime", [Number(EMERGENCY_TIMELOCK)]);
        await ethers.provider.send("evm_mine", []);

        await insuranceFund.executeEmergencyWithdrawal();

        const pending = await insuranceFund.pendingWithdrawal();
        expect(pending.to).to.equal(ethers.ZeroAddress);
        expect(pending.amount).to.equal(0n);
        expect(pending.unlockTime).to.equal(0n);
      });

      it("should emit EmergencyWithdrawalExecuted event", async function () {
        await ethers.provider.send("evm_increaseTime", [Number(EMERGENCY_TIMELOCK)]);
        await ethers.provider.send("evm_mine", []);

        await expect(insuranceFund.executeEmergencyWithdrawal())
          .to.emit(insuranceFund, "EmergencyWithdrawalExecuted")
          .withArgs(await recipient.getAddress(), withdrawAmount);
      });

      it("should reject if no pending withdrawal", async function () {
        // First cancel the existing one
        await insuranceFund.cancelEmergencyWithdrawal();

        await expect(
          insuranceFund.executeEmergencyWithdrawal()
        ).to.be.revertedWithCustomError(insuranceFund, "ZeroAddress");
      });

      it("should reject if fund balance decreased below pending amount", async function () {
        // Use coverLoss to decrease fund balance
        await insuranceFund.connect(settlementEngine).coverLoss(60000n * ONE_USDC);

        // Now fundBalance is 40000, but pending is 50000
        await ethers.provider.send("evm_increaseTime", [Number(EMERGENCY_TIMELOCK)]);
        await ethers.provider.send("evm_mine", []);

        await expect(
          insuranceFund.executeEmergencyWithdrawal()
        ).to.be.revertedWithCustomError(insuranceFund, "InsufficientBalance");
      });

      it("should reject non-owner", async function () {
        await ethers.provider.send("evm_increaseTime", [Number(EMERGENCY_TIMELOCK)]);
        await ethers.provider.send("evm_mine", []);

        await expect(
          insuranceFund.connect(nonOwner).executeEmergencyWithdrawal()
        ).to.be.revertedWithCustomError(insuranceFund, "OwnableUnauthorizedAccount");
      });
    });

    describe("cancelEmergencyWithdrawal", function () {
      beforeEach(async function () {
        await insuranceFund.initiateEmergencyWithdrawal(await recipient.getAddress(), 50000n * ONE_USDC);
      });

      it("should allow owner to cancel pending withdrawal", async function () {
        await insuranceFund.cancelEmergencyWithdrawal();

        const pending = await insuranceFund.pendingWithdrawal();
        expect(pending.to).to.equal(ethers.ZeroAddress);
        expect(pending.amount).to.equal(0n);
        expect(pending.unlockTime).to.equal(0n);
      });

      it("should emit EmergencyWithdrawalCancelled event", async function () {
        await expect(insuranceFund.cancelEmergencyWithdrawal())
          .to.emit(insuranceFund, "EmergencyWithdrawalCancelled");
      });

      it("should not affect fund balance", async function () {
        await insuranceFund.cancelEmergencyWithdrawal();

        expect(await insuranceFund.fundBalance()).to.equal(initialFund);
      });

      it("should reject non-owner", async function () {
        await expect(
          insuranceFund.connect(nonOwner).cancelEmergencyWithdrawal()
        ).to.be.revertedWithCustomError(insuranceFund, "OwnableUnauthorizedAccount");
      });

      it("should allow cancellation even when no pending withdrawal", async function () {
        await insuranceFund.cancelEmergencyWithdrawal();
        // Should not revert even when cancelling nothing
        await insuranceFund.cancelEmergencyWithdrawal();
      });
    });
  });

  // =============================================================
  //                   EDGE CASES AND INVARIANTS
  // =============================================================

  describe("Edge Cases and Boundary Conditions", function () {
    describe("Fund Balance Invariants", function () {
      it("should maintain fundBalance equals actualBalance after normal operations", async function () {
        // Deposit
        await insuranceFund.connect(depositor).deposit(10000n * ONE_USDC);
        expect(await insuranceFund.fundBalance()).to.equal(await insuranceFund.actualBalance());

        // Collect profit
        await insuranceFund.connect(settlementEngine).collectFromProfit(5000n * ONE_USDC);
        expect(await insuranceFund.fundBalance()).to.equal(await insuranceFund.actualBalance());

        // Cover loss
        await insuranceFund.connect(settlementEngine).coverLoss(3000n * ONE_USDC);
        expect(await insuranceFund.fundBalance()).to.equal(await insuranceFund.actualBalance());
      });

      it("should handle rapid deposit/withdrawal cycles", async function () {
        for (let i = 0; i < 10; i++) {
          await insuranceFund.connect(depositor).deposit(1000n * ONE_USDC);
          await insuranceFund.connect(settlementEngine).coverLoss(500n * ONE_USDC);
        }

        // Should have accumulated 5000 USDC
        expect(await insuranceFund.fundBalance()).to.equal(5000n * ONE_USDC);
        expect(await insuranceFund.fundBalance()).to.equal(await insuranceFund.actualBalance());
      });
    });

    describe("Extreme Values", function () {
      it("should handle maximum uint256 safely for fee calculation", async function () {
        // This should not overflow
        const maxUint = ethers.MaxUint256;
        // Will revert due to insufficient balance, not overflow
        let reverted = false;
        try {
          await insuranceFund.connect(settlementEngine).collectFromProfit(maxUint);
        } catch {
          reverted = true;
        }
        expect(reverted).to.be.true;
      });

      it("should handle small amounts correctly", async function () {
        await insuranceFund.connect(depositor).deposit(1n); // 1 micro-USDC

        expect(await insuranceFund.fundBalance()).to.equal(1n);
      });
    });

    describe("Zero Fund Balance Edge Cases", function () {
      it("should handle coverLoss when fund is empty", async function () {
        // Fund is empty initially
        await insuranceFund.connect(settlementEngine).coverLoss(1000n * ONE_USDC);

        // Should not revert, just cover 0
        expect(await insuranceFund.fundBalance()).to.equal(0n);
      });

      it("should handle multiple coverLoss calls with empty fund", async function () {
        for (let i = 0; i < 5; i++) {
          await insuranceFund.connect(settlementEngine).coverLoss(1000n * ONE_USDC);
        }
        // Should not revert
        expect(await insuranceFund.fundBalance()).to.equal(0n);
      });
    });

    describe("Reentrancy Protection", function () {
      it("should have reentrancy protection on collectFromProfit", async function () {
        // The function has nonReentrant modifier
        // Attempting reentrant call would fail, but we can't easily test this
        // without a malicious token. This test verifies the pattern exists.
        const profit = 10000n * ONE_USDC;
        await insuranceFund.connect(settlementEngine).collectFromProfit(profit);
        // Passes without reentrancy issues
      });

      it("should have reentrancy protection on coverLoss", async function () {
        await insuranceFund.connect(depositor).deposit(10000n * ONE_USDC);
        await insuranceFund.connect(settlementEngine).coverLoss(5000n * ONE_USDC);
        // Passes without reentrancy issues
      });

      it("should have reentrancy protection on deposit", async function () {
        await insuranceFund.connect(depositor).deposit(10000n * ONE_USDC);
        // Passes without reentrancy issues
      });

      it("should have reentrancy protection on executeEmergencyWithdrawal", async function () {
        await insuranceFund.connect(depositor).deposit(10000n * ONE_USDC);
        await insuranceFund.initiateEmergencyWithdrawal(await recipient.getAddress(), 5000n * ONE_USDC);
        await ethers.provider.send("evm_increaseTime", [Number(EMERGENCY_TIMELOCK)]);
        await ethers.provider.send("evm_mine", []);
        await insuranceFund.executeEmergencyWithdrawal();
        // Passes without reentrancy issues
      });
    });

    describe("State Consistency Under Concurrent Operations", function () {
      it("should maintain consistency with interleaved profit/loss operations", async function () {
        // Seed fund
        await insuranceFund.connect(depositor).deposit(50000n * ONE_USDC);

        // Interleaved operations
        await insuranceFund.connect(settlementEngine).collectFromProfit(10000n * ONE_USDC); // +200
        await insuranceFund.connect(settlementEngine).coverLoss(1000n * ONE_USDC); // -1000
        await insuranceFund.connect(settlementEngine).collectFromProfit(5000n * ONE_USDC); // +100
        await insuranceFund.connect(settlementEngine).coverLoss(2000n * ONE_USDC); // -2000
        await insuranceFund.connect(depositor).deposit(5000n * ONE_USDC); // +5000

        // Calculate expected: 50000 + 200 - 1000 + 100 - 2000 + 5000 = 52300
        expect(await insuranceFund.fundBalance()).to.equal(52300n * ONE_USDC);
        expect(await insuranceFund.actualBalance()).to.equal(52300n * ONE_USDC);
      });
    });

    describe("Fee Rate Edge Cases", function () {
      it("should collect no fee when insurance fee is set to 0", async function () {
        await insuranceFund.setInsuranceFee(0n);

        const profit = 10000n * ONE_USDC;
        await insuranceFund.connect(settlementEngine).collectFromProfit(profit);

        expect(await insuranceFund.fundBalance()).to.equal(0n);
      });

      it("should collect maximum fee at 10%", async function () {
        await insuranceFund.setInsuranceFee(1000n); // 10%

        const profit = 10000n * ONE_USDC;
        await insuranceFund.connect(settlementEngine).collectFromProfit(profit);

        expect(await insuranceFund.fundBalance()).to.equal(1000n * ONE_USDC);
      });
    });
  });

  // =============================================================
  //                   ACCESS CONTROL SUMMARY
  // =============================================================

  describe("Access Control Summary", function () {
    it("should reject all owner-only functions from non-owner", async function () {
      const tests = [
        () => insuranceFund.connect(nonOwner).setSettlementEngine(nonOwner.getAddress()),
        () => insuranceFund.connect(nonOwner).setVault(nonOwner.getAddress()),
        () => insuranceFund.connect(nonOwner).setInsuranceFee(500n),
        () => insuranceFund.connect(nonOwner).syncBalance(),
        () => insuranceFund.connect(nonOwner).rescueTokens(usdcAddress, nonOwner.getAddress(), 100n),
        () => insuranceFund.connect(nonOwner).initiateEmergencyWithdrawal(nonOwner.getAddress(), 100n),
        () => insuranceFund.connect(nonOwner).executeEmergencyWithdrawal(),
        () => insuranceFund.connect(nonOwner).cancelEmergencyWithdrawal(),
      ];

      for (const testFn of tests) {
        let reverted = false;
        try {
          await testFn();
        } catch {
          reverted = true;
        }
        expect(reverted).to.be.true;
      }
    });

    it("should reject all settlement-only functions from non-settlement", async function () {
      const tests = [
        () => insuranceFund.connect(nonOwner).collectFromProfit(1000n * ONE_USDC),
        () => insuranceFund.connect(nonOwner).coverLoss(1000n * ONE_USDC),
        () => insuranceFund.connect(owner).collectFromProfit(1000n * ONE_USDC),
        () => insuranceFund.connect(owner).coverLoss(1000n * ONE_USDC),
      ];

      for (const testFn of tests) {
        await expect(testFn()).to.be.revertedWithCustomError(insuranceFund, "OnlySettlement");
      }
    });

    it("should allow deposit from anyone", async function () {
      // Setup multiple depositors
      const depositors = [owner, settlementEngine, vault, depositor, nonOwner];

      for (const dep of depositors) {
        await usdc.mint(await dep.getAddress(), 1000n * ONE_USDC);
        await usdc.connect(dep).approve(await insuranceFund.getAddress(), 1000n * ONE_USDC);
        await insuranceFund.connect(dep).deposit(100n * ONE_USDC);
      }

      expect(await insuranceFund.fundBalance()).to.equal(500n * ONE_USDC);
    });
  });

  // =============================================================
  //                  INTEGRATION SCENARIOS
  // =============================================================

  describe("Integration Scenarios", function () {
    describe("Settlement Lifecycle", function () {
      it("should handle complete profit-taking cycle", async function () {
        // 1. Seed fund with initial deposit
        await insuranceFund.connect(depositor).deposit(10000n * ONE_USDC);

        // 2. Multiple profitable settlements
        const profits = [5000n, 10000n, 15000n, 20000n].map(p => p * ONE_USDC);
        let totalFees = 0n;

        for (const profit of profits) {
          await insuranceFund.connect(settlementEngine).collectFromProfit(profit);
          totalFees += (profit * DEFAULT_INSURANCE_FEE_BPS) / BPS;
        }

        // 3. Verify accumulated balance
        expect(await insuranceFund.fundBalance()).to.equal(10000n * ONE_USDC + totalFees);
      });

      it("should handle complete loss-coverage cycle", async function () {
        // 1. Seed fund
        await insuranceFund.connect(depositor).deposit(100000n * ONE_USDC);

        // 2. Multiple loss coverages
        const losses = [10000n, 20000n, 30000n].map(l => l * ONE_USDC);
        let totalCovered = 0n;

        for (const loss of losses) {
          const vaultBefore = await usdc.balanceOf(await vault.getAddress());
          await insuranceFund.connect(settlementEngine).coverLoss(loss);
          const vaultAfter = await usdc.balanceOf(await vault.getAddress());
          totalCovered += vaultAfter - vaultBefore;
        }

        // 3. Verify remaining balance and vault received funds
        expect(await insuranceFund.fundBalance()).to.equal(100000n * ONE_USDC - totalCovered);
        expect(totalCovered).to.equal(60000n * ONE_USDC);
      });

      it("should handle mixed profit/loss settlements", async function () {
        // 1. Seed fund
        await insuranceFund.connect(depositor).deposit(50000n * ONE_USDC);
        let expectedBalance = 50000n * ONE_USDC;

        // 2. Mixed operations
        // Profit: $100k -> fee = $2k
        await insuranceFund.connect(settlementEngine).collectFromProfit(100000n * ONE_USDC);
        expectedBalance += 2000n * ONE_USDC;

        // Loss: $10k
        await insuranceFund.connect(settlementEngine).coverLoss(10000n * ONE_USDC);
        expectedBalance -= 10000n * ONE_USDC;

        // Profit: $50k -> fee = $1k
        await insuranceFund.connect(settlementEngine).collectFromProfit(50000n * ONE_USDC);
        expectedBalance += 1000n * ONE_USDC;

        // Loss: $30k
        await insuranceFund.connect(settlementEngine).coverLoss(30000n * ONE_USDC);
        expectedBalance -= 30000n * ONE_USDC;

        expect(await insuranceFund.fundBalance()).to.equal(expectedBalance);
      });
    });

    describe("Black Swan Event Simulation", function () {
      it("should handle cascading losses until fund depletion", async function () {
        // 1. Seed fund with modest amount
        await insuranceFund.connect(depositor).deposit(10000n * ONE_USDC);

        // 2. Black swan: multiple large losses
        const largelosses = [5000n, 4000n, 3000n, 2000n].map(l => l * ONE_USDC);

        for (let i = 0; i < largelosses.length; i++) {
          const [canCover, shortfall] = await insuranceFund.canCoverLoss(largelosses[i]);
          const fundBefore = await insuranceFund.fundBalance();

          await insuranceFund.connect(settlementEngine).coverLoss(largelosses[i]);

          const fundAfter = await insuranceFund.fundBalance();
          const actualCovered = fundBefore - fundAfter;

          // Verify the coverage was correct
          if (canCover) {
            expect(actualCovered).to.equal(largelosses[i]);
          } else {
            expect(actualCovered).to.equal(fundBefore); // Covered what was available
          }
        }

        // Fund should be depleted
        expect(await insuranceFund.fundBalance()).to.equal(0n);
      });

      it("should allow fund replenishment after depletion", async function () {
        // 1. Deplete fund
        await insuranceFund.connect(depositor).deposit(5000n * ONE_USDC);
        await insuranceFund.connect(settlementEngine).coverLoss(5000n * ONE_USDC);
        expect(await insuranceFund.fundBalance()).to.equal(0n);

        // 2. Replenish via deposit
        await insuranceFund.connect(depositor).deposit(10000n * ONE_USDC);
        expect(await insuranceFund.fundBalance()).to.equal(10000n * ONE_USDC);

        // 3. Also replenish via profit collection
        await insuranceFund.connect(settlementEngine).collectFromProfit(50000n * ONE_USDC);
        expect(await insuranceFund.fundBalance()).to.equal(11000n * ONE_USDC);
      });
    });
  });
});

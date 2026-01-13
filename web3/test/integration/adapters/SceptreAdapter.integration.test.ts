import { expect } from "chai";
import { network } from "hardhat";
import {
  SCEPTRE_FLARE,
  TOKENS_FLARE,
} from "../../../scripts/helpers/yieldAddresses.js";

const { ethers } = await network.connect();

/**
 * Sceptre Adapter Integration Tests
 *
 * These tests run against real Sceptre contracts on Flare mainnet fork.
 * Requires: Anvil fork running or using flareFork network
 *
 * Start Anvil: anvil --fork-url https://flare-api.flare.network/ext/C/rpc --port 8546
 * Run: npx hardhat test test/integration/adapters/SceptreAdapter.integration.test.ts --network anvilFork
 */
describe("SceptreAdapter Integration", function () {
  // Increase timeout for network calls
  this.timeout(120000);

  let sceptreAdapter: any;
  let sceptreToken: any;
  let owner: any;

  // Contract addresses
  const SFLR = SCEPTRE_FLARE.sflr;
  const WFLR = TOKENS_FLARE.WFLR;

  before(async function () {
    // Get chain ID
    const chainId = (await ethers.provider.getNetwork()).chainId;
    console.log(`Running on chain ID: ${chainId}`);

    // Skip if not on Flare mainnet or fork (chainId 14)
    if (chainId !== 14n) {
      console.log(`Skipping integration tests - not on Flare mainnet/fork (chainId: ${chainId})`);
      this.skip();
    }

    // Check that Sceptre is deployed
    if (!SFLR) {
      console.log("Skipping - Sceptre addresses not configured");
      this.skip();
    }

    [owner] = await ethers.getSigners();
    console.log(`Running as: ${await owner.getAddress()}`);

    const balance = await ethers.provider.getBalance(await owner.getAddress());
    console.log(`Balance: ${ethers.formatEther(balance)} FLR`);

    if (balance < ethers.parseEther("1")) {
      console.log("Skipping - insufficient FLR balance for tests");
      this.skip();
    }

    // Get sFLR token contract
    const ERC20_ABI = [
      "function balanceOf(address) view returns (uint256)",
      "function approve(address,uint256) returns (bool)",
      "function transfer(address,uint256) returns (bool)",
      "function allowance(address,address) view returns (uint256)",
    ];
    sceptreToken = await ethers.getContractAt(ERC20_ABI, SFLR);
  });

  beforeEach(async function () {
    // Deploy SceptreAdapter
    const SceptreAdapter = await ethers.getContractFactory("SceptreAdapter");
    sceptreAdapter = await SceptreAdapter.deploy(SFLR, WFLR);
    await sceptreAdapter.waitForDeployment();
    console.log(`SceptreAdapter deployed to: ${await sceptreAdapter.getAddress()}`);
  });

  describe("Deployment", function () {
    it("should deploy with correct name", async function () {
      expect(await sceptreAdapter.name()).to.equal("Sceptre");
    });

    it("should have correct protocol address (sFLR)", async function () {
      expect(await sceptreAdapter.protocol()).to.equal(SFLR);
    });

    it("should have correct WFLR address", async function () {
      expect(await sceptreAdapter.wflr()).to.equal(WFLR);
    });

    it("should have correct staking token address", async function () {
      expect(await sceptreAdapter.stakingToken()).to.equal(SFLR);
    });
  });

  describe("View Functions", function () {
    it("should return non-zero TVL from Sceptre", async function () {
      const tvl = await sceptreAdapter.getTVL(ethers.ZeroAddress);
      console.log(`Sceptre TVL: ${ethers.formatEther(tvl)} FLR`);
      expect(tvl).to.be.gt(0);
    });

    it("should return valid exchange rate", async function () {
      const exchangeRate = await sceptreAdapter.getExchangeRate(ethers.ZeroAddress);
      console.log(`Exchange rate: 1 sFLR = ${ethers.formatEther(exchangeRate)} FLR`);
      // Exchange rate should be >= 1e18 (sFLR appreciates over time)
      expect(exchangeRate).to.be.gte(ethers.parseEther("1"));
    });

    it("should return APY estimate", async function () {
      const apy = await sceptreAdapter.getAPY(ethers.ZeroAddress);
      console.log(`Estimated APY: ${Number(apy) / 100}%`);
      // APY should be reasonable (0-50%)
      expect(apy).to.be.lte(5000);
    });

    it("should return cooldown period", async function () {
      const cooldown = await sceptreAdapter.getCooldownPeriod();
      console.log(`Cooldown period: ${cooldown} seconds (~${Number(cooldown) / 86400} days)`);
      // Sceptre has ~14.5 day cooldown
      expect(cooldown).to.be.gte(86400); // At least 1 day
    });

    it("should support native FLR (address(0))", async function () {
      expect(await sceptreAdapter.isAssetSupported(ethers.ZeroAddress)).to.be.true;
    });

    it("should support WFLR", async function () {
      expect(await sceptreAdapter.isAssetSupported(WFLR)).to.be.true;
    });

    it("should support sFLR", async function () {
      expect(await sceptreAdapter.isAssetSupported(SFLR)).to.be.true;
    });

    it("should not support random token", async function () {
      const randomToken = "0x0000000000000000000000000000000000000001";
      expect(await sceptreAdapter.isAssetSupported(randomToken)).to.be.false;
    });
  });

  describe("Staking", function () {
    it("should stake FLR and receive sFLR", async function () {
      const stakeAmount = ethers.parseEther("1"); // 1 FLR

      // Get balances before
      const sflrBalanceBefore = await sceptreToken.balanceOf(await owner.getAddress());
      const exchangeRate = await sceptreAdapter.getExchangeRate(ethers.ZeroAddress);

      console.log(`Staking ${ethers.formatEther(stakeAmount)} FLR`);
      console.log(`Current exchange rate: ${ethers.formatEther(exchangeRate)} FLR per sFLR`);

      // Stake FLR
      const tx = await sceptreAdapter.stake(stakeAmount, await owner.getAddress(), {
        value: stakeAmount,
      });
      const receipt = await tx.wait();

      // Get balances after
      const sflrBalanceAfter = await sceptreToken.balanceOf(await owner.getAddress());
      const sharesReceived = sflrBalanceAfter - sflrBalanceBefore;

      console.log(`Received ${ethers.formatEther(sharesReceived)} sFLR`);
      console.log(`Gas used: ${receipt.gasUsed}`);

      // Should have received sFLR
      expect(sharesReceived).to.be.gt(0);

      // Shares should be less than or equal to staked amount (due to exchange rate >= 1)
      expect(sharesReceived).to.be.lte(stakeAmount);
    });

    it("should stake via deposit function", async function () {
      const stakeAmount = ethers.parseEther("0.5");

      const sflrBalanceBefore = await sceptreToken.balanceOf(await owner.getAddress());

      // Use deposit (IYieldAdapter interface)
      const tx = await sceptreAdapter.deposit(ethers.ZeroAddress, stakeAmount, await owner.getAddress(), {
        value: stakeAmount,
      });
      await tx.wait();

      const sflrBalanceAfter = await sceptreToken.balanceOf(await owner.getAddress());
      const sharesReceived = sflrBalanceAfter - sflrBalanceBefore;

      console.log(`Deposited ${ethers.formatEther(stakeAmount)} FLR, received ${ethers.formatEther(sharesReceived)} sFLR`);
      expect(sharesReceived).to.be.gt(0);
    });

    it("should revert if amount doesn't match msg.value", async function () {
      const stakeAmount = ethers.parseEther("1");
      const wrongValue = ethers.parseEther("0.5");

      await expect(
        sceptreAdapter.stake(stakeAmount, await owner.getAddress(), {
          value: wrongValue,
        })
      ).to.be.reverted;
    });

    it("should revert on zero amount", async function () {
      await expect(
        sceptreAdapter.stake(0, await owner.getAddress(), {
          value: 0,
        })
      ).to.be.reverted;
    });
  });

  describe("Underlying Balance", function () {
    it("should return correct underlying balance after staking", async function () {
      const stakeAmount = ethers.parseEther("1");

      // Stake first
      await sceptreAdapter.stake(stakeAmount, await owner.getAddress(), {
        value: stakeAmount,
      });

      // Get underlying balance
      const underlyingBalance = await sceptreAdapter.getUnderlyingBalance(
        ethers.ZeroAddress,
        await owner.getAddress()
      );

      console.log(`Underlying balance: ${ethers.formatEther(underlyingBalance)} FLR`);

      // Due to exchange rate >= 1, underlying balance >= staked amount
      // (small rounding difference possible)
      expect(underlyingBalance).to.be.closeTo(stakeAmount, ethers.parseEther("0.01"));
    });
  });

  describe("Request Unstake", function () {
    it("should request unstake and return request ID", async function () {
      const stakeAmount = ethers.parseEther("1");

      // Stake first
      await sceptreAdapter.stake(stakeAmount, await owner.getAddress(), {
        value: stakeAmount,
      });

      // Get sFLR balance
      const sflrBalance = await sceptreToken.balanceOf(await owner.getAddress());
      console.log(`sFLR balance: ${ethers.formatEther(sflrBalance)}`);

      // Approve adapter to spend sFLR
      await sceptreToken.approve(await sceptreAdapter.getAddress(), sflrBalance);

      // Request unstake
      const tx = await sceptreAdapter.requestUnstake(sflrBalance);
      const receipt = await tx.wait();

      // Get request ID from events
      const event = receipt.logs.find(
        (log: any) => log.fragment && log.fragment.name === "UnstakeRequested"
      );

      if (event) {
        const requestId = event.args.requestId;
        console.log(`Unstake request ID: ${requestId}`);

        // Check request owner
        const requestOwner = await sceptreAdapter.requestOwners(requestId);
        expect(requestOwner).to.equal(await owner.getAddress());

        // Check user requests
        const userRequests = await sceptreAdapter.getUserRequests(await owner.getAddress());
        expect(userRequests.length).to.be.gt(0);
      }
    });

    it("should track unstake request details", async function () {
      const stakeAmount = ethers.parseEther("0.5");

      // Stake
      await sceptreAdapter.stake(stakeAmount, await owner.getAddress(), {
        value: stakeAmount,
      });

      const sflrBalance = await sceptreToken.balanceOf(await owner.getAddress());
      await sceptreToken.approve(await sceptreAdapter.getAddress(), sflrBalance);

      // Request unstake
      const tx = await sceptreAdapter.requestUnstake(sflrBalance);
      const receipt = await tx.wait();

      // Get request ID
      const event = receipt.logs.find(
        (log: any) => log.fragment && log.fragment.name === "UnstakeRequested"
      );

      if (event) {
        const requestId = event.args.requestId;

        // Get request details
        const [user, shares, unlockTime, claimed] = await sceptreAdapter.getUnstakeRequest(requestId);

        console.log(`Request details:`);
        console.log(`  User: ${user}`);
        console.log(`  Shares: ${ethers.formatEther(shares)}`);
        console.log(`  Unlock time: ${new Date(Number(unlockTime) * 1000).toISOString()}`);
        console.log(`  Claimed: ${claimed}`);

        expect(user).to.equal(await owner.getAddress());
        expect(shares).to.be.gt(0);
        expect(unlockTime).to.be.gt(Math.floor(Date.now() / 1000));
        expect(claimed).to.be.false;
      }
    });
  });

  describe("Unstake Claimability", function () {
    it("should return false for non-claimable request", async function () {
      const stakeAmount = ethers.parseEther("0.1");

      // Stake
      await sceptreAdapter.stake(stakeAmount, await owner.getAddress(), {
        value: stakeAmount,
      });

      const sflrBalance = await sceptreToken.balanceOf(await owner.getAddress());
      await sceptreToken.approve(await sceptreAdapter.getAddress(), sflrBalance);

      // Request unstake
      const tx = await sceptreAdapter.requestUnstake(sflrBalance);
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        (log: any) => log.fragment && log.fragment.name === "UnstakeRequested"
      );

      if (event) {
        const requestId = event.args.requestId;

        // Should not be claimable immediately
        const isClaimable = await sceptreAdapter.isUnstakeClaimable(requestId);
        expect(isClaimable).to.be.false;
      }
    });
  });

  describe("Withdraw", function () {
    it("should revert withdraw (requires two-phase unstaking)", async function () {
      await expect(
        sceptreAdapter.withdraw(ethers.ZeroAddress, ethers.parseEther("1"), await owner.getAddress())
      ).to.be.reverted;
    });
  });

  describe("Gas Estimates", function () {
    it("should have reasonable gas cost for staking", async function () {
      const stakeAmount = ethers.parseEther("0.1");

      const tx = await sceptreAdapter.stake(stakeAmount, await owner.getAddress(), {
        value: stakeAmount,
      });
      const receipt = await tx.wait();

      console.log(`Stake gas used: ${receipt.gasUsed}`);
      // Should be under 300k gas
      expect(receipt.gasUsed).to.be.lt(300000);
    });
  });
});

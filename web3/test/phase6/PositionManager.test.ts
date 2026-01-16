import { expect } from "chai";
import { network } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = await network.connect();

/**
 * PositionManager Comprehensive Test Suite
 *
 * This test suite exhaustively validates the PositionManager contract which:
 * - Tracks all open positions for each Execution Rights Token (ERT)
 * - Records positions via recordPosition() and recordPositionWithId()
 * - Updates positions via updatePosition()
 * - Closes positions via closePosition() and closeAllPositions()
 * - Calculates unrealized PnL with calculateUnrealizedPnl() and calculateUnrealizedPnlWithPrices()
 * - Gets exposure by asset with getExposureByAsset()
 * - Provides view functions: getPositions, getPositionCount, getPosition, getTotalEntryValue
 *
 * Tests run against Flare mainnet fork to ensure realistic environment.
 *
 * ADVERSARIAL APPROACH:
 * - Every public/external function is tested for access control bypass
 * - Boundary conditions are explicitly tested
 * - State consistency is verified after every mutation
 * - Position tracking integrity is validated (swap-delete pattern)
 * - Edge cases like empty positions, duplicate IDs, multiple ERTs tested
 * - PnL calculation precision and overflow scenarios probed
 */
describe("PositionManager", function () {
  this.timeout(120000);

  // Contract instances
  let positionManager: any;
  let mockFlareOracle: any;
  let mockToken: any;

  // Signers
  let owner: SignerWithAddress;
  let controller: SignerWithAddress;
  let nonOwner: SignerWithAddress;
  let attacker: SignerWithAddress;

  // Test asset addresses (simulated)
  let assetA: SignerWithAddress;
  let assetB: SignerWithAddress;
  let assetC: SignerWithAddress;
  let adapterA: SignerWithAddress;
  let adapterB: SignerWithAddress;

  // Constants matching contract
  const BPS = 10000n;
  const PRICE_PRECISION = 10n ** 18n;
  const ONE_USD = 10n ** 6n; // 6 decimals for USD amounts

  // ActionType enum values (matching PraxisStructs)
  const ActionType = {
    SWAP: 0,
    SUPPLY: 1,
    WITHDRAW: 2,
    BORROW: 3,
    REPAY: 4,
    STAKE: 5,
    UNSTAKE: 6,
    OPEN_POSITION: 7,
    CLOSE_POSITION: 8,
    ADD_MARGIN: 9,
    REMOVE_MARGIN: 10
  };

  before(async function () {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    if (chainId !== 14n) {
      console.log(`Skipping - not on Flare fork (chainId: ${chainId})`);
      this.skip();
    }

    [owner, controller, nonOwner, attacker, assetA, assetB, assetC, adapterA, adapterB] = await ethers.getSigners();
    console.log(`Test owner: ${await owner.getAddress()}`);
    console.log(`Controller: ${await controller.getAddress()}`);
  });

  beforeEach(async function () {
    // Deploy MockFlareOracle for testing
    const MockFlareOracle = await ethers.getContractFactory("MockFlareOracle");
    mockFlareOracle = await MockFlareOracle.deploy();
    await mockFlareOracle.waitForDeployment();

    // Deploy PositionManager
    const PositionManager = await ethers.getContractFactory("PositionManager");
    positionManager = await PositionManager.deploy(await mockFlareOracle.getAddress());
    await positionManager.waitForDeployment();

    // Set the execution controller
    await positionManager.setExecutionController(await controller.getAddress());

    // Deploy MockERC20 for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("Mock Token", "MTK", 18);
    await mockToken.waitForDeployment();
  });

  // Helper function to extract positionId from transaction event
  async function getPositionIdFromTx(tx: any): Promise<string> {
    const receipt = await tx.wait();
    // PositionRecorded event signature: PositionRecorded(uint256 indexed ertId, bytes32 indexed positionId, address asset, uint256 size, uint256 entryValueUsd)
    const eventSignature = ethers.id("PositionRecorded(uint256,bytes32,address,uint256,uint256)");
    const log = receipt.logs.find((log: any) => log.topics[0] === eventSignature);
    if (!log) throw new Error("PositionRecorded event not found");
    // positionId is the second indexed parameter (topics[2])
    return log.topics[2];
  }

  // =============================================================
  //                    DEPLOYMENT TESTS
  // =============================================================

  describe("Deployment and Initialization", function () {
    it("should deploy with correct owner", async function () {
      expect(await positionManager.owner()).to.equal(await owner.getAddress());
    });

    it("should deploy with correct flare oracle address", async function () {
      expect(await positionManager.flareOracle()).to.equal(await mockFlareOracle.getAddress());
    });

    it("should have BPS constant of 10000", async function () {
      expect(await positionManager.BPS()).to.equal(BPS);
    });

    it("should have PRICE_PRECISION constant of 1e18", async function () {
      expect(await positionManager.PRICE_PRECISION()).to.equal(PRICE_PRECISION);
    });

    it("should have zero address for execution controller initially before setting", async function () {
      const PositionManager = await ethers.getContractFactory("PositionManager");
      const freshManager = await PositionManager.deploy(await mockFlareOracle.getAddress());
      await freshManager.waitForDeployment();

      expect(await freshManager.executionController()).to.equal(ethers.ZeroAddress);
    });

    it("should reject zero address for oracle in constructor", async function () {
      const PositionManager = await ethers.getContractFactory("PositionManager");
      await expect(
        PositionManager.deploy(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(positionManager, "ZeroAddress");
    });

    it("should have no positions for any ERT initially", async function () {
      const positions = await positionManager.getPositions(1);
      expect(positions.length).to.equal(0);
    });

    it("should have zero position count for any ERT initially", async function () {
      expect(await positionManager.getPositionCount(1)).to.equal(0n);
    });

    it("should return false for hasOpenPositions initially", async function () {
      expect(await positionManager.hasOpenPositions(1)).to.be.false;
    });
  });

  // =============================================================
  //                  RECORD POSITION TESTS
  // =============================================================

  describe("recordPosition()", function () {
    const ertId = 1n;
    const size = 1000n * PRICE_PRECISION;
    const entryValueUsd = 50000n * ONE_USD; // $50,000

    describe("Access Control", function () {
      it("should reject calls from non-controller", async function () {
        await expect(
          positionManager.connect(nonOwner).recordPosition(
            ertId,
            await adapterA.getAddress(),
            await assetA.getAddress(),
            size,
            entryValueUsd,
            ActionType.SUPPLY
          )
        ).to.be.revertedWithCustomError(positionManager, "OnlyController");
      });

      it("should reject calls from owner (owner is not controller)", async function () {
        const PositionManager = await ethers.getContractFactory("PositionManager");
        const freshManager = await PositionManager.deploy(await mockFlareOracle.getAddress());
        await freshManager.waitForDeployment();

        await expect(
          freshManager.recordPosition(
            ertId,
            await adapterA.getAddress(),
            await assetA.getAddress(),
            size,
            entryValueUsd,
            ActionType.SUPPLY
          )
        ).to.be.revertedWithCustomError(freshManager, "OnlyController");
      });

      it("should allow calls from execution controller", async function () {
        const tx = await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          size,
          entryValueUsd,
          ActionType.SUPPLY
        );

        const receipt = await tx.wait();
        expect(receipt.status).to.equal(1);
      });
    });

    describe("Position Creation", function () {
      it("should create position with correct data", async function () {
        const adapter = await adapterA.getAddress();
        const asset = await assetA.getAddress();

        await positionManager.connect(controller).recordPosition(
          ertId,
          adapter,
          asset,
          size,
          entryValueUsd,
          ActionType.SUPPLY
        );

        const positions = await positionManager.getPositions(ertId);
        expect(positions.length).to.equal(1);
        expect(positions[0].ertId).to.equal(ertId);
        expect(positions[0].adapter).to.equal(adapter);
        expect(positions[0].asset).to.equal(asset);
        expect(positions[0].size).to.equal(size);
        expect(positions[0].entryValueUsd).to.equal(entryValueUsd);
        expect(positions[0].positionType).to.equal(ActionType.SUPPLY);
      });

      it("should generate unique position ID", async function () {
        const tx = await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          size,
          entryValueUsd,
          ActionType.SUPPLY
        );

        const receipt = await tx.wait();
        const event = receipt.logs.find((log: any) => {
          try {
            return positionManager.interface.parseLog(log)?.name === "PositionRecorded";
          } catch { return false; }
        });

        const parsed = positionManager.interface.parseLog(event);
        expect(parsed.args.positionId).to.not.equal(ethers.ZeroHash);
      });

      it("should return position ID from function call", async function () {
        const positionId = await positionManager.connect(controller).recordPosition.staticCall(
          ertId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          size,
          entryValueUsd,
          ActionType.SUPPLY
        );

        expect(positionId).to.not.equal(ethers.ZeroHash);
      });

      it("should store position timestamp", async function () {
        await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          size,
          entryValueUsd,
          ActionType.SUPPLY
        );

        const positions = await positionManager.getPositions(ertId);
        expect(positions[0].timestamp).to.be.gt(0n);
      });

      it("should update positionExists mapping", async function () {
        const tx = await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          size,
          entryValueUsd,
          ActionType.SUPPLY
        );
        const positionId = await getPositionIdFromTx(tx);

        expect(await positionManager.positionExists(positionId)).to.be.true;
      });

      it("should update positionToErt mapping", async function () {
        const tx = await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          size,
          entryValueUsd,
          ActionType.SUPPLY
        );
        const positionId = await getPositionIdFromTx(tx);

        expect(await positionManager.positionToErt(positionId)).to.equal(ertId);
      });

      it("should update positionIndex mapping", async function () {
        const tx = await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          size,
          entryValueUsd,
          ActionType.SUPPLY
        );
        const positionId = await getPositionIdFromTx(tx);

        expect(await positionManager.positionIndex(positionId)).to.equal(0n);
      });
    });

    describe("Multiple Positions", function () {
      it("should allow multiple positions for same ERT", async function () {
        for (let i = 0; i < 5; i++) {
          await positionManager.connect(controller).recordPosition(
            ertId,
            await adapterA.getAddress(),
            await assetA.getAddress(),
            size,
            entryValueUsd,
            ActionType.SUPPLY
          );
        }

        expect(await positionManager.getPositionCount(ertId)).to.equal(5n);
      });

      it("should allow positions for different ERTs", async function () {
        const ertIds = [1n, 2n, 3n];

        for (const id of ertIds) {
          await positionManager.connect(controller).recordPosition(
            id,
            await adapterA.getAddress(),
            await assetA.getAddress(),
            size,
            entryValueUsd,
            ActionType.SUPPLY
          );
        }

        for (const id of ertIds) {
          expect(await positionManager.getPositionCount(id)).to.equal(1n);
        }
      });

      it("should track position index correctly for multiple positions", async function () {
        const positionIds: string[] = [];

        for (let i = 0; i < 3; i++) {
          const tx = await positionManager.connect(controller).recordPosition(
            ertId,
            await adapterA.getAddress(),
            await assetA.getAddress(),
            size,
            entryValueUsd,
            ActionType.SUPPLY
          );
          const positionId = await getPositionIdFromTx(tx);
          positionIds.push(positionId);
        }

        for (let i = 0; i < 3; i++) {
          expect(await positionManager.positionIndex(positionIds[i])).to.equal(BigInt(i));
        }
      });
    });

    describe("Event Emission", function () {
      it("should emit PositionRecorded event", async function () {
        const adapter = await adapterA.getAddress();
        const asset = await assetA.getAddress();

        await expect(
          positionManager.connect(controller).recordPosition(
            ertId,
            adapter,
            asset,
            size,
            entryValueUsd,
            ActionType.SUPPLY
          )
        ).to.emit(positionManager, "PositionRecorded");
      });

      it("should emit event with correct parameters", async function () {
        const adapter = await adapterA.getAddress();
        const asset = await assetA.getAddress();

        const tx = await positionManager.connect(controller).recordPosition(
          ertId,
          adapter,
          asset,
          size,
          entryValueUsd,
          ActionType.SUPPLY
        );

        const receipt = await tx.wait();
        const event = receipt.logs.find((log: any) => {
          try {
            return positionManager.interface.parseLog(log)?.name === "PositionRecorded";
          } catch { return false; }
        });

        const parsed = positionManager.interface.parseLog(event);
        expect(parsed.args.ertId).to.equal(ertId);
        expect(parsed.args.asset).to.equal(asset);
        expect(parsed.args.size).to.equal(size);
        expect(parsed.args.entryValueUsd).to.equal(entryValueUsd);
      });
    });

    describe("Different ActionTypes", function () {
      it("should record positions with different action types", async function () {
        const actionTypes = [
          ActionType.SWAP,
          ActionType.SUPPLY,
          ActionType.STAKE,
          ActionType.OPEN_POSITION
        ];

        for (let i = 0; i < actionTypes.length; i++) {
          await positionManager.connect(controller).recordPosition(
            BigInt(i + 1),
            await adapterA.getAddress(),
            await assetA.getAddress(),
            size,
            entryValueUsd,
            actionTypes[i]
          );

          const positions = await positionManager.getPositions(BigInt(i + 1));
          expect(positions[0].positionType).to.equal(actionTypes[i]);
        }
      });
    });

    describe("Edge Cases", function () {
      it("should allow zero size position", async function () {
        await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          0n,
          entryValueUsd,
          ActionType.SUPPLY
        );

        const positions = await positionManager.getPositions(ertId);
        expect(positions[0].size).to.equal(0n);
      });

      it("should allow zero entry value position", async function () {
        await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          size,
          0n,
          ActionType.SUPPLY
        );

        const positions = await positionManager.getPositions(ertId);
        expect(positions[0].entryValueUsd).to.equal(0n);
      });

      it("should handle very large size values", async function () {
        const largeSize = ethers.parseUnits("1000000000000", 18); // 1 trillion tokens

        await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          largeSize,
          entryValueUsd,
          ActionType.SUPPLY
        );

        const positions = await positionManager.getPositions(ertId);
        expect(positions[0].size).to.equal(largeSize);
      });

      it("should handle very large entry value", async function () {
        const largeValue = ethers.parseUnits("1000000000000", 6); // $1 trillion

        await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          size,
          largeValue,
          ActionType.SUPPLY
        );

        const positions = await positionManager.getPositions(ertId);
        expect(positions[0].entryValueUsd).to.equal(largeValue);
      });
    });
  });

  // =============================================================
  //                RECORD POSITION WITH ID TESTS
  // =============================================================

  describe("recordPositionWithId()", function () {
    const ertId = 1n;
    const size = 1000n * PRICE_PRECISION;
    const entryValueUsd = 50000n * ONE_USD;
    const externalPositionId = ethers.keccak256(ethers.toUtf8Bytes("external-position-1"));

    describe("Access Control", function () {
      it("should reject calls from non-controller", async function () {
        await expect(
          positionManager.connect(nonOwner).recordPositionWithId(
            ertId,
            externalPositionId,
            await adapterA.getAddress(),
            await assetA.getAddress(),
            size,
            entryValueUsd,
            ActionType.OPEN_POSITION
          )
        ).to.be.revertedWithCustomError(positionManager, "OnlyController");
      });

      it("should allow calls from execution controller", async function () {
        await positionManager.connect(controller).recordPositionWithId(
          ertId,
          externalPositionId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          size,
          entryValueUsd,
          ActionType.OPEN_POSITION
        );

        expect(await positionManager.positionExists(externalPositionId)).to.be.true;
      });
    });

    describe("Position Creation with External ID", function () {
      it("should create position with provided external ID", async function () {
        await positionManager.connect(controller).recordPositionWithId(
          ertId,
          externalPositionId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          size,
          entryValueUsd,
          ActionType.OPEN_POSITION
        );

        const positions = await positionManager.getPositions(ertId);
        expect(positions[0].positionId).to.equal(externalPositionId);
      });

      it("should reject duplicate external position ID", async function () {
        await positionManager.connect(controller).recordPositionWithId(
          ertId,
          externalPositionId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          size,
          entryValueUsd,
          ActionType.OPEN_POSITION
        );

        await expect(
          positionManager.connect(controller).recordPositionWithId(
            ertId,
            externalPositionId,
            await adapterA.getAddress(),
            await assetA.getAddress(),
            size,
            entryValueUsd,
            ActionType.OPEN_POSITION
          )
        ).to.be.revertedWithCustomError(positionManager, "InvalidAdapter");
      });

      it("should reject duplicate ID even for different ERT", async function () {
        await positionManager.connect(controller).recordPositionWithId(
          1n,
          externalPositionId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          size,
          entryValueUsd,
          ActionType.OPEN_POSITION
        );

        await expect(
          positionManager.connect(controller).recordPositionWithId(
            2n, // Different ERT
            externalPositionId,
            await adapterA.getAddress(),
            await assetA.getAddress(),
            size,
            entryValueUsd,
            ActionType.OPEN_POSITION
          )
        ).to.be.revertedWithCustomError(positionManager, "InvalidAdapter");
      });

      it("should set correct mappings for external position ID", async function () {
        await positionManager.connect(controller).recordPositionWithId(
          ertId,
          externalPositionId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          size,
          entryValueUsd,
          ActionType.OPEN_POSITION
        );

        expect(await positionManager.positionExists(externalPositionId)).to.be.true;
        expect(await positionManager.positionToErt(externalPositionId)).to.equal(ertId);
        expect(await positionManager.positionIndex(externalPositionId)).to.equal(0n);
      });
    });

    describe("Event Emission", function () {
      it("should emit PositionRecorded event with external ID", async function () {
        const asset = await assetA.getAddress();

        await expect(
          positionManager.connect(controller).recordPositionWithId(
            ertId,
            externalPositionId,
            await adapterA.getAddress(),
            asset,
            size,
            entryValueUsd,
            ActionType.OPEN_POSITION
          )
        ).to.emit(positionManager, "PositionRecorded")
          .withArgs(ertId, externalPositionId, asset, size, entryValueUsd);
      });
    });
  });

  // =============================================================
  //                  UPDATE POSITION TESTS
  // =============================================================

  describe("updatePosition()", function () {
    const ertId = 1n;
    const initialSize = 1000n * PRICE_PRECISION;
    const initialEntryValue = 50000n * ONE_USD;
    let positionId: string;

    beforeEach(async function () {
      const tx = await positionManager.connect(controller).recordPosition(
        ertId,
        await adapterA.getAddress(),
        await assetA.getAddress(),
        initialSize,
        initialEntryValue,
        ActionType.SUPPLY
      );
      positionId = await getPositionIdFromTx(tx);
    });

    describe("Access Control", function () {
      it("should reject calls from non-controller", async function () {
        await expect(
          positionManager.connect(nonOwner).updatePosition(
            positionId,
            initialSize * 2n,
            initialEntryValue * 2n
          )
        ).to.be.revertedWithCustomError(positionManager, "OnlyController");
      });

      it("should allow calls from execution controller", async function () {
        await positionManager.connect(controller).updatePosition(
          positionId,
          initialSize * 2n,
          initialEntryValue * 2n
        );

        const position = await positionManager.getPosition(positionId);
        expect(position.size).to.equal(initialSize * 2n);
      });
    });

    describe("Position Updates", function () {
      it("should update position size", async function () {
        const newSize = initialSize * 2n;

        await positionManager.connect(controller).updatePosition(
          positionId,
          newSize,
          initialEntryValue
        );

        const position = await positionManager.getPosition(positionId);
        expect(position.size).to.equal(newSize);
      });

      it("should update position entry value", async function () {
        const newEntryValue = initialEntryValue * 2n;

        await positionManager.connect(controller).updatePosition(
          positionId,
          initialSize,
          newEntryValue
        );

        const position = await positionManager.getPosition(positionId);
        expect(position.entryValueUsd).to.equal(newEntryValue);
      });

      it("should update both size and entry value", async function () {
        const newSize = initialSize * 3n;
        const newEntryValue = initialEntryValue * 3n;

        await positionManager.connect(controller).updatePosition(
          positionId,
          newSize,
          newEntryValue
        );

        const position = await positionManager.getPosition(positionId);
        expect(position.size).to.equal(newSize);
        expect(position.entryValueUsd).to.equal(newEntryValue);
      });

      it("should allow reducing size to zero", async function () {
        await positionManager.connect(controller).updatePosition(
          positionId,
          0n,
          initialEntryValue
        );

        const position = await positionManager.getPosition(positionId);
        expect(position.size).to.equal(0n);
      });

      it("should allow reducing entry value to zero", async function () {
        await positionManager.connect(controller).updatePosition(
          positionId,
          initialSize,
          0n
        );

        const position = await positionManager.getPosition(positionId);
        expect(position.entryValueUsd).to.equal(0n);
      });

      it("should not affect other position fields", async function () {
        const positionBefore = await positionManager.getPosition(positionId);

        await positionManager.connect(controller).updatePosition(
          positionId,
          initialSize * 2n,
          initialEntryValue * 2n
        );

        const positionAfter = await positionManager.getPosition(positionId);

        expect(positionAfter.ertId).to.equal(positionBefore.ertId);
        expect(positionAfter.adapter).to.equal(positionBefore.adapter);
        expect(positionAfter.asset).to.equal(positionBefore.asset);
        expect(positionAfter.timestamp).to.equal(positionBefore.timestamp);
        expect(positionAfter.positionType).to.equal(positionBefore.positionType);
      });
    });

    describe("Error Cases", function () {
      it("should reject update for non-existent position", async function () {
        const fakePositionId = ethers.keccak256(ethers.toUtf8Bytes("fake-position"));

        await expect(
          positionManager.connect(controller).updatePosition(
            fakePositionId,
            initialSize,
            initialEntryValue
          )
        ).to.be.revertedWithCustomError(positionManager, "PositionNotFound")
          .withArgs(fakePositionId);
      });

      it("should reject update for closed position", async function () {
        await positionManager.connect(controller).closePosition(positionId, 0);

        await expect(
          positionManager.connect(controller).updatePosition(
            positionId,
            initialSize,
            initialEntryValue
          )
        ).to.be.revertedWithCustomError(positionManager, "PositionNotFound");
      });
    });
  });

  // =============================================================
  //                  CLOSE POSITION TESTS
  // =============================================================

  describe("closePosition()", function () {
    const ertId = 1n;
    const size = 1000n * PRICE_PRECISION;
    const entryValueUsd = 50000n * ONE_USD;
    let positionId: string;

    beforeEach(async function () {
      const tx = await positionManager.connect(controller).recordPosition(
        ertId,
        await adapterA.getAddress(),
        await assetA.getAddress(),
        size,
        entryValueUsd,
        ActionType.SUPPLY
      );
      positionId = await getPositionIdFromTx(tx);
    });

    describe("Access Control", function () {
      it("should reject calls from non-controller", async function () {
        await expect(
          positionManager.connect(nonOwner).closePosition(positionId, 0)
        ).to.be.revertedWithCustomError(positionManager, "OnlyController");
      });

      it("should allow calls from execution controller", async function () {
        await positionManager.connect(controller).closePosition(positionId, 0);
        expect(await positionManager.positionExists(positionId)).to.be.false;
      });
    });

    describe("Position Removal", function () {
      it("should remove position from ertPositions array", async function () {
        expect(await positionManager.getPositionCount(ertId)).to.equal(1n);

        await positionManager.connect(controller).closePosition(positionId, 0);

        expect(await positionManager.getPositionCount(ertId)).to.equal(0n);
      });

      it("should clean up positionExists mapping", async function () {
        expect(await positionManager.positionExists(positionId)).to.be.true;

        await positionManager.connect(controller).closePosition(positionId, 0);

        expect(await positionManager.positionExists(positionId)).to.be.false;
      });

      it("should clean up positionToErt mapping", async function () {
        expect(await positionManager.positionToErt(positionId)).to.equal(ertId);

        await positionManager.connect(controller).closePosition(positionId, 0);

        expect(await positionManager.positionToErt(positionId)).to.equal(0n);
      });

      it("should clean up positionIndex mapping", async function () {
        await positionManager.connect(controller).closePosition(positionId, 0);

        expect(await positionManager.positionIndex(positionId)).to.equal(0n);
      });

      it("should update hasOpenPositions to false when last position closed", async function () {
        expect(await positionManager.hasOpenPositions(ertId)).to.be.true;

        await positionManager.connect(controller).closePosition(positionId, 0);

        expect(await positionManager.hasOpenPositions(ertId)).to.be.false;
      });
    });

    describe("Swap-Delete Pattern (Multiple Positions)", function () {
      let positionId1: string;
      let positionId2: string;
      let positionId3: string;

      beforeEach(async function () {
        // Clear existing position
        await positionManager.connect(controller).closePosition(positionId, 0);

        // Create 3 positions
        const tx1 = await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          size,
          entryValueUsd,
          ActionType.SUPPLY
        );
        positionId1 = await getPositionIdFromTx(tx1);

        const tx2 = await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterB.getAddress(),
          await assetB.getAddress(),
          size * 2n,
          entryValueUsd * 2n,
          ActionType.STAKE
        );
        positionId2 = await getPositionIdFromTx(tx2);

        const tx3 = await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          await assetC.getAddress(),
          size * 3n,
          entryValueUsd * 3n,
          ActionType.OPEN_POSITION
        );
        positionId3 = await getPositionIdFromTx(tx3);
      });

      it("should correctly close first position (swap with last)", async function () {
        expect(await positionManager.getPositionCount(ertId)).to.equal(3n);

        await positionManager.connect(controller).closePosition(positionId1, 0);

        expect(await positionManager.getPositionCount(ertId)).to.equal(2n);
        expect(await positionManager.positionExists(positionId1)).to.be.false;
        expect(await positionManager.positionExists(positionId2)).to.be.true;
        expect(await positionManager.positionExists(positionId3)).to.be.true;

        // Position 3 should now be at index 0
        expect(await positionManager.positionIndex(positionId3)).to.equal(0n);
      });

      it("should correctly close middle position (swap with last)", async function () {
        await positionManager.connect(controller).closePosition(positionId2, 0);

        expect(await positionManager.getPositionCount(ertId)).to.equal(2n);
        expect(await positionManager.positionExists(positionId2)).to.be.false;

        // Position 3 should now be at index 1
        expect(await positionManager.positionIndex(positionId3)).to.equal(1n);
        // Position 1 should remain at index 0
        expect(await positionManager.positionIndex(positionId1)).to.equal(0n);
      });

      it("should correctly close last position (no swap needed)", async function () {
        await positionManager.connect(controller).closePosition(positionId3, 0);

        expect(await positionManager.getPositionCount(ertId)).to.equal(2n);
        expect(await positionManager.positionExists(positionId3)).to.be.false;

        // Position 1 and 2 should retain their indices
        expect(await positionManager.positionIndex(positionId1)).to.equal(0n);
        expect(await positionManager.positionIndex(positionId2)).to.equal(1n);
      });

      it("should maintain data integrity after swap-delete", async function () {
        // Close first position
        await positionManager.connect(controller).closePosition(positionId1, 0);

        // Verify position 3 (now at index 0) has correct data
        const position = await positionManager.getPosition(positionId3);
        expect(position.size).to.equal(size * 3n);
        expect(position.entryValueUsd).to.equal(entryValueUsd * 3n);
        expect(position.positionType).to.equal(ActionType.OPEN_POSITION);
      });

      it("should handle closing all positions sequentially", async function () {
        await positionManager.connect(controller).closePosition(positionId1, 0);
        expect(await positionManager.getPositionCount(ertId)).to.equal(2n);

        await positionManager.connect(controller).closePosition(positionId2, 0);
        expect(await positionManager.getPositionCount(ertId)).to.equal(1n);

        await positionManager.connect(controller).closePosition(positionId3, 0);
        expect(await positionManager.getPositionCount(ertId)).to.equal(0n);
        expect(await positionManager.hasOpenPositions(ertId)).to.be.false;
      });
    });

    describe("PnL Recording", function () {
      it("should accept positive realized PnL", async function () {
        const profit = 5000n * ONE_USD;

        await expect(
          positionManager.connect(controller).closePosition(positionId, profit)
        ).to.emit(positionManager, "PositionClosed")
          .withArgs(ertId, positionId, profit);
      });

      it("should accept negative realized PnL (loss)", async function () {
        const loss = -5000n * ONE_USD;

        await expect(
          positionManager.connect(controller).closePosition(positionId, loss)
        ).to.emit(positionManager, "PositionClosed")
          .withArgs(ertId, positionId, loss);
      });

      it("should accept zero realized PnL", async function () {
        await expect(
          positionManager.connect(controller).closePosition(positionId, 0)
        ).to.emit(positionManager, "PositionClosed")
          .withArgs(ertId, positionId, 0);
      });
    });

    describe("Error Cases", function () {
      it("should reject closing non-existent position", async function () {
        const fakePositionId = ethers.keccak256(ethers.toUtf8Bytes("fake-position"));

        await expect(
          positionManager.connect(controller).closePosition(fakePositionId, 0)
        ).to.be.revertedWithCustomError(positionManager, "PositionNotFound")
          .withArgs(fakePositionId);
      });

      it("should reject closing already closed position", async function () {
        await positionManager.connect(controller).closePosition(positionId, 0);

        await expect(
          positionManager.connect(controller).closePosition(positionId, 0)
        ).to.be.revertedWithCustomError(positionManager, "PositionNotFound");
      });
    });

    describe("Event Emission", function () {
      it("should emit PositionClosed event", async function () {
        const pnl = 1000n * ONE_USD;

        await expect(
          positionManager.connect(controller).closePosition(positionId, pnl)
        ).to.emit(positionManager, "PositionClosed")
          .withArgs(ertId, positionId, pnl);
      });
    });
  });

  // =============================================================
  //                CLOSE ALL POSITIONS TESTS
  // =============================================================

  describe("closeAllPositions()", function () {
    const ertId = 1n;
    const size = 1000n * PRICE_PRECISION;
    const entryValueUsd = 50000n * ONE_USD;
    let positionIds: string[] = [];

    beforeEach(async function () {
      positionIds = [];

      // Create multiple positions
      for (let i = 0; i < 5; i++) {
        const tx = await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          size,
          entryValueUsd,
          ActionType.SUPPLY
        );
        const positionId = await getPositionIdFromTx(tx);
        positionIds.push(positionId);
      }
    });

    describe("Access Control", function () {
      it("should reject calls from non-controller", async function () {
        await expect(
          positionManager.connect(nonOwner).closeAllPositions(ertId)
        ).to.be.revertedWithCustomError(positionManager, "OnlyController");
      });

      it("should allow calls from execution controller", async function () {
        await positionManager.connect(controller).closeAllPositions(ertId);
        expect(await positionManager.getPositionCount(ertId)).to.equal(0n);
      });
    });

    describe("Bulk Position Removal", function () {
      it("should remove all positions for ERT", async function () {
        expect(await positionManager.getPositionCount(ertId)).to.equal(5n);

        await positionManager.connect(controller).closeAllPositions(ertId);

        expect(await positionManager.getPositionCount(ertId)).to.equal(0n);
      });

      it("should clean up all mappings", async function () {
        await positionManager.connect(controller).closeAllPositions(ertId);

        for (const posId of positionIds) {
          expect(await positionManager.positionExists(posId)).to.be.false;
          expect(await positionManager.positionToErt(posId)).to.equal(0n);
          expect(await positionManager.positionIndex(posId)).to.equal(0n);
        }
      });

      it("should update hasOpenPositions to false", async function () {
        expect(await positionManager.hasOpenPositions(ertId)).to.be.true;

        await positionManager.connect(controller).closeAllPositions(ertId);

        expect(await positionManager.hasOpenPositions(ertId)).to.be.false;
      });

      it("should not affect other ERTs", async function () {
        const otherErtId = 2n;

        // Create position for other ERT
        await positionManager.connect(controller).recordPosition(
          otherErtId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          size,
          entryValueUsd,
          ActionType.SUPPLY
        );

        await positionManager.connect(controller).closeAllPositions(ertId);

        expect(await positionManager.getPositionCount(ertId)).to.equal(0n);
        expect(await positionManager.getPositionCount(otherErtId)).to.equal(1n);
      });
    });

    describe("Edge Cases", function () {
      it("should handle ERT with no positions (no-op)", async function () {
        const emptyErtId = 999n;
        expect(await positionManager.getPositionCount(emptyErtId)).to.equal(0n);

        await positionManager.connect(controller).closeAllPositions(emptyErtId);

        expect(await positionManager.getPositionCount(emptyErtId)).to.equal(0n);
      });

      it("should handle ERT with single position", async function () {
        const singleErtId = 10n;

        await positionManager.connect(controller).recordPosition(
          singleErtId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          size,
          entryValueUsd,
          ActionType.SUPPLY
        );

        await positionManager.connect(controller).closeAllPositions(singleErtId);

        expect(await positionManager.getPositionCount(singleErtId)).to.equal(0n);
      });

      it("should handle large number of positions", async function () {
        const manyErtId = 20n;
        const positionCount = 20;

        for (let i = 0; i < positionCount; i++) {
          await positionManager.connect(controller).recordPosition(
            manyErtId,
            await adapterA.getAddress(),
            await assetA.getAddress(),
            size,
            entryValueUsd,
            ActionType.SUPPLY
          );
        }

        expect(await positionManager.getPositionCount(manyErtId)).to.equal(BigInt(positionCount));

        await positionManager.connect(controller).closeAllPositions(manyErtId);

        expect(await positionManager.getPositionCount(manyErtId)).to.equal(0n);
      });
    });
  });

  // =============================================================
  //                   VIEW FUNCTIONS TESTS
  // =============================================================

  describe("View Functions", function () {
    const ertId = 1n;
    const size = 1000n * PRICE_PRECISION;
    const entryValueUsd = 50000n * ONE_USD;
    let positionId: string;

    beforeEach(async function () {
      const tx = await positionManager.connect(controller).recordPosition(
        ertId,
        await adapterA.getAddress(),
        await assetA.getAddress(),
        size,
        entryValueUsd,
        ActionType.SUPPLY
      );
      positionId = await getPositionIdFromTx(tx);
    });

    describe("getPositions()", function () {
      it("should return empty array for ERT with no positions", async function () {
        const positions = await positionManager.getPositions(999n);
        expect(positions.length).to.equal(0);
      });

      it("should return all positions for ERT", async function () {
        // Add more positions
        await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterB.getAddress(),
          await assetB.getAddress(),
          size * 2n,
          entryValueUsd * 2n,
          ActionType.STAKE
        );

        const positions = await positionManager.getPositions(ertId);
        expect(positions.length).to.equal(2);
      });

      it("should return complete position data", async function () {
        const positions = await positionManager.getPositions(ertId);

        expect(positions[0].ertId).to.equal(ertId);
        expect(positions[0].adapter).to.equal(await adapterA.getAddress());
        expect(positions[0].asset).to.equal(await assetA.getAddress());
        expect(positions[0].size).to.equal(size);
        expect(positions[0].entryValueUsd).to.equal(entryValueUsd);
        expect(positions[0].positionType).to.equal(ActionType.SUPPLY);
        expect(positions[0].positionId).to.equal(positionId);
      });
    });

    describe("getPositionCount()", function () {
      it("should return 0 for ERT with no positions", async function () {
        expect(await positionManager.getPositionCount(999n)).to.equal(0n);
      });

      it("should return correct count", async function () {
        expect(await positionManager.getPositionCount(ertId)).to.equal(1n);

        await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          size,
          entryValueUsd,
          ActionType.SUPPLY
        );

        expect(await positionManager.getPositionCount(ertId)).to.equal(2n);
      });

      it("should decrease count after closing position", async function () {
        await positionManager.connect(controller).closePosition(positionId, 0);
        expect(await positionManager.getPositionCount(ertId)).to.equal(0n);
      });
    });

    describe("getPosition()", function () {
      it("should return correct position data", async function () {
        const position = await positionManager.getPosition(positionId);

        expect(position.ertId).to.equal(ertId);
        expect(position.size).to.equal(size);
        expect(position.entryValueUsd).to.equal(entryValueUsd);
      });

      it("should revert for non-existent position", async function () {
        const fakeId = ethers.keccak256(ethers.toUtf8Bytes("fake"));

        await expect(
          positionManager.getPosition(fakeId)
        ).to.be.revertedWithCustomError(positionManager, "PositionNotFound")
          .withArgs(fakeId);
      });

      it("should revert for closed position", async function () {
        await positionManager.connect(controller).closePosition(positionId, 0);

        await expect(
          positionManager.getPosition(positionId)
        ).to.be.revertedWithCustomError(positionManager, "PositionNotFound");
      });
    });

    describe("getTotalEntryValue()", function () {
      it("should return 0 for ERT with no positions", async function () {
        expect(await positionManager.getTotalEntryValue(999n)).to.equal(0n);
      });

      it("should return correct total for single position", async function () {
        expect(await positionManager.getTotalEntryValue(ertId)).to.equal(entryValueUsd);
      });

      it("should sum multiple position entry values", async function () {
        await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterB.getAddress(),
          await assetB.getAddress(),
          size * 2n,
          entryValueUsd * 2n,
          ActionType.STAKE
        );

        await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          await assetC.getAddress(),
          size * 3n,
          entryValueUsd * 3n,
          ActionType.OPEN_POSITION
        );

        const totalExpected = entryValueUsd + (entryValueUsd * 2n) + (entryValueUsd * 3n);
        expect(await positionManager.getTotalEntryValue(ertId)).to.equal(totalExpected);
      });

      it("should update after position close", async function () {
        await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterB.getAddress(),
          await assetB.getAddress(),
          size * 2n,
          entryValueUsd * 2n,
          ActionType.STAKE
        );

        const totalBefore = await positionManager.getTotalEntryValue(ertId);
        expect(totalBefore).to.equal(entryValueUsd * 3n);

        await positionManager.connect(controller).closePosition(positionId, 0);

        const totalAfter = await positionManager.getTotalEntryValue(ertId);
        expect(totalAfter).to.equal(entryValueUsd * 2n);
      });
    });

    describe("hasOpenPositions()", function () {
      it("should return false for ERT with no positions", async function () {
        expect(await positionManager.hasOpenPositions(999n)).to.be.false;
      });

      it("should return true when positions exist", async function () {
        expect(await positionManager.hasOpenPositions(ertId)).to.be.true;
      });

      it("should return false after all positions closed", async function () {
        await positionManager.connect(controller).closePosition(positionId, 0);
        expect(await positionManager.hasOpenPositions(ertId)).to.be.false;
      });
    });
  });

  // =============================================================
  //                  PNL CALCULATION TESTS
  // =============================================================

  describe("calculateUnrealizedPnlWithPrices()", function () {
    const ertId = 1n;
    const size = 100n * PRICE_PRECISION; // 100 tokens
    const entryPrice = 500n * PRICE_PRECISION; // $500 per token
    // Use PRICE_PRECISION for entryValueUsd to match the units used in currentValue calculation
    const entryValueUsd = 50000n * PRICE_PRECISION; // $50,000 total in PRICE_PRECISION units

    beforeEach(async function () {
      await positionManager.connect(controller).recordPosition(
        ertId,
        await adapterA.getAddress(),
        await assetA.getAddress(),
        size,
        entryValueUsd,
        ActionType.SUPPLY
      );
    });

    describe("PnL Calculations", function () {
      it("should return 0 PnL when price unchanged", async function () {
        const assets = [await assetA.getAddress()];
        const prices = [entryPrice]; // Same as entry

        const pnl = await positionManager.calculateUnrealizedPnlWithPrices(
          ertId,
          assets,
          prices
        );

        // Current value = size * price / PRECISION = 100 * 500 = 50000
        // PnL = 50000 - 50000 = 0
        expect(pnl).to.equal(0n);
      });

      it("should return positive PnL when price increased", async function () {
        const assets = [await assetA.getAddress()];
        const newPrice = 600n * PRICE_PRECISION; // $600 per token (20% up)
        const prices = [newPrice];

        const pnl = await positionManager.calculateUnrealizedPnlWithPrices(
          ertId,
          assets,
          prices
        );

        // Current value = 100 * 600 = 60000 (in PRICE_PRECISION units)
        // PnL = 60000 - 50000 = 10000 (in PRICE_PRECISION units)
        const expectedPnl = 10000n * PRICE_PRECISION;
        expect(pnl).to.equal(expectedPnl);
      });

      it("should return negative PnL when price decreased", async function () {
        const assets = [await assetA.getAddress()];
        const newPrice = 400n * PRICE_PRECISION; // $400 per token (20% down)
        const prices = [newPrice];

        const pnl = await positionManager.calculateUnrealizedPnlWithPrices(
          ertId,
          assets,
          prices
        );

        // Current value = 100 * 400 = 40000 (in PRICE_PRECISION units)
        // PnL = 40000 - 50000 = -10000 (in PRICE_PRECISION units)
        const expectedPnl = -10000n * PRICE_PRECISION;
        expect(pnl).to.equal(expectedPnl);
      });

      it("should calculate PnL for multiple positions with different assets", async function () {
        // Add second position
        const size2 = 200n * PRICE_PRECISION;
        // Use PRICE_PRECISION for entry value
        const entryValue2 = 100000n * PRICE_PRECISION; // $100,000 in PRICE_PRECISION units

        await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterB.getAddress(),
          await assetB.getAddress(),
          size2,
          entryValue2,
          ActionType.STAKE
        );

        const assets = [await assetA.getAddress(), await assetB.getAddress()];
        const prices = [
          600n * PRICE_PRECISION, // Asset A: +20%
          400n * PRICE_PRECISION  // Asset B: -20%
        ];

        const pnl = await positionManager.calculateUnrealizedPnlWithPrices(
          ertId,
          assets,
          prices
        );

        // Position 1: 100 * 600 - 50000 = 60000 - 50000 = +10000 (in PRICE_PRECISION units)
        // Position 2: 200 * 400 - 100000 = 80000 - 100000 = -20000 (in PRICE_PRECISION units)
        // Total: 10000 - 20000 = -10000 (in PRICE_PRECISION units)
        const expectedPnl = -10000n * PRICE_PRECISION;
        expect(pnl).to.equal(expectedPnl);
      });

      it("should return 0 for ERT with no positions", async function () {
        const pnl = await positionManager.calculateUnrealizedPnlWithPrices(
          999n,
          [],
          []
        );

        expect(pnl).to.equal(0n);
      });

      it("should skip positions without matching price in assets array", async function () {
        // Add second position with assetB
        await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterB.getAddress(),
          await assetB.getAddress(),
          size,
          entryValueUsd,
          ActionType.STAKE
        );

        // Only provide price for assetA
        const assets = [await assetA.getAddress()];
        const prices = [600n * PRICE_PRECISION];

        const pnl = await positionManager.calculateUnrealizedPnlWithPrices(
          ertId,
          assets,
          prices
        );

        // Only assetA PnL calculated: 100 * 600 - 50000 = +10000 (in PRICE_PRECISION units)
        // assetB position skipped (no price provided)
        const expectedPnl = 10000n * PRICE_PRECISION;
        expect(pnl).to.equal(expectedPnl);
      });
    });

    describe("Error Cases", function () {
      it("should revert when arrays have different lengths", async function () {
        const assets = [await assetA.getAddress(), await assetB.getAddress()];
        const prices = [500n * PRICE_PRECISION]; // Only 1 price for 2 assets

        await expect(
          positionManager.calculateUnrealizedPnlWithPrices(ertId, assets, prices)
        ).to.be.revertedWithCustomError(positionManager, "ArrayLengthMismatch")
          .withArgs(2, 1);
      });
    });

    describe("Edge Cases", function () {
      it("should handle zero price", async function () {
        const assets = [await assetA.getAddress()];
        const prices = [0n];

        const pnl = await positionManager.calculateUnrealizedPnlWithPrices(
          ertId,
          assets,
          prices
        );

        // Current value = 100 * 0 = 0
        // PnL = 0 - 50000 = -50000
        expect(pnl).to.equal(-entryValueUsd);
      });

      it("should handle very large prices without overflow", async function () {
        const assets = [await assetA.getAddress()];
        const veryLargePrice = ethers.parseUnits("1000000", 18); // $1M per token
        const prices = [veryLargePrice];

        const pnl = await positionManager.calculateUnrealizedPnlWithPrices(
          ertId,
          assets,
          prices
        );

        // Current value = 100 * 1000000 = 100,000,000
        // PnL = 100,000,000 - 50,000 = 99,950,000
        expect(pnl).to.be.gt(0n);
      });

      it("should handle position with zero size", async function () {
        const zeroSizeErtId = 100n;

        await positionManager.connect(controller).recordPosition(
          zeroSizeErtId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          0n, // Zero size
          entryValueUsd,
          ActionType.SUPPLY
        );

        const assets = [await assetA.getAddress()];
        const prices = [600n * PRICE_PRECISION];

        const pnl = await positionManager.calculateUnrealizedPnlWithPrices(
          zeroSizeErtId,
          assets,
          prices
        );

        // Current value = 0 * 600 = 0
        // PnL = 0 - 50000 = -50000
        expect(pnl).to.equal(-entryValueUsd);
      });
    });
  });

  // =============================================================
  //             CALCULATE UNREALIZED PNL (ORACLE) TESTS
  // =============================================================

  describe("calculateUnrealizedPnl() - Oracle Based", function () {
    const ertId = 1n;
    const size = 100n * PRICE_PRECISION; // 100 tokens
    const entryPrice = 500n * PRICE_PRECISION; // $500 per token
    // Use PRICE_PRECISION for entryValueUsd to match the units used in currentValue calculation
    // currentValue = (size * price) / PRICE_PRECISION = (100 * 10^18 * 500 * 10^18) / 10^18 = 50000 * 10^18
    const entryValueUsd = 50000n * PRICE_PRECISION; // $50,000 total in PRICE_PRECISION units

    beforeEach(async function () {
      // Configure mock oracle with price feeds
      await mockFlareOracle.setTokenPrice(await assetA.getAddress(), entryPrice);
      await mockFlareOracle.setTokenPrice(await assetB.getAddress(), 250n * PRICE_PRECISION);

      // Create test position
      await positionManager.connect(controller).recordPosition(
        ertId,
        await adapterA.getAddress(),
        await assetA.getAddress(),
        size,
        entryValueUsd,
        ActionType.SUPPLY
      );
    });

    describe("Oracle Integration", function () {
      it("should return 0 PnL when oracle price matches entry", async function () {
        // Oracle already configured with $500 price
        // Use staticCall to get return value from payable function
        const pnl = await positionManager.calculateUnrealizedPnl.staticCall(ertId, { value: 0 });

        // Current value = 100 * 500 = 50000
        // PnL = 50000 - 50000 = 0
        expect(pnl).to.equal(0n);
      });

      it("should return positive PnL when oracle price increased", async function () {
        // Update oracle to higher price
        await mockFlareOracle.setTokenPrice(await assetA.getAddress(), 600n * PRICE_PRECISION);

        const pnl = await positionManager.calculateUnrealizedPnl.staticCall(ertId, { value: 0 });

        // Current value = 100 * 600 = 60000 (in PRICE_PRECISION units)
        // PnL = 60000 - 50000 = 10000 (in PRICE_PRECISION units)
        expect(pnl).to.equal(10000n * PRICE_PRECISION);
      });

      it("should return negative PnL when oracle price decreased", async function () {
        // Update oracle to lower price
        await mockFlareOracle.setTokenPrice(await assetA.getAddress(), 400n * PRICE_PRECISION);

        const pnl = await positionManager.calculateUnrealizedPnl.staticCall(ertId, { value: 0 });

        // Current value = 100 * 400 = 40000 (in PRICE_PRECISION units)
        // PnL = 40000 - 50000 = -10000 (in PRICE_PRECISION units)
        expect(pnl).to.equal(-10000n * PRICE_PRECISION);
      });

      it("should skip positions without oracle feed", async function () {
        // Add position with asset that has no feed
        const noFeedAsset = await assetC.getAddress();
        await mockFlareOracle.setFeedConfigured(noFeedAsset, false);

        await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          noFeedAsset,
          size,
          entryValueUsd,
          ActionType.STAKE
        );

        // Should only calculate PnL for assetA (which has feed)
        const pnl = await positionManager.calculateUnrealizedPnl.staticCall(ertId, { value: 0 });

        // Only assetA: 100 * 500 - 50000 = 0
        expect(pnl).to.equal(0n);
      });

      it("should sum PnL across multiple positions with feeds", async function () {
        // Add second position with assetB
        // Use PRICE_PRECISION for entryValueUsd to match currentValue calculation units
        await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterB.getAddress(),
          await assetB.getAddress(),
          200n * PRICE_PRECISION, // 200 tokens
          50000n * PRICE_PRECISION, // Entry value $50,000 (in PRICE_PRECISION units)
          ActionType.STAKE
        );

        // Update assetA price to $600 (+20%)
        await mockFlareOracle.setTokenPrice(await assetA.getAddress(), 600n * PRICE_PRECISION);
        // Update assetB price to $200 (-20% from $250)
        await mockFlareOracle.setTokenPrice(await assetB.getAddress(), 200n * PRICE_PRECISION);

        const pnl = await positionManager.calculateUnrealizedPnl.staticCall(ertId, { value: 0 });

        // Position 1: 100 * 600 - 50000 = 60000 - 50000 = +10000 (in PRICE_PRECISION units)
        // Position 2: 200 * 200 - 50000 = 40000 - 50000 = -10000 (in PRICE_PRECISION units)
        // Total: +10000 - 10000 = 0
        expect(pnl).to.equal(0n);
      });
    });

    describe("Edge Cases", function () {
      it("should return 0 for ERT with no positions", async function () {
        const pnl = await positionManager.calculateUnrealizedPnl.staticCall(999n, { value: 0 });
        expect(pnl).to.equal(0n);
      });

      it("should handle zero oracle price", async function () {
        await mockFlareOracle.setTokenPrice(await assetA.getAddress(), 0n);

        const pnl = await positionManager.calculateUnrealizedPnl.staticCall(ertId, { value: 0 });

        // Current value = 100 * 0 = 0
        // PnL = 0 - 50000 = -50000
        expect(pnl).to.equal(-entryValueUsd);
      });

      it("should accept ETH payment for oracle fees", async function () {
        const fee = ethers.parseEther("0.01");

        // Should not revert with value
        const pnl = await positionManager.calculateUnrealizedPnl.staticCall(ertId, { value: fee });
        expect(pnl).to.equal(0n);
      });
    });
  });

  // =============================================================
  //               GET EXPOSURE BY ASSET TESTS
  // =============================================================

  describe("getExposureByAsset()", function () {
    const ertId = 1n;
    const size = 1000n * PRICE_PRECISION;
    const entryValueUsd = 50000n * ONE_USD;

    describe("Single Asset", function () {
      it("should return single asset with its exposure", async function () {
        await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          size,
          entryValueUsd,
          ActionType.SUPPLY
        );

        const [assets, exposures] = await positionManager.getExposureByAsset(ertId);

        expect(assets.length).to.equal(1);
        expect(exposures.length).to.equal(1);
        expect(assets[0]).to.equal(await assetA.getAddress());
        expect(exposures[0]).to.equal(entryValueUsd);
      });
    });

    describe("Multiple Assets", function () {
      it("should aggregate exposure per unique asset", async function () {
        const assetAAddr = await assetA.getAddress();
        const assetBAddr = await assetB.getAddress();

        // Two positions in assetA
        await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          assetAAddr,
          size,
          entryValueUsd,
          ActionType.SUPPLY
        );

        await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterB.getAddress(),
          assetAAddr,
          size,
          entryValueUsd * 2n,
          ActionType.STAKE
        );

        // One position in assetB
        await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          assetBAddr,
          size,
          entryValueUsd * 3n,
          ActionType.OPEN_POSITION
        );

        const [assets, exposures] = await positionManager.getExposureByAsset(ertId);

        expect(assets.length).to.equal(2);

        // Find assetA exposure
        const assetAIndex = assets.indexOf(assetAAddr);
        expect(assetAIndex).to.be.gte(0);
        expect(exposures[assetAIndex]).to.equal(entryValueUsd + entryValueUsd * 2n);

        // Find assetB exposure
        const assetBIndex = assets.indexOf(assetBAddr);
        expect(assetBIndex).to.be.gte(0);
        expect(exposures[assetBIndex]).to.equal(entryValueUsd * 3n);
      });

      it("should handle many unique assets", async function () {
        const uniqueAssets = [
          await assetA.getAddress(),
          await assetB.getAddress(),
          await assetC.getAddress()
        ];

        for (let i = 0; i < uniqueAssets.length; i++) {
          await positionManager.connect(controller).recordPosition(
            ertId,
            await adapterA.getAddress(),
            uniqueAssets[i],
            size,
            entryValueUsd * BigInt(i + 1),
            ActionType.SUPPLY
          );
        }

        const [assets, exposures] = await positionManager.getExposureByAsset(ertId);

        expect(assets.length).to.equal(3);
        expect(exposures.length).to.equal(3);
      });
    });

    describe("Edge Cases", function () {
      it("should return empty arrays for ERT with no positions", async function () {
        const [assets, exposures] = await positionManager.getExposureByAsset(999n);

        expect(assets.length).to.equal(0);
        expect(exposures.length).to.equal(0);
      });

      it("should handle positions with zero entry value", async function () {
        await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          size,
          0n,
          ActionType.SUPPLY
        );

        const [assets, exposures] = await positionManager.getExposureByAsset(ertId);

        expect(assets.length).to.equal(1);
        expect(exposures[0]).to.equal(0n);
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
        await positionManager.setExecutionController(newController);
        expect(await positionManager.executionController()).to.equal(newController);
      });

      it("should reject zero address", async function () {
        await expect(
          positionManager.setExecutionController(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(positionManager, "ZeroAddress");
      });

      it("should reject non-owner", async function () {
        await expect(
          positionManager.connect(nonOwner).setExecutionController(await nonOwner.getAddress())
        ).to.be.revertedWithCustomError(positionManager, "OwnableUnauthorizedAccount");
      });

      it("should allow updating controller multiple times", async function () {
        const addr1 = await assetA.getAddress();
        const addr2 = await assetB.getAddress();

        await positionManager.setExecutionController(addr1);
        expect(await positionManager.executionController()).to.equal(addr1);

        await positionManager.setExecutionController(addr2);
        expect(await positionManager.executionController()).to.equal(addr2);
      });
    });

    describe("setFlareOracle()", function () {
      it("should allow owner to set oracle", async function () {
        const newOracle = await nonOwner.getAddress();
        await positionManager.setFlareOracle(newOracle);
        expect(await positionManager.flareOracle()).to.equal(newOracle);
      });

      it("should reject zero address", async function () {
        await expect(
          positionManager.setFlareOracle(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(positionManager, "ZeroAddress");
      });

      it("should reject non-owner", async function () {
        await expect(
          positionManager.connect(nonOwner).setFlareOracle(await nonOwner.getAddress())
        ).to.be.revertedWithCustomError(positionManager, "OwnableUnauthorizedAccount");
      });
    });
  });

  // =============================================================
  //                  ACCESS CONTROL SUMMARY
  // =============================================================

  describe("Access Control Summary", function () {
    it("should reject all controller-only functions from non-controller", async function () {
      const ertId = 1n;
      const adapter = await adapterA.getAddress();
      const asset = await assetA.getAddress();
      const size = 1000n;
      const value = 50000n;
      const positionId = ethers.keccak256(ethers.toUtf8Bytes("test"));

      await expect(
        positionManager.connect(nonOwner).recordPosition(ertId, adapter, asset, size, value, 0)
      ).to.be.revertedWithCustomError(positionManager, "OnlyController");

      await expect(
        positionManager.connect(nonOwner).recordPositionWithId(ertId, positionId, adapter, asset, size, value, 0)
      ).to.be.revertedWithCustomError(positionManager, "OnlyController");

      await expect(
        positionManager.connect(nonOwner).updatePosition(positionId, size, value)
      ).to.be.revertedWithCustomError(positionManager, "OnlyController");

      await expect(
        positionManager.connect(nonOwner).closePosition(positionId, 0)
      ).to.be.revertedWithCustomError(positionManager, "OnlyController");

      await expect(
        positionManager.connect(nonOwner).closeAllPositions(ertId)
      ).to.be.revertedWithCustomError(positionManager, "OnlyController");
    });

    it("should reject all owner-only functions from non-owner", async function () {
      await expect(
        positionManager.connect(nonOwner).setExecutionController(await nonOwner.getAddress())
      ).to.be.revertedWithCustomError(positionManager, "OwnableUnauthorizedAccount");

      await expect(
        positionManager.connect(nonOwner).setFlareOracle(await nonOwner.getAddress())
      ).to.be.revertedWithCustomError(positionManager, "OwnableUnauthorizedAccount");
    });
  });

  // =============================================================
  //                 INVARIANT-STYLE CHECKS
  // =============================================================

  describe("Invariant Checks", function () {
    it("should maintain: positionCount == length of positions array", async function () {
      const ertId = 1n;
      const size = 1000n;
      const value = 50000n;

      // Add multiple positions
      for (let i = 0; i < 5; i++) {
        await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          size,
          value,
          ActionType.SUPPLY
        );

        const count = await positionManager.getPositionCount(ertId);
        const positions = await positionManager.getPositions(ertId);

        expect(count).to.equal(BigInt(positions.length));
      }
    });

    it("should maintain: positionExists == true for all positions in array", async function () {
      const ertId = 1n;
      const positionIds: string[] = [];

      // Add positions
      for (let i = 0; i < 3; i++) {
        const tx = await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          1000n,
          50000n,
          ActionType.SUPPLY
        );
        const posId = await getPositionIdFromTx(tx);
        positionIds.push(posId);
      }

      // Verify all exist
      for (const posId of positionIds) {
        expect(await positionManager.positionExists(posId)).to.be.true;
      }
    });

    it("should maintain: totalEntryValue == sum of all position entry values", async function () {
      const ertId = 1n;
      const entryValues = [10000n, 20000n, 30000n, 40000n, 50000n];
      let expectedTotal = 0n;

      for (const value of entryValues) {
        await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          1000n,
          value,
          ActionType.SUPPLY
        );
        expectedTotal += value;

        const actualTotal = await positionManager.getTotalEntryValue(ertId);
        expect(actualTotal).to.equal(expectedTotal);
      }
    });

    it("should maintain: positionIndex mapping consistency after operations", async function () {
      const ertId = 1n;
      const positionIds: string[] = [];

      // Create 5 positions
      for (let i = 0; i < 5; i++) {
        const tx = await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          1000n,
          50000n,
          ActionType.SUPPLY
        );
        const posId = await getPositionIdFromTx(tx);
        positionIds.push(posId);
      }

      // Close positions 0 and 2
      await positionManager.connect(controller).closePosition(positionIds[0], 0);
      await positionManager.connect(controller).closePosition(positionIds[2], 0);

      // Verify remaining positions have correct indices
      const positions = await positionManager.getPositions(ertId);

      for (let i = 0; i < positions.length; i++) {
        const storedIndex = await positionManager.positionIndex(positions[i].positionId);
        expect(storedIndex).to.equal(BigInt(i));
      }
    });

    it("should maintain: hasOpenPositions == (positionCount > 0)", async function () {
      const ertId = 1n;

      expect(await positionManager.hasOpenPositions(ertId)).to.be.false;
      expect(await positionManager.getPositionCount(ertId)).to.equal(0n);

      const tx = await positionManager.connect(controller).recordPosition(
        ertId,
        await adapterA.getAddress(),
        await assetA.getAddress(),
        1000n,
        50000n,
        ActionType.SUPPLY
      );
      const posId = await getPositionIdFromTx(tx);

      expect(await positionManager.hasOpenPositions(ertId)).to.be.true;
      expect(await positionManager.getPositionCount(ertId)).to.be.gt(0n);

      await positionManager.connect(controller).closePosition(posId, 0);

      expect(await positionManager.hasOpenPositions(ertId)).to.be.false;
      expect(await positionManager.getPositionCount(ertId)).to.equal(0n);
    });
  });

  // =============================================================
  //              COMPLEX SCENARIO TESTS
  // =============================================================

  describe("Complex Scenarios", function () {
    it("should handle multiple ERTs with interleaved operations", async function () {
      const ert1 = 1n;
      const ert2 = 2n;
      const ert3 = 3n;
      const positionIdsErt1: string[] = [];
      const positionIdsErt2: string[] = [];

      // Create positions for ERT1
      for (let i = 0; i < 3; i++) {
        const tx = await positionManager.connect(controller).recordPosition(
          ert1,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          1000n * BigInt(i + 1),
          50000n * BigInt(i + 1),
          ActionType.SUPPLY
        );
        const posId = await getPositionIdFromTx(tx);
        positionIdsErt1.push(posId);
      }

      // Create positions for ERT2
      for (let i = 0; i < 2; i++) {
        const tx = await positionManager.connect(controller).recordPosition(
          ert2,
          await adapterB.getAddress(),
          await assetB.getAddress(),
          2000n * BigInt(i + 1),
          100000n * BigInt(i + 1),
          ActionType.STAKE
        );
        const posId = await getPositionIdFromTx(tx);
        positionIdsErt2.push(posId);
      }

      // Close middle position from ERT1
      await positionManager.connect(controller).closePosition(positionIdsErt1[1], 5000n);

      // Verify ERT1 state
      expect(await positionManager.getPositionCount(ert1)).to.equal(2n);
      expect(await positionManager.getTotalEntryValue(ert1)).to.equal(50000n + 150000n);

      // Verify ERT2 unaffected
      expect(await positionManager.getPositionCount(ert2)).to.equal(2n);
      expect(await positionManager.getTotalEntryValue(ert2)).to.equal(100000n + 200000n);

      // Verify ERT3 empty
      expect(await positionManager.getPositionCount(ert3)).to.equal(0n);
      expect(await positionManager.hasOpenPositions(ert3)).to.be.false;
    });

    it("should handle rapid position creation and closure", async function () {
      const ertId = 1n;
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const tx = await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          1000n,
          50000n,
          ActionType.SUPPLY
        );
        const posId = await getPositionIdFromTx(tx);

        await positionManager.connect(controller).closePosition(posId, BigInt(i * 100));

        // Verify state after each cycle
        expect(await positionManager.getPositionCount(ertId)).to.equal(0n);
        expect(await positionManager.positionExists(posId)).to.be.false;
      }
    });

    it("should correctly calculate PnL with mixed profitable and losing positions", async function () {
      const ertId = 1n;

      // All values use PRICE_PRECISION (10^18) for consistency
      // Position 1: 100 tokens at $500 entry = $50,000
      // entryValueUsd = size * entryPrice / PRICE_PRECISION = 100 * 500 = 50000 (in PRICE_PRECISION units)
      await positionManager.connect(controller).recordPosition(
        ertId,
        await adapterA.getAddress(),
        await assetA.getAddress(),
        100n * PRICE_PRECISION,      // size: 100 tokens
        50000n * PRICE_PRECISION,    // entryValueUsd: 100 * $500 = $50,000
        ActionType.SUPPLY
      );

      // Position 2: 200 tokens at $250 entry = $50,000
      await positionManager.connect(controller).recordPosition(
        ertId,
        await adapterB.getAddress(),
        await assetB.getAddress(),
        200n * PRICE_PRECISION,      // size: 200 tokens
        50000n * PRICE_PRECISION,    // entryValueUsd: 200 * $250 = $50,000
        ActionType.STAKE
      );

      // Position 3: 50 tokens at $1000 entry = $50,000
      await positionManager.connect(controller).recordPosition(
        ertId,
        await adapterA.getAddress(),
        await assetC.getAddress(),
        50n * PRICE_PRECISION,       // size: 50 tokens
        50000n * PRICE_PRECISION,    // entryValueUsd: 50 * $1000 = $50,000
        ActionType.OPEN_POSITION
      );

      const assets = [
        await assetA.getAddress(),
        await assetB.getAddress(),
        await assetC.getAddress()
      ];

      // Price changes:
      // Asset A: $500 -> $600 (+20%)
      // Asset B: $250 -> $200 (-20%)
      // Asset C: $1000 -> $1000 (0%)
      const prices = [
        600n * PRICE_PRECISION,
        200n * PRICE_PRECISION,
        1000n * PRICE_PRECISION
      ];

      const pnl = await positionManager.calculateUnrealizedPnlWithPrices(
        ertId,
        assets,
        prices
      );

      // PnL calculation: currentValue = (size * price) / PRICE_PRECISION
      // Position 1: (100 * 10^18 * 600 * 10^18) / 10^18 - 50000 * 10^18 = 60000 * 10^18 - 50000 * 10^18 = +10000 * 10^18
      // Position 2: (200 * 10^18 * 200 * 10^18) / 10^18 - 50000 * 10^18 = 40000 * 10^18 - 50000 * 10^18 = -10000 * 10^18
      // Position 3: (50 * 10^18 * 1000 * 10^18) / 10^18 - 50000 * 10^18 = 50000 * 10^18 - 50000 * 10^18 = 0
      // Total: +10000 - 10000 + 0 = 0 (in PRICE_PRECISION units)
      expect(pnl).to.equal(0n);
    });

    it("should maintain integrity after controller change", async function () {
      const ertId = 1n;

      // Create position with original controller
      const tx = await positionManager.connect(controller).recordPosition(
        ertId,
        await adapterA.getAddress(),
        await assetA.getAddress(),
        1000n,
        50000n,
        ActionType.SUPPLY
      );
      const posId = await getPositionIdFromTx(tx);

      // Change controller
      const newController = nonOwner;
      await positionManager.setExecutionController(await newController.getAddress());

      // Old controller should fail
      await expect(
        positionManager.connect(controller).closePosition(posId, 0)
      ).to.be.revertedWithCustomError(positionManager, "OnlyController");

      // New controller should work
      await positionManager.connect(newController).updatePosition(posId, 2000n, 100000n);

      const position = await positionManager.getPosition(posId);
      expect(position.size).to.equal(2000n);
      expect(position.entryValueUsd).to.equal(100000n);

      // New controller can close
      await positionManager.connect(newController).closePosition(posId, 5000n);
      expect(await positionManager.positionExists(posId)).to.be.false;
    });
  });

  // =============================================================
  //                  GAS AND SCALABILITY TESTS
  // =============================================================

  describe("Scalability", function () {
    it("should handle ERT with many positions", async function () {
      const ertId = 1n;
      const positionCount = 50;

      for (let i = 0; i < positionCount; i++) {
        await positionManager.connect(controller).recordPosition(
          ertId,
          await adapterA.getAddress(),
          await assetA.getAddress(),
          1000n * BigInt(i + 1),
          50000n * BigInt(i + 1),
          ActionType.SUPPLY
        );
      }

      expect(await positionManager.getPositionCount(ertId)).to.equal(BigInt(positionCount));

      // Verify total entry value
      let expectedTotal = 0n;
      for (let i = 0; i < positionCount; i++) {
        expectedTotal += 50000n * BigInt(i + 1);
      }
      expect(await positionManager.getTotalEntryValue(ertId)).to.equal(expectedTotal);

      // Close all positions
      await positionManager.connect(controller).closeAllPositions(ertId);
      expect(await positionManager.getPositionCount(ertId)).to.equal(0n);
    });

    it("should handle many ERTs with positions", async function () {
      const ertCount = 20;

      for (let ertId = 1; ertId <= ertCount; ertId++) {
        await positionManager.connect(controller).recordPosition(
          BigInt(ertId),
          await adapterA.getAddress(),
          await assetA.getAddress(),
          1000n,
          50000n * BigInt(ertId),
          ActionType.SUPPLY
        );
      }

      // Verify each ERT
      for (let ertId = 1; ertId <= ertCount; ertId++) {
        expect(await positionManager.getPositionCount(BigInt(ertId))).to.equal(1n);
        expect(await positionManager.getTotalEntryValue(BigInt(ertId))).to.equal(50000n * BigInt(ertId));
      }
    });
  });
});

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {PraxisErrors} from "../lib/PraxisErrors.sol";
import {PraxisEvents} from "../lib/PraxisEvents.sol";

/**
 * @title ExposureManager
 * @notice Tracks and limits exposure to individual assets
 * @dev Prevents concentration risk by limiting any single asset to 30% of vault
 */
contract ExposureManager is Ownable {
    // =============================================================
    //                          CONSTANTS
    // =============================================================

    /// @notice Basis points denominator
    uint256 public constant BPS = 10000;

    /// @notice Default maximum exposure per asset (30%)
    uint256 public constant DEFAULT_MAX_SINGLE_ASSET_BPS = 3000;

    // =============================================================
    //                          STORAGE
    // =============================================================

    /// @notice Maximum exposure per asset in basis points
    uint256 public maxSingleAssetBps;

    /// @notice Asset exposure tracking (asset => total USD exposure)
    mapping(address => uint256) public assetExposure;

    /// @notice Reference to the execution vault
    address public vault;

    /// @notice Reference to the execution controller
    address public executionController;

    /// @notice Custom limits per asset (0 = use default)
    mapping(address => uint256) public customAssetLimits;

    // =============================================================
    //                          EVENTS
    // =============================================================

    event MaxExposureUpdated(uint256 oldMax, uint256 newMax);
    event CustomLimitSet(address indexed asset, uint256 limitBps);
    event CustomLimitRemoved(address indexed asset);

    // =============================================================
    //                          MODIFIERS
    // =============================================================

    modifier onlyController() {
        if (msg.sender != executionController) {
            revert PraxisErrors.OnlyController();
        }
        _;
    }

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    /**
     * @notice Initialize the ExposureManager
     * @param _vault Address of the execution vault
     */
    constructor(address _vault) Ownable(msg.sender) {
        if (_vault == address(0)) revert PraxisErrors.ZeroAddress();
        vault = _vault;
        maxSingleAssetBps = DEFAULT_MAX_SINGLE_ASSET_BPS;
    }

    // =============================================================
    //                      CORE FUNCTIONS
    // =============================================================

    /**
     * @notice Record new exposure to an asset
     * @param asset The asset address
     * @param usdAmount The USD amount of exposure being added
     * @param totalVaultAssets Current total vault assets
     */
    function recordExposure(
        address asset,
        uint256 usdAmount,
        uint256 totalVaultAssets
    ) external onlyController {
        // Validate this won't exceed limits
        uint256 maxExposure = getMaxExposureForAsset(asset, totalVaultAssets);
        uint256 newExposure = assetExposure[asset] + usdAmount;

        if (newExposure > maxExposure) {
            revert PraxisErrors.AssetExposureLimitExceeded(asset, newExposure, maxExposure);
        }

        assetExposure[asset] = newExposure;
        emit PraxisEvents.ExposureAdded(asset, usdAmount, newExposure);
    }

    /**
     * @notice Remove exposure from an asset
     * @param asset The asset address
     * @param usdAmount The USD amount of exposure being removed
     */
    function removeExposure(address asset, uint256 usdAmount) external onlyController {
        if (assetExposure[asset] >= usdAmount) {
            assetExposure[asset] -= usdAmount;
        } else {
            assetExposure[asset] = 0;
        }

        emit PraxisEvents.ExposureRemoved(asset, usdAmount, assetExposure[asset]);
    }

    // =============================================================
    //                      VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Check if new exposure can be added
     * @param asset The asset address
     * @param usdAmount The USD amount to add
     * @param totalVaultAssets Current total vault assets
     * @return Whether the exposure can be added
     */
    function canAddExposure(
        address asset,
        uint256 usdAmount,
        uint256 totalVaultAssets
    ) external view returns (bool) {
        uint256 maxExposure = getMaxExposureForAsset(asset, totalVaultAssets);
        uint256 newExposure = assetExposure[asset] + usdAmount;
        return newExposure <= maxExposure;
    }

    /**
     * @notice Get current exposure for an asset
     * @param asset The asset address
     * @return exposure Current exposure amount
     * @return maxAllowed Maximum allowed exposure
     */
    function getExposure(
        address asset,
        uint256 totalVaultAssets
    ) external view returns (uint256 exposure, uint256 maxAllowed) {
        exposure = assetExposure[asset];
        maxAllowed = getMaxExposureForAsset(asset, totalVaultAssets);
    }

    /**
     * @notice Get exposure utilization for an asset
     * @param asset The asset address
     * @param totalVaultAssets Current total vault assets
     * @return utilizationBps Utilization in basis points
     */
    function getExposureUtilization(
        address asset,
        uint256 totalVaultAssets
    ) external view returns (uint256 utilizationBps) {
        uint256 maxExposure = getMaxExposureForAsset(asset, totalVaultAssets);
        if (maxExposure == 0) return 0;
        return (assetExposure[asset] * BPS) / maxExposure;
    }

    /**
     * @notice Get available exposure capacity for an asset
     * @param asset The asset address
     * @param totalVaultAssets Current total vault assets
     * @return The remaining capacity in USD
     */
    function getAvailableExposure(
        address asset,
        uint256 totalVaultAssets
    ) external view returns (uint256) {
        uint256 maxExposure = getMaxExposureForAsset(asset, totalVaultAssets);
        uint256 currentExposure = assetExposure[asset];

        if (currentExposure >= maxExposure) return 0;
        return maxExposure - currentExposure;
    }

    /**
     * @notice Get maximum exposure for a specific asset
     * @param asset The asset address
     * @param totalVaultAssets Current total vault assets
     * @return The maximum allowed exposure
     */
    function getMaxExposureForAsset(
        address asset,
        uint256 totalVaultAssets
    ) public view returns (uint256) {
        uint256 limitBps = customAssetLimits[asset];
        if (limitBps == 0) {
            limitBps = maxSingleAssetBps;
        }
        return (totalVaultAssets * limitBps) / BPS;
    }

    /**
     * @notice Get all tracked assets and their exposures
     * @dev This is a helper function - returns up to maxAssets
     * @param assets Array of asset addresses to query
     * @param totalVaultAssets Current total vault assets
     * @return exposures Array of current exposures
     * @return maxAllowed Array of maximum allowed exposures
     */
    function getBatchExposures(
        address[] calldata assets,
        uint256 totalVaultAssets
    ) external view returns (uint256[] memory exposures, uint256[] memory maxAllowed) {
        exposures = new uint256[](assets.length);
        maxAllowed = new uint256[](assets.length);

        for (uint256 i = 0; i < assets.length; i++) {
            exposures[i] = assetExposure[assets[i]];
            maxAllowed[i] = getMaxExposureForAsset(assets[i], totalVaultAssets);
        }
    }

    // =============================================================
    //                      ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Set the execution controller address
     * @param _executionController The execution controller address
     */
    function setExecutionController(address _executionController) external onlyOwner {
        if (_executionController == address(0)) revert PraxisErrors.ZeroAddress();
        executionController = _executionController;
    }

    /**
     * @notice Update the vault address
     * @param _vault New vault address
     */
    function setVault(address _vault) external onlyOwner {
        if (_vault == address(0)) revert PraxisErrors.ZeroAddress();
        vault = _vault;
    }

    /**
     * @notice Update the default maximum exposure per asset
     * @param _maxSingleAssetBps New maximum in basis points
     */
    function setMaxSingleAsset(uint256 _maxSingleAssetBps) external onlyOwner {
        if (_maxSingleAssetBps > BPS) {
            revert PraxisErrors.ArrayLengthMismatch(BPS, _maxSingleAssetBps);
        }

        uint256 oldMax = maxSingleAssetBps;
        maxSingleAssetBps = _maxSingleAssetBps;

        emit MaxExposureUpdated(oldMax, _maxSingleAssetBps);
    }

    /**
     * @notice Set custom exposure limit for specific asset
     * @param asset The asset address
     * @param limitBps The custom limit in basis points (0 = use default)
     */
    function setCustomAssetLimit(address asset, uint256 limitBps) external onlyOwner {
        if (asset == address(0)) revert PraxisErrors.ZeroAddress();
        if (limitBps > BPS) {
            revert PraxisErrors.ArrayLengthMismatch(BPS, limitBps);
        }

        customAssetLimits[asset] = limitBps;
        emit CustomLimitSet(asset, limitBps);
    }

    /**
     * @notice Remove custom exposure limit for asset (use default)
     * @param asset The asset address
     */
    function removeCustomAssetLimit(address asset) external onlyOwner {
        delete customAssetLimits[asset];
        emit CustomLimitRemoved(asset);
    }

    /**
     * @notice Force set exposure for an asset (emergency use)
     * @param asset The asset address
     * @param usdAmount The USD amount to set
     */
    function forceSetExposure(address asset, uint256 usdAmount) external onlyOwner {
        assetExposure[asset] = usdAmount;
    }

    /**
     * @notice Reset all exposures (emergency use)
     * @param assets Array of asset addresses to reset
     */
    function resetExposures(address[] calldata assets) external onlyOwner {
        for (uint256 i = 0; i < assets.length; i++) {
            assetExposure[assets[i]] = 0;
        }
    }
}

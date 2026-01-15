// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @title IFAsset
 * @notice Interface for Flare FAsset tokens (FXRP, FBTC, FDOGE)
 * @dev FAssets are ERC-20 tokens representing bridged assets on Flare
 *
 * FAssets are 1:1 overcollateralized representations of underlying assets
 * (XRP, BTC, DOGE) that can participate in Flare DeFi protocols.
 *
 * This interface extends standard ERC-20 with FAsset-specific functions.
 */
interface IFAsset is IERC20, IERC20Metadata {
    /**
     * @notice Get the asset manager contract address
     * @return assetManager Address of the AssetManager contract
     */
    function assetManager() external view returns (address assetManager);

    /**
     * @notice Check if the FAsset is currently terminated
     * @return terminated True if the FAsset has been terminated
     */
    function terminated() external view returns (bool terminated);

    /**
     * @notice Get the termination timestamp (if terminated)
     * @return terminatedAt Timestamp when FAsset was terminated (0 if not)
     */
    function terminatedAt() external view returns (uint256 terminatedAt);
}

/**
 * @title IAssetManager
 * @notice Minimal interface for Flare AssetManager contract
 * @dev Full interface available at @flarelabs/fasset/contracts/userInterfaces/IAssetManager.sol
 *
 * The AssetManager controls minting, redemption, and collateral management
 * for FAssets. PRAXIS does not directly mint/redeem - it uses existing FAsset
 * liquidity on DEXes. This interface is for informational queries only.
 */
interface IAssetManager {
    /**
     * @notice Get the FAsset token managed by this AssetManager
     * @return fAsset Address of the FAsset token
     */
    function fAsset() external view returns (address fAsset);

    /**
     * @notice Get the lot size for minting/redemption (in UBA - underlying base amount)
     * @return lotSizeUBA Lot size in underlying base amount
     */
    function lotSize() external view returns (uint256 lotSizeUBA);

    /**
     * @notice Get the asset minting decimals
     * @return decimals Number of decimals for the underlying asset
     */
    function assetMintingDecimals() external view returns (uint8 decimals);

    /**
     * @notice Get the granularity for minting (smallest mintable unit in UBA)
     * @return granularityUBA Granularity in underlying base amount
     */
    function assetMintingGranularityUBA() external view returns (uint256 granularityUBA);

    /**
     * @notice Check if minting is currently paused
     * @return paused True if minting is paused
     */
    function mintingPaused() external view returns (bool paused);

    /**
     * @notice Check if the entire system is emergency paused
     * @return paused True if system is emergency paused
     */
    function emergencyPaused() external view returns (bool paused);

    /**
     * @notice Get list of available agents for minting
     * @param start Starting index
     * @param end Ending index
     * @return agents Array of agent vault addresses
     * @return total Total number of available agents
     */
    function getAvailableAgentsList(
        uint256 start,
        uint256 end
    ) external view returns (address[] memory agents, uint256 total);

    /**
     * @notice Get information about a specific agent
     * @param agentVault Address of the agent vault
     * @return status Agent status struct
     */
    function getAgentInfo(address agentVault) external view returns (AgentInfo memory status);

    /**
     * @notice Agent information structure
     */
    struct AgentInfo {
        // Agent's vault collateral token
        address vaultCollateralToken;
        // Fee percentage in BIPS (1% = 100)
        uint256 feeBIPS;
        // Pool fee share in BIPS
        uint256 poolFeeShareBIPS;
        // Minimum collateral ratio in BIPS
        uint256 mintingVaultCollateralRatioBIPS;
        // Minimum pool collateral ratio in BIPS
        uint256 mintingPoolCollateralRatioBIPS;
        // Free collateral lots available for minting
        uint256 freeCollateralLots;
        // Whether agent is publicly available
        bool publiclyAvailable;
    }
}

/**
 * @title IFlareContractRegistry
 * @notice Interface for Flare's contract registry
 * @dev Used to dynamically discover FAsset-related contracts
 */
interface IFlareContractRegistry {
    /**
     * @notice Get contract address by name
     * @param name Contract name
     * @return contractAddress Address of the contract
     */
    function getContractAddressByName(
        string calldata name
    ) external view returns (address contractAddress);

    /**
     * @notice Get contract address by name hash
     * @param nameHash Keccak256 hash of the contract name
     * @return contractAddress Address of the contract
     */
    function getContractAddressByHash(
        bytes32 nameHash
    ) external view returns (address contractAddress);

    /**
     * @notice Get all registered contract names
     * @return names Array of contract names
     */
    function getContractNames() external view returns (string[] memory names);
}

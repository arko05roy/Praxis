// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockFAsset
 * @notice Mock FAsset token for Coston2 testnet demo
 * @dev Simulates FAssets like FXRP, FBTC, FDOGE
 *      - Uses real FTSO prices via feedId
 *      - Admin-controlled minting for demo purposes
 *      - Correct decimals for each asset type
 */
contract MockFAsset is ERC20, Ownable {
    // =============================================================
    //                          STORAGE
    // =============================================================

    /// @notice The FTSO feed ID for this asset's price
    bytes21 public immutable feedId;

    /// @notice Decimals for this token
    uint8 private immutable _decimals;

    /// @notice The underlying asset symbol (e.g., "XRP", "BTC", "DOGE")
    string public underlyingSymbol;

    // =============================================================
    //                          EVENTS
    // =============================================================

    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    /**
     * @notice Initialize MockFAsset
     * @param name_ Token name (e.g., "Mock FAsset XRP")
     * @param symbol_ Token symbol (e.g., "mFXRP")
     * @param decimals_ Token decimals (e.g., 6 for XRP, 8 for BTC)
     * @param feedId_ FTSO feed ID for price lookups (e.g., XRP/USD feed ID)
     * @param underlyingSymbol_ The underlying asset symbol (e.g., "XRP")
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        bytes21 feedId_,
        string memory underlyingSymbol_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        require(feedId_ != bytes21(0), "MockFAsset: INVALID_FEED_ID");
        require(bytes(underlyingSymbol_).length > 0, "MockFAsset: EMPTY_SYMBOL");

        _decimals = decimals_;
        feedId = feedId_;
        underlyingSymbol = underlyingSymbol_;
    }

    // =============================================================
    //                      ERC20 OVERRIDES
    // =============================================================

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    // =============================================================
    //                      MINT/BURN FUNCTIONS
    // =============================================================

    /**
     * @notice Mint tokens to an address (admin only)
     * @param to Recipient address
     * @param amount Amount to mint (in token decimals)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "MockFAsset: ZERO_ADDRESS");
        require(amount > 0, "MockFAsset: ZERO_AMOUNT");

        _mint(to, amount);

        emit Minted(to, amount);
    }

    /**
     * @notice Mint tokens to multiple addresses (admin only)
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to mint
     */
    function mintBatch(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(recipients.length == amounts.length, "MockFAsset: LENGTH_MISMATCH");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "MockFAsset: ZERO_ADDRESS");
            require(amounts[i] > 0, "MockFAsset: ZERO_AMOUNT");

            _mint(recipients[i], amounts[i]);

            emit Minted(recipients[i], amounts[i]);
        }
    }

    /**
     * @notice Burn tokens from an address (admin only)
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burn(address from, uint256 amount) external onlyOwner {
        require(amount > 0, "MockFAsset: ZERO_AMOUNT");

        _burn(from, amount);

        emit Burned(from, amount);
    }

    /**
     * @notice Burn tokens from caller
     * @param amount Amount to burn
     */
    function burnSelf(uint256 amount) external {
        require(amount > 0, "MockFAsset: ZERO_AMOUNT");

        _burn(msg.sender, amount);

        emit Burned(msg.sender, amount);
    }

    // =============================================================
    //                      VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Get the FTSO feed ID for this FAsset
     * @return The bytes21 feed ID
     */
    function getFeedId() external view returns (bytes21) {
        return feedId;
    }

    /**
     * @notice Get the underlying asset symbol
     * @return The underlying symbol (e.g., "XRP", "BTC")
     */
    function getUnderlyingSymbol() external view returns (string memory) {
        return underlyingSymbol;
    }
}

/**
 * @title MockFAssetFactory
 * @notice Factory contract to deploy mock FAsset tokens
 * @dev Simplifies deployment of multiple FAssets
 */
contract MockFAssetFactory is Ownable {
    // =============================================================
    //                          STORAGE
    // =============================================================

    /// @notice Mapping from symbol to deployed FAsset address
    mapping(string => address) public fAssets;

    /// @notice Array of all deployed FAsset symbols
    string[] public allSymbols;

    // =============================================================
    //                          EVENTS
    // =============================================================

    event FAssetCreated(string indexed symbol, address indexed token, bytes21 feedId);

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    constructor() Ownable(msg.sender) {}

    // =============================================================
    //                      FACTORY FUNCTIONS
    // =============================================================

    /**
     * @notice Create a new MockFAsset
     * @param name Token name
     * @param symbol Token symbol
     * @param decimals_ Token decimals
     * @param feedId FTSO feed ID
     * @param underlyingSymbol Underlying asset symbol
     * @return token Address of the created token
     */
    function createFAsset(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        bytes21 feedId,
        string memory underlyingSymbol
    ) external onlyOwner returns (address token) {
        require(fAssets[symbol] == address(0), "MockFAssetFactory: ALREADY_EXISTS");

        token = address(new MockFAsset(
            name,
            symbol,
            decimals_,
            feedId,
            underlyingSymbol
        ));

        // Transfer ownership to factory owner
        MockFAsset(token).transferOwnership(msg.sender);

        fAssets[symbol] = token;
        allSymbols.push(symbol);

        emit FAssetCreated(symbol, token, feedId);
    }

    /**
     * @notice Get FAsset address by symbol
     */
    function getFAsset(string memory symbol) external view returns (address) {
        return fAssets[symbol];
    }

    /**
     * @notice Get all deployed FAsset symbols
     */
    function getAllSymbols() external view returns (string[] memory) {
        return allSymbols;
    }

    /**
     * @notice Get total number of deployed FAssets
     */
    function totalFAssets() external view returns (uint256) {
        return allSymbols.length;
    }
}

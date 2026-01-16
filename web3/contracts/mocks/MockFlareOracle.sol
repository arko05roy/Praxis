// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MockFlareOracle
 * @notice Mock oracle for testing PositionManager
 * @dev Implements the IFlareOracle interface expected by PositionManager
 */
contract MockFlareOracle {
    // =============================================================
    //                          STORAGE
    // =============================================================

    /// @notice Mock prices for tokens (18 decimals)
    mapping(address => uint256) public tokenPrices;

    /// @notice Mapping to track which tokens have feeds configured
    mapping(address => bool) public feedConfigured;

    /// @notice Mock timestamp for prices
    uint64 public mockTimestamp;

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    constructor() {
        mockTimestamp = uint64(block.timestamp);
    }

    // =============================================================
    //                      CORE FUNCTIONS
    // =============================================================

    /**
     * @notice Get USD price for a token address
     * @param token The token address
     * @return priceInWei The price in USD with 18 decimals
     * @return timestamp The price timestamp
     */
    function getTokenPriceUSD(
        address token
    ) external payable returns (uint256 priceInWei, uint64 timestamp) {
        priceInWei = tokenPrices[token];
        timestamp = mockTimestamp;
    }

    /**
     * @notice Check if a token has a feed configured
     * @param token The token address
     * @return Whether a feed is configured
     */
    function hasFeed(address token) external view returns (bool) {
        return feedConfigured[token];
    }

    // =============================================================
    //                      MOCK SETTERS
    // =============================================================

    /**
     * @notice Set mock price for a token
     * @param token The token address
     * @param price The price in 18 decimals
     */
    function setTokenPrice(address token, uint256 price) external {
        tokenPrices[token] = price;
        feedConfigured[token] = true;
    }

    /**
     * @notice Set mock prices for multiple tokens
     * @param tokens Array of token addresses
     * @param prices Array of prices (18 decimals)
     */
    function setTokenPrices(address[] calldata tokens, uint256[] calldata prices) external {
        require(tokens.length == prices.length, "Length mismatch");
        for (uint256 i = 0; i < tokens.length; i++) {
            tokenPrices[tokens[i]] = prices[i];
            feedConfigured[tokens[i]] = true;
        }
    }

    /**
     * @notice Set whether a token has a feed configured
     * @param token The token address
     * @param configured Whether the feed is configured
     */
    function setFeedConfigured(address token, bool configured) external {
        feedConfigured[token] = configured;
    }

    /**
     * @notice Set the mock timestamp
     * @param timestamp The timestamp to use
     */
    function setTimestamp(uint64 timestamp) external {
        mockTimestamp = timestamp;
    }

    /**
     * @notice Remove a token feed
     * @param token The token address
     */
    function removeTokenFeed(address token) external {
        delete tokenPrices[token];
        feedConfigured[token] = false;
    }

    // =============================================================
    //                      RECEIVE FUNCTION
    // =============================================================

    /// @notice Allow receiving native token for fee payments
    receive() external payable {}
}

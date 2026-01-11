// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";
import {FtsoV2Interface} from "@flarenetwork/flare-periphery-contracts/coston2/FtsoV2Interface.sol";
import {PraxisErrors} from "../lib/PraxisErrors.sol";
import {PraxisEvents} from "../lib/PraxisEvents.sol";

/**
 * @title FlareOracle
 * @notice Oracle contract that wraps Flare's FTSO v2 for price data
 * @dev Uses ContractRegistry for dynamic discovery of FTSO v2 address
 */
contract FlareOracle {
    // =============================================================
    //                          CONSTANTS
    // =============================================================

    /// @notice Maximum age for price data (5 minutes)
    uint256 public constant DEFAULT_MAX_PRICE_AGE = 300;

    /// @notice Precision for normalized prices (18 decimals)
    uint256 public constant PRICE_PRECISION = 1e18;

    // =============================================================
    //                          STORAGE
    // =============================================================

    /// @notice Contract owner
    address public owner;

    /// @notice Maximum allowed price age in seconds
    uint256 public maxPriceAge;

    /// @notice Mapping from token address to FTSO feed ID
    mapping(address => bytes21) public tokenFeeds;

    /// @notice Mapping to track which tokens have feeds configured
    mapping(address => bool) public hasFeed;

    // =============================================================
    //                          MODIFIERS
    // =============================================================

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert PraxisErrors.OnlyOwner();
        }
        _;
    }

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    /**
     * @notice Initialize the FlareOracle contract
     * @param _maxPriceAge Maximum allowed age for price data (0 = use default)
     */
    constructor(uint256 _maxPriceAge) {
        owner = msg.sender;
        maxPriceAge = _maxPriceAge > 0 ? _maxPriceAge : DEFAULT_MAX_PRICE_AGE;
    }

    // =============================================================
    //                      CORE FUNCTIONS
    // =============================================================

    /**
     * @notice Get the FTSO v2 contract from the registry
     * @return FtsoV2Interface The FTSO v2 contract
     */
    function getFtsoV2() public view returns (FtsoV2Interface) {
        return ContractRegistry.getFtsoV2();
    }

    /**
     * @notice Get raw price data from FTSO v2 for a feed ID
     * @param feedId The FTSO feed ID (bytes21)
     * @return value The price value
     * @return decimals The decimal places for the price
     * @return timestamp The timestamp of the price update
     */
    function getPrice(
        bytes21 feedId
    ) external payable returns (uint256 value, int8 decimals, uint64 timestamp) {
        if (feedId == bytes21(0)) {
            revert PraxisErrors.InvalidFeedId(feedId);
        }

        FtsoV2Interface ftso = getFtsoV2();

        // Calculate fee for this feed
        uint256 fee = ftso.calculateFeeById(feedId);

        // Get price (may require payment)
        (value, decimals, timestamp) = ftso.getFeedById{value: fee}(feedId);

        if (value == 0) {
            revert PraxisErrors.InvalidPrice(feedId);
        }
    }

    /**
     * @notice Get price with staleness check
     * @param feedId The FTSO feed ID
     * @return value The price value
     * @return decimals The decimal places
     * @return timestamp The price timestamp
     */
    function getPriceWithCheck(
        bytes21 feedId
    ) external payable returns (uint256 value, int8 decimals, uint64 timestamp) {
        if (feedId == bytes21(0)) {
            revert PraxisErrors.InvalidFeedId(feedId);
        }

        FtsoV2Interface ftso = getFtsoV2();

        // Calculate fee for this feed
        uint256 fee = ftso.calculateFeeById(feedId);

        // Get price
        (value, decimals, timestamp) = ftso.getFeedById{value: fee}(feedId);

        if (value == 0) {
            revert PraxisErrors.InvalidPrice(feedId);
        }

        // Check staleness
        if (block.timestamp - timestamp > maxPriceAge) {
            revert PraxisErrors.PriceStale(feedId, timestamp, maxPriceAge);
        }
    }

    /**
     * @notice Get price in wei (18 decimals) for a feed ID
     * @param feedId The FTSO feed ID
     * @return valueInWei The price normalized to 18 decimals
     * @return timestamp The price timestamp
     */
    function getPriceInWei(
        bytes21 feedId
    ) external payable returns (uint256 valueInWei, uint64 timestamp) {
        if (feedId == bytes21(0)) {
            revert PraxisErrors.InvalidFeedId(feedId);
        }

        FtsoV2Interface ftso = getFtsoV2();

        // Calculate fee
        uint256 fee = ftso.calculateFeeById(feedId);

        // Get price in wei directly from FTSO
        (valueInWei, timestamp) = ftso.getFeedByIdInWei{value: fee}(feedId);

        if (valueInWei == 0) {
            revert PraxisErrors.InvalidPrice(feedId);
        }
    }

    /**
     * @notice Get USD price for a token address
     * @param token The token address
     * @return priceInWei The price in USD with 18 decimals
     * @return timestamp The price timestamp
     */
    function getTokenPriceUSD(
        address token
    ) external payable returns (uint256 priceInWei, uint64 timestamp) {
        if (!hasFeed[token]) {
            revert PraxisErrors.FeedNotConfigured(token);
        }

        bytes21 feedId = tokenFeeds[token];
        FtsoV2Interface ftso = getFtsoV2();

        // Calculate fee
        uint256 fee = ftso.calculateFeeById(feedId);

        // Get price in wei
        (priceInWei, timestamp) = ftso.getFeedByIdInWei{value: fee}(feedId);

        if (priceInWei == 0) {
            revert PraxisErrors.InvalidPrice(feedId);
        }

        // Check staleness
        if (block.timestamp - timestamp > maxPriceAge) {
            revert PraxisErrors.PriceStale(feedId, timestamp, maxPriceAge);
        }
    }

    /**
     * @notice Get multiple prices at once
     * @param feedIds Array of feed IDs
     * @return values Array of price values (in wei, 18 decimals)
     * @return timestamp The timestamp (same for all feeds in a batch)
     */
    function getMultiplePrices(
        bytes21[] calldata feedIds
    ) external payable returns (uint256[] memory values, uint64 timestamp) {
        FtsoV2Interface ftso = getFtsoV2();

        // Calculate fee for all feeds
        uint256 fee = ftso.calculateFeeByIds(feedIds);

        // Get all prices
        (values, timestamp) = ftso.getFeedsByIdInWei{value: fee}(feedIds);
    }

    /**
     * @notice Calculate the fee for fetching a price
     * @param feedId The feed ID
     * @return fee The fee in native token
     */
    function calculateFee(bytes21 feedId) external view returns (uint256 fee) {
        return getFtsoV2().calculateFeeById(feedId);
    }

    /**
     * @notice Calculate the fee for fetching multiple prices
     * @param feedIds Array of feed IDs
     * @return fee The total fee in native token
     */
    function calculateFeeMultiple(
        bytes21[] calldata feedIds
    ) external view returns (uint256 fee) {
        return getFtsoV2().calculateFeeByIds(feedIds);
    }

    /**
     * @notice Get list of supported feed IDs from FTSO
     * @return feedIds Array of supported feed IDs
     */
    function getSupportedFeeds()
        external
        view
        returns (bytes21[] memory feedIds)
    {
        return getFtsoV2().getSupportedFeedIds();
    }

    // =============================================================
    //                      ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Configure a token-to-feed mapping
     * @param token The token address
     * @param feedId The FTSO feed ID for this token
     */
    function setTokenFeed(address token, bytes21 feedId) external onlyOwner {
        if (token == address(0)) {
            revert PraxisErrors.ZeroAddress();
        }
        if (feedId == bytes21(0)) {
            revert PraxisErrors.InvalidFeedId(feedId);
        }

        tokenFeeds[token] = feedId;
        hasFeed[token] = true;

        emit PraxisEvents.FeedConfigured(token, feedId);
    }

    /**
     * @notice Configure multiple token-to-feed mappings at once
     * @param tokens Array of token addresses
     * @param feedIds Array of corresponding feed IDs
     */
    function setTokenFeeds(
        address[] calldata tokens,
        bytes21[] calldata feedIds
    ) external onlyOwner {
        if (tokens.length != feedIds.length) {
            revert PraxisErrors.ArrayLengthMismatch(
                tokens.length,
                feedIds.length
            );
        }

        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == address(0)) {
                revert PraxisErrors.ZeroAddress();
            }
            if (feedIds[i] == bytes21(0)) {
                revert PraxisErrors.InvalidFeedId(feedIds[i]);
            }

            tokenFeeds[tokens[i]] = feedIds[i];
            hasFeed[tokens[i]] = true;

            emit PraxisEvents.FeedConfigured(tokens[i], feedIds[i]);
        }
    }

    /**
     * @notice Remove a token-to-feed mapping
     * @param token The token address to remove
     */
    function removeTokenFeed(address token) external onlyOwner {
        if (!hasFeed[token]) {
            revert PraxisErrors.FeedNotConfigured(token);
        }

        delete tokenFeeds[token];
        hasFeed[token] = false;

        emit PraxisEvents.FeedRemoved(token);
    }

    /**
     * @notice Update the maximum price age
     * @param _maxPriceAge New maximum age in seconds
     */
    function setMaxPriceAge(uint256 _maxPriceAge) external onlyOwner {
        if (_maxPriceAge == 0) {
            revert PraxisErrors.ZeroAmount();
        }

        uint256 oldMaxAge = maxPriceAge;
        maxPriceAge = _maxPriceAge;

        emit PraxisEvents.MaxPriceAgeUpdated(oldMaxAge, _maxPriceAge);
    }

    /**
     * @notice Transfer ownership to a new address
     * @param newOwner The new owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) {
            revert PraxisErrors.ZeroAddress();
        }

        address oldOwner = owner;
        owner = newOwner;

        emit PraxisEvents.OwnershipTransferred(oldOwner, newOwner);
    }

    // =============================================================
    //                      VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Get the feed ID configured for a token
     * @param token The token address
     * @return feedId The configured feed ID (bytes21(0) if not configured)
     */
    function getTokenFeed(address token) external view returns (bytes21) {
        return tokenFeeds[token];
    }

    /**
     * @notice Check if a token has a feed configured
     * @param token The token address
     * @return configured Whether a feed is configured
     */
    function isTokenConfigured(address token) external view returns (bool) {
        return hasFeed[token];
    }

    // =============================================================
    //                      RECEIVE FUNCTION
    // =============================================================

    /// @notice Allow receiving native token for fee payments
    receive() external payable {}
}

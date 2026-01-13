// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ILendingAdapter} from "../interfaces/ILendingAdapter.sol";
import {IKToken} from "../interfaces/external/IKToken.sol";
import {IKineticComptroller} from "../interfaces/external/IKineticComptroller.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PraxisErrors} from "../lib/PraxisErrors.sol";
import {PraxisEvents} from "../lib/PraxisEvents.sol";

/**
 * @title KineticAdapter
 * @notice Adapter for Kinetic lending protocol on Flare
 * @dev Enables supplying, borrowing, and managing positions in Kinetic (Compound V2 fork)
 */
contract KineticAdapter is ILendingAdapter, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice The Kinetic Comptroller contract
    IKineticComptroller public immutable comptroller;

    /// @notice Name of the adapter
    string private constant ADAPTER_NAME = "Kinetic";

    /// @notice Seconds per year (Kinetic on Flare uses timestamp-based rates)
    uint256 public constant SECONDS_PER_YEAR = 31536000;

    /// @notice Scale factor for mantissa calculations
    uint256 private constant MANTISSA = 1e18;

    /// @notice Mapping from underlying asset to kToken
    mapping(address => address) public underlyingToKToken;

    /// @notice Mapping from kToken to underlying asset
    mapping(address => address) public kTokenToUnderlying;

    /// @notice Array of supported kTokens
    address[] public supportedKTokens;

    /// @notice Events
    event MarketAdded(address indexed underlying, address indexed kToken);
    event MarketRemoved(address indexed underlying, address indexed kToken);

    /**
     * @notice Constructor
     * @param comptroller_ Address of the Kinetic Comptroller
     */
    constructor(address comptroller_) Ownable(msg.sender) {
        if (comptroller_ == address(0)) revert PraxisErrors.ZeroAddress();
        comptroller = IKineticComptroller(comptroller_);
    }

    // =============================================================
    //                     IYieldAdapter IMPLEMENTATION
    // =============================================================

    /**
     * @notice Returns the adapter name
     */
    function name() external pure override returns (string memory) {
        return ADAPTER_NAME;
    }

    /**
     * @notice Returns the Kinetic Comptroller address
     */
    function protocol() external view override returns (address) {
        return address(comptroller);
    }

    /**
     * @notice Deposit assets (same as supply for lending)
     */
    function deposit(
        address asset,
        uint256 amount,
        address recipient
    ) external payable override nonReentrant returns (uint256 shares) {
        return _supply(asset, amount, recipient);
    }

    /**
     * @notice Withdraw assets (same as withdrawSupply)
     */
    function withdraw(
        address asset,
        uint256 shares,
        address recipient
    ) external override nonReentrant returns (uint256 amount) {
        return _withdrawSupply(asset, shares, recipient);
    }

    /**
     * @notice Get the current supply APY for an asset
     * @param asset Address of the underlying asset
     * @return apyBps APY in basis points
     */
    function getAPY(address asset) external view override returns (uint256 apyBps) {
        return getSupplyAPY(asset);
    }

    /**
     * @notice Check if an asset is supported
     * @param asset Address of the underlying asset
     */
    function isAssetSupported(address asset) external view override returns (bool) {
        return underlyingToKToken[asset] != address(0);
    }

    /**
     * @notice Get user's underlying balance from their kToken holdings
     * @param asset Address of the underlying asset
     * @param user Address of the user
     */
    function getUnderlyingBalance(
        address asset,
        address user
    ) external view override returns (uint256) {
        address kToken = underlyingToKToken[asset];
        if (kToken == address(0)) return 0;

        IKToken kTokenContract = IKToken(kToken);
        uint256 kTokenBalance = kTokenContract.balanceOf(user);
        uint256 exchangeRate = kTokenContract.exchangeRateStored();

        return (kTokenBalance * exchangeRate) / MANTISSA;
    }

    /**
     * @notice Get the current exchange rate for a kToken
     * @param asset Address of the underlying asset
     * @return Exchange rate scaled by 1e18
     */
    function getExchangeRate(address asset) external view override returns (uint256) {
        address kToken = underlyingToKToken[asset];
        if (kToken == address(0)) return 0;
        return IKToken(kToken).exchangeRateStored();
    }

    /**
     * @notice Get total value locked for an asset
     * @param asset Address of the underlying asset
     */
    function getTVL(address asset) external view override returns (uint256) {
        address kToken = underlyingToKToken[asset];
        if (kToken == address(0)) return 0;

        IKToken kTokenContract = IKToken(kToken);
        return kTokenContract.getCash() + kTokenContract.totalBorrows() - kTokenContract.totalReserves();
    }

    // =============================================================
    //                   ILendingAdapter IMPLEMENTATION
    // =============================================================

    /**
     * @notice Supply assets to the lending pool
     * @param asset Address of the asset to supply
     * @param amount Amount to supply
     * @param recipient Address to receive kTokens
     * @return shares Amount of kTokens received
     */
    function supply(
        address asset,
        uint256 amount,
        address recipient
    ) external override nonReentrant returns (uint256 shares) {
        return _supply(asset, amount, recipient);
    }

    /**
     * @notice Withdraw supplied assets
     * @param asset Address of the asset to withdraw
     * @param shares Amount of kTokens to redeem
     * @param recipient Address to receive underlying assets
     * @return amount Amount of underlying received
     */
    function withdrawSupply(
        address asset,
        uint256 shares,
        address recipient
    ) external override nonReentrant returns (uint256 amount) {
        return _withdrawSupply(asset, shares, recipient);
    }

    /**
     * @notice Borrow assets from the lending pool
     * @param asset Address of the asset to borrow
     * @param amount Amount to borrow
     * @param recipient Address to receive borrowed assets
     * @return debtShares Debt created (same as amount for Compound-style)
     */
    function borrow(
        address asset,
        uint256 amount,
        address recipient
    ) external override nonReentrant returns (uint256 debtShares) {
        if (amount == 0) revert PraxisErrors.ZeroAmount();
        if (recipient == address(0)) revert PraxisErrors.ZeroAddress();

        address kToken = underlyingToKToken[asset];
        if (kToken == address(0)) revert PraxisErrors.AssetNotSupported(asset);

        // Borrow from kToken
        uint256 error = IKToken(kToken).borrow(amount);
        if (error != 0) revert PraxisErrors.InsufficientBalance(amount, 0);

        // Transfer borrowed assets to recipient
        if (recipient != address(this)) {
            IERC20(asset).safeTransfer(recipient, amount);
        }

        emit PraxisEvents.YieldWithdrawn(
            msg.sender,
            asset,
            amount,
            0 // No shares for borrow
        );

        return amount;
    }

    /**
     * @notice Repay borrowed assets
     * @param asset Address of the asset to repay
     * @param amount Amount to repay (use type(uint256).max for full)
     * @param borrower Address of the borrower
     * @return repaidAmount Actual amount repaid
     */
    function repay(
        address asset,
        uint256 amount,
        address borrower
    ) external override nonReentrant returns (uint256 repaidAmount) {
        if (amount == 0) revert PraxisErrors.ZeroAmount();

        address kToken = underlyingToKToken[asset];
        if (kToken == address(0)) revert PraxisErrors.AssetNotSupported(asset);

        // If max, get the full borrow balance
        if (amount == type(uint256).max) {
            amount = IKToken(kToken).borrowBalanceCurrent(borrower);
        }

        // Pull tokens from caller
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        // Approve kToken
        IERC20(asset).forceApprove(kToken, amount);

        // Repay
        uint256 error;
        if (borrower == msg.sender) {
            error = IKToken(kToken).repayBorrow(amount);
        } else {
            error = IKToken(kToken).repayBorrowBehalf(borrower, amount);
        }

        if (error != 0) revert PraxisErrors.InsufficientBalance(amount, 0);

        return amount;
    }

    /**
     * @notice Enable an asset as collateral
     * @param asset Address of the asset to enable
     */
    function enableCollateral(address asset) external override nonReentrant {
        address kToken = underlyingToKToken[asset];
        if (kToken == address(0)) revert PraxisErrors.AssetNotSupported(asset);

        address[] memory markets = new address[](1);
        markets[0] = kToken;

        uint256[] memory errors = comptroller.enterMarkets(markets);
        if (errors[0] != 0) revert PraxisErrors.AssetNotSupported(asset);
    }

    /**
     * @notice Disable an asset as collateral
     * @param asset Address of the asset to disable
     */
    function disableCollateral(address asset) external override nonReentrant {
        address kToken = underlyingToKToken[asset];
        if (kToken == address(0)) revert PraxisErrors.AssetNotSupported(asset);

        uint256 error = comptroller.exitMarket(kToken);
        if (error != 0) revert PraxisErrors.AssetNotSupported(asset);
    }

    /**
     * @notice Get the supply APY for an asset
     * @param asset Address of the asset
     * @return APY in basis points (100 = 1%)
     */
    function getSupplyAPY(address asset) public view override returns (uint256) {
        address kToken = underlyingToKToken[asset];
        if (kToken == address(0)) return 0;

        uint256 supplyRatePerSecond = IKToken(kToken).supplyRatePerTimestamp();
        // APY = (1 + rate per second) ^ seconds per year - 1
        // Simplified: APY ≈ rate per second * seconds per year
        uint256 apyMantissa = supplyRatePerSecond * SECONDS_PER_YEAR;

        // Convert from mantissa (1e18) to basis points (1e4)
        return apyMantissa / 1e14;
    }

    /**
     * @notice Get the borrow APY for an asset
     * @param asset Address of the asset
     * @return APY in basis points (100 = 1%)
     */
    function getBorrowAPY(address asset) public view override returns (uint256) {
        address kToken = underlyingToKToken[asset];
        if (kToken == address(0)) return 0;

        uint256 borrowRatePerSecond = IKToken(kToken).borrowRatePerTimestamp();
        uint256 apyMantissa = borrowRatePerSecond * SECONDS_PER_YEAR;

        return apyMantissa / 1e14;
    }

    /**
     * @notice Get account liquidity information
     * @param account Address of the account
     */
    function getAccountLiquidity(
        address account
    ) external view override returns (
        uint256 collateralValue,
        uint256 borrowValue,
        uint256 availableBorrow
    ) {
        (uint256 error, uint256 liquidity, uint256 shortfall) =
            comptroller.getAccountLiquidity(account);

        if (error != 0) return (0, 0, 0);

        // Liquidity = excess collateral, Shortfall = deficit
        if (liquidity > 0) {
            availableBorrow = liquidity;
            // Estimate collateral based on liquidity
            // This is simplified - actual calculation would need all positions
            collateralValue = liquidity;
            borrowValue = 0;
        } else if (shortfall > 0) {
            collateralValue = 0;
            borrowValue = shortfall;
            availableBorrow = 0;
        }
    }

    /**
     * @notice Get the health factor for an account
     * @param account Address of the account
     * @return Health factor scaled by 1e18 (1e18 = 100%)
     */
    function getHealthFactor(address account) external view override returns (uint256) {
        (uint256 error, uint256 liquidity, uint256 shortfall) =
            comptroller.getAccountLiquidity(account);

        if (error != 0) return 0;

        // If there's liquidity, health factor > 1
        if (liquidity > 0) {
            return MANTISSA + liquidity; // Simplified
        }

        // If there's shortfall, health factor < 1
        if (shortfall > 0) {
            return MANTISSA - (shortfall > MANTISSA ? MANTISSA : shortfall);
        }

        return MANTISSA; // Exactly at threshold
    }

    /**
     * @notice Get the borrow balance for a user and asset
     * @param asset Address of the asset
     * @param user Address of the user
     */
    function getBorrowBalance(
        address asset,
        address user
    ) external view override returns (uint256) {
        address kToken = underlyingToKToken[asset];
        if (kToken == address(0)) return 0;
        return IKToken(kToken).borrowBalanceStored(user);
    }

    /**
     * @notice Get the receipt token (kToken) for an underlying asset
     * @param asset Address of the underlying asset
     */
    function getReceiptToken(address asset) external view override returns (address) {
        return underlyingToKToken[asset];
    }

    // =============================================================
    //                       INTERNAL FUNCTIONS
    // =============================================================

    /**
     * @notice Internal supply implementation
     */
    function _supply(
        address asset,
        uint256 amount,
        address recipient
    ) internal returns (uint256 shares) {
        if (amount == 0) revert PraxisErrors.ZeroAmount();
        if (recipient == address(0)) revert PraxisErrors.ZeroAddress();

        address kToken = underlyingToKToken[asset];
        if (kToken == address(0)) revert PraxisErrors.AssetNotSupported(asset);

        // Pull tokens from caller
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        // Approve kToken
        IERC20(asset).forceApprove(kToken, amount);

        // Get kToken balance before
        uint256 balanceBefore = IERC20(kToken).balanceOf(address(this));

        // Mint kTokens
        uint256 error = IKToken(kToken).mint(amount);
        if (error != 0) revert PraxisErrors.InsufficientBalance(amount, 0);

        // Calculate shares received
        uint256 balanceAfter = IERC20(kToken).balanceOf(address(this));
        shares = balanceAfter - balanceBefore;

        // Transfer kTokens to recipient
        if (recipient != address(this)) {
            IERC20(kToken).safeTransfer(recipient, shares);
        }

        emit PraxisEvents.YieldDeposited(
            recipient,
            asset,
            amount,
            shares
        );

        return shares;
    }

    /**
     * @notice Internal withdraw implementation
     */
    function _withdrawSupply(
        address asset,
        uint256 shares,
        address recipient
    ) internal returns (uint256 amount) {
        if (shares == 0) revert PraxisErrors.ZeroAmount();
        if (recipient == address(0)) revert PraxisErrors.ZeroAddress();

        address kToken = underlyingToKToken[asset];
        if (kToken == address(0)) revert PraxisErrors.AssetNotSupported(asset);

        // Pull kTokens from caller
        IERC20(kToken).safeTransferFrom(msg.sender, address(this), shares);

        // Get underlying balance before
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));

        // Redeem kTokens
        uint256 error = IKToken(kToken).redeem(shares);
        if (error != 0) revert PraxisErrors.ExcessiveWithdrawal(shares, 0);

        // Calculate amount received
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        amount = balanceAfter - balanceBefore;

        // Transfer underlying to recipient
        if (recipient != address(this)) {
            IERC20(asset).safeTransfer(recipient, amount);
        }

        emit PraxisEvents.YieldWithdrawn(
            recipient,
            asset,
            amount,
            shares
        );

        return amount;
    }

    // =============================================================
    //                         ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Add a market (kToken) to the adapter
     * @param kToken Address of the kToken
     */
    function addMarket(address kToken) external onlyOwner {
        if (kToken == address(0)) revert PraxisErrors.ZeroAddress();

        address underlying = IKToken(kToken).underlying();
        if (underlying == address(0)) revert PraxisErrors.ZeroAddress();

        // Check if already added
        if (underlyingToKToken[underlying] != address(0)) {
            revert PraxisErrors.AssetNotSupported(underlying);
        }

        underlyingToKToken[underlying] = kToken;
        kTokenToUnderlying[kToken] = underlying;
        supportedKTokens.push(kToken);

        emit MarketAdded(underlying, kToken);
    }

    /**
     * @notice Remove a market from the adapter
     * @param kToken Address of the kToken
     */
    function removeMarket(address kToken) external onlyOwner {
        address underlying = kTokenToUnderlying[kToken];
        if (underlying == address(0)) revert PraxisErrors.AssetNotSupported(kToken);

        delete underlyingToKToken[underlying];
        delete kTokenToUnderlying[kToken];

        // Remove from supportedKTokens array
        for (uint256 i = 0; i < supportedKTokens.length; i++) {
            if (supportedKTokens[i] == kToken) {
                supportedKTokens[i] = supportedKTokens[supportedKTokens.length - 1];
                supportedKTokens.pop();
                break;
            }
        }

        emit MarketRemoved(underlying, kToken);
    }

    /**
     * @notice Initialize markets from Comptroller
     * @dev Automatically discovers and adds all markets from the Comptroller
     */
    function initializeMarkets() external onlyOwner {
        address[] memory markets = comptroller.getAllMarkets();

        for (uint256 i = 0; i < markets.length; i++) {
            address kToken = markets[i];

            // Skip if already added
            if (kTokenToUnderlying[kToken] != address(0)) continue;

            // Get underlying (might fail for native token markets)
            try IKToken(kToken).underlying() returns (address underlying) {
                if (underlying != address(0)) {
                    underlyingToKToken[underlying] = kToken;
                    kTokenToUnderlying[kToken] = underlying;
                    supportedKTokens.push(kToken);
                    emit MarketAdded(underlying, kToken);
                }
            } catch {
                // Skip markets without underlying() (e.g., native FLR)
            }
        }
    }

    /**
     * @notice Get all supported kTokens
     * @return Array of kToken addresses
     */
    function getSupportedMarkets() external view returns (address[] memory) {
        return supportedKTokens;
    }

    /**
     * @notice Rescue tokens accidentally sent to this contract
     * @param token Token to rescue
     * @param to Address to send rescued tokens
     * @param amount Amount to rescue
     */
    function rescueTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        if (to == address(0)) revert PraxisErrors.ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * @notice Receive native FLR
     */
    receive() external payable {}
}

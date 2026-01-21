// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MockSceptre
 * @notice Mock liquid staking protocol for Coston2 testnet demo
 * @dev Simulates Sceptre's sFLR liquid staking token
 *      - stake(FLR) -> receive msFLR (mock sFLR)
 *      - Exchange rate adjustable by admin to simulate yield
 *      - Instant unstake for demo (no cooldown)
 */
contract MockSceptre is ERC20, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =============================================================
    //                          STORAGE
    // =============================================================

    /// @notice Exchange rate: msFLR per FLR (scaled by 1e18)
    /// @dev 1.05e18 means 1 FLR = 0.952 msFLR (5% yield accrued)
    uint256 public exchangeRate;

    /// @notice Total FLR staked
    uint256 public totalStaked;

    /// @notice Wrapped FLR token address (for non-native staking)
    address public immutable wflr;

    // =============================================================
    //                          EVENTS
    // =============================================================

    event Staked(address indexed user, uint256 flrAmount, uint256 msFLRAmount);
    event Unstaked(address indexed user, uint256 msFLRAmount, uint256 flrAmount);
    event ExchangeRateUpdated(uint256 oldRate, uint256 newRate);

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    /**
     * @notice Initialize MockSceptre
     * @param _wflr Wrapped FLR token address
     * @param _initialExchangeRate Initial exchange rate (1e18 = 1:1)
     */
    constructor(
        address _wflr,
        uint256 _initialExchangeRate
    ) ERC20("Mock Staked FLR", "msFLR") Ownable(msg.sender) {
        require(_wflr != address(0), "MockSceptre: ZERO_ADDRESS");
        require(_initialExchangeRate > 0, "MockSceptre: ZERO_RATE");

        wflr = _wflr;
        exchangeRate = _initialExchangeRate;
    }

    // =============================================================
    //                      STAKING FUNCTIONS
    // =============================================================

    /**
     * @notice Stake native FLR and receive msFLR
     */
    function stake() external payable nonReentrant {
        require(msg.value > 0, "MockSceptre: ZERO_AMOUNT");

        uint256 msFLRAmount = _flrToMsFLR(msg.value);
        totalStaked += msg.value;

        _mint(msg.sender, msFLRAmount);

        emit Staked(msg.sender, msg.value, msFLRAmount);
    }

    /**
     * @notice Stake WFLR tokens and receive msFLR
     * @param amount Amount of WFLR to stake
     */
    function stakeWFLR(uint256 amount) external nonReentrant {
        require(amount > 0, "MockSceptre: ZERO_AMOUNT");

        IERC20(wflr).safeTransferFrom(msg.sender, address(this), amount);

        uint256 msFLRAmount = _flrToMsFLR(amount);
        totalStaked += amount;

        _mint(msg.sender, msFLRAmount);

        emit Staked(msg.sender, amount, msFLRAmount);
    }

    /**
     * @notice Unstake msFLR and receive native FLR
     * @param msFLRAmount Amount of msFLR to unstake
     */
    function unstake(uint256 msFLRAmount) external nonReentrant {
        require(msFLRAmount > 0, "MockSceptre: ZERO_AMOUNT");
        require(balanceOf(msg.sender) >= msFLRAmount, "MockSceptre: INSUFFICIENT_BALANCE");

        uint256 flrAmount = _msFLRToFLR(msFLRAmount);
        require(address(this).balance >= flrAmount, "MockSceptre: INSUFFICIENT_FLR");

        totalStaked -= flrAmount;
        _burn(msg.sender, msFLRAmount);

        (bool success, ) = msg.sender.call{value: flrAmount}("");
        require(success, "MockSceptre: TRANSFER_FAILED");

        emit Unstaked(msg.sender, msFLRAmount, flrAmount);
    }

    /**
     * @notice Unstake msFLR and receive WFLR tokens
     * @param msFLRAmount Amount of msFLR to unstake
     */
    function unstakeToWFLR(uint256 msFLRAmount) external nonReentrant {
        require(msFLRAmount > 0, "MockSceptre: ZERO_AMOUNT");
        require(balanceOf(msg.sender) >= msFLRAmount, "MockSceptre: INSUFFICIENT_BALANCE");

        uint256 flrAmount = _msFLRToFLR(msFLRAmount);
        require(IERC20(wflr).balanceOf(address(this)) >= flrAmount, "MockSceptre: INSUFFICIENT_WFLR");

        totalStaked -= flrAmount;
        _burn(msg.sender, msFLRAmount);

        IERC20(wflr).safeTransfer(msg.sender, flrAmount);

        emit Unstaked(msg.sender, msFLRAmount, flrAmount);
    }

    // =============================================================
    //                    CONVERSION FUNCTIONS
    // =============================================================

    /**
     * @notice Convert FLR amount to msFLR amount
     * @param flrAmount Amount of FLR
     * @return msFLRAmount Equivalent msFLR amount
     */
    function _flrToMsFLR(uint256 flrAmount) internal view returns (uint256) {
        // msFLR = FLR * 1e18 / exchangeRate
        return (flrAmount * 1e18) / exchangeRate;
    }

    /**
     * @notice Convert msFLR amount to FLR amount
     * @param msFLRAmount Amount of msFLR
     * @return flrAmount Equivalent FLR amount
     */
    function _msFLRToFLR(uint256 msFLRAmount) internal view returns (uint256) {
        // FLR = msFLR * exchangeRate / 1e18
        return (msFLRAmount * exchangeRate) / 1e18;
    }

    // =============================================================
    //                      VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Get the current exchange rate
     * @return The exchange rate (FLR per msFLR, scaled by 1e18)
     */
    function getExchangeRate() external view returns (uint256) {
        return exchangeRate;
    }

    /**
     * @notice Calculate msFLR amount for a given FLR deposit
     * @param flrAmount FLR amount to deposit
     * @return msFLRAmount Expected msFLR received
     */
    function previewStake(uint256 flrAmount) external view returns (uint256) {
        return _flrToMsFLR(flrAmount);
    }

    /**
     * @notice Calculate FLR amount for a given msFLR withdrawal
     * @param msFLRAmount msFLR amount to withdraw
     * @return flrAmount Expected FLR received
     */
    function previewUnstake(uint256 msFLRAmount) external view returns (uint256) {
        return _msFLRToFLR(msFLRAmount);
    }

    /**
     * @notice Get the underlying FLR value of a user's msFLR balance
     * @param user User address
     * @return FLR value of user's msFLR
     */
    function underlyingBalanceOf(address user) external view returns (uint256) {
        return _msFLRToFLR(balanceOf(user));
    }

    /**
     * @notice Get the current APY (simulated for display)
     * @return APY in basis points (e.g., 500 = 5%)
     */
    function getAPY() external view returns (uint256) {
        // Calculate APY from exchange rate
        // If exchangeRate = 1.05e18, APY = 5%
        if (exchangeRate <= 1e18) return 0;
        return ((exchangeRate - 1e18) * 10000) / 1e18;
    }

    // =============================================================
    //                      ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Update the exchange rate (simulates yield accrual)
     * @param newRate New exchange rate (scaled by 1e18)
     */
    function setExchangeRate(uint256 newRate) external onlyOwner {
        require(newRate > 0, "MockSceptre: ZERO_RATE");

        uint256 oldRate = exchangeRate;
        exchangeRate = newRate;

        emit ExchangeRateUpdated(oldRate, newRate);
    }

    /**
     * @notice Simulate yield accrual by increasing exchange rate
     * @param yieldBps Yield to add in basis points (e.g., 100 = 1%)
     */
    function accrueYield(uint256 yieldBps) external onlyOwner {
        uint256 oldRate = exchangeRate;
        // newRate = oldRate * (10000 + yieldBps) / 10000
        exchangeRate = (exchangeRate * (10000 + yieldBps)) / 10000;

        emit ExchangeRateUpdated(oldRate, exchangeRate);
    }

    /**
     * @notice Fund the contract with native FLR for unstaking
     */
    function fundWithFLR() external payable onlyOwner {
        // Just receives FLR
    }

    /**
     * @notice Rescue tokens accidentally sent to the contract
     * @param token Token to rescue (use address(0) for native FLR)
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            (bool success, ) = to.call{value: amount}("");
            require(success, "MockSceptre: TRANSFER_FAILED");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    // =============================================================
    //                      RECEIVE FUNCTION
    // =============================================================

    /// @notice Allow receiving native FLR
    receive() external payable {}
}

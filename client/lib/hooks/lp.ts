'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { PraxisGatewayABI, ExecutionVaultABI, ERC20ABI } from '../contracts/abis';
import { getAddresses } from '../contracts/addresses';

// =============================================================
//                       VAULT INFO HOOK
// =============================================================

export interface VaultInfo {
  totalAssets: bigint;
  totalShares: bigint;
  allocatedCapital: bigint;
  availableCapital: bigint;
  utilizationRate: number; // as percentage (0-100)
}

export function useVaultInfo() {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: addresses.PraxisGateway,
    abi: PraxisGatewayABI,
    functionName: 'getVaultInfo',
  });

  const vaultInfo: VaultInfo | undefined = data
    ? {
        totalAssets: data.totalAssets,
        totalShares: data.totalShares,
        allocatedCapital: data.allocatedCapital,
        availableCapital: data.availableCapital,
        utilizationRate: Number(data.utilizationRate) / 100, // Convert BPS to percentage
      }
    : undefined;

  return {
    data: vaultInfo,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//                       LP BALANCE HOOK
// =============================================================

export interface LPBalance {
  shares: bigint;
  assetsValue: bigint;
}

export function useLPBalance() {
  const { address } = useAccount();
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data: shares, isLoading: sharesLoading, error: sharesError, refetch: refetchShares } = useReadContract({
    address: addresses.ExecutionVault,
    abi: ExecutionVaultABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const { data: assetsValue, isLoading: assetsLoading, error: assetsError, refetch: refetchAssets } = useReadContract({
    address: addresses.ExecutionVault,
    abi: ExecutionVaultABI,
    functionName: 'convertToAssets',
    args: shares ? [shares] : undefined,
    query: {
      enabled: !!shares && shares > 0n,
    },
  });

  const balance: LPBalance | undefined =
    shares !== undefined
      ? {
          shares,
          assetsValue: assetsValue ?? 0n,
        }
      : undefined;

  return {
    data: balance,
    isLoading: sharesLoading || assetsLoading,
    error: sharesError || assetsError,
    refetch: () => {
      refetchShares();
      refetchAssets();
    },
  };
}

// =============================================================
//                     APPROVE VAULT HOOK
// =============================================================

export function useApproveVault() {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const approve = async (amount: bigint) => {
    writeContract({
      address: addresses.Asset,
      abi: ERC20ABI,
      functionName: 'approve',
      args: [addresses.PraxisGateway, amount],
    });
  };

  const approveMax = async () => {
    const maxUint256 = 2n ** 256n - 1n;
    writeContract({
      address: addresses.Asset,
      abi: ERC20ABI,
      functionName: 'approve',
      args: [addresses.PraxisGateway, maxUint256],
    });
  };

  return {
    approve,
    approveMax,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

// =============================================================
//                    CHECK ALLOWANCE HOOK
// =============================================================

export function useAllowance() {
  const { address } = useAccount();
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data: allowance, isLoading, error, refetch } = useReadContract({
    address: addresses.Asset,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: address ? [address, addresses.PraxisGateway] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return {
    data: allowance,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//                      LP DEPOSIT HOOK
// =============================================================

export interface DepositResult {
  shares: bigint;
  hash: `0x${string}`;
}

export function useLPDeposit() {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const deposit = async (amount: bigint) => {
    writeContract({
      address: addresses.PraxisGateway,
      abi: PraxisGatewayABI,
      functionName: 'deposit',
      args: [amount],
    });
  };

  // Helper to deposit with formatted amount (e.g., "1000" for 1000 USDC)
  const depositFormatted = async (amount: string, decimals: number = 6) => {
    const parsedAmount = parseUnits(amount, decimals);
    deposit(parsedAmount);
  };

  return {
    deposit,
    depositFormatted,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    receipt,
    error,
  };
}

// =============================================================
//                     LP WITHDRAW HOOK
// =============================================================

export function useLPWithdraw() {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const withdraw = async (shares: bigint) => {
    writeContract({
      address: addresses.PraxisGateway,
      abi: PraxisGatewayABI,
      functionName: 'withdraw',
      args: [shares],
    });
  };

  // Withdraw all shares
  const withdrawAll = async (currentShares: bigint) => {
    withdraw(currentShares);
  };

  return {
    withdraw,
    withdrawAll,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    receipt,
    error,
  };
}

// =============================================================
//                   PREVIEW DEPOSIT HOOK
// =============================================================

export function usePreviewDeposit(assets: bigint | undefined) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data: shares, isLoading, error, refetch } = useReadContract({
    address: addresses.ExecutionVault,
    abi: ExecutionVaultABI,
    functionName: 'previewDeposit',
    args: assets ? [assets] : undefined,
    query: {
      enabled: !!assets && assets > 0n,
    },
  });

  return {
    data: shares,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//                  PREVIEW WITHDRAW HOOK
// =============================================================

export function usePreviewRedeem(shares: bigint | undefined) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data: assets, isLoading, error, refetch } = useReadContract({
    address: addresses.ExecutionVault,
    abi: ExecutionVaultABI,
    functionName: 'previewRedeem',
    args: shares ? [shares] : undefined,
    query: {
      enabled: !!shares && shares > 0n,
    },
  });

  return {
    data: assets,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//               VAULT REDEEM HOOK (ERC-4626 DIRECT)
// =============================================================

export function useVaultRedeem() {
  const { address } = useAccount();
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  // Redeem shares directly from the ExecutionVault (ERC-4626)
  const redeem = async (shares: bigint) => {
    if (!address) return;

    writeContract({
      address: addresses.ExecutionVault,
      abi: ExecutionVaultABI,
      functionName: 'redeem',
      args: [shares, address, address], // shares, receiver, owner
    });
  };

  return {
    redeem,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    receipt,
    error,
  };
}

// =============================================================
//                    TOKEN BALANCE HOOK
// =============================================================

export function useTokenBalance() {
  const { address } = useAccount();
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data: balance, isLoading, error, refetch } = useReadContract({
    address: addresses.Asset,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return {
    data: balance,
    isLoading,
    error,
    refetch,
  };
}

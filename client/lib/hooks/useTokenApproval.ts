import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { erc20Abi, maxUint256 } from 'viem';

export function useTokenApproval(
    tokenAddress: `0x${string}`,
    spenderAddress: `0x${string}`,
    amount: bigint
) {
    const { address: owner } = useAccount();

    // 1. Check Allowance
    const { data: allowance, refetch } = useReadContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'allowance',
        args: owner && spenderAddress ? [owner, spenderAddress] : undefined,
        query: {
            enabled: !!owner && !!spenderAddress && !!tokenAddress,
        }
    });

    const isApproved = allowance ? allowance >= amount : false;

    // 2. Approve Function
    const { writeContract, data: hash, isPending, error } = useWriteContract();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const approve = () => {
        writeContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'approve',
            args: [spenderAddress, maxUint256], // Approve max for convenience in demo
        });
    };

    return {
        isApproved,
        allowance,
        approve,
        hash,
        isPending,
        isConfirming,
        isSuccess,
        error,
        refetchAllowance: refetch
    };
}

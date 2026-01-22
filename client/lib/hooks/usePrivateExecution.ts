import { useWriteContract, useWaitForTransactionReceipt, useChainId, useAccount } from 'wagmi';
import { getAddresses } from '../contracts/addresses';
import { ExecutionControllerABI } from '../contracts/abis';
import { PrivateSwapProof } from '../zk/types';
import { encodeAbiParameters, parseAbiParameters } from 'viem';

// Hardcoded ExecutionController for Coston2 since it might be missing in addresses.ts or nested
// Based on PraxisGateway constructor args in deployment script, usually it's deployed.
// But let's check addresses.ts content again.
// Ah, addresses.ts DOES NOT have ExecutionController!
// I need to fetch it from PraxisGateway view function OR hardcode it if known.
// I can add a specialized hook or just assume it is '0xD7...' if I knew it.
// Wait, I saw it in `Task Status`? No.
// I should read it from PraxisGateway on chain?
// Or I can add it to addresses.ts if I can find it.
// The deployment logs usually have it.
// But I can use a read contract hook.

// For now, I'll use the one I saw in deployment logs? 
// No logs available.
// I will use `useReadContract` to get it from PraxisGateway.
import { useReadContract } from 'wagmi';
import { PraxisGatewayABI } from '../contracts/abis'; // To read executionController()

export function usePrivateExecution() {
    const chainId = useChainId();
    const { address: userAddress } = useAccount();
    const addresses = getAddresses(chainId);
    const { writeContract, data: hash, isPending, error } = useWriteContract();

    const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
        hash,
    });

    const { data: executionControllerAddress } = useReadContract({
        address: addresses.PraxisGateway,
        abi: [{
            name: 'executionController',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ name: '', type: 'address' }],
        }],
        functionName: 'executionController',
    });

    const executeSwap = (proof: PrivateSwapProof) => {
        if (!executionControllerAddress) {
            console.error("Execution Controller address not loaded");
            return;
        }

        // 1. Prepare Proof Bytes (Simulated for permissive verifier)
        const proofBytes = "0x00";

        // 2. Prepare Public Inputs [ertId, dummy, timestamp, actionCommitment]
        const ertId = BigInt(proof.publicInputs.ertId);
        const timestamp = BigInt(proof.publicInputs.timestamp);

        // Handle actionCommitment safely
        let actionCommitment = BigInt(0);
        // @ts-expect-error - actionCommitment might not be in the generated zod types yet
        if (proof.publicInputs.actionCommitment) {
            // @ts-expect-error - actionCommitment might not be in the generated zod types yet
            actionCommitment = BigInt(proof.publicInputs.actionCommitment);
        }

        const inputs = [
            ertId,
            BigInt(0),
            timestamp,
            actionCommitment
        ];

        // 3. Encode Extra Data for ZKExecutor.swap
        // ZKExecutor.swap expects encoded (bytes proof, uint256[] inputs)
        const exchangeData = encodeAbiParameters(
            parseAbiParameters('bytes, uint256[]'),
            [proofBytes, inputs as bigint[]]
        );

        // 4. Construct Action for ExecutionController
        const tokenIn = proof.privateInputs.tokenIn as `0x${string}`;
        const tokenOut = proof.privateInputs.tokenOut as `0x${string}`;
        const amountIn = proof.privateInputs.amountIn;
        const minAmountOut = proof.privateInputs.minAmountOut;

        const action = {
            actionType: 0, // SWAP
            adapter: addresses.ZKExecutor || addresses.PrivateSwapVerifier,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            extraData: exchangeData,
        };

        // 5. Execute via ExecutionController directly
        console.log("Executing via Controller:", executionControllerAddress);

        writeContract({
            address: executionControllerAddress as `0x${string}`,
            abi: ExecutionControllerABI,
            functionName: 'validateAndExecute',
            args: [
                ertId,
                [action]
            ],
        });
    };

    return {
        executeSwap,
        hash,
        isPending,
        isConfirming,
        isSuccess,
        receipt,
        error,
    };
}

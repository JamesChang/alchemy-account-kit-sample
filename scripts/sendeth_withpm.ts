// importing required dependencies
import { AlchemyProvider } from "@alchemy/aa-alchemy";
import {
  LightSmartContractAccount,
  getDefaultLightAccountFactoryAddress,
} from "@alchemy/aa-accounts";
import { LocalAccountSigner, 
  SmartAccountProvider, 
  type SmartAccountSigner,
  getDefaultEntryPointAddress,
  Logger
} from "@alchemy/aa-core";
import * as chains from "viem/chains";
import * as dotenv from "dotenv";

Logger.setLogLevel(4) // Set LogLevel to DEBUG

const chainMap = new Map([
  ['sepolia', chains.sepolia],
  ['mainnet', chains.mainnet],
  ['goerli', chains.goerli],
  ['polygonMumbai', chains.polygonMumbai],
  ['polygon', chains.polygon],
]);
function getChainByName(name: string): any {
  const chain = chainMap.get(name);
  if (!chain) {
    throw new Error(`Invalid chain name: ${name}`);
  }
  return chain;
}

dotenv.config();
const chainName = process.env.CHAIN;
const chain = getChainByName(chainName);
const chain_url = process.env.CHAIN_URL;
if (!chain_url) {
    throw new Error(`Invalid chain url: ${chain_url}`);
}
const private_key = process.env.PRIVATE_KEY;
if (!private_key) {
    throw new Error(`Invalid private key`);
}
const eoaSigner: SmartAccountSigner = LocalAccountSigner.privateKeyToAccountSigner(private_key); // Create a signer for your EOA

const entryPointAddress = getDefaultEntryPointAddress(chain)
const targetAddress = "0x136aF0A9155d89CD428E8f292F79D74a69B38E0f"; // Replace with the desired target address


const userOperationFeeOptions: UserOperationFeeOptions = {
  maxPriorityFeePerGas: {
    min: 10_000_000n,
    percentage: 20,
  },
  maxFeePerGas: {
    percentage: 100,
  }
};

const provider = new SmartAccountProvider({
  rpcProvider: chain_url,
  chain,
  entryPointAddress: entryPointAddress,
  opts: {
    txMaxRetries: 10,
    txRetryIntervalMs: 2_000,
    txRetryMulitplier: 1.5,
    feeOptions: userOperationFeeOptions,
  },
}).connect(
  (rpcClient) =>
    new LightSmartContractAccount({
      entryPointAddress: entryPointAddress,
      chain: rpcClient.chain,
      owner: eoaSigner,
      factoryAddress: getDefaultLightAccountFactoryAddress(rpcClient.chain), // Default address for Light Account on Sepolia, you can replace it with your own.
      rpcClient,
    })
);

// Logging the smart account address -- please fund this address with some SepoliaETH in order for the user operations to be executed successfully
provider.getAddress().then((address: string) => console.log("YOUR ACCOUNT:", address));

const userOpData = {
  target: targetAddress, // Replace with the desired target address
  data: "0x0", // Replace with the desired call data
  value: 0n,
};

const userOpDataOverrides = {
  paymasterAndData : "0x8808884a280addf81631daf5e868cbe96a048a800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006575be1f186b102c5ebcb16dbcad7bfc4a379d9547381ed28638091d5bc7e4279e9c60fa30e2c3b573a6fbfd2d91ff178e5c516d2829139c00f9ee9849e967d7d7131e331b",
  maxFeePerGas: 225338341822,
  maxPriorityFeePerGas:10000000,
  callGasLimit:9100,
	verificationGasLimit:66745,
	preVerificationGas:45864,
}

const resultingUO  = await provider.buildUserOperation(userOpData, userOpDataOverrides);
console.log("Sending UserOperation: ", resultingUO);

// Send a user operation from your smart contract account
const opHashResult = await provider.sendUserOperation(userOpData, userOpDataOverrides);
console.log("Resulting UserOperation: ", opHashResult); // Log the user operation hash
console.log(`Checkout https://jiffyscan.xyz/userOpHash/${opHashResult.hash}?network=${chain.name}`)



const txHash = await provider.waitForUserOperationTransaction(opHashResult.hash);
console.log(`Transaction Hash: ${txHash}`);







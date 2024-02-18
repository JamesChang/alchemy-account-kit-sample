// importing required dependencies
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


// Define the DummyPaymasterDataMiddlewareOverrideFunction
const DummyPaymasterDataMiddlewareOverrideFunction = async (uoStruct) => {
  // Return an object like {paymasterAndData: "0x..."} where "0x..." is the valid paymasterAndData for your paymaster contract (used in gas estimation)
  // You can even hardcode these dummy singatures
  // You can read up more on dummy signatures here: https://www.alchemy.com/blog/dummy-signatures-and-gas-token-transfers
  const userOpDataOverrides = {
    paymasterAndData : "0x7915e08ec9e1e4b08b1ac0b086a568fe5d3ba3220000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006575be1ff188fa178364105814dc4bf270fc20175857d63661d18f12ae3a39d1ae13562e5fa5e68582e8669243e2f63e5b2b22b878ca24e987426558cc280c94556f1e921b",
  }

  return userOpDataOverrides;
};

// Define the PaymasterDataMiddlewareOverrideFunction
const PaymasterDataMiddlewareOverrideFunction = async (uoStruct) => {
  // paymasterAndData = paymasterAddress ++ validUtil ++ validAfter ++ signature
  const userOpDataOverrides = {
    paymasterAndData : "0x7915e08ec9e1e4b08b1ac0b086a568fe5d3ba3220000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006575be1f4c481015739ec1d4dc5626458b185615a9785328f30aedd702e45ad7870dd89d6ee47f11635fde40f0a403d31c66de649f520140c71ed2fb17171f262b312d301b",
    maxFeePerGas: 233879061166n,
    maxPriorityFeePerGas:10000000,
    callGasLimit:9100,
    verificationGasLimit:102877,
    preVerificationGas:48312,
  }

  return userOpDataOverrides;
};

provider.withPaymasterMiddleware({
  dummyPaymasterDataMiddleware: DummyPaymasterDataMiddlewareOverrideFunction,
  paymasterDataMiddleware: PaymasterDataMiddlewareOverrideFunction,
});


const userOpData = {
  target: targetAddress, // Replace with the desired target address
  data: "0x0", // Replace with the desired call data
  value: 0n,
};


const resultingUO  = await provider.buildUserOperation(userOpData);
console.log("Sending UserOperation: ", resultingUO);

// Send a user operation from your smart contract account
const opHashResult = await provider.sendUserOperation(userOpData);
console.log("Resulting UserOperation: ", opHashResult); // Log the user operation hash
console.log(`Checkout https://jiffyscan.xyz/userOpHash/${opHashResult.hash}?network=${chain.name}`)



const txHash = await provider.waitForUserOperationTransaction(opHashResult.hash);
console.log(`Transaction Hash: ${txHash}`);







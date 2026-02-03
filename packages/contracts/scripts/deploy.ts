import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import { join } from "path";

// USDC addresses for Base networks
const USDC_ADDRESSES = {
  baseSepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia USDC
  baseMainnet: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base Mainnet USDC
};

interface DeploymentResult {
  network: string;
  chainId: number;
  skillRegistry: string;
  paymentEscrow: string;
  marketplace: string;
  usdc: string;
  timestamp: string;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🚀 Deploying ClawOS contracts...");
  console.log("📍 Deployer:", deployer.address);
  
  // Get network information
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "hardhat" : network.name;
  const chainId = Number(network.chainId);
  
  console.log("🔗 Network:", networkName);
  console.log("🆔 Chain ID:", chainId);
  
  // Determine USDC address
  let usdcAddress: string;
  if (chainId === 84532) {
    usdcAddress = USDC_ADDRESSES.baseSepolia;
  } else if (chainId === 8453) {
    usdcAddress = USDC_ADDRESSES.baseMainnet;
  } else {
    // For local testing, deploy a mock USDC
    console.log("📋 Deploying Mock USDC for local testing...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
    await mockUSDC.waitForDeployment();
    usdcAddress = await mockUSDC.getAddress();
    console.log("✅ Mock USDC deployed to:", usdcAddress);
  }
  
  console.log("💵 USDC Address:", usdcAddress);
  
  // Deploy SkillRegistry
  console.log("\n📋 Deploying SkillRegistry...");
  const SkillRegistry = await ethers.getContractFactory("SkillRegistry");
  const skillRegistry = await SkillRegistry.deploy();
  await skillRegistry.waitForDeployment();
  const skillRegistryAddress = await skillRegistry.getAddress();
  console.log("✅ SkillRegistry deployed to:", skillRegistryAddress);
  
  // Deploy PaymentEscrow (needs marketplace address, so we'll update later)
  console.log("\n📋 Deploying PaymentEscrow...");
  // For now, use deployer as marketplace, will update after marketplace deployment
  const PaymentEscrow = await ethers.getContractFactory("PaymentEscrow");
  const paymentEscrow = await PaymentEscrow.deploy(
    usdcAddress,
    deployer.address, // fee recipient
    deployer.address  // temporary marketplace address
  );
  await paymentEscrow.waitForDeployment();
  const paymentEscrowAddress = await paymentEscrow.getAddress();
  console.log("✅ PaymentEscrow deployed to:", paymentEscrowAddress);
  
  // Deploy ClawOSMarketplace
  console.log("\n📋 Deploying ClawOSMarketplace...");
  const ClawOSMarketplace = await ethers.getContractFactory("ClawOSMarketplace");
  const marketplace = await ClawOSMarketplace.deploy(
    skillRegistryAddress,
    paymentEscrowAddress,
    deployer.address // fee recipient
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("✅ ClawOSMarketplace deployed to:", marketplaceAddress);
  
  // Update PaymentEscrow with correct marketplace address
  console.log("\n📋 Updating PaymentEscrow marketplace address...");
  await (await paymentEscrow.setMarketplace(marketplaceAddress)).wait();
  console.log("✅ PaymentEscrow marketplace address updated");
  
  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  
  // Set platform fee to 2.5%
  const platformFee = await marketplace.platformFeeBps();
  console.log("📊 Platform Fee:", platformFee.toString(), "bps (2.5%)");
  
  // Get USDC from PaymentEscrow
  const escrowUSDC = await paymentEscrow.usdc();
  console.log("💵 PaymentEscrow USDC:", escrowUSDC);
  
  // Save deployment info
  const deployment: DeploymentResult = {
    network: networkName,
    chainId,
    skillRegistry: skillRegistryAddress,
    paymentEscrow: paymentEscrowAddress,
    marketplace: marketplaceAddress,
    usdc: usdcAddress,
    timestamp: new Date().toISOString(),
  };
  
  // Save to file
  const deploymentsDir = join(__dirname, "..", "deployments");
  const fs = require("fs");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const filename = `deployment-${networkName}-${Date.now()}.json`;
  const filepath = join(deploymentsDir, filename);
  writeFileSync(filepath, JSON.stringify(deployment, null, 2));
  
  // Also save as latest
  const latestFilepath = join(deploymentsDir, `deployment-${networkName}-latest.json`);
  writeFileSync(latestFilepath, JSON.stringify(deployment, null, 2));
  
  console.log("\n💾 Deployment info saved to:", filepath);
  console.log("📄 Latest deployment saved to:", latestFilepath);
  
  console.log("\n🎉 Deployment complete!");
  console.log("\n📋 Contract Addresses:");
  console.log("  SkillRegistry:", skillRegistryAddress);
  console.log("  PaymentEscrow:", paymentEscrowAddress);
  console.log("  ClawOSMarketplace:", marketplaceAddress);
  console.log("  USDC:", usdcAddress);
  
  // Output for environment variables
  console.log("\n🔧 Environment Variables:");
  console.log(`VITE_BASE_SKILL_REGISTRY=${skillRegistryAddress}`);
  console.log(`VITE_BASE_PAYMENT_ESCROW=${paymentEscrowAddress}`);
  console.log(`VITE_BASE_MARKETPLACE=${marketplaceAddress}`);
  console.log(`VITE_BASE_USDC=${usdcAddress}`);
  console.log(`VITE_BASE_CHAIN_ID=${chainId}`);
  
  return deployment;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

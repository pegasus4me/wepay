import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    // 1. Deploy Forwarder
    console.log("Deploying WeppoForwarder...");
    const Forwarder = await ethers.getContractFactory("WeppoForwarder");
    const forwarder = await Forwarder.deploy();
    await forwarder.waitForDeployment();
    const forwarderAddress = await forwarder.getAddress();
    console.log(`MinimalForwarder deployed to: ${forwarderAddress}`);

    // 2. Deploy Weppo
    console.log("Deploying Weppo...");
    const usdcAddress = process.env.USDC_CONTRACT_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia default
    const Weppo = await ethers.getContractFactory("Weppo");
    const weppo = await Weppo.deploy(usdcAddress, forwarderAddress);
    await weppo.waitForDeployment();
    const weppoAddress = await weppo.getAddress();
    console.log(`Weppo deployed to: ${weppoAddress}`);

    // 3. Deploy MerchantGateway
    console.log("Deploying MerchantGateway...");
    const MerchantGateway = await ethers.getContractFactory("MerchantGateway");
    const merchantGateway = await MerchantGateway.deploy(usdcAddress);
    await merchantGateway.waitForDeployment();
    const gatewayAddress = await merchantGateway.getAddress();
    console.log(`MerchantGateway deployed to: ${gatewayAddress}`);

    console.log("\n--- Deployment Summary ---");
    console.log(`Forwarder: ${forwarderAddress}`);
    console.log(`Weppo: ${weppoAddress}`);
    console.log(`MerchantGateway: ${gatewayAddress}`);

    console.log("\nDon't forget to update your .env file in 'api' package with these addresses!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

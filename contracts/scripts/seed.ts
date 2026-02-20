import { ethers } from "hardhat";

async function main() {
    const gatewayAddress = "0xEF822A6b8960041C069800F6dd9D4E370f2C9047";
    const MerchantGateway = await ethers.getContractAt("MerchantGateway", gatewayAddress);

    console.log(`Setting product 1234 on MerchantGateway at ${gatewayAddress}...`);

    // Product ID: 1234, Name: "Test API Call", Price: 0.1 USDC (6 decimals = 100000)
    const tx = await MerchantGateway.setProduct(1234, "Test API Call", 100000);
    await tx.wait();

    console.log("Product 1234 seeded successfully!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

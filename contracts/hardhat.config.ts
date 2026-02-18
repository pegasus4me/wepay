import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: '../api/.env' }); // Load .env from api directory (or root if needed)

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0000000000000000000000000000000000000000000000000000000000000000";

const config: HardhatUserConfig = {
    solidity: "0.8.20",
    paths: {
        sources: "./src",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    },
    networks: {
        baseSepolia: {
            url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
            accounts: [PRIVATE_KEY],
        },
    },
};

export default config;

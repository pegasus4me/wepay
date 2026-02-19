import { expect } from "chai";
import { ethers } from "hardhat";
import { Weppo, MockERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Weppo", function () {
    let weppo: Weppo;
    let usdc: MockERC20;
    let owner: SignerWithAddress;
    let agentA: SignerWithAddress;
    let agentB: SignerWithAddress;
    let forwarder: SignerWithAddress;

    beforeEach(async function () {
        [owner, agentA, agentB, forwarder] = await ethers.getSigners();

        // Deploy Mock USDC
        const MockERC20Factory = await ethers.getContractFactory("MockERC20");
        usdc = (await MockERC20Factory.deploy("USDC", "USDC")) as MockERC20;
        await usdc.waitForDeployment();

        // Deploy Weppo
        const WeppoFactory = await ethers.getContractFactory("Weppo");
        weppo = (await WeppoFactory.deploy(await usdc.getAddress(), forwarder.address)) as Weppo;
        await weppo.waitForDeployment();

        // Mint USDC to Agent A
        await usdc.mint(agentA.address, ethers.parseUnits("100", 18));
    });

    it("Should allow deposits", async function () {
        const amount = ethers.parseUnits("50", 18);

        // Approve Weppo to spend Agent A's USDC
        await usdc.connect(agentA).approve(await weppo.getAddress(), amount);

        // Deposit
        await expect(weppo.connect(agentA).deposit(amount))
            .to.emit(weppo, "Deposit")
            .withArgs(agentA.address, amount);

        expect(await weppo.balances(agentA.address)).to.equal(amount);
    });

    it("Should allow withdrawals", async function () {
        const amount = ethers.parseUnits("50", 18);
        await usdc.connect(agentA).approve(await weppo.getAddress(), amount);
        await weppo.connect(agentA).deposit(amount);

        const withdrawAmount = ethers.parseUnits("20", 18);
        await expect(weppo.connect(agentA).withdraw(withdrawAmount))
            .to.emit(weppo, "Withdrawal")
            .withArgs(agentA.address, withdrawAmount);

        expect(await weppo.balances(agentA.address)).to.equal(amount - withdrawAmount);
        expect(await usdc.balanceOf(agentA.address)).to.equal(ethers.parseUnits("70", 18)); // 100 - 50 + 20
    });

    it("Should handle pre-authorization and charges", async function () {
        const depositAmount = ethers.parseUnits("50", 18);
        await usdc.connect(agentA).approve(await weppo.getAddress(), depositAmount);
        await weppo.connect(agentA).deposit(depositAmount);

        const chargeAmount = ethers.parseUnits("5", 18);
        const maxAmount = ethers.parseUnits("10", 18);

        // Agent A authorizes Agent B
        await expect(weppo.connect(agentA).preAuthorize(agentB.address, maxAmount))
            .to.emit(weppo, "Approval")
            .withArgs(agentA.address, agentB.address, maxAmount);

        expect(await weppo.allowances(agentA.address, agentB.address)).to.equal(maxAmount);

        // Agent B charges Agent A
        await expect(weppo.connect(agentB).charge(agentA.address, chargeAmount, "Service Payment"))
            .to.emit(weppo, "Settlement")
            .withArgs(agentA.address, agentB.address, chargeAmount, "Service Payment");

        // Verify balances
        expect(await weppo.balances(agentA.address)).to.equal(depositAmount - chargeAmount);
        expect(await weppo.balances(agentB.address)).to.equal(chargeAmount);

        // Verify remaining allowance
        expect(await weppo.allowances(agentA.address, agentB.address)).to.equal(maxAmount - chargeAmount);
    });

    it("Should fail charge if not authorized", async function () {
        const depositAmount = ethers.parseUnits("50", 18);
        await usdc.connect(agentA).approve(await weppo.getAddress(), depositAmount);
        await weppo.connect(agentA).deposit(depositAmount);

        const chargeAmount = ethers.parseUnits("5", 18);

        await expect(
            weppo.connect(agentB).charge(agentA.address, chargeAmount, "Unauthorized")
        ).to.be.revertedWith("Insufficient allowance");
    });

    it("Should fail charge if insufficient balance", async function () {
        const depositAmount = ethers.parseUnits("1", 18);
        await usdc.connect(agentA).approve(await weppo.getAddress(), depositAmount);
        await weppo.connect(agentA).deposit(depositAmount);

        const maxAmount = ethers.parseUnits("10", 18);
        await weppo.connect(agentA).preAuthorize(agentB.address, maxAmount);

        const chargeAmount = ethers.parseUnits("5", 18); // More than balance

        await expect(
            weppo.connect(agentB).charge(agentA.address, chargeAmount, "Overdraft")
        ).to.be.revertedWith("Insufficient balance");
    });
});

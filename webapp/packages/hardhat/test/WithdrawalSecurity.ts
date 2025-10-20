import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { LangDAO } from "../typechain-types";
import { MockERC20 } from "../typechain-types";

describe("Withdrawal Security (isStudying Protection)", function () {
  let langDAO: LangDAO;
  let token: MockERC20;
  let owner: SignerWithAddress;
  let securityStudent: SignerWithAddress;
  let securityTutor: SignerWithAddress;

  // Language IDs for testing
  const ENGLISH = 1;
  const SPANISH = 2;

  before(async () => {
    [owner] = await ethers.getSigners();

    // Deploy LangDAO contract
    const langDAOFactory = await ethers.getContractFactory("LangDAO");
    langDAO = (await langDAOFactory.deploy(owner.address)) as LangDAO;
    await langDAO.waitForDeployment();

    // Deploy a mock ERC20 token for testing
    const tokenFactory = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
    token = await tokenFactory.deploy("Test Token", "TEST", ethers.parseEther("1000000"));
    await token.waitForDeployment();
  });

  beforeEach(async function () {
    // Create fresh wallets for security testing
    securityStudent = ethers.Wallet.createRandom().connect(ethers.provider);
    securityTutor = ethers.Wallet.createRandom().connect(ethers.provider);

    // Fund the wallets
    await owner.sendTransaction({
      to: securityStudent.address,
      value: ethers.parseEther("1"),
    });
    await owner.sendTransaction({
      to: securityTutor.address,
      value: ethers.parseEther("1"),
    });

    // Give tokens to security student
    await token.transfer(securityStudent.address, ethers.parseEther("1000"));

    // Register both users
    await langDAO.connect(securityStudent).registerStudent(ENGLISH, ethers.parseEther("0.01"));
    await langDAO.connect(securityTutor).registerTutor([ENGLISH], ethers.parseEther("0.001"));

    // Student deposits funds
    await token.connect(securityStudent).approve(await langDAO.getAddress(), ethers.parseEther("1000"));
    await langDAO.connect(securityStudent).depositFunds(await token.getAddress(), ethers.parseEther("1000"));
  });

  it("Should allow student to withdraw funds when not studying", async function () {
    const initialStudentBalance = await token.balanceOf(securityStudent.address);
    const initialContractBalance = await langDAO.studentBalances(securityStudent.address, await token.getAddress());

    // Withdraw some funds
    await langDAO.connect(securityStudent).withdrawFunds(await token.getAddress(), ethers.parseEther("100"));

    const finalStudentBalance = await token.balanceOf(securityStudent.address);
    const finalContractBalance = await langDAO.studentBalances(securityStudent.address, await token.getAddress());

    expect(finalStudentBalance).to.equal(initialStudentBalance + ethers.parseEther("100"));
    expect(finalContractBalance).to.equal(initialContractBalance - ethers.parseEther("100"));
  });

  it("Should prevent student from withdrawing funds during active session", async function () {
    // Start a session
    await langDAO.connect(securityStudent).startSession(securityTutor.address, ENGLISH, await token.getAddress());

    // Try to withdraw funds while studying - should fail
    await expect(
      langDAO.connect(securityStudent).withdrawFunds(await token.getAddress(), ethers.parseEther("100")),
    ).to.be.revertedWith("Student is studying");

    // Verify funds are still locked in contract
    const contractBalance = await langDAO.studentBalances(securityStudent.address, await token.getAddress());
    expect(contractBalance).to.equal(ethers.parseEther("1000"));
  });

  it("Should allow student to withdraw funds after session ends", async function () {
    // Start a session
    await langDAO.connect(securityStudent).startSession(securityTutor.address, ENGLISH, await token.getAddress());

    // Verify student is studying
    const isStudyingBefore = await langDAO.isStudying(securityStudent.address);
    expect(isStudyingBefore).to.be.true;

    // Verify session is active
    const activeSession = await langDAO.activeSessions(securityTutor.address);
    expect(activeSession.isActive).to.be.true;

    // Wait a bit to simulate session duration
    await new Promise(resolve => setTimeout(resolve, 1000));

    // End the session
    await langDAO.connect(securityStudent).endSession(securityTutor.address);

    // Verify student is no longer studying
    const isStudyingAfter = await langDAO.isStudying(securityStudent.address);
    expect(isStudyingAfter).to.be.false;

    // Now should be able to withdraw funds
    const initialStudentBalance = await token.balanceOf(securityStudent.address);
    const initialContractBalance = await langDAO.studentBalances(securityStudent.address, await token.getAddress());

    await langDAO.connect(securityStudent).withdrawFunds(await token.getAddress(), ethers.parseEther("100"));

    const finalStudentBalance = await token.balanceOf(securityStudent.address);
    const finalContractBalance = await langDAO.studentBalances(securityStudent.address, await token.getAddress());

    expect(finalStudentBalance).to.be.gt(initialStudentBalance);
    expect(finalContractBalance).to.be.lt(initialContractBalance);
  });

  it("Should prevent withdrawal of more funds than available", async function () {
    const contractBalance = await langDAO.studentBalances(securityStudent.address, await token.getAddress());

    await expect(
      langDAO
        .connect(securityStudent)
        .withdrawFunds(await token.getAddress(), contractBalance + ethers.parseEther("1")),
    ).to.be.revertedWith("Insufficient balance");
  });

  it("Should allow partial withdrawal of available funds", async function () {
    const initialContractBalance = await langDAO.studentBalances(securityStudent.address, await token.getAddress());
    const withdrawAmount = ethers.parseEther("500");

    await langDAO.connect(securityStudent).withdrawFunds(await token.getAddress(), withdrawAmount);

    const finalContractBalance = await langDAO.studentBalances(securityStudent.address, await token.getAddress());
    expect(finalContractBalance).to.equal(initialContractBalance - withdrawAmount);
  });

  it("Should emit FundsWithdrawn event", async function () {
    const withdrawAmount = ethers.parseEther("100");

    await expect(langDAO.connect(securityStudent).withdrawFunds(await token.getAddress(), withdrawAmount))
      .to.emit(langDAO, "FundsWithdrawn")
      .withArgs(securityStudent.address, await token.getAddress(), withdrawAmount);
  });

  it("Should prevent unregistered user from withdrawing funds", async function () {
    const unregisteredUser = ethers.Wallet.createRandom().connect(ethers.provider);

    await owner.sendTransaction({
      to: unregisteredUser.address,
      value: ethers.parseEther("1"),
    });

    await expect(
      langDAO.connect(unregisteredUser).withdrawFunds(await token.getAddress(), ethers.parseEther("100")),
    ).to.be.revertedWith("User not registered");
  });
});

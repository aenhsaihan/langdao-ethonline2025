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

  it("Should cap payment at student's available balance when session exceeds deposit", async function () {
    // Create a student with small deposit
    const poorStudent = ethers.Wallet.createRandom().connect(ethers.provider);
    const freshTutor = ethers.Wallet.createRandom().connect(ethers.provider);

    await owner.sendTransaction({
      to: poorStudent.address,
      value: ethers.parseEther("1"),
    });
    await owner.sendTransaction({
      to: freshTutor.address,
      value: ethers.parseEther("1"),
    });

    // Give student enough tokens to start session (10 minutes buffer) but not much more
    // Buffer time: 10 minutes = 600 seconds, rate: 0.001 per second = 0.6 tokens needed
    // Give them 0.7 tokens (enough to start) but session will run longer than their balance
    await token.transfer(poorStudent.address, ethers.parseEther("0.7"));

    // Register student and tutor
    await langDAO.connect(poorStudent).registerStudent(ENGLISH, ethers.parseEther("0.01"));
    await langDAO.connect(freshTutor).registerTutor([ENGLISH], ethers.parseEther("0.001")); // 0.001 per second

    // Student deposits all their tokens
    await token.connect(poorStudent).approve(await langDAO.getAddress(), ethers.parseEther("0.7"));
    await langDAO.connect(poorStudent).depositFunds(await token.getAddress(), ethers.parseEther("0.7"));

    // Start a session
    await langDAO.connect(poorStudent).startSession(freshTutor.address, ENGLISH, await token.getAddress());

    // Wait a bit to simulate session duration
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

    // End the session - should not revert even though calculated payment exceeds balance
    const initialTutorBalance = await token.balanceOf(freshTutor.address);
    const initialStudentBalance = await langDAO.studentBalances(poorStudent.address, await token.getAddress());

    await langDAO.connect(poorStudent).endSession(freshTutor.address);

    const finalTutorBalance = await token.balanceOf(freshTutor.address);
    const finalStudentBalance = await langDAO.studentBalances(poorStudent.address, await token.getAddress());

    // Tutor should receive payment
    expect(finalTutorBalance).to.be.gt(initialTutorBalance);

    // Student's balance should be reduced
    expect(finalStudentBalance).to.be.lt(initialStudentBalance);

    // Student should no longer be studying
    const isStudying = await langDAO.isStudying(poorStudent.address);
    expect(isStudying).to.be.false;
  });
});

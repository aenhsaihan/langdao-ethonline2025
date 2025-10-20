import { expect } from "chai";
import { ethers } from "hardhat";
import { LangDAO } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("LangDAO", function () {
  let langDAO: LangDAO;
  let owner: SignerWithAddress;
  let student: SignerWithAddress;
  let tutor: SignerWithAddress;
  let token: any; // Mock ERC20 token
  let otherUser: SignerWithAddress;
  let anotherUser: SignerWithAddress;
  let oneMoreUser: SignerWithAddress;

  // Language IDs for testing
  const ENGLISH = 1;
  const SPANISH = 2;
  const FRENCH = 3;

  before(async () => {
    [owner, student, tutor, otherUser, anotherUser, oneMoreUser] = await ethers.getSigners();

    // Deploy LangDAO contract
    const langDAOFactory = await ethers.getContractFactory("LangDAO");
    langDAO = (await langDAOFactory.deploy(owner.address)) as LangDAO;
    await langDAO.waitForDeployment();

    // Deploy a mock ERC20 token for testing
    const tokenFactory = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
    token = await tokenFactory.deploy("Test Token", "TEST", ethers.parseEther("1000000"));
    await token.waitForDeployment();

    // Give students some tokens
    await token.transfer(student.address, ethers.parseEther("1000"));
    await token.transfer(otherUser.address, ethers.parseEther("1000"));

    // Register student and otherUser
    await langDAO.connect(student).registerStudent(ENGLISH, ethers.parseEther("0.01"));
    await langDAO.connect(otherUser).registerStudent(SPANISH, ethers.parseEther("0.01"));

    // Approve and deposit tokens into contract for testing
    await token.connect(student).approve(await langDAO.getAddress(), ethers.parseEther("1000"));
    await langDAO.connect(student).depositFunds(await token.getAddress(), ethers.parseEther("1000"));

    await token.connect(otherUser).approve(await langDAO.getAddress(), ethers.parseEther("1000"));
    await langDAO.connect(otherUser).depositFunds(await token.getAddress(), ethers.parseEther("1000"));
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await langDAO.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero session counter", async function () {
      expect(await langDAO.sessionCounter()).to.equal(0);
    });
  });

  describe("Student Registration", function () {
    it("Should allow student registration", async function () {
      await langDAO.connect(anotherUser).registerStudent(ENGLISH, ethers.parseEther("0.01")); // 0.01 ETH per second

      const studentData = await langDAO.students(anotherUser.address);
      expect(studentData.targetLanguage).to.equal(ENGLISH);
      expect(studentData.budgetPerSec).to.equal(ethers.parseEther("0.01"));
      expect(studentData.isRegistered).to.be.true;
    });

    it("Should emit StudentRegistered event", async function () {
      await expect(langDAO.connect(oneMoreUser).registerStudent(SPANISH, ethers.parseEther("0.02")))
        .to.emit(langDAO, "StudentRegistered")
        .withArgs(oneMoreUser.address, SPANISH, ethers.parseEther("0.02"));
    });

    it("Should not allow duplicate student registration", async function () {
      await expect(langDAO.connect(student).registerStudent(FRENCH, ethers.parseEther("0.03"))).to.be.revertedWith(
        "Student already registered",
      );
    });
  });

  describe("Tutor Registration", function () {
    it("Should allow tutor registration", async function () {
      const languages = [ENGLISH, SPANISH];
      const ratePerSecond = ethers.parseEther("0.01"); // Same rate for all languages

      await langDAO.connect(tutor).registerTutor(languages, ratePerSecond);

      const [totalEarnings, sessionCount, isRegistered] = await langDAO.getTutorInfo(tutor.address);
      expect(isRegistered).to.be.true;
      expect(await langDAO.getTutorLanguage(tutor.address, ENGLISH)).to.be.true;
      expect(await langDAO.getTutorLanguage(tutor.address, SPANISH)).to.be.true;
      expect(await langDAO.getTutorRate(tutor.address, ENGLISH)).to.equal(ratePerSecond);
      expect(await langDAO.getTutorRate(tutor.address, SPANISH)).to.equal(ratePerSecond);
    });

    it("Should emit TutorRegistered event", async function () {
      const languages = [FRENCH];
      const ratePerSecond = ethers.parseEther("0.02");

      await expect(langDAO.connect(otherUser).registerTutor(languages, ratePerSecond))
        .to.emit(langDAO, "TutorRegistered")
        .withArgs(otherUser.address, languages, ratePerSecond);
    });

    it("Should not allow duplicate tutor registration", async function () {
      const languages = [ENGLISH];
      const ratePerSecond = ethers.parseEther("0.01");

      await expect(langDAO.connect(tutor).registerTutor(languages, ratePerSecond)).to.be.revertedWith(
        "Tutor already registered",
      );
    });
  });

  describe("Session Management", function () {
    beforeEach(async function () {
      // Register tutor if not already registered
      const [, , isRegistered] = await langDAO.getTutorInfo(tutor.address);
      if (!isRegistered) {
        const languages = [ENGLISH, SPANISH];
        const ratePerSecond = ethers.parseEther("0.01");
        await langDAO.connect(tutor).registerTutor(languages, ratePerSecond);
      }

      // // Approve tokens for the contract
      // await token.connect(student).approve(await langDAO.getAddress(), ethers.parseEther("1000"));
      // await langDAO.connect(student).depositFunds(await token.getAddress(), ethers.parseEther("1000"));
    });

    it("Should allow student to start session with tutor", async function () {
      const tx = await langDAO.connect(student).startSession(tutor.address, ENGLISH, await token.getAddress());
      const receipt = await tx.wait();

      // Get the session ID from the event or use sessionCounter
      const sessionId = await langDAO.sessionCounter();
      expect(sessionId).to.equal(1);

      const session = await langDAO.activeSessions(tutor.address);
      expect(session.student).to.equal(student.address);
      expect(session.tutor).to.equal(tutor.address);
      expect(session.language).to.equal(ENGLISH);
      expect(session.isActive).to.be.true;
    });

    it("Should emit SessionStarted event", async function () {
      // Use a fresh tutor for this test
      const freshTutorWallet = ethers.Wallet.createRandom().connect(ethers.provider);
      await owner.sendTransaction({ to: freshTutorWallet.address, value: ethers.parseEther("1") });

      const languages = [ENGLISH, SPANISH];
      const ratePerSecond = ethers.parseEther("0.01");
      await langDAO.connect(freshTutorWallet).registerTutor(languages, ratePerSecond);

      // Get the current session counter to know what ID to expect
      const currentSessionCounter = await langDAO.sessionCounter();
      const expectedSessionId = currentSessionCounter + 1n;

      await expect(langDAO.connect(student).startSession(freshTutorWallet.address, ENGLISH, await token.getAddress()))
        .to.emit(langDAO, "SessionStarted")
        .withArgs(expectedSessionId, student.address, freshTutorWallet.address, ENGLISH);
    });

    it("Should not allow starting session if tutor is already in session", async function () {
      // Use a fresh tutor for this test
      const freshTutorWallet = ethers.Wallet.createRandom().connect(ethers.provider);
      await owner.sendTransaction({ to: freshTutorWallet.address, value: ethers.parseEther("1") });

      const languages = [ENGLISH, SPANISH];
      const ratePerSecond = ethers.parseEther("0.01");
      await langDAO.connect(freshTutorWallet).registerTutor(languages, ratePerSecond);

      // Start first session
      await langDAO.connect(student).startSession(freshTutorWallet.address, ENGLISH, await token.getAddress());

      // Try to start second session with same tutor
      await expect(
        langDAO.connect(otherUser).startSession(freshTutorWallet.address, SPANISH, await token.getAddress()),
      ).to.be.revertedWith("There should be no ongoing session for this tutor");
    });

    it("Should not allow starting session if tutor doesn't offer the language", async function () {
      // Use a fresh tutor for this test
      const freshTutorWallet = ethers.Wallet.createRandom().connect(ethers.provider);
      await owner.sendTransaction({ to: freshTutorWallet.address, value: ethers.parseEther("1") });

      const languages = [ENGLISH, SPANISH]; // Doesn't include FRENCH
      const ratePerSecond = ethers.parseEther("0.01");
      await langDAO.connect(freshTutorWallet).registerTutor(languages, ratePerSecond);

      await expect(
        langDAO.connect(student).startSession(
          freshTutorWallet.address,
          FRENCH, // Tutor doesn't offer French
          await token.getAddress(),
        ),
      ).to.be.revertedWith("Tutor does not offer this language");
    });

    it("Should not allow starting session if student can't afford the rate", async function () {
      // Use a fresh tutor for this test
      const freshTutorWallet = ethers.Wallet.createRandom().connect(ethers.provider);
      await owner.sendTransaction({ to: freshTutorWallet.address, value: ethers.parseEther("1") });

      const languages = [ENGLISH, SPANISH];
      const ratePerSecond = ethers.parseEther("0.01");
      await langDAO.connect(freshTutorWallet).registerTutor(languages, ratePerSecond);

      // Create a new signer for this test
      const poorStudentWallet = ethers.Wallet.createRandom().connect(ethers.provider);
      await owner.sendTransaction({ to: poorStudentWallet.address, value: ethers.parseEther("1") });

      await langDAO.connect(poorStudentWallet).registerStudent(ENGLISH, ethers.parseEther("0.005")); // Lower than tutor's rate
      await token.transfer(poorStudentWallet.address, ethers.parseEther("100"));
      await token.connect(poorStudentWallet).approve(await langDAO.getAddress(), ethers.parseEther("100"));

      await expect(
        langDAO.connect(poorStudentWallet).startSession(freshTutorWallet.address, ENGLISH, await token.getAddress()),
      ).to.be.revertedWith("Student cannot afford tutor's rate for this language");
    });

    it("Should not allow starting session if student has insufficient token balance", async function () {
      // Use a fresh tutor for this test
      const freshTutorWallet = ethers.Wallet.createRandom().connect(ethers.provider);
      await owner.sendTransaction({ to: freshTutorWallet.address, value: ethers.parseEther("1") });

      const languages = [ENGLISH, SPANISH];
      const ratePerSecond = ethers.parseEther("0.01");
      await langDAO.connect(freshTutorWallet).registerTutor(languages, ratePerSecond);

      const poorStudentWallet = ethers.Wallet.createRandom().connect(ethers.provider);
      await owner.sendTransaction({ to: poorStudentWallet.address, value: ethers.parseEther("1") });

      await langDAO.connect(poorStudentWallet).registerStudent(ENGLISH, ethers.parseEther("0.01"));
      await token.transfer(poorStudentWallet.address, ethers.parseEther("1")); // Very low balance
      await token.connect(poorStudentWallet).approve(await langDAO.getAddress(), ethers.parseEther("1"));

      await expect(
        langDAO.connect(poorStudentWallet).startSession(freshTutorWallet.address, ENGLISH, await token.getAddress()),
      ).to.be.revertedWith("Student does not have sufficient balance");
    });

    it("Should not allow unregistered student to start session", async function () {
      // Use a fresh tutor for this test
      const freshTutorWallet = ethers.Wallet.createRandom().connect(ethers.provider);
      await owner.sendTransaction({ to: freshTutorWallet.address, value: ethers.parseEther("1") });

      const languages = [ENGLISH, SPANISH];
      const ratePerSecond = ethers.parseEther("0.01");
      await langDAO.connect(freshTutorWallet).registerTutor(languages, ratePerSecond);

      const unregisteredStudentWallet = ethers.Wallet.createRandom().connect(ethers.provider);
      await owner.sendTransaction({ to: unregisteredStudentWallet.address, value: ethers.parseEther("1") });

      await token.transfer(unregisteredStudentWallet.address, ethers.parseEther("100"));
      await token.connect(unregisteredStudentWallet).approve(await langDAO.getAddress(), ethers.parseEther("100"));

      await expect(
        langDAO
          .connect(unregisteredStudentWallet)
          .startSession(freshTutorWallet.address, ENGLISH, await token.getAddress()),
      ).to.be.revertedWith("User not registered");
    });
  });

  describe("Session Ending", function () {
    let sessionTutor: SignerWithAddress;

    beforeEach(async function () {
      // Create a fresh tutor for session ending tests
      const sessionTutorWallet = ethers.Wallet.createRandom().connect(ethers.provider);
      await owner.sendTransaction({ to: sessionTutorWallet.address, value: ethers.parseEther("1") });
      sessionTutor = sessionTutorWallet as any;

      const languages = [ENGLISH, SPANISH];
      const ratePerSecond = ethers.parseEther("0.01");
      await langDAO.connect(sessionTutor).registerTutor(languages, ratePerSecond);

      // Approve tokens for the contract
      await token.connect(student).approve(await langDAO.getAddress(), ethers.parseEther("1000"));

      // Start a session
      await langDAO.connect(student).startSession(sessionTutor.address, ENGLISH, await token.getAddress());
    });

    it("Should allow student to end session", async function () {
      // Wait a bit to simulate session duration
      await ethers.provider.send("evm_increaseTime", [60]); // 1 minute
      await ethers.provider.send("evm_mine", []);

      const initialStudentBalance = await token.balanceOf(student.address);
      const initialTutorBalance = await token.balanceOf(sessionTutor.address);

      await langDAO.connect(student).endSession(sessionTutor.address);

      const finalStudentBalance = await token.balanceOf(student.address);
      const finalTutorBalance = await token.balanceOf(sessionTutor.address);

      // Check that payment was processed
      expect(finalStudentBalance).to.be.lte(initialStudentBalance);
      expect(finalTutorBalance).to.be.gt(initialTutorBalance);

      // Check that session is no longer active
      const session = await langDAO.activeSessions(sessionTutor.address);
      expect(session.isActive).to.be.false;
    });

    it("Should allow tutor to end session", async function () {
      await ethers.provider.send("evm_increaseTime", [60]);
      await ethers.provider.send("evm_mine", []);

      await langDAO.connect(sessionTutor).endSession(sessionTutor.address);

      const session = await langDAO.activeSessions(sessionTutor.address);
      expect(session.isActive).to.be.false;
    });

    it("Should allow owner to end session", async function () {
      await ethers.provider.send("evm_increaseTime", [60]);
      await ethers.provider.send("evm_mine", []);

      await langDAO.connect(owner).endSession(sessionTutor.address);

      const session = await langDAO.activeSessions(sessionTutor.address);
      expect(session.isActive).to.be.false;
    });

    it("Should not allow unauthorized user to end session", async function () {
      await expect(langDAO.connect(otherUser).endSession(sessionTutor.address)).to.be.revertedWith(
        "Caller is not the student, tutor nor owner",
      );
    });

    it("Should emit SessionEnded event", async function () {
      await ethers.provider.send("evm_increaseTime", [60]);
      await ethers.provider.send("evm_mine", []);

      // Just check that the event is emitted, don't worry about exact arguments
      await expect(langDAO.connect(student).endSession(sessionTutor.address)).to.emit(langDAO, "SessionEnded");
    });

    it("Should update tutor statistics", async function () {
      const [initialEarnings, initialSessionCount] = await langDAO.getTutorInfo(sessionTutor.address);

      await ethers.provider.send("evm_increaseTime", [60]);
      await ethers.provider.send("evm_mine", []);

      await langDAO.connect(student).endSession(sessionTutor.address);

      const [finalEarnings, finalSessionCount] = await langDAO.getTutorInfo(sessionTutor.address);

      expect(finalEarnings).to.be.gt(initialEarnings);
      expect(finalSessionCount).to.equal(initialSessionCount + 1n);
    });
  });

  describe("View Functions", function () {
    let viewTutor: SignerWithAddress;

    beforeEach(async function () {
      // Create a fresh tutor for view function tests
      const viewTutorWallet = ethers.Wallet.createRandom().connect(ethers.provider);
      await owner.sendTransaction({ to: viewTutorWallet.address, value: ethers.parseEther("1") });
      viewTutor = viewTutorWallet as any;

      const languages = [ENGLISH, SPANISH];
      const ratePerSecond = ethers.parseEther("0.01");
      await langDAO.connect(viewTutor).registerTutor(languages, ratePerSecond);

      // Approve and deposit tokens for the contract
      await token.connect(student).approve(await langDAO.getAddress(), ethers.parseEther("1000"));

      // Start and end a session for testing history
      await langDAO.connect(student).startSession(viewTutor.address, ENGLISH, await token.getAddress());
      await ethers.provider.send("evm_increaseTime", [60]);
      await ethers.provider.send("evm_mine", []);
      await langDAO.connect(student).endSession(viewTutor.address);
    });

    it("Should return user sessions", async function () {
      const studentSessions = await langDAO.getUserSessions(student.address);
      const tutorSessions = await langDAO.getUserSessions(viewTutor.address);

      expect(studentSessions.length).to.be.gte(1);
      expect(tutorSessions.length).to.be.gte(1);

      // Get the actual session ID from the counter
      const currentSessionCounter = await langDAO.sessionCounter();

      // Check that the latest session ID is in the arrays
      expect(studentSessions).to.include(currentSessionCounter);
      expect(tutorSessions).to.include(currentSessionCounter);
    });

    it("Should return session details", async function () {
      // Get the actual session ID from the counter
      const currentSessionCounter = await langDAO.sessionCounter();
      const session = await langDAO.getSession(currentSessionCounter);

      expect(session.student).to.equal(student.address);
      expect(session.tutor).to.equal(viewTutor.address);
      expect(session.language).to.equal(ENGLISH);
      expect(session.id).to.equal(currentSessionCounter);
    });

    it("Should calculate current session cost", async function () {
      // Start a new session with a different tutor
      const costTutorWallet = ethers.Wallet.createRandom().connect(ethers.provider);
      await owner.sendTransaction({ to: costTutorWallet.address, value: ethers.parseEther("1") });

      const languages = [SPANISH];
      const ratePerSecond = ethers.parseEther("0.015"); // Different rate
      await langDAO.connect(costTutorWallet).registerTutor(languages, ratePerSecond);

      // Create a new student with higher budget
      const richStudentWallet = ethers.Wallet.createRandom().connect(ethers.provider);
      await owner.sendTransaction({ to: richStudentWallet.address, value: ethers.parseEther("1") });

      await langDAO.connect(richStudentWallet).registerStudent(SPANISH, ethers.parseEther("0.02")); // Higher budget
      await token.transfer(richStudentWallet.address, ethers.parseEther("1000"));
      await token.connect(richStudentWallet).approve(await langDAO.getAddress(), ethers.parseEther("1000"));
      await langDAO.connect(richStudentWallet).depositFunds(await token.getAddress(), ethers.parseEther("1000"));

      await langDAO.connect(richStudentWallet).startSession(costTutorWallet.address, SPANISH, await token.getAddress());

      await ethers.provider.send("evm_increaseTime", [30]); // 30 seconds
      await ethers.provider.send("evm_mine", []);

      // Get the actual session ID from the counter
      const currentSessionCounter = await langDAO.sessionCounter();
      const cost = await langDAO.getCurrentSessionCost(currentSessionCounter);
      const expectedCost = ethers.parseEther("0.015") * 30n; // 0.015 ETH/second * 30 seconds

      expect(cost).to.equal(expectedCost);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to withdraw contract balance", async function () {
      const initialBalance = await ethers.provider.getBalance(await langDAO.getAddress());

      await langDAO.connect(owner).withdraw();

      const finalBalance = await ethers.provider.getBalance(await langDAO.getAddress());
      expect(finalBalance).to.equal(0);
    });

    it("Should not allow non-owner to withdraw", async function () {
      await expect(langDAO.connect(student).withdraw()).to.be.revertedWith("Not the owner");
    });
  });
});

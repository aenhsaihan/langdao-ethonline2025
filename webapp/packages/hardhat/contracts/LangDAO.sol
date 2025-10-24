//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

// Useful for debugging. Remove when deploying to a live network.
import "hardhat/console.sol";

/**
 * LangDAO - Language Learning Platform Smart Contract
 *
 * This contract manages:
 * - User registration (students and tutors)
 * - Session lifecycle (start, track, end)
 * - Per-second payment processing
 * - Tutor availability management
 * - Session matching and history
 *
 * @author LangDAO Team
 */
interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(address from, address to, uint256 value) external returns (bool);

    function approve(address spender, uint256 value) external returns (bool);

    function allowance(address owner, address spender) external view returns (uint256);

    function balanceOf(address who) external view returns (uint256);
}

contract LangDAO {
    uint256 constant BUFFER_TIME = 10 minutes;

    // ============ STRUCTS ============
    struct Student {
        uint256 targetLanguage;
        uint256 budgetPerSec;
        bool isRegistered;
    }
    struct Tutor {
        mapping(uint256 language => bool) languages;
        mapping(uint256 language => uint256 ratePerSecond) rateForLanguage;
        uint256 totalEarnings; // Total earnings as tutor
        uint256 sessionCount; // Total sessions participated in
        bool isRegistered;
    }

    struct Session {
        address student;
        address tutor;
        address token;
        uint256 startTime;
        uint256 endTime;
        uint256 ratePerSecond;
        uint256 totalPaid;
        uint256 language; // Language being taught/learned
        uint256 id;
        bool isActive;
    }

    // ============ STATE VARIABLES ============
    address public immutable owner;
    uint256 public sessionCounter;

    // Mappings
    mapping(address student => mapping(address token => uint256 balance)) public studentBalances;
    mapping(address student => Student) public students;
    mapping(address tutor => Tutor) public tutors;
    mapping(address student => bool) public isStudying;
    mapping(address tutor => Session) public activeSessions;
    mapping(uint256 sessionId => Session) public sessionHistory;
    mapping(address user => uint256[] ids) public userSessions; // User's session IDs

    // ============ EVENTS ============

    event StudentRegistered(address indexed user, uint256 targetLanguage, uint256 budgetPerSec);
    event TutorRegistered(address indexed user, uint256[] languages, uint256 ratePerHour);
    event SessionStarted(uint256 indexed sessionId, address indexed student, address indexed tutor, uint256 language);
    event SessionEnded(uint256 indexed sessionId, address indexed tutorAddress, uint256 duration, uint256 totalPaid);
    event PaymentProcessed(address indexed from, address indexed to, uint256 amount);
    event FundsDeposited(address indexed user, address indexed token, uint256 amount);
    event FundsWithdrawn(address indexed user, address indexed token, uint256 amount);

    // ============ MODIFIERS ============

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    modifier onlyRegisteredStudents() {
        require(students[msg.sender].isRegistered, "User not registered");
        _;
    }

    modifier onlyRegisteredTutors() {
        require(tutors[msg.sender].isRegistered, "User not registered");
        _;
    }

    modifier onlyActiveSession(address tutorAddress) {
        require(activeSessions[tutorAddress].isActive, "Session not active");
        _;
    }

    // ============ CONSTRUCTOR ============
    constructor(address _owner) {
        owner = _owner;
    }

    // ============ USER MANAGEMENT ============

    /**
     * Register a new student
     * @param _targetLanguage Target language the student wants to learn
     * @param _budgetPerSec Budget per second the student is willing to spend
     */
    function registerStudent(uint256 _targetLanguage, uint256 _budgetPerSec) external {
        require(!students[msg.sender].isRegistered, "Student already registered");
        students[msg.sender].isRegistered = true;
        students[msg.sender].targetLanguage = _targetLanguage;
        students[msg.sender].budgetPerSec = _budgetPerSec;
        emit StudentRegistered(msg.sender, _targetLanguage, _budgetPerSec);
    }

    /**
     * Register a tutor
     * @param _languages Array of languages the user can teach/learn
     * @param _ratePerSecond Rate per hour (will be converted to per-second internally)
     */

    function registerTutor(uint256[] memory _languages, uint256 _ratePerSecond) external {
        require(!tutors[msg.sender].isRegistered, "Tutor already registered");
        tutors[msg.sender].isRegistered = true;

        for (uint256 i = 0; i < _languages.length; i++) {
            tutors[msg.sender].languages[_languages[i]] = true;
            tutors[msg.sender].rateForLanguage[_languages[i]] = _ratePerSecond;
        }

        emit TutorRegistered(msg.sender, _languages, _ratePerSecond);
    }

    /**
     * Update student's budget
     * @param _budgetPerSec Student budget per second
     */
    function updateBudget(uint256 _budgetPerSec) external onlyRegisteredStudents {
        students[msg.sender].budgetPerSec = _budgetPerSec;
    }

    /**
     * Update user's rate
     * @param _ratePerSecond New rate per hour
     */
    function updateRate(uint256 _language, uint256 _ratePerSecond) external onlyRegisteredTutors {
        require(tutors[msg.sender].languages[_language], "Tutor does not offer this language");
        tutors[msg.sender].rateForLanguage[_language] = _ratePerSecond;
    }

    // ============ FUNDS MANAGEMENT ============
    /**
     * Deposit funds into the contract
     * @param _token Token being deposited
     * @param _amount Amount of tokens to deposit
     */
    function depositFunds(address _token, uint256 _amount) external onlyRegisteredStudents {
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        studentBalances[msg.sender][_token] += _amount;
        emit FundsDeposited(msg.sender, _token, _amount);
    }

    /**
     * Withdraw funds from the contract
     * @param _token Token being withdrawn
     * @param _amount Amount of tokens to withdraw
     */
    function withdrawFunds(address _token, uint256 _amount) external onlyRegisteredStudents {
        require(!isStudying[msg.sender], "Student is studying");
        require(studentBalances[msg.sender][_token] >= _amount, "Insufficient balance");
        IERC20(_token).transfer(msg.sender, _amount);
        studentBalances[msg.sender][_token] -= _amount;
        emit FundsWithdrawn(msg.sender, _token, _amount);
    }

    // ============ SESSION MANAGEMENT ============

    /**
     * Start a new session between student and tutor
     * @notice The student has accepted the call from the tutor and the session is starting
     * @dev The student is submitting a transaction to accept the call from the tutor to start the session
     * @param _tutorAddress Address of the tutor
     * @param _language Language being taught/learned
     * @param _token Token being used for payment
     * @return sessionId The ID of the created session
     */
    function startSession(
        address _tutorAddress,
        uint256 _language,
        address _token
    ) external onlyRegisteredStudents returns (uint256) {
        require(!activeSessions[_tutorAddress].isActive, "There should be no ongoing session for this tutor");
        require(tutors[_tutorAddress].languages[_language], "Tutor does not offer this language");
        require(this.canAffordRate(msg.sender, _tutorAddress), "Student cannot afford tutor's rate for this language");
        require(
            this.hasSufficientBalance(msg.sender, _tutorAddress, _token),
            "Student does not have sufficient balance"
        );

        // - Create new session
        sessionCounter++;
        Session memory session = Session({
            student: msg.sender,
            tutor: _tutorAddress,
            token: _token,
            startTime: block.timestamp,
            endTime: 0,
            ratePerSecond: tutors[_tutorAddress].rateForLanguage[_language],
            totalPaid: 0,
            language: _language,
            id: sessionCounter,
            isActive: true
        });
        activeSessions[_tutorAddress] = session;
        isStudying[msg.sender] = true;

        sessionHistory[session.id] = session;
        userSessions[msg.sender].push(session.id);
        userSessions[_tutorAddress].push(session.id);

        // - Emit SessionStarted event
        emit SessionStarted(session.id, msg.sender, _tutorAddress, _language);

        return session.id;
    }

    /**
     * End an active session
     * @notice The session will be ended by the student or tutor hanging up the call or the owner ending the session
     * @dev The backend will end the call if heartbeat signal is not received possibly due to disconnection from the call
     * @param tutorAddress Tutor address of the session to end
     */
    function endSession(address tutorAddress) external onlyActiveSession(tutorAddress) {
        // - Validate caller is student, tutor, or authorized service
        require(
            msg.sender == activeSessions[tutorAddress].student ||
                msg.sender == activeSessions[tutorAddress].tutor ||
                msg.sender == owner,
            "Caller is not the student, tutor nor owner"
        );

        Session storage session = activeSessions[tutorAddress];

        // - Calculate total payment based on duration
        uint256 duration = block.timestamp - session.startTime;
        uint256 calculatedPayment = duration * session.ratePerSecond;

        // - Cap payment at student's available balance to prevent reverts
        uint256 availableBalance = studentBalances[session.student][session.token];
        uint256 totalPayment = calculatedPayment > availableBalance ? availableBalance : calculatedPayment;

        // Deduct from user's contract balance
        studentBalances[session.student][session.token] -= totalPayment;

        // Transfer from contract to tutor (guaranteed success)
        IERC20(session.token).transfer(session.tutor, totalPayment);

        // - Update session status and end time
        session.totalPaid += totalPayment;
        session.endTime = block.timestamp;

        // - Update user statistics
        Tutor storage tutor = tutors[session.tutor];
        tutor.totalEarnings += totalPayment;
        tutor.sessionCount++;

        // - Update session history
        session.isActive = false;
        sessionHistory[session.id] = session;

        emit SessionEnded(session.id, session.tutor, duration, totalPayment);

        // Reset student studying status before deleting session
        isStudying[session.student] = false;
        delete activeSessions[tutorAddress];
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * Get user's session history
     * @param _userAddress Address of the user
     * @return Array of session IDs
     */
    function getUserSessions(address _userAddress) external view returns (uint256[] memory) {
        return userSessions[_userAddress];
    }

    /**
     * Get session details
     * @param _sessionId ID of the session
     * @return Session struct with all details
     */
    function getSession(uint256 _sessionId) external view returns (Session memory) {
        return sessionHistory[_sessionId];
    }

    /**
     * Calculate current session cost
     * @param _sessionId ID of the active session
     * @return Current total cost in wei
     */
    function getCurrentSessionCost(uint256 _sessionId) external view returns (uint256) {
        Session memory session = sessionHistory[_sessionId];
        require(session.isActive, "Session is not active");

        uint256 duration = block.timestamp - session.startTime;
        return duration * session.ratePerSecond;
    }

    // ============ UTILITY FUNCTIONS ============

    /**
     * Check if student can afford tutor's rate
     * @param _studentAddress Address of the student
     * @param _tutorAddress Address of the tutor
     * @return True if student can afford tutor's rate
     */
    function canAffordRate(address _studentAddress, address _tutorAddress) external view returns (bool) {
        uint256 language = students[_studentAddress].targetLanguage;
        uint256 ratePerSecond = tutors[_tutorAddress].rateForLanguage[language];
        return students[_studentAddress].budgetPerSec >= ratePerSecond;
    }

    /**
     * Check if user has sufficient balance for session
     * @param _studentAddress Address of the user
     * @return True if user has sufficient balance
     */
    function hasSufficientBalance(
        address _studentAddress,
        address _tutorAddress,
        address _token
    ) external view returns (bool) {
        uint256 language = students[_studentAddress].targetLanguage;
        uint256 ratePerSecond = tutors[_tutorAddress].rateForLanguage[language];
        return studentBalances[_studentAddress][_token] >= ratePerSecond * BUFFER_TIME;
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * Emergency function to end any session (only owner)
     * @param _sessionId ID of the session to end
     */
    function emergencyEndSession(uint256 _sessionId) external onlyOwner {
        // TODO: Implement emergency session end
        // - Force end any session
        // - Process final payment
        // - Update all relevant state
    }

    /**
     * Withdraw contract balance (only owner)
     */
    function withdraw() external onlyOwner {
        // TODO: Implement owner withdrawal
        // - Allow owner to withdraw any accumulated fees
    }

    /**
     * Getter functions for tutor data
     */
    function getTutorLanguage(address _tutor, uint256 _language) external view returns (bool) {
        return tutors[_tutor].languages[_language];
    }

    function getTutorRate(address _tutor, uint256 _language) external view returns (uint256) {
        return tutors[_tutor].rateForLanguage[_language];
    }

    function getTutorInfo(
        address _tutor
    ) external view returns (uint256 totalEarnings, uint256 sessionCount, bool isRegistered) {
        return (tutors[_tutor].totalEarnings, tutors[_tutor].sessionCount, tutors[_tutor].isRegistered);
    }

    function getStudentInfo(
        address _student
    ) external view returns (uint256 targetLanguage, uint256 budgetPerSec, bool isRegistered) {
        return (students[_student].targetLanguage, students[_student].budgetPerSec, students[_student].isRegistered);
    }

    /**
     * Function to receive ETH
     */
    receive() external payable {}
}

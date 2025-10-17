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
    // ============ STRUCTS ============
    struct Tutor {
        uint256[] languages; // Languages they can teach/learn TODO: might not need this
        uint256 ratePerSecond; // Rate in wei per second
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
        bool isActive;
    }

    // ============ STATE VARIABLES ============
    address public immutable owner;
    uint256 public sessionCounter;
    uint256 public totalSessions;

    // Mappings
    mapping(address => Tutor) public tutors;
    mapping(address => Session) public sessions;
    // mapping(address => uint256[]) public userSessions; // User's session IDs

    // ============ EVENTS ============

    event TutorRegistered(address indexed user, uint256[] languages, uint256 ratePerHour);
    event SessionStarted(uint256 indexed sessionId, address indexed student, address indexed tutor, uint256 language);
    event SessionEnded(address indexed tutorAddress, uint256 duration, uint256 totalPaid);
    event PaymentProcessed(address indexed from, address indexed to, uint256 amount);

    // ============ MODIFIERS ============

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    modifier onlyRegisteredTutors() {
        require(tutors[msg.sender].isRegistered, "User not registered");
        _;
    }

    modifier onlyActiveSession(address tutorAddress) {
        require(sessions[tutorAddress].isActive, "Session not active");
        _;
    }

    // ============ CONSTRUCTOR ============
    constructor(address _owner) {
        owner = _owner;
    }

    // ============ USER MANAGEMENT ============

    /**
     * Register a new user (student, tutor, or both)
     * @param _languages Array of languages the user can teach/learn
     * @param _ratePerSecond Rate per hour (will be converted to per-second internally)
     */

    function registerTutor(uint256[] memory _languages, uint256 _ratePerSecond) external {
        require(!tutors[msg.sender].isRegistered, "Tutor already registered");
        tutors[msg.sender].isRegistered = true;
        tutors[msg.sender].ratePerSecond = _ratePerSecond;
        tutors[msg.sender].languages = _languages;

        emit TutorRegistered(msg.sender, _languages, _ratePerSecond);
    }

    // /**
    //  * Update user availability status
    //  * @param _status New availability status
    //  */
    // function updateAvailability(AvailabilityStatus _status) external onlyRegisteredUser {
    //     // TODO: Implement availability update logic
    //     // - Update user status
    //     // - Add/remove from available tutors list if they're a tutor
    //     // - Emit AvailabilityUpdated event
    // }

    /**
     * Update user's rate
     * @param _ratePerSecond New rate per hour
     */
    function updateRate(uint256 _ratePerSecond) external onlyRegisteredTutors {
        // TODO: Implement rate update logic
        // - Convert ratePerHour to ratePerSecond
        // - Update user's rate
    }

    // ============ SESSION MANAGEMENT ============

    /**
     * Start a new session between student and tutor
     * @param _studentAddress Address of the student
     * @param _language Language being taught/learned
     * @return sessionId The ID of the created session
     */

    // here, the tutor has received an incoming call from the student
    // they've accepted the call which means we are starting a session
    // which means we need the student's address as well
    function startSession(
        address _studentAddress,
        uint256 _language,
        address _token
    ) external onlyRegisteredTutors returns (uint256) {
        // TODO: Implement session start logic
        // - Validate tutor is available and registered
        // - Check if student has sufficient balance
        // uint256 buffer = 10 minutes;
        require(
            IERC20(_token).balanceOf(_studentAddress) >= tutors[msg.sender].ratePerSecond * 10 minutes,
            "Student does not have sufficient balance"
        );

        require(!sessions[msg.sender].isActive, "There should be no ongoing session for this tutor");
        // - Create new session
        sessions[msg.sender] = Session({
            student: _studentAddress,
            tutor: msg.sender,
            token: _token,
            startTime: block.timestamp,
            endTime: 0,
            ratePerSecond: tutors[msg.sender].ratePerSecond,
            totalPaid: 0,
            language: _language,
            isActive: true
        });

        // - Emit SessionStarted event
        sessionCounter++;
        emit SessionStarted(sessionCounter, _studentAddress, msg.sender, _language);

        return sessionCounter;
        // - Return session ID
    }

    /**
     * End an active session
     * @param tutorAddress Tutor address of the session to end
     */

    // here the student or tutor has hung up the call
    // or student/tutor were disconnected, and our system has ended the session
    function endSession(address tutorAddress) external onlyActiveSession(tutorAddress) {
        // - Validate caller is student, tutor, or authorized service
        require(
            msg.sender == sessions[tutorAddress].student ||
                msg.sender == sessions[tutorAddress].tutor ||
                msg.sender == owner,
            "Caller is not the student, tutor nor owner"
        );

        Session storage session = sessions[tutorAddress];
        // - Calculate total payment based on duration
        uint256 duration = block.timestamp - session.startTime;
        uint256 totalPayment = duration * session.ratePerSecond;
        // - Process payment from student to tutor
        IERC20(session.token).transferFrom(session.student, session.tutor, totalPayment);
        // - Update session status and end time
        session.totalPaid += totalPayment;

        // - Update user statistics
        session.endTime = block.timestamp;

        Tutor storage tutor = tutors[session.tutor];
        tutor.totalEarnings += totalPayment;
        tutor.sessionCount++;

        // - Emit SessionEnded event
        emit SessionEnded(session.tutor, duration, totalPayment);

        delete sessions[tutorAddress];
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * Get user's session history
     * @param _userAddress Address of the user
     * @return Array of session IDs
     */
    function getUserSessions(address _userAddress) external view returns (uint256[] memory) {
        // TODO: Implement session history lookup
        // - Return all session IDs for the user
    }

    /**
     * Get session details
     * @param _sessionId ID of the session
     * @return Session struct with all details
     */
    function getSession(uint256 _sessionId) external view returns (Session memory) {
        // TODO: Implement session details lookup
        // - Return complete session information
    }

    /**
     * Calculate current session cost
     * @param _sessionId ID of the active session
     * @return Current total cost in wei
     */
    function getCurrentSessionCost(uint256 _sessionId) external view returns (uint256) {
        // TODO: Implement cost calculation
        // - Calculate total cost based on duration and rate
        // - Return current cost in wei
    }

    // ============ UTILITY FUNCTIONS ============

    /**
     * Check if user has sufficient balance for session
     * @param _userAddress Address of the user
     * @param _estimatedDuration Estimated session duration in seconds
     * @param _ratePerSecond Rate per second in wei
     * @return True if user has sufficient balance
     */
    function hasSufficientBalance(
        address _userAddress,
        uint256 _estimatedDuration,
        uint256 _ratePerSecond
    ) external view returns (bool) {
        // TODO: Implement balance check
        // - Check if user's ETH balance is sufficient
        // - Consider estimated session cost
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
     * Function to receive ETH
     */
    receive() external payable {}
}

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
contract LangDAO {
    // ============ ENUMS ============

    enum UserType {
        Student,
        Tutor,
        Both
    }
    enum AvailabilityStatus {
        Offline,
        Available,
        InSession
    }
    enum SessionStatus {
        Active,
        Completed,
        Cancelled
    }

    // ============ STRUCTS ============

    struct User {
        UserType userType;
        AvailabilityStatus status;
        string[] languages; // Languages they can teach/learn
        uint256 ratePerSecond; // Rate in wei per second
        uint256 totalEarnings; // Total earnings as tutor
        uint256 totalSpent; // Total spent as student
        uint256 sessionCount; // Total sessions participated in
        bool isRegistered;
    }

    struct Session {
        address student;
        address tutor;
        uint256 startTime;
        uint256 endTime;
        uint256 ratePerSecond;
        uint256 totalPaid;
        SessionStatus status;
        string language; // Language being taught/learned
        bool isActive;
    }

    // ============ STATE VARIABLES ============

    address public immutable owner;
    uint256 public sessionCounter;
    uint256 public totalSessions;

    // Mappings
    mapping(address => User) public users;
    mapping(uint256 => Session) public sessions;
    mapping(address => uint256[]) public userSessions; // User's session IDs
    mapping(string => address[]) public availableTutorsByLanguage; // Language -> available tutors

    // ============ EVENTS ============

    event UserRegistered(address indexed user, UserType userType, string[] languages);
    event AvailabilityUpdated(address indexed user, AvailabilityStatus status);
    event SessionStarted(uint256 indexed sessionId, address indexed student, address indexed tutor, string language);
    event SessionEnded(uint256 indexed sessionId, uint256 duration, uint256 totalPaid);
    event PaymentProcessed(address indexed from, address indexed to, uint256 amount);

    // ============ MODIFIERS ============

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    modifier onlyRegisteredUser() {
        require(users[msg.sender].isRegistered, "User not registered");
        _;
    }

    modifier onlyActiveSession(uint256 sessionId) {
        require(sessions[sessionId].isActive, "Session not active");
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(address _owner) {
        owner = _owner;
    }

    // ============ USER MANAGEMENT ============

    /**
     * Register a new user (student, tutor, or both)
     * @param _userType The type of user (Student, Tutor, or Both)
     * @param _languages Array of languages the user can teach/learn
     * @param _ratePerHour Rate per hour (will be converted to per-second internally)
     */
    function registerUser(UserType _userType, string[] memory _languages, uint256 _ratePerHour) external {
        // TODO: Implement user registration logic
        // - Check if user is already registered
        // - Convert ratePerHour to ratePerSecond
        // - Set user data
        // - Emit UserRegistered event
    }

    /**
     * Update user availability status
     * @param _status New availability status
     */
    function updateAvailability(AvailabilityStatus _status) external onlyRegisteredUser {
        // TODO: Implement availability update logic
        // - Update user status
        // - Add/remove from available tutors list if they're a tutor
        // - Emit AvailabilityUpdated event
    }

    /**
     * Update user's rate
     * @param _ratePerHour New rate per hour
     */
    function updateRate(uint256 _ratePerHour) external onlyRegisteredUser {
        // TODO: Implement rate update logic
        // - Convert ratePerHour to ratePerSecond
        // - Update user's rate
    }

    // ============ SESSION MANAGEMENT ============

    /**
     * Start a new session between student and tutor
     * @param _tutorAddress Address of the tutor
     * @param _language Language being taught/learned
     * @return sessionId The ID of the created session
     */
    function startSession(
        address _tutorAddress,
        string memory _language
    ) external onlyRegisteredUser returns (uint256) {
        // TODO: Implement session start logic
        // - Validate tutor is available and registered
        // - Check if student has sufficient balance
        // - Create new session
        // - Update user statuses to InSession
        // - Emit SessionStarted event
        // - Return session ID
    }

    /**
     * End an active session
     * @param _sessionId ID of the session to end
     */
    function endSession(uint256 _sessionId) external onlyActiveSession(_sessionId) {
        // TODO: Implement session end logic
        // - Validate caller is student, tutor, or authorized service
        // - Calculate total payment based on duration
        // - Process payment from student to tutor
        // - Update session status and end time
        // - Update user statistics
        // - Emit SessionEnded event
    }

    /**
     * Process per-second payment for active session
     * @param _sessionId ID of the active session
     */
    function processPayment(uint256 _sessionId) external onlyActiveSession(_sessionId) {
        // TODO: Implement per-second payment logic
        // - Calculate payment for current second
        // - Check student has sufficient balance
        // - Transfer payment to tutor
        // - Update session totalPaid
        // - Emit PaymentProcessed event
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * Get available tutors for a specific language
     * @param _language Language to search for
     * @return Array of available tutor addresses
     */
    function getAvailableTutors(string memory _language) external view returns (address[] memory) {
        // TODO: Implement tutor lookup logic
        // - Return tutors available for the specified language
        // - Filter by availability status
    }

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
     * Convert hourly rate to per-second rate
     * @param _ratePerHour Rate per hour in wei
     * @return Rate per second in wei
     */
    function convertToPerSecond(uint256 _ratePerHour) public pure returns (uint256) {
        // TODO: Implement rate conversion
        // - Convert hourly rate to per-second rate
        // - Handle precision properly
    }

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

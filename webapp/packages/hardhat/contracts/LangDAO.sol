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

    // PYUSD token address on Sepolia testnet
    address public constant PYUSD_TOKEN = 0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9;

    // ============ LANGUAGE CONSTANTS ============
    // Using uint8 for efficient storage and gas optimization
    // Each language has a unique ID that maps to ISO 639-1 codes
    uint8 constant ENGLISH = 0; // en
    uint8 constant SPANISH = 1; // es
    uint8 constant FRENCH = 2; // fr
    uint8 constant GERMAN = 3; // de
    uint8 constant ITALIAN = 4; // it
    uint8 constant PORTUGUESE = 5; // pt
    uint8 constant RUSSIAN = 6; // ru
    uint8 constant CHINESE = 7; // zh
    uint8 constant JAPANESE = 8; // ja
    uint8 constant KOREAN = 9; // ko
    uint8 constant ARABIC = 10; // ar
    uint8 constant HINDI = 11; // hi
    uint8 constant DUTCH = 12; // nl
    uint8 constant SWEDISH = 13; // sv
    uint8 constant NORWEGIAN = 14; // no
    uint8 constant DANISH = 15; // da
    uint8 constant FINNISH = 16; // fi
    uint8 constant POLISH = 17; // pl
    uint8 constant TURKISH = 18; // tr
    uint8 constant GREEK = 19; // el
    uint8 constant HEBREW = 20; // he
    uint8 constant THAI = 21; // th
    uint8 constant VIETNAMESE = 22; // vi
    uint8 constant INDONESIAN = 23; // id
    uint8 constant MALAY = 24; // ms
    uint8 constant TAGALOG = 25; // tl
    uint8 constant UKRAINIAN = 26; // uk
    uint8 constant CZECH = 27; // cs
    uint8 constant HUNGARIAN = 28; // hu
    uint8 constant ROMANIAN = 29; // ro
    uint8 constant BULGARIAN = 30; // bg
    uint8 constant CROATIAN = 31; // hr
    uint8 constant SERBIAN = 32; // sr
    uint8 constant SLOVAK = 33; // sk
    uint8 constant SLOVENIAN = 34; // sl
    uint8 constant LITHUANIAN = 35; // lt
    uint8 constant LATVIAN = 36; // lv
    uint8 constant ESTONIAN = 37; // et
    uint8 constant UNSUPPORTED = 255; // for invalid languages

    // ============ STRUCTS ============
    struct Student {
        uint8 targetLanguage;
        uint256 budgetPerSec;
        bool isRegistered;
    }
    struct Tutor {
        mapping(uint8 => bool) languages;
        mapping(uint8 => uint256) rateForLanguage;
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
        uint8 language; // Language being taught/learned
        uint256 id;
        bool isActive;
    }

    // ============ STATE VARIABLES ============
    address public immutable owner;
    uint256 public sessionCounter;

    // Mappings
    mapping(address => mapping(address => uint256)) public studentBalances;
    mapping(address => Student) public students;
    mapping(address => Tutor) public tutors;
    mapping(address => bool) public isStudying;
    mapping(address => Session) public activeSessions;
    mapping(uint256 => Session) public sessionHistory;
    mapping(address => uint256[]) public userSessions; // User's session IDs

    // ============ EVENTS ============

    event StudentRegistered(address indexed user, uint8 targetLanguage, uint256 budgetPerSec);
    event TutorRegistered(address indexed user, uint8[] languages, uint256 ratePerHour);
    event SessionStarted(uint256 indexed sessionId, address indexed student, address indexed tutor, uint8 language);
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
    function registerStudent(uint8 _targetLanguage, uint256 _budgetPerSec) external {
        require(_targetLanguage != UNSUPPORTED, "Unsupported language");
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

    function registerTutor(uint8[] memory _languages, uint256 _ratePerSecond) external {
        require(!tutors[msg.sender].isRegistered, "Tutor already registered");
        tutors[msg.sender].isRegistered = true;

        for (uint256 i = 0; i < _languages.length; i++) {
            require(_languages[i] != UNSUPPORTED, "Unsupported language");
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
    function updateRate(uint8 _language, uint256 _ratePerSecond) external onlyRegisteredTutors {
        require(tutors[msg.sender].languages[_language], "Tutor does not offer this language");
        tutors[msg.sender].rateForLanguage[_language] = _ratePerSecond;
    }

    // ============ FUNDS MANAGEMENT ============
    /**
     * Deposit PYUSD funds into the contract
     * @param _amount Amount of PYUSD tokens to deposit
     */
    function depositFunds(uint256 _amount) external onlyRegisteredStudents {
        require(_amount > 0, "Amount must be greater than 0");
        IERC20(PYUSD_TOKEN).transferFrom(msg.sender, address(this), _amount);
        studentBalances[msg.sender][PYUSD_TOKEN] += _amount;
        emit FundsDeposited(msg.sender, PYUSD_TOKEN, _amount);
    }

    /**
     * Withdraw PYUSD funds from the contract
     * @param _amount Amount of PYUSD tokens to withdraw
     */
    function withdrawFunds(uint256 _amount) external onlyRegisteredStudents {
        require(!isStudying[msg.sender], "Student is studying");
        require(_amount > 0, "Amount must be greater than 0");
        require(studentBalances[msg.sender][PYUSD_TOKEN] >= _amount, "Insufficient balance");
        IERC20(PYUSD_TOKEN).transfer(msg.sender, _amount);
        studentBalances[msg.sender][PYUSD_TOKEN] -= _amount;
        emit FundsWithdrawn(msg.sender, PYUSD_TOKEN, _amount);
    }

    // ============ SESSION MANAGEMENT ============

    /**
     * Start a new session between student and tutor
     * @notice The student has accepted the call from the tutor and the session is starting
     * @dev The student is submitting a transaction to accept the call from the tutor to start the session
     * @param _tutorAddress Address of the tutor
     * @param _language Language being taught/learned
     * @return sessionId The ID of the created session
     */
    function startSession(address _tutorAddress, uint8 _language) external onlyRegisteredStudents returns (uint256) {
        require(!activeSessions[_tutorAddress].isActive, "There should be no ongoing session for this tutor");
        require(tutors[_tutorAddress].languages[_language], "Tutor does not offer this language");
        require(this.canAffordRate(msg.sender, _tutorAddress), "Student cannot afford tutor's rate for this language");
        require(this.hasSufficientBalance(msg.sender, _tutorAddress), "Student does not have sufficient PYUSD balance");

        // - Create new session
        sessionCounter++;
        Session memory session = Session({
            student: msg.sender,
            tutor: _tutorAddress,
            token: PYUSD_TOKEN,
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
     * Convert ISO 639-1 language code to language ID
     * @param _isoCode ISO 639-1 language code (e.g., "en", "es")
     * @return Language ID (uint8)
     */
    function isoToLanguage(string memory _isoCode) public pure returns (uint8) {
        bytes32 hash = keccak256(abi.encodePacked(_isoCode));

        if (hash == keccak256(abi.encodePacked("en"))) return ENGLISH;
        if (hash == keccak256(abi.encodePacked("es"))) return SPANISH;
        if (hash == keccak256(abi.encodePacked("fr"))) return FRENCH;
        if (hash == keccak256(abi.encodePacked("de"))) return GERMAN;
        if (hash == keccak256(abi.encodePacked("it"))) return ITALIAN;
        if (hash == keccak256(abi.encodePacked("pt"))) return PORTUGUESE;
        if (hash == keccak256(abi.encodePacked("ru"))) return RUSSIAN;
        if (hash == keccak256(abi.encodePacked("zh"))) return CHINESE;
        if (hash == keccak256(abi.encodePacked("ja"))) return JAPANESE;
        if (hash == keccak256(abi.encodePacked("ko"))) return KOREAN;
        if (hash == keccak256(abi.encodePacked("ar"))) return ARABIC;
        if (hash == keccak256(abi.encodePacked("hi"))) return HINDI;
        if (hash == keccak256(abi.encodePacked("nl"))) return DUTCH;
        if (hash == keccak256(abi.encodePacked("sv"))) return SWEDISH;
        if (hash == keccak256(abi.encodePacked("no"))) return NORWEGIAN;
        if (hash == keccak256(abi.encodePacked("da"))) return DANISH;
        if (hash == keccak256(abi.encodePacked("fi"))) return FINNISH;
        if (hash == keccak256(abi.encodePacked("pl"))) return POLISH;
        if (hash == keccak256(abi.encodePacked("tr"))) return TURKISH;
        if (hash == keccak256(abi.encodePacked("el"))) return GREEK;
        if (hash == keccak256(abi.encodePacked("he"))) return HEBREW;
        if (hash == keccak256(abi.encodePacked("th"))) return THAI;
        if (hash == keccak256(abi.encodePacked("vi"))) return VIETNAMESE;
        if (hash == keccak256(abi.encodePacked("id"))) return INDONESIAN;
        if (hash == keccak256(abi.encodePacked("ms"))) return MALAY;
        if (hash == keccak256(abi.encodePacked("tl"))) return TAGALOG;
        if (hash == keccak256(abi.encodePacked("uk"))) return UKRAINIAN;
        if (hash == keccak256(abi.encodePacked("cs"))) return CZECH;
        if (hash == keccak256(abi.encodePacked("hu"))) return HUNGARIAN;
        if (hash == keccak256(abi.encodePacked("ro"))) return ROMANIAN;
        if (hash == keccak256(abi.encodePacked("bg"))) return BULGARIAN;
        if (hash == keccak256(abi.encodePacked("hr"))) return CROATIAN;
        if (hash == keccak256(abi.encodePacked("sr"))) return SERBIAN;
        if (hash == keccak256(abi.encodePacked("sk"))) return SLOVAK;
        if (hash == keccak256(abi.encodePacked("sl"))) return SLOVENIAN;
        if (hash == keccak256(abi.encodePacked("lt"))) return LITHUANIAN;
        if (hash == keccak256(abi.encodePacked("lv"))) return LATVIAN;
        if (hash == keccak256(abi.encodePacked("et"))) return ESTONIAN;

        return UNSUPPORTED;
    }

    /**
     * Convert language ID to ISO 639-1 language code
     * @param _language Language ID (uint8)
     * @return ISO 639-1 language code string
     */
    function languageToIso(uint8 _language) public pure returns (string memory) {
        if (_language == ENGLISH) return "en";
        if (_language == SPANISH) return "es";
        if (_language == FRENCH) return "fr";
        if (_language == GERMAN) return "de";
        if (_language == ITALIAN) return "it";
        if (_language == PORTUGUESE) return "pt";
        if (_language == RUSSIAN) return "ru";
        if (_language == CHINESE) return "zh";
        if (_language == JAPANESE) return "ja";
        if (_language == KOREAN) return "ko";
        if (_language == ARABIC) return "ar";
        if (_language == HINDI) return "hi";
        if (_language == DUTCH) return "nl";
        if (_language == SWEDISH) return "sv";
        if (_language == NORWEGIAN) return "no";
        if (_language == DANISH) return "da";
        if (_language == FINNISH) return "fi";
        if (_language == POLISH) return "pl";
        if (_language == TURKISH) return "tr";
        if (_language == GREEK) return "el";
        if (_language == HEBREW) return "he";
        if (_language == THAI) return "th";
        if (_language == VIETNAMESE) return "vi";
        if (_language == INDONESIAN) return "id";
        if (_language == MALAY) return "ms";
        if (_language == TAGALOG) return "tl";
        if (_language == UKRAINIAN) return "uk";
        if (_language == CZECH) return "cs";
        if (_language == HUNGARIAN) return "hu";
        if (_language == ROMANIAN) return "ro";
        if (_language == BULGARIAN) return "bg";
        if (_language == CROATIAN) return "hr";
        if (_language == SERBIAN) return "sr";
        if (_language == SLOVAK) return "sk";
        if (_language == SLOVENIAN) return "sl";
        if (_language == LITHUANIAN) return "lt";
        if (_language == LATVIAN) return "lv";
        if (_language == ESTONIAN) return "et";

        return "unsupported";
    }

    /**
     * Check if student can afford tutor's rate
     * @param _studentAddress Address of the student
     * @param _tutorAddress Address of the tutor
     * @return True if student can afford tutor's rate
     */
    function canAffordRate(address _studentAddress, address _tutorAddress) external view returns (bool) {
        uint8 language = students[_studentAddress].targetLanguage;
        uint256 ratePerSecond = tutors[_tutorAddress].rateForLanguage[language];
        return students[_studentAddress].budgetPerSec >= ratePerSecond;
    }

    /**
     * Check if user has sufficient PYUSD balance for session
     * @param _studentAddress Address of the user
     * @param _tutorAddress Address of the tutor
     * @return True if user has sufficient PYUSD balance
     */
    function hasSufficientBalance(address _studentAddress, address _tutorAddress) external view returns (bool) {
        uint8 language = students[_studentAddress].targetLanguage;
        uint256 ratePerSecond = tutors[_tutorAddress].rateForLanguage[language];
        return studentBalances[_studentAddress][PYUSD_TOKEN] >= ratePerSecond * BUFFER_TIME;
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
    function getTutorLanguage(address _tutor, uint8 _language) external view returns (bool) {
        return tutors[_tutor].languages[_language];
    }

    function getTutorRate(address _tutor, uint8 _language) external view returns (uint256) {
        return tutors[_tutor].rateForLanguage[_language];
    }

    function getTutorInfo(
        address _tutor
    ) external view returns (uint256 totalEarnings, uint256 sessionCount, bool isRegistered) {
        return (tutors[_tutor].totalEarnings, tutors[_tutor].sessionCount, tutors[_tutor].isRegistered);
    }

    function getStudentInfo(
        address _student
    ) external view returns (uint8 targetLanguage, uint256 budgetPerSec, bool isRegistered) {
        return (students[_student].targetLanguage, students[_student].budgetPerSec, students[_student].isRegistered);
    }

    /**
     * Get student's PYUSD balance
     * @param _student Address of the student
     * @return PYUSD balance
     */
    function getStudentPYUSDBalance(address _student) external view returns (uint256) {
        return studentBalances[_student][PYUSD_TOKEN];
    }

    /**
     * Function to receive ETH
     */
    receive() external payable {}
}

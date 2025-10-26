import deployedContracts from "../../contracts/deployedContracts";

// Contract addresses for Sepolia testnet
export const CONTRACTS = {
    // PYUSD token contract address on Sepolia (6 decimals)
    PYUSD: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9" as const,

    // LangDAO contract address on Sepolia
    LANGDAO: "0x4Fb5675e6baE48C95c1D4f1b154E3d5e8E36112C" as const,
} as const;

// PYUSD has 6 decimals (not 18 like most ERC20 tokens)
export const PYUSD_DECIMALS = 6;

// Language mappings - matches LangDAO.sol language constants
// IDs correspond to uint8 values in the smart contract
export const LANGUAGES = [
    { id: 0, name: "English", flag: "🇺🇸", code: "en" },
    { id: 1, name: "Spanish", flag: "🇪🇸", code: "es" },
    { id: 2, name: "French", flag: "🇫🇷", code: "fr" },
    { id: 3, name: "German", flag: "🇩🇪", code: "de" },
    { id: 4, name: "Italian", flag: "🇮🇹", code: "it" },
    { id: 5, name: "Portuguese", flag: "🇵🇹", code: "pt" },
    { id: 6, name: "Russian", flag: "🇷🇺", code: "ru" },
    { id: 7, name: "Chinese", flag: "🇨🇳", code: "zh" },
    { id: 8, name: "Japanese", flag: "🇯🇵", code: "ja" },
    { id: 9, name: "Korean", flag: "🇰🇷", code: "ko" },
    { id: 10, name: "Arabic", flag: "🇸🇦", code: "ar" },
    { id: 11, name: "Hindi", flag: "🇮🇳", code: "hi" },
    { id: 12, name: "Dutch", flag: "🇳🇱", code: "nl" },
    { id: 13, name: "Swedish", flag: "🇸🇪", code: "sv" },
    { id: 14, name: "Norwegian", flag: "🇳🇴", code: "no" },
    { id: 15, name: "Danish", flag: "🇩🇰", code: "da" },
    { id: 16, name: "Finnish", flag: "🇫🇮", code: "fi" },
    { id: 17, name: "Polish", flag: "🇵🇱", code: "pl" },
    { id: 18, name: "Turkish", flag: "🇹🇷", code: "tr" },
    { id: 19, name: "Greek", flag: "🇬🇷", code: "el" },
    { id: 20, name: "Hebrew", flag: "🇮🇱", code: "he" },
    { id: 21, name: "Thai", flag: "🇹🇭", code: "th" },
    { id: 22, name: "Vietnamese", flag: "🇻🇳", code: "vi" },
    { id: 23, name: "Indonesian", flag: "🇮🇩", code: "id" },
    { id: 24, name: "Malay", flag: "🇲🇾", code: "ms" },
    { id: 25, name: "Tagalog", flag: "🇵🇭", code: "tl" },
    { id: 26, name: "Ukrainian", flag: "🇺🇦", code: "uk" },
    { id: 27, name: "Czech", flag: "🇨🇿", code: "cs" },
    { id: 28, name: "Hungarian", flag: "🇭🇺", code: "hu" },
    { id: 29, name: "Romanian", flag: "🇷🇴", code: "ro" },
    { id: 30, name: "Bulgarian", flag: "🇧🇬", code: "bg" },
    { id: 31, name: "Croatian", flag: "🇭🇷", code: "hr" },
    { id: 32, name: "Serbian", flag: "🇷🇸", code: "sr" },
    { id: 33, name: "Slovak", flag: "🇸🇰", code: "sk" },
    { id: 34, name: "Slovenian", flag: "🇸🇮", code: "sl" },
    { id: 35, name: "Lithuanian", flag: "🇱🇹", code: "lt" },
    { id: 36, name: "Latvian", flag: "🇱🇻", code: "lv" },
    { id: 37, name: "Estonian", flag: "🇪🇪", code: "et" },
] as const;

// Helper function to get language by code
export const getLanguageByCode = (code: string) => {
    return LANGUAGES.find(lang => lang.code === code);
};

// Helper function to get language by name (case-insensitive)
export const getLanguageByName = (name: string) => {
    return LANGUAGES.find(lang => lang.name.toLowerCase() === name.toLowerCase());
};

// Helper function to get language by ID
export const getLanguageById = (id: number) => {
    return LANGUAGES.find(lang => lang.id === id);
};

// Contract ABIs
export const LANGDAO_ABI = [
    {
        name: "registerStudent",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "_targetLanguage", type: "uint256" },
            { name: "_budgetPerSec", type: "uint256" }
        ],
        outputs: []
    },
    {
        name: "registerTutor",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "_languages", type: "uint256[]" },
            { name: "_ratePerSecond", type: "uint256" }
        ],
        outputs: []
    },
    {
        name: "depositFunds",
        type: "function",
        stateMutability: "payable",
        inputs: [
            { name: "_token", type: "address" },
            { name: "_amount", type: "uint256" }
        ],
        outputs: []
    },
    {
        name: "getStudentInfo",
        type: "function",
        stateMutability: "view",
        inputs: [
            { name: "_student", type: "address" }
        ],
        outputs: [
            { name: "targetLanguage", type: "uint256" },
            { name: "budgetPerSec", type: "uint256" },
            { name: "isRegistered", type: "bool" }
        ]
    },
    {
        name: "getTutorInfo",
        type: "function",
        stateMutability: "view",
        inputs: [
            { name: "_tutor", type: "address" }
        ],
        outputs: [
            { name: "totalEarnings", type: "uint256" },
            { name: "sessionCount", type: "uint256" },
            { name: "isRegistered", type: "bool" }
        ]
    },
    {
        name: "studentBalances",
        type: "function",
        stateMutability: "view",
        inputs: [
            { name: "student", type: "address" },
            { name: "token", type: "address" }
        ],
        outputs: [
            { name: "balance", type: "uint256" }
        ]
    }
] as const;

export const ERC20_ABI = [
    {
        name: "approve",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" }
        ],
        outputs: [{ name: "", type: "bool" }]
    },
    {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }]
    }
] as const;
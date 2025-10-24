import deployedContracts from "../../contracts/deployedContracts";

// Contract addresses
export const CONTRACTS = {
    // PYUSD token contract address - uses MockERC20 for local development
    PYUSD: deployedContracts[31337]?.MockERC20?.address as `0x${string}` || "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8" as const,

    // LangDAO contract address - automatically uses deployed contract
    LANGDAO: deployedContracts[31337]?.LangDAO?.address as `0x${string}` || "0x5FbDB2315678afecb367f032d93F642f64180aa3" as const,
} as const;

// Language mappings
export const LANGUAGES = [
    { id: 1, name: "Spanish", flag: "🇪🇸", code: "es" },
    { id: 2, name: "French", flag: "🇫🇷", code: "fr" },
    { id: 3, name: "German", flag: "🇩🇪", code: "de" },
    { id: 4, name: "Italian", flag: "🇮🇹", code: "it" },
    { id: 5, name: "Portuguese", flag: "🇵🇹", code: "pt" },
    { id: 6, name: "Japanese", flag: "🇯🇵", code: "ja" },
    { id: 7, name: "Korean", flag: "🇰🇷", code: "ko" },
    { id: 8, name: "Chinese", flag: "🇨🇳", code: "zh" },
    { id: 9, name: "Arabic", flag: "🇸🇦", code: "ar" },
    { id: 10, name: "Russian", flag: "🇷🇺", code: "ru" },
] as const;

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
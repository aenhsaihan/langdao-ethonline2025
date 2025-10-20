import { redirect } from "next/dist/server/api-utils";
import { inAppWallet, createWallet } from "thirdweb/wallets";

export const wallets = [
    inAppWallet({
        auth: {
            options: [
                "google",
                "x",
                "apple",
                "discord",
                "facebook",
                "farcaster",
                "telegram",
                "coinbase",
                "line",
                "email",
                "phone",
                "passkey",
                "guest",
            ],
            redirectUrl: "http://localhost:3000/",
            mode: "redirect"
        },
        // Optional: Enable account abstraction with gas sponsoring
        // executionMode: {
        //   mode: "EIP4337", // Smart wallet mode
        //   sponsorGas: true, // Sponsor gas for better UX
        // },
    }),
    createWallet("io.metamask"), // MetaMask
    createWallet("com.coinbase.wallet"), // Coinbase Wallet
    createWallet("me.rainbow"), // Rainbow
];
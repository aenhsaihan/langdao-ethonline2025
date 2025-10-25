import { createThirdwebClient } from "thirdweb";

export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID as string,
  config: {
    // Disable analytics to prevent 401 errors in development
    analytics: {
      enabled: false
    }
  }
});

export const isThirdwebConfigured = !!process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
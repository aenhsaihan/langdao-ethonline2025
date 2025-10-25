import { useGlobalState } from "~~/services/store/store";

/**
 * Hook to convert ETH amounts to USD
 * Since we're using PYUSD (1:1 with USD), we can display values directly
 * But this hook also supports ETH price conversion if needed
 */
export const useUsdConversion = () => {
  const ethPrice = useGlobalState(state => state.nativeCurrency.price);
  const isFetching = useGlobalState(state => state.nativeCurrency.isFetching);

  /**
   * Convert ETH amount to USD
   * @param ethAmount - Amount in ETH (as number or string)
   * @returns USD value as number
   */
  const ethToUsd = (ethAmount: number | string): number => {
    const amount = typeof ethAmount === "string" ? parseFloat(ethAmount) : ethAmount;
    return amount * ethPrice;
  };

  /**
   * Format USD amount with proper decimals
   * @param usdAmount - Amount in USD
   * @param decimals - Number of decimal places (default: 2)
   * @returns Formatted USD string
   */
  const formatUsd = (usdAmount: number, decimals: number = 2): string => {
    return usdAmount.toFixed(decimals);
  };

  /**
   * Convert ETH to USD and format
   * @param ethAmount - Amount in ETH
   * @param decimals - Number of decimal places (default: 2)
   * @returns Formatted USD string with $ prefix
   */
  const ethToUsdFormatted = (ethAmount: number | string, decimals: number = 2): string => {
    const usd = ethToUsd(ethAmount);
    return `$${formatUsd(usd, decimals)}`;
  };

  /**
   * For PYUSD (1:1 with USD), just format the amount
   * @param pyusdAmount - Amount in PYUSD
   * @param decimals - Number of decimal places (default: 2)
   * @returns Formatted USD string with $ prefix
   */
  const pyusdToUsdFormatted = (pyusdAmount: number | string, decimals: number = 2): string => {
    const amount = typeof pyusdAmount === "string" ? parseFloat(pyusdAmount) : pyusdAmount;
    return `$${formatUsd(amount, decimals)}`;
  };

  /**
   * Convert per-second rate to per-hour and format in USD
   * @param ratePerSecond - Rate per second
   * @param isPyusd - Whether the rate is in PYUSD (default: true)
   * @returns Formatted hourly rate string
   */
  const formatHourlyRate = (ratePerSecond: number | string, isPyusd: boolean = true): string => {
    const rate = typeof ratePerSecond === "string" ? parseFloat(ratePerSecond) : ratePerSecond;
    const hourlyRate = rate * 3600;
    
    if (isPyusd) {
      return `$${formatUsd(hourlyRate, 2)}/hr`;
    } else {
      const usdRate = ethToUsd(hourlyRate);
      return `$${formatUsd(usdRate, 2)}/hr`;
    }
  };

  return {
    ethPrice,
    isFetching,
    ethToUsd,
    formatUsd,
    ethToUsdFormatted,
    pyusdToUsdFormatted,
    formatHourlyRate,
  };
};

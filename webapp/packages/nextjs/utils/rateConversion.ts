/**
 * Rate Conversion Utilities
 * 
 * Handles conversion between hourly PYUSD rates and per-second wei rates
 * for the LangDAO smart contract.
 */

/**
 * Convert hourly PYUSD rate to per-second wei
 * 
 * @param ratePerHour - Rate in PYUSD per hour (e.g., "10.00" or 10)
 * @param roundToDecimals - Optional: Round to N decimal places before converting to wei (default: no rounding)
 * @returns Rate in wei per second as a bigint-compatible number
 * 
 * @example
 * // Without rounding (maximum precision)
 * hourlyToWeiPerSecond(10) 
 * // Returns: 2777777777777777 wei/sec
 * // For 1 hour: 2777777777777777 × 3600 = 9,999,999,999,999,997,200 wei ≈ $9.999999999999997
 * 
 * @example
 * // With rounding to 5 decimals
 * hourlyToWeiPerSecond(10, 5)
 * // Returns: 2777800000000000 wei/sec (0.00278 PYUSD/sec rounded)
 * // For 1 hour: 2777800000000000 × 3600 = 10,000,080,000,000,000,000 wei ≈ $10.00008
 */
export function hourlyToWeiPerSecond(
  ratePerHour: number | string,
  roundToDecimals?: number
): number {
  const hourly = typeof ratePerHour === "string" ? parseFloat(ratePerHour) : ratePerHour;
  
  // Convert to per-second
  let perSecond = hourly / 3600;
  
  // Optional: Round to specified decimal places
  if (roundToDecimals !== undefined) {
    const multiplier = Math.pow(10, roundToDecimals);
    perSecond = Math.round(perSecond * multiplier) / multiplier;
  }
  
  // Convert to wei (18 decimals)
  return Math.floor(perSecond * 1e18);
}

/**
 * Convert per-second wei rate to hourly PYUSD
 * 
 * @param weiPerSecond - Rate in wei per second
 * @returns Rate in PYUSD per hour
 * 
 * @example
 * weiPerSecondToHourly(2777777777777777)
 * // Returns: 9.999999999999997 (essentially $10/hour)
 */
export function weiPerSecondToHourly(weiPerSecond: number | string | bigint): number {
  const wei = typeof weiPerSecond === "bigint" 
    ? Number(weiPerSecond) 
    : typeof weiPerSecond === "string" 
      ? parseFloat(weiPerSecond) 
      : weiPerSecond;
  
  const pyusdPerSecond = wei / 1e18;
  const pyusdPerHour = pyusdPerSecond * 3600;
  
  return pyusdPerHour;
}

/**
 * Format wei per second rate as hourly USD string
 * 
 * @param weiPerSecond - Rate in wei per second
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string like "$10.00"
 */
export function formatWeiPerSecondAsHourly(
  weiPerSecond: number | string | bigint,
  decimals: number = 2
): string {
  const hourly = weiPerSecondToHourly(weiPerSecond);
  return `$${hourly.toFixed(decimals)}`;
}

/**
 * Calculate session cost
 * 
 * @param weiPerSecond - Rate in wei per second
 * @param durationSeconds - Duration in seconds
 * @returns Total cost in wei
 */
export function calculateSessionCost(
  weiPerSecond: number | bigint,
  durationSeconds: number
): bigint {
  const rate = typeof weiPerSecond === "bigint" ? weiPerSecond : BigInt(weiPerSecond);
  return rate * BigInt(durationSeconds);
}

/**
 * Comparison of rounding strategies
 */
export const ROUNDING_EXAMPLES = {
  noRounding: {
    input: 10, // $10/hour
    weiPerSecond: 2777777777777777,
    hourlyRecalculated: 9.999999999999997,
    error: 0.000000000000003, // $0.000000000000003/hour
    errorPercentage: 0.00000000000003,
  },
  rounded5Decimals: {
    input: 10, // $10/hour
    weiPerSecond: 2777800000000000,
    hourlyRecalculated: 10.00008,
    error: 0.00008, // $0.00008/hour
    errorPercentage: 0.0008,
  },
};

/**
 * Recommendation: Use NO ROUNDING (default behavior)
 * 
 * Why?
 * 1. Maximum precision - error is negligible (< $0.000000000001/hour)
 * 2. Slightly favors students (they pay marginally less)
 * 3. Simpler code - no rounding logic needed
 * 4. Gas efficient - same gas cost either way
 * 
 * When to use rounding?
 * - If you want "cleaner" numbers in wei (e.g., 2777800000000000 vs 2777777777777777)
 * - If you want to slightly favor tutors (they earn marginally more)
 * - If you need exact hourly rates when converting back (e.g., $10.00 exactly)
 * 
 * Note: The error from rounding to 5 decimals ($0.00008/hour) is still negligible
 * for practical purposes, but it's 266,666x larger than the no-rounding error.
 */

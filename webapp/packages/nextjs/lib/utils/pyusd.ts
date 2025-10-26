import { PYUSD_DECIMALS } from '../constants/contracts';

/**
 * Format PYUSD amount from wei (6 decimals) to human-readable string
 * @param amount - Amount in smallest unit (6 decimals for PYUSD)
 * @param decimals - Number of decimal places to show (default: 4)
 * @returns Formatted string
 */
export function formatPYUSD(amount: bigint | string | number, decimals: number = 4): string {
  const amountBigInt = typeof amount === 'bigint' ? amount : BigInt(amount);
  const divisor = BigInt(10 ** PYUSD_DECIMALS);
  const wholePart = amountBigInt / divisor;
  const fractionalPart = amountBigInt % divisor;
  
  const fractionalStr = fractionalPart.toString().padStart(PYUSD_DECIMALS, '0');
  const result = `${wholePart}.${fractionalStr}`;
  
  return parseFloat(result).toFixed(decimals);
}

/**
 * Parse PYUSD amount from human-readable to wei (6 decimals)
 * @param amount - Human-readable amount (e.g., "100.50")
 * @returns Amount in smallest unit (6 decimals)
 */
export function parsePYUSD(amount: string | number): bigint {
  const amountStr = typeof amount === 'number' ? amount.toString() : amount;
  const [whole = '0', fractional = '0'] = amountStr.split('.');
  
  // Pad or trim fractional part to exactly PYUSD_DECIMALS
  const fractionalPadded = fractional.padEnd(PYUSD_DECIMALS, '0').slice(0, PYUSD_DECIMALS);
  
  const wholeBigInt = BigInt(whole) * BigInt(10 ** PYUSD_DECIMALS);
  const fractionalBigInt = BigInt(fractionalPadded);
  
  return wholeBigInt + fractionalBigInt;
}

/**
 * Convert PYUSD per second to PYUSD per hour
 * @param pyusdPerSecond - Amount in PYUSD per second (already in human-readable format)
 * @returns Amount in PYUSD per hour
 */
export function pyusdPerSecondToPerHour(pyusdPerSecond: number): number {
  return pyusdPerSecond * 3600;
}

/**
 * Convert PYUSD per hour to PYUSD per second
 * @param pyusdPerHour - Amount in PYUSD per hour (human-readable)
 * @returns Amount in PYUSD per second
 */
export function pyusdPerHourToPerSecond(pyusdPerHour: number): number {
  return pyusdPerHour / 3600;
}

/**
 * Convert PYUSD per hour to wei per second (for smart contract)
 * @param pyusdPerHour - Amount in PYUSD per hour (human-readable)
 * @returns Amount in wei per second (6 decimals)
 */
export function pyusdPerHourToWeiPerSecond(pyusdPerHour: number): bigint {
  const pyusdPerSecond = pyusdPerHourToPerSecond(pyusdPerHour);
  return parsePYUSD(pyusdPerSecond);
}

/**
 * Convert wei per second to PYUSD per hour (for display)
 * @param weiPerSecond - Amount in wei per second (6 decimals)
 * @returns Amount in PYUSD per hour (human-readable)
 */
export function weiPerSecondToPyusdPerHour(weiPerSecond: bigint | string | number): number {
  const pyusdPerSecond = parseFloat(formatPYUSD(weiPerSecond, 10));
  return pyusdPerSecondToPerHour(pyusdPerSecond);
}

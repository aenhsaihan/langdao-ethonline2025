"use client";

import { useState, useEffect } from "react";

interface DepositSliderProps {
  balance: number;
  value: number;
  onChange: (value: number) => void;
}

export const DepositSlider = ({ balance, value, onChange }: DepositSliderProps) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleQuickSelect = (percentage: number) => {
    const newValue = (balance * percentage) / 100;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const percentage = balance > 0 ? (localValue / balance) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min="0"
          max={balance}
          step="0.01"
          value={localValue}
          onChange={handleSliderChange}
          className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${percentage}%, #E5E7EB ${percentage}%, #E5E7EB 100%)`
          }}
        />
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mt-2">
          <span>0 PYUSD</span>
          <span>{balance.toFixed(4)} PYUSD</span>
        </div>
      </div>

      {/* Current Value Display */}
      <div className="text-center">
        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {localValue.toFixed(4)} PYUSD
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {percentage.toFixed(1)}% of your balance
        </div>
      </div>

      {/* Quick Select Buttons */}
      <div className="grid grid-cols-4 gap-3">
        {[25, 50, 75, 100].map((percent) => (
          <button
            key={percent}
            onClick={() => handleQuickSelect(percent)}
            className={`
              py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200
              ${Math.abs(percentage - percent) < 1
                ? "bg-blue-500 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }
            `}
          >
            {percent}%
          </button>
        ))}
      </div>

      {/* Manual Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Or enter amount manually
        </label>
        <div className="relative">
          <input
            type="number"
            step="0.01"
            min="0"
            max={balance}
            value={localValue}
            onChange={(e) => {
              const newValue = Math.min(parseFloat(e.target.value) || 0, balance);
              setLocalValue(newValue);
              onChange(newValue);
            }}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="0.00"
          />
          <div className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">
            PYUSD
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};
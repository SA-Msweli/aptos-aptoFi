"use client";

export function NetworkIndicator() {
  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <span className="text-gray-600 hidden sm:inline">Testnet</span>
    </div>
  );
}
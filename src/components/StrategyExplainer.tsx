"use client";

import { useState } from "react";
import {
  VaultInfo,
  VaultStrategy,
  getStrategyTypeName,
  getRiskLevelDescription,
  formatAPY
} from "@/view-functions/getYieldVaultData";

interface StrategyExplainerProps {
  vault: VaultInfo & { apy: number; strategy: VaultStrategy | null };
  onClose: () => void;
  onSwitchStrategy?: (newVaultId: number) => void;
  availableVaults?: Array<VaultInfo & { apy: number; strategy: VaultStrategy | null }>;
}

interface StrategyDetails {
  name: string;
  description: string;
  howItWorks: string[];
  risks: string[];
  benefits: string[];
  typicalAPY: string;
  riskLevel: number;
  icon: string;
  color: string;
}

const STRATEGY_DETAILS: Record<number, StrategyDetails> = {
  1: { // Lending
    name: "Lending Strategy",
    description: "Your funds are lent to borrowers who provide collateral, earning interest from loan repayments.",
    howItWorks: [
      "Your APT is deposited into a lending pool",
      "Borrowers take loans using their crypto as collateral",
      "Interest from loan repayments is distributed to lenders",
      "Smart contracts automatically manage collateral and liquidations"
    ],
    risks: [
      "Smart contract risk - bugs in lending protocol",
      "Liquidation risk - if collateral values drop rapidly",
      "Interest rate volatility - rates can change based on demand",
      "Temporary illiquidity during high demand periods"
    ],
    benefits: [
      "Steady, predictable returns",
      "Lower volatility compared to other DeFi strategies",
      "Automatic compounding of interest",
      "Backed by over-collateralized loans"
    ],
    typicalAPY: "3-8%",
    riskLevel: 2,
    icon: "🏦",
    color: "blue"
  },
  2: { // Liquidity Provision (LP)
    name: "Liquidity Provision Strategy",
    description: "Your funds provide liquidity to decentralized exchanges, earning fees from traders.",
    howItWorks: [
      "Your APT is paired with another token (e.g., USDC)",
      "The pair is deposited into a liquidity pool on a DEX",
      "Traders pay fees when swapping tokens from the pool",
      "You earn a share of trading fees proportional to your contribution"
    ],
    risks: [
      "Impermanent loss - when token prices diverge significantly",
      "Smart contract risk - DEX protocol vulnerabilities",
      "High volatility - returns depend on trading volume and price movements",
      "Slippage risk during large market movements"
    ],
    benefits: [
      "Higher potential returns during high trading volume",
      "Earn fees from every trade in the pool",
      "Exposure to multiple tokens",
      "Liquidity mining rewards in some protocols"
    ],
    typicalAPY: "5-15%",
    riskLevel: 4,
    icon: "💱",
    color: "purple"
  },
  3: { // Staking
    name: "Staking Strategy",
    description: "Your tokens are staked to secure the network or protocol, earning staking rewards.",
    howItWorks: [
      "Your APT is staked with validators or in staking pools",
      "Staked tokens help secure the Aptos network",
      "Network rewards are distributed to stakers",
      "Rewards compound automatically over time"
    ],
    risks: [
      "Slashing risk - penalties for validator misbehavior",
      "Lock-up periods - funds may be temporarily unavailable",
      "Validator risk - choosing unreliable validators",
      "Network risk - changes to staking rewards or protocols"
    ],
    benefits: [
      "Support network security and decentralization",
      "Relatively stable returns",
      "Lower technical complexity",
      "Automatic reward compounding"
    ],
    typicalAPY: "4-12%",
    riskLevel: 3,
    icon: "🔒",
    color: "green"
  }
};

const RISK_LEVEL_DETAILS = {
  1: {
    name: "Very Low Risk",
    description: "Conservative strategy with minimal risk of loss",
    characteristics: ["Stable returns", "Low volatility", "High liquidity", "Minimal smart contract exposure"],
    suitableFor: "Risk-averse investors, emergency funds, short-term savings",
    color: "green",
    icon: "🛡️"
  },
  2: {
    name: "Low Risk",
    description: "Slightly higher returns with minimal additional risk",
    characteristics: ["Predictable returns", "Low to moderate volatility", "Good liquidity", "Established protocols"],
    suitableFor: "Conservative investors, long-term savings, retirement funds",
    color: "blue",
    icon: "🏛️"
  },
  3: {
    name: "Medium Risk",
    description: "Balanced approach with moderate risk for higher returns",
    characteristics: ["Variable returns", "Moderate volatility", "Some complexity", "Diversified exposure"],
    suitableFor: "Balanced investors, growth savings, medium-term goals",
    color: "yellow",
    icon: "⚖️"
  },
  4: {
    name: "High Risk",
    description: "Higher potential returns with increased risk exposure",
    characteristics: ["High return potential", "High volatility", "Complex strategies", "Market dependent"],
    suitableFor: "Aggressive investors, speculation, high-risk tolerance",
    color: "orange",
    icon: "🎢"
  },
  5: {
    name: "Very High Risk",
    description: "Maximum return potential with significant risk of loss",
    characteristics: ["Very high returns possible", "Extreme volatility", "Complex protocols", "High technical risk"],
    suitableFor: "Expert investors, small allocations, experimental strategies",
    color: "red",
    icon: "🚀"
  }
};

export function StrategyExplainer({ vault, onClose, onSwitchStrategy, availableVaults = [] }: StrategyExplainerProps) {
  const [activeTab, setActiveTab] = useState<'strategy' | 'risk' | 'compare'>('strategy');
  const [selectedVaultForComparison, setSelectedVaultForComparison] = useState<number | null>(null);

  const strategyDetails = STRATEGY_DETAILS[vault.strategyType];
  const riskDetails = RISK_LEVEL_DETAILS[vault.strategy?.riskLevel as keyof typeof RISK_LEVEL_DETAILS] || RISK_LEVEL_DETAILS[1];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-800 border-blue-200',
      green: 'bg-green-50 text-green-800 border-green-200',
      yellow: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      orange: 'bg-orange-50 text-orange-800 border-orange-200',
      red: 'bg-red-50 text-red-800 border-red-200',
      purple: 'bg-purple-50 text-purple-800 border-purple-200'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getPerformanceComparison = () => {
    if (!selectedVaultForComparison) return null;

    const comparisonVault = availableVaults.find(v => v.id === selectedVaultForComparison);
    if (!comparisonVault) return null;

    const currentStrategy = STRATEGY_DETAILS[vault.strategyType];
    const comparisonStrategy = STRATEGY_DETAILS[comparisonVault.strategyType];

    return {
      current: {
        vault,
        strategy: currentStrategy,
        risk: RISK_LEVEL_DETAILS[vault.strategy?.riskLevel as keyof typeof RISK_LEVEL_DETAILS]
      },
      comparison: {
        vault: comparisonVault,
        strategy: comparisonStrategy,
        risk: RISK_LEVEL_DETAILS[comparisonVault.strategy?.riskLevel as keyof typeof RISK_LEVEL_DETAILS]
      }
    };
  };

  const performanceComparison = getPerformanceComparison();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Strategy & Risk Analysis</h2>
            <p className="text-gray-600">{vault.name} - Detailed Information</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Vault Overview */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl mb-2">{strategyDetails?.icon}</div>
              <p className="text-lg font-bold text-gray-900">{formatAPY(vault.apy)}</p>
              <p className="text-sm text-gray-600">Current APY</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">{riskDetails?.icon}</div>
              <p className="text-lg font-bold text-gray-900">{riskDetails?.name}</p>
              <p className="text-sm text-gray-600">Risk Level</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-lg font-bold text-gray-900">{(vault.totalDeposits / 100000000).toFixed(0)} APT</p>
              <p className="text-sm text-gray-600">Total Deposits</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">⏱️</div>
              <p className="text-lg font-bold text-gray-900">{getStrategyTypeName(vault.strategyType)}</p>
              <p className="text-sm text-gray-600">Strategy Type</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'strategy', label: 'Strategy Details', icon: '📋' },
            { key: 'risk', label: 'Risk Analysis', icon: '⚠️' },
            { key: 'compare', label: 'Compare Options', icon: '⚖️' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'strategy' | 'risk' | 'compare')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Strategy Details Tab */}
        {activeTab === 'strategy' && strategyDetails && (
          <div className="space-y-6">
            <div className={`rounded-xl p-6 border ${getColorClasses(strategyDetails.color)}`}>
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-3xl">{strategyDetails.icon}</span>
                <div>
                  <h3 className="text-xl font-bold">{strategyDetails.name}</h3>
                  <p className="text-sm opacity-80">{strategyDetails.description}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* How It Works */}
              <div className="bg-white border rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <span>⚙️</span>
                  <span>How It Works</span>
                </h4>
                <ol className="space-y-3">
                  {strategyDetails.howItWorks.map((step, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="text-sm text-gray-700">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Benefits */}
              <div className="bg-white border rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <span>✅</span>
                  <span>Key Benefits</span>
                </h4>
                <ul className="space-y-3">
                  {strategyDetails.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></span>
                      <span className="text-sm text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{formatAPY(vault.apy)}</p>
                  <p className="text-sm text-gray-600">Current APY</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{strategyDetails.typicalAPY}</p>
                  <p className="text-sm text-gray-600">Typical Range</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{strategyDetails.riskLevel}/5</p>
                  <p className="text-sm text-gray-600">Risk Score</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {vault.performanceFee / 100}%
                  </p>
                  <p className="text-sm text-gray-600">Performance Fee</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Risk Analysis Tab */}
        {activeTab === 'risk' && (
          <div className="space-y-6">
            <div className={`rounded-xl p-6 border ${getColorClasses(riskDetails.color)}`}>
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-3xl">{riskDetails.icon}</span>
                <div>
                  <h3 className="text-xl font-bold">{riskDetails.name}</h3>
                  <p className="text-sm opacity-80">{riskDetails.description}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Risk Factors */}
              <div className="bg-white border rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <span>⚠️</span>
                  <span>Risk Factors</span>
                </h4>
                <ul className="space-y-3">
                  {strategyDetails?.risks.map((risk, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mt-2"></span>
                      <span className="text-sm text-gray-700">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risk Characteristics */}
              <div className="bg-white border rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <span>📊</span>
                  <span>Risk Profile</span>
                </h4>
                <ul className="space-y-3">
                  {riskDetails.characteristics.map((characteristic, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></span>
                      <span className="text-sm text-gray-700">{characteristic}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Suitability */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-blue-900 mb-3 flex items-center space-x-2">
                <span>👥</span>
                <span>Suitable For</span>
              </h4>
              <p className="text-blue-800">{riskDetails.suitableFor}</p>
            </div>

            {/* Risk Mitigation */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-green-900 mb-3 flex items-center space-x-2">
                <span>🛡️</span>
                <span>Risk Mitigation</span>
              </h4>
              <ul className="space-y-2 text-green-800">
                <li>• Diversify across multiple strategies and vaults</li>
                <li>• Only invest what you can afford to lose</li>
                <li>• Monitor your positions regularly</li>
                <li>• Understand the underlying protocols and smart contracts</li>
                <li>• Consider your risk tolerance and investment timeline</li>
              </ul>
            </div>
          </div>
        )}

        {/* Compare Options Tab */}
        {activeTab === 'compare' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Compare with Other Strategies</h4>
              <select
                value={selectedVaultForComparison || ''}
                onChange={(e) => setSelectedVaultForComparison(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a vault to compare</option>
                {availableVaults
                  .filter(v => v.id !== vault.id)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} - {formatAPY(v.apy)} APY - {getRiskLevelDescription(v.strategy?.riskLevel || 1)}
                    </option>
                  ))}
              </select>
            </div>

            {performanceComparison && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Vault */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <h5 className="text-lg font-semibold text-blue-900 mb-4">
                    {performanceComparison.current.vault.name} (Current)
                  </h5>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-blue-700">APY:</span>
                      <span className="font-medium text-blue-900">{formatAPY(performanceComparison.current.vault.apy)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Strategy:</span>
                      <span className="font-medium text-blue-900">{performanceComparison.current.strategy.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Risk Level:</span>
                      <span className="font-medium text-blue-900">{performanceComparison.current.risk.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">TVL:</span>
                      <span className="font-medium text-blue-900">{(performanceComparison.current.vault.totalDeposits / 100000000).toFixed(0)} APT</span>
                    </div>
                  </div>
                </div>

                {/* Comparison Vault */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                  <h5 className="text-lg font-semibold text-green-900 mb-4">
                    {performanceComparison.comparison.vault.name}
                  </h5>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-green-700">APY:</span>
                      <span className="font-medium text-green-900">{formatAPY(performanceComparison.comparison.vault.apy)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Strategy:</span>
                      <span className="font-medium text-green-900">{performanceComparison.comparison.strategy.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Risk Level:</span>
                      <span className="font-medium text-green-900">{performanceComparison.comparison.risk.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">TVL:</span>
                      <span className="font-medium text-green-900">{(performanceComparison.comparison.vault.totalDeposits / 100000000).toFixed(0)} APT</span>
                    </div>
                  </div>

                  {onSwitchStrategy && (
                    <button
                      onClick={() => {
                        onSwitchStrategy(performanceComparison.comparison.vault.id);
                        onClose();
                      }}
                      className="w-full mt-4 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Switch to This Strategy
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Strategy Comparison Matrix */}
            {availableVaults.length > 1 && (
              <div className="bg-white border rounded-xl p-6">
                <h5 className="text-lg font-semibold text-gray-900 mb-4">All Available Strategies</h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Strategy</th>
                        <th className="text-center py-2">APY</th>
                        <th className="text-center py-2">Risk</th>
                        <th className="text-center py-2">TVL</th>
                        <th className="text-center py-2">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableVaults.map((v) => (
                        <tr key={v.id} className={`border-b ${v.id === vault.id ? 'bg-blue-50' : ''}`}>
                          <td className="py-2 font-medium">
                            {v.name} {v.id === vault.id && '(Current)'}
                          </td>
                          <td className="text-center py-2">{formatAPY(v.apy)}</td>
                          <td className="text-center py-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${getColorClasses(RISK_LEVEL_DETAILS[v.strategy?.riskLevel as keyof typeof RISK_LEVEL_DETAILS]?.color || 'blue')}`}>
                              {v.strategy?.riskLevel}/5
                            </span>
                          </td>
                          <td className="text-center py-2">{(v.totalDeposits / 100000000).toFixed(0)} APT</td>
                          <td className="text-center py-2">{getStrategyTypeName(v.strategyType)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
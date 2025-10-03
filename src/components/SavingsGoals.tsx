"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useTransactions } from "@/lib/transactions";
import {
  depositToVault,
  DepositToVaultArguments
} from "@/entry-functions/yieldVault";

interface SavingsGoal {
  id: string;
  name: string;
  description: string;
  targetAmount: number; // in APT
  currentAmount: number; // in APT
  targetDate: Date;
  vaultId: number;
  vaultName: string;
  autoDepositEnabled: boolean;
  autoDepositAmount: number; // in APT
  autoDepositFrequency: 'daily' | 'weekly' | 'monthly';
  createdAt: Date;
  category: 'emergency' | 'vacation' | 'house' | 'education' | 'retirement' | 'other';
  milestones: GoalMilestone[];
}

interface GoalMilestone {
  id: string;
  percentage: number; // 25, 50, 75, 100
  amount: number;
  achieved: boolean;
  achievedAt?: Date;
  reward?: string;
}

interface SavingsGoalsProps {
  vaults: Array<{ id: number; name: string; apy: number }>;
  onClose: () => void;
}

const GOAL_CATEGORIES = {
  emergency: { name: 'Emergency Fund', icon: '🚨', color: 'red' },
  vacation: { name: 'Vacation', icon: '🏖️', color: 'blue' },
  house: { name: 'House/Property', icon: '🏠', color: 'green' },
  education: { name: 'Education', icon: '🎓', color: 'purple' },
  retirement: { name: 'Retirement', icon: '🏖️', color: 'orange' },
  other: { name: 'Other', icon: '🎯', color: 'gray' }
};

const MILESTONE_REWARDS = [
  "🎉 Great start! You're on your way!",
  "🚀 Halfway there! Keep it up!",
  "💪 Almost there! Final push!",
  "🏆 Goal achieved! Congratulations!"
];

export function SavingsGoals({ vaults, onClose }: SavingsGoalsProps) {
  const { account } = useWallet();
  const { executeTransaction } = useTransactions();

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [showGoalDetails, setShowGoalDetails] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create goal form state
  const [newGoal, setNewGoal] = useState({
    name: '',
    description: '',
    targetAmount: '',
    targetDate: '',
    vaultId: vaults[0]?.id || 0,
    category: 'other' as keyof typeof GOAL_CATEGORIES,
    autoDepositEnabled: false,
    autoDepositAmount: '',
    autoDepositFrequency: 'monthly' as 'daily' | 'weekly' | 'monthly'
  });

  // Load goals from localStorage (in production, this would be from a backend)
  useEffect(() => {
    loadGoals();
  }, [account]);

  const loadGoals = () => {
    if (!account) return;

    const savedGoals = localStorage.getItem(`savings-goals-${account.address}`);
    if (savedGoals) {
      const parsedGoals = JSON.parse(savedGoals).map((goal: any) => ({
        ...goal,
        targetDate: new Date(goal.targetDate),
        createdAt: new Date(goal.createdAt),
        milestones: goal.milestones.map((m: any) => ({
          ...m,
          achievedAt: m.achievedAt ? new Date(m.achievedAt) : undefined
        }))
      }));
      setGoals(parsedGoals);
    }
  };

  const saveGoals = (updatedGoals: SavingsGoal[]) => {
    if (!account) return;
    localStorage.setItem(`savings-goals-${account.address}`, JSON.stringify(updatedGoals));
    setGoals(updatedGoals);
  };

  const createGoal = () => {
    if (!newGoal.name || !newGoal.targetAmount || !newGoal.targetDate) {
      setError("Please fill in all required fields");
      return;
    }

    const targetAmount = parseFloat(newGoal.targetAmount);
    const targetDate = new Date(newGoal.targetDate);

    if (targetAmount <= 0) {
      setError("Target amount must be greater than 0");
      return;
    }

    if (targetDate <= new Date()) {
      setError("Target date must be in the future");
      return;
    }

    const selectedVault = vaults.find(v => v.id === newGoal.vaultId);
    if (!selectedVault) {
      setError("Please select a valid vault");
      return;
    }

    // Create milestones
    const milestones: GoalMilestone[] = [25, 50, 75, 100].map((percentage, index) => ({
      id: `milestone-${Date.now()}-${percentage}`,
      percentage,
      amount: (targetAmount * percentage) / 100,
      achieved: false,
      reward: MILESTONE_REWARDS[index]
    }));

    const goal: SavingsGoal = {
      id: `goal-${Date.now()}`,
      name: newGoal.name,
      description: newGoal.description,
      targetAmount,
      currentAmount: 0,
      targetDate,
      vaultId: newGoal.vaultId,
      vaultName: selectedVault.name,
      autoDepositEnabled: newGoal.autoDepositEnabled,
      autoDepositAmount: newGoal.autoDepositEnabled ? parseFloat(newGoal.autoDepositAmount) : 0,
      autoDepositFrequency: newGoal.autoDepositFrequency,
      createdAt: new Date(),
      category: newGoal.category,
      milestones
    };

    const updatedGoals = [...goals, goal];
    saveGoals(updatedGoals);

    // Reset form
    setNewGoal({
      name: '',
      description: '',
      targetAmount: '',
      targetDate: '',
      vaultId: vaults[0]?.id || 0,
      category: 'other',
      autoDepositEnabled: false,
      autoDepositAmount: '',
      autoDepositFrequency: 'monthly'
    });

    setShowCreateGoal(false);
    setError(null);
  };

  const makeGoalDeposit = async (goalId: string, amount: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal || !account) return;

    setLoading(true);
    try {
      const depositArgs: DepositToVaultArguments = {
        vaultId: goal.vaultId,
        coinType: `0x1::aptos_coin::AptosCoin`,
        amount: Math.floor(amount * 100000000) // Convert to octas
      };

      const result = await executeTransaction(depositToVault(depositArgs));

      if (result.success) {
        // Update goal progress
        const updatedGoals = goals.map(g => {
          if (g.id === goalId) {
            const newCurrentAmount = g.currentAmount + amount;
            const updatedMilestones = g.milestones.map(milestone => {
              if (!milestone.achieved && newCurrentAmount >= milestone.amount) {
                return {
                  ...milestone,
                  achieved: true,
                  achievedAt: new Date()
                };
              }
              return milestone;
            });

            return {
              ...g,
              currentAmount: newCurrentAmount,
              milestones: updatedMilestones
            };
          }
          return g;
        });

        saveGoals(updatedGoals);
      } else {
        setError(result.userFriendlyError || result.errorMessage || "Deposit failed");
      }
    } catch (err) {
      console.error("Goal deposit error:", err);
      setError("Failed to process deposit");
    } finally {
      setLoading(false);
    }
  };

  const deleteGoal = (goalId: string) => {
    const updatedGoals = goals.filter(g => g.id !== goalId);
    saveGoals(updatedGoals);
  };

  const getProgressPercentage = (goal: SavingsGoal) => {
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  };

  const getDaysRemaining = (targetDate: Date) => {
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getProjectedCompletion = (goal: SavingsGoal) => {
    if (!goal.autoDepositEnabled || goal.autoDepositAmount <= 0) return null;

    const remainingAmount = goal.targetAmount - goal.currentAmount;
    const depositsNeeded = Math.ceil(remainingAmount / goal.autoDepositAmount);

    let daysPerDeposit = 30; // monthly
    if (goal.autoDepositFrequency === 'weekly') daysPerDeposit = 7;
    if (goal.autoDepositFrequency === 'daily') daysPerDeposit = 1;

    const daysToCompletion = depositsNeeded * daysPerDeposit;
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + daysToCompletion);

    return completionDate;
  };

  const getCategoryColor = (category: keyof typeof GOAL_CATEGORIES) => {
    const colors = {
      emergency: 'bg-red-100 text-red-800 border-red-200',
      vacation: 'bg-blue-100 text-blue-800 border-blue-200',
      house: 'bg-green-100 text-green-800 border-green-200',
      education: 'bg-purple-100 text-purple-800 border-purple-200',
      retirement: 'bg-orange-100 text-orange-800 border-orange-200',
      other: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[category];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Savings Goals</h2>
            <p className="text-gray-600">Set targets and track your progress with automated deposits</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCreateGoal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New Goal
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <span className="text-red-600 text-xl">❌</span>
              <div>
                <h3 className="text-red-800 font-medium">Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Goals Overview */}
        {goals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{goals.length}</p>
              <p className="text-sm text-gray-600">Active Goals</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {goals.reduce((sum, goal) => sum + goal.currentAmount, 0).toFixed(2)} APT
              </p>
              <p className="text-sm text-gray-600">Total Saved</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {goals.reduce((sum, goal) => sum + goal.targetAmount, 0).toFixed(2)} APT
              </p>
              <p className="text-sm text-gray-600">Total Target</p>
            </div>
          </div>
        )}

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => {
            const progress = getProgressPercentage(goal);
            const daysRemaining = getDaysRemaining(goal.targetDate);
            const projectedCompletion = getProjectedCompletion(goal);
            const category = GOAL_CATEGORIES[goal.category];

            return (
              <div key={goal.id} className="bg-white border rounded-xl p-6 hover:shadow-md transition-shadow">
                {/* Goal Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{goal.name}</h3>
                      <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(goal.category)}`}>
                        {category.name}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowGoalDetails(goal.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ⚙️
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Goal Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Current:</span>
                    <span className="font-medium">{goal.currentAmount.toFixed(4)} APT</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Target:</span>
                    <span className="font-medium">{goal.targetAmount.toFixed(4)} APT</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Remaining:</span>
                    <span className="font-medium">{(goal.targetAmount - goal.currentAmount).toFixed(4)} APT</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Target Date:</span>
                    <span className={`font-medium ${daysRemaining < 30 ? 'text-red-600' : 'text-gray-900'}`}>
                      {daysRemaining > 0 ? `${daysRemaining} days` : 'Overdue'}
                    </span>
                  </div>
                </div>

                {/* Auto Deposit Status */}
                {goal.autoDepositEnabled && (
                  <div className="bg-green-50 rounded-lg p-3 mb-4">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-green-600">🔄</span>
                      <span className="text-sm font-medium text-green-800">Auto-deposit active</span>
                    </div>
                    <p className="text-xs text-green-700">
                      {goal.autoDepositAmount} APT every {goal.autoDepositFrequency}
                    </p>
                    {projectedCompletion && (
                      <p className="text-xs text-green-600 mt-1">
                        Projected completion: {projectedCompletion.toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}

                {/* Milestones */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Milestones</p>
                  <div className="flex space-x-1">
                    {goal.milestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        className={`flex-1 h-2 rounded-full ${milestone.achieved ? 'bg-green-500' : 'bg-gray-200'
                          }`}
                        title={`${milestone.percentage}% - ${milestone.achieved ? 'Achieved!' : 'Pending'}`}
                      ></div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Quick Deposit */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => makeGoalDeposit(goal.id, 10)}
                    disabled={loading}
                    className="flex-1 bg-blue-100 text-blue-700 py-2 px-3 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    +10 APT
                  </button>
                  <button
                    onClick={() => makeGoalDeposit(goal.id, 50)}
                    disabled={loading}
                    className="flex-1 bg-green-100 text-green-700 py-2 px-3 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    +50 APT
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {goals.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-blue-600 text-2xl">🎯</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Savings Goals Yet</h3>
            <p className="text-gray-600 mb-4">Create your first savings goal to start tracking your progress</p>
            <button
              onClick={() => setShowCreateGoal(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Create Your First Goal
            </button>
          </div>
        )}

        {/* Create Goal Modal */}
        {showCreateGoal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Savings Goal</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Goal Name *</label>
                  <input
                    type="text"
                    value={newGoal.name}
                    onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                    placeholder="e.g., Emergency Fund"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={newGoal.category}
                    onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value as keyof typeof GOAL_CATEGORIES })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.entries(GOAL_CATEGORIES).map(([key, category]) => (
                      <option key={key} value={key}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Amount (APT) *</label>
                  <input
                    type="number"
                    value={newGoal.targetAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                    placeholder="1000"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Date *</label>
                  <input
                    type="date"
                    value={newGoal.targetDate}
                    onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Savings Account</label>
                  <select
                    value={newGoal.vaultId}
                    onChange={(e) => setNewGoal({ ...newGoal, vaultId: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {vaults.map((vault) => (
                      <option key={vault.id} value={vault.id}>
                        {vault.name} ({vault.apy / 100}% APY)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newGoal.autoDepositEnabled}
                      onChange={(e) => setNewGoal({ ...newGoal, autoDepositEnabled: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Enable automatic deposits</span>
                  </label>
                </div>

                {newGoal.autoDepositEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Amount (APT)</label>
                      <input
                        type="number"
                        value={newGoal.autoDepositAmount}
                        onChange={(e) => setNewGoal({ ...newGoal, autoDepositAmount: e.target.value })}
                        placeholder="100"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                      <select
                        value={newGoal.autoDepositFrequency}
                        onChange={(e) => setNewGoal({ ...newGoal, autoDepositFrequency: e.target.value as 'daily' | 'weekly' | 'monthly' })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                  <textarea
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                    placeholder="What are you saving for?"
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowCreateGoal(false);
                      setError(null);
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createGoal}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Goal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
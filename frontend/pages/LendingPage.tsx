import { useState } from "react";
import { LoanApplicationForm } from "@/components/lending/LoanApplicationForm";
import { BorrowerDashboard } from "@/components/lending/BorrowerDashboard";
import { LenderDashboard } from "@/components/lending/LenderDashboard";
import { LoanRepaymentForm } from "@/components/lending/LoanRepaymentForm";

type LendingView = "application" | "borrower" | "lender" | "repayment";

export function LendingPage() {
  const [currentView, setCurrentView] = useState<LendingView>("application");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            P2P Lending System
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Reputation-based lending with scheduled payments. Higher reputation scores unlock better interest rates and under-collateralized loans.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setCurrentView("application")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentView === "application"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Apply for Loan
            </button>
            <button
              onClick={() => setCurrentView("borrower")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentView === "borrower"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Borrower Dashboard
            </button>
            <button
              onClick={() => setCurrentView("lender")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentView === "lender"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Lender Dashboard
            </button>
            <button
              onClick={() => setCurrentView("repayment")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentView === "repayment"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Make Payment
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {currentView === "application" && <LoanApplicationForm />}
          {currentView === "borrower" && <BorrowerDashboard />}
          {currentView === "lender" && <LenderDashboard />}
          {currentView === "repayment" && <LoanRepaymentForm />}
        </div>

        {/* Info Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Reputation-Based Rates
            </h3>
            <p className="text-blue-700 text-sm">
              Higher reputation scores (60-100) unlock lower interest rates, from 20% down to 5% APR.
            </p>
          </div>
          <div className="bg-green-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              Scheduled Payments
            </h3>
            <p className="text-green-700 text-sm">
              Flexible payment schedules with automated tracking and reputation updates for timely payments.
            </p>
          </div>
          <div className="bg-purple-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">
              Under-Collateralized Loans
            </h3>
            <p className="text-purple-700 text-sm">
              High reputation borrowers can access loans with reduced or no collateral requirements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
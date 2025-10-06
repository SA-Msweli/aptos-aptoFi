import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Internal Components
import { Header } from "@/components/Header";
import { DevNavigation } from "@/components/DevNavigation";
import { HomePage } from "./pages/HomePage";
import { Stake } from "./pages/Stake";
import { PaymentPage } from "./pages/PaymentPage";
import { DexPage } from "./pages/DexPage";
import { VaultPage } from "./pages/VaultPage";
import { LendingPage } from "./pages/LendingPage";
import { TopBanner } from "./components/TopBanner";

// Development Components
import { NoditTest } from "./components/NoditTest";
import { WalletTestPanel } from "./components/WalletTestPanel";
import { BasicCreditTest } from "./components/BasicCreditTest";
import { WorkingCreditTest } from "./components/WorkingCreditTest";

import { IS_DEV } from "./constants";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {IS_DEV && <TopBanner />}
        <Header />
        <DevNavigation />

        <main className="flex-1">
          <Routes>
            {/* Main Application Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/staking" element={<Stake />} />
            <Route path="/payments" element={<PaymentPage />} />
            <Route path="/dex" element={<DexPage />} />
            <Route path="/vaults" element={<VaultPage />} />
            <Route path="/lending" element={<LendingPage />} />

            {/* Development Routes - Only available in dev mode */}
            {IS_DEV && (
              <>
                <Route path="/dev/nodit-test" element={<NoditTest />} />
                <Route path="/dev/wallet-test" element={<WalletTestPanel />} />
                <Route path="/dev/credit-test" element={<BasicCreditTest />} />
                <Route path="/dev/working-credit-test" element={<WorkingCreditTest />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
import { Link } from "react-router-dom";
import { WalletSelector } from "./WalletSelector";
import { Navigation } from "./Navigation";

export function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="flex items-center justify-between px-4 py-3 max-w-screen-xl mx-auto w-full">
        <Link to="/" className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Optimus
          </h1>
        </Link>

        <div className="flex gap-4 items-center">
          <WalletSelector />
        </div>
      </div>
      <Navigation />
    </header>
  );
}

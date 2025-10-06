import { Link } from "react-router-dom";
import {
  Coins,
  Send,
  ArrowLeftRight,
  Vault,
  HandCoins,
  TrendingUp,
  Shield,
  Zap
} from "lucide-react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

const features = [
  {
    name: "Staking",
    description: "Stake your APT tokens and earn rewards with our secure staking platform.",
    href: "/staking",
    icon: Coins,
    color: "bg-blue-500",
    hoverColor: "hover:bg-blue-600",
  },
  {
    name: "P2P Payments",
    description: "Send tokens instantly to other Aptos addresses with real-time monitoring.",
    href: "/payments",
    icon: Send,
    color: "bg-green-500",
    hoverColor: "hover:bg-green-600",
  },
  {
    name: "DEX Trading",
    description: "Trade tokens with optimal liquidity using Hyperion's concentrated liquidity.",
    href: "/dex",
    icon: ArrowLeftRight,
    color: "bg-purple-500",
    hoverColor: "hover:bg-purple-600",
  },
  {
    name: "Yield Vaults",
    description: "Deposit assets into automated yield-generating vaults for passive income.",
    href: "/vaults",
    icon: Vault,
    color: "bg-orange-500",
    hoverColor: "hover:bg-orange-600",
  },
  {
    name: "P2P Lending",
    description: "Access under-collateralized loans based on your reputation score.",
    href: "/lending",
    icon: HandCoins,
    color: "bg-indigo-500",
    hoverColor: "hover:bg-indigo-600",
  },
];

const highlights = [
  {
    icon: TrendingUp,
    title: "Hyperion Integration",
    description: "Leveraging concentrated liquidity for optimal capital efficiency",
  },
  {
    icon: Shield,
    title: "Reputation System",
    description: "On-chain identity with real-time reputation scoring via Nodit",
  },
  {
    icon: Zap,
    title: "Real-time Data",
    description: "Live blockchain data and transaction monitoring",
  },
];

export function HomePage() {
  const { connected } = useWallet();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Welcome to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Optimus
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-6 max-w-3xl mx-auto">
            Your comprehensive DeFi banking platform on Aptos.
            Stake, trade, lend, and earn with cutting-edge blockchain technology.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Formerly AptoFi - Now evolved into Optimus
          </p>

          {!connected && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 max-w-md mx-auto">
              <p className="text-yellow-800 text-sm">
                Connect your wallet to access all features
              </p>
            </div>
          )}
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {highlights.map((highlight, index) => {
            const Icon = highlight.icon;
            return (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
                  <Icon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {highlight.title}
                </h3>
                <p className="text-gray-600">
                  {highlight.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.name}
                to={feature.href}
                className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="p-6">
                  <div className={`inline-flex items-center justify-center w-12 h-12 ${feature.color} rounded-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {feature.name}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                  <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
                    <span>Get started</span>
                    <ArrowLeftRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Stats Section */}
        <div className="mt-20 bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Powered by Leading Technology
            </h2>
            <p className="text-gray-600">
              Built on Aptos with Hyperion and Nodit integration for optimal performance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">Hyperion</div>
              <div className="text-gray-600">Concentrated Liquidity Market Maker</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">Nodit</div>
              <div className="text-gray-600">Real-time Blockchain Data</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">Aptos</div>
              <div className="text-gray-600">High-Performance Blockchain</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
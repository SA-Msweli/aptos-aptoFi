import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { ChevronDown, ChevronUp, Code } from "lucide-react";
import { IS_DEV } from "@/constants";

const devRoutes = [
  {
    name: "Nodit Test",
    href: "/dev/nodit-test",
    description: "Test Nodit API integration",
  },
  {
    name: "Wallet Test",
    href: "/dev/wallet-test",
    description: "Test enhanced wallet functionality",
  },
  {
    name: "Credit Demo",
    href: "/dev/credit-test",
    description: "Basic credit score demonstration",
  },
  {
    name: "Full Credit Test",
    href: "/dev/working-credit-test",
    description: "Complete credit system testing",
  },
];

export function DevNavigation() {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();

  if (!IS_DEV) return null;

  const isDevRoute = location.pathname.startsWith('/dev/');

  return (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="max-w-screen-xl mx-auto px-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full py-3 text-sm font-medium text-yellow-800 hover:text-yellow-900"
        >
          <div className="flex items-center space-x-2">
            <Code className="h-4 w-4" />
            <span>Development Tools</span>
            {isDevRoute && (
              <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full">
                Active
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {isExpanded && (
          <div className="pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {devRoutes.map((route) => {
                const isActive = location.pathname === route.href;
                return (
                  <Link
                    key={route.name}
                    to={route.href}
                    className={`block p-3 rounded-lg border transition-colors ${isActive
                        ? "bg-yellow-200 border-yellow-300 text-yellow-900"
                        : "bg-white border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                      }`}
                  >
                    <div className="font-medium text-sm">{route.name}</div>
                    <div className="text-xs mt-1 opacity-75">{route.description}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
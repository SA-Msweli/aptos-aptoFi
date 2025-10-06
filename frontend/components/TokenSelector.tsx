// React import removed - not needed with new JSX transform
import { ChevronDown, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TokenInfo {
  coinType: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: number;
  formattedBalance: string;
}

interface TokenSelectorProps {
  selectedToken: TokenInfo;
  availableTokens: TokenInfo[];
  onTokenSelect: (token: TokenInfo) => void;
  showBalance?: boolean;
  disabled?: boolean;
}

export function TokenSelector({
  selectedToken,
  availableTokens,
  onTokenSelect,
  showBalance = true,
  disabled = false
}: TokenSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between"
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">{selectedToken.symbol}</div>
              {showBalance && selectedToken.formattedBalance && (
                <div className="text-xs text-muted-foreground">
                  Balance: {selectedToken.formattedBalance}
                </div>
              )}
            </div>
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-full min-w-[200px]">
        {availableTokens.map((token) => (
          <DropdownMenuItem
            key={token.coinType}
            onClick={() => onTokenSelect(token)}
            className="flex items-center justify-between p-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                {token.symbol.slice(0, 2)}
              </div>
              <div>
                <div className="font-medium">{token.symbol}</div>
                <div className="text-xs text-muted-foreground">{token.name}</div>
              </div>
            </div>
            {showBalance && token.formattedBalance && (
              <div className="text-right">
                <div className="text-sm font-medium">{token.formattedBalance}</div>
                <div className="text-xs text-muted-foreground">{token.symbol}</div>
              </div>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default TokenSelector;
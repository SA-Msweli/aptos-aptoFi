import { useToast } from "@/components/ui/use-toast";
import { REWARD_CREATOR_ADDRESS } from "@/constants";
import { useGetStakePoolData } from "@/hooks/useGetStakePoolData";
import { useGetTokenData } from "@/hooks/useGetTokenData";
import { convertAmountFromOnChainToHumanReadable } from "@/utils/helpers";
import { getAccountTokenBalance } from "@/view-functions/getAccountTokenAmount";
import { getClaimableRewards } from "@/view-functions/getClaimableRewards";
import { getUserHasStake } from "@/view-functions/getUserHasStake";
import { getUserStakeData } from "@/view-functions/getUserStakeData";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { PropsWithChildren, createContext, useEffect, useState } from "react";
import { noditService } from "@/services/noditService";
import { didExists } from "@/view-functions/getDID";

export interface AccountDataDataProviderState {
  hasStake: boolean;
  hasRewards: boolean;
  claimableRewards: number;
  accountStakeAmount: number;
  isCreator: boolean;
  accountTokenBalance: string;
  // Enhanced wallet functionality
  multiTokenCount: number;
  recentTransactionCount: number;
  // DID system
  hasDID: boolean;
}

const defaultValues: AccountDataDataProviderState = {
  hasStake: false,
  hasRewards: false,
  claimableRewards: 0,
  accountStakeAmount: 0,
  isCreator: false,
  accountTokenBalance: "0",
  // Enhanced wallet functionality defaults
  multiTokenCount: 0,
  recentTransactionCount: 0,
  // DID system defaults
  hasDID: false,
};

export const AccountDataContext = createContext<AccountDataDataProviderState>(defaultValues);

export const AccountDataContextProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { account } = useWallet();
  const { tokenData } = useGetTokenData();
  const { toast } = useToast();
  const { existsRewardSchedule } = useGetStakePoolData();

  const [hasStake, setHasStake] = useState<boolean>(false);
  const [hasRewards, setHasRewards] = useState<boolean>(false);
  const [claimableRewards, setClaimableRewards] = useState<number>(0);
  const [accountStakeAmount, setAccountStakeAmount] = useState<number>(0);
  const [isCreator, setIsCreator] = useState<boolean>(false);
  const [accountTokenBalance, setAccountTokenBalance] = useState<string>("0");
  const [multiTokenCount, setMultiTokenCount] = useState<number>(0);
  const [recentTransactionCount, setRecentTransactionCount] = useState<number>(0);
  const [hasDID, setHasDID] = useState<boolean>(false);
  // const [reputationScore, setReputationScore] = useState<number>(50); // Removed

  const { data } = useQuery({
    queryKey: ["account-data-context", account, existsRewardSchedule],
    refetchInterval: 1000 * 30,
    queryFn: async () => {
      try {
        if (!account) return defaultValues;
        /**
         * Get the current connected account claimable rewards
         */
        let claimableRewards = 0;
        if (existsRewardSchedule) {
          claimableRewards = await getClaimableRewards(account?.address.toStringLong());
        }

        /**
         * Determine whether the current connected account has staked
         */
        const hasStake = await getUserHasStake(account?.address.toStringLong());

        /**
         * Get the current connected account stake data
         */
        let accountStakeData;
        let accountStakeAmount = 0;
        if (hasStake) {
          accountStakeData = await getUserStakeData(account?.address.toStringLong());

          accountStakeAmount = convertAmountFromOnChainToHumanReadable(
            parseInt(accountStakeData?.amount ?? "0"),
            tokenData?.decimals ?? 0,
          );
        }

        /**
         * Define whether the current connected account is the stake creator
         */
        const isCreator = REWARD_CREATOR_ADDRESS && account?.address === REWARD_CREATOR_ADDRESS;
        /**
         * Get the TOKEN balance of an Account
         *
         * The token amount is represnted is the smallest unit on chain. i.e if an account balance is 500
         * and the token decimals is 2, then the account token balance is represnted as 50000 (500 as the balance and
         * 00 as the decimals).
         *
         * This query first fetch the account token balance, then the token decimals and calculates
         * the account balance and converts it into a human readable format.
         */
        const onChainBalance = await getAccountTokenBalance(account?.address.toStringLong());
        const accountTokenBalance = convertAmountFromOnChainToHumanReadable(
          onChainBalance,
          tokenData?.decimals ?? 0,
        ).toLocaleString(undefined, {
          minimumFractionDigits: 4,
          maximumFractionDigits: 4,
        });

        /**
         * Enhanced wallet functionality - get multi-token balance count and recent transactions
         */
        let multiTokenCount = 0;
        let recentTransactionCount = 0;

        try {
          // Get multi-token balances using Nodit
          const balances = await noditService.getAccountBalances(account.address.toStringLong());
          multiTokenCount = balances.length;

          // Get recent transaction count using Nodit
          const transactions = await noditService.getAccountTransactions(account.address.toStringLong(), 10);
          recentTransactionCount = transactions.length;
        } catch (error) {
          console.log("Enhanced wallet features unavailable:", error);
          // Fallback to defaults if Nodit is unavailable
        }

        /**
         * DID system integration - check if user has DID
         */
        let hasDID = false;

        try {
          hasDID = await didExists(account.address.toStringLong());
        } catch (error) {
          console.log("DID system unavailable:", error);
          // Fallback to defaults if contract is not deployed
        }

        return {
          claimableRewards,
          hasStake,
          accountStakeAmount,
          isCreator,
          accountTokenBalance,
          multiTokenCount,
          recentTransactionCount,
          hasDID
        };
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error,
        });
      }
    },
  });

  useEffect(() => {
    if (data) {
      setClaimableRewards(data.claimableRewards);
      setHasRewards(data.claimableRewards > 0);
      setHasStake(data.hasStake);
      setAccountStakeAmount(data.accountStakeAmount);
      setIsCreator(data.isCreator);
      setAccountTokenBalance(data.accountTokenBalance);
      setMultiTokenCount(data.multiTokenCount || 0);
      setRecentTransactionCount(data.recentTransactionCount || 0);
      setHasDID(data.hasDID || false);
    }
  }, [data]);

  return (
    <AccountDataContext.Provider
      value={{
        accountTokenBalance,
        hasStake,
        hasRewards,
        claimableRewards,
        accountStakeAmount,
        isCreator,
        multiTokenCount,
        recentTransactionCount,
        hasDID
      }}
    >
      {children}
    </AccountDataContext.Provider>
  );
};

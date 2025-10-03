import { aptosClient } from "@/lib/aptos";
import { CONTRACT_ADDRESSES } from "@/lib/constants";

export interface UserProfile {
  walletAddress: string;
  profileHash: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  reputationScore: number;
  metadataKeys: string[];
  metadataValues: string[];
}

export interface ReputationData {
  baseScore: number;
  transactionScore: number;
  lendingScore: number;
  governanceScore: number;
  totalScore: number;
  lastUpdated: number;
}

export const getUserProfile = async (accountAddress: string): Promise<UserProfile | null> => {
  try {
    const resource = await aptosClient().getAccountResource({
      accountAddress,
      resourceType: `${CONTRACT_ADDRESSES.DID_REGISTRY}::UserProfile`,
    });

    if (resource) {
      const data = resource.data as any;
      return {
        walletAddress: data.wallet_address,
        profileHash: data.profile_hash,
        isActive: data.is_active,
        createdAt: parseInt(data.created_at),
        updatedAt: parseInt(data.updated_at),
        reputationScore: parseInt(data.reputation_score || 0),
        metadataKeys: Object.keys(data.metadata || {}),
        metadataValues: Object.values(data.metadata || {}),
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

export const getReputationData = async (accountAddress: string): Promise<ReputationData | null> => {
  try {
    const resource = await aptosClient().getAccountResource({
      accountAddress,
      resourceType: `${CONTRACT_ADDRESSES.REPUTATION_SYSTEM}::ReputationScore`,
    });

    if (resource) {
      const data = resource.data as any;
      return {
        baseScore: parseInt(data.base_score),
        transactionScore: parseInt(data.transaction_score),
        lendingScore: parseInt(data.lending_score),
        governanceScore: parseInt(data.governance_score),
        totalScore: parseInt(data.total_score),
        lastUpdated: parseInt(data.last_updated),
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching reputation data:", error);
    return null;
  }
};

export const getTotalUsers = async (): Promise<number> => {
  try {
    const result = await aptosClient().view({
      payload: {
        function: `${CONTRACT_ADDRESSES.DID_REGISTRY}::get_total_users`,
        functionArguments: [],
      },
    });
    return parseInt(result[0] as string);
  } catch (error) {
    console.error("Error fetching total users:", error);
    return 0;
  }
};

export const profileExists = async (accountAddress: string): Promise<boolean> => {
  const profile = await getUserProfile(accountAddress);
  return profile !== null && profile.isActive;
};
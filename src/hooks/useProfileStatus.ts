"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { getUserProfile, UserProfile } from "@/view-functions/getProfile";

export interface ProfileStatus {
  profile: UserProfile | null;
  hasProfile: boolean;
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProfileStatus(): ProfileStatus {
  const { connected, account } = useWallet();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!connected || !account?.address) {
      setProfile(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userProfile = await getUserProfile(account.address.toString());
      setProfile(userProfile);
    } catch (err: any) {
      console.error("Failed to fetch profile:", err);
      setError(err.message || "Failed to fetch profile");
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [connected, account]);

  return {
    profile,
    hasProfile: profile !== null,
    isActive: profile?.isActive ?? false,
    isLoading,
    error,
    refetch: fetchProfile,
  };
}
import { aptosClient } from "@/lib/aptos";

export const getAccountAPTBalance = async (accountAddress: string): Promise<number> => {
  try {
    const balance = await aptosClient().getAccountAPTAmount({
      accountAddress,
    });
    return balance;
  } catch (error) {
    console.error("Error fetching APT balance:", error);
    return 0;
  }
};

export const getAccountCoinBalance = async (
  accountAddress: string,
  coinType: string
): Promise<number> => {
  try {
    const resources = await aptosClient().getAccountResources({
      accountAddress,
    });

    const coinStore = resources.find(
      (resource) => resource.type === `0x1::coin::CoinStore<${coinType}>`
    );

    if (coinStore) {
      return parseInt((coinStore.data as any).coin.value);
    }
    return 0;
  } catch (error) {
    console.error("Error fetching coin balance:", error);
    return 0;
  }
};
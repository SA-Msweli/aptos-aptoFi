module aptofi::simple_token {

    struct SimplePool<phantom CoinA, phantom CoinB> has key {
        coin_a_reserve: u64,
        coin_b_reserve: u64,
        fee_rate: u64,
    }

    struct PoolRegistry has key {
        total_pools: u64,
    }

    public entry fun initialize(_admin: &signer) {
        move_to(_admin, PoolRegistry {
            total_pools: 0,
        });
    }

    public entry fun create_pool<CoinA, CoinB>(
        account: &signer,
        initial_a: u64,
        initial_b: u64
    ) acquires PoolRegistry {
        let pool = SimplePool<CoinA, CoinB> {
            coin_a_reserve: initial_a,
            coin_b_reserve: initial_b,
            fee_rate: 30, // 0.3%
        };
        
        move_to(account, pool);

        let registry = borrow_global_mut<PoolRegistry>(@aptofi);
        registry.total_pools = registry.total_pools + 1;
    }

    #[view]
    public fun get_pool_info<CoinA, CoinB>(pool_address: address): (u64, u64, u64) acquires SimplePool {
        let pool = borrow_global<SimplePool<CoinA, CoinB>>(pool_address);
        (pool.coin_a_reserve, pool.coin_b_reserve, pool.fee_rate)
    }

    #[view]
    public fun get_total_pools(): u64 acquires PoolRegistry {
        let registry = borrow_global<PoolRegistry>(@aptofi);
        registry.total_pools
    }
}
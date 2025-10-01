module aptofi::amm {
    use std::signer;
    use std::string::String;
    use aptos_framework::timestamp;
    use aptos_framework::table::{Self, Table};
    use aptos_framework::event;
    use aptos_std::math64;
    
    use aptofi::did_registry;

    // Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_POOL_NOT_FOUND: u64 = 2;
    const E_INSUFFICIENT_LIQUIDITY: u64 = 3;
    const E_SLIPPAGE_EXCEEDED: u64 = 4;
    const E_INVALID_AMOUNT: u64 = 5;

    // Constants
    const FEE_RATE: u64 = 30; // 0.3% in basis points
    const BASIS_POINTS: u64 = 10000;

    struct LiquidityPool has key {
        token_a_reserve: u64,
        token_b_reserve: u64,
        lp_supply: u64,
        fee_rate: u64,
        token_a_symbol: String,
        token_b_symbol: String,
        created_at: u64,
    }

    struct PoolRegistry has key {
        total_pools: u64,
        pools: Table<String, address>, // pool_key -> pool_address
        admin: address,
    }

    struct UserLPPosition has key {
        pools: Table<String, u64>, // pool_key -> lp_tokens
    }

    #[event]
    struct SwapEvent has drop, store {
        user: address,
        pool_key: String,
        token_in: String,
        token_out: String,
        amount_in: u64,
        amount_out: u64,
        fee_amount: u64,
        timestamp: u64,
    }

    #[event]
    struct LiquidityEvent has drop, store {
        user: address,
        pool_key: String,
        action: u8, // 1: add, 2: remove
        token_a_amount: u64,
        token_b_amount: u64,
        lp_tokens: u64,
        timestamp: u64,
    }

    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        move_to(admin, PoolRegistry {
            total_pools: 0,
            pools: table::new(),
            admin: admin_addr,
        });
    }

    public entry fun create_pool(
        account: &signer,
        token_a_symbol: String,
        token_b_symbol: String,
        initial_a: u64,
        initial_b: u64
    ) acquires PoolRegistry, UserLPPosition {
        let user_addr = signer::address_of(account);
        assert!(did_registry::profile_exists(user_addr), E_NOT_AUTHORIZED);
        assert!(initial_a > 0 && initial_b > 0, E_INVALID_AMOUNT);

        let pool_key = create_pool_key(token_a_symbol, token_b_symbol);
        let registry = borrow_global_mut<PoolRegistry>(@aptofi);
        assert!(!table::contains(&registry.pools, pool_key), E_POOL_NOT_FOUND);

        let initial_lp_supply = (initial_a * initial_b) / 1000; // Simplified geometric mean

        let pool = LiquidityPool {
            token_a_reserve: initial_a,
            token_b_reserve: initial_b,
            lp_supply: initial_lp_supply,
            fee_rate: FEE_RATE,
            token_a_symbol,
            token_b_symbol,
            created_at: timestamp::now_seconds(),
        };

        move_to(account, pool);
        table::add(&mut registry.pools, pool_key, user_addr);
        registry.total_pools = registry.total_pools + 1;

        // Initialize user LP position
        if (!exists<UserLPPosition>(user_addr)) {
            move_to(account, UserLPPosition {
                pools: table::new(),
            });
        };

        let user_position = borrow_global_mut<UserLPPosition>(user_addr);
        table::add(&mut user_position.pools, pool_key, initial_lp_supply);

        event::emit(LiquidityEvent {
            user: user_addr,
            pool_key,
            action: 1,
            token_a_amount: initial_a,
            token_b_amount: initial_b,
            lp_tokens: initial_lp_supply,
            timestamp: timestamp::now_seconds(),
        });
    }

    public entry fun swap_exact_input(
        account: &signer,
        pool_address: address,
        token_in_symbol: String,
        amount_in: u64,
        min_amount_out: u64
    ) acquires LiquidityPool {
        let user_addr = signer::address_of(account);
        assert!(did_registry::profile_exists(user_addr), E_NOT_AUTHORIZED);
        assert!(amount_in > 0, E_INVALID_AMOUNT);
        assert!(exists<LiquidityPool>(pool_address), E_POOL_NOT_FOUND);

        let pool = borrow_global_mut<LiquidityPool>(pool_address);
        
        // Calculate swap amounts using constant product formula
        let (amount_out, fee_amount, token_out_symbol) = if (token_in_symbol == pool.token_a_symbol) {
            let amount_in_with_fee = amount_in * (BASIS_POINTS - pool.fee_rate) / BASIS_POINTS;
            let amount_out = (pool.token_b_reserve * amount_in_with_fee) / (pool.token_a_reserve + amount_in_with_fee);
            
            pool.token_a_reserve = pool.token_a_reserve + amount_in;
            pool.token_b_reserve = pool.token_b_reserve - amount_out;
            
            (amount_out, amount_in - amount_in_with_fee, pool.token_b_symbol)
        } else {
            let amount_in_with_fee = amount_in * (BASIS_POINTS - pool.fee_rate) / BASIS_POINTS;
            let amount_out = (pool.token_a_reserve * amount_in_with_fee) / (pool.token_b_reserve + amount_in_with_fee);
            
            pool.token_b_reserve = pool.token_b_reserve + amount_in;
            pool.token_a_reserve = pool.token_a_reserve - amount_out;
            
            (amount_out, amount_in - amount_in_with_fee, pool.token_a_symbol)
        };

        assert!(amount_out >= min_amount_out, E_SLIPPAGE_EXCEEDED);

        let pool_key = create_pool_key(pool.token_a_symbol, pool.token_b_symbol);
        
        event::emit(SwapEvent {
            user: user_addr,
            pool_key,
            token_in: token_in_symbol,
            token_out: token_out_symbol,
            amount_in,
            amount_out,
            fee_amount,
            timestamp: timestamp::now_seconds(),
        });
    }

    public entry fun add_liquidity(
        account: &signer,
        pool_address: address,
        token_a_amount: u64,
        token_b_amount: u64,
        min_lp_tokens: u64
    ) acquires LiquidityPool, UserLPPosition {
        let user_addr = signer::address_of(account);
        assert!(did_registry::profile_exists(user_addr), E_NOT_AUTHORIZED);
        assert!(exists<LiquidityPool>(pool_address), E_POOL_NOT_FOUND);
        assert!(token_a_amount > 0 && token_b_amount > 0, E_INVALID_AMOUNT);

        let pool = borrow_global_mut<LiquidityPool>(pool_address);
        
        // Calculate optimal amounts based on current reserves
        let (optimal_a, optimal_b) = if (pool.token_a_reserve == 0 && pool.token_b_reserve == 0) {
            (token_a_amount, token_b_amount) // First liquidity provision
        } else {
            let ratio_a = (token_a_amount * pool.token_b_reserve) / pool.token_a_reserve;
            let ratio_b = (token_b_amount * pool.token_a_reserve) / pool.token_b_reserve;
            
            if (ratio_a <= token_b_amount) {
                (token_a_amount, ratio_a)
            } else {
                (ratio_b, token_b_amount)
            }
        };

        // Calculate LP tokens to mint
        let lp_tokens = if (pool.lp_supply == 0) {
            // First liquidity: geometric mean
            let sqrt_product = math64::sqrt(optimal_a * optimal_b);
            sqrt_product
        } else {
            // Subsequent liquidity: proportional to existing supply
            let lp_from_a = (optimal_a * pool.lp_supply) / pool.token_a_reserve;
            let lp_from_b = (optimal_b * pool.lp_supply) / pool.token_b_reserve;
            math64::min(lp_from_a, lp_from_b)
        };

        assert!(lp_tokens >= min_lp_tokens, E_SLIPPAGE_EXCEEDED);

        // Update pool reserves
        pool.token_a_reserve = pool.token_a_reserve + optimal_a;
        pool.token_b_reserve = pool.token_b_reserve + optimal_b;
        pool.lp_supply = pool.lp_supply + lp_tokens;

        // Update user LP position
        if (!exists<UserLPPosition>(user_addr)) {
            move_to(account, UserLPPosition {
                pools: table::new(),
            });
        };

        let user_position = borrow_global_mut<UserLPPosition>(user_addr);
        let pool_key = create_pool_key(pool.token_a_symbol, pool.token_b_symbol);
        
        if (table::contains(&user_position.pools, pool_key)) {
            let current_lp = table::borrow_mut(&mut user_position.pools, pool_key);
            *current_lp = *current_lp + lp_tokens;
        } else {
            table::add(&mut user_position.pools, pool_key, lp_tokens);
        };

        event::emit(LiquidityEvent {
            user: user_addr,
            pool_key,
            action: 1, // Add liquidity
            token_a_amount: optimal_a,
            token_b_amount: optimal_b,
            lp_tokens,
            timestamp: timestamp::now_seconds(),
        });
    }

    public entry fun remove_liquidity(
        account: &signer,
        pool_address: address,
        lp_tokens_to_burn: u64,
        min_token_a: u64,
        min_token_b: u64
    ) acquires LiquidityPool, UserLPPosition {
        let user_addr = signer::address_of(account);
        assert!(exists<UserLPPosition>(user_addr), E_INSUFFICIENT_LIQUIDITY);
        assert!(exists<LiquidityPool>(pool_address), E_POOL_NOT_FOUND);
        assert!(lp_tokens_to_burn > 0, E_INVALID_AMOUNT);

        let pool = borrow_global_mut<LiquidityPool>(pool_address);
        let user_position = borrow_global_mut<UserLPPosition>(user_addr);
        let pool_key = create_pool_key(pool.token_a_symbol, pool.token_b_symbol);
        
        assert!(table::contains(&user_position.pools, pool_key), E_INSUFFICIENT_LIQUIDITY);
        let user_lp_balance = table::borrow_mut(&mut user_position.pools, pool_key);
        assert!(*user_lp_balance >= lp_tokens_to_burn, E_INSUFFICIENT_LIQUIDITY);

        // Calculate tokens to return
        let token_a_amount = (lp_tokens_to_burn * pool.token_a_reserve) / pool.lp_supply;
        let token_b_amount = (lp_tokens_to_burn * pool.token_b_reserve) / pool.lp_supply;

        assert!(token_a_amount >= min_token_a, E_SLIPPAGE_EXCEEDED);
        assert!(token_b_amount >= min_token_b, E_SLIPPAGE_EXCEEDED);

        // Update pool reserves
        pool.token_a_reserve = pool.token_a_reserve - token_a_amount;
        pool.token_b_reserve = pool.token_b_reserve - token_b_amount;
        pool.lp_supply = pool.lp_supply - lp_tokens_to_burn;

        // Update user LP position
        *user_lp_balance = *user_lp_balance - lp_tokens_to_burn;

        event::emit(LiquidityEvent {
            user: user_addr,
            pool_key,
            action: 2, // Remove liquidity
            token_a_amount,
            token_b_amount,
            lp_tokens: lp_tokens_to_burn,
            timestamp: timestamp::now_seconds(),
        });
    }

    fun create_pool_key(token_a: String, _token_b: String): String {
        // Simple concatenation - in production, use proper sorting
        token_a
    }

    #[view]
    public fun get_pool_info(pool_address: address): (u64, u64, u64, u64, String, String) acquires LiquidityPool {
        assert!(exists<LiquidityPool>(pool_address), E_POOL_NOT_FOUND);
        
        let pool = borrow_global<LiquidityPool>(pool_address);
        (
            pool.token_a_reserve,
            pool.token_b_reserve,
            pool.lp_supply,
            pool.fee_rate,
            pool.token_a_symbol,
            pool.token_b_symbol
        )
    }

    #[view]
    public fun get_swap_quote(
        pool_address: address,
        token_in_symbol: String,
        amount_in: u64
    ): u64 acquires LiquidityPool {
        assert!(exists<LiquidityPool>(pool_address), E_POOL_NOT_FOUND);
        
        let pool = borrow_global<LiquidityPool>(pool_address);
        
        if (token_in_symbol == pool.token_a_symbol) {
            let amount_in_with_fee = amount_in * (BASIS_POINTS - pool.fee_rate) / BASIS_POINTS;
            (pool.token_b_reserve * amount_in_with_fee) / (pool.token_a_reserve + amount_in_with_fee)
        } else {
            let amount_in_with_fee = amount_in * (BASIS_POINTS - pool.fee_rate) / BASIS_POINTS;
            (pool.token_a_reserve * amount_in_with_fee) / (pool.token_b_reserve + amount_in_with_fee)
        }
    }

    #[view]
    public fun get_total_pools(): u64 acquires PoolRegistry {
        let registry = borrow_global<PoolRegistry>(@aptofi);
        registry.total_pools
    }

    #[view]
    public fun get_user_lp_balance(user_address: address, pool_key: String): u64 acquires UserLPPosition {
        if (!exists<UserLPPosition>(user_address)) {
            return 0
        };
        
        let position = borrow_global<UserLPPosition>(user_address);
        if (!table::contains(&position.pools, pool_key)) {
            return 0
        };
        
        *table::borrow(&position.pools, pool_key)
    }
}
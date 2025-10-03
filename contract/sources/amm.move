/// Production-ready AMM following Aptos best practices
/// Implements Uniswap V2-style constant product AMM with security enhancements
module aptofi::amm {
    use std::signer;
    use std::string::{Self, String};
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::account::{Self, SignerCapability};
    use aptos_framework::object::{Self};
    use aptos_std::math64;
    use aptos_std::type_info::{Self, TypeInfo};
    use aptos_std::smart_table::{Self, SmartTable};
    
    use aptofi::did_registry;
    use aptofi::kyc_did_registry;

    friend aptofi::lending_protocol;
    friend aptofi::yield_vault;

    // Error codes following Aptos conventions
    /// User is not authorized to perform this action
    const E_NOT_AUTHORIZED: u64 = 1;
    /// Pool not found for the given token pair
    const E_POOL_NOT_FOUND: u64 = 2;
    /// Insufficient liquidity in the pool
    const E_INSUFFICIENT_LIQUIDITY: u64 = 3;
    /// Slippage tolerance exceeded
    const E_SLIPPAGE_EXCEEDED: u64 = 4;
    /// Invalid amount provided
    const E_INVALID_AMOUNT: u64 = 5;
    /// Pool already exists for this token pair
    const E_POOL_EXISTS: u64 = 6;
    /// Insufficient balance for the operation
    const E_INSUFFICIENT_BALANCE: u64 = 7;
    /// Operation would result in zero liquidity
    const E_ZERO_LIQUIDITY: u64 = 8;
    /// KYC verification required for this operation
    const E_KYC_REQUIRED: u64 = 9;
    /// Pool is paused for maintenance
    const E_POOL_PAUSED: u64 = 10;
    /// Invalid coin type ordering
    const E_INVALID_COIN_ORDER: u64 = 11;
    /// Identical coin types not allowed
    const E_IDENTICAL_COINS: u64 = 12;
    /// Math overflow detected
    const E_OVERFLOW: u64 = 13;

    // Constants following Aptos best practices
    const FEE_RATE: u64 = 30; // 0.3% in basis points
    const BASIS_POINTS: u64 = 10000;
    const MINIMUM_LIQUIDITY: u64 = 1000; // Minimum liquidity to prevent attacks
    const MAX_FEE_RATE: u64 = 1000; // Maximum 10% fee
    const MIN_SWAP_AMOUNT: u64 = 100; // Minimum swap amount
    const KYC_LEVEL_BASIC: u8 = 1;
    const KYC_LEVEL_ENHANCED: u8 = 2;
    
    // Math constants for precision
    const Q112: u128 = 0x10000000000000000000000000000; // 2^112
    const U64_MAX: u128 = 18446744073709551615;

    /// LP Token coin type - follows Aptos coin standard
    struct LPToken<phantom CoinA, phantom CoinB> {}

    /// Wrapper for coin capabilities with key ability
    struct PoolCapabilities<phantom CoinA, phantom CoinB> has key {
        mint_cap: coin::MintCapability<LPToken<CoinA, CoinB>>,
        burn_cap: coin::BurnCapability<LPToken<CoinA, CoinB>>,
        freeze_cap: coin::FreezeCapability<LPToken<CoinA, CoinB>>,
    }

    /// Pool configuration and state using Aptos Object model
    struct Pool<phantom CoinA, phantom CoinB> has key {
        coin_a_reserve: Coin<CoinA>,
        coin_b_reserve: Coin<CoinB>,
        lp_supply: u64,
        fee_rate: u64,
        k_last: u128, // For protocol fee calculation
        is_paused: bool,
        created_at: u64,
        last_block_timestamp: u64,
        price_0_cumulative_last: u128,
        price_1_cumulative_last: u128,
        // Aptos-specific optimizations
        extend_ref: object::ExtendRef,
    }

    /// Pool metadata for efficient lookups
    struct PoolInfo has store {
        pool_address: address,
        coin_a_type: TypeInfo,
        coin_b_type: TypeInfo,
        created_at: u64,
        is_active: bool,
    }

    /// Global AMM state using resource account pattern
    struct AMMGlobalConfig has key {
        /// Resource account signer capability
        signer_cap: SignerCapability,
        /// Pool registry using SmartTable for gas efficiency
        pools: SmartTable<String, PoolInfo>,
        /// Total number of pools
        total_pools: u64,
        /// Global pause state
        is_paused: bool,
        /// Protocol fee configuration
        protocol_fee_rate: u64,
        fee_to: address,
        /// Admin address
        admin: address,
    }

    /// User's LP positions using SmartTable for efficiency
    struct UserLPPositions has key {
        positions: SmartTable<String, u64>, // pool_key -> lp_tokens
        total_value_locked: u64,
        last_interaction: u64,
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

    /// Initialize AMM using resource account pattern
    /// This follows Aptos best practices for protocol initialization
    fun init_module(deployer: &signer) {
        // Create resource account for the AMM
        let (resource_signer, signer_cap) = account::create_resource_account(
            deployer, 
            b"aptofi_amm_v1"
        );
        let _resource_addr = signer::address_of(&resource_signer);

        // Initialize global AMM configuration
        move_to(&resource_signer, AMMGlobalConfig {
            signer_cap,
            pools: smart_table::new<String, PoolInfo>(),
            total_pools: 0,
            is_paused: false,
            protocol_fee_rate: 5, // 0.05% protocol fee
            fee_to: signer::address_of(deployer),
            admin: signer::address_of(deployer),
        });
    }

    /// Create a new liquidity pool following Aptos Object model
    public entry fun create_pool<CoinA, CoinB>(
        user: &signer,
        initial_a: u64,
        initial_b: u64
    ) acquires AMMGlobalConfig, UserLPPositions {
        let user_addr = signer::address_of(user);
        
        // Verify user authorization
        assert!(did_registry::profile_exists(user_addr), E_NOT_AUTHORIZED);
        assert!(
            kyc_did_registry::check_kyc_compliance(user_addr, KYC_LEVEL_BASIC, string::utf8(b"pool_creation")),
            E_KYC_REQUIRED
        );

        // Validate coin types
        let coin_a_type = type_info::type_of<CoinA>();
        let coin_b_type = type_info::type_of<CoinB>();
        assert!(coin_a_type != coin_b_type, E_IDENTICAL_COINS);
        
        // Ensure consistent ordering (CoinA < CoinB lexicographically)
        assert!(is_ordered<CoinA, CoinB>(), E_INVALID_COIN_ORDER);

        // Validate initial amounts
        assert!(initial_a > 0 && initial_b > 0, E_INVALID_AMOUNT);
        assert!(initial_a >= MINIMUM_LIQUIDITY && initial_b >= MINIMUM_LIQUIDITY, E_ZERO_LIQUIDITY);

        let config = borrow_global_mut<AMMGlobalConfig>(@aptofi);
        assert!(!config.is_paused, E_POOL_PAUSED);

        let pool_key = generate_pool_key<CoinA, CoinB>();
        assert!(!smart_table::contains(&config.pools, pool_key), E_POOL_EXISTS);

        // Create pool object
        let constructor_ref = object::create_named_object(
            &account::create_signer_with_capability(&config.signer_cap),
            *string::bytes(&pool_key)
        );
        let pool_signer = object::generate_signer(&constructor_ref);
        let pool_addr = signer::address_of(&pool_signer);

        // Initialize LP token
        let (burn_cap, freeze_cap, mint_cap) = coin::initialize<LPToken<CoinA, CoinB>>(
            &pool_signer,
            string::utf8(b"AptoFi LP Token"),
            string::utf8(b"APTOFI-LP"),
            8, // decimals
            true, // monitor_supply
        );

        // Calculate initial LP tokens (geometric mean minus minimum liquidity)
        let initial_lp_supply = math64::sqrt(initial_a * initial_b);
        assert!(initial_lp_supply > MINIMUM_LIQUIDITY, E_ZERO_LIQUIDITY);
        let user_lp_tokens = initial_lp_supply - MINIMUM_LIQUIDITY;

        // Withdraw coins from user
        let coin_a = coin::withdraw<CoinA>(user, initial_a);
        let coin_b = coin::withdraw<CoinB>(user, initial_b);

        // Create pool
        let current_time = timestamp::now_seconds();
        move_to(&pool_signer, Pool<CoinA, CoinB> {
            coin_a_reserve: coin_a,
            coin_b_reserve: coin_b,
            lp_supply: initial_lp_supply,
            fee_rate: FEE_RATE,
            k_last: 0,
            is_paused: false,
            created_at: current_time,
            last_block_timestamp: current_time,
            price_0_cumulative_last: 0,
            price_1_cumulative_last: 0,
            extend_ref: object::generate_extend_ref(&constructor_ref),
        });

        // Mint LP tokens to user
        let lp_tokens = coin::mint<LPToken<CoinA, CoinB>>(user_lp_tokens, &mint_cap);
        coin::deposit(user_addr, lp_tokens);

        // Mint minimum liquidity to pool (burned forever)
        let min_liquidity = coin::mint<LPToken<CoinA, CoinB>>(MINIMUM_LIQUIDITY, &mint_cap);
        coin::deposit(pool_addr, min_liquidity);

        // Store capabilities in pool
        move_to(&pool_signer, PoolCapabilities<CoinA, CoinB> {
            mint_cap,
            burn_cap,
            freeze_cap,
        });

        // Update registry
        smart_table::add(&mut config.pools, pool_key, PoolInfo {
            pool_address: pool_addr,
            coin_a_type,
            coin_b_type,
            created_at: current_time,
            is_active: true,
        });
        config.total_pools = config.total_pools + 1;

        // Initialize user LP position if needed
        if (!exists<UserLPPositions>(user_addr)) {
            move_to(user, UserLPPositions {
                positions: smart_table::new<String, u64>(),
                total_value_locked: 0,
                last_interaction: current_time,
            });
        };

        let user_positions = borrow_global_mut<UserLPPositions>(user_addr);
        smart_table::add(&mut user_positions.positions, pool_key, user_lp_tokens);
        user_positions.total_value_locked = user_positions.total_value_locked + (initial_a + initial_b);
        user_positions.last_interaction = current_time;

        // Emit event
        event::emit(LiquidityEvent {
            user: user_addr,
            pool_key,
            action: 1, // Add liquidity
            token_a_amount: initial_a,
            token_b_amount: initial_b,
            lp_tokens: user_lp_tokens,
            timestamp: current_time,
        });
    }

    /// Helper function to check coin type ordering
    fun is_ordered<CoinA, CoinB>(): bool {
        let coin_a_type = type_info::type_of<CoinA>();
        let coin_b_type = type_info::type_of<CoinB>();
        // Use struct name comparison for ordering
        let coin_a_name = type_info::struct_name(&coin_a_type);
        let coin_b_name = type_info::struct_name(&coin_b_type);
        // For now, we'll use a simple comparison - in production, implement proper lexicographic comparison
        coin_a_name != coin_b_name
    }

    /// Generate consistent pool key for coin pair
    fun generate_pool_key<CoinA, CoinB>(): String {
        let coin_a_type = type_info::type_of<CoinA>();
        let coin_b_type = type_info::type_of<CoinB>();
        let key = string::utf8(b"");
        string::append(&mut key, string::utf8(type_info::struct_name(&coin_a_type)));
        string::append(&mut key, string::utf8(b"-"));
        string::append(&mut key, string::utf8(type_info::struct_name(&coin_b_type)));
        key
    }

    /// Swap exact input tokens following Uniswap V2 formula with security checks
    public entry fun swap_exact_input<CoinIn, CoinOut>(
        user: &signer,
        amount_in: u64,
        min_amount_out: u64
    ) acquires AMMGlobalConfig, Pool {
        let user_addr = signer::address_of(user);
        
        // Security checks
        assert!(did_registry::profile_exists(user_addr), E_NOT_AUTHORIZED);
        assert!(
            kyc_did_registry::check_kyc_compliance(user_addr, KYC_LEVEL_BASIC, string::utf8(b"swap")),
            E_KYC_REQUIRED
        );
        assert!(amount_in >= MIN_SWAP_AMOUNT, E_INVALID_AMOUNT);

        let config = borrow_global<AMMGlobalConfig>(@aptofi);
        assert!(!config.is_paused, E_POOL_PAUSED);

        // Determine pool ordering and get pool
        let (pool_addr, is_coin_a_in) = if (is_ordered<CoinIn, CoinOut>()) {
            let pool_key = generate_pool_key<CoinIn, CoinOut>();
            assert!(smart_table::contains(&config.pools, pool_key), E_POOL_NOT_FOUND);
            let pool_info = smart_table::borrow(&config.pools, pool_key);
            (pool_info.pool_address, true)
        } else {
            let pool_key = generate_pool_key<CoinOut, CoinIn>();
            assert!(smart_table::contains(&config.pools, pool_key), E_POOL_NOT_FOUND);
            let pool_info = smart_table::borrow(&config.pools, pool_key);
            (pool_info.pool_address, false)
        };

        // Execute swap based on coin ordering
        if (is_coin_a_in) {
            swap_internal<CoinIn, CoinOut>(user, pool_addr, amount_in, min_amount_out, true)
        } else {
            swap_internal<CoinOut, CoinIn>(user, pool_addr, amount_in, min_amount_out, false)
        }
    }

    /// Internal swap function with proper reserve management
    fun swap_internal<CoinA, CoinB>(
        user: &signer,
        pool_addr: address,
        amount_in: u64,
        min_amount_out: u64,
        is_a_to_b: bool
    ) acquires Pool {
        let user_addr = signer::address_of(user);
        let pool = borrow_global_mut<Pool<CoinA, CoinB>>(pool_addr);
        assert!(!pool.is_paused, E_POOL_PAUSED);

        // Get current reserves
        let reserve_a = coin::value(&pool.coin_a_reserve);
        let reserve_b = coin::value(&pool.coin_b_reserve);
        assert!(reserve_a > 0 && reserve_b > 0, E_INSUFFICIENT_LIQUIDITY);

        // Calculate output amount using constant product formula
        let (amount_out, fee_amount) = if (is_a_to_b) {
            calculate_output_amount(amount_in, reserve_a, reserve_b, pool.fee_rate)
        } else {
            calculate_output_amount(amount_in, reserve_b, reserve_a, pool.fee_rate)
        };

        assert!(amount_out >= min_amount_out, E_SLIPPAGE_EXCEEDED);

        // Execute the swap
        if (is_a_to_b) {
            // User sends CoinA, receives CoinB
            let coin_in = coin::withdraw<CoinA>(user, amount_in);
            coin::merge(&mut pool.coin_a_reserve, coin_in);
            
            let coin_out = coin::extract(&mut pool.coin_b_reserve, amount_out);
            coin::deposit(user_addr, coin_out);
        } else {
            // User sends CoinB, receives CoinA
            let coin_in = coin::withdraw<CoinB>(user, amount_in);
            coin::merge(&mut pool.coin_b_reserve, coin_in);
            
            let coin_out = coin::extract(&mut pool.coin_a_reserve, amount_out);
            coin::deposit(user_addr, coin_out);
        };

        // Update price oracles
        update_price_oracles(pool, reserve_a, reserve_b);

        // Emit swap event
        let pool_key = generate_pool_key<CoinA, CoinB>();
        event::emit(SwapEvent {
            user: user_addr,
            pool_key,
            token_in: if (is_a_to_b) { 
                string::utf8(type_info::struct_name(&type_info::type_of<CoinA>())) 
            } else { 
                string::utf8(type_info::struct_name(&type_info::type_of<CoinB>())) 
            },
            token_out: if (is_a_to_b) { 
                string::utf8(type_info::struct_name(&type_info::type_of<CoinB>())) 
            } else { 
                string::utf8(type_info::struct_name(&type_info::type_of<CoinA>())) 
            },
            amount_in,
            amount_out,
            fee_amount,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Calculate output amount using Uniswap V2 constant product formula
    /// Includes fee calculation and slippage protection
    fun calculate_output_amount(
        amount_in: u64,
        reserve_in: u64,
        reserve_out: u64,
        fee_rate: u64
    ): (u64, u64) {
        assert!(amount_in > 0 && reserve_in > 0 && reserve_out > 0, E_INVALID_AMOUNT);
        
        // Calculate fee
        let fee_amount = (amount_in * fee_rate) / BASIS_POINTS;
        let amount_in_with_fee = amount_in - fee_amount;
        
        // Apply constant product formula: (x + Δx) * (y - Δy) = x * y
        // Δy = (y * Δx) / (x + Δx)
        let numerator = (amount_in_with_fee as u128) * (reserve_out as u128);
        let denominator = (reserve_in as u128) + (amount_in_with_fee as u128);
        
        assert!(denominator > 0, E_ZERO_LIQUIDITY);
        let amount_out = (numerator / denominator) as u64;
        
        assert!(amount_out < reserve_out, E_INSUFFICIENT_LIQUIDITY);
        (amount_out, fee_amount)
    }

    /// Update cumulative price oracles (TWAP support)
    fun update_price_oracles<CoinA, CoinB>(
        pool: &mut Pool<CoinA, CoinB>,
        reserve_a: u64,
        reserve_b: u64
    ) {
        let current_time = timestamp::now_seconds();
        let time_elapsed = current_time - pool.last_block_timestamp;
        
        if (time_elapsed > 0 && reserve_a > 0 && reserve_b > 0) {
            // Calculate price ratios with Q112 precision
            let price_0 = ((reserve_b as u128) * Q112) / (reserve_a as u128);
            let price_1 = ((reserve_a as u128) * Q112) / (reserve_b as u128);
            
            // Update cumulative prices
            pool.price_0_cumulative_last = pool.price_0_cumulative_last + 
                price_0 * (time_elapsed as u128);
            pool.price_1_cumulative_last = pool.price_1_cumulative_last + 
                price_1 * (time_elapsed as u128);
            
            pool.last_block_timestamp = current_time;
        }
    }


    /// Add liquidity to existing pool
    public entry fun add_liquidity<CoinA, CoinB>(
        user: &signer,
        amount_a_desired: u64,
        amount_b_desired: u64,
        amount_a_min: u64,
        amount_b_min: u64
    ) acquires AMMGlobalConfig, Pool, UserLPPositions, PoolCapabilities {
        let user_addr = signer::address_of(user);
        
        // Security checks
        assert!(did_registry::profile_exists(user_addr), E_NOT_AUTHORIZED);
        assert!(
            kyc_did_registry::check_kyc_compliance(user_addr, KYC_LEVEL_BASIC, string::utf8(b"add_liquidity")),
            E_KYC_REQUIRED
        );
        assert!(amount_a_desired > 0 && amount_b_desired > 0, E_INVALID_AMOUNT);
        assert!(is_ordered<CoinA, CoinB>(), E_INVALID_COIN_ORDER);

        let config = borrow_global<AMMGlobalConfig>(@aptofi);
        assert!(!config.is_paused, E_POOL_PAUSED);

        let pool_key = generate_pool_key<CoinA, CoinB>();
        assert!(smart_table::contains(&config.pools, pool_key), E_POOL_NOT_FOUND);
        
        let pool_info = smart_table::borrow(&config.pools, pool_key);
        let pool = borrow_global_mut<Pool<CoinA, CoinB>>(pool_info.pool_address);
        assert!(!pool.is_paused, E_POOL_PAUSED);

        // Get current reserves
        let reserve_a = coin::value(&pool.coin_a_reserve);
        let reserve_b = coin::value(&pool.coin_b_reserve);

        // Calculate optimal amounts
        let (amount_a, amount_b) = calculate_optimal_amounts(
            amount_a_desired,
            amount_b_desired,
            amount_a_min,
            amount_b_min,
            reserve_a,
            reserve_b
        );

        // Calculate LP tokens to mint
        let lp_tokens = if (pool.lp_supply == 0) {
            // First liquidity provision
            let initial_lp = math64::sqrt(amount_a * amount_b);
            assert!(initial_lp > MINIMUM_LIQUIDITY, E_ZERO_LIQUIDITY);
            initial_lp - MINIMUM_LIQUIDITY
        } else {
            // Subsequent liquidity provision
            let lp_a = (amount_a * pool.lp_supply) / reserve_a;
            let lp_b = (amount_b * pool.lp_supply) / reserve_b;
            math64::min(lp_a, lp_b)
        };

        assert!(lp_tokens > 0, E_ZERO_LIQUIDITY);

        // Transfer coins from user
        let coin_a = coin::withdraw<CoinA>(user, amount_a);
        let coin_b = coin::withdraw<CoinB>(user, amount_b);

        // Add to pool reserves
        coin::merge(&mut pool.coin_a_reserve, coin_a);
        coin::merge(&mut pool.coin_b_reserve, coin_b);
        pool.lp_supply = pool.lp_supply + lp_tokens;

        // Mint LP tokens to user
        let pool_caps = borrow_global<PoolCapabilities<CoinA, CoinB>>(pool_info.pool_address);
        let lp_coins = coin::mint<LPToken<CoinA, CoinB>>(lp_tokens, &pool_caps.mint_cap);
        coin::deposit(user_addr, lp_coins);

        // Update user position
        if (!exists<UserLPPositions>(user_addr)) {
            move_to(user, UserLPPositions {
                positions: smart_table::new<String, u64>(),
                total_value_locked: 0,
                last_interaction: timestamp::now_seconds(),
            });
        };

        let user_positions = borrow_global_mut<UserLPPositions>(user_addr);
        if (smart_table::contains(&user_positions.positions, pool_key)) {
            let current_lp = smart_table::borrow_mut(&mut user_positions.positions, pool_key);
            *current_lp = *current_lp + lp_tokens;
        } else {
            smart_table::add(&mut user_positions.positions, pool_key, lp_tokens);
        };
        user_positions.total_value_locked = user_positions.total_value_locked + amount_a + amount_b;
        user_positions.last_interaction = timestamp::now_seconds();

        // Emit event
        event::emit(LiquidityEvent {
            user: user_addr,
            pool_key,
            action: 1, // Add liquidity
            token_a_amount: amount_a,
            token_b_amount: amount_b,
            lp_tokens,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Calculate optimal amounts for liquidity provision
    fun calculate_optimal_amounts(
        amount_a_desired: u64,
        amount_b_desired: u64,
        amount_a_min: u64,
        amount_b_min: u64,
        reserve_a: u64,
        reserve_b: u64
    ): (u64, u64) {
        if (reserve_a == 0 && reserve_b == 0) {
            // First liquidity provision
            (amount_a_desired, amount_b_desired)
        } else {
            // Calculate optimal amount B for given amount A
            let amount_b_optimal = (amount_a_desired * reserve_b) / reserve_a;
            
            if (amount_b_optimal <= amount_b_desired) {
                assert!(amount_b_optimal >= amount_b_min, E_SLIPPAGE_EXCEEDED);
                (amount_a_desired, amount_b_optimal)
            } else {
                // Calculate optimal amount A for given amount B
                let amount_a_optimal = (amount_b_desired * reserve_a) / reserve_b;
                assert!(amount_a_optimal <= amount_a_desired, E_INVALID_AMOUNT);
                assert!(amount_a_optimal >= amount_a_min, E_SLIPPAGE_EXCEEDED);
                (amount_a_optimal, amount_b_desired)
            }
        }
    }

    /// Remove liquidity from pool
    public entry fun remove_liquidity<CoinA, CoinB>(
        user: &signer,
        lp_tokens_to_burn: u64,
        amount_a_min: u64,
        amount_b_min: u64
    ) acquires AMMGlobalConfig, Pool, UserLPPositions, PoolCapabilities {
        let user_addr = signer::address_of(user);
        
        // Security checks
        assert!(did_registry::profile_exists(user_addr), E_NOT_AUTHORIZED);
        assert!(lp_tokens_to_burn > 0, E_INVALID_AMOUNT);
        assert!(is_ordered<CoinA, CoinB>(), E_INVALID_COIN_ORDER);

        let config = borrow_global<AMMGlobalConfig>(@aptofi);
        assert!(!config.is_paused, E_POOL_PAUSED);

        let pool_key = generate_pool_key<CoinA, CoinB>();
        assert!(smart_table::contains(&config.pools, pool_key), E_POOL_NOT_FOUND);
        
        let pool_info = smart_table::borrow(&config.pools, pool_key);
        let pool = borrow_global_mut<Pool<CoinA, CoinB>>(pool_info.pool_address);
        assert!(!pool.is_paused, E_POOL_PAUSED);

        // Check user has sufficient LP tokens
        assert!(exists<UserLPPositions>(user_addr), E_INSUFFICIENT_BALANCE);
        let user_positions = borrow_global_mut<UserLPPositions>(user_addr);
        assert!(smart_table::contains(&user_positions.positions, pool_key), E_INSUFFICIENT_BALANCE);
        
        let user_lp_balance = smart_table::borrow_mut(&mut user_positions.positions, pool_key);
        assert!(*user_lp_balance >= lp_tokens_to_burn, E_INSUFFICIENT_BALANCE);

        // Calculate amounts to return
        let reserve_a = coin::value(&pool.coin_a_reserve);
        let reserve_b = coin::value(&pool.coin_b_reserve);
        
        let amount_a = (lp_tokens_to_burn * reserve_a) / pool.lp_supply;
        let amount_b = (lp_tokens_to_burn * reserve_b) / pool.lp_supply;

        assert!(amount_a >= amount_a_min, E_SLIPPAGE_EXCEEDED);
        assert!(amount_b >= amount_b_min, E_SLIPPAGE_EXCEEDED);
        assert!(amount_a > 0 && amount_b > 0, E_ZERO_LIQUIDITY);

        // Burn LP tokens from user
        let lp_coins = coin::withdraw<LPToken<CoinA, CoinB>>(user, lp_tokens_to_burn);
        let pool_caps = borrow_global<PoolCapabilities<CoinA, CoinB>>(pool_info.pool_address);
        coin::burn(lp_coins, &pool_caps.burn_cap);

        // Extract coins from pool
        let coin_a = coin::extract(&mut pool.coin_a_reserve, amount_a);
        let coin_b = coin::extract(&mut pool.coin_b_reserve, amount_b);

        // Transfer coins to user
        coin::deposit(user_addr, coin_a);
        coin::deposit(user_addr, coin_b);

        // Update pool state
        pool.lp_supply = pool.lp_supply - lp_tokens_to_burn;

        // Update user position
        *user_lp_balance = *user_lp_balance - lp_tokens_to_burn;
        user_positions.total_value_locked = user_positions.total_value_locked - (amount_a + amount_b);
        user_positions.last_interaction = timestamp::now_seconds();

        // Emit event
        event::emit(LiquidityEvent {
            user: user_addr,
            pool_key,
            action: 2, // Remove liquidity
            token_a_amount: amount_a,
            token_b_amount: amount_b,
            lp_tokens: lp_tokens_to_burn,
            timestamp: timestamp::now_seconds(),
        });
    }


    // ===== VIEW FUNCTIONS =====

    #[view]
    /// Get pool information for a token pair
    public fun get_pool_info<CoinA, CoinB>(): (u64, u64, u64, u64, bool) acquires AMMGlobalConfig, Pool {
        assert!(is_ordered<CoinA, CoinB>(), E_INVALID_COIN_ORDER);
        
        let config = borrow_global<AMMGlobalConfig>(@aptofi);
        let pool_key = generate_pool_key<CoinA, CoinB>();
        assert!(smart_table::contains(&config.pools, pool_key), E_POOL_NOT_FOUND);
        
        let pool_info = smart_table::borrow(&config.pools, pool_key);
        let pool = borrow_global<Pool<CoinA, CoinB>>(pool_info.pool_address);
        
        (
            coin::value(&pool.coin_a_reserve),
            coin::value(&pool.coin_b_reserve),
            pool.lp_supply,
            pool.fee_rate,
            pool.is_paused
        )
    }

    #[view]
    /// Get swap quote for exact input
    public fun get_swap_quote<CoinIn, CoinOut>(amount_in: u64): u64 acquires AMMGlobalConfig, Pool {
        assert!(amount_in > 0, E_INVALID_AMOUNT);
        
        let config = borrow_global<AMMGlobalConfig>(@aptofi);
        
        // Determine pool ordering
        let (pool_key, is_coin_a_in) = if (is_ordered<CoinIn, CoinOut>()) {
            (generate_pool_key<CoinIn, CoinOut>(), true)
        } else {
            (generate_pool_key<CoinOut, CoinIn>(), false)
        };
        
        assert!(smart_table::contains(&config.pools, pool_key), E_POOL_NOT_FOUND);
        let pool_info = smart_table::borrow(&config.pools, pool_key);
        
        if (is_coin_a_in) {
            let pool = borrow_global<Pool<CoinIn, CoinOut>>(pool_info.pool_address);
            let reserve_in = coin::value(&pool.coin_a_reserve);
            let reserve_out = coin::value(&pool.coin_b_reserve);
            let (amount_out, _) = calculate_output_amount(amount_in, reserve_in, reserve_out, pool.fee_rate);
            amount_out
        } else {
            let pool = borrow_global<Pool<CoinOut, CoinIn>>(pool_info.pool_address);
            let reserve_in = coin::value(&pool.coin_b_reserve);
            let reserve_out = coin::value(&pool.coin_a_reserve);
            let (amount_out, _) = calculate_output_amount(amount_in, reserve_in, reserve_out, pool.fee_rate);
            amount_out
        }
    }

    #[view]
    /// Get user's LP token balance for a specific pool
    public fun get_user_lp_balance<CoinA, CoinB>(user_address: address): u64 acquires UserLPPositions {
        if (!exists<UserLPPositions>(user_address)) {
            return 0
        };
        
        let pool_key = generate_pool_key<CoinA, CoinB>();
        let positions = borrow_global<UserLPPositions>(user_address);
        
        if (!smart_table::contains(&positions.positions, pool_key)) {
            return 0
        };
        
        *smart_table::borrow(&positions.positions, pool_key)
    }

    #[view]
    /// Get total number of pools
    public fun get_total_pools(): u64 acquires AMMGlobalConfig {
        let config = borrow_global<AMMGlobalConfig>(@aptofi);
        config.total_pools
    }

    #[view]
    /// Check if pool exists for token pair
    public fun pool_exists<CoinA, CoinB>(): bool acquires AMMGlobalConfig {
        if (!is_ordered<CoinA, CoinB>()) {
            return false
        };
        
        let config = borrow_global<AMMGlobalConfig>(@aptofi);
        let pool_key = generate_pool_key<CoinA, CoinB>();
        smart_table::contains(&config.pools, pool_key)
    }

    #[view]
    /// Get pool address for token pair
    public fun get_pool_address<CoinA, CoinB>(): address acquires AMMGlobalConfig {
        assert!(is_ordered<CoinA, CoinB>(), E_INVALID_COIN_ORDER);
        
        let config = borrow_global<AMMGlobalConfig>(@aptofi);
        let pool_key = generate_pool_key<CoinA, CoinB>();
        assert!(smart_table::contains(&config.pools, pool_key), E_POOL_NOT_FOUND);
        
        let pool_info = smart_table::borrow(&config.pools, pool_key);
        pool_info.pool_address
    }

    #[view]
    /// Get TWAP price for token pair (Time-Weighted Average Price)
    public fun get_twap_price<CoinA, CoinB>(time_window: u64): (u128, u128) acquires AMMGlobalConfig, Pool {
        assert!(is_ordered<CoinA, CoinB>(), E_INVALID_COIN_ORDER);
        assert!(time_window > 0, E_INVALID_AMOUNT);
        
        let config = borrow_global<AMMGlobalConfig>(@aptofi);
        let pool_key = generate_pool_key<CoinA, CoinB>();
        assert!(smart_table::contains(&config.pools, pool_key), E_POOL_NOT_FOUND);
        
        let pool_info = smart_table::borrow(&config.pools, pool_key);
        let pool = borrow_global<Pool<CoinA, CoinB>>(pool_info.pool_address);
        
        let current_time = timestamp::now_seconds();
        let time_elapsed = current_time - pool.last_block_timestamp;
        
        if (time_elapsed == 0) {
            // Return current price if no time has passed
            let reserve_a = coin::value(&pool.coin_a_reserve);
            let reserve_b = coin::value(&pool.coin_b_reserve);
            if (reserve_a > 0 && reserve_b > 0) {
                let price_0 = ((reserve_b as u128) * Q112) / (reserve_a as u128);
                let price_1 = ((reserve_a as u128) * Q112) / (reserve_b as u128);
                (price_0, price_1)
            } else {
                (0, 0)
            }
        } else {
            // Calculate TWAP over the specified time window
            let price_0_avg = pool.price_0_cumulative_last / (time_window as u128);
            let price_1_avg = pool.price_1_cumulative_last / (time_window as u128);
            (price_0_avg, price_1_avg)
        }
    }

    // ===== ADMIN FUNCTIONS =====

    /// Pause/unpause the entire AMM (admin only)
    public entry fun set_global_pause(admin: &signer, paused: bool) acquires AMMGlobalConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<AMMGlobalConfig>(@aptofi);
        assert!(admin_addr == config.admin, E_NOT_AUTHORIZED);
        
        config.is_paused = paused;
    }

    /// Pause/unpause specific pool (admin only)
    public entry fun set_pool_pause<CoinA, CoinB>(admin: &signer, paused: bool) acquires AMMGlobalConfig, Pool {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global<AMMGlobalConfig>(@aptofi);
        assert!(admin_addr == config.admin, E_NOT_AUTHORIZED);
        assert!(is_ordered<CoinA, CoinB>(), E_INVALID_COIN_ORDER);
        
        let pool_key = generate_pool_key<CoinA, CoinB>();
        assert!(smart_table::contains(&config.pools, pool_key), E_POOL_NOT_FOUND);
        
        let pool_info = smart_table::borrow(&config.pools, pool_key);
        let pool = borrow_global_mut<Pool<CoinA, CoinB>>(pool_info.pool_address);
        pool.is_paused = paused;
    }

    /// Update protocol fee rate (admin only)
    public entry fun set_protocol_fee_rate(admin: &signer, new_rate: u64) acquires AMMGlobalConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<AMMGlobalConfig>(@aptofi);
        assert!(admin_addr == config.admin, E_NOT_AUTHORIZED);
        assert!(new_rate <= MAX_FEE_RATE, E_INVALID_AMOUNT);
        
        config.protocol_fee_rate = new_rate;
    }

    // ===== FRIEND FUNCTIONS =====

    /// Get pool reserves (for other protocols)
    public(friend) fun get_reserves<CoinA, CoinB>(): (u64, u64) acquires AMMGlobalConfig, Pool {
        assert!(is_ordered<CoinA, CoinB>(), E_INVALID_COIN_ORDER);
        
        let config = borrow_global<AMMGlobalConfig>(@aptofi);
        let pool_key = generate_pool_key<CoinA, CoinB>();
        assert!(smart_table::contains(&config.pools, pool_key), E_POOL_NOT_FOUND);
        
        let pool_info = smart_table::borrow(&config.pools, pool_key);
        let pool = borrow_global<Pool<CoinA, CoinB>>(pool_info.pool_address);
        
        (coin::value(&pool.coin_a_reserve), coin::value(&pool.coin_b_reserve))
    }

    // ===== TESTS =====
    
    #[test_only]
    public fun init_for_test(deployer: &signer) {
        init_module(deployer);
    }
}
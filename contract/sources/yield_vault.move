module aptofi::yield_vault {
    use std::signer;
    use std::string::String;
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::table::{Self, Table};
    use aptos_framework::event;
    use aptofi::did_registry;

    // Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_VAULT_NOT_FOUND: u64 = 2;
    const E_INSUFFICIENT_BALANCE: u64 = 3;
    const E_INVALID_AMOUNT: u64 = 4;
    const E_STRATEGY_NOT_FOUND: u64 = 5;
    const E_VAULT_PAUSED: u64 = 6;
    const E_INSUFFICIENT_SHARES: u64 = 7;

    // Constants
    const BASIS_POINTS: u64 = 10000;
    const PERFORMANCE_FEE: u64 = 200; // 2%
    const MANAGEMENT_FEE: u64 = 100;  // 1% annually
    const MIN_DEPOSIT: u64 = 1000;    // Minimum deposit amount

    // Strategy types
    const STRATEGY_LENDING: u8 = 1;
    const STRATEGY_LP: u8 = 2;
    const STRATEGY_STAKING: u8 = 3;

    struct Vault has key {
        id: u64,
        name: String,
        token_symbol: String,
        total_deposits: u64,
        total_shares: u64,
        strategy_type: u8,
        performance_fee: u64,
        management_fee: u64,
        last_harvest: u64,
        total_rewards: u64,
        is_active: bool,
        created_at: u64,
    }

    struct VaultPosition has store {
        shares: u64,
        deposit_time: u64,
        last_reward_claim: u64,
        total_deposited: u64,
        total_withdrawn: u64,
    }

    struct Strategy has store {
        vault_id: u64,
        strategy_type: u8,
        target_token: String,
        allocated_funds: u64,
        expected_apy: u64,
        risk_level: u8, // 1-5 scale
        last_rebalance: u64,
        performance_history: vector<u64>,
    }

    struct VaultRegistry has key {
        vaults: Table<u64, address>, // vault_id -> vault_address
        strategies: Table<u64, Strategy>,
        total_vaults: u64,
        admin: address,
    }

    struct UserPositions has key {
        positions: Table<u64, VaultPosition>, // vault_id -> position
        total_value: u64,
    }

    struct VaultPerformance has store {
        vault_id: u64,
        apy_7d: u64,
        apy_30d: u64,
        total_return: u64,
        sharpe_ratio: u64,
        max_drawdown: u64,
        last_updated: u64,
    }

    #[event]
    struct VaultCreated has drop, store {
        vault_id: u64,
        creator: address,
        token_symbol: String,
        strategy_type: u8,
        timestamp: u64,
    }

    #[event]
    struct DepositEvent has drop, store {
        user: address,
        vault_id: u64,
        amount: u64,
        shares_minted: u64,
        timestamp: u64,
    }

    #[event]
    struct WithdrawEvent has drop, store {
        user: address,
        vault_id: u64,
        shares_burned: u64,
        amount_withdrawn: u64,
        timestamp: u64,
    }

    #[event]
    struct HarvestEvent has drop, store {
        vault_id: u64,
        rewards_harvested: u64,
        performance_fee: u64,
        new_apy: u64,
        timestamp: u64,
    }

    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        move_to(admin, VaultRegistry {
            vaults: table::new(),
            strategies: table::new(),
            total_vaults: 0,
            admin: admin_addr,
        });
    }

    public entry fun create_vault(
        account: &signer,
        name: String,
        token_symbol: String,
        strategy_type: u8,
        expected_apy: u64,
        risk_level: u8
    ) acquires VaultRegistry {
        let user_addr = signer::address_of(account);
        assert!(did_registry::profile_exists(user_addr), E_NOT_AUTHORIZED);
        assert!(strategy_type >= 1 && strategy_type <= 3, E_STRATEGY_NOT_FOUND);

        let registry = borrow_global_mut<VaultRegistry>(@aptofi);
        let vault_id = registry.total_vaults + 1;

        let vault = Vault {
            id: vault_id,
            name,
            token_symbol,
            total_deposits: 0,
            total_shares: 0,
            strategy_type,
            performance_fee: PERFORMANCE_FEE,
            management_fee: MANAGEMENT_FEE,
            last_harvest: timestamp::now_seconds(),
            total_rewards: 0,
            is_active: true,
            created_at: timestamp::now_seconds(),
        };

        let strategy = Strategy {
            vault_id,
            strategy_type,
            target_token: token_symbol,
            allocated_funds: 0,
            expected_apy,
            risk_level,
            last_rebalance: timestamp::now_seconds(),
            performance_history: vector::empty(),
        };

        move_to(account, vault);
        table::add(&mut registry.vaults, vault_id, user_addr);
        table::add(&mut registry.strategies, vault_id, strategy);
        registry.total_vaults = vault_id;

        event::emit(VaultCreated {
            vault_id,
            creator: user_addr,
            token_symbol,
            strategy_type,
            timestamp: timestamp::now_seconds(),
        });
    }

    public entry fun deposit(
        account: &signer,
        vault_address: address,
        vault_id: u64,
        amount: u64
    ) acquires Vault, UserPositions {
        let user_addr = signer::address_of(account);
        assert!(did_registry::profile_exists(user_addr), E_NOT_AUTHORIZED);
        assert!(amount >= MIN_DEPOSIT, E_INVALID_AMOUNT);
        assert!(exists<Vault>(vault_address), E_VAULT_NOT_FOUND);

        let vault = borrow_global_mut<Vault>(vault_address);
        assert!(vault.is_active, E_VAULT_PAUSED);

        // Calculate shares to mint
        let shares_to_mint = if (vault.total_shares == 0) {
            amount // 1:1 ratio for first deposit
        } else {
            (amount * vault.total_shares) / vault.total_deposits
        };

        vault.total_deposits = vault.total_deposits + amount;
        vault.total_shares = vault.total_shares + shares_to_mint;

        // Initialize or update user position
        if (!exists<UserPositions>(user_addr)) {
            move_to(account, UserPositions {
                positions: table::new(),
                total_value: 0,
            });
        };

        let user_positions = borrow_global_mut<UserPositions>(user_addr);
        
        if (table::contains(&user_positions.positions, vault_id)) {
            let position = table::borrow_mut(&mut user_positions.positions, vault_id);
            position.shares = position.shares + shares_to_mint;
            position.total_deposited = position.total_deposited + amount;
        } else {
            let position = VaultPosition {
                shares: shares_to_mint,
                deposit_time: timestamp::now_seconds(),
                last_reward_claim: timestamp::now_seconds(),
                total_deposited: amount,
                total_withdrawn: 0,
            };
            table::add(&mut user_positions.positions, vault_id, position);
        };

        user_positions.total_value = user_positions.total_value + amount;

        event::emit(DepositEvent {
            user: user_addr,
            vault_id,
            amount,
            shares_minted: shares_to_mint,
            timestamp: timestamp::now_seconds(),
        });
    }

    public entry fun withdraw(
        account: &signer,
        vault_address: address,
        vault_id: u64,
        shares_to_burn: u64
    ) acquires Vault, UserPositions {
        let user_addr = signer::address_of(account);
        assert!(exists<UserPositions>(user_addr), E_INSUFFICIENT_SHARES);
        assert!(exists<Vault>(vault_address), E_VAULT_NOT_FOUND);

        let vault = borrow_global_mut<Vault>(vault_address);
        let user_positions = borrow_global_mut<UserPositions>(user_addr);
        
        assert!(table::contains(&user_positions.positions, vault_id), E_INSUFFICIENT_SHARES);
        let position = table::borrow_mut(&mut user_positions.positions, vault_id);
        assert!(position.shares >= shares_to_burn, E_INSUFFICIENT_SHARES);

        // Calculate withdrawal amount
        let withdrawal_amount = (shares_to_burn * vault.total_deposits) / vault.total_shares;

        // Update vault
        vault.total_deposits = vault.total_deposits - withdrawal_amount;
        vault.total_shares = vault.total_shares - shares_to_burn;

        // Update user position
        position.shares = position.shares - shares_to_burn;
        position.total_withdrawn = position.total_withdrawn + withdrawal_amount;
        user_positions.total_value = user_positions.total_value - withdrawal_amount;

        event::emit(WithdrawEvent {
            user: user_addr,
            vault_id,
            shares_burned: shares_to_burn,
            amount_withdrawn: withdrawal_amount,
            timestamp: timestamp::now_seconds(),
        });
    }

    public entry fun harvest_rewards(
        account: &signer,
        vault_address: address,
        vault_id: u64
    ) acquires Vault, VaultRegistry {
        let user_addr = signer::address_of(account);
        let registry = borrow_global<VaultRegistry>(@aptofi);
        assert!(user_addr == registry.admin, E_NOT_AUTHORIZED);
        assert!(exists<Vault>(vault_address), E_VAULT_NOT_FOUND);

        let vault = borrow_global_mut<Vault>(vault_address);
        let strategy = table::borrow(&registry.strategies, vault_id);

        // Calculate rewards based on strategy type
        let rewards = calculate_strategy_rewards(strategy, vault.total_deposits);
        let performance_fee_amount = (rewards * vault.performance_fee) / BASIS_POINTS;
        let net_rewards = rewards - performance_fee_amount;

        // Update vault
        vault.total_deposits = vault.total_deposits + net_rewards;
        vault.total_rewards = vault.total_rewards + rewards;
        vault.last_harvest = timestamp::now_seconds();

        // Calculate new APY
        let new_apy = calculate_vault_apy(vault_id, vault.total_deposits, vault.total_rewards);

        event::emit(HarvestEvent {
            vault_id,
            rewards_harvested: rewards,
            performance_fee: performance_fee_amount,
            new_apy,
            timestamp: timestamp::now_seconds(),
        });
    }

    fun calculate_strategy_rewards(strategy: &Strategy, total_deposits: u64): u64 {
        // Simplified reward calculation based on strategy type
        let base_reward = (total_deposits * strategy.expected_apy) / (BASIS_POINTS * 365); // Daily reward
        
        // Apply risk adjustment
        let risk_adjustment = if (strategy.risk_level == 1) {
            8000   // 80% - Very Low Risk
        } else if (strategy.risk_level == 2) {
            9000   // 90% - Low Risk
        } else if (strategy.risk_level == 3) {
            10000  // 100% - Medium Risk
        } else if (strategy.risk_level == 4) {
            11000  // 110% - High Risk
        } else if (strategy.risk_level == 5) {
            12000  // 120% - Very High Risk
        } else {
            10000  // Default
        };

        (base_reward * risk_adjustment) / BASIS_POINTS
    }

    fun calculate_vault_apy(_vault_id: u64, total_deposits: u64, total_rewards: u64): u64 {
        if (total_deposits == 0) {
            return 0
        };
        
        // Simplified APY calculation
        (total_rewards * BASIS_POINTS * 365) / (total_deposits * 30) // Assuming 30-day period
    }

    // View functions
    #[view]
    public fun get_vault_info(vault_address: address): (u64, String, String, u64, u64, u8, u64, bool) acquires Vault {
        assert!(exists<Vault>(vault_address), E_VAULT_NOT_FOUND);
        
        let vault = borrow_global<Vault>(vault_address);
        (
            vault.id,
            vault.name,
            vault.token_symbol,
            vault.total_deposits,
            vault.total_shares,
            vault.strategy_type,
            vault.performance_fee,
            vault.is_active
        )
    }

    #[view]
    public fun get_user_position(user_address: address, vault_id: u64): (u64, u64, u64, u64) acquires UserPositions {
        if (!exists<UserPositions>(user_address)) {
            return (0, 0, 0, 0)
        };
        
        let positions = borrow_global<UserPositions>(user_address);
        if (!table::contains(&positions.positions, vault_id)) {
            return (0, 0, 0, 0)
        };
        
        let position = table::borrow(&positions.positions, vault_id);
        (
            position.shares,
            position.deposit_time,
            position.total_deposited,
            position.total_withdrawn
        )
    }

    #[view]
    public fun calculate_vault_apy_view(vault_address: address): u64 acquires Vault {
        assert!(exists<Vault>(vault_address), E_VAULT_NOT_FOUND);
        
        let vault = borrow_global<Vault>(vault_address);
        calculate_vault_apy(vault.id, vault.total_deposits, vault.total_rewards)
    }

    #[view]
    public fun get_total_vaults(): u64 acquires VaultRegistry {
        let registry = borrow_global<VaultRegistry>(@aptofi);
        registry.total_vaults
    }

    #[view]
    public fun get_vault_strategy(vault_id: u64): (u8, String, u64, u8) acquires VaultRegistry {
        let registry = borrow_global<VaultRegistry>(@aptofi);
        assert!(table::contains(&registry.strategies, vault_id), E_STRATEGY_NOT_FOUND);
        
        let strategy = table::borrow(&registry.strategies, vault_id);
        (
            strategy.strategy_type,
            strategy.target_token,
            strategy.expected_apy,
            strategy.risk_level
        )
    }

    #[view]
    public fun calculate_withdrawal_amount(
        vault_address: address,
        shares_to_burn: u64
    ): u64 acquires Vault {
        assert!(exists<Vault>(vault_address), E_VAULT_NOT_FOUND);
        
        let vault = borrow_global<Vault>(vault_address);
        if (vault.total_shares == 0) {
            return 0
        };
        
        (shares_to_burn * vault.total_deposits) / vault.total_shares
    }

    #[view]
    public fun calculate_shares_for_amount(
        vault_address: address,
        amount: u64
    ): u64 acquires Vault {
        assert!(exists<Vault>(vault_address), E_VAULT_NOT_FOUND);
        
        let vault = borrow_global<Vault>(vault_address);
        if (vault.total_shares == 0) {
            return amount // 1:1 ratio for first deposit
        };
        
        (amount * vault.total_shares) / vault.total_deposits
    }
}
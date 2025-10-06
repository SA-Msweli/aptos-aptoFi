module stake_pool_addr::vault {
    use std::bcs;
    use std::signer;
    use std::vector;
    
    use aptos_std::string_utils;
    
    use aptos_framework::fungible_asset::{Self, Metadata, FungibleStore};
    use aptos_framework::object::{Self, Object, ExtendRef};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::timestamp;
    use aptos_framework::event;
    
    // ================================= Errors ================================= //
    /// Vault does not exist
    const ERR_VAULT_NOT_EXISTS: u64 = 1;
    /// User does not have position in vault
    const ERR_NO_POSITION: u64 = 2;
    /// Insufficient balance to deposit
    const ERR_INSUFFICIENT_BALANCE: u64 = 3;
    /// Insufficient shares to withdraw
    const ERR_INSUFFICIENT_SHARES: u64 = 4;
    /// Only vault manager can perform this action
    const ERR_ONLY_VAULT_MANAGER: u64 = 5;
    /// Vault is paused
    const ERR_VAULT_PAUSED: u64 = 6;
    /// Invalid strategy parameters
    const ERR_INVALID_STRATEGY: u64 = 7;
    /// Amount cannot be zero
    const ERR_ZERO_AMOUNT: u64 = 8;
    /// Vault capacity exceeded
    const ERR_VAULT_CAPACITY_EXCEEDED: u64 = 9;
    /// Minimum deposit not met
    const ERR_MINIMUM_DEPOSIT_NOT_MET: u64 = 10;

    // ================================= Structs ================================= //

    /// Vault configuration and state
    struct Vault has key {
        /// Vault ID
        id: u64,
        /// Asset being managed
        asset_metadata: Object<Metadata>,
        /// Vault treasury store
        treasury_store: Object<FungibleStore>,
        /// Total assets under management
        total_assets: u64,
        /// Total shares issued
        total_shares: u64,
        /// Vault manager address
        manager: address,
        /// Strategy type (0=conservative, 1=balanced, 2=aggressive)
        strategy_type: u8,
        /// Target APY in basis points (e.g., 1000 = 10%)
        target_apy: u64,
        /// Performance fee in basis points (e.g., 200 = 2%)
        performance_fee: u64,
        /// Management fee in basis points (e.g., 100 = 1%)
        management_fee: u64,
        /// Last rebalance timestamp
        last_rebalance: u64,
        /// Last compound timestamp
        last_compound: u64,
        /// Vault capacity limit
        capacity_limit: u64,
        /// Minimum deposit amount
        minimum_deposit: u64,
        /// Whether vault is paused
        is_paused: bool,
        /// Accumulated performance fees
        accumulated_fees: u64,
    }

    /// User position in a vault
    struct VaultPosition has key, store {
        /// Vault ID
        vault_id: u64,
        /// User address
        user: address,
        /// Number of shares owned
        shares: u64,
        /// Initial deposit amount (for tracking)
        initial_deposit: u64,
        /// Deposit timestamp
        deposit_timestamp: u64,
        /// Last claim timestamp
        last_claim: u64,
    }

    /// Strategy execution parameters
    struct StrategyParams has store, drop {
        /// Hyperion pool allocation percentage (0-100)
        hyperion_allocation: u8,
        /// Staking allocation percentage (0-100)
        staking_allocation: u8,
        /// Cash reserve percentage (0-100)
        cash_reserve: u8,
        /// Rebalance threshold in basis points
        rebalance_threshold: u64,
        /// Maximum slippage tolerance in basis points
        max_slippage: u64,
    }

    /// Vault registry and controller
    struct VaultRegistry has key {
        /// Next vault ID
        next_vault_id: u64,
        /// Total number of vaults
        total_vaults: u64,
        /// Vault controller extend ref
        extend_ref: ExtendRef,
    }

    /// Vault controller for generating signers
    struct VaultController has key {
        extend_ref: ExtendRef,
    }

    // ================================= Events ================================= //

    #[event]
    struct VaultCreated has drop, store {
        vault_id: u64,
        asset_metadata: Object<Metadata>,
        manager: address,
        strategy_type: u8,
    }

    #[event]
    struct Deposit has drop, store {
        vault_id: u64,
        user: address,
        amount: u64,
        shares_minted: u64,
    }

    #[event]
    struct Withdrawal has drop, store {
        vault_id: u64,
        user: address,
        shares_burned: u64,
        amount_withdrawn: u64,
    }

    #[event]
    struct Rebalance has drop, store {
        vault_id: u64,
        old_allocation: vector<u8>,
        new_allocation: vector<u8>,
        timestamp: u64,
    }

    #[event]
    struct Compound has drop, store {
        vault_id: u64,
        yield_earned: u64,
        fees_collected: u64,
        timestamp: u64,
    }

    // ================================= Initialization ================================= //

    /// Initialize the vault system
    fun init_module(sender: &signer) {
        let sender_addr = signer::address_of(sender);
        
        // Create vault controller
        let vault_controller_ref = &object::create_object(sender_addr);
        move_to(sender, VaultController {
            extend_ref: object::generate_extend_ref(vault_controller_ref),
        });

        // Create vault registry
        let registry_ref = &object::create_object(sender_addr);
        move_to(sender, VaultRegistry {
            next_vault_id: 1,
            total_vaults: 0,
            extend_ref: object::generate_extend_ref(registry_ref),
        });
    }

    // ================================= Entry Functions ================================= //

    /// Create a new vault with specified strategy
    public entry fun create_vault(
        sender: &signer,
        asset_metadata: Object<Metadata>,
        strategy_type: u8,
        target_apy: u64,
        performance_fee: u64,
        management_fee: u64,
        capacity_limit: u64,
        minimum_deposit: u64,
    ) acquires VaultRegistry, VaultController {
        let sender_addr = signer::address_of(sender);
        
        // Validate strategy parameters
        assert!(strategy_type <= 2, ERR_INVALID_STRATEGY);
        assert!(performance_fee <= 2000, ERR_INVALID_STRATEGY); // Max 20%
        assert!(management_fee <= 500, ERR_INVALID_STRATEGY); // Max 5%
        
        let registry = borrow_global_mut<VaultRegistry>(@stake_pool_addr);
        let vault_id = registry.next_vault_id;
        
        // Create treasury store for the vault
        let vault_signer = &generate_vault_signer();
        let treasury_constructor_ref = &object::create_object(signer::address_of(vault_signer));
        let treasury_store = fungible_asset::create_store(treasury_constructor_ref, asset_metadata);
        
        // Create vault object
        let vault_constructor_ref = &object::create_named_object(
            vault_signer,
            construct_vault_seed(vault_id),
        );
        
        let current_time = timestamp::now_seconds();
        
        move_to(&object::generate_signer(vault_constructor_ref), Vault {
            id: vault_id,
            asset_metadata,
            treasury_store,
            total_assets: 0,
            total_shares: 0,
            manager: sender_addr,
            strategy_type,
            target_apy,
            performance_fee,
            management_fee,
            last_rebalance: current_time,
            last_compound: current_time,
            capacity_limit,
            minimum_deposit,
            is_paused: false,
            accumulated_fees: 0,
        });
        
        // Update registry
        registry.next_vault_id = vault_id + 1;
        registry.total_vaults = registry.total_vaults + 1;
        
        // Emit event
        event::emit(VaultCreated {
            vault_id,
            asset_metadata,
            manager: sender_addr,
            strategy_type,
        });
    }

    /// Deposit assets into a vault
    public entry fun deposit(
        sender: &signer,
        vault_id: u64,
        amount: u64,
    ) acquires Vault, VaultPosition, VaultController {
        let sender_addr = signer::address_of(sender);
        
        assert!(amount > 0, ERR_ZERO_AMOUNT);
        assert!(vault_exists(vault_id), ERR_VAULT_NOT_EXISTS);
        
        let vault_addr = get_vault_address(vault_id);
        let vault = borrow_global_mut<Vault>(vault_addr);
        
        assert!(!vault.is_paused, ERR_VAULT_PAUSED);
        assert!(amount >= vault.minimum_deposit, ERR_MINIMUM_DEPOSIT_NOT_MET);
        assert!(vault.total_assets + amount <= vault.capacity_limit, ERR_VAULT_CAPACITY_EXCEEDED);
        
        // Check user balance
        assert!(
            primary_fungible_store::balance(sender_addr, vault.asset_metadata) >= amount,
            ERR_INSUFFICIENT_BALANCE
        );
        
        // Calculate shares to mint
        let shares_to_mint = if (vault.total_shares == 0) {
            amount // 1:1 ratio for first deposit
        } else {
            // shares = amount * total_shares / total_assets
            (amount * vault.total_shares) / vault.total_assets
        };
        
        // Transfer assets to vault treasury
        fungible_asset::transfer(
            sender,
            primary_fungible_store::primary_store(sender_addr, vault.asset_metadata),
            vault.treasury_store,
            amount
        );
        
        // Update vault state
        vault.total_assets = vault.total_assets + amount;
        vault.total_shares = vault.total_shares + shares_to_mint;
        
        // Create or update user position
        let position_addr = get_position_address(sender_addr, vault_id);
        let current_time = timestamp::now_seconds();
        
        if (object::object_exists<VaultPosition>(position_addr)) {
            let position = borrow_global_mut<VaultPosition>(position_addr);
            position.shares = position.shares + shares_to_mint;
        } else {
            let position_constructor_ref = &object::create_named_object(
                &generate_vault_signer(),
                construct_position_seed(sender_addr, vault_id),
            );
            
            move_to(&object::generate_signer(position_constructor_ref), VaultPosition {
                vault_id,
                user: sender_addr,
                shares: shares_to_mint,
                initial_deposit: amount,
                deposit_timestamp: current_time,
                last_claim: current_time,
            });
        };
        
        // Emit event
        event::emit(Deposit {
            vault_id,
            user: sender_addr,
            amount,
            shares_minted: shares_to_mint,
        });
    }

    /// Withdraw assets from a vault
    public entry fun withdraw(
        sender: &signer,
        vault_id: u64,
        shares_to_burn: u64,
    ) acquires Vault, VaultPosition, VaultController {
        let sender_addr = signer::address_of(sender);
        
        assert!(shares_to_burn > 0, ERR_ZERO_AMOUNT);
        assert!(vault_exists(vault_id), ERR_VAULT_NOT_EXISTS);
        
        let position_addr = get_position_address(sender_addr, vault_id);
        assert!(object::object_exists<VaultPosition>(position_addr), ERR_NO_POSITION);
        
        let position = borrow_global_mut<VaultPosition>(position_addr);
        assert!(position.shares >= shares_to_burn, ERR_INSUFFICIENT_SHARES);
        
        let vault_addr = get_vault_address(vault_id);
        let vault = borrow_global_mut<Vault>(vault_addr);
        
        // Calculate withdrawal amount
        let withdrawal_amount = (shares_to_burn * vault.total_assets) / vault.total_shares;
        
        // Transfer assets from vault treasury to user
        fungible_asset::transfer(
            &generate_vault_signer(),
            vault.treasury_store,
            primary_fungible_store::ensure_primary_store_exists(sender_addr, vault.asset_metadata),
            withdrawal_amount
        );
        
        // Update vault state
        vault.total_assets = vault.total_assets - withdrawal_amount;
        vault.total_shares = vault.total_shares - shares_to_burn;
        
        // Update position
        position.shares = position.shares - shares_to_burn;
        
        // Emit event
        event::emit(Withdrawal {
            vault_id,
            user: sender_addr,
            shares_burned: shares_to_burn,
            amount_withdrawn: withdrawal_amount,
        });
    }

    /// Execute automated rebalancing strategy
    public entry fun rebalance_vault(
        sender: &signer,
        vault_id: u64,
    ) acquires Vault, VaultController {
        let sender_addr = signer::address_of(sender);
        
        assert!(vault_exists(vault_id), ERR_VAULT_NOT_EXISTS);
        
        let vault_addr = get_vault_address(vault_id);
        let vault = borrow_global_mut<Vault>(vault_addr);
        
        assert!(vault.manager == sender_addr, ERR_ONLY_VAULT_MANAGER);
        assert!(!vault.is_paused, ERR_VAULT_PAUSED);
        
        let current_time = timestamp::now_seconds();
        
        // Get strategy parameters based on vault type
        let strategy_params = get_strategy_params(vault.strategy_type);
        
        // Store old allocation for event
        let old_allocation = vector::empty<u8>();
        vector::push_back(&mut old_allocation, strategy_params.hyperion_allocation);
        vector::push_back(&mut old_allocation, strategy_params.staking_allocation);
        vector::push_back(&mut old_allocation, strategy_params.cash_reserve);
        
        // Execute rebalancing logic (simplified for MVP)
        // In production, this would interact with Hyperion SDK
        vault.last_rebalance = current_time;
        
        // Emit rebalance event
        event::emit(Rebalance {
            vault_id,
            old_allocation,
            new_allocation: old_allocation, // Same for now, would be different after actual rebalancing
            timestamp: current_time,
        });
    }

    /// Execute automated compounding
    public entry fun compound_vault(
        sender: &signer,
        vault_id: u64,
    ) acquires Vault, VaultController {
        let sender_addr = signer::address_of(sender);
        
        assert!(vault_exists(vault_id), ERR_VAULT_NOT_EXISTS);
        
        let vault_addr = get_vault_address(vault_id);
        let vault = borrow_global_mut<Vault>(vault_addr);
        
        assert!(vault.manager == sender_addr, ERR_ONLY_VAULT_MANAGER);
        assert!(!vault.is_paused, ERR_VAULT_PAUSED);
        
        let current_time = timestamp::now_seconds();
        
        // Calculate yield earned (simplified calculation)
        let time_elapsed = current_time - vault.last_compound;
        let yield_rate = vault.target_apy / (365 * 24 * 60 * 60); // Per second yield
        let yield_earned = (vault.total_assets * yield_rate * time_elapsed) / 10000;
        
        // Calculate fees
        let performance_fee_amount = (yield_earned * vault.performance_fee) / 10000;
        let management_fee_amount = (vault.total_assets * vault.management_fee * time_elapsed) / (10000 * 365 * 24 * 60 * 60);
        let total_fees = performance_fee_amount + management_fee_amount;
        
        // Update vault state
        vault.total_assets = vault.total_assets + yield_earned - total_fees;
        vault.accumulated_fees = vault.accumulated_fees + total_fees;
        vault.last_compound = current_time;
        
        // Emit compound event
        event::emit(Compound {
            vault_id,
            yield_earned,
            fees_collected: total_fees,
            timestamp: current_time,
        });
    }

    /// Pause or unpause a vault
    public entry fun set_vault_pause(
        sender: &signer,
        vault_id: u64,
        paused: bool,
    ) acquires Vault, VaultController {
        let sender_addr = signer::address_of(sender);
        
        assert!(vault_exists(vault_id), ERR_VAULT_NOT_EXISTS);
        
        let vault_addr = get_vault_address(vault_id);
        let vault = borrow_global_mut<Vault>(vault_addr);
        
        assert!(vault.manager == sender_addr, ERR_ONLY_VAULT_MANAGER);
        
        vault.is_paused = paused;
    }

    // ================================= View Functions ================================= //

    #[view]
    /// Check if vault exists
    public fun vault_exists(vault_id: u64): bool acquires VaultController {
        let vault_addr = get_vault_address(vault_id);
        object::object_exists<Vault>(vault_addr)
    }

    #[view]
    /// Get vault information
    public fun get_vault_info(vault_id: u64): (
        u64, // id
        Object<Metadata>, // asset_metadata
        u64, // total_assets
        u64, // total_shares
        address, // manager
        u8, // strategy_type
        u64, // target_apy
        bool, // is_paused
    ) acquires Vault, VaultController {
        assert!(vault_exists(vault_id), ERR_VAULT_NOT_EXISTS);
        
        let vault_addr = get_vault_address(vault_id);
        let vault = borrow_global<Vault>(vault_addr);
        
        (
            vault.id,
            vault.asset_metadata,
            vault.total_assets,
            vault.total_shares,
            vault.manager,
            vault.strategy_type,
            vault.target_apy,
            vault.is_paused,
        )
    }

    #[view]
    /// Get user position in vault
    public fun get_user_position(user_addr: address, vault_id: u64): (
        u64, // shares
        u64, // initial_deposit
        u64, // deposit_timestamp
        u64, // current_value
    ) acquires Vault, VaultPosition, VaultController {
        let position_addr = get_position_address(user_addr, vault_id);
        
        if (!object::object_exists<VaultPosition>(position_addr)) {
            return (0, 0, 0, 0)
        };
        
        let position = borrow_global<VaultPosition>(position_addr);
        let vault_addr = get_vault_address(vault_id);
        let vault = borrow_global<Vault>(vault_addr);
        
        // Calculate current value of shares
        let current_value = if (vault.total_shares == 0) {
            0
        } else {
            (position.shares * vault.total_assets) / vault.total_shares
        };
        
        (
            position.shares,
            position.initial_deposit,
            position.deposit_timestamp,
            current_value,
        )
    }

    #[view]
    /// Get vault performance metrics
    public fun get_vault_performance(vault_id: u64): (
        u64, // current_apy (basis points)
        u64, // total_yield_generated
        u64, // fees_collected
        u64, // last_rebalance
        u64, // last_compound
    ) acquires Vault, VaultController {
        assert!(vault_exists(vault_id), ERR_VAULT_NOT_EXISTS);
        
        let vault_addr = get_vault_address(vault_id);
        let vault = borrow_global<Vault>(vault_addr);
        
        // Calculate current APY (simplified)
        let current_time = timestamp::now_seconds();
        let time_since_creation = current_time - vault.last_compound;
        let current_apy = if (time_since_creation > 0 && vault.total_assets > 0) {
            vault.target_apy // Simplified - would calculate based on actual performance
        } else {
            0
        };
        
        (
            current_apy,
            vault.total_assets, // Simplified total yield
            vault.accumulated_fees,
            vault.last_rebalance,
            vault.last_compound,
        )
    }

    #[view]
    /// Get total number of vaults
    public fun get_total_vaults(): u64 acquires VaultRegistry {
        let registry = borrow_global<VaultRegistry>(@stake_pool_addr);
        registry.total_vaults
    }

    // ================================= Helper Functions ================================= //

    /// Generate vault signer
    fun generate_vault_signer(): signer acquires VaultController {
        object::generate_signer_for_extending(&borrow_global<VaultController>(@stake_pool_addr).extend_ref)
    }

    /// Construct vault seed for object creation
    fun construct_vault_seed(vault_id: u64): vector<u8> {
        bcs::to_bytes(&string_utils::format1(&b"vault_{}", vault_id))
    }

    /// Construct position seed for object creation
    fun construct_position_seed(user_addr: address, vault_id: u64): vector<u8> {
        bcs::to_bytes(&string_utils::format2(&b"position_{}_{}", user_addr, vault_id))
    }

    /// Get vault address from vault ID
    fun get_vault_address(vault_id: u64): address acquires VaultController {
        object::create_object_address(
            &signer::address_of(&generate_vault_signer()),
            construct_vault_seed(vault_id)
        )
    }

    /// Get position address
    fun get_position_address(user_addr: address, vault_id: u64): address acquires VaultController {
        object::create_object_address(
            &signer::address_of(&generate_vault_signer()),
            construct_position_seed(user_addr, vault_id)
        )
    }

    /// Get strategy parameters based on strategy type
    fun get_strategy_params(strategy_type: u8): StrategyParams {
        if (strategy_type == 0) {
            // Conservative: 30% Hyperion, 50% Staking, 20% Cash
            StrategyParams {
                hyperion_allocation: 30,
                staking_allocation: 50,
                cash_reserve: 20,
                rebalance_threshold: 500, // 5%
                max_slippage: 100, // 1%
            }
        } else if (strategy_type == 1) {
            // Balanced: 50% Hyperion, 40% Staking, 10% Cash
            StrategyParams {
                hyperion_allocation: 50,
                staking_allocation: 40,
                cash_reserve: 10,
                rebalance_threshold: 750, // 7.5%
                max_slippage: 150, // 1.5%
            }
        } else {
            // Aggressive: 70% Hyperion, 25% Staking, 5% Cash
            StrategyParams {
                hyperion_allocation: 70,
                staking_allocation: 25,
                cash_reserve: 5,
                rebalance_threshold: 1000, // 10%
                max_slippage: 200, // 2%
            }
        }
    }

    // ================================= Test Helpers ================================= //

    #[test_only]
    public fun init_module_for_test(sender: &signer) {
        init_module(sender);
    }
}
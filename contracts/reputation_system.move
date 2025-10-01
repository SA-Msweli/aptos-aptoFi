/// Reputation System for AptoFi
/// Calculates and maintains user reputation scores based on on-chain activity
module aptofi::reputation_system {
    use std::signer;
    use std::vector;
    use std::timestamp;
    use aptos_framework::event;
    use aptos_framework::table::{Self, Table};
    use aptofi::did_registry;

    // Error codes
    const E_PROFILE_NOT_FOUND: u64 = 1;
    const E_UNAUTHORIZED: u64 = 2;
    const E_INVALID_SCORE_COMPONENT: u64 = 3;
    const E_REPUTATION_NOT_INITIALIZED: u64 = 4;
    const E_INVALID_TIER: u64 = 5;

    // Reputation tiers
    const TIER_NEW_USER: u8 = 0;     // 0-199
    const TIER_BRONZE: u8 = 1;       // 200-499
    const TIER_SILVER: u8 = 2;       // 500-749
    const TIER_GOLD: u8 = 3;         // 750-899
    const TIER_PLATINUM: u8 = 4;     // 900-1000

    // Score weights (in basis points, 10000 = 100%)
    const TRANSACTION_WEIGHT: u64 = 3000;  // 30%
    const LENDING_WEIGHT: u64 = 5000;      // 50%
    const GOVERNANCE_WEIGHT: u64 = 2000;   // 20%

    // Maximum scores for each component
    const MAX_TRANSACTION_SCORE: u64 = 1000;
    const MAX_LENDING_SCORE: u64 = 1000;
    const MAX_GOVERNANCE_SCORE: u64 = 1000;
    const MAX_TOTAL_SCORE: u64 = 1000;

    /// Individual user reputation score
    struct ReputationScore has key, store {
        user_address: address,
        base_score: u64,
        transaction_score: u64,
        lending_score: u64,
        governance_score: u64,
        total_score: u64,
        tier: u8,
        last_updated: u64,
        
        // Detailed metrics for score calculation
        transaction_volume_30d: u64,
        transaction_count_30d: u64,
        successful_repayments: u64,
        total_loans: u64,
        governance_participation: u64,
        
        // Historical data
        score_history: vector<ScoreSnapshot>,
    }

    /// Historical score snapshot
    struct ScoreSnapshot has store, copy, drop {
        timestamp: u64,
        total_score: u64,
        tier: u8,
    }

    /// Global reputation configuration
    struct ReputationConfig has key {
        admin: address,
        transaction_weight: u64,
        lending_weight: u64,
        governance_weight: u64,
        max_score: u64,
        decay_rate_daily: u64,  // Daily decay rate in basis points
        tier_thresholds: vector<u64>,  // Thresholds for each tier
        last_global_update: u64,
    }

    /// System-wide reputation statistics
    struct ReputationStats has key {
        total_users: u64,
        average_score: u64,
        tier_distribution: Table<u8, u64>,  // Count of users in each tier
        last_updated: u64,
    }

    /// Event emitted when reputation score is updated
    #[event]
    struct ReputationUpdated has drop, store {
        user_address: address,
        old_score: u64,
        new_score: u64,
        old_tier: u8,
        new_tier: u8,
        update_type: u8, // 1: transaction, 2: lending, 3: governance, 4: decay
        timestamp: u64,
    }

    /// Event emitted when tier changes
    #[event]
    struct TierChanged has drop, store {
        user_address: address,
        old_tier: u8,
        new_tier: u8,
        score: u64,
        timestamp: u64,
    }

    /// Initialize the reputation system
    public fun initialize(admin: &signer) {
        let admin_address = signer::address_of(admin);
        
        // Initialize configuration
        let tier_thresholds = vector[0, 200, 500, 750, 900]; // Tier boundaries
        move_to(admin, ReputationConfig {
            admin: admin_address,
            transaction_weight: TRANSACTION_WEIGHT,
            lending_weight: LENDING_WEIGHT,
            governance_weight: GOVERNANCE_WEIGHT,
            max_score: MAX_TOTAL_SCORE,
            decay_rate_daily: 5, // 0.05% daily decay
            tier_thresholds,
            last_global_update: timestamp::now_seconds(),
        });
        
        // Initialize statistics
        let tier_distribution = table::new<u8, u64>();
        table::add(&mut tier_distribution, 0, 0);
        table::add(&mut tier_distribution, 1, 0);
        table::add(&mut tier_distribution, 2, 0);
        table::add(&mut tier_distribution, 3, 0);
        table::add(&mut tier_distribution, 4, 0);
        
        move_to(admin, ReputationStats {
            total_users: 0,
            average_score: 0,
            tier_distribution,
            last_updated: timestamp::now_seconds(),
        });
    }

    /// Initialize reputation score for a new user
    public entry fun initialize_reputation(user_address: address) acquires ReputationConfig, ReputationStats {
        // Verify user has a DID profile
        assert!(did_registry::profile_exists(user_address), E_PROFILE_NOT_FOUND);
        assert!(did_registry::is_profile_active(user_address), E_PROFILE_NOT_FOUND);
        
        let current_time = timestamp::now_seconds();
        let initial_score = 100; // Base score for new users
        
        let score = ReputationScore {
            user_address,
            base_score: initial_score,
            transaction_score: 0,
            lending_score: 0,
            governance_score: 0,
            total_score: initial_score,
            tier: TIER_NEW_USER,
            last_updated: current_time,
            transaction_volume_30d: 0,
            transaction_count_30d: 0,
            successful_repayments: 0,
            total_loans: 0,
            governance_participation: 0,
            score_history: vector[ScoreSnapshot {
                timestamp: current_time,
                total_score: initial_score,
                tier: TIER_NEW_USER,
            }],
        };
        
        // Move reputation to user's account
        let user_signer = &aptos_framework::account::create_signer_for_test(user_address);
        move_to(user_signer, score);
        
        // Update global statistics
        let stats = borrow_global_mut<ReputationStats>(@aptofi);
        stats.total_users = stats.total_users + 1;
        let tier_count = table::borrow_mut(&mut stats.tier_distribution, TIER_NEW_USER);
        *tier_count = *tier_count + 1;
        
        // Emit event
        event::emit(ReputationUpdated {
            user_address,
            old_score: 0,
            new_score: initial_score,
            old_tier: TIER_NEW_USER,
            new_tier: TIER_NEW_USER,
            update_type: 0,
            timestamp: current_time,
        });
    }

    /// Update transaction-based reputation score
    public entry fun update_transaction_score(
        user_address: address,
        transaction_amount: u64,
        transaction_count: u64
    ) acquires ReputationScore, ReputationConfig, ReputationStats {
        assert!(exists<ReputationScore>(user_address), E_REPUTATION_NOT_INITIALIZED);
        
        let score = borrow_global_mut<ReputationScore>(user_address);
        let old_total_score = score.total_score;
        let old_tier = score.tier;
        
        // Update transaction metrics
        score.transaction_volume_30d = score.transaction_volume_30d + transaction_amount;
        score.transaction_count_30d = score.transaction_count_30d + transaction_count;
        
        // Calculate new transaction score
        let volume_component = (score.transaction_volume_30d / 10000); // Scale factor
        let count_component = score.transaction_count_30d * 2;
        score.transaction_score = if (volume_component + count_component > MAX_TRANSACTION_SCORE) {
            MAX_TRANSACTION_SCORE
        } else {
            volume_component + count_component
        };
        
        // Recalculate total score
        recalculate_total_score(score);
        
        // Update tier if necessary
        let new_tier = calculate_tier(score.total_score);
        if (new_tier != score.tier) {
            update_user_tier(user_address, score.tier, new_tier);
            score.tier = new_tier;
        };
        
        score.last_updated = timestamp::now_seconds();
        
        // Add to history
        vector::push_back(&mut score.score_history, ScoreSnapshot {
            timestamp: score.last_updated,
            total_score: score.total_score,
            tier: score.tier,
        });
        
        // Emit event
        event::emit(ReputationUpdated {
            user_address,
            old_score: old_total_score,
            new_score: score.total_score,
            old_tier,
            new_tier: score.tier,
            update_type: 1,
            timestamp: score.last_updated,
        });
    }

    /// Update lending-based reputation score
    public entry fun update_lending_score(
        user_address: address,
        loan_repaid_successfully: bool,
        loan_amount: u64
    ) acquires ReputationScore, ReputationConfig, ReputationStats {
        assert!(exists<ReputationScore>(user_address), E_REPUTATION_NOT_INITIALIZED);
        
        let score = borrow_global_mut<ReputationScore>(user_address);
        let old_total_score = score.total_score;
        let old_tier = score.tier;
        
        // Update lending metrics
        score.total_loans = score.total_loans + 1;
        if (loan_repaid_successfully) {
            score.successful_repayments = score.successful_repayments + 1;
        };
        
        // Calculate new lending score
        if (score.total_loans > 0) {
            let success_rate = (score.successful_repayments * 1000) / score.total_loans;
            score.lending_score = success_rate;
        };
        
        // Recalculate total score
        recalculate_total_score(score);
        
        // Update tier if necessary
        let new_tier = calculate_tier(score.total_score);
        if (new_tier != score.tier) {
            update_user_tier(user_address, score.tier, new_tier);
            score.tier = new_tier;
        };
        
        score.last_updated = timestamp::now_seconds();
        
        // Add to history
        vector::push_back(&mut score.score_history, ScoreSnapshot {
            timestamp: score.last_updated,
            total_score: score.total_score,
            tier: score.tier,
        });
        
        // Emit event
        event::emit(ReputationUpdated {
            user_address,
            old_score: old_total_score,
            new_score: score.total_score,
            old_tier,
            new_tier: score.tier,
            update_type: 2,
            timestamp: score.last_updated,
        });
    }

    /// Update governance participation score
    public entry fun update_governance_score(
        user_address: address,
        participation_count: u64
    ) acquires ReputationScore, ReputationConfig, ReputationStats {
        assert!(exists<ReputationScore>(user_address), E_REPUTATION_NOT_INITIALIZED);
        
        let score = borrow_global_mut<ReputationScore>(user_address);
        let old_total_score = score.total_score;
        let old_tier = score.tier;
        
        // Update governance metrics
        score.governance_participation = score.governance_participation + participation_count;
        
        // Calculate new governance score (50 points per participation, max 1000)
        let governance_points = score.governance_participation * 50;
        score.governance_score = if (governance_points > MAX_GOVERNANCE_SCORE) {
            MAX_GOVERNANCE_SCORE
        } else {
            governance_points
        };
        
        // Recalculate total score
        recalculate_total_score(score);
        
        // Update tier if necessary
        let new_tier = calculate_tier(score.total_score);
        if (new_tier != score.tier) {
            update_user_tier(user_address, score.tier, new_tier);
            score.tier = new_tier;
        };
        
        score.last_updated = timestamp::now_seconds();
        
        // Add to history
        vector::push_back(&mut score.score_history, ScoreSnapshot {
            timestamp: score.last_updated,
            total_score: score.total_score,
            tier: score.tier,
        });
        
        // Emit event
        event::emit(ReputationUpdated {
            user_address,
            old_score: old_total_score,
            new_score: score.total_score,
            old_tier,
            new_tier: score.tier,
            update_type: 3,
            timestamp: score.last_updated,
        });
    }

    /// Recalculate total score based on component scores and weights
    fun recalculate_total_score(score: &mut ReputationScore) acquires ReputationConfig {
        let config = borrow_global<ReputationConfig>(@aptofi);
        
        let weighted_transaction = (score.transaction_score * config.transaction_weight) / 10000;
        let weighted_lending = (score.lending_score * config.lending_weight) / 10000;
        let weighted_governance = (score.governance_score * config.governance_weight) / 10000;
        
        let total = score.base_score + weighted_transaction + weighted_lending + weighted_governance;
        
        score.total_score = if (total > config.max_score) {
            config.max_score
        } else {
            total
        };
    }

    /// Calculate tier based on total score
    fun calculate_tier(total_score: u64): u8 acquires ReputationConfig {
        let config = borrow_global<ReputationConfig>(@aptofi);
        let thresholds = &config.tier_thresholds;
        
        if (total_score >= *vector::borrow(thresholds, 4)) {
            TIER_PLATINUM
        } else if (total_score >= *vector::borrow(thresholds, 3)) {
            TIER_GOLD
        } else if (total_score >= *vector::borrow(thresholds, 2)) {
            TIER_SILVER
        } else if (total_score >= *vector::borrow(thresholds, 1)) {
            TIER_BRONZE
        } else {
            TIER_NEW_USER
        }
    }

    /// Update user tier in global statistics
    fun update_user_tier(user_address: address, old_tier: u8, new_tier: u8) acquires ReputationStats {
        let stats = borrow_global_mut<ReputationStats>(@aptofi);
        
        // Decrease count for old tier
        let old_count = table::borrow_mut(&mut stats.tier_distribution, old_tier);
        *old_count = *old_count - 1;
        
        // Increase count for new tier
        let new_count = table::borrow_mut(&mut stats.tier_distribution, new_tier);
        *new_count = *new_count + 1;
        
        // Emit tier change event
        event::emit(TierChanged {
            user_address,
            old_tier,
            new_tier,
            score: 0, // Will be filled by caller
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Get user reputation score (view function)
    #[view]
    public fun get_reputation_score(user_address: address): (u64, u8, u64, u64, u64, u64) acquires ReputationScore {
        assert!(exists<ReputationScore>(user_address), E_REPUTATION_NOT_INITIALIZED);
        
        let score = borrow_global<ReputationScore>(user_address);
        (
            score.total_score,
            score.tier,
            score.transaction_score,
            score.lending_score,
            score.governance_score,
            score.last_updated
        )
    }

    /// Get user reputation tier only
    #[view]
    public fun get_reputation_tier(user_address: address): u8 acquires ReputationScore {
        assert!(exists<ReputationScore>(user_address), E_REPUTATION_NOT_INITIALIZED);
        
        let score = borrow_global<ReputationScore>(user_address);
        score.tier
    }

    /// Check if user meets minimum tier requirement
    #[view]
    public fun meets_tier_requirement(user_address: address, required_tier: u8): bool acquires ReputationScore {
        if (!exists<ReputationScore>(user_address)) {
            return false
        };
        
        let score = borrow_global<ReputationScore>(user_address);
        score.tier >= required_tier
    }

    /// Get tier distribution statistics
    #[view]
    public fun get_tier_distribution(): (u64, u64, u64, u64, u64) acquires ReputationStats {
        let stats = borrow_global<ReputationStats>(@aptofi);
        (
            *table::borrow(&stats.tier_distribution, TIER_NEW_USER),
            *table::borrow(&stats.tier_distribution, TIER_BRONZE),
            *table::borrow(&stats.tier_distribution, TIER_SILVER),
            *table::borrow(&stats.tier_distribution, TIER_GOLD),
            *table::borrow(&stats.tier_distribution, TIER_PLATINUM),
        )
    }

    /// Get lending terms based on reputation tier
    #[view]
    public fun get_lending_terms(tier: u8): (u64, u64, u64) {
        // Returns: (max_loan_ratio, min_collateral_ratio, interest_rate_reduction_bps)
        if (tier == TIER_PLATINUM) {
            (90, 10, 400) // 90% loan ratio, 10% collateral, 4% rate reduction
        } else if (tier == TIER_GOLD) {
            (80, 20, 300) // 80% loan ratio, 20% collateral, 3% rate reduction
        } else if (tier == TIER_SILVER) {
            (70, 30, 200) // 70% loan ratio, 30% collateral, 2% rate reduction
        } else if (tier == TIER_BRONZE) {
            (60, 40, 100) // 60% loan ratio, 40% collateral, 1% rate reduction
        } else {
            (50, 50, 0)   // 50% loan ratio, 50% collateral, no reduction
        }
    }

    // Test functions
    #[test_only]
    public fun init_for_test(admin: &signer) {
        initialize(admin);
    }

    #[test(admin = @aptofi, user = @0x123)]
    public fun test_initialize_reputation(admin: &signer, user: &signer) acquires ReputationConfig, ReputationStats, ReputationScore {
        // Initialize DID system first
        did_registry::init_for_test(admin);
        initialize(admin);
        
        // Set up timestamp
        timestamp::set_time_has_started_for_testing(&aptos_framework::account::create_signer_for_test(@0x1));
        
        // Create DID profile first
        let user_address = signer::address_of(user);
        let profile_hash = b"QmHash123";
        let keys = vector[];
        let values = vector[];
        did_registry::create_profile(user, profile_hash, keys, values);
        
        // Initialize reputation
        initialize_reputation(user_address);
        
        // Verify reputation exists
        assert!(exists<ReputationScore>(user_address), 0);
        
        let (score, tier, _, _, _, _) = get_reputation_score(user_address);
        assert!(score == 100, 1);
        assert!(tier == TIER_NEW_USER, 2);
    }

    #[test(admin = @aptofi, user = @0x123)]
    public fun test_transaction_score_update(admin: &signer, user: &signer) acquires ReputationConfig, ReputationStats, ReputationScore {
        // Setup
        did_registry::init_for_test(admin);
        initialize(admin);
        timestamp::set_time_has_started_for_testing(&aptos_framework::account::create_signer_for_test(@0x1));
        
        let user_address = signer::address_of(user);
        let profile_hash = b"QmHash123";
        did_registry::create_profile(user, profile_hash, vector[], vector[]);
        initialize_reputation(user_address);
        
        // Update transaction score
        update_transaction_score(user_address, 10000, 5);
        
        let (score, tier, tx_score, _, _, _) = get_reputation_score(user_address);
        assert!(tx_score > 0, 0);
        assert!(score > 100, 1); // Should be higher than initial
    }

    #[test(admin = @aptofi, user = @0x123)]
    public fun test_tier_calculation(admin: &signer, user: &signer) acquires ReputationConfig, ReputationStats, ReputationScore {
        // Setup
        did_registry::init_for_test(admin);
        initialize(admin);
        timestamp::set_time_has_started_for_testing(&aptos_framework::account::create_signer_for_test(@0x1));
        
        let user_address = signer::address_of(user);
        let profile_hash = b"QmHash123";
        did_registry::create_profile(user, profile_hash, vector[], vector[]);
        initialize_reputation(user_address);
        
        // Simulate high activity to reach higher tier
        update_transaction_score(user_address, 100000, 50);
        update_lending_score(user_address, true, 10000);
        update_governance_score(user_address, 10);
        
        let (_, tier, _, _, _, _) = get_reputation_score(user_address);
        assert!(tier > TIER_NEW_USER, 0);
    }
}
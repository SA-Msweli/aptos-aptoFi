module aptofi::reputation_system {
    use std::signer;
    use aptos_framework::timestamp;
    use aptos_framework::table::{Self, Table};
    use aptos_framework::event;
    
    use aptofi::did_registry;

    // Error codes
    /// User is not authorized to perform this action
    const E_NOT_AUTHORIZED: u64 = 1;
    /// User profile not found in the system
    const E_PROFILE_NOT_FOUND: u64 = 2;
    /// Invalid reputation score provided
    const E_INVALID_SCORE: u64 = 3;
    /// System has already been initialized
    const E_ALREADY_INITIALIZED: u64 = 4;

    // Constants
    const MAX_SCORE: u64 = 1000;
    const BASE_SCORE: u64 = 100;
    const TRANSACTION_WEIGHT: u64 = 30; // 30%
    const LENDING_WEIGHT: u64 = 50;     // 50%
    const GOVERNANCE_WEIGHT: u64 = 20;  // 20%

    struct ReputationScore has key {
        user_address: address,
        base_score: u64,
        transaction_score: u64,
        lending_score: u64,
        governance_score: u64,
        total_score: u64,
        last_updated: u64,
    }

    struct ReputationConfig has key {
        transaction_weight: u64,
        lending_weight: u64,
        governance_weight: u64,
        max_score: u64,
        decay_rate: u64,
        admin: address,
    }

    struct ReputationRegistry has key {
        total_users: u64,
        user_scores: Table<address, u64>,
    }

    #[event]
    struct ScoreUpdated has drop, store {
        user_address: address,
        old_score: u64,
        new_score: u64,
        score_type: u8, // 1: transaction, 2: lending, 3: governance
        timestamp: u64,
    }

    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<ReputationConfig>(@aptofi), E_ALREADY_INITIALIZED);
        
        move_to(admin, ReputationConfig {
            transaction_weight: TRANSACTION_WEIGHT,
            lending_weight: LENDING_WEIGHT,
            governance_weight: GOVERNANCE_WEIGHT,
            max_score: MAX_SCORE,
            decay_rate: 5, // 5% per month
            admin: admin_addr,
        });

        move_to(admin, ReputationRegistry {
            total_users: 0,
            user_scores: table::new(),
        });
    }

    public entry fun initialize_reputation(account: &signer) acquires ReputationRegistry {
        let user_address = signer::address_of(account);
        assert!(did_registry::profile_exists(user_address), E_PROFILE_NOT_FOUND);
        assert!(!exists<ReputationScore>(user_address), E_INVALID_SCORE);

        let score = ReputationScore {
            user_address,
            base_score: BASE_SCORE,
            transaction_score: 0,
            lending_score: 0,
            governance_score: 0,
            total_score: BASE_SCORE,
            last_updated: timestamp::now_seconds(),
        };

        move_to(account, score);

        let registry = borrow_global_mut<ReputationRegistry>(@aptofi);
        registry.user_scores.add(user_address, BASE_SCORE);
        registry.total_users += 1;
    }

    public fun update_transaction_score(
        user_address: address,
        amount: u64,
        frequency: u64
    ) acquires ReputationScore, ReputationRegistry {
        assert!(exists<ReputationScore>(user_address), E_PROFILE_NOT_FOUND);
        
        let score = borrow_global_mut<ReputationScore>(user_address);
        let old_total = score.total_score;
        
        // Calculate transaction score: min(1000, volume/1000 + frequency*2)
        let volume_score = if (amount > 1000000) { 1000 } else { amount / 1000 };
        let frequency_score = if (frequency > 500) { 1000 } else { frequency * 2 };
        score.transaction_score = if (volume_score + frequency_score > 1000) {
            1000
        } else {
            volume_score + frequency_score
        };
        
        calculate_total_score_internal(score);
        
        // Update registry
        let registry = borrow_global_mut<ReputationRegistry>(@aptofi);
        *registry.user_scores.borrow_mut(user_address) = score.total_score;
        
        // Update DID registry
        did_registry::update_reputation_score(user_address, score.total_score);

        event::emit(ScoreUpdated {
            user_address,
            old_score: old_total,
            new_score: score.total_score,
            score_type: 1,
            timestamp: timestamp::now_seconds(),
        });
    }

    public fun update_lending_score(
        user_address: address,
        repayment_history: vector<bool>
    ) acquires ReputationScore, ReputationRegistry {
        assert!(exists<ReputationScore>(user_address), E_PROFILE_NOT_FOUND);
        
        let score = borrow_global_mut<ReputationScore>(user_address);
        let old_total = score.total_score;
        
        // Calculate lending score based on repayment history
        let total_loans = repayment_history.length();
        if (total_loans == 0) {
            score.lending_score = 0;
        } else {
            let successful_repayments = 0;
            let i = 0;
            while (i < total_loans) {
                if (repayment_history[i]) {
                    successful_repayments += 
                    1;
                };
                i += 1;
            };
            
            score.lending_score = (successful_repayments * 1000) / total_loans;
        };
        
        calculate_total_score_internal(score);
        
        // Update registry
        let registry = borrow_global_mut<ReputationRegistry>(@aptofi);
        *registry.user_scores.borrow_mut(user_address) = score.total_score;
        
        // Update DID registry
        did_registry::update_reputation_score(user_address, score.total_score);

        event::emit(ScoreUpdated {
            user_address,
            old_score: old_total,
            new_score: score.total_score,
            score_type: 2,
            timestamp: timestamp::now_seconds(),
        });
    }

    fun calculate_total_score_internal(score: &mut ReputationScore) {
        let weighted_transaction = (score.transaction_score * TRANSACTION_WEIGHT) / 100;
        let weighted_lending = (score.lending_score * LENDING_WEIGHT) / 100;
        let weighted_governance = (score.governance_score * GOVERNANCE_WEIGHT) / 100;
        
        score.total_score = weighted_transaction + weighted_lending + weighted_governance;
        score.last_updated = timestamp::now_seconds();
    }

    #[view]
    public fun calculate_total_score(user_address: address): u64 acquires ReputationScore {
        assert!(exists<ReputationScore>(user_address), E_PROFILE_NOT_FOUND);
        
        let score = borrow_global<ReputationScore>(user_address);
        score.total_score
    }

    #[view]
    public fun get_reputation_tier(user_address: address): u8 acquires ReputationScore {
        if (!exists<ReputationScore>(user_address)) {
            return 0 // New user
        };
        
        let score = borrow_global<ReputationScore>(user_address);
        let total = score.total_score;
        
        if (total >= 900) {
            4 // Platinum
        } else if (total >= 750) {
            3 // Gold
        } else if (total >= 500) {
            2 // Silver
        } else if (total >= 200) {
            1 // Bronze
        } else {
            0 // New User
        }
    }

    #[view]
    public fun get_reputation_score(user_address: address): (u64, u64, u64, u64, u64, u64) acquires ReputationScore {
        assert!(exists<ReputationScore>(user_address), E_PROFILE_NOT_FOUND);
        
        let score = borrow_global<ReputationScore>(user_address);
        (
            score.base_score,
            score.transaction_score,
            score.lending_score,
            score.governance_score,
            score.total_score,
            score.last_updated
        )
    }

    #[view]
    public fun reputation_exists(user_address: address): bool {
        exists<ReputationScore>(user_address)
    }
}
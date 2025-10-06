module stake_pool_addr::did {
    use std::signer;
    use aptos_framework::timestamp;

    friend stake_pool_addr::lending;

    // ================================= Errors ================================= //
    /// DID already exists for this address
    const ERR_DID_ALREADY_EXISTS: u64 = 1;
    /// DID does not exist for this address
    const ERR_DID_NOT_EXISTS: u64 = 2;

    // ================================= Structs ================================= //

    /// DID for comprehensive identity storage
    struct DID has key {
        /// Owner address
        owner: address,
        /// Creation timestamp
        created_at: u64,
        /// Last activity timestamp
        last_activity: u64,
        /// Basic reputation score (0-100)
        reputation_score: u64,
        /// Transaction count for reputation
        transaction_count: u64,
        /// Total transaction volume (in smallest units)
        total_volume: u64,
        /// Number of successful loan repayments
        successful_loans: u64,
        /// Number of defaulted loans
        defaulted_loans: u64,
        /// Governance participation count
        governance_participation: u64,
        /// Whether verified for KYC compliance
        is_verified: bool,
        /// Risk level (0=low, 1=medium, 2=high)
        risk_level: u8,
    }

    /// Global registry to track DID count
    struct DIDRegistry has key {
        total_dids: u64,
    }

    // ================================= Initialization ================================= //

    /// Initialize the DID registry
    fun init_module(sender: &signer) {
        move_to(sender, DIDRegistry {
            total_dids: 0,
        });
    }

    // ================================= Entry Functions ================================= //

    /// Create a simple DID for the sender
    public entry fun create_did(sender: &signer) acquires DIDRegistry {
        let sender_addr = signer::address_of(sender);
        
        // Check if DID already exists
        assert!(!exists<DID>(sender_addr), ERR_DID_ALREADY_EXISTS);
        
        let registry = borrow_global_mut<DIDRegistry>(@stake_pool_addr);
        let current_time = timestamp::now_seconds();
        
        // Create the DID with default values
        let new_did = DID {
            owner: sender_addr,
            created_at: current_time,
            last_activity: current_time,
            reputation_score: 50, // Start with neutral reputation
            transaction_count: 0,
            total_volume: 0,
            successful_loans: 0,
            defaulted_loans: 0,
            governance_participation: 0,
            is_verified: false,
            risk_level: 1, // Start with medium risk
        };
        
        // Update registry
        registry.total_dids = registry.total_dids + 1;
        
        // Store the DID
        move_to(sender, new_did);
    }

    /// Update reputation score and activity data
    public entry fun update_reputation(
        owner_addr: address,
        new_score: u64,
        transaction_count: u64,
        total_volume: u64
    ) acquires DID {
        // Check if DID exists
        assert!(exists<DID>(owner_addr), ERR_DID_NOT_EXISTS);
        
        let did = borrow_global_mut<DID>(owner_addr);
        let current_time = timestamp::now_seconds();
        
        // Update reputation data with validation
        if (new_score <= 100) {
            did.reputation_score = new_score;
        };
        did.transaction_count = transaction_count;
        did.total_volume = total_volume;
        did.last_activity = current_time;
        
        // Update risk level based on reputation
        if (new_score >= 80) {
            did.risk_level = 0; // Low risk
        } else if (new_score >= 60) {
            did.risk_level = 1; // Medium risk
        } else {
            did.risk_level = 2; // High risk
        };
    }

    /// Update lending history (for lending system integration)
    public entry fun update_lending_history(
        owner_addr: address,
        successful_loans: u64,
        defaulted_loans: u64
    ) acquires DID {
        assert!(exists<DID>(owner_addr), ERR_DID_NOT_EXISTS);
        
        let did = borrow_global_mut<DID>(owner_addr);
        did.successful_loans = successful_loans;
        did.defaulted_loans = defaulted_loans;
        did.last_activity = timestamp::now_seconds();
    }

    /// Update governance participation (for reputation enhancement)
    public entry fun update_governance_participation(
        owner_addr: address,
        participation_count: u64
    ) acquires DID {
        assert!(exists<DID>(owner_addr), ERR_DID_NOT_EXISTS);
        
        let did = borrow_global_mut<DID>(owner_addr);
        did.governance_participation = participation_count;
        did.last_activity = timestamp::now_seconds();
    }

    // ================================= View Functions ================================= //

    #[view]
    /// Check if a DID exists for the given address
    public fun did_exists(owner_addr: address): bool {
        exists<DID>(owner_addr)
    }

    #[view]
    /// Get comprehensive DID information
    public fun get_did_info(owner_addr: address): (address, u64, u64, u64, u64, u64, bool, u8) acquires DID {
        assert!(exists<DID>(owner_addr), ERR_DID_NOT_EXISTS);
        
        let did = borrow_global<DID>(owner_addr);
        (
            did.owner,
            did.created_at,
            did.last_activity,
            did.reputation_score,
            did.transaction_count,
            did.total_volume,
            did.is_verified,
            did.risk_level
        )
    }

    #[view]
    /// Get lending history for loan eligibility
    public fun get_lending_history(owner_addr: address): (u64, u64) acquires DID {
        if (!exists<DID>(owner_addr)) {
            return (0, 0)
        };
        
        let did = borrow_global<DID>(owner_addr);
        (did.successful_loans, did.defaulted_loans)
    }

    #[view]
    /// Check if address is eligible for loans based on reputation and history
    public fun is_loan_eligible(owner_addr: address, min_reputation: u64): bool acquires DID {
        if (!exists<DID>(owner_addr)) {
            return false
        };
        
        let did = borrow_global<DID>(owner_addr);
        
        // Check reputation threshold
        if (did.reputation_score < min_reputation) {
            return false
        };
        
        // Check if too many defaults
        if (did.defaulted_loans > 0 && did.successful_loans < did.defaulted_loans * 3) {
            return false
        };
        
        true
    }

    #[view]
    /// Get risk assessment for P2P payments
    public fun get_risk_assessment(owner_addr: address): u8 acquires DID {
        if (!exists<DID>(owner_addr)) {
            return 2 // High risk for unknown addresses
        };
        
        let did = borrow_global<DID>(owner_addr);
        did.risk_level
    }

    #[view]
    /// Get reputation score for an address
    public fun get_reputation_score(owner_addr: address): u64 acquires DID {
        if (!exists<DID>(owner_addr)) {
            return 50 // Default neutral reputation
        };
        
        let did = borrow_global<DID>(owner_addr);
        did.reputation_score
    }

    #[view]
    /// Get total number of DIDs created
    public fun get_total_dids(): u64 acquires DIDRegistry {
        let registry = borrow_global<DIDRegistry>(@stake_pool_addr);
        registry.total_dids
    }

    // ================================= Test Helpers ================================= //

    // ================================= Lending Integration Functions ================================= //

    /// Update reputation based on loan payment (called by lending module)
    public(friend) fun update_reputation_for_payment(owner_addr: address, payment_successful: bool) acquires DID {
        if (!exists<DID>(owner_addr)) {
            return
        };
        
        let did = borrow_global_mut<DID>(owner_addr);
        
        if (payment_successful) {
            // Increase reputation for successful payment
            if (did.reputation_score < 100) {
                did.reputation_score = did.reputation_score + 1;
            };
            did.successful_loans = did.successful_loans + 1;
        } else {
            // Decrease reputation for missed/defaulted payment
            if (did.reputation_score > 10) {
                did.reputation_score = did.reputation_score - 5;
            };
            did.defaulted_loans = did.defaulted_loans + 1;
        };
        
        did.last_activity = timestamp::now_seconds();
        
        // Update risk level based on new reputation
        if (did.reputation_score >= 80) {
            did.risk_level = 0; // Low risk
        } else if (did.reputation_score >= 60) {
            did.risk_level = 1; // Medium risk
        } else {
            did.risk_level = 2; // High risk
        };
    }

    // ================================= Test Helpers ================================= //

    #[test_only]
    public fun init_module_for_test(sender: &signer) {
        init_module(sender);
    }
}
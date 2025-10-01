#[test_only]
module aptofi::risk_manager_tests {
    use std::signer;
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::account;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    
    use aptofi::risk_manager;

    #[test(admin = @aptofi)]
    public fun test_initialize_risk_manager(admin: &signer) {
        // Initialize the risk manager
        risk_manager::initialize(admin);
        
        // Verify risk parameters are set correctly
        let (max_ltv, liquidation_threshold, liquidation_penalty, price_deviation, volatility) = 
            risk_manager::get_risk_parameters();
        
        assert!(max_ltv == 7500, 1); // 75%
        assert!(liquidation_threshold == 8000, 2); // 80%
        assert!(liquidation_penalty == 1000, 3); // 10%
        assert!(price_deviation == 500, 4); // 5%
        assert!(volatility == 2000, 5); // 20%
    }

    #[test(admin = @aptofi, user = @0x123)]
    public fun test_calculate_health_factor_no_position(admin: &signer, user: &signer) {
        let user_addr = signer::address_of(user);
        
        // Initialize risk manager
        risk_manager::initialize(admin);
        
        // Calculate health factor for user with no position
        let health_factor = risk_manager::calculate_health_factor(user_addr);
        
        // Should return 100% (10000 basis points) for users with no debt
        assert!(health_factor == 10000, 1);
    }

    #[test(admin = @aptofi, user = @0x123)]
    public fun test_update_position_risk(admin: &signer, user: &signer) {
        let user_addr = signer::address_of(user);
        
        // Initialize risk manager
        risk_manager::initialize(admin);
        
        // Update position risk
        risk_manager::update_position_risk(
            user_addr,
            1000000, // $1000 collateral
            500000,  // $500 debt
            b"APT"   // APT token
        );
        
        // Get position risk
        let position_risk = risk_manager::get_position_risk(user_addr);
        
        assert!(position_risk.collateral_value == 1000000, 1);
        assert!(position_risk.debt_value == 500000, 2);
        assert!(position_risk.health_factor == 16000, 3); // 160% health factor
    }

    #[test(admin = @aptofi)]
    public fun test_update_market_risk(admin: &signer) {
        // Initialize risk manager
        risk_manager::initialize(admin);
        
        // Update market risk for APT token
        risk_manager::update_market_risk(
            admin,
            b"APT",
            1000000, // $10 price 24h ago
            1200000, // $12 current price
            5000000  // $50k volume
        );
        
        // Get market risk
        let market_risk = risk_manager::get_market_risk(b"APT");
        
        assert!(market_risk.token == b"APT", 1);
        assert!(market_risk.price_change_24h == 2000, 2); // 20% increase
        assert!(market_risk.risk_level >= 1 && market_risk.risk_level <= 5, 3);
    }

    #[test(admin = @aptofi, user = @0x123)]
    public fun test_liquidation_eligibility(admin: &signer, user: &signer) {
        let user_addr = signer::address_of(user);
        
        // Initialize risk manager
        risk_manager::initialize(admin);
        
        // Create unhealthy position (health factor < 100%)
        risk_manager::update_position_risk(
            user_addr,
            1000000, // $1000 collateral
            900000,  // $900 debt (90% utilization)
            b"APT"
        );
        
        // Check liquidation eligibility
        let is_eligible = risk_manager::check_liquidation_eligibility(user_addr);
        
        // Should be eligible for liquidation (health factor < 100%)
        assert!(is_eligible == true, 1);
    }

    #[test(admin = @aptofi, user = @0x123)]
    public fun test_safe_borrow_amount(admin: &signer, user: &signer) {
        let user_addr = signer::address_of(user);
        
        // Initialize risk manager
        risk_manager::initialize(admin);
        
        // Calculate safe borrow amount
        let safe_amount = risk_manager::get_safe_borrow_amount(
            user_addr,
            b"APT",
            1000000 // $1000 collateral
        );
        
        // Should be less than or equal to max LTV ratio (75%)
        assert!(safe_amount <= 750000, 1); // Max $750 for $1000 collateral
        assert!(safe_amount > 0, 2); // Should be positive
    }

    #[test(admin = @aptofi)]
    public fun test_update_risk_parameters(admin: &signer) {
        // Initialize risk manager
        risk_manager::initialize(admin);
        
        // Update risk parameters
        risk_manager::update_risk_parameters(
            admin,
            8000, // 80% max LTV
            8500, // 85% liquidation threshold
            1500  // 15% liquidation penalty
        );
        
        // Verify parameters were updated
        let (max_ltv, liquidation_threshold, liquidation_penalty, _, _) = 
            risk_manager::get_risk_parameters();
        
        assert!(max_ltv == 8000, 1);
        assert!(liquidation_threshold == 8500, 2);
        assert!(liquidation_penalty == 1500, 3);
    }

    #[test(admin = @aptofi, user = @0x123)]
    #[expected_failure(abort_code = 1)] // E_NOT_AUTHORIZED
    public fun test_unauthorized_parameter_update(admin: &signer, user: &signer) {
        // Initialize risk manager
        risk_manager::initialize(admin);
        
        // Try to update parameters as non-admin user (should fail)
        risk_manager::update_risk_parameters(
            user,
            8000,
            8500,
            1500
        );
    }

    #[test(admin = @aptofi)]
    public fun test_liquidation_queue_operations(admin: &signer) {
        // Initialize risk manager
        risk_manager::initialize(admin);
        
        // Initially queue should be empty
        let queue = risk_manager::get_liquidation_queue();
        assert!(vector::length(&queue) == 0, 1);
        
        // Add unhealthy position
        let user_addr = @0x123;
        risk_manager::update_position_risk(
            user_addr,
            1000000, // $1000 collateral
            900000,  // $900 debt
            b"APT"
        );
        
        // Queue should now contain the user
        let updated_queue = risk_manager::get_liquidation_queue();
        assert!(vector::length(&updated_queue) == 1, 2);
        assert!(vector::contains(&updated_queue, &user_addr), 3);
        
        // Remove from queue
        risk_manager::remove_from_liquidation_queue(user_addr);
        
        // Queue should be empty again
        let final_queue = risk_manager::get_liquidation_queue();
        assert!(vector::length(&final_queue) == 0, 4);
    }
}
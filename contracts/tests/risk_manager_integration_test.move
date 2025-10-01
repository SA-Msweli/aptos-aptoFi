#[test_only]
module aptofi::risk_manager_integration_tests {
    use std::signer;
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::account;
    
    use aptofi::risk_manager;
    use aptofi::lending_protocol;
    use aptofi::reputation_system;
    use aptofi::chainlink_oracle;

    #[test(admin = @aptofi, user = @0x123)]
    public fun test_risk_manager_with_lending_protocol(admin: &signer, user: &signer) {
        let user_addr = signer::address_of(user);
        
        // Initialize all required modules
        risk_manager::initialize(admin);
        lending_protocol::initialize(admin);
        reputation_system::initialize(admin);
        chainlink_oracle::initialize(admin);
        
        // Create user profile and reputation
        reputation_system::create_profile(user);
        
        // Register price feed for APT
        chainlink_oracle::register_price_feed(admin, b"APT", @0x456);
        
        // Update market risk for APT
        risk_manager::update_market_risk(
            admin,
            b"APT",
            1000000, // $10 price 24h ago
            1100000, // $11 current price
            2000000  // $20k volume (moderate volatility)
        );
        
        // Calculate safe borrow amount based on reputation and market risk
        let safe_amount = risk_manager::get_safe_borrow_amount(
            user_addr,
            b"APT",
            1000000 // $1000 collateral
        );
        
        // Safe amount should be adjusted for market risk and reputation
        assert!(safe_amount > 0, 1);
        assert!(safe_amount <= 750000, 2); // Should not exceed max LTV
        
        // Simulate a lending position
        risk_manager::update_position_risk(
            user_addr,
            1000000, // $1000 collateral
            safe_amount, // Borrow safe amount
            b"APT"
        );
        
        // Health factor should be healthy
        let health_factor = risk_manager::calculate_health_factor(user_addr);
        assert!(health_factor >= 10000, 3); // Should be >= 100%
        
        // User should not be eligible for liquidation
        let is_liquidation_eligible = risk_manager::check_liquidation_eligibility(user_addr);
        assert!(is_liquidation_eligible == false, 4);
    }

    #[test(admin = @aptofi, user = @0x123)]
    public fun test_reputation_impact_on_borrowing(admin: &signer, user: &signer) {
        let user_addr = signer::address_of(user);
        
        // Initialize modules
        risk_manager::initialize(admin);
        reputation_system::initialize(admin);
        
        // Create user profile
        reputation_system::create_profile(user);
        
        // Get initial safe borrow amount (new user, tier 0)
        let initial_safe_amount = risk_manager::get_safe_borrow_amount(
            user_addr,
            b"APT",
            1000000 // $1000 collateral
        );
        
        // Improve user reputation to tier 2 (Silver)
        reputation_system::update_transaction_score(user_addr, 10000, 50);
        reputation_system::update_lending_score(user_addr, vector[true, true, true, true, true]);
        
        // Get new safe borrow amount with improved reputation
        let improved_safe_amount = risk_manager::get_safe_borrow_amount(
            user_addr,
            b"APT",
            1000000 // Same $1000 collateral
        );
        
        // Improved reputation should allow higher borrowing
        assert!(improved_safe_amount > initial_safe_amount, 1);
    }

    #[test(admin = @aptofi, user = @0x123)]
    public fun test_market_volatility_impact(admin: &signer, user: &signer) {
        let user_addr = signer::address_of(user);
        
        // Initialize modules
        risk_manager::initialize(admin);
        
        // Test with low volatility market
        risk_manager::update_market_risk(
            admin,
            b"STABLE",
            1000000, // $10 price 24h ago
            1010000, // $10.10 current price (1% change)
            1000000  // $10k volume
        );
        
        let stable_safe_amount = risk_manager::get_safe_borrow_amount(
            user_addr,
            b"STABLE",
            1000000 // $1000 collateral
        );
        
        // Test with high volatility market
        risk_manager::update_market_risk(
            admin,
            b"VOLATILE",
            1000000, // $10 price 24h ago
            1400000, // $14 current price (40% change)
            500000   // $5k volume
        );
        
        let volatile_safe_amount = risk_manager::get_safe_borrow_amount(
            user_addr,
            b"VOLATILE",
            1000000 // Same $1000 collateral
        );
        
        // Stable asset should allow higher borrowing than volatile asset
        assert!(stable_safe_amount > volatile_safe_amount, 1);
        
        // Get market risks to verify risk levels
        let stable_risk = risk_manager::get_market_risk(b"STABLE");
        let volatile_risk = risk_manager::get_market_risk(b"VOLATILE");
        
        assert!(stable_risk.risk_level < volatile_risk.risk_level, 2);
    }

    #[test(admin = @aptofi, user1 = @0x123, user2 = @0x456)]
    public fun test_liquidation_queue_management(admin: &signer, user1: &signer, user2: &signer) {
        let user1_addr = signer::address_of(user1);
        let user2_addr = signer::address_of(user2);
        
        // Initialize risk manager
        risk_manager::initialize(admin);
        
        // Create healthy position for user1
        risk_manager::update_position_risk(
            user1_addr,
            1000000, // $1000 collateral
            600000,  // $600 debt (healthy)
            b"APT"
        );
        
        // Create unhealthy position for user2
        risk_manager::update_position_risk(
            user2_addr,
            1000000, // $1000 collateral
            950000,  // $950 debt (unhealthy)
            b"APT"
        );
        
        // Check liquidation queue
        let queue = risk_manager::get_liquidation_queue();
        
        // Only user2 should be in liquidation queue
        assert!(vector::length(&queue) == 1, 1);
        assert!(vector::contains(&queue, &user2_addr), 2);
        assert!(!vector::contains(&queue, &user1_addr), 3);
        
        // User2 should be eligible for liquidation
        assert!(risk_manager::check_liquidation_eligibility(user2_addr) == true, 4);
        assert!(risk_manager::check_liquidation_eligibility(user1_addr) == false, 5);
    }

    #[test(admin = @aptofi, user = @0x123)]
    public fun test_price_feed_integration(admin: &signer, user: &signer) {
        let user_addr = signer::address_of(user);
        
        // Initialize modules
        risk_manager::initialize(admin);
        chainlink_oracle::initialize(admin);
        
        // Register price feed
        chainlink_oracle::register_price_feed(admin, b"APT", @0x789);
        
        // Update position with current market price
        risk_manager::update_position_risk(
            user_addr,
            1000000, // $1000 collateral
            700000,  // $700 debt
            b"APT"
        );
        
        // Get position risk (should include liquidation price calculation)
        let position_risk = risk_manager::get_position_risk(user_addr);
        
        // Liquidation price should be calculated based on current price feed
        assert!(position_risk.liquidation_price > 0, 1);
        assert!(position_risk.health_factor > 0, 2);
    }

    #[test(admin = @aptofi)]
    public fun test_risk_parameter_updates(admin: &signer) {
        // Initialize risk manager
        risk_manager::initialize(admin);
        
        // Get initial parameters
        let (initial_ltv, initial_threshold, initial_penalty, _, _) = 
            risk_manager::get_risk_parameters();
        
        // Update parameters
        let new_ltv = 8000; // 80%
        let new_threshold = 8500; // 85%
        let new_penalty = 1200; // 12%
        
        risk_manager::update_risk_parameters(
            admin,
            new_ltv,
            new_threshold,
            new_penalty
        );
        
        // Verify parameters were updated
        let (updated_ltv, updated_threshold, updated_penalty, _, _) = 
            risk_manager::get_risk_parameters();
        
        assert!(updated_ltv == new_ltv, 1);
        assert!(updated_threshold == new_threshold, 2);
        assert!(updated_penalty == new_penalty, 3);
        
        // Verify they're different from initial values
        assert!(updated_ltv != initial_ltv, 4);
        assert!(updated_threshold != initial_threshold, 5);
        assert!(updated_penalty != initial_penalty, 6);
    }
}
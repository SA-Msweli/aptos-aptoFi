module aptofi::risk_manager {
    use std::signer;
    use std::vector;
    use std::string;
    use aptos_framework::timestamp;
    use aptos_framework::table::{Self, Table};
    use aptos_framework::event;
    use aptos_std::math64;

    use aptofi::chainlink_oracle;
    use aptofi::reputation_system;

    // Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_INVALID_PARAMETERS: u64 = 2;
    const E_POSITION_NOT_FOUND: u64 = 3;
    const E_UNHEALTHY_POSITION: u64 = 4;
    const E_PRICE_TOO_STALE: u64 = 5;

    // Constants
    const BASIS_POINTS: u64 = 10000;
    const LIQUIDATION_THRESHOLD: u64 = 8000; // 80%
    const MAX_LTV_RATIO: u64 = 7500; // 75%
    const PRICE_DEVIATION_THRESHOLD: u64 = 500; // 5%
    const VOLATILITY_THRESHOLD: u64 = 2000; // 20%

    struct RiskParameters has key {
        max_ltv_ratio: u64, // basis points
        liquidation_threshold: u64,
        liquidation_penalty: u64,
        price_deviation_threshold: u64,
        volatility_threshold: u64,
        admin: address,
    }

    struct MarketRisk has store, copy, drop {
        token: vector<u8>,
        volatility_24h: u64,
        price_change_24h: u64, // signed value represented as u64
        liquidity_score: u64,
        risk_level: u8, // 1-5 scale
        last_updated: u64,
    }

    struct PositionRisk has store, copy, drop {
        user: address,
        collateral_value: u64,
        debt_value: u64,
        health_factor: u64,
        liquidation_price: u64,
        last_calculated: u64,
    }

    struct RiskRegistry has key {
        market_risks: Table<vector<u8>, MarketRisk>,
        position_risks: Table<address, PositionRisk>,
        liquidation_queue: vector<address>,
    }

    #[event]
    struct RiskUpdateEvent has drop, store {
        token: vector<u8>,
        old_risk_level: u8,
        new_risk_level: u8,
        timestamp: u64,
    }

    #[event]
    struct LiquidationEvent has drop, store {
        user: address,
        collateral_token: vector<u8>,
        debt_token: vector<u8>,
        liquidated_amount: u64,
        penalty_amount: u64,
        timestamp: u64,
    }

    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        move_to(admin, RiskParameters {
            max_ltv_ratio: MAX_LTV_RATIO,
            liquidation_threshold: LIQUIDATION_THRESHOLD,
            liquidation_penalty: 1000, // 10%
            price_deviation_threshold: PRICE_DEVIATION_THRESHOLD,
            volatility_threshold: VOLATILITY_THRESHOLD,
            admin: admin_addr,
        });

        move_to(admin, RiskRegistry {
            market_risks: table::new(),
            position_risks: table::new(),
            liquidation_queue: vector::empty(),
        });
    }

    public fun calculate_health_factor(user_address: address): u64 acquires RiskRegistry {
        let registry = borrow_global<RiskRegistry>(@aptofi);
        
        if (!table::contains(&registry.position_risks, user_address)) {
            return BASIS_POINTS; // 100% health factor for new users
        };

        let position = table::borrow(&registry.position_risks, user_address);
        
        if (position.debt_value == 0) {
            return BASIS_POINTS; // No debt = perfect health
        };

        // Health Factor = (Collateral Value * Liquidation Threshold) / Debt Value
        let adjusted_collateral = (position.collateral_value * LIQUIDATION_THRESHOLD) / BASIS_POINTS;
        (adjusted_collateral * BASIS_POINTS) / position.debt_value
    }

    public fun check_liquidation_eligibility(user_address: address): bool acquires RiskRegistry {
        let health_factor = calculate_health_factor(user_address);
        health_factor < BASIS_POINTS // Health factor below 100% = liquidation eligible
    }

    public fun update_market_risk(
        admin: &signer,
        token: vector<u8>,
        price_24h_ago: u64,
        current_price: u64,
        volume_24h: u64
    ) acquires RiskParameters, RiskRegistry {
        let admin_addr = signer::address_of(admin);
        let params = borrow_global<RiskParameters>(@aptofi);
        assert!(admin_addr == params.admin, E_NOT_AUTHORIZED);

        let registry = borrow_global_mut<RiskRegistry>(@aptofi);
        
        // Calculate price change percentage
        let price_change = if (current_price > price_24h_ago) {
            ((current_price - price_24h_ago) * BASIS_POINTS) / price_24h_ago
        } else {
            ((price_24h_ago - current_price) * BASIS_POINTS) / price_24h_ago
        };

        // Calculate volatility (simplified)
        let volatility = price_change; // In real implementation, use standard deviation

        // Determine risk level based on volatility and price change
        let risk_level = if (volatility > 3000) { // > 30%
            5 // Very High Risk
        } else if (volatility > 2000) { // > 20%
            4 // High Risk
        } else if (volatility > 1000) { // > 10%
            3 // Medium Risk
        } else if (volatility > 500) { // > 5%
            2 // Low Risk
        } else {
            1 // Very Low Risk
        };

        // Calculate liquidity score based on volume
        let liquidity_score = math64::min(volume_24h / 1000, 1000); // Simplified scoring

        let market_risk = MarketRisk {
            token: token,
            volatility_24h: volatility,
            price_change_24h: price_change,
            liquidity_score,
            risk_level,
            last_updated: timestamp::now_seconds(),
        };

        let old_risk_level = if (table::contains(&registry.market_risks, token)) {
            table::borrow(&registry.market_risks, token).risk_level
        } else {
            0
        };

        table::upsert(&mut registry.market_risks, token, market_risk);

        // Emit risk update event
        event::emit(RiskUpdateEvent {
            token: token,
            old_risk_level,
            new_risk_level: risk_level,
            timestamp: timestamp::now_seconds(),
        });
    }

    public fun update_position_risk(
        user_address: address,
        collateral_value: u64,
        debt_value: u64,
        collateral_token: vector<u8>
    ) acquires RiskRegistry {
        let registry = borrow_global_mut<RiskRegistry>(@aptofi);
        
        // Get current price for liquidation calculation
        let token_string = string::utf8(collateral_token);
        let (current_price, _) = chainlink_oracle::get_latest_price(token_string);
        
        // Calculate liquidation price
        let liquidation_price = if (collateral_value > 0) {
            (debt_value * BASIS_POINTS * current_price) / (collateral_value * LIQUIDATION_THRESHOLD)
        } else {
            0
        };

        let health_factor = if (debt_value == 0) {
            BASIS_POINTS
        } else {
            let adjusted_collateral = (collateral_value * LIQUIDATION_THRESHOLD) / BASIS_POINTS;
            (adjusted_collateral * BASIS_POINTS) / debt_value
        };

        let position_risk = PositionRisk {
            user: user_address,
            collateral_value,
            debt_value,
            health_factor,
            liquidation_price,
            last_calculated: timestamp::now_seconds(),
        };

        table::upsert(&mut registry.position_risks, user_address, position_risk);

        // Add to liquidation queue if unhealthy
        if (health_factor < BASIS_POINTS && !vector::contains(&registry.liquidation_queue, &user_address)) {
            vector::push_back(&mut registry.liquidation_queue, user_address);
        };
    }

    public fun get_safe_borrow_amount(
        user_address: address,
        collateral_token: vector<u8>,
        collateral_amount: u64
    ): u64 acquires RiskParameters, RiskRegistry {
        let params = borrow_global<RiskParameters>(@aptofi);
        let registry = borrow_global<RiskRegistry>(@aptofi);
        
        // Get collateral value in USD
        let token_string = string::utf8(collateral_token);
        let (collateral_price, _) = chainlink_oracle::get_latest_price(token_string);
        let collateral_value = (collateral_amount * collateral_price) / 1000000; // Assuming 6 decimals

        // Apply market risk adjustment
        let risk_multiplier = if (table::contains(&registry.market_risks, collateral_token)) {
            let market_risk = table::borrow(&registry.market_risks, collateral_token);
            if (market_risk.risk_level == 1) {
                BASIS_POINTS      // 100% - Very Low Risk
            } else if (market_risk.risk_level == 2) {
                9500              // 95% - Low Risk
            } else if (market_risk.risk_level == 3) {
                9000              // 90% - Medium Risk
            } else if (market_risk.risk_level == 4) {
                8000              // 80% - High Risk
            } else if (market_risk.risk_level == 5) {
                7000              // 70% - Very High Risk
            } else {
                8000              // Default to 80%
            }
        } else {
            8000 // Default 80% for unknown tokens
        };

        // Apply reputation bonus
        let reputation_bonus = reputation_system::get_reputation_tier(user_address);
        let reputation_multiplier = if (reputation_bonus == 0) {
            BASIS_POINTS      // 100% - New User
        } else if (reputation_bonus == 1) {
            10500             // 105% - Bronze
        } else if (reputation_bonus == 2) {
            11000             // 110% - Silver
        } else if (reputation_bonus == 3) {
            11500             // 115% - Gold
        } else if (reputation_bonus == 4) {
            12000             // 120% - Platinum
        } else {
            BASIS_POINTS      // Default 100%
        };

        // Calculate safe borrow amount
        let base_borrow_amount = (collateral_value * params.max_ltv_ratio) / BASIS_POINTS;
        let risk_adjusted = (base_borrow_amount * risk_multiplier) / BASIS_POINTS;
        (risk_adjusted * reputation_multiplier) / BASIS_POINTS
    }

    public fun get_liquidation_queue(): vector<address> acquires RiskRegistry {
        let registry = borrow_global<RiskRegistry>(@aptofi);
        registry.liquidation_queue
    }

    public fun remove_from_liquidation_queue(user_address: address) acquires RiskRegistry {
        let registry = borrow_global_mut<RiskRegistry>(@aptofi);
        let (found, index) = vector::index_of(&registry.liquidation_queue, &user_address);
        if (found) {
            vector::remove(&mut registry.liquidation_queue, index);
        };
    }

    public fun get_market_risk(token: vector<u8>): MarketRisk acquires RiskRegistry {
        let registry = borrow_global<RiskRegistry>(@aptofi);
        assert!(table::contains(&registry.market_risks, token), E_POSITION_NOT_FOUND);
        *table::borrow(&registry.market_risks, token)
    }

    public fun get_position_risk(user_address: address): PositionRisk acquires RiskRegistry {
        let registry = borrow_global<RiskRegistry>(@aptofi);
        assert!(table::contains(&registry.position_risks, user_address), E_POSITION_NOT_FOUND);
        *table::borrow(&registry.position_risks, user_address)
    }

    // Admin functions
    public fun update_risk_parameters(
        admin: &signer,
        max_ltv_ratio: u64,
        liquidation_threshold: u64,
        liquidation_penalty: u64
    ) acquires RiskParameters {
        let admin_addr = signer::address_of(admin);
        let params = borrow_global_mut<RiskParameters>(@aptofi);
        assert!(admin_addr == params.admin, E_NOT_AUTHORIZED);
        
        params.max_ltv_ratio = max_ltv_ratio;
        params.liquidation_threshold = liquidation_threshold;
        params.liquidation_penalty = liquidation_penalty;
    }

    #[view]
    public fun get_risk_parameters(): (u64, u64, u64, u64, u64) acquires RiskParameters {
        let params = borrow_global<RiskParameters>(@aptofi);
        (
            params.max_ltv_ratio,
            params.liquidation_threshold,
            params.liquidation_penalty,
            params.price_deviation_threshold,
            params.volatility_threshold
        )
    }
}
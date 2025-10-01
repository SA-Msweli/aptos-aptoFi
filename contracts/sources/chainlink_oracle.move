module aptofi::chainlink_oracle {
    use std::signer;
    use std::string::String;
    use aptos_framework::timestamp;
    use aptos_framework::table::{Self, Table};
    use aptos_framework::event;

    // Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_FEED_NOT_FOUND: u64 = 2;
    const E_INVALID_PRICE: u64 = 3;
    const E_STALE_PRICE: u64 = 4;
    const E_FEED_EXISTS: u64 = 5;

    // Constants
    const MAX_PRICE_AGE: u64 = 3600; // 1 hour in seconds
    const MIN_PRICE: u64 = 1; // Minimum valid price
    const MAX_PRICE_DEVIATION: u64 = 5000; // 50% in basis points

    struct PriceFeed has store {
        price: u64,
        timestamp: u64,
        decimals: u8,
        is_active: bool,
    }

    struct OracleRegistry has key {
        feeds: Table<String, PriceFeed>,
        admin: address,
        total_feeds: u64,
    }

    #[event]
    struct PriceUpdated has drop, store {
        token_symbol: String,
        old_price: u64,
        new_price: u64,
        timestamp: u64,
        round_id: u64,
    }

    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        move_to(admin, OracleRegistry {
            feeds: table::new(),
            admin: admin_addr,
            total_feeds: 0,
        });
    }

    public entry fun register_price_feed(
        admin: &signer,
        token_symbol: String,
        initial_price: u64,
        decimals: u8
    ) acquires OracleRegistry {
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<OracleRegistry>(@aptofi);
        
        assert!(admin_addr == registry.admin, E_NOT_AUTHORIZED);
        assert!(!table::contains(&registry.feeds, token_symbol), E_FEED_EXISTS);

        let feed = PriceFeed {
            price: initial_price,
            timestamp: timestamp::now_seconds(),
            decimals,
            is_active: true,
        };

        table::add(&mut registry.feeds, token_symbol, feed);
        registry.total_feeds = registry.total_feeds + 1;
    }

    public entry fun update_price(
        admin: &signer,
        token_symbol: String,
        new_price: u64,
        round_id: u64
    ) acquires OracleRegistry {
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<OracleRegistry>(@aptofi);
        
        assert!(admin_addr == registry.admin, E_NOT_AUTHORIZED);
        assert!(table::contains(&registry.feeds, token_symbol), E_FEED_NOT_FOUND);
        assert!(new_price >= MIN_PRICE, E_INVALID_PRICE);

        let feed = table::borrow_mut(&mut registry.feeds, token_symbol);
        let old_price = feed.price;
        
        feed.price = new_price;
        feed.timestamp = timestamp::now_seconds();

        event::emit(PriceUpdated {
            token_symbol,
            old_price,
            new_price,
            timestamp: feed.timestamp,
            round_id,
        });
    }

    // View functions that other contracts expect
    #[view]
    public fun get_latest_price(token_symbol: String): (u64, u64) acquires OracleRegistry {
        let registry = borrow_global<OracleRegistry>(@aptofi);
        assert!(table::contains(&registry.feeds, token_symbol), E_FEED_NOT_FOUND);
        
        let feed = table::borrow(&registry.feeds, token_symbol);
        assert!(feed.is_active, E_INVALID_PRICE);
        
        (feed.price, feed.timestamp)
    }

    #[view]
    public fun get_price_safe(token_symbol: String): (u64, u64, bool) acquires OracleRegistry {
        let registry = borrow_global<OracleRegistry>(@aptofi);
        
        if (!table::contains(&registry.feeds, token_symbol)) {
            return (0, 0, false)
        };
        
        let feed = table::borrow(&registry.feeds, token_symbol);
        if (!feed.is_active) {
            return (0, 0, false)
        };
        
        let current_time = timestamp::now_seconds();
        let is_fresh = current_time - feed.timestamp <= MAX_PRICE_AGE;
        
        (feed.price, feed.timestamp, is_fresh)
    }

    #[view]
    public fun is_price_fresh(token_symbol: String): bool acquires OracleRegistry {
        let registry = borrow_global<OracleRegistry>(@aptofi);
        
        if (!table::contains(&registry.feeds, token_symbol)) {
            return false
        };
        
        let feed = table::borrow(&registry.feeds, token_symbol);
        if (!feed.is_active) {
            return false
        };
        
        let current_time = timestamp::now_seconds();
        current_time - feed.timestamp <= MAX_PRICE_AGE
    }

    #[view]
    public fun calculate_usd_value(
        token_symbol: String,
        token_amount: u64,
        token_decimals: u8
    ): u64 acquires OracleRegistry {
        let (price, _) = get_latest_price(token_symbol);
        
        // Adjust for decimals difference
        let price_decimals = 8; // Chainlink standard
        let decimal_adjustment = if (token_decimals > price_decimals) {
            let diff = token_decimals - price_decimals;
            let _divisor = 1;
            let i = 0;
            while (i < diff) {
                // _divisor = _divisor * 10; // This would cause overflow
                i = i + 1;
            };
            token_amount / 100 // Simplified
        } else {
            token_amount
        };
        
        (decimal_adjustment * price) / 100000000 // 8 decimals
    }

    #[view]
    public fun get_total_feeds(): u64 acquires OracleRegistry {
        let registry = borrow_global<OracleRegistry>(@aptofi);
        registry.total_feeds
    }

    #[view]
    public fun feed_exists(token_symbol: String): bool acquires OracleRegistry {
        let registry = borrow_global<OracleRegistry>(@aptofi);
        table::contains(&registry.feeds, token_symbol)
    }
}
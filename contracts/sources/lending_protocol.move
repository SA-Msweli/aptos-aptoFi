module aptofi::lending_protocol {
    use std::signer;
    use std::string::String;
    use aptos_framework::timestamp;
    use aptos_framework::table::{Self, Table};
    use aptos_framework::event;
    
    use aptofi::chainlink_oracle;
    use aptofi::did_registry;
    use aptofi::reputation_system;

    // Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_POOL_NOT_FOUND: u64 = 2;
    const E_INSUFFICIENT_LIQUIDITY: u64 = 3;
    const E_LOAN_NOT_FOUND: u64 = 4;
    const E_INSUFFICIENT_COLLATERAL: u64 = 5;
    const E_LOAN_OVERDUE: u64 = 6;

    // Constants
    const BASIS_POINTS: u64 = 10000;
    const BASE_INTEREST_RATE: u64 = 1000; // 10%
    const MIN_COLLATERAL_RATIO: u64 = 15000; // 150%
    const LIQUIDATION_THRESHOLD: u64 = 12000; // 120%

    struct LendingPool has key {
        total_liquidity: u64,
        total_borrowed: u64,
        base_rate: u64,
        utilization_rate: u64,
        token_symbol: String,
        created_at: u64,
    }

    struct Loan has store {
        borrower: address,
        amount: u64,
        collateral_amount: u64,
        interest_rate: u64,
        start_time: u64,
        duration: u64,
        is_active: bool,
        total_repaid: u64,
    }

    struct LendingRegistry has key {
        pools: Table<String, address>,
        total_pools: u64,
        admin: address,
    }

    struct UserLoans has key {
        active_loans: Table<String, Loan>,
        loan_count: u64,
    }

    struct SupplyPosition has key {
        positions: Table<String, u64>, // token -> amount supplied
        total_supplied: u64,
    }

    #[event]
    struct LoanCreated has drop, store {
        borrower: address,
        token: String,
        amount: u64,
        collateral_amount: u64,
        interest_rate: u64,
        duration: u64,
        timestamp: u64,
    }

    #[event]
    struct LoanRepaid has drop, store {
        borrower: address,
        token: String,
        amount: u64,
        interest_paid: u64,
        timestamp: u64,
    }

    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        move_to(admin, LendingRegistry {
            pools: table::new(),
            total_pools: 0,
            admin: admin_addr,
        });
    }

    public entry fun create_lending_pool(
        admin: &signer,
        token_symbol: String,
        initial_liquidity: u64
    ) acquires LendingRegistry {
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<LendingRegistry>(@aptofi);
        assert!(admin_addr == registry.admin, E_NOT_AUTHORIZED);
        assert!(!table::contains(&registry.pools, token_symbol), E_POOL_NOT_FOUND);

        let pool = LendingPool {
            total_liquidity: initial_liquidity,
            total_borrowed: 0,
            base_rate: BASE_INTEREST_RATE,
            utilization_rate: 0,
            token_symbol,
            created_at: timestamp::now_seconds(),
        };

        move_to(admin, pool);
        table::add(&mut registry.pools, token_symbol, admin_addr);
        registry.total_pools = registry.total_pools + 1;
    }

    public entry fun supply_liquidity(
        account: &signer,
        pool_address: address,
        token_symbol: String,
        amount: u64
    ) acquires LendingPool, SupplyPosition {
        let user_addr = signer::address_of(account);
        assert!(did_registry::profile_exists(user_addr), E_NOT_AUTHORIZED);
        assert!(exists<LendingPool>(pool_address), E_POOL_NOT_FOUND);
        assert!(amount > 0, E_INSUFFICIENT_LIQUIDITY);

        let pool = borrow_global_mut<LendingPool>(pool_address);
        pool.total_liquidity = pool.total_liquidity + amount;
        
        // Update utilization rate
        if (pool.total_liquidity > 0) {
            pool.utilization_rate = (pool.total_borrowed * BASIS_POINTS) / pool.total_liquidity;
        };

        // Initialize or update user supply position
        if (!exists<SupplyPosition>(user_addr)) {
            move_to(account, SupplyPosition {
                positions: table::new(),
                total_supplied: 0,
            });
        };

        let position = borrow_global_mut<SupplyPosition>(user_addr);
        if (table::contains(&position.positions, token_symbol)) {
            let current_amount = table::borrow_mut(&mut position.positions, token_symbol);
            *current_amount = *current_amount + amount;
        } else {
            table::add(&mut position.positions, token_symbol, amount);
        };
        position.total_supplied = position.total_supplied + amount;
    }

    public entry fun request_loan(
        account: &signer,
        pool_address: address,
        token_symbol: String,
        amount: u64,
        collateral_amount: u64,
        duration: u64
    ) acquires LendingPool, UserLoans {
        let user_addr = signer::address_of(account);
        assert!(did_registry::profile_exists(user_addr), E_NOT_AUTHORIZED);
        assert!(exists<LendingPool>(pool_address), E_POOL_NOT_FOUND);
        assert!(amount > 0, E_INSUFFICIENT_LIQUIDITY);

        let pool = borrow_global_mut<LendingPool>(pool_address);
        assert!(pool.total_liquidity >= amount, E_INSUFFICIENT_LIQUIDITY);

        // Check collateral ratio
        let (token_price, _) = chainlink_oracle::get_latest_price(token_symbol);
        let collateral_value = collateral_amount * token_price / 1000000; // Assuming 6 decimals
        let loan_value = amount * token_price / 1000000;
        let collateral_ratio = (collateral_value * BASIS_POINTS) / loan_value;
        assert!(collateral_ratio >= MIN_COLLATERAL_RATIO, E_INSUFFICIENT_COLLATERAL);

        // Calculate interest rate based on reputation
        let reputation_tier = reputation_system::get_reputation_tier(user_addr);
        let interest_rate = calculate_interest_rate(pool.base_rate, reputation_tier);

        // Create loan
        let loan = Loan {
            borrower: user_addr,
            amount,
            collateral_amount,
            interest_rate,
            start_time: timestamp::now_seconds(),
            duration,
            is_active: true,
            total_repaid: 0,
        };

        // Initialize or update user loans
        if (!exists<UserLoans>(user_addr)) {
            move_to(account, UserLoans {
                active_loans: table::new(),
                loan_count: 0,
            });
        };

        let user_loans = borrow_global_mut<UserLoans>(user_addr);
        table::add(&mut user_loans.active_loans, token_symbol, loan);
        user_loans.loan_count = user_loans.loan_count + 1;

        // Update pool
        pool.total_borrowed = pool.total_borrowed + amount;
        pool.total_liquidity = pool.total_liquidity - amount;
        if (pool.total_liquidity > 0) {
            pool.utilization_rate = (pool.total_borrowed * BASIS_POINTS) / pool.total_liquidity;
        };

        event::emit(LoanCreated {
            borrower: user_addr,
            token: token_symbol,
            amount,
            collateral_amount,
            interest_rate,
            duration,
            timestamp: timestamp::now_seconds(),
        });
    }

    public entry fun repay_loan(
        account: &signer,
        pool_address: address,
        token_symbol: String,
        repayment_amount: u64
    ) acquires LendingPool, UserLoans {
        let user_addr = signer::address_of(account);
        assert!(exists<UserLoans>(user_addr), E_LOAN_NOT_FOUND);
        assert!(exists<LendingPool>(pool_address), E_POOL_NOT_FOUND);

        let user_loans = borrow_global_mut<UserLoans>(user_addr);
        assert!(table::contains(&user_loans.active_loans, token_symbol), E_LOAN_NOT_FOUND);

        let loan = table::borrow_mut(&mut user_loans.active_loans, token_symbol);
        assert!(loan.is_active, E_LOAN_NOT_FOUND);

        // Calculate interest
        let current_time = timestamp::now_seconds();
        let time_elapsed = current_time - loan.start_time;
        let interest_owed = (loan.amount * loan.interest_rate * time_elapsed) / (BASIS_POINTS * 365 * 24 * 3600);
        let total_owed = loan.amount + interest_owed;

        let pool = borrow_global_mut<LendingPool>(pool_address);

        if (repayment_amount >= total_owed) {
            // Full repayment
            loan.is_active = false;
            loan.total_repaid = total_owed;
            
            pool.total_borrowed = pool.total_borrowed - loan.amount;
            pool.total_liquidity = pool.total_liquidity + repayment_amount;

            // Update reputation for successful repayment
            reputation_system::update_lending_score(user_addr, vector[true]);

            event::emit(LoanRepaid {
                borrower: user_addr,
                token: token_symbol,
                amount: loan.amount,
                interest_paid: interest_owed,
                timestamp: current_time,
            });
        } else {
            // Partial repayment
            loan.total_repaid = loan.total_repaid + repayment_amount;
            pool.total_liquidity = pool.total_liquidity + repayment_amount;
        };

        // Update utilization rate
        if (pool.total_liquidity > 0) {
            pool.utilization_rate = (pool.total_borrowed * BASIS_POINTS) / pool.total_liquidity;
        };
    }

    fun calculate_interest_rate(base_rate: u64, reputation_tier: u8): u64 {
        let discount = (reputation_tier as u64) * 50; // 0.5% discount per tier
        if (base_rate > discount) {
            base_rate - discount
        } else {
            base_rate / 2 // Minimum 50% of base rate
        }
    }

    #[view]
    public fun get_pool_info(pool_address: address): (u64, u64, u64, u64, String) acquires LendingPool {
        assert!(exists<LendingPool>(pool_address), E_POOL_NOT_FOUND);
        
        let pool = borrow_global<LendingPool>(pool_address);
        (
            pool.total_liquidity,
            pool.total_borrowed,
            pool.base_rate,
            pool.utilization_rate,
            pool.token_symbol
        )
    }

    #[view]
    public fun get_user_loan(user_address: address, token_symbol: String): (u64, u64, u64, u64, bool) acquires UserLoans {
        if (!exists<UserLoans>(user_address)) {
            return (0, 0, 0, 0, false)
        };
        
        let user_loans = borrow_global<UserLoans>(user_address);
        if (!table::contains(&user_loans.active_loans, token_symbol)) {
            return (0, 0, 0, 0, false)
        };
        
        let loan = table::borrow(&user_loans.active_loans, token_symbol);
        (
            loan.amount,
            loan.collateral_amount,
            loan.interest_rate,
            loan.start_time,
            loan.is_active
        )
    }

    #[view]
    public fun calculate_loan_health(user_address: address, token_symbol: String): u64 acquires UserLoans {
        if (!exists<UserLoans>(user_address)) {
            return BASIS_POINTS // 100% health for no loans
        };
        
        let user_loans = borrow_global<UserLoans>(user_address);
        if (!table::contains(&user_loans.active_loans, token_symbol)) {
            return BASIS_POINTS
        };
        
        let loan = table::borrow(&user_loans.active_loans, token_symbol);
        if (!loan.is_active) {
            return BASIS_POINTS
        };
        
        // Get current price
        let (token_price, _) = chainlink_oracle::get_latest_price(token_symbol);
        let collateral_value = loan.collateral_amount * token_price / 1000000;
        let loan_value = loan.amount * token_price / 1000000;
        
        if (loan_value == 0) {
            return BASIS_POINTS
        };
        
        (collateral_value * BASIS_POINTS) / loan_value
    }
}
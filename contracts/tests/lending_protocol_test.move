module aptofi::lending_protocol_test {
    use std::signer;
    use std::vector;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptofi::lending_protocol;

    #[test_only]
    use aptos_framework::account;

    #[test(admin = @aptofi, user1 = @0x123, user2 = @0x456)]
    public fun test_initialize_protocol(admin: &signer, user1: &signer, user2: &signer) {
        // Setup test environment
        timestamp::set_time_has_started_for_testing(&account::create_signer_for_test(@0x1));
        
        let admin_addr = signer::address_of(admin);
        let user1_addr = signer::address_of(user1);
        let user2_addr = signer::address_of(user2);

        // Create accounts
        account::create_account_for_test(admin_addr);
        account::create_account_for_test(user1_addr);
        account::create_account_for_test(user2_addr);

        // Initialize protocol
        lending_protocol::initialize(admin);

        // Verify protocol is initialized
        assert!(lending_protocol::is_initialized(), 1);
    }

    #[test(admin = @aptofi, user = @0x123)]
    public fun test_deposit_and_withdraw(admin: &signer, user: &signer) {
        // Setup
        timestamp::set_time_has_started_for_testing(&account::create_signer_for_test(@0x1));
        
        let admin_addr = signer::address_of(admin);
        let user_addr = signer::address_of(user);

        account::create_account_for_test(admin_addr);
        account::create_account_for_test(user_addr);

        // Initialize protocol and register coin
        lending_protocol::initialize(admin);
        coin::register<AptosCoin>(user);

        // Mint some coins for testing
        let coins = coin::mint<AptosCoin>(1000000, &account::create_signer_for_test(@0x1));
        coin::deposit(user_addr, coins);

        // Test deposit
        let deposit_amount = 100000;
        lending_protocol::deposit<AptosCoin>(user, deposit_amount);

        // Verify deposit
        let balance = lending_protocol::get_deposit_balance<AptosCoin>(user_addr);
        assert!(balance == deposit_amount, 2);

        // Test withdrawal
        let withdraw_amount = 50000;
        lending_protocol::withdraw<AptosCoin>(user, withdraw_amount);

        // Verify withdrawal
        let new_balance = lending_protocol::get_deposit_balance<AptosCoin>(user_addr);
        assert!(new_balance == deposit_amount - withdraw_amount, 3);
    }

    #[test(admin = @aptofi, borrower = @0x123)]
    public fun test_borrow_and_repay(admin: &signer, borrower: &signer) {
        // Setup
        timestamp::set_time_has_started_for_testing(&account::create_signer_for_test(@0x1));
        
        let admin_addr = signer::address_of(admin);
        let borrower_addr = signer::address_of(borrower);

        account::create_account_for_test(admin_addr);
        account::create_account_for_test(borrower_addr);

        // Initialize protocol
        lending_protocol::initialize(admin);
        coin::register<AptosCoin>(borrower);

        // Mint and deposit collateral
        let collateral_coins = coin::mint<AptosCoin>(1000000, &account::create_signer_for_test(@0x1));
        coin::deposit(borrower_addr, collateral_coins);

        let collateral_amount = 500000;
        lending_protocol::deposit<AptosCoin>(borrower, collateral_amount);

        // Test borrow (50% of collateral)
        let borrow_amount = 250000;
        lending_protocol::borrow<AptosCoin>(borrower, borrow_amount);

        // Verify borrow
        let debt = lending_protocol::get_debt_balance<AptosCoin>(borrower_addr);
        assert!(debt >= borrow_amount, 4); // Should include interest

        // Test repay
        lending_protocol::repay<AptosCoin>(borrower, borrow_amount);

        // Verify repayment (debt should be reduced)
        let new_debt = lending_protocol::get_debt_balance<AptosCoin>(borrower_addr);
        assert!(new_debt < debt, 5);
    }

    #[test(admin = @aptofi, user = @0x123)]
    #[expected_failure(abort_code = 1)] // Insufficient collateral
    public fun test_borrow_insufficient_collateral(admin: &signer, user: &signer) {
        // Setup
        timestamp::set_time_has_started_for_testing(&account::create_signer_for_test(@0x1));
        
        let admin_addr = signer::address_of(admin);
        let user_addr = signer::address_of(user);

        account::create_account_for_test(admin_addr);
        account::create_account_for_test(user_addr);

        // Initialize protocol
        lending_protocol::initialize(admin);
        coin::register<AptosCoin>(user);

        // Try to borrow without sufficient collateral
        lending_protocol::borrow<AptosCoin>(user, 100000);
    }

    #[test(admin = @aptofi, user = @0x123)]
    public fun test_liquidation(admin: &signer, user: &signer) {
        // Setup
        timestamp::set_time_has_started_for_testing(&account::create_signer_for_test(@0x1));
        
        let admin_addr = signer::address_of(admin);
        let user_addr = signer::address_of(user);

        account::create_account_for_test(admin_addr);
        account::create_account_for_test(user_addr);

        // Initialize protocol
        lending_protocol::initialize(admin);
        coin::register<AptosCoin>(user);

        // Setup position for liquidation
        let collateral_coins = coin::mint<AptosCoin>(1000000, &account::create_signer_for_test(@0x1));
        coin::deposit(user_addr, collateral_coins);

        lending_protocol::deposit<AptosCoin>(user, 200000);
        lending_protocol::borrow<AptosCoin>(user, 150000);

        // Simulate price drop by updating oracle (would need oracle integration)
        // For now, just test the liquidation function exists
        let can_liquidate = lending_protocol::can_liquidate<AptosCoin>(user_addr);
        
        // In a real scenario with price feeds, this would be true
        // For testing, we just verify the function works
        assert!(can_liquidate == false, 6); // Should be false with current setup
    }
}
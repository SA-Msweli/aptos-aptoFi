module aptofi::yield_vault_test {
    use std::signer;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptofi::yield_vault;

    #[test_only]
    use aptos_framework::account;

    #[test(admin = @aptofi, user = @0x123)]
    public fun test_initialize_vault(admin: &signer, user: &signer) {
        // Setup test environment
        timestamp::set_time_has_started_for_testing(&account::create_signer_for_test(@0x1));
        
        let admin_addr = signer::address_of(admin);
        let user_addr = signer::address_of(user);

        account::create_account_for_test(admin_addr);
        account::create_account_for_test(user_addr);

        // Initialize vault
        yield_vault::initialize(admin);

        // Verify vault is initialized
        assert!(yield_vault::is_initialized(), 1);
    }

    #[test(admin = @aptofi, user = @0x123)]
    public fun test_deposit_and_withdraw(admin: &signer, user: &signer) {
        // Setup
        timestamp::set_time_has_started_for_testing(&account::create_signer_for_test(@0x1));
        
        let admin_addr = signer::address_of(admin);
        let user_addr = signer::address_of(user);

        account::create_account_for_test(admin_addr);
        account::create_account_for_test(user_addr);

        // Initialize vault
        yield_vault::initialize(admin);
        coin::register<AptosCoin>(user);

        // Mint coins for testing
        let coins = coin::mint<AptosCoin>(1000000, &account::create_signer_for_test(@0x1));
        coin::deposit(user_addr, coins);

        // Test deposit
        let deposit_amount = 100000;
        yield_vault::deposit<AptosCoin>(user, deposit_amount);

        // Verify shares were minted
        let shares = yield_vault::get_shares<AptosCoin>(user_addr);
        assert!(shares > 0, 2);

        // Test withdrawal
        let withdraw_shares = shares / 2;
        yield_vault::withdraw<AptosCoin>(user, withdraw_shares);

        // Verify shares were burned
        let remaining_shares = yield_vault::get_shares<AptosCoin>(user_addr);
        assert!(remaining_shares == shares - withdraw_shares, 3);
    }

    #[test(admin = @aptofi, user = @0x123)]
    public fun test_yield_calculation(admin: &signer, user: &signer) {
        // Setup
        timestamp::set_time_has_started_for_testing(&account::create_signer_for_test(@0x1));
        
        let admin_addr = signer::address_of(admin);
        let user_addr = signer::address_of(user);

        account::create_account_for_test(admin_addr);
        account::create_account_for_test(user_addr);

        // Initialize vault
        yield_vault::initialize(admin);
        coin::register<AptosCoin>(user);

        // Mint and deposit
        let coins = coin::mint<AptosCoin>(1000000, &account::create_signer_for_test(@0x1));
        coin::deposit(user_addr, coins);

        let deposit_amount = 100000;
        yield_vault::deposit<AptosCoin>(user, deposit_amount);

        // Simulate time passing and yield generation
        timestamp::fast_forward_seconds(86400); // 1 day

        // Calculate expected yield
        let apy = yield_vault::get_apy<AptosCoin>();
        assert!(apy > 0, 4);

        // Test yield distribution
        yield_vault::distribute_yield<AptosCoin>(admin);

        // Verify yield was added
        let total_assets = yield_vault::get_total_assets<AptosCoin>();
        assert!(total_assets >= deposit_amount, 5);
    }

    #[test(admin = @aptofi, user1 = @0x123, user2 = @0x456)]
    public fun test_multiple_users(admin: &signer, user1: &signer, user2: &signer) {
        // Setup
        timestamp::set_time_has_started_for_testing(&account::create_signer_for_test(@0x1));
        
        let admin_addr = signer::address_of(admin);
        let user1_addr = signer::address_of(user1);
        let user2_addr = signer::address_of(user2);

        account::create_account_for_test(admin_addr);
        account::create_account_for_test(user1_addr);
        account::create_account_for_test(user2_addr);

        // Initialize vault
        yield_vault::initialize(admin);
        coin::register<AptosCoin>(user1);
        coin::register<AptosCoin>(user2);

        // Mint coins for both users
        let coins1 = coin::mint<AptosCoin>(1000000, &account::create_signer_for_test(@0x1));
        let coins2 = coin::mint<AptosCoin>(2000000, &account::create_signer_for_test(@0x1));
        coin::deposit(user1_addr, coins1);
        coin::deposit(user2_addr, coins2);

        // Both users deposit
        yield_vault::deposit<AptosCoin>(user1, 100000);
        yield_vault::deposit<AptosCoin>(user2, 200000);

        // Verify shares are proportional
        let shares1 = yield_vault::get_shares<AptosCoin>(user1_addr);
        let shares2 = yield_vault::get_shares<AptosCoin>(user2_addr);
        
        // User2 should have approximately 2x shares of user1
        assert!(shares2 > shares1, 6);
        assert!(shares2 <= shares1 * 2 + 1, 7); // Allow for rounding
    }

    #[test(admin = @aptofi, user = @0x123)]
    public fun test_emergency_withdrawal(admin: &signer, user: &signer) {
        // Setup
        timestamp::set_time_has_started_for_testing(&account::create_signer_for_test(@0x1));
        
        let admin_addr = signer::address_of(admin);
        let user_addr = signer::address_of(user);

        account::create_account_for_test(admin_addr);
        account::create_account_for_test(user_addr);

        // Initialize vault
        yield_vault::initialize(admin);
        coin::register<AptosCoin>(user);

        // Deposit funds
        let coins = coin::mint<AptosCoin>(1000000, &account::create_signer_for_test(@0x1));
        coin::deposit(user_addr, coins);
        yield_vault::deposit<AptosCoin>(user, 100000);

        // Pause vault (emergency)
        yield_vault::pause(admin);

        // Test emergency withdrawal
        let shares = yield_vault::get_shares<AptosCoin>(user_addr);
        yield_vault::emergency_withdraw<AptosCoin>(user, shares);

        // Verify all shares were burned
        let remaining_shares = yield_vault::get_shares<AptosCoin>(user_addr);
        assert!(remaining_shares == 0, 8);
    }
}
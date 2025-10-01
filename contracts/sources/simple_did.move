module aptofi::simple_did {
    use std::signer;
    use aptos_framework::timestamp;

    struct UserProfile has key {
        created_at: u64,
        is_active: bool,
    }

    struct Registry has key {
        total_users: u64,
    }

    public entry fun initialize(admin: &signer) {
        move_to(admin, Registry {
            total_users: 0,
        });
    }

    public entry fun create_profile(account: &signer) acquires Registry {
        let user_addr = signer::address_of(account);
        assert!(!exists<UserProfile>(user_addr), 1);
        
        move_to(account, UserProfile {
            created_at: timestamp::now_seconds(),
            is_active: true,
        });

        let registry = borrow_global_mut<Registry>(@aptofi);
        registry.total_users = registry.total_users + 1;
    }

    #[view]
    public fun get_total_users(): u64 acquires Registry {
        let registry = borrow_global<Registry>(@aptofi);
        registry.total_users
    }

    #[view]
    public fun profile_exists(user_address: address): bool {
        exists<UserProfile>(user_address)
    }
}
/// Decentralized Identity Registry for AptoFi
/// Manages unique on-chain identities and profiles for users
module aptofi::did_registry {
    use std::signer;
    use std::vector;
    use std::string::{Self, String};
    use std::timestamp;
    use aptos_framework::event;
    use aptos_framework::table::{Self, Table};
    use aptos_std::simple_map::{Self, SimpleMap};

    // Error codes
    const E_PROFILE_ALREADY_EXISTS: u64 = 1;
    const E_PROFILE_NOT_FOUND: u64 = 2;
    const E_UNAUTHORIZED: u64 = 3;
    const E_PROFILE_INACTIVE: u64 = 4;

    /// User profile structure containing identity information
    struct UserProfile has key, store {
        wallet_address: address,
        created_at: u64,
        updated_at: u64,
        profile_hash: vector<u8>, // IPFS hash of profile metadata
        is_active: bool,
        metadata: SimpleMap<String, String>, // Flexible metadata storage
    }

    /// Global registry to track all users and provide lookup functionality
    struct GlobalRegistry has key {
        total_users: u64,
        address_to_profile: Table<address, bool>, // Quick existence check
        admin: address,
    }

    /// Event emitted when a new profile is created
    #[event]
    struct ProfileCreated has drop, store {
        user_address: address,
        profile_hash: vector<u8>,
        timestamp: u64,
    }

    /// Event emitted when a profile is updated
    #[event]
    struct ProfileUpdated has drop, store {
        user_address: address,
        old_hash: vector<u8>,
        new_hash: vector<u8>,
        timestamp: u64,
    }

    /// Event emitted when a profile is deactivated
    #[event]
    struct ProfileDeactivated has drop, store {
        user_address: address,
        timestamp: u64,
    }

    /// Initialize the DID registry (called once during deployment)
    public fun initialize(admin: &signer) {
        let admin_address = signer::address_of(admin);
        
        move_to(admin, GlobalRegistry {
            total_users: 0,
            address_to_profile: table::new(),
            admin: admin_address,
        });
    }

    /// Create a new user profile
    public entry fun create_profile(
        account: &signer,
        profile_hash: vector<u8>,
        metadata_keys: vector<String>,
        metadata_values: vector<String>
    ) acquires GlobalRegistry {
        let user_address = signer::address_of(account);
        
        // Check if profile already exists
        assert!(!exists<UserProfile>(user_address), E_PROFILE_ALREADY_EXISTS);
        
        let current_time = timestamp::now_seconds();
        
        // Create metadata map
        let metadata = simple_map::create<String, String>();
        let i = 0;
        while (i < vector::length(&metadata_keys)) {
            simple_map::add(
                &mut metadata,
                *vector::borrow(&metadata_keys, i),
                *vector::borrow(&metadata_values, i)
            );
            i = i + 1;
        };

        // Create and store profile
        let profile = UserProfile {
            wallet_address: user_address,
            created_at: current_time,
            updated_at: current_time,
            profile_hash,
            is_active: true,
            metadata,
        };
        
        move_to(account, profile);
        
        // Update global registry
        let registry = borrow_global_mut<GlobalRegistry>(@aptofi);
        registry.total_users = registry.total_users + 1;
        table::add(&mut registry.address_to_profile, user_address, true);
        
        // Emit event
        event::emit(ProfileCreated {
            user_address,
            profile_hash,
            timestamp: current_time,
        });
    }

    /// Update an existing user profile
    public entry fun update_profile(
        account: &signer,
        new_profile_hash: vector<u8>,
        metadata_keys: vector<String>,
        metadata_values: vector<String>
    ) acquires UserProfile {
        let user_address = signer::address_of(account);
        
        assert!(exists<UserProfile>(user_address), E_PROFILE_NOT_FOUND);
        
        let profile = borrow_global_mut<UserProfile>(user_address);
        assert!(profile.is_active, E_PROFILE_INACTIVE);
        
        let old_hash = profile.profile_hash;
        let current_time = timestamp::now_seconds();
        
        // Update profile data
        profile.profile_hash = new_profile_hash;
        profile.updated_at = current_time;
        
        // Update metadata
        let i = 0;
        while (i < vector::length(&metadata_keys)) {
            let key = *vector::borrow(&metadata_keys, i);
            let value = *vector::borrow(&metadata_values, i);
            
            if (simple_map::contains_key(&profile.metadata, &key)) {
                simple_map::remove(&mut profile.metadata, &key);
            };
            simple_map::add(&mut profile.metadata, key, value);
            i = i + 1;
        };
        
        // Emit event
        event::emit(ProfileUpdated {
            user_address,
            old_hash,
            new_hash: new_profile_hash,
            timestamp: current_time,
        });
    }

    /// Deactivate a user profile
    public entry fun deactivate_profile(account: &signer) acquires UserProfile {
        let user_address = signer::address_of(account);
        
        assert!(exists<UserProfile>(user_address), E_PROFILE_NOT_FOUND);
        
        let profile = borrow_global_mut<UserProfile>(user_address);
        profile.is_active = false;
        profile.updated_at = timestamp::now_seconds();
        
        // Emit event
        event::emit(ProfileDeactivated {
            user_address,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Get user profile (view function)
    #[view]
    public fun get_profile(user_address: address): (address, u64, u64, vector<u8>, bool) acquires UserProfile {
        assert!(exists<UserProfile>(user_address), E_PROFILE_NOT_FOUND);
        
        let profile = borrow_global<UserProfile>(user_address);
        (
            profile.wallet_address,
            profile.created_at,
            profile.updated_at,
            profile.profile_hash,
            profile.is_active
        )
    }

    /// Check if a profile exists for an address
    #[view]
    public fun profile_exists(user_address: address): bool {
        exists<UserProfile>(user_address)
    }

    /// Check if a profile is active
    #[view]
    public fun is_profile_active(user_address: address): bool acquires UserProfile {
        if (!exists<UserProfile>(user_address)) {
            return false
        };
        
        let profile = borrow_global<UserProfile>(user_address);
        profile.is_active
    }

    /// Get profile metadata value by key
    #[view]
    public fun get_metadata(user_address: address, key: String): String acquires UserProfile {
        assert!(exists<UserProfile>(user_address), E_PROFILE_NOT_FOUND);
        
        let profile = borrow_global<UserProfile>(user_address);
        assert!(profile.is_active, E_PROFILE_INACTIVE);
        
        *simple_map::borrow(&profile.metadata, &key)
    }

    /// Get total number of users
    #[view]
    public fun get_total_users(): u64 acquires GlobalRegistry {
        let registry = borrow_global<GlobalRegistry>(@aptofi);
        registry.total_users
    }

    /// Admin function to force deactivate a profile
    public entry fun admin_deactivate_profile(
        admin: &signer,
        target_address: address
    ) acquires GlobalRegistry, UserProfile {
        let admin_address = signer::address_of(admin);
        let registry = borrow_global<GlobalRegistry>(@aptofi);
        
        assert!(admin_address == registry.admin, E_UNAUTHORIZED);
        assert!(exists<UserProfile>(target_address), E_PROFILE_NOT_FOUND);
        
        let profile = borrow_global_mut<UserProfile>(target_address);
        profile.is_active = false;
        profile.updated_at = timestamp::now_seconds();
        
        // Emit event
        event::emit(ProfileDeactivated {
            user_address: target_address,
            timestamp: timestamp::now_seconds(),
        });
    }

    // Test functions
    #[test_only]
    public fun init_for_test(admin: &signer) {
        initialize(admin);
    }

    #[test(admin = @aptofi, user = @0x123)]
    public fun test_create_profile(admin: &signer, user: &signer) acquires GlobalRegistry {
        // Initialize registry
        initialize(admin);
        
        // Set up timestamp
        timestamp::set_time_has_started_for_testing(&aptos_framework::account::create_signer_for_test(@0x1));
        
        // Create profile
        let profile_hash = b"QmHash123";
        let keys = vector[string::utf8(b"name"), string::utf8(b"bio")];
        let values = vector[string::utf8(b"Alice"), string::utf8(b"DeFi enthusiast")];
        
        create_profile(user, profile_hash, keys, values);
        
        // Verify profile exists
        let user_address = signer::address_of(user);
        assert!(profile_exists(user_address), 0);
        assert!(is_profile_active(user_address), 1);
        
        // Verify total users count
        assert!(get_total_users() == 1, 2);
    }

    #[test(admin = @aptofi, user = @0x123)]
    public fun test_update_profile(admin: &signer, user: &signer) acquires GlobalRegistry, UserProfile {
        // Initialize and create profile
        initialize(admin);
        timestamp::set_time_has_started_for_testing(&aptos_framework::account::create_signer_for_test(@0x1));
        
        let initial_hash = b"QmHash123";
        let keys = vector[string::utf8(b"name")];
        let values = vector[string::utf8(b"Alice")];
        
        create_profile(user, initial_hash, keys, values);
        
        // Update profile
        let new_hash = b"QmNewHash456";
        let new_keys = vector[string::utf8(b"name"), string::utf8(b"location")];
        let new_values = vector[string::utf8(b"Alice Smith"), string::utf8(b"San Francisco")];
        
        update_profile(user, new_hash, new_keys, new_values);
        
        // Verify update
        let user_address = signer::address_of(user);
        let (_, _, _, hash, active) = get_profile(user_address);
        assert!(hash == new_hash, 0);
        assert!(active, 1);
    }

    #[test(admin = @aptofi, user = @0x123)]
    #[expected_failure(abort_code = E_PROFILE_ALREADY_EXISTS)]
    public fun test_duplicate_profile_fails(admin: &signer, user: &signer) acquires GlobalRegistry {
        initialize(admin);
        timestamp::set_time_has_started_for_testing(&aptos_framework::account::create_signer_for_test(@0x1));
        
        let profile_hash = b"QmHash123";
        let keys = vector[];
        let values = vector[];
        
        // Create first profile
        create_profile(user, profile_hash, keys, values);
        
        // Try to create duplicate - should fail
        create_profile(user, profile_hash, keys, values);
    }
}
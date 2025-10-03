module aptofi::did_registry {
    use std::signer;
    use std::string::String;
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::table::{Self, Table};
    use aptos_framework::event;

    // Error codes
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_PROFILE_EXISTS: u64 = 3;
    const E_PROFILE_NOT_FOUND: u64 = 4;
    const E_NOT_AUTHORIZED: u64 = 5;
    const E_PROFILE_INACTIVE: u64 = 6;
    const E_INVALID_METADATA: u64 = 7;

    struct UserProfile has key {
        wallet_address: address,
        profile_hash: vector<u8>,
        metadata: Table<String, String>,
        created_at: u64,
        updated_at: u64,
        is_active: bool,
        reputation_score: u64,
    }

    struct GlobalRegistry has key {
        total_users: u64,
        admin: address,
        is_paused: bool,
    }

    #[event]
    struct ProfileCreated has drop, store {
        user_address: address,
        profile_hash: vector<u8>,
        timestamp: u64,
    }

    #[event]
    struct ProfileUpdated has drop, store {
        user_address: address,
        old_profile_hash: vector<u8>,
        new_profile_hash: vector<u8>,
        timestamp: u64,
    }

    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<GlobalRegistry>(@aptofi), E_ALREADY_INITIALIZED);
        
        move_to(admin, GlobalRegistry {
            total_users: 0,
            admin: admin_addr,
            is_paused: false,
        });
    }

    public entry fun create_profile(
        account: &signer,
        profile_hash: vector<u8>,
        metadata_keys: vector<String>,
        metadata_values: vector<String>
    ) acquires GlobalRegistry {
        let user_addr = signer::address_of(account);
        
        assert!(exists<GlobalRegistry>(@aptofi), E_NOT_INITIALIZED);
        let registry = borrow_global_mut<GlobalRegistry>(@aptofi);
        assert!(!registry.is_paused, E_NOT_AUTHORIZED);
        assert!(!exists<UserProfile>(user_addr), E_PROFILE_EXISTS);
        assert!(vector::length(&metadata_keys) == vector::length(&metadata_values), E_INVALID_METADATA);
        
        let metadata = table::new<String, String>();
        let i = 0;
        let keys_len = vector::length(&metadata_keys);
        
        while (i < keys_len) {
            let key = *vector::borrow(&metadata_keys, i);
            let value = *vector::borrow(&metadata_values, i);
            table::add(&mut metadata, key, value);
            i = i + 1;
        };
        
        let current_time = timestamp::now_seconds();
        
        let profile = UserProfile {
            wallet_address: user_addr,
            profile_hash,
            metadata,
            created_at: current_time,
            updated_at: current_time,
            is_active: true,
            reputation_score: 100,
        };
        
        move_to(account, profile);
        registry.total_users = registry.total_users + 1;
        
        event::emit(ProfileCreated {
            user_address: user_addr,
            profile_hash,
            timestamp: current_time,
        });
    }

    public fun update_reputation_score(
        user_address: address,
        new_score: u64
    ) acquires UserProfile {
        assert!(exists<UserProfile>(user_address), E_PROFILE_NOT_FOUND);
        
        let profile = borrow_global_mut<UserProfile>(user_address);
        profile.reputation_score = new_score;
        profile.updated_at = timestamp::now_seconds();
    }

    #[view]
    public fun get_profile(user_address: address): (address, vector<u8>, u64, u64, bool, u64) acquires UserProfile {
        assert!(exists<UserProfile>(user_address), E_PROFILE_NOT_FOUND);
        
        let profile = borrow_global<UserProfile>(user_address);
        (
            profile.wallet_address,
            profile.profile_hash,
            profile.created_at,
            profile.updated_at,
            profile.is_active,
            profile.reputation_score
        )
    }

    #[view]
    public fun profile_exists(user_address: address): bool {
        exists<UserProfile>(user_address)
    }

    #[view]
    public fun is_profile_active(user_address: address): bool acquires UserProfile {
        if (!exists<UserProfile>(user_address)) {
            return false
        };
        
        let profile = borrow_global<UserProfile>(user_address);
        profile.is_active
    }

    #[view]
    public fun get_total_users(): u64 acquires GlobalRegistry {
        assert!(exists<GlobalRegistry>(@aptofi), E_NOT_INITIALIZED);
        
        let registry = borrow_global<GlobalRegistry>(@aptofi);
        registry.total_users
    }

    public entry fun update_profile(
        account: &signer,
        new_profile_hash: vector<u8>,
        metadata_keys: vector<String>,
        metadata_values: vector<String>
    ) acquires UserProfile {
        let user_addr = signer::address_of(account);
        assert!(exists<UserProfile>(user_addr), E_PROFILE_NOT_FOUND);
        assert!(vector::length(&metadata_keys) == vector::length(&metadata_values), E_INVALID_METADATA);
        
        let profile = borrow_global_mut<UserProfile>(user_addr);
        assert!(profile.is_active, E_PROFILE_INACTIVE);
        
        let old_hash = profile.profile_hash;
        profile.profile_hash = new_profile_hash;
        profile.updated_at = timestamp::now_seconds();
        
        // Update metadata
        let i = 0;
        let keys_len = vector::length(&metadata_keys);
        
        while (i < keys_len) {
            let key = *vector::borrow(&metadata_keys, i);
            let value = *vector::borrow(&metadata_values, i);
            
            if (table::contains(&profile.metadata, key)) {
                table::remove(&mut profile.metadata, key);
            };
            table::add(&mut profile.metadata, key, value);
            i = i + 1;
        };
        
        event::emit(ProfileUpdated {
            user_address: user_addr,
            old_profile_hash: old_hash,
            new_profile_hash,
            timestamp: timestamp::now_seconds(),
        });
    }

    public entry fun deactivate_profile(account: &signer) acquires UserProfile {
        let user_addr = signer::address_of(account);
        assert!(exists<UserProfile>(user_addr), E_PROFILE_NOT_FOUND);
        
        let profile = borrow_global_mut<UserProfile>(user_addr);
        profile.is_active = false;
        profile.updated_at = timestamp::now_seconds();
    }

    public entry fun admin_deactivate_profile(
        admin: &signer,
        user_address: address
    ) acquires GlobalRegistry, UserProfile {
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global<GlobalRegistry>(@aptofi);
        assert!(admin_addr == registry.admin, E_NOT_AUTHORIZED);
        assert!(exists<UserProfile>(user_address), E_PROFILE_NOT_FOUND);
        
        let profile = borrow_global_mut<UserProfile>(user_address);
        profile.is_active = false;
        profile.updated_at = timestamp::now_seconds();
    }

    #[view]
    public fun get_metadata(user_address: address, key: String): String acquires UserProfile {
        assert!(exists<UserProfile>(user_address), E_PROFILE_NOT_FOUND);
        
        let profile = borrow_global<UserProfile>(user_address);
        assert!(table::contains(&profile.metadata, key), E_INVALID_METADATA);
        
        *table::borrow(&profile.metadata, key)
    }

    #[view]
    public fun get_reputation_score(user_address: address): u64 acquires UserProfile {
        assert!(exists<UserProfile>(user_address), E_PROFILE_NOT_FOUND);
        
        let profile = borrow_global<UserProfile>(user_address);
        profile.reputation_score
    }
}
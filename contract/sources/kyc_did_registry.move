/// Enhanced DID Registry with KYC Compliance for DeFi
/// Implements comprehensive identity verification and compliance tracking
module aptofi::kyc_did_registry {
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::table::{Self, Table};
    use aptos_framework::event;


    // Error codes
    /// Registry is already initialized
    const E_NOT_INITIALIZED: u64 = 1;
    /// Profile already exists for this address
    const E_PROFILE_EXISTS: u64 = 2;
    /// Profile not found for this address
    const E_PROFILE_NOT_FOUND: u64 = 3;
    /// Caller is not authorized for this operation
    const E_NOT_AUTHORIZED: u64 = 4;
    /// KYC verification is not complete
    const E_KYC_NOT_VERIFIED: u64 = 5;
    /// Invalid verification data provided
    const E_INVALID_VERIFICATION: u64 = 6;
    /// Compliance violation detected
    const E_COMPLIANCE_VIOLATION: u64 = 7;
    /// Document has expired
    const E_DOCUMENT_EXPIRED: u64 = 8;

    // KYC Verification Levels
    const KYC_LEVEL_NONE: u8 = 0;        // No verification
    const KYC_LEVEL_BASIC: u8 = 1;       // Basic identity verification
    const KYC_LEVEL_ENHANCED: u8 = 2;    // Enhanced due diligence
    const KYC_LEVEL_INSTITUTIONAL: u8 = 3; // Institutional verification

    // Document Types
    const DOC_TYPE_PASSPORT: u8 = 1;
    const DOC_TYPE_DRIVERS_LICENSE: u8 = 2;
    const DOC_TYPE_NATIONAL_ID: u8 = 3;
    const DOC_TYPE_PROOF_OF_ADDRESS: u8 = 4;
    const DOC_TYPE_BANK_STATEMENT: u8 = 5;
    const DOC_TYPE_BUSINESS_REGISTRATION: u8 = 6;

    // Compliance Status
    const COMPLIANCE_PENDING: u8 = 0;
    const COMPLIANCE_APPROVED: u8 = 1;
    const COMPLIANCE_REJECTED: u8 = 2;
    const COMPLIANCE_SUSPENDED: u8 = 3;
    const COMPLIANCE_EXPIRED: u8 = 4;

    /// KYC Document stored on-chain (hash only, actual document on IPFS)
    struct KYCDocument has store, copy, drop {
        document_type: u8,
        document_hash: vector<u8>,      // SHA-256 hash of document
        ipfs_hash: String,              // IPFS hash for document storage
        issued_date: u64,
        expiry_date: u64,
        issuing_authority: String,
        verification_status: u8,
        verified_by: address,           // KYC provider address
        verified_at: u64,
    }

    /// Biometric verification data
    struct BiometricData has store, copy, drop {
        face_hash: vector<u8>,          // Hash of facial recognition data
        fingerprint_hash: vector<u8>,   // Hash of fingerprint data
        voice_hash: vector<u8>,         // Hash of voice recognition data
        liveness_proof: vector<u8>,     // Proof of liveness verification
        verification_timestamp: u64,
    }

    /// Geographic and regulatory compliance
    struct ComplianceData has store, copy, drop {
        country_code: String,           // ISO country code
        jurisdiction: String,           // Legal jurisdiction
        tax_id: String,                 // Tax identification number (encrypted)
        sanctions_check: bool,          // Sanctions screening result
        pep_check: bool,                // Politically Exposed Person check
        aml_risk_score: u64,           // Anti-Money Laundering risk score (0-100)
        last_compliance_check: u64,
        compliance_expiry: u64,
    }

    /// Enhanced KYC Profile with full compliance data
    struct KYCProfile has key {
        wallet_address: address,
        profile_hash: vector<u8>,
        
        // Personal Information (encrypted hashes)
        full_name_hash: vector<u8>,
        date_of_birth_hash: vector<u8>,
        nationality_hash: vector<u8>,
        address_hash: vector<u8>,
        
        // KYC Level and Status
        kyc_level: u8,
        verification_status: u8,
        compliance_status: u8,
        
        // Documents and Verification
        documents: vector<KYCDocument>,
        biometric_data: BiometricData,
        compliance_data: ComplianceData,
        
        // Metadata and Timestamps
        metadata: Table<String, String>,
        created_at: u64,
        updated_at: u64,
        verified_at: u64,
        expires_at: u64,
        
        // Verification Trail
        verification_history: vector<VerificationEvent>,
        
        // Status flags
        is_active: bool,
        is_suspended: bool,
        requires_renewal: bool,
    }

    /// Verification event for audit trail
    struct VerificationEvent has store, copy, drop {
        event_type: u8,                 // 1: Created, 2: Verified, 3: Updated, 4: Suspended
        verifier_address: address,
        verification_level: u8,
        timestamp: u64,
        notes: String,
    }

    /// KYC Provider registration
    struct KYCProvider has key {
        provider_address: address,
        provider_name: String,
        license_number: String,
        authorized_levels: vector<u8>,  // KYC levels this provider can verify
        is_active: bool,
        verification_count: u64,
        success_rate: u64,              // Success rate in basis points
        registered_at: u64,
    }

    /// Global KYC Registry
    struct KYCRegistry has key {
        total_profiles: u64,
        verified_profiles: u64,
        kyc_providers: Table<address, bool>,
        compliance_rules: Table<String, String>,
        admin: address,
        is_paused: bool,
    }

    // Events
    #[event]
    struct KYCProfileCreated has drop, store {
        user_address: address,
        kyc_level: u8,
        timestamp: u64,
    }

    #[event]
    struct KYCVerificationCompleted has drop, store {
        user_address: address,
        verifier: address,
        old_level: u8,
        new_level: u8,
        verification_status: u8,
        timestamp: u64,
    }

    #[event]
    struct ComplianceStatusChanged has drop, store {
        user_address: address,
        old_status: u8,
        new_status: u8,
        reason: String,
        timestamp: u64,
    }

    #[event]
    struct DocumentSubmitted has drop, store {
        user_address: address,
        document_type: u8,
        document_hash: vector<u8>,
        timestamp: u64,
    }

    /// Initialize the KYC DID Registry
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<KYCRegistry>(@aptofi), E_NOT_INITIALIZED);
        
        move_to(admin, KYCRegistry {
            total_profiles: 0,
            verified_profiles: 0,
            kyc_providers: table::new(),
            compliance_rules: table::new(),
            admin: admin_addr,
            is_paused: false,
        });
    }

    /// Register a KYC provider
    public entry fun register_kyc_provider(
        admin: &signer,
        provider_address: address,
        _provider_name: String,
        _license_number: String,
        _authorized_levels: vector<u8>
    ) acquires KYCRegistry {
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<KYCRegistry>(@aptofi);
        assert!(admin_addr == registry.admin, E_NOT_AUTHORIZED);

        // Store provider info in the registry instead of creating a separate resource
        // In production, this would be handled differently with proper provider onboarding
        table::add(&mut registry.kyc_providers, provider_address, true);
    }

    /// Create KYC profile with initial verification level
    public entry fun create_kyc_profile(
        account: &signer,
        profile_hash: vector<u8>,
        full_name_hash: vector<u8>,
        date_of_birth_hash: vector<u8>,
        nationality_hash: vector<u8>,
        address_hash: vector<u8>,
        country_code: String,
        metadata_keys: vector<String>,
        metadata_values: vector<String>
    ) acquires KYCRegistry {
        let user_addr = signer::address_of(account);
        assert!(!exists<KYCProfile>(user_addr), E_PROFILE_EXISTS);
        
        let registry = borrow_global_mut<KYCRegistry>(@aptofi);
        assert!(!registry.is_paused, E_NOT_AUTHORIZED);

        // Create metadata table
        let metadata = table::new<String, String>();
        let i = 0;
        while (i < vector::length(&metadata_keys)) {
            table::add(&mut metadata, 
                *vector::borrow(&metadata_keys, i),
                *vector::borrow(&metadata_values, i)
            );
            i = i + 1;
        };

        let current_time = timestamp::now_seconds();

        // Initialize empty biometric data
        let biometric_data = BiometricData {
            face_hash: vector::empty(),
            fingerprint_hash: vector::empty(),
            voice_hash: vector::empty(),
            liveness_proof: vector::empty(),
            verification_timestamp: 0,
        };

        // Initialize compliance data
        let compliance_data = ComplianceData {
            country_code,
            jurisdiction: string::utf8(b""),
            tax_id: string::utf8(b""),
            sanctions_check: false,
            pep_check: false,
            aml_risk_score: 50, // Medium risk initially
            last_compliance_check: current_time,
            compliance_expiry: current_time + (365 * 24 * 3600), // 1 year
        };

        // Create initial verification event
        let verification_history = vector::empty<VerificationEvent>();
        vector::push_back(&mut verification_history, VerificationEvent {
            event_type: 1, // Created
            verifier_address: user_addr,
            verification_level: KYC_LEVEL_NONE,
            timestamp: current_time,
            notes: string::utf8(b"Profile created"),
        });

        let profile = KYCProfile {
            wallet_address: user_addr,
            profile_hash,
            full_name_hash,
            date_of_birth_hash,
            nationality_hash,
            address_hash,
            kyc_level: KYC_LEVEL_NONE,
            verification_status: COMPLIANCE_PENDING,
            compliance_status: COMPLIANCE_PENDING,
            documents: vector::empty(),
            biometric_data,
            compliance_data,
            metadata,
            created_at: current_time,
            updated_at: current_time,
            verified_at: 0,
            expires_at: current_time + (365 * 24 * 3600), // 1 year
            verification_history,
            is_active: true,
            is_suspended: false,
            requires_renewal: false,
        };

        move_to(account, profile);
        registry.total_profiles = registry.total_profiles + 1;

        event::emit(KYCProfileCreated {
            user_address: user_addr,
            kyc_level: KYC_LEVEL_NONE,
            timestamp: current_time,
        });
    }

    /// Submit KYC document for verification
    public entry fun submit_kyc_document(
        account: &signer,
        document_type: u8,
        document_hash: vector<u8>,
        ipfs_hash: String,
        issued_date: u64,
        expiry_date: u64,
        issuing_authority: String
    ) acquires KYCProfile {
        let user_addr = signer::address_of(account);
        assert!(exists<KYCProfile>(user_addr), E_PROFILE_NOT_FOUND);

        let profile = borrow_global_mut<KYCProfile>(user_addr);
        assert!(profile.is_active && !profile.is_suspended, E_NOT_AUTHORIZED);

        let document = KYCDocument {
            document_type,
            document_hash,
            ipfs_hash,
            issued_date,
            expiry_date,
            issuing_authority,
            verification_status: COMPLIANCE_PENDING,
            verified_by: @0x0,
            verified_at: 0,
        };

        vector::push_back(&mut profile.documents, document);
        profile.updated_at = timestamp::now_seconds();

        event::emit(DocumentSubmitted {
            user_address: user_addr,
            document_type,
            document_hash,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Verify KYC profile (KYC provider only)
    public entry fun verify_kyc_profile(
        provider: &signer,
        user_address: address,
        new_kyc_level: u8,
        verification_status: u8,
        aml_risk_score: u64,
        sanctions_check: bool,
        pep_check: bool,
        notes: String
    ) acquires KYCProfile, KYCRegistry {
        let provider_addr = signer::address_of(provider);
        let registry = borrow_global<KYCRegistry>(@aptofi);
        assert!(table::contains(&registry.kyc_providers, provider_addr), E_NOT_AUTHORIZED);
        assert!(exists<KYCProfile>(user_address), E_PROFILE_NOT_FOUND);

        let profile = borrow_global_mut<KYCProfile>(user_address);
        let old_level = profile.kyc_level;
        let current_time = timestamp::now_seconds();

        // Update profile verification
        profile.kyc_level = new_kyc_level;
        profile.verification_status = verification_status;
        profile.verified_at = current_time;
        profile.updated_at = current_time;

        // Update compliance data
        profile.compliance_data.aml_risk_score = aml_risk_score;
        profile.compliance_data.sanctions_check = sanctions_check;
        profile.compliance_data.pep_check = pep_check;
        profile.compliance_data.last_compliance_check = current_time;

        // Set compliance status based on verification
        profile.compliance_status = if (verification_status == COMPLIANCE_APPROVED && 
                                       !sanctions_check && !pep_check && 
                                       aml_risk_score <= 30) {
            COMPLIANCE_APPROVED
        } else if (sanctions_check || pep_check || aml_risk_score >= 70) {
            COMPLIANCE_REJECTED
        } else {
            COMPLIANCE_PENDING
        };

        // Add verification event
        vector::push_back(&mut profile.verification_history, VerificationEvent {
            event_type: 2, // Verified
            verifier_address: provider_addr,
            verification_level: new_kyc_level,
            timestamp: current_time,
            notes,
        });

        // Provider stats would be updated in a production system

        // Update registry stats
        if (old_level == KYC_LEVEL_NONE && new_kyc_level > KYC_LEVEL_NONE) {
            let registry = borrow_global_mut<KYCRegistry>(@aptofi);
            registry.verified_profiles = registry.verified_profiles + 1;
        };

        event::emit(KYCVerificationCompleted {
            user_address,
            verifier: provider_addr,
            old_level,
            new_level: new_kyc_level,
            verification_status,
            timestamp: current_time,
        });
    }

    /// Check if user meets KYC requirements for specific DeFi operation
    public fun check_kyc_compliance(
        user_address: address,
        required_level: u8,
        operation_type: String
    ): bool acquires KYCProfile {
        if (!exists<KYCProfile>(user_address)) {
            return false
        };

        let profile = borrow_global<KYCProfile>(user_address);
        
        // Check basic requirements
        if (!profile.is_active || profile.is_suspended) {
            return false
        };

        // Check KYC level
        if (profile.kyc_level < required_level) {
            return false
        };

        // Check compliance status
        if (profile.compliance_status != COMPLIANCE_APPROVED) {
            return false
        };

        // Check expiry
        if (profile.expires_at < timestamp::now_seconds()) {
            return false
        };

        // Additional checks based on operation type
        if (operation_type == string::utf8(b"high_value_transfer") && 
            profile.compliance_data.aml_risk_score > 20) {
            return false
        };

        if (operation_type == string::utf8(b"institutional_trading") && 
            profile.kyc_level < KYC_LEVEL_INSTITUTIONAL) {
            return false
        };

        true
    }

    // View functions
    #[view]
    public fun get_kyc_profile(user_address: address): (u8, u8, u8, u64, u64, bool, bool) acquires KYCProfile {
        assert!(exists<KYCProfile>(user_address), E_PROFILE_NOT_FOUND);
        
        let profile = borrow_global<KYCProfile>(user_address);
        (
            profile.kyc_level,
            profile.verification_status,
            profile.compliance_status,
            profile.verified_at,
            profile.expires_at,
            profile.is_active,
            profile.is_suspended
        )
    }

    #[view]
    public fun get_compliance_data(user_address: address): (String, u64, bool, bool, u64) acquires KYCProfile {
        assert!(exists<KYCProfile>(user_address), E_PROFILE_NOT_FOUND);
        
        let profile = borrow_global<KYCProfile>(user_address);
        (
            profile.compliance_data.country_code,
            profile.compliance_data.aml_risk_score,
            profile.compliance_data.sanctions_check,
            profile.compliance_data.pep_check,
            profile.compliance_data.compliance_expiry
        )
    }

    #[view]
    public fun is_kyc_compliant(user_address: address, required_level: u8): bool acquires KYCProfile {
        check_kyc_compliance(user_address, required_level, string::utf8(b"general"))
    }

    #[view]
    public fun get_document_count(user_address: address): u64 acquires KYCProfile {
        if (!exists<KYCProfile>(user_address)) {
            return 0
        };
        
        let profile = borrow_global<KYCProfile>(user_address);
        vector::length(&profile.documents)
    }

    #[view]
    public fun get_registry_stats(): (u64, u64) acquires KYCRegistry {
        let registry = borrow_global<KYCRegistry>(@aptofi);
        (registry.total_profiles, registry.verified_profiles)
    }
}
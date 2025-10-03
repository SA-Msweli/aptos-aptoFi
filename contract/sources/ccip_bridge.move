/// Chainlink CCIP Bridge for AptoFi
/// Enables cross-chain asset transfers and message passing
module aptofi::ccip_bridge {
    use std::signer;
    use std::vector;
    use std::string::{Self, String};
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_framework::table::{Self, Table};
    use aptofi::did_registry;
    use aptofi::reputation_system;

    // Error codes
    /// User is not authorized to perform this action
    const E_NOT_AUTHORIZED: u64 = 1;
    /// Invalid or unsupported destination chain
    const E_INVALID_CHAIN: u64 = 2;
    /// Insufficient balance for the operation
    const E_INSUFFICIENT_BALANCE: u64 = 3;
    /// Transfer not found in records
    const E_TRANSFER_NOT_FOUND: u64 = 4;
    /// Transfer has already been executed
    const E_TRANSFER_ALREADY_EXECUTED: u64 = 5;
    /// Invalid message format or content
    const E_INVALID_MESSAGE: u64 = 6;
    /// Bridge is currently paused
    const E_BRIDGE_PAUSED: u64 = 7;
    /// Token is not supported for cross-chain transfers
    const E_UNSUPPORTED_TOKEN: u64 = 8;

    // Supported chains (Chain selectors for CCIP)
    const ETHEREUM_CHAIN_SELECTOR: u64 = 5009297550715157269;
    const POLYGON_CHAIN_SELECTOR: u64 = 4051577828743386545;
    const AVALANCHE_CHAIN_SELECTOR: u64 = 6433500567565415381;
    const ARBITRUM_CHAIN_SELECTOR: u64 = 4949039107694359620;
    const OPTIMISM_CHAIN_SELECTOR: u64 = 3734403246176062136;
    const BASE_CHAIN_SELECTOR: u64 = 5790810961207155433;

    /// Cross-chain transfer request
    struct CrossChainTransfer has store, copy, drop {
        id: u64,
        sender: address,
        recipient: String, // Address on destination chain
        token: String,
        amount: u64,
        destination_chain: u64,
        fee: u64,
        status: u8, // 0: Pending, 1: Sent, 2: Confirmed, 3: Failed
        created_at: u64,
        executed_at: u64,
        ccip_message_id: vector<u8>,
    }

    /// Cross-chain message for DeFi operations
    struct CrossChainMessage has store, copy, drop {
        id: u64,
        message_type: u8, // 1: Transfer, 2: Swap, 3: Lend, 4: Vault
        sender: address,
        destination_chain: u64,
        payload: vector<u8>,
        gas_limit: u64,
        fee: u64,
        status: u8,
        created_at: u64,
        ccip_message_id: vector<u8>,
    }

    /// Supported token configuration
    struct SupportedToken has store {
        symbol: String,
        decimals: u8,
        is_native: bool,
        pool_address: String, // CCIP token pool address
        min_transfer: u64,
        max_transfer: u64,
        transfer_fee_bps: u64, // Fee in basis points
    }

    /// Chain configuration
    struct ChainConfig has store {
        chain_selector: u64,
        name: String,
        is_active: bool,
        router_address: String,
        supported_tokens: vector<String>,
        base_gas_fee: u64,
        gas_price_multiplier: u64,
    }

    /// CCIP Bridge registry
    struct CCIPBridge has key {
        admin: address,
        is_paused: bool,
        next_transfer_id: u64,
        next_message_id: u64,
        supported_chains: Table<u64, ChainConfig>,
        supported_tokens: Table<String, SupportedToken>,
        pending_transfers: Table<u64, CrossChainTransfer>,
        completed_transfers: Table<u64, CrossChainTransfer>,
        pending_messages: Table<u64, CrossChainMessage>,
        total_volume: u64,
        total_fees_collected: u64,
    }

    /// User's cross-chain activity
    struct UserCCIPActivity has key {
        user: address,
        transfers: vector<u64>, // Transfer IDs
        messages: vector<u64>,  // Message IDs
        total_sent: u64,
        total_received: u64,
        reputation_boost: u64, // Cross-chain activity reputation bonus
    }

    // Events
    #[event]
    struct CrossChainTransferInitiated has drop, store {
        transfer_id: u64,
        sender: address,
        recipient: String,
        token: String,
        amount: u64,
        destination_chain: u64,
        fee: u64,
        timestamp: u64,
    }

    #[event]
    struct CrossChainTransferCompleted has drop, store {
        transfer_id: u64,
        ccip_message_id: vector<u8>,
        status: u8,
        timestamp: u64,
    }

    #[event]
    struct CrossChainMessageSent has drop, store {
        message_id: u64,
        message_type: u8,
        sender: address,
        destination_chain: u64,
        fee: u64,
        timestamp: u64,
    }

    #[event]
    struct TokenBridged has drop, store {
        user: address,
        token: String,
        amount: u64,
        from_chain: String,
        to_chain: String,
        timestamp: u64,
    }

    /// Initialize CCIP Bridge
    public entry fun initialize(admin: &signer) acquires CCIPBridge {
        let admin_addr = signer::address_of(admin);
        
        move_to(admin, CCIPBridge {
            admin: admin_addr,
            is_paused: false,
            next_transfer_id: 1,
            next_message_id: 1,
            supported_chains: table::new<u64, ChainConfig>(),
            supported_tokens: table::new<String, SupportedToken>(),
            pending_transfers: table::new<u64, CrossChainTransfer>(),
            completed_transfers: table::new<u64, CrossChainTransfer>(),
            pending_messages: table::new<u64, CrossChainMessage>(),
            total_volume: 0,
            total_fees_collected: 0,
        });

        // Initialize default supported chains
        initialize_default_chains(admin_addr);
        initialize_default_tokens(admin_addr);
    }

    /// Initialize default supported chains
    fun initialize_default_chains(_admin_addr: address) acquires CCIPBridge {
        let bridge = borrow_global_mut<CCIPBridge>(@aptofi);

        // Ethereum
        bridge.supported_chains.add(ETHEREUM_CHAIN_SELECTOR, ChainConfig {
            chain_selector: ETHEREUM_CHAIN_SELECTOR,
            name: string::utf8(b"Ethereum"),
            is_active: true,
            router_address: string::utf8(b"0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D"),
            supported_tokens: vector[
                string::utf8(b"ETH"),
                string::utf8(b"USDC"),
                string::utf8(b"USDT"),
                string::utf8(b"WBTC")
            ],
            base_gas_fee: 100000,
            gas_price_multiplier: 120, // 20% buffer
        });

        // Polygon
        bridge.supported_chains.add(POLYGON_CHAIN_SELECTOR, ChainConfig {
            chain_selector: POLYGON_CHAIN_SELECTOR,
            name: string::utf8(b"Polygon"),
            is_active: true,
            router_address: string::utf8(b"0x849c5ED5a80F5B408Dd4969b78c2C8fdf0565Bfe"),
            supported_tokens: vector[
                string::utf8(b"MATIC"),
                string::utf8(b"USDC"),
                string::utf8(b"USDT")
            ],
            base_gas_fee: 50000,
            gas_price_multiplier: 110,
        });

        // Avalanche
        bridge.supported_chains.add(AVALANCHE_CHAIN_SELECTOR, ChainConfig {
            chain_selector: AVALANCHE_CHAIN_SELECTOR,
            name: string::utf8(b"Avalanche"),
            is_active: true,
            router_address: string::utf8(b"0xF4c7E640EdA248ef95972845a62bdC74237805dB"),
            supported_tokens: vector[
                string::utf8(b"AVAX"),
                string::utf8(b"USDC"),
                string::utf8(b"USDT")
            ],
            base_gas_fee: 75000,
            gas_price_multiplier: 115,
        });

        // Arbitrum
        bridge.supported_chains.add(ARBITRUM_CHAIN_SELECTOR, ChainConfig {
            chain_selector: ARBITRUM_CHAIN_SELECTOR,
            name: string::utf8(b"Arbitrum"),
            is_active: true,
            router_address: string::utf8(b"0x141fa059441E0ca23ce184B6A78bafD2A517DdE8"),
            supported_tokens: vector[
                string::utf8(b"ETH"),
                string::utf8(b"USDC"),
                string::utf8(b"ARB")
            ],
            base_gas_fee: 80000,
            gas_price_multiplier: 110,
        });
    }

    /// Initialize default supported tokens
    fun initialize_default_tokens(_admin_addr: address) acquires CCIPBridge {
        let bridge = borrow_global_mut<CCIPBridge>(@aptofi);

        // USDC - Most liquid cross-chain asset
        bridge.supported_tokens.add(string::utf8(b"USDC"), SupportedToken {
            symbol: string::utf8(b"USDC"),
            decimals: 6,
            is_native: false,
            pool_address: string::utf8(b"0xA0b86a33E6417c8f2c8B2B5B8b5B8b5B8b5B8b5B"),
            min_transfer: 1000000, // $1 minimum
            max_transfer: 1000000000000, // $1M maximum
            transfer_fee_bps: 10, // 0.1% fee
        });

        // ETH
        bridge.supported_tokens.add(string::utf8(b"ETH"), SupportedToken {
            symbol: string::utf8(b"ETH"),
            decimals: 18,
            is_native: true,
            pool_address: string::utf8(b"0xB0b86a33E6417c8f2c8B2B5B8b5B8b5B8b5B8b5B"),
            min_transfer: 1000000000000000, // 0.001 ETH minimum
            max_transfer: 100000000000000000, // 0.1 ETH maximum (adjusted for u64 limit)
            transfer_fee_bps: 25, // 0.25% fee
        });

        // WBTC
        bridge.supported_tokens.add(string::utf8(b"WBTC"), SupportedToken {
            symbol: string::utf8(b"WBTC"),
            decimals: 8,
            is_native: false,
            pool_address: string::utf8(b"0xC0c86a33E6417c8f2c8B2B5B8b5B8b5B8b5B8b5B"),
            min_transfer: 10000, // 0.0001 BTC minimum
            max_transfer: 1000000000, // 10 BTC maximum
            transfer_fee_bps: 30, // 0.3% fee
        });
    }

    /// Initiate cross-chain token transfer
    public entry fun initiate_cross_chain_transfer<CoinType>(
        user: &signer,
        recipient: String,
        amount: u64,
        destination_chain: u64,
        token_symbol: String
    ) acquires CCIPBridge, UserCCIPActivity {
        let user_addr = signer::address_of(user);
        
        // Verify user has DID profile
        assert!(did_registry::profile_exists(user_addr), E_NOT_AUTHORIZED);
        assert!(did_registry::is_profile_active(user_addr), E_NOT_AUTHORIZED);

        // First, validate and calculate fees without mutable borrow
        let (transfer_fee, gas_fee, transfer_id) = {
            let bridge = borrow_global<CCIPBridge>(@aptofi);
            assert!(!bridge.is_paused, E_BRIDGE_PAUSED);

            // Validate destination chain
            assert!(bridge.supported_chains.contains(destination_chain), E_INVALID_CHAIN);
            let chain_config = bridge.supported_chains.borrow(destination_chain);
            assert!(chain_config.is_active, E_INVALID_CHAIN);

            // Validate token
            assert!(bridge.supported_tokens.contains(token_symbol), E_UNSUPPORTED_TOKEN);
            let token_config = bridge.supported_tokens.borrow(token_symbol);
            
            // Validate amount
            assert!(amount >= token_config.min_transfer, E_INSUFFICIENT_BALANCE);
            assert!(amount <= token_config.max_transfer, E_INSUFFICIENT_BALANCE);

            // Calculate fees
            let transfer_fee = (amount * token_config.transfer_fee_bps) / 10000;
            let base_fee = chain_config.base_gas_fee;
            let amount_fee = (amount / 1000000) * 1000;
            let gas_fee = (base_fee + amount_fee) * chain_config.gas_price_multiplier / 100;
            
            (transfer_fee, gas_fee, bridge.next_transfer_id)
        };

        let total_fee = transfer_fee + gas_fee;

        // Now mutably borrow to update state
        let bridge = borrow_global_mut<CCIPBridge>(@aptofi);
        bridge.next_transfer_id += 1;

        // Create transfer record
        let transfer = CrossChainTransfer {
            id: transfer_id,
            sender: user_addr,
            recipient,
            token: token_symbol,
            amount,
            destination_chain,
            fee: total_fee,
            status: 0, // Pending
            created_at: timestamp::now_seconds(),
            executed_at: 0,
            ccip_message_id: vector::empty<u8>(),
        };

        bridge.pending_transfers.add(transfer_id, transfer);

        // Update user activity
        update_user_ccip_activity(user_addr, transfer_id, amount, true);

        // Update bridge statistics
        bridge.total_volume += amount;
        bridge.total_fees_collected += total_fee;

        // In a real implementation, would lock tokens and send CCIP message
        // For now, we'll simulate the process

        // Emit event
        event::emit(CrossChainTransferInitiated {
            transfer_id,
            sender: user_addr,
            recipient,
            token: token_symbol,
            amount,
            destination_chain,
            fee: total_fee,
            timestamp: timestamp::now_seconds(),
        });

        // Update reputation for cross-chain activity
        if (reputation_system::reputation_exists(user_addr)) {
            reputation_system::update_transaction_score(user_addr, amount, 1);
        };
    }

    /// Send cross-chain DeFi message (swap, lend, etc.)
    public entry fun send_cross_chain_message(
        user: &signer,
        message_type: u8,
        destination_chain: u64,
        payload: vector<u8>,
        gas_limit: u64
    ) acquires CCIPBridge, UserCCIPActivity {
        let user_addr = signer::address_of(user);
        
        // Verify user has DID profile
        assert!(did_registry::profile_exists(user_addr), E_NOT_AUTHORIZED);

        // First, validate and calculate fees without mutable borrow
        let (message_fee, message_id) = {
            let bridge = borrow_global<CCIPBridge>(@aptofi);
            assert!(!bridge.is_paused, E_BRIDGE_PAUSED);

            // Validate destination chain
            assert!(bridge.supported_chains.contains(destination_chain), E_INVALID_CHAIN);

            // Calculate message fee
            let chain_config = bridge.supported_chains.borrow(destination_chain);
            let gas_cost = (gas_limit * chain_config.gas_price_multiplier) / 100;
            let data_cost = payload.length() * 16;
            let message_fee = gas_cost + data_cost;
            
            (message_fee, bridge.next_message_id)
        };

        // Now mutably borrow to update state
        let bridge = borrow_global_mut<CCIPBridge>(@aptofi);
        bridge.next_message_id += 1;

        // Create message record
        let message = CrossChainMessage {
            id: message_id,
            message_type,
            sender: user_addr,
            destination_chain,
            payload,
            gas_limit,
            fee: message_fee,
            status: 0, // Pending
            created_at: timestamp::now_seconds(),
            ccip_message_id: vector::empty<u8>(),
        };

        bridge.pending_messages.add(message_id, message);

        // Update user activity
        if (!exists<UserCCIPActivity>(user_addr)) {
            move_to(user, UserCCIPActivity {
                user: user_addr,
                transfers: vector::empty<u64>(),
                messages: vector::empty<u64>(),
                total_sent: 0,
                total_received: 0,
                reputation_boost: 0,
            });
        };

        let user_activity = borrow_global_mut<UserCCIPActivity>(user_addr);
        user_activity.messages.push_back(message_id);

        // Emit event
        event::emit(CrossChainMessageSent {
            message_id,
            message_type,
            sender: user_addr,
            destination_chain,
            fee: message_fee,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Execute cross-chain swap (message type 2)
    public entry fun initiate_cross_chain_swap(
        user: &signer,
        token_in: String,
        token_out: String,
        amount_in: u64,
        min_amount_out: u64,
        destination_chain: u64,
        recipient: String
    ) acquires CCIPBridge, UserCCIPActivity {
        // Encode swap parameters
        let payload = encode_swap_payload(token_in, token_out, amount_in, min_amount_out, recipient);
        
        // Send cross-chain message
        send_cross_chain_message(user, 2, destination_chain, payload, 500000); // 500k gas limit
    }

    /// Execute cross-chain lending (message type 3)
    public entry fun initiate_cross_chain_lending(
        user: &signer,
        collateral_token: String,
        collateral_amount: u64,
        borrow_token: String,
        borrow_amount: u64,
        destination_chain: u64
    ) acquires CCIPBridge, UserCCIPActivity {
        // Encode lending parameters
        let payload = encode_lending_payload(
            collateral_token, 
            collateral_amount, 
            borrow_token, 
            borrow_amount
        );
        
        // Send cross-chain message
        send_cross_chain_message(user, 3, destination_chain, payload, 800000); // 800k gas limit
    }

    /// Execute cross-chain vault deposit (message type 4)
    public entry fun initiate_cross_chain_vault_deposit(
        user: &signer,
        vault_token: String,
        deposit_amount: u64,
        destination_chain: u64,
        vault_address: String
    ) acquires CCIPBridge, UserCCIPActivity {
        // Encode vault parameters
        let payload = encode_vault_payload(vault_token, deposit_amount, vault_address);
        
        // Send cross-chain message
        send_cross_chain_message(user, 4, destination_chain, payload, 600000); // 600k gas limit
    }

    /// Calculate cross-chain gas fee
    fun calculate_cross_chain_gas_fee(destination_chain: u64, amount: u64): u64 acquires CCIPBridge {
        let bridge = borrow_global<CCIPBridge>(@aptofi);
        let chain_config = bridge.supported_chains.borrow(destination_chain);
        
        // Base fee + amount-based fee
        let base_fee = chain_config.base_gas_fee;
        let amount_fee = (amount / 1000000) * 1000; // 1000 units per million
        
        (base_fee + amount_fee) * chain_config.gas_price_multiplier / 100
    }

    /// Calculate message fee
    fun calculate_message_fee(destination_chain: u64, gas_limit: u64, payload_size: u64): u64 acquires CCIPBridge {
        let bridge = borrow_global<CCIPBridge>(@aptofi);
        let chain_config = bridge.supported_chains.borrow(destination_chain);
        
        // Gas cost + data cost
        let gas_cost = (gas_limit * chain_config.gas_price_multiplier) / 100;
        let data_cost = payload_size * 16; // 16 units per byte
        
        gas_cost + data_cost
    }

    /// Update user CCIP activity and reputation
    fun update_user_ccip_activity(
        user_addr: address, 
        transfer_id: u64, 
        amount: u64, 
        is_outgoing: bool
    ) acquires UserCCIPActivity {
        // Note: UserCCIPActivity should be initialized when user creates their first transfer

        let user_activity = borrow_global_mut<UserCCIPActivity>(user_addr);
        user_activity.transfers.push_back(transfer_id);

        if (is_outgoing) {
            user_activity.total_sent += amount;
        } else {
            user_activity.total_received += amount;
        };

        // Calculate reputation boost for cross-chain activity
        let total_volume = user_activity.total_sent + user_activity.total_received;
        user_activity.reputation_boost = (total_volume / 1000000) * 10; // 10 points per million units
    }

    /// Encode swap payload for cross-chain message
    fun encode_swap_payload(
        token_in: String,
        token_out: String,
        amount_in: u64,
        min_amount_out: u64,
        recipient: String
    ): vector<u8> {
        // Simplified encoding - in practice would use proper serialization
        let payload = vector::empty<u8>();
        payload.append(*token_in.bytes());
        payload.append(*token_out.bytes());
        payload.append(encode_u64(amount_in));
        payload.append(encode_u64(min_amount_out));
        payload.append(*recipient.bytes());
        payload
    }

    /// Encode lending payload
    fun encode_lending_payload(
        collateral_token: String,
        collateral_amount: u64,
        borrow_token: String,
        borrow_amount: u64
    ): vector<u8> {
        let payload = vector::empty<u8>();
        payload.append(*collateral_token.bytes());
        payload.append(
          encode_u64(collateral_amount));
        payload.append(*borrow_token.bytes());
        payload.append(encode_u64(borrow_amount));
        payload
    }

    /// Encode vault payload
    fun encode_vault_payload(
        vault_token: String,
        deposit_amount: u64,
        vault_address: String
    ): vector<u8> {
        let payload = vector::empty<u8>();
        payload.append(*vault_token.bytes());
        payload.append(encode_u64(deposit_amount));
        payload.append(*vault_address.bytes());
        payload
    }

    /// Encode u64 to bytes
    fun encode_u64(value: u64): vector<u8> {
        let bytes = vector::empty<u8>();
        let i = 0;
        while (i < 8) {
            bytes.push_back(((value >> (i * 8)) & 0xFF) as u8);
            i += 1;
        };
        bytes
    }

    // View functions
    #[view]
    public fun get_supported_chains(): vector<u64> acquires CCIPBridge {
        let _bridge = borrow_global<CCIPBridge>(@aptofi);
        let chains = vector::empty<u64>();
        
        // In a real implementation, would iterate through table keys
        chains.push_back(ETHEREUM_CHAIN_SELECTOR);
        chains.push_back(POLYGON_CHAIN_SELECTOR);
        chains.push_back(AVALANCHE_CHAIN_SELECTOR);
        chains.push_back(ARBITRUM_CHAIN_SELECTOR);
        
        chains
    }

    #[view]
    public fun get_transfer_status(transfer_id: u64): (u8, u64) acquires CCIPBridge {
        let bridge = borrow_global<CCIPBridge>(@aptofi);
        
        if (bridge.pending_transfers.contains(transfer_id)) {
            let transfer = bridge.pending_transfers.borrow(transfer_id);
            (transfer.status, transfer.created_at)
        } else if (bridge.completed_transfers.contains(transfer_id)) {
            let transfer = bridge.completed_transfers.borrow(transfer_id);
            (transfer.status, transfer.executed_at)
        } else {
            (255, 0) // Not found
        }
    }

    #[view]
    public fun get_user_ccip_stats(user_addr: address): (u64, u64, u64, u64) acquires UserCCIPActivity {
        if (!exists<UserCCIPActivity>(user_addr)) {
            return (0, 0, 0, 0)
        };

        let activity = borrow_global<UserCCIPActivity>(user_addr);
        (
            activity.transfers.length(),
            activity.messages.length(),
            activity.total_sent,
            activity.total_received
        )
    }

    #[view]
    public fun estimate_cross_chain_fee(
        destination_chain: u64,
        token_symbol: String,
        amount: u64
    ): u64 acquires CCIPBridge {
        let bridge = borrow_global<CCIPBridge>(@aptofi);
        
        if (!bridge.supported_tokens.contains(token_symbol) ||
            !bridge.supported_chains.contains(destination_chain)) {
            return 0
        };

        let token_config = bridge.supported_tokens.borrow(token_symbol);
        let transfer_fee = (amount * token_config.transfer_fee_bps) / 10000;
        let gas_fee = calculate_cross_chain_gas_fee(destination_chain, amount);
        
        transfer_fee + gas_fee
    }

    /// Admin functions
    public entry fun add_supported_chain(
        admin: &signer,
        chain_selector: u64,
        name: String,
        router_address: String
    ) acquires CCIPBridge {
        let admin_addr = signer::address_of(admin);
        let bridge = borrow_global_mut<CCIPBridge>(@aptofi);
        assert!(admin_addr == bridge.admin, E_NOT_AUTHORIZED);

        let chain_config = ChainConfig {
            chain_selector,
            name,
            is_active: true,
            router_address,
            supported_tokens: vector::empty<String>(),
            base_gas_fee: 100000,
            gas_price_multiplier: 120,
        };

        bridge.supported_chains.add(chain_selector, chain_config);
    }

    public entry fun pause_bridge(admin: &signer) acquires CCIPBridge {
        let admin_addr = signer::address_of(admin);
        let bridge = borrow_global_mut<CCIPBridge>(@aptofi);
        assert!(admin_addr == bridge.admin, E_NOT_AUTHORIZED);
        
        bridge.is_paused = true;
    }



    // Test functions
    #[test_only]
    public fun init_for_test(admin: &signer) {
        initialize(admin);
    }
}
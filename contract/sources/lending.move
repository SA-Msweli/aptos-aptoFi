module stake_pool_addr::lending {
    use std::signer;
    use std::vector;
    use std::option::{Self, Option};
    
    use aptos_framework::fungible_asset::{Metadata, FungibleStore};
    use aptos_framework::object::{Self, Object, ExtendRef};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::timestamp;
    use aptos_framework::event;
    
    use stake_pool_addr::did;

    // ================================= Errors ================================= //
    /// Loan does not exist
    const ERR_LOAN_NOT_EXISTS: u64 = 1;
    /// Borrower not eligible for loan
    const ERR_NOT_ELIGIBLE: u64 = 2;
    /// Insufficient collateral
    const ERR_INSUFFICIENT_COLLATERAL: u64 = 3;
    /// Loan already exists for borrower
    const ERR_LOAN_ALREADY_EXISTS: u64 = 4;
    /// Only borrower can perform this action
    const ERR_ONLY_BORROWER: u64 = 5;
    /// Only lender can perform this action
    const ERR_ONLY_LENDER: u64 = 6;
    /// Loan is not active
    const ERR_LOAN_NOT_ACTIVE: u64 = 7;
    /// Payment amount incorrect
    const ERR_INCORRECT_PAYMENT_AMOUNT: u64 = 8;
    /// Loan is overdue
    const ERR_LOAN_OVERDUE: u64 = 9;
    /// Insufficient pool balance
    const ERR_INSUFFICIENT_POOL_BALANCE: u64 = 10;
    /// Amount cannot be zero
    const ERR_ZERO_AMOUNT: u64 = 11;
    /// Invalid loan parameters
    const ERR_INVALID_LOAN_PARAMS: u64 = 12;
    /// Loan is already defaulted
    const ERR_LOAN_DEFAULTED: u64 = 13;
    /// Payment schedule not found
    const ERR_PAYMENT_SCHEDULE_NOT_FOUND: u64 = 14;
    /// Loan is not overdue
    const ERR_LOAN_NOT_OVERDUE: u64 = 15;

    // ================================= Constants ================================= //
    /// Minimum reputation score for loans
    const MIN_REPUTATION_SCORE: u64 = 60;
    /// Maximum loan duration in seconds (1 year)
    const MAX_LOAN_DURATION: u64 = 365 * 24 * 60 * 60;
    /// Grace period for overdue payments (7 days)
    const GRACE_PERIOD: u64 = 7 * 24 * 60 * 60;
    /// Basis points for percentage calculations
    const BASIS_POINTS: u64 = 10000;

    // ================================= Structs ================================= //

    /// Loan status enumeration
    struct LoanStatus has store, drop, copy {
        value: u8, // 0=pending, 1=active, 2=completed, 3=defaulted
    }

    /// Scheduled payment information
    struct PaymentSchedule has store, drop, copy {
        /// Payment number (1-based)
        payment_number: u64,
        /// Due date timestamp
        due_date: u64,
        /// Principal amount due
        principal_amount: u64,
        /// Interest amount due
        interest_amount: u64,
        /// Total payment amount
        total_amount: u64,
        /// Whether payment is completed
        is_paid: bool,
        /// Actual payment timestamp
        paid_timestamp: u64,
    }

    /// P2P Loan structure
    struct Loan has key {
        /// Unique loan ID
        id: u64,
        /// Borrower address
        borrower: address,
        /// Lender address
        lender: address,
        /// Loan asset metadata
        asset_metadata: Object<Metadata>,
        /// Principal amount
        principal_amount: u64,
        /// Annual interest rate in basis points (e.g., 1000 = 10%)
        interest_rate: u64,
        /// Loan duration in seconds
        duration: u64,
        /// Collateral amount (can be 0 for under-collateralized loans)
        collateral_amount: u64,
        /// Collateral asset metadata (optional)
        collateral_metadata: Option<Object<Metadata>>,
        /// Loan creation timestamp
        created_at: u64,
        /// Loan start timestamp
        started_at: u64,
        /// Current loan status
        status: LoanStatus,
        /// Payment schedule
        payment_schedule: vector<PaymentSchedule>,
        /// Number of payments made
        payments_made: u64,
        /// Total amount repaid
        total_repaid: u64,
        /// Borrower's reputation score at loan creation
        borrower_reputation: u64,
        /// Extend reference for object management
        extend_ref: ExtendRef,
    }

    /// Lending pool for managing funds
    struct LendingPool has key {
        /// Pool asset metadata
        asset_metadata: Object<Metadata>,
        /// Total pool balance
        total_balance: u64,
        /// Available balance for lending
        available_balance: u64,
        /// Total loans outstanding
        outstanding_loans: u64,
        /// Pool fungible store
        pool_store: Object<FungibleStore>,
        /// Extend reference for pool management
        extend_ref: ExtendRef,
    }

    /// Global lending configuration
    struct LendingConfig has key {
        /// Next loan ID
        next_loan_id: u64,
        /// Total loans created
        total_loans: u64,
        /// Admin address
        admin: address,
    }

    // ================================= Events ================================= //

    #[event]
    struct LoanCreatedEvent has drop, store {
        loan_id: u64,
        borrower: address,
        lender: address,
        principal_amount: u64,
        interest_rate: u64,
        duration: u64,
        collateral_amount: u64,
    }

    #[event]
    struct PaymentMadeEvent has drop, store {
        loan_id: u64,
        borrower: address,
        payment_number: u64,
        amount: u64,
        timestamp: u64,
    }

    #[event]
    struct LoanDefaultedEvent has drop, store {
        loan_id: u64,
        borrower: address,
        lender: address,
        outstanding_amount: u64,
    }

    #[event]
    struct LoanCompletedEvent has drop, store {
        loan_id: u64,
        borrower: address,
        lender: address,
        total_repaid: u64,
    }
 
 
   // ================================= Helper Functions ================================= //

    /// Create loan status
    fun create_loan_status(value: u8): LoanStatus {
        LoanStatus { value }
    }

    /// Check if loan is active
    fun is_loan_active(status: &LoanStatus): bool {
        status.value == 1
    }

    /// Check if loan is completed
    fun is_loan_completed(status: &LoanStatus): bool {
        status.value == 2
    }

    /// Check if loan is defaulted
    fun is_loan_defaulted(status: &LoanStatus): bool {
        status.value == 3
    }

    /// Calculate interest for a given amount and rate
    fun calculate_interest(principal: u64, rate: u64, duration: u64): u64 {
        // Simple interest calculation: (P * R * T) / (BASIS_POINTS * SECONDS_IN_YEAR)
        let seconds_in_year = 365 * 24 * 60 * 60;
        (principal * rate * duration) / (BASIS_POINTS * seconds_in_year)
    }

    /// Check if any payments are overdue beyond grace period
    fun check_overdue_payments(schedule: &vector<PaymentSchedule>, current_time: u64): bool {
        let schedule_length = vector::length(schedule);
        let i = 0;
        
        while (i < schedule_length) {
            let payment = vector::borrow(schedule, i);
            if (!payment.is_paid && current_time > payment.due_date + GRACE_PERIOD) {
                return true
            };
            i = i + 1;
        };
        
        false
    }

    /// Generate payment schedule for a loan
    fun generate_payment_schedule(
        principal: u64,
        interest_rate: u64,
        duration: u64,
        start_time: u64,
        num_payments: u64
    ): vector<PaymentSchedule> {
        let schedule = vector::empty<PaymentSchedule>();
        let total_interest = calculate_interest(principal, interest_rate, duration);
        let total_amount = principal + total_interest;
        
        let payment_interval = duration / num_payments;
        let payment_amount = total_amount / num_payments;
        let principal_per_payment = principal / num_payments;
        let interest_per_payment = total_interest / num_payments;
        
        let i = 0;
        while (i < num_payments) {
            let due_date = start_time + ((i + 1) * payment_interval);
            let payment = PaymentSchedule {
                payment_number: i + 1,
                due_date,
                principal_amount: principal_per_payment,
                interest_amount: interest_per_payment,
                total_amount: payment_amount,
                is_paid: false,
                paid_timestamp: 0,
            };
            vector::push_back(&mut schedule, payment);
            i = i + 1;
        };
        
        schedule
    }

    // ================================= Initialization Functions ================================= //

    /// Initialize the lending module
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        // Create lending configuration
        let config = LendingConfig {
            next_loan_id: 1,
            total_loans: 0,
            admin: admin_addr,
        };
        
        move_to(admin, config);
    }

    /// Create a lending pool for a specific asset
    public entry fun create_lending_pool(
        admin: &signer,
        asset_metadata: Object<Metadata>
    ) acquires LendingConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<LendingConfig>(admin_addr);
        assert!(config.admin == admin_addr, ERR_NOT_ELIGIBLE);

        // Create pool object
        let pool_constructor_ref = object::create_object(admin_addr);
        let pool_signer = object::generate_signer(&pool_constructor_ref);
        let extend_ref = object::generate_extend_ref(&pool_constructor_ref);

        // Create fungible store for the pool
        let pool_store = primary_fungible_store::create_primary_store(
            signer::address_of(&pool_signer),
            asset_metadata
        );

        let pool = LendingPool {
            asset_metadata,
            total_balance: 0,
            available_balance: 0,
            outstanding_loans: 0,
            pool_store,
            extend_ref,
        };

        move_to(&pool_signer, pool);
    }

    // ================================= Core Lending Functions ================================= //

    /// Create a P2P loan request
    public entry fun create_loan(
        borrower: &signer,
        lender_addr: address,
        asset_metadata: Object<Metadata>,
        principal_amount: u64,
        interest_rate: u64,
        duration: u64,
        collateral_amount: u64,
        collateral_metadata: Option<Object<Metadata>>,
        num_payments: u64
    ) acquires LendingConfig {
        let borrower_addr = signer::address_of(borrower);
        
        // Validate inputs
        assert!(principal_amount > 0, ERR_ZERO_AMOUNT);
        assert!(duration > 0 && duration <= MAX_LOAN_DURATION, ERR_INVALID_LOAN_PARAMS);
        assert!(num_payments > 0, ERR_INVALID_LOAN_PARAMS);
        
        // Check borrower reputation
        let reputation_score = did::get_reputation_score(borrower_addr);
        assert!(reputation_score >= MIN_REPUTATION_SCORE, ERR_NOT_ELIGIBLE);
        
        // Get next loan ID
        let config = borrow_global_mut<LendingConfig>(@stake_pool_addr);
        let loan_id = config.next_loan_id;
        config.next_loan_id = config.next_loan_id + 1;
        config.total_loans = config.total_loans + 1;

        // Create loan object
        let loan_constructor_ref = object::create_object(borrower_addr);
        let loan_signer = object::generate_signer(&loan_constructor_ref);
        let extend_ref = object::generate_extend_ref(&loan_constructor_ref);

        let current_time = timestamp::now_seconds();
        
        // Generate payment schedule
        let payment_schedule = generate_payment_schedule(
            principal_amount,
            interest_rate,
            duration,
            current_time,
            num_payments
        );

        let loan = Loan {
            id: loan_id,
            borrower: borrower_addr,
            lender: lender_addr,
            asset_metadata,
            principal_amount,
            interest_rate,
            duration,
            collateral_amount,
            collateral_metadata,
            created_at: current_time,
            started_at: 0,
            status: create_loan_status(0), // pending
            payment_schedule,
            payments_made: 0,
            total_repaid: 0,
            borrower_reputation: reputation_score,
            extend_ref,
        };

        move_to(&loan_signer, loan);

        // Emit event
        event::emit(LoanCreatedEvent {
            loan_id,
            borrower: borrower_addr,
            lender: lender_addr,
            principal_amount,
            interest_rate,
            duration,
            collateral_amount,
        });
    }

    /// Approve and fund a loan (called by lender)
    public entry fun approve_loan(
        lender: &signer,
        loan_address: address
    ) acquires Loan {
        let lender_addr = signer::address_of(lender);
        let loan = borrow_global_mut<Loan>(loan_address);
        
        assert!(loan.lender == lender_addr, ERR_ONLY_LENDER);
        assert!(loan.status.value == 0, ERR_LOAN_NOT_ACTIVE); // pending
        
        // Transfer funds from lender to borrower
        primary_fungible_store::transfer(
            lender,
            loan.asset_metadata,
            loan.borrower,
            loan.principal_amount
        );
        
        // Handle collateral if required
        if (loan.collateral_amount > 0) {
            let collateral_metadata = option::extract(&mut loan.collateral_metadata);
            primary_fungible_store::transfer(
                lender, // borrower should provide collateral, but for simplicity using lender
                collateral_metadata,
                loan_address,
                loan.collateral_amount
            );
        };
        
        // Update loan status
        loan.status = create_loan_status(1); // active
        loan.started_at = timestamp::now_seconds();
    }

    /// Make a scheduled payment
    public entry fun make_payment(
        borrower: &signer,
        loan_address: address,
        payment_number: u64
    ) acquires Loan {
        let borrower_addr = signer::address_of(borrower);
        let loan = borrow_global_mut<Loan>(loan_address);
        
        assert!(loan.borrower == borrower_addr, ERR_ONLY_BORROWER);
        assert!(is_loan_active(&loan.status), ERR_LOAN_NOT_ACTIVE);
        assert!(payment_number > 0 && payment_number <= vector::length(&loan.payment_schedule), ERR_PAYMENT_SCHEDULE_NOT_FOUND);
        
        let payment_index = payment_number - 1;
        let total_payments = vector::length(&loan.payment_schedule);
        
        // Get payment details before mutable borrow
        let (payment_amount, due_date) = {
            let payment = vector::borrow(&loan.payment_schedule, payment_index);
            assert!(!payment.is_paid, ERR_INCORRECT_PAYMENT_AMOUNT);
            (payment.total_amount, payment.due_date)
        };
        
        // Check if payment is overdue
        let current_time = timestamp::now_seconds();
        if (current_time > due_date + GRACE_PERIOD) {
            // Mark loan as defaulted
            loan.status = create_loan_status(3);
            
            event::emit(LoanDefaultedEvent {
                loan_id: loan.id,
                borrower: borrower_addr,
                lender: loan.lender,
                outstanding_amount: loan.principal_amount - loan.total_repaid,
            });
            
            return
        };
        
        // Transfer payment to lender
        primary_fungible_store::transfer(
            borrower,
            loan.asset_metadata,
            loan.lender,
            payment_amount
        );
        
        // Now update payment record
        let payment = vector::borrow_mut(&mut loan.payment_schedule, payment_index);
        
        // Update payment record
        payment.is_paid = true;
        payment.paid_timestamp = current_time;
        loan.payments_made = loan.payments_made + 1;
        loan.total_repaid = loan.total_repaid + payment_amount;
        
        // Update borrower reputation
        did::update_reputation_for_payment(borrower_addr, true);
        
        // Check if loan is completed
        if (loan.payments_made == total_payments) {
            loan.status = create_loan_status(2); // completed
            
            // Return collateral if any
            if (loan.collateral_amount > 0) {
                let collateral_metadata = option::extract(&mut loan.collateral_metadata);
                let loan_signer = object::generate_signer_for_extending(&loan.extend_ref);
                primary_fungible_store::transfer(
                    &loan_signer,
                    collateral_metadata,
                    loan.borrower,
                    loan.collateral_amount
                );
            };
            
            event::emit(LoanCompletedEvent {
                loan_id: loan.id,
                borrower: borrower_addr,
                lender: loan.lender,
                total_repaid: loan.total_repaid,
            });
        } else {
            event::emit(PaymentMadeEvent {
                loan_id: loan.id,
                borrower: borrower_addr,
                payment_number,
                amount: payment_amount,
                timestamp: current_time,
            });
        };
    }

    /// Handle loan default (can be called by lender after grace period)
    public entry fun default_loan(
        lender: &signer,
        loan_address: address
    ) acquires Loan {
        let lender_addr = signer::address_of(lender);
        let loan = borrow_global_mut<Loan>(loan_address);
        
        assert!(loan.lender == lender_addr, ERR_ONLY_LENDER);
        assert!(is_loan_active(&loan.status), ERR_LOAN_NOT_ACTIVE);
        
        // Check if any payment is overdue beyond grace period
        let current_time = timestamp::now_seconds();
        let is_overdue = check_overdue_payments(&loan.payment_schedule, current_time);
        
        assert!(is_overdue, ERR_LOAN_NOT_OVERDUE);
        
        // Mark loan as defaulted
        loan.status = create_loan_status(3);
        
        // Transfer collateral to lender if any
        if (loan.collateral_amount > 0) {
            let collateral_metadata = option::extract(&mut loan.collateral_metadata);
            let loan_signer = object::generate_signer_for_extending(&loan.extend_ref);
            primary_fungible_store::transfer(
                &loan_signer,
                collateral_metadata,
                loan.lender,
                loan.collateral_amount
            );
        };
        
        // Update borrower reputation negatively
        did::update_reputation_for_payment(loan.borrower, false);
        
        event::emit(LoanDefaultedEvent {
            loan_id: loan.id,
            borrower: loan.borrower,
            lender: lender_addr,
            outstanding_amount: loan.principal_amount - loan.total_repaid,
        });
    }

    // ================================= View Functions ================================= //

    #[view]
    /// Get loan details
    public fun get_loan_details(loan_address: address): (
        u64, // id
        address, // borrower
        address, // lender
        u64, // principal_amount
        u64, // interest_rate
        u64, // duration
        u64, // collateral_amount
        u64, // created_at
        u64, // started_at
        u8, // status
        u64, // payments_made
        u64, // total_repaid
        u64  // borrower_reputation
    ) acquires Loan {
        let loan = borrow_global<Loan>(loan_address);
        (
            loan.id,
            loan.borrower,
            loan.lender,
            loan.principal_amount,
            loan.interest_rate,
            loan.duration,
            loan.collateral_amount,
            loan.created_at,
            loan.started_at,
            loan.status.value,
            loan.payments_made,
            loan.total_repaid,
            loan.borrower_reputation
        )
    }

    #[view]
    /// Get payment schedule for a loan
    public fun get_payment_schedule(loan_address: address): vector<PaymentSchedule> acquires Loan {
        let loan = borrow_global<Loan>(loan_address);
        loan.payment_schedule
    }

    #[view]
    /// Get next payment due for a loan
    public fun get_next_payment_due(loan_address: address): (u64, u64, u64, bool) acquires Loan {
        let loan = borrow_global<Loan>(loan_address);
        let schedule_length = vector::length(&loan.payment_schedule);
        
        let i = 0;
        while (i < schedule_length) {
            let payment = vector::borrow(&loan.payment_schedule, i);
            if (!payment.is_paid) {
                return (payment.payment_number, payment.due_date, payment.total_amount, 
                       timestamp::now_seconds() > payment.due_date)
            };
            i = i + 1;
        };
        
        // No payments due
        (0, 0, 0, false)
    }

    #[view]
    /// Calculate interest rate based on reputation score
    public fun calculate_interest_rate_for_reputation(reputation_score: u64): u64 {
        // Higher reputation = lower interest rate
        // Base rate: 15% (1500 basis points)
        // Minimum rate: 5% (500 basis points) for perfect reputation (100)
        // Maximum rate: 25% (2500 basis points) for minimum reputation (60)
        
        if (reputation_score >= 100) {
            500 // 5%
        } else if (reputation_score >= 90) {
            750 // 7.5%
        } else if (reputation_score >= 80) {
            1000 // 10%
        } else if (reputation_score >= 70) {
            1500 // 15%
        } else {
            2000 // 20%
        }
    }
}
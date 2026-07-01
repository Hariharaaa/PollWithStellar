#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, String, Vec,
};

// ── Storage Keys ──────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Question,
    Options,
    OptionCount,
    Votes(u32),
    HasVoted(Address),
}

// ── Result type returned by get_results ───────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct PollResults {
    pub question: String,
    pub options: Vec<String>,
    pub vote_counts: Vec<u64>,
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct LivePollContract;

#[contractimpl]
impl LivePollContract {
    /// Initialise the poll once with a question and 2-4 options.
    /// Can only be called once (panics if already initialised).
    pub fn init(env: Env, question: String, options: Vec<String>) {
        // Guard: already initialised
        if env.storage().instance().has(&DataKey::Question) {
            panic!("poll already initialised");
        }

        let n = options.len();
        if n < 2 || n > 4 {
            panic!("options must be between 2 and 4");
        }

        env.storage().instance().set(&DataKey::Question, &question);
        env.storage().instance().set(&DataKey::Options, &options);
        env.storage().instance().set(&DataKey::OptionCount, &n);

        // Initialise each vote counter to 0
        for i in 0..n {
            env.storage()
                .instance()
                .set(&DataKey::Votes(i), &0u64);
        }
    }

    /// Cast a vote for `option_index`. Requires auth from `voter`.
    /// Panics if the voter has already voted, or index is out of range.
    pub fn vote(env: Env, voter: Address, option_index: u32) {
        voter.require_auth();

        // Check poll is initialised
        let count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::OptionCount)
            .expect("poll not initialised");

        if option_index >= count {
            panic!("option index out of range");
        }

        // Duplicate-vote guard
        let voted_key = DataKey::HasVoted(voter.clone());
        if env.storage().persistent().has(&voted_key) {
            panic!("already voted");
        }

        // Mark voter
        env.storage()
            .persistent()
            .set(&voted_key, &true);

        // Increment vote count
        let current: u64 = env
            .storage()
            .instance()
            .get(&DataKey::Votes(option_index))
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::Votes(option_index), &(current + 1));

        // Emit event: topic = "vote_cast", data = (voter, option_index)
        env.events().publish(
            (symbol_short!("vote_cast"), voter),
            option_index,
        );
    }

    /// Returns the question, option labels, and current vote counts.
    pub fn get_results(env: Env) -> PollResults {
        let question: String = env
            .storage()
            .instance()
            .get(&DataKey::Question)
            .expect("poll not initialised");

        let options: Vec<String> = env
            .storage()
            .instance()
            .get(&DataKey::Options)
            .expect("poll not initialised");

        let n: u32 = env
            .storage()
            .instance()
            .get(&DataKey::OptionCount)
            .expect("poll not initialised");

        let mut vote_counts: Vec<u64> = Vec::new(&env);
        for i in 0..n {
            let c: u64 = env
                .storage()
                .instance()
                .get(&DataKey::Votes(i))
                .unwrap_or(0);
            vote_counts.push_back(c);
        }

        PollResults {
            question,
            options,
            vote_counts,
        }
    }

    /// Check if an address has already voted.
    pub fn has_voted(env: Env, voter: Address) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::HasVoted(voter))
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};


    fn make_options(env: &Env) -> Vec<String> {
        let mut opts: Vec<String> = Vec::new(env);
        opts.push_back(String::from_str(env, "Rust"));
        opts.push_back(String::from_str(env, "TypeScript"));
        opts.push_back(String::from_str(env, "Go"));
        opts.push_back(String::from_str(env, "Python"));
        opts
    }

    #[test]
    fn test_init_and_get_results() {
        let env = Env::default();
        let contract_id = env.register_contract(None, LivePollContract);
        let client = LivePollContractClient::new(&env, &contract_id);

        let opts = make_options(&env);
        client.init(
            &String::from_str(&env, "What is your favourite programming language?"),
            &opts,
        );

        let results = client.get_results();
        assert_eq!(results.vote_counts.len(), 4);
        for i in 0..4u32 {
            assert_eq!(results.vote_counts.get(i).unwrap(), 0u64);
        }
    }

    #[test]
    fn test_vote_increments() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, LivePollContract);
        let client = LivePollContractClient::new(&env, &contract_id);
        let opts = make_options(&env);
        client.init(
            &String::from_str(&env, "What is your favourite programming language?"),
            &opts,
        );

        let voter = Address::generate(&env);
        client.vote(&voter, &0u32);

        let results = client.get_results();
        assert_eq!(results.vote_counts.get(0u32).unwrap(), 1u64);
        assert_eq!(results.vote_counts.get(1u32).unwrap(), 0u64);
    }

    #[test]
    #[should_panic(expected = "already voted")]
    fn test_double_vote_rejected() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, LivePollContract);
        let client = LivePollContractClient::new(&env, &contract_id);
        let opts = make_options(&env);
        client.init(
            &String::from_str(&env, "What is your favourite programming language?"),
            &opts,
        );

        let voter = Address::generate(&env);
        client.vote(&voter, &0u32);
        client.vote(&voter, &1u32); // should panic
    }

    #[test]
    #[should_panic(expected = "option index out of range")]
    fn test_invalid_option() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, LivePollContract);
        let client = LivePollContractClient::new(&env, &contract_id);
        let opts = make_options(&env);
        client.init(
            &String::from_str(&env, "What is your favourite programming language?"),
            &opts,
        );

        let voter = Address::generate(&env);
        client.vote(&voter, &99u32);
    }

    #[test]
    fn test_has_voted() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, LivePollContract);
        let client = LivePollContractClient::new(&env, &contract_id);
        let opts = make_options(&env);
        client.init(
            &String::from_str(&env, "What is your favourite programming language?"),
            &opts,
        );

        let voter = Address::generate(&env);
        assert!(!client.has_voted(&voter));
        client.vote(&voter, &2u32);
        assert!(client.has_voted(&voter));
    }
}

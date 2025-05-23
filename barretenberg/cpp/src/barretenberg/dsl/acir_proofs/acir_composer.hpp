// === AUDIT STATUS ===
// internal:    { status: not started, auditors: [], date: YYYY-MM-DD }
// external_1:  { status: not started, auditors: [], date: YYYY-MM-DD }
// external_2:  { status: not started, auditors: [], date: YYYY-MM-DD }
// =====================

#pragma once
#include <barretenberg/dsl/acir_format/acir_format.hpp>

namespace acir_proofs {

/**
 * @brief A class responsible for marshalling construction of keys and prover and verifier instances used to prove
 * satisfiability of circuits written in ACIR.
 * @todo: This reflects the design of Plonk. Perhaps we should author new classes to better reflect the
 * structure of the newer code since there's much more of that code now?
 */
class AcirComposer {

    using WitnessVector = bb::SlabVector<bb::fr>;

  public:
    AcirComposer(size_t size_hint = 0, bool verbose = true);

    template <typename Builder = bb::UltraCircuitBuilder>
    void create_finalized_circuit(acir_format::AcirFormat& constraint_system,
                                  bool recursive,
                                  WitnessVector const& witness = {},
                                  bool collect_gates_per_opcode = false);

    std::shared_ptr<bb::plonk::proving_key> init_proving_key();

    std::vector<uint8_t> create_proof();

    void load_verification_key(bb::plonk::verification_key_data&& data);

    std::shared_ptr<bb::plonk::verification_key> init_verification_key();

    bool verify_proof(std::vector<uint8_t> const& proof);

    std::string get_solidity_verifier();
    size_t get_finalized_total_circuit_size() { return builder_.get_finalized_total_circuit_size(); };
    size_t get_finalized_dyadic_circuit_size()
    {
        return builder_.get_circuit_subgroup_size(builder_.get_finalized_total_circuit_size());
    };
    size_t get_estimated_total_circuit_size() { return builder_.get_estimated_total_circuit_size(); };

    std::vector<bb::fr> serialize_proof_into_fields(std::vector<uint8_t> const& proof, size_t num_inner_public_inputs);

    std::vector<bb::fr> serialize_verification_key_into_fields();

    void finalize_circuit() { builder_.finalize_circuit(/*ensure_nonzero=*/false); }

  private:
    acir_format::Builder builder_;
    size_t size_hint_;
    std::shared_ptr<bb::plonk::proving_key> proving_key_;
    std::shared_ptr<bb::plonk::verification_key> verification_key_;
    bool verbose_ = true;

    template <typename... Args> inline void vinfo(Args... args)
    {
        if (verbose_) {
            info(args...);
        }
    }
};

} // namespace acir_proofs

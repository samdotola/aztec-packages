// === AUDIT STATUS ===
// internal:    { status: not started, auditors: [], date: YYYY-MM-DD }
// external_1:  { status: not started, auditors: [], date: YYYY-MM-DD }
// external_2:  { status: not started, auditors: [], date: YYYY-MM-DD }
// =====================

#include "eccvm_trace_checker.hpp"
#include "barretenberg/eccvm/eccvm_flavor.hpp"
#include "barretenberg/plonk_honk_shared/library/grand_product_library.hpp"

using namespace bb;

using Flavor = ECCVMFlavor;
using Builder = typename ECCVMFlavor::CircuitBuilder;
using FF = typename ECCVMFlavor::FF;
using ProverPolynomials = typename ECCVMFlavor::ProverPolynomials;

bool ECCVMTraceChecker::check(Builder& builder, numeric::RNG* engine_ptr)
{
    const FF gamma = FF::random_element(engine_ptr);
    const FF beta = FF::random_element(engine_ptr);
    const FF beta_sqr = beta.sqr();
    const FF beta_cube = beta_sqr * beta;
    auto eccvm_set_permutation_delta =
        gamma * (gamma + beta_sqr) * (gamma + beta_sqr + beta_sqr) * (gamma + beta_sqr + beta_sqr + beta_sqr);
    eccvm_set_permutation_delta = eccvm_set_permutation_delta.invert();
    bb::RelationParameters<typename Flavor::FF> params{
        .eta = 0,
        .beta = beta,
        .gamma = gamma,
        .public_input_delta = 0,
        .lookup_grand_product_delta = 0,
        .beta_sqr = beta_sqr,
        .beta_cube = beta_cube,
        .eccvm_set_permutation_delta = eccvm_set_permutation_delta,
    };

    ProverPolynomials polynomials(builder);
    const size_t num_rows = polynomials.get_polynomial_size();
    const size_t unmasked_witness_size = num_rows - NUM_DISABLED_ROWS_IN_SUMCHECK;
    compute_logderivative_inverse<FF, ECCVMLookupRelation<FF>>(polynomials, params, unmasked_witness_size);
    compute_grand_product<Flavor, ECCVMSetRelation<FF>>(polynomials, params, unmasked_witness_size);

    polynomials.z_perm_shift = Polynomial(polynomials.z_perm.shifted());

    const auto evaluate_relation = [&]<typename Relation>(const std::string& relation_name) {
        typename Relation::SumcheckArrayOfValuesOverSubrelations result;
        for (auto& r : result) {
            r = 0;
        }
        constexpr size_t NUM_SUBRELATIONS = result.size();

        for (size_t i = 0; i < num_rows; ++i) {
            Relation::accumulate(result, polynomials.get_row(i), params, 1);

            bool x = true;
            for (size_t j = 0; j < NUM_SUBRELATIONS; ++j) {
                if (result[j] != 0) {
                    info("Relation ", relation_name, ", subrelation index ", j, " failed at row ", i);
                    x = false;
                }
            }
            if (!x) {
                return false;
            }
        }
        return true;
    };

    bool result = true;
    result = result && evaluate_relation.template operator()<ECCVMTranscriptRelation<FF>>("ECCVMTranscriptRelation");
    result = result && evaluate_relation.template operator()<ECCVMPointTableRelation<FF>>("ECCVMPointTableRelation");
    result = result && evaluate_relation.template operator()<ECCVMWnafRelation<FF>>("ECCVMWnafRelation");
    result = result && evaluate_relation.template operator()<ECCVMMSMRelation<FF>>("ECCVMMSMRelation");
    result = result && evaluate_relation.template operator()<ECCVMSetRelation<FF>>("ECCVMSetRelation");
    result = result && evaluate_relation.template operator()<ECCVMBoolsRelation<FF>>("ECCVMBoolsRelation");

    using LookupRelation = ECCVMLookupRelation<FF>;
    typename ECCVMLookupRelation<typename Flavor::FF>::SumcheckArrayOfValuesOverSubrelations lookup_result;
    for (auto& r : lookup_result) {
        r = 0;
    }
    for (size_t i = 0; i < num_rows; ++i) {
        LookupRelation::accumulate(lookup_result, polynomials.get_row(i), params, 1);
    }
    for (auto r : lookup_result) {
        if (r != 0) {
            info("Relation ECCVMLookupRelation failed.");
            return false;
        }
    }
    return result;
}

"""Model definition for AHP criterion weighting."""

from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_ahp_criteria_weights


MODEL_DEFINITION = ModelDefinition(
    api_model_key="ahp_criteria_weights",
    api_endpoint_path="/ahp_criteria_weights",
    request_model=GenericModelExecutionRequest,
    handler=execute_ahp_criteria_weights,
    display_name="AHP Criteria Weights",
    small_description="Derives criterion priorities from pairwise Saaty comparisons.",
    extended_description=(
        "AHP Criteria Weights computes one principal-eigenvector priority vector per expert "
        "from a complete reciprocal criteria-comparison matrix. Multiple expert vectors are "
        "combined with the existing MCC criteria-weight workflow; the individual matrices, "
        "weights, and consistency diagnostics remain available for traceability."
    ),
    implementation_status="ready",
    model_kind="criteriaWeighting",
    requires_homogeneous_expression_domains=False,
    evaluation_structure_key="criteriaPairwiseAHP",
    supports_creator_criteria_weighting=True,
    supports_expert_criteria_weighting=True,
    supports_consensus=False,
    supports_consensus_simulation=False,
    is_multi_criteria=True,
    uses_criteria_weights=False,
    uses_expert_weights=False,
    uses_fuzzy_criteria_weights=False,
    uses_criterion_types=False,
    supported_expression_domains=[],
    parameters=[],
    model_section={
        "whatItDoes": (
            "AHP derives normalized criterion priorities from pairwise importance judgments. "
            "Each expert's reciprocal matrix is solved independently with its principal eigenvector, "
            "and the result includes consistency diagnostics."
        ),
        "whenToUse": (
            "Use AHP when people can compare criteria in pairs and explain which criterion matters "
            "more and by how much. It is intended to produce criterion weights, not alternative scores."
        ),
        "advantages": [
            "Uses explicit pairwise judgments on Saaty's 1–9 scale and reciprocals.",
            "Produces normalized priorities using the principal eigenvector method.",
            "Reports consistency diagnostics for each expert.",
            "Uses existing MCC to combine expert priority vectors without averaging judgments.",
        ],
        "limitations": [
            "Requires one complete comparison for each unordered criterion pair.",
            "Pairwise judgments may be inconsistent and should be reviewed when CR exceeds 0.10.",
            "The canonical Random Index table in this implementation supports up to 15 criteria.",
            "It determines criterion importance and does not evaluate alternatives by itself.",
        ],
    },
)

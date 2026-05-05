"""Definiciones centrales de modelos publicados por ApiModels.

Cada entrada concentra lo necesario para publicar el endpoint y generar el manifest.
La metadata pesada del manifest se expande en `services.model_manifest_service` para
mantener estable el contrato público sin duplicar bloques técnicos en cada modelo.
"""

from dataclasses import dataclass, field
from typing import Any, Callable

from pydantic import BaseModel

from schemas.model_requests import (
    ArasRequest,
    BordaRequest,
    BwmRequest,
    CmccRequest,
    FuzzyTopsisRequest,
    HerreraViedmaRequest,
    MarcosRequest,
    TopsisRequest,
)
from services.model_handlers import (
    execute_aras,
    execute_borda,
    execute_bwm,
    execute_cmcc,
    execute_fuzzy_topsis,
    execute_herrera_viedma,
    execute_marcos,
    execute_topsis,
)
from registry.response_examples import (
    HERRERA_VIEDMA_CRP_RESPONSE_EXAMPLES,
    MARCOS_RESPONSE_EXAMPLES,
    TOPSIS_RESPONSE_EXAMPLES,
    BORDA_RESPONSE_EXAMPLES,
    ARAS_RESPONSE_EXAMPLES,
    FUZZY_TOPSIS_RESPONSE_EXAMPLES,
    BWM_RESPONSE_EXAMPLES,
    CMCC_RESPONSE_EXAMPLES,
)


@dataclass(frozen=True)
class ModelDefinition:
    """Ficha única de un modelo ejecutable y documentable por ApiModels."""

    key: str
    path: str
    request_model: type[BaseModel]
    handler: Callable[[Any], Any]
    summary: str
    description: str
    operation_id: str
    display_name: str

    small_description: str = ""
    extend_description: str = ""
    response_examples: dict[str, dict[str, Any]] = field(default_factory=dict)

    aliases: list[str] = field(default_factory=list)
    role: str = "issueModel"
    status: str = "available"
    public_in_issue_catalog: bool = True

    model_family_key: str | None = None
    model_version: str = "1.0.0"
    version_label: str = "v1"
    more_info_url: str | None = None

    evaluation_structure: str | None = None
    lifecycle_kind: str | None = None
    is_consensus: bool | None = None
    is_multi_criteria: bool | None = None
    input_kind: str = ""
    output_kind: str = ""
    supports_scenarios: bool = False

    supported_expression_domains: list[str] = field(default_factory=list)
    input_fields: list[str] = field(default_factory=list)
    output_fields: list[str] = field(default_factory=list)

    uses_weights: bool = False
    uses_fuzzy_weights: bool = False
    uses_criterion_types: bool = False
    parameters: list[dict[str, Any]] = field(default_factory=list)
    sync_as_issue_model: bool = True

    @property
    def family_key(self) -> str:
        """Devuelve la familia del modelo usando la key como valor por defecto."""

        return self.model_family_key or self.key


MODEL_DEFINITIONS: tuple[ModelDefinition, ...] = (
    ModelDefinition(
        key="herrera_viedma_crp",
        path="/herrera_viedma_crp",
        request_model=HerreraViedmaRequest,
        handler=execute_herrera_viedma,
        summary="Execute Herrera-Viedma CRP",
        description=(
            "Executes the Herrera-Viedma CRP consensus reaching process using pairwise "
            "preference matrices provided by experts and criteria."
        ),
        small_description=(
            "Consensus reaching model for group decisions based on pairwise preference "
            "matrices and iterative agreement improvement."
        ),
        extend_description=(
            "Herrera-Viedma CRP is a consensus reaching process for group decision-making. "
            "It works with pairwise preference matrices provided by experts, measures the "
            "current consensus level, and supports iterative consensus phases until the "
            "required threshold is reached or the process is finalized."
        ),
        operation_id="executeHerreraViedmaCrp",
        response_examples=HERRERA_VIEDMA_CRP_RESPONSE_EXAMPLES,
        display_name="Herrera Viedma CRP",
        aliases=["Herrera Viedma CRP", "HERRERA-VIEDMA CRP", "CRP"],
        role="issueModel",
        status="available",
        public_in_issue_catalog=True,
        model_version="1.0.0",
        version_label="v1",
        more_info_url=None,
        evaluation_structure="pairwiseAlternatives",
        lifecycle_kind="thresholdConsensus",
        is_consensus=True,
        is_multi_criteria=False,
        input_kind="pairwisePreferenceMatrix",
        output_kind="consensusRanking",
        supports_scenarios=True,
        supported_expression_domains=["numeric"],
        input_fields=[
            "matrices",
            "consensusThreshold",
            "modelParameters.ag_lq",
            "modelParameters.ex_lq",
            "modelParameters.b",
            "modelParameters.beta",
        ],
        output_fields=[
            "alternatives_rankings",
            "cm",
            "collective_scores",
            "collective_evaluations",
            "plots_graphic",
        ],
        uses_weights=False,
        uses_fuzzy_weights=False,
        uses_criterion_types=False,
        parameters=[
            {
                "key": "ag_lq",
                "label": "Agreement interval",
                "type": "interval",
                "required": True,
                "default": [0.3, 0.8],
                "restrictions": {
                    "min": 0,
                    "max": 1,
                    "ordered": "strictIncreasing",
                    "length": None,
                    "allowed": None,
                },
            },
            {
                "key": "ex_lq",
                "label": "Expert interval",
                "type": "interval",
                "required": True,
                "default": [0.5, 1],
                "restrictions": {
                    "min": 0,
                    "max": 1,
                    "ordered": "strictIncreasing",
                    "length": None,
                    "allowed": None,
                },
            },
            {
                "key": "b",
                "label": "B selector",
                "type": "number",
                "required": True,
                "default": 1,
                "restrictions": {
                    "min": None,
                    "max": None,
                    "allowed": [0.5, 0.7, 0.9, 1],
                },
            },
            {
                "key": "beta",
                "label": "Beta",
                "type": "number",
                "required": True,
                "default": 0.8,
                "restrictions": {"min": 0, "max": 1, "allowed": None},
            },
        ],
        sync_as_issue_model=True,
    ),
    ModelDefinition(
        key="topsis",
        path="/topsis",
        request_model=TopsisRequest,
        handler=execute_topsis,
        summary="Execute TOPSIS",
        description=(
            "Executes the classic TOPSIS method using aggregated expert decision matrices."
        ),
        small_description=(
            "Distance-based MCDM method that selects the best compromise alternative by "
            "measuring closeness to ideal and anti-ideal solutions."
        ),
        extend_description=(
            "TOPSIS ranks alternatives by comparing each one with an ideal solution "
            "and an anti-ideal solution. It uses criterion weights and max/min criterion "
            "types to identify the alternative with the best compromise between closeness "
            "to the ideal and distance from the worst reference solution."
        ),
        operation_id="executeTopsis",
        response_examples=TOPSIS_RESPONSE_EXAMPLES,
        display_name="TOPSIS",
        aliases=["TOPSIS"],
        role="issueModel",
        status="available",
        public_in_issue_catalog=True,
        model_version="1.0.0",
        version_label="v1",
        more_info_url=None,
        evaluation_structure="direct",
        lifecycle_kind="singlePass",
        is_consensus=False,
        is_multi_criteria=True,
        input_kind="directCrispMatrix",
        output_kind="ranking",
        supports_scenarios=True,
        supported_expression_domains=["numeric"],
        input_fields=["matrices", "criterionTypes", "modelParameters.weights"],
        output_fields=[
            "collective_matrix",
            "matrix_used",
            "collective_scores",
            "collective_ranking",
            "plots_graphic",
        ],
        uses_weights=True,
        uses_fuzzy_weights=False,
        uses_criterion_types=True,
        sync_as_issue_model=True,
    ),
    ModelDefinition(
        key="borda",
        path="/borda",
        request_model=BordaRequest,
        handler=execute_borda,
        summary="Execute Borda",
        description=(
            "Executes the Borda method using the collective group decision matrix."
        ),
        small_description=(
            "Voting-based ranking method that converts collective preferences into point "
            "scores to produce a simple and interpretable group order."
        ),
        extend_description=(
            "Borda is a simple ranking method that assigns points to alternatives according "
            "to their relative positions in the collective evaluation. It is useful when a "
            "clear and interpretable group ranking is needed without requiring criterion "
            "weights."
        ),
        operation_id="executeBorda",
        response_examples=BORDA_RESPONSE_EXAMPLES,
        display_name="BORDA",
        aliases=["BORDA"],
        role="issueModel",
        status="available",
        public_in_issue_catalog=True,
        model_version="1.0.0",
        version_label="v1",
        more_info_url=None,
        evaluation_structure="direct",
        lifecycle_kind="singlePass",
        is_consensus=False,
        is_multi_criteria=True,
        input_kind="directCrispMatrix",
        output_kind="ranking",
        supports_scenarios=True,
        supported_expression_domains=["numeric"],
        input_fields=["matrices", "criterionTypes"],
        output_fields=[
            "collective_matrix",
            "matrix_used",
            "collective_scores",
            "collective_ranking",
            "plots_graphic",
        ],
        uses_weights=False,
        uses_fuzzy_weights=False,
        uses_criterion_types=True,
        sync_as_issue_model=True,
    ),
    ModelDefinition(
        key="aras",
        path="/aras",
        request_model=ArasRequest,
        handler=execute_aras,
        summary="Execute ARAS",
        description=(
            "Executes the ARAS method using the provided criterion weights and criterion types."
        ),
        small_description=(
            "Utility-ratio method that compares each alternative against an optimal "
            "reference using normalized weighted criteria."
        ),
        extend_description=(
            "ARAS evaluates alternatives through an additive utility ratio approach. "
            "It normalizes the decision matrix, applies criterion weights, and compares "
            "each alternative with an optimal reference alternative to produce a final "
            "ranking."
        ),
        operation_id="executeAras",
        response_examples=ARAS_RESPONSE_EXAMPLES,
        display_name="ARAS",
        aliases=["ARAS"],
        role="issueModel",
        status="available",
        public_in_issue_catalog=True,
        model_version="1.0.0",
        version_label="v1",
        more_info_url=None,
        evaluation_structure="direct",
        lifecycle_kind="singlePass",
        is_consensus=False,
        is_multi_criteria=True,
        input_kind="directCrispMatrix",
        output_kind="ranking",
        supports_scenarios=True,
        supported_expression_domains=["numeric"],
        input_fields=["matrices", "criterionTypes", "modelParameters.weights"],
        output_fields=[
            "collective_matrix",
            "matrix_used",
            "collective_scores",
            "collective_ranking",
            "plots_graphic",
        ],
        uses_weights=True,
        uses_fuzzy_weights=False,
        uses_criterion_types=True,
        sync_as_issue_model=True,
    ),
    ModelDefinition(
        key="fuzzy_topsis",
        path="/fuzzy_topsis",
        request_model=FuzzyTopsisRequest,
        handler=execute_fuzzy_topsis,
        summary="Execute Fuzzy TOPSIS",
        description=("Executes Fuzzy TOPSIS using fuzzy expert evaluation matrices."),
        small_description=(
            "Fuzzy method based on TOPSIS for handling linguistic, uncertain, or "
            "imprecise expert evaluations."
        ),
        extend_description=(
            "Fuzzy TOPSIS extends the TOPSIS approach to handle fuzzy or linguistic "
            "evaluations. It is useful when expert assessments are uncertain, qualitative, "
            "or expressed through linguistic labels instead of precise numeric values."
        ),
        operation_id="executeFuzzyTopsis",
        response_examples=FUZZY_TOPSIS_RESPONSE_EXAMPLES,
        display_name="Fuzzy TOPSIS",
        aliases=["FUZZY TOPSIS", "Fuzzy TOPSIS"],
        role="issueModel",
        status="available",
        public_in_issue_catalog=True,
        model_version="1.0.0",
        version_label="v1",
        more_info_url=None,
        evaluation_structure="direct",
        lifecycle_kind="singlePass",
        is_consensus=False,
        is_multi_criteria=True,
        input_kind="directFuzzyMatrix",
        output_kind="ranking",
        supports_scenarios=True,
        supported_expression_domains=["linguistic"],
        input_fields=["matrices", "criterionTypes", "modelParameters.weights"],
        output_fields=[
            "collective_matrix",
            "collective_scores",
            "collective_ranking",
            "plots_graphic",
        ],
        uses_weights=False,
        uses_fuzzy_weights=True,
        uses_criterion_types=True,
        sync_as_issue_model=True,
    ),
    ModelDefinition(
        key="marcos",
        path="/marcos",
        request_model=MarcosRequest,
        handler=execute_marcos,
        summary="Execute MARCOS",
        description=(
            "Executes the MARCOS method using the provided criterion weights and criterion types."
        ),
        small_description=(
            "Compromise-based MCDM method that evaluates alternatives through their utility "
            "relative to ideal and anti-ideal reference solutions."
        ),
        extend_description=(
            "MARCOS is a multi-criteria decision-making method that evaluates each "
            "alternative according to its utility relative to ideal and anti-ideal "
            "solutions. It supports direct crisp decision matrices with criterion "
            "weights and max/min criteria."
        ),
        operation_id="executeMarcos",
        response_examples=MARCOS_RESPONSE_EXAMPLES,
        display_name="MARCOS",
        aliases=["MARCOS"],
        role="issueModel",
        status="available",
        public_in_issue_catalog=True,
        model_version="1.0.0",
        version_label="v1",
        more_info_url=None,
        evaluation_structure="direct",
        lifecycle_kind="singlePass",
        is_consensus=False,
        is_multi_criteria=True,
        input_kind="directCrispMatrix",
        output_kind="ranking",
        supports_scenarios=True,
        supported_expression_domains=["numeric"],
        input_fields=[
            "matrices",
            "criterionTypes",
            "modelParameters.weights",
        ],
        output_fields=[
            "collective_matrix",
            "matrix_used",
            "collective_scores",
            "collective_ranking",
            "plots_graphic",
        ],
        uses_weights=True,
        uses_fuzzy_weights=False,
        uses_criterion_types=True,
        sync_as_issue_model=True,
    ),
    ModelDefinition(
        key="bwm",
        path="/bwm",
        request_model=BwmRequest,
        handler=execute_bwm,
        summary="Execute BWM",
        description=("Executes the Best-Worst Method using expert comparison data."),
        small_description=(
            "Auxiliary weighting service that derives criterion weights from best-worst "
            "comparisons provided by experts."
        ),
        extend_description=(
            "Best-Worst Method is an auxiliary weighting service that derives criterion "
            "weights from expert comparisons between the best criterion, the worst "
            "criterion, and the remaining criteria. In this system it supports the "
            "weighting workflow rather than acting as a final issue resolution model."
        ),
        operation_id="executeBwm",
        response_examples=BWM_RESPONSE_EXAMPLES,
        display_name="BWM",
        aliases=["BWM", "Best Worst Method"],
        role="weightingService",
        status="available",
        public_in_issue_catalog=False,
        model_version="1.0.0",
        version_label="v1",
        more_info_url=None,
        evaluation_structure=None,
        lifecycle_kind=None,
        is_consensus=False,
        is_multi_criteria=True,
        input_kind="bwmExpertComparisons",
        output_kind="weights",
        supports_scenarios=False,
        supported_expression_domains=[],
        input_fields=["experts_data", "eps_penalty"],
        output_fields=["success", "weights", "n_experts", "mic_avg", "lic_avg"],
        uses_weights=False,
        uses_fuzzy_weights=False,
        uses_criterion_types=False,
        parameters=[
            {
                "key": "eps_penalty",
                "label": "Epsilon penalty",
                "type": "number",
                "required": False,
                "default": 1,
                "restrictions": {"min": None, "max": None, "allowed": None},
            }
        ],
        sync_as_issue_model=False,
    ),
    ModelDefinition(
        key="cmcc",
        path="/cmcc",
        request_model=CmccRequest,
        handler=execute_cmcc,
        summary="Execute CMCC",
        description=("Executes the CMCC model using linearized consensus constraints."),
        small_description=(
            "Auxiliary consensus utility model that adjusts expert opinions according to "
            "linearized consensus constraints."
        ),
        extend_description=(
            "CMCC is an auxiliary consensus utility model that computes adjusted opinions "
            "using linearized consensus constraints. In this system it is used to support "
            "consensus-related workflows and analysis, rather than being exposed as a "
            "standard issue resolution model in the public catalog."
        ),
        operation_id="executeCmcc",
        response_examples=CMCC_RESPONSE_EXAMPLES,
        display_name="CMCC",
        aliases=["CMCC"],
        role="utilityModel",
        status="pendingIntegration",
        public_in_issue_catalog=False,
        model_version="1.0.0",
        version_label="v1",
        more_info_url=None,
        evaluation_structure=None,
        lifecycle_kind=None,
        is_consensus=True,
        is_multi_criteria=None,
        input_kind="cmccOpinionVector",
        output_kind="adjustedConsensusOpinions",
        supports_scenarios=False,
        supported_expression_domains=[],
        input_fields=[
            "o",
            "c",
            "omega",
            "w",
            "eps",
            "mu0",
            "lower_bound",
            "upper_bound",
        ],
        output_fields=[
            "success",
            "message",
            "o_bar",
            "g",
            "consensus_level",
            "objective",
        ],
        uses_weights=False,
        uses_fuzzy_weights=False,
        uses_criterion_types=False,
        parameters=[
            {
                "key": "eps",
                "label": "Epsilon",
                "type": "number",
                "required": False,
                "default": None,
                "restrictions": {"min": None, "max": None, "allowed": None},
            },
            {
                "key": "mu0",
                "label": "Mu 0",
                "type": "number",
                "required": False,
                "default": None,
                "restrictions": {"min": 0, "max": 1, "allowed": None},
            },
            {
                "key": "lower_bound",
                "label": "Lower bound",
                "type": "number",
                "required": False,
                "default": 0,
                "restrictions": {"min": None, "max": None, "allowed": None},
            },
            {
                "key": "upper_bound",
                "label": "Upper bound",
                "type": "number",
                "required": False,
                "default": 1,
                "restrictions": {"min": None, "max": None, "allowed": None},
            },
        ],
        sync_as_issue_model=False,
    ),
)

__all__ = ["ModelDefinition", "MODEL_DEFINITIONS"]

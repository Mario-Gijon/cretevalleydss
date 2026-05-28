"""Definiciones centrales de modelos publicados por ApiModels.

Cada entrada concentra lo necesario para publicar el endpoint y generar el manifest.
La metadata pesada del manifest se expande en `services.model_manifest_service` para
mantener estable el contrato público sin duplicar bloques técnicos en cada modelo.
"""

from dataclasses import dataclass, field
from typing import Any, Callable

from pydantic import BaseModel

from schemas.model_requests import (
    CmccRequest,
    GenericModelExecutionRequest,
)

from services.model_executors.aras import execute_aras
from services.model_executors.borda import execute_borda
from services.model_executors.bwm import execute_bwm
from services.model_executors.cmcc import execute_cmcc
from services.model_executors.fuzzy_topsis import execute_fuzzy_topsis
from services.model_executors.herrera_viedma_crp import execute_herrera_viedma
from services.model_executors.marcos import execute_marcos
from services.model_executors.topsis import execute_topsis
from services.model_executors.promethee_vi import execute_promethee_vi
from services.model_executors.vikor import execute_vikor
from services.model_executors.waspas import execute_waspas
from services.model_executors.edas import execute_edas

from registry.response_examples import (
    HERRERA_VIEDMA_CRP_RESPONSE_EXAMPLES,
    MARCOS_RESPONSE_EXAMPLES,
    TOPSIS_RESPONSE_EXAMPLES,
    BORDA_RESPONSE_EXAMPLES,
    ARAS_RESPONSE_EXAMPLES,
    FUZZY_TOPSIS_RESPONSE_EXAMPLES,
    BWM_RESPONSE_EXAMPLES,
    CMCC_RESPONSE_EXAMPLES,
    PROMETHEE_VI_RESPONSE_EXAMPLES,
    VIKOR_RESPONSE_EXAMPLES,
    WASPAS_RESPONSE_EXAMPLES,
    EDAS_RESPONSE_EXAMPLES,
)


@dataclass(frozen=True)
class ModelDefinition:
    """Ficha única de un modelo ejecutable y documentable por ApiModels."""

    api_model_key: str
    api_endpoint_path: str
    request_model: type[BaseModel]
    handler: Callable[[Any], Any]
    summary: str
    description: str
    operation_id: str
    display_name: str

    small_description: str
    extend_description: str
    response_examples: dict[str, dict[str, Any]] = field(default_factory=dict)

    model_family_key: str | None = None
    model_version: str = "1.0.0"
    version_label: str = "v1"
    more_info_url: str | None = None
    is_issue_model: bool = True
    is_criteria_weighting_model: bool = False

    alternative_evaluation_structure_key: str | None = None
    criteria_weighting_structure_key: str | None = None
    supports_consensus: bool = False
    supports_consensus_simulation: bool = False
    is_multi_criteria: bool | None = None
    uses_criteria_weights: bool = False
    uses_fuzzy_criteria_weights: bool = False
    uses_criterion_types: bool = False

    supported_domains: list[str] = field(default_factory=list)
    parameters: list[dict[str, Any]] = field(default_factory=list)

    @property
    def family_key(self) -> str:
        """Devuelve la familia del modelo usando `api_model_key` como valor por defecto."""

        return self.model_family_key or self.api_model_key

    def __post_init__(self) -> None:
        """Valida el contrato interno mínimo de metadata."""

        if self.is_issue_model and not self.alternative_evaluation_structure_key:
            raise ValueError(
                f"ModelDefinition '{self.api_model_key}' requires "
                "alternative_evaluation_structure_key for issue models."
            )

        if (
            self.is_criteria_weighting_model
            and not self.criteria_weighting_structure_key
        ):
            raise ValueError(
                f"ModelDefinition '{self.api_model_key}' requires "
                "criteria_weighting_structure_key for criteria weighting models."
            )


MODEL_DEFINITIONS: tuple[ModelDefinition, ...] = (
    ModelDefinition(
        api_model_key="herrera_viedma_crp",
        api_endpoint_path="/herrera_viedma_crp",
        request_model=GenericModelExecutionRequest,
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
        model_version="1.0.0",
        version_label="v1",
        more_info_url=None,
        alternative_evaluation_structure_key="alternativePairwiseByCriterion",
        supports_consensus=True,
        supports_consensus_simulation=True,
        is_multi_criteria=False,
        uses_criteria_weights=True,
        uses_fuzzy_criteria_weights=False,
        uses_criterion_types=False,
        supported_domains=["numericContinuous", "numericDiscrete"],
        parameters=[
            {
                "key": "ag_lq",
                "label": "Agreement interval",
                "type": "interval",
                "scope": "global",
                "parameterStructureKey": "intervalGlobal",
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
                "scope": "global",
                "parameterStructureKey": "intervalGlobal",
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
                "type": "enum",
                "valueType": "number",
                "scope": "global",
                "parameterStructureKey": "selectGlobal",
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
                "scope": "global",
                "parameterStructureKey": "numberGlobal",
                "required": True,
                "default": 0.8,
                "restrictions": {"min": 0, "max": 1, "allowed": None},
            },
        ],
    ),
    ModelDefinition(
        api_model_key="topsis",
        api_endpoint_path="/topsis",
        request_model=GenericModelExecutionRequest,
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
        model_version="1.0.0",
        version_label="v1",
        more_info_url=None,
        alternative_evaluation_structure_key="alternativeCriteriaMatrix",
        supports_consensus=False,
        is_multi_criteria=True,
        uses_criteria_weights=True,
        uses_fuzzy_criteria_weights=False,
        uses_criterion_types=True,
        supported_domains=["numericContinuous", "numericDiscrete"],
    ),
    ModelDefinition(
        api_model_key="borda",
        api_endpoint_path="/borda",
        request_model=GenericModelExecutionRequest,
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
        model_version="1.0.0",
        version_label="v1",
        more_info_url=None,
        alternative_evaluation_structure_key="alternativeCriteriaMatrix",
        supports_consensus=False,
        is_multi_criteria=True,
        uses_criteria_weights=False,
        uses_fuzzy_criteria_weights=False,
        uses_criterion_types=False,
        supported_domains=["numericContinuous", "numericDiscrete"],
    ),
    ModelDefinition(
        api_model_key="aras",
        api_endpoint_path="/aras",
        request_model=GenericModelExecutionRequest,
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
        model_version="1.0.0",
        version_label="v1",
        more_info_url=None,
        alternative_evaluation_structure_key="alternativeCriteriaMatrix",
        supports_consensus=False,
        is_multi_criteria=True,
        uses_criteria_weights=True,
        uses_fuzzy_criteria_weights=False,
        uses_criterion_types=True,
        supported_domains=["numericContinuous", "numericDiscrete"],
    ),
    ModelDefinition(
        api_model_key="fuzzy_topsis",
        api_endpoint_path="/fuzzy_topsis",
        request_model=GenericModelExecutionRequest,
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
        model_version="1.0.0",
        version_label="v1",
        more_info_url=None,
        alternative_evaluation_structure_key="alternativeCriteriaMatrix",
        supports_consensus=False,
        is_multi_criteria=True,
        uses_criteria_weights=True,
        uses_fuzzy_criteria_weights=True,
        uses_criterion_types=True,
        supported_domains=["linguistic"],
    ),
    ModelDefinition(
        api_model_key="marcos",
        api_endpoint_path="/marcos",
        request_model=GenericModelExecutionRequest,
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
        model_version="1.0.0",
        version_label="v1",
        more_info_url=None,
        alternative_evaluation_structure_key="alternativeCriteriaMatrix",
        supports_consensus=False,
        is_multi_criteria=True,
        uses_criteria_weights=True,
        uses_fuzzy_criteria_weights=False,
        uses_criterion_types=True,
        supported_domains=["numericContinuous", "numericDiscrete"],
    ),
    ModelDefinition(
        api_model_key="promethee_vi",
        api_endpoint_path="/promethee_vi",
        request_model=GenericModelExecutionRequest,
        handler=execute_promethee_vi,
        summary="Execute PROMETHEE VI",
        description=(
            "Executes PROMETHEE VI using aggregated expert evaluations, "
            "criterion-level preference thresholds and interval weight bounds."
        ),
        small_description=(
            "Outranking MCDM method based on preference functions, thresholds "
            "and lower/upper criterion weight bounds."
        ),
        extend_description=(
            "PROMETHEE VI ranks alternatives using criterion-level preference "
            "functions, indifference/preference thresholds and interval weights. "
            "It is useful when exact criteria weights are not fixed but lower and "
            "upper bounds are known."
        ),
        operation_id="executePrometheeVi",
        response_examples=PROMETHEE_VI_RESPONSE_EXAMPLES,
        display_name="PROMETHEE VI",
        model_version="1.0.0",
        version_label="v1",
        more_info_url=None,
        alternative_evaluation_structure_key="alternativeCriteriaMatrix",
        supports_consensus=False,
        is_multi_criteria=True,
        uses_criteria_weights=False,
        uses_fuzzy_criteria_weights=False,
        uses_criterion_types=False,
        supported_domains=["numericContinuous", "numericDiscrete"],
        parameters=[
            {
                "key": "q",
                "label": "Q thresholds",
                "type": "criterionMap",
                "scope": "perCriterion",
                "parameterStructureKey": "numberCriterion",
                "required": True,
                "default": 0.05,
                "restrictions": {
                    "valueType": "number",
                    "requiredForEachCriterion": True,
                    "min": 0,
                    "max": None,
                    "allowed": None,
                },
            },
            {
                "key": "s",
                "label": "S thresholds",
                "type": "criterionMap",
                "scope": "perCriterion",
                "parameterStructureKey": "numberCriterion",
                "required": True,
                "default": 0.10,
                "restrictions": {
                    "valueType": "number",
                    "requiredForEachCriterion": True,
                    "min": 0,
                    "max": None,
                    "allowed": None,
                },
            },
            {
                "key": "p",
                "label": "P thresholds",
                "type": "criterionMap",
                "scope": "perCriterion",
                "parameterStructureKey": "numberCriterion",
                "required": True,
                "default": 0.20,
                "restrictions": {
                    "valueType": "number",
                    "requiredForEachCriterion": True,
                    "min": 0,
                    "max": None,
                    "allowed": None,
                },
            },
            {
                "key": "f",
                "label": "Preference functions",
                "type": "criterionMap",
                "scope": "perCriterion",
                "parameterStructureKey": "selectCriterion",
                "required": True,
                "default": "t5",
                "restrictions": {
                    "valueType": "enum",
                    "requiredForEachCriterion": True,
                    "allowed": ["t1", "t2", "t3", "t4", "t5", "t6", "t7"],
                },
            },
            {
                "key": "w_lower",
                "label": "Lower weight bounds",
                "type": "criterionMap",
                "scope": "perCriterion",
                "parameterStructureKey": "numberCriterion",
                "required": True,
                "default": 1,
                "restrictions": {
                    "valueType": "number",
                    "requiredForEachCriterion": True,
                    "min": 0,
                    "max": None,
                    "allowed": None,
                },
            },
            {
                "key": "w_upper",
                "label": "Upper weight bounds",
                "type": "criterionMap",
                "scope": "perCriterion",
                "parameterStructureKey": "numberCriterion",
                "required": True,
                "default": 1,
                "restrictions": {
                    "valueType": "number",
                    "requiredForEachCriterion": True,
                    "min": 0,
                    "max": None,
                    "allowed": None,
                },
            },
            {
                "key": "iterations",
                "label": "Iterations",
                "type": "integer",
                "valueType": "integer",
                "scope": "global",
                "parameterStructureKey": "numberGlobal",
                "required": True,
                "default": 1000,
                "restrictions": {"min": 1, "max": None, "allowed": None},
            },
        ],
    ),
    ModelDefinition(
        api_model_key="vikor",
        api_endpoint_path="/vikor",
        request_model=GenericModelExecutionRequest,
        handler=execute_vikor,
        summary="Execute VIKOR",
        description=(
            "Executes the VIKOR method using aggregated expert decision matrices, "
            "criterion weights and criterion types."
        ),
        small_description=(
            "Compromise-ranking MCDM method that identifies alternatives closest "
            "to an acceptable group solution."
        ),
        extend_description=(
            "VIKOR is a multi-criteria decision-making method focused on compromise "
            "ranking. It evaluates alternatives according to group utility and individual "
            "regret, producing a ranking that highlights the best compromise solution "
            "under weighted benefit and cost criteria."
        ),
        operation_id="executeVikor",
        response_examples=VIKOR_RESPONSE_EXAMPLES,
        display_name="VIKOR",
        model_version="1.0.0",
        version_label="v1",
        more_info_url=None,
        alternative_evaluation_structure_key="alternativeCriteriaMatrix",
        supports_consensus=False,
        is_multi_criteria=True,
        uses_criteria_weights=True,
        uses_fuzzy_criteria_weights=False,
        uses_criterion_types=True,
        supported_domains=["numericContinuous", "numericDiscrete"],
        parameters=[
            {
                "key": "v",
                "label": "Strategy coefficient",
                "type": "number",
                "scope": "global",
                "parameterStructureKey": "numberGlobal",
                "required": True,
                "default": 0.5,
                "restrictions": {"min": 0, "max": 1, "allowed": None},
            },
        ],
    ),
    ModelDefinition(
        api_model_key="waspas",
        api_endpoint_path="/waspas",
        request_model=GenericModelExecutionRequest,
        handler=execute_waspas,
        summary="Execute WASPAS",
        description=(
            "Executes the WASPAS method using aggregated expert decision matrices, "
            "criterion weights and criterion types."
        ),
        small_description=(
            "Hybrid MCDM method that combines weighted sum and weighted product "
            "aggregation into a single ranking score."
        ),
        extend_description=(
            "WASPAS combines the Weighted Sum Model and the Weighted Product Model. "
            "It evaluates alternatives by blending additive and multiplicative utility "
            "scores through a configurable lambda coefficient, supporting weighted "
            "benefit and cost criteria."
        ),
        operation_id="executeWaspas",
        response_examples=WASPAS_RESPONSE_EXAMPLES,
        display_name="WASPAS",
        model_version="1.0.0",
        version_label="v1",
        more_info_url=None,
        alternative_evaluation_structure_key="alternativeCriteriaMatrix",
        supports_consensus=False,
        is_multi_criteria=True,
        uses_criteria_weights=True,
        uses_fuzzy_criteria_weights=False,
        uses_criterion_types=True,
        supported_domains=["numericContinuous", "numericDiscrete"],
        parameters=[
            {
                "key": "lambda",
                "label": "Lambda",
                "type": "number",
                "scope": "global",
                "parameterStructureKey": "numberGlobal",
                "required": True,
                "default": 0.5,
                "restrictions": {"min": 0, "max": 1, "allowed": None},
            },
        ],
    ),
    ModelDefinition(
        api_model_key="edas",
        api_endpoint_path="/edas",
        request_model=GenericModelExecutionRequest,
        handler=execute_edas,
        summary="Execute EDAS",
        description=(
            "Executes the EDAS method using aggregated expert decision matrices, "
            "criterion weights and criterion types."
        ),
        small_description=(
            "Distance-based MCDM method that ranks alternatives according to their "
            "positive and negative distances from the average solution."
        ),
        extend_description=(
            "EDAS evaluates alternatives by comparing each criterion value against "
            "the average solution. Alternatives are rewarded for positive distance "
            "from the average and penalized for negative distance, producing a final "
            "appraisal score under weighted benefit and cost criteria."
        ),
        operation_id="executeEdas",
        response_examples=EDAS_RESPONSE_EXAMPLES,
        display_name="EDAS",
        model_version="1.0.0",
        version_label="v1",
        more_info_url=None,
        alternative_evaluation_structure_key="alternativeCriteriaMatrix",
        supports_consensus=False,
        is_multi_criteria=True,
        uses_criteria_weights=True,
        uses_fuzzy_criteria_weights=False,
        uses_criterion_types=True,
        supported_domains=["numericContinuous", "numericDiscrete"],
    ),
    ModelDefinition(
        api_model_key="bwm",
        api_endpoint_path="/bwm",
        request_model=GenericModelExecutionRequest,
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
        model_version="1.0.0",
        version_label="v1",
        more_info_url=None,
        is_issue_model=False,
        is_criteria_weighting_model=True,
        alternative_evaluation_structure_key=None,
        criteria_weighting_structure_key="bestWorstCriteria",
        supports_consensus=False,
        is_multi_criteria=True,
        uses_criteria_weights=False,
        uses_fuzzy_criteria_weights=False,
        uses_criterion_types=False,
        supported_domains=[],
        parameters=[],
    ),
    ModelDefinition(
        api_model_key="cmcc",
        api_endpoint_path="/cmcc",
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
        model_version="1.0.0",
        version_label="v1",
        more_info_url=None,
        is_issue_model=False,
        alternative_evaluation_structure_key=None,
        supports_consensus=False,
        is_multi_criteria=None,
        uses_criteria_weights=False,
        uses_fuzzy_criteria_weights=False,
        uses_criterion_types=False,
        supported_domains=[],
        parameters=[
            {
                "key": "eps",
                "label": "Epsilon",
                "type": "number",
                "scope": "global",
                "parameterStructureKey": "numberGlobal",
                "required": False,
                "default": None,
                "restrictions": {"min": None, "max": None, "allowed": None},
            },
            {
                "key": "mu0",
                "label": "Mu 0",
                "type": "number",
                "scope": "global",
                "parameterStructureKey": "numberGlobal",
                "required": False,
                "default": None,
                "restrictions": {"min": 0, "max": 1, "allowed": None},
            },
            {
                "key": "lower_bound",
                "label": "Lower bound",
                "type": "number",
                "scope": "global",
                "parameterStructureKey": "numberGlobal",
                "required": False,
                "default": 0,
                "restrictions": {"min": None, "max": None, "allowed": None},
            },
            {
                "key": "upper_bound",
                "label": "Upper bound",
                "type": "number",
                "scope": "global",
                "parameterStructureKey": "numberGlobal",
                "required": False,
                "default": 1,
                "restrictions": {"min": None, "max": None, "allowed": None},
            },
        ],
    ),
)

__all__ = ["ModelDefinition", "MODEL_DEFINITIONS"]

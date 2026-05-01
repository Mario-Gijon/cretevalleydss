"""Registro central de rutas de modelos.

Flujo recomendado para añadir un nuevo modelo:
1. Implementar la lógica `run_*` en `models/`.
2. Definir el request schema en `schemas/model_requests.py` con `json_schema_extra`.
3. Crear un handler en `services/model_handlers.py`.
4. Definir ejemplos de respuesta en `response_examples`.
5. Registrar aquí una entrada `ModelRouteRegistration`.
"""

from dataclasses import dataclass
from typing import Any, Callable

from pydantic import BaseModel
from schemas.model_requests import (
    ArasRequest,
    BordaRequest,
    BwmRequest,
    CmccRequest,
    FuzzyTopsisRequest,
    HerreraViedmaRequest,
    TopsisRequest,
)
from services.model_handlers import (
    execute_aras,
    execute_borda,
    execute_bwm,
    execute_cmcc,
    execute_fuzzy_topsis,
    execute_herrera_viedma,
    execute_topsis,
)


@dataclass(frozen=True)
class ModelRouteRegistration:
    """Define el contrato mínimo para publicar y documentar un modelo en la API."""

    name: str
    path: str
    request_model: type[BaseModel]
    handler: Callable[[Any], Any]
    summary: str
    description: str
    operation_id: str
    response_examples: dict[str, dict[str, Any]]


MODEL_REGISTRY: tuple[ModelRouteRegistration, ...] = (
    ModelRouteRegistration(
        name="herrera_viedma_crp",
        path="/herrera_viedma_crp",
        request_model=HerreraViedmaRequest,
        handler=execute_herrera_viedma,
        summary="Execute Herrera-Viedma CRP",
        description=(
            "Ejecuta el proceso de consenso Herrera-Viedma CRP sobre matrices de "
            "preferencia por experto y criterio."
        ),
        operation_id="executeHerreraViedmaCrp",
        response_examples={
            "success": {
                "summary": "Successful execution",
                "value": {
                    "success": True,
                    "message": "Herrera Viedma CRP executed successfully",
                    "data": {
                        "alternatives_rankings": [1, 0, 2],
                        "cm": 0.88,
                        "collective_scores": [0.612345, 0.701234, 0.533211],
                        "collective_evaluations": {
                            "preference": [
                                [0.0, 0.68, 0.43],
                                [0.32, 0.0, 0.58],
                                [0.57, 0.42, 0.0],
                            ]
                        },
                        "plots_graphic": {
                            "expert_points": [[-0.1213, 0.0842], [0.1213, -0.0842]],
                            "collective_point": [0.0194, -0.0312],
                        },
                    },
                },
            },
            "error": {
                "summary": "Execution error",
                "value": {
                    "success": False,
                    "message": "Error executing Herrera Viedma CRP: <reason>",
                    "data": None,
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "field": None,
                        "details": None,
                    },
                },
            },
        },
    ),
    ModelRouteRegistration(
        name="topsis",
        path="/topsis",
        request_model=TopsisRequest,
        handler=execute_topsis,
        summary="Execute TOPSIS",
        description="Ejecuta TOPSIS clásico usando matrices agregadas de expertos.",
        operation_id="executeTopsis",
        response_examples={
            "success": {
                "summary": "Successful execution",
                "value": {
                    "success": True,
                    "message": "Topsis executed successfully",
                    "data": {
                        "collective_matrix": [[6.5, 5.5, 6.5], [7.5, 7.5, 5.5], [7.0, 7.5, 6.0]],
                        "matrix_used": [[6.5, 5.5, 6.5], [7.5, 7.5, 5.5], [7.0, 7.5, 6.0]],
                        "collective_scores": [0.4211, 0.6552, 0.5987],
                        "collective_ranking": [1, 2, 0],
                        "plots_graphic": {
                            "expert_points": [[-0.1187, 0.0492], [0.1187, -0.0492]],
                            "collective_point": [0.0074, -0.0031],
                        },
                    },
                },
            },
            "error": {
                "summary": "Execution error",
                "value": {
                    "success": False,
                    "message": "Error executing Topsis: <reason>",
                    "data": None,
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "field": None,
                        "details": None,
                    },
                },
            },
        },
    ),
    ModelRouteRegistration(
        name="borda",
        path="/borda",
        request_model=BordaRequest,
        handler=execute_borda,
        summary="Execute Borda",
        description="Ejecuta Borda sobre la matriz colectiva del grupo.",
        operation_id="executeBorda",
        response_examples={
            "success": {
                "summary": "Successful execution",
                "value": {
                    "success": True,
                    "message": "Borda executed successfully",
                    "data": {
                        "collective_matrix": [[6.5, 5.5], [7.5, 7.5], [7.0, 7.5]],
                        "matrix_used": [[6.5, 5.5], [7.5, 7.5], [7.0, 7.5]],
                        "collective_scores": [3.0, 5.0, 4.0],
                        "collective_ranking": [1, 2, 0],
                        "plots_graphic": {
                            "expert_points": [[-0.0932, 0.0721], [0.0932, -0.0721]],
                            "collective_point": [0.0017, -0.0149],
                        },
                    },
                },
            },
            "error": {
                "summary": "Execution error",
                "value": {
                    "success": False,
                    "message": "Error executing Borda: <reason>",
                    "data": None,
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "field": None,
                        "details": None,
                    },
                },
            },
        },
    ),
    ModelRouteRegistration(
        name="aras",
        path="/aras",
        request_model=ArasRequest,
        handler=execute_aras,
        summary="Execute ARAS",
        description="Ejecuta ARAS usando pesos y tipos de criterio proporcionados.",
        operation_id="executeAras",
        response_examples={
            "success": {
                "summary": "Successful execution",
                "value": {
                    "success": True,
                    "message": "Aras executed successfully",
                    "data": {
                        "collective_matrix": [[6.5, 5.5, 6.5], [7.5, 7.5, 5.5], [7.0, 7.5, 6.0]],
                        "matrix_used": [[6.5, 5.5, 6.5], [7.5, 7.5, 5.5], [7.0, 7.5, 6.0]],
                        "collective_scores": [0.812, 1.000, 0.934],
                        "collective_ranking": [1, 2, 0],
                        "plots_graphic": {
                            "expert_points": [[-0.1187, 0.0492], [0.1187, -0.0492]],
                            "collective_point": [0.0074, -0.0031],
                        },
                    },
                },
            },
            "error": {
                "summary": "Execution error",
                "value": {
                    "success": False,
                    "message": "Error executing Aras: <reason>",
                    "data": None,
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "field": None,
                        "details": None,
                    },
                },
            },
        },
    ),
    ModelRouteRegistration(
        name="fuzzy_topsis",
        path="/fuzzy_topsis",
        request_model=FuzzyTopsisRequest,
        handler=execute_fuzzy_topsis,
        summary="Execute Fuzzy TOPSIS",
        description="Ejecuta Fuzzy TOPSIS sobre matrices difusas de expertos.",
        operation_id="executeFuzzyTopsis",
        response_examples={
            "success": {
                "summary": "Successful execution",
                "value": {
                    "success": True,
                    "message": "Fuzzy TOPSIS executed successfully",
                    "data": {
                        "collective_matrix": [
                            [[1.0, 2.0, 3.0], [2.5, 3.5, 4.5]],
                            [[2.5, 3.5, 4.5], [4.0, 5.0, 6.0]],
                        ],
                        "collective_scores": [0.4871, 0.7124],
                        "collective_ranking": [1, 0],
                        "plots_graphic": {
                            "expert_points": [[-0.0711, 0.0579], [0.0711, -0.0579]],
                            "collective_point": [0.0142, 0.0033],
                        },
                    },
                },
            },
            "error": {
                "summary": "Execution error",
                "value": {
                    "success": False,
                    "message": "Error executing Fuzzy TOPSIS: <reason>",
                    "data": None,
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "field": None,
                        "details": None,
                    },
                },
            },
        },
    ),
    ModelRouteRegistration(
        name="bwm",
        path="/bwm",
        request_model=BwmRequest,
        handler=execute_bwm,
        summary="Execute BWM",
        description="Ejecuta Best-Worst Method a partir de datos de expertos.",
        operation_id="executeBwm",
        response_examples={
            "success": {
                "summary": "Successful execution",
                "value": {
                    "success": True,
                    "message": "BWM executed successfully",
                    "data": {
                        "success": True,
                        "weights": [0.53, 0.29, 0.18],
                        "n_experts": 2,
                        "mic_avg": [1.0, 3.5, 6.0],
                        "lic_avg": [6.0, 3.5, 1.0],
                    },
                },
            },
            "error": {
                "summary": "Execution error",
                "value": {
                    "success": False,
                    "message": "Error executing BWM",
                    "data": None,
                    "error": {
                        "code": "MODEL_EXECUTION_ERROR",
                        "field": None,
                        "details": None,
                    },
                },
            },
        },
    ),
    ModelRouteRegistration(
        name="cmcc",
        path="/cmcc",
        request_model=CmccRequest,
        handler=execute_cmcc,
        summary="Execute CMCC",
        description="Ejecuta el modelo CMCC con restricciones de consenso linealizadas.",
        operation_id="executeCmcc",
        response_examples={
            "success": {
                "summary": "Successful execution",
                "value": {
                    "success": True,
                    "message": "CMCC executed successfully",
                    "data": {
                        "success": True,
                        "message": "CMCC solved optimally",
                        "o_bar": [0.8, 0.8, 0.6, 0.6, 0.7],
                        "g": 0.7,
                        "consensus_level": 0.85,
                        "objective": 0.5,
                    },
                },
            },
            "error": {
                "summary": "Execution error",
                "value": {
                    "success": False,
                    "message": "Error executing CMCC: <reason>",
                    "data": None,
                    "error": {
                        "code": "MODEL_EXECUTION_ERROR",
                        "field": None,
                        "details": {
                            "success": False,
                            "message": "Solver ended with status Infeasible",
                        },
                    },
                },
            },
        },
    ),
)


_ADMIN_PRESERVED_FIELDS = [
    "smallDescription",
    "extendDescription",
    "moreInfoUrl",
]

_ISSUE_MODEL_TECHNICAL_FIELDS = [
    "modelFamilyKey",
    "modelVersion",
    "versionLabel",
    "parameters",
    "evaluationStructure",
    "lifecycleKind",
    "inputKind",
    "outputKind",
    "criterionTypes",
    "supportedDomains",
    "supportsScenarios",
    "isConsensus",
    "isMultiCriteria",
]

_CRITERION_TYPES = {
    "canonical": ["max", "min"],
    "aliases": {
        "benefit": "max",
        "cost": "min",
    },
}

_SYNC_AS_ISSUE_MODEL = {
    "safeToCreateIssueModel": True,
    "safeTechnicalFields": _ISSUE_MODEL_TECHNICAL_FIELDS,
    "preserveAdminFields": _ADMIN_PRESERVED_FIELDS,
}

_DO_NOT_SYNC_AS_ISSUE_MODEL = {
    "safeToCreateIssueModel": False,
    "safeTechnicalFields": [],
    "preserveAdminFields": _ADMIN_PRESERVED_FIELDS,
}

_NUMERIC_0_1_DOMAIN = {
    "numeric": {
        "enabled": True,
        "range": {
            "min": 0,
            "max": 1,
        },
    },
    "linguistic": {
        "enabled": False,
        "minLabels": None,
        "maxLabels": None,
        "oddOnly": False,
    },
}

_FUZZY_TOPSIS_DOMAIN = {
    "numeric": {
        "enabled": False,
        "range": {
            "min": None,
            "max": None,
        },
    },
    "linguistic": {
        "enabled": True,
        "minLabels": 3,
        "maxLabels": 9,
        "oddOnly": True,
    },
}

_WEIGHTS_PARAMETER = {
    "key": "weights",
    "label": "Criteria weights",
    "required": True,
    "type": "array",
    "default": None,
    "restrictions": {
        "min": 0,
        "max": 1,
        "length": "matchCriteria",
        "itemType": "number",
        "sum": 1,
        "normalize": True,
        "ordered": None,
        "allowed": None,
    },
}

_FUZZY_WEIGHTS_PARAMETER = {
    "key": "weights",
    "label": "Criteria fuzzy weights",
    "required": True,
    "type": "fuzzyArray",
    "default": None,
    "restrictions": {
        "min": 0,
        "max": 1,
        "length": "matchCriteria",
        "itemType": "fuzzyNumber",
        "ordered": "nonDecreasing",
        "sum": None,
        "normalize": None,
        "allowed": None,
    },
}


MODEL_MANIFEST_METADATA: dict[str, dict[str, Any]] = {
    "topsis": {
        "modelFamilyKey": "topsis",
        "modelVersion": "1.0.0",
        "versionLabel": "v1",
        "displayName": "TOPSIS",
        "aliases": ["TOPSIS"],
        "role": "issueModel",
        "status": "available",
        "publicInIssueCatalog": True,
        "evaluationStructure": "direct",
        "lifecycleKind": "singlePass",
        "isConsensus": False,
        "isMultiCriteria": True,
        "inputKind": "directCrispMatrix",
        "outputKind": "ranking",
        "supportsScenarios": True,
        "parameters": [_WEIGHTS_PARAMETER],
        "criterionTypes": _CRITERION_TYPES,
        "supportedDomains": _NUMERIC_0_1_DOMAIN,
        "moreInfoUrl": None,
        "sync": _SYNC_AS_ISSUE_MODEL,
    },
    "aras": {
        "modelFamilyKey": "aras",
        "modelVersion": "1.0.0",
        "versionLabel": "v1",
        "displayName": "ARAS",
        "aliases": ["ARAS"],
        "role": "issueModel",
        "status": "available",
        "publicInIssueCatalog": True,
        "evaluationStructure": "direct",
        "lifecycleKind": "singlePass",
        "isConsensus": False,
        "isMultiCriteria": True,
        "inputKind": "directCrispMatrix",
        "outputKind": "ranking",
        "supportsScenarios": True,
        "parameters": [_WEIGHTS_PARAMETER],
        "criterionTypes": _CRITERION_TYPES,
        "supportedDomains": _NUMERIC_0_1_DOMAIN,
        "moreInfoUrl": None,
        "sync": _SYNC_AS_ISSUE_MODEL,
    },
    "borda": {
        "modelFamilyKey": "borda",
        "modelVersion": "1.0.0",
        "versionLabel": "v1",
        "displayName": "BORDA",
        "aliases": ["BORDA"],
        "role": "issueModel",
        "status": "available",
        "publicInIssueCatalog": True,
        "evaluationStructure": "direct",
        "lifecycleKind": "singlePass",
        "isConsensus": False,
        "isMultiCriteria": True,
        "inputKind": "directCrispMatrix",
        "outputKind": "ranking",
        "supportsScenarios": True,
        "parameters": [],
        "criterionTypes": _CRITERION_TYPES,
        "supportedDomains": _NUMERIC_0_1_DOMAIN,
        "moreInfoUrl": None,
        "sync": _SYNC_AS_ISSUE_MODEL,
    },
    "fuzzy_topsis": {
        "modelFamilyKey": "fuzzy_topsis",
        "modelVersion": "1.0.0",
        "versionLabel": "v1",
        "displayName": "Fuzzy TOPSIS",
        "aliases": ["FUZZY TOPSIS", "Fuzzy TOPSIS"],
        "role": "issueModel",
        "status": "available",
        "publicInIssueCatalog": True,
        "evaluationStructure": "direct",
        "lifecycleKind": "singlePass",
        "isConsensus": False,
        "isMultiCriteria": True,
        "inputKind": "directFuzzyMatrix",
        "outputKind": "ranking",
        "supportsScenarios": True,
        "parameters": [_FUZZY_WEIGHTS_PARAMETER],
        "criterionTypes": _CRITERION_TYPES,
        "supportedDomains": _FUZZY_TOPSIS_DOMAIN,
        "moreInfoUrl": None,
        "sync": _SYNC_AS_ISSUE_MODEL,
    },
    "herrera_viedma_crp": {
        "modelFamilyKey": "herrera_viedma_crp",
        "modelVersion": "1.0.0",
        "versionLabel": "v1",
        "displayName": "Herrera Viedma CRP",
        "aliases": ["Herrera Viedma CRP", "HERRERA-VIEDMA CRP", "CRP"],
        "role": "issueModel",
        "status": "available",
        "publicInIssueCatalog": True,
        "evaluationStructure": "pairwiseAlternatives",
        "lifecycleKind": "thresholdConsensus",
        "isConsensus": True,
        "isMultiCriteria": False,
        "inputKind": "pairwisePreferenceMatrix",
        "outputKind": "consensusRanking",
        "supportsScenarios": True,
        "parameters": [
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
                "restrictions": {
                    "min": 0,
                    "max": 1,
                    "allowed": None,
                },
            },
        ],
        "criterionTypes": None,
        "supportedDomains": _NUMERIC_0_1_DOMAIN,
        "moreInfoUrl": None,
        "sync": _SYNC_AS_ISSUE_MODEL,
    },
    "bwm": {
        "modelFamilyKey": "bwm",
        "modelVersion": "1.0.0",
        "versionLabel": "v1",
        "displayName": "BWM",
        "aliases": ["BWM", "Best Worst Method"],
        "role": "weightingService",
        "status": "available",
        "publicInIssueCatalog": False,
        "evaluationStructure": None,
        "isConsensus": False,
        "isMultiCriteria": True,
        "inputKind": "bwmExpertComparisons",
        "outputKind": "weights",
        "supportsScenarios": False,
        "parameters": [
            {
                "key": "eps_penalty",
                "label": "Epsilon penalty",
                "type": "number",
                "required": False,
                "default": 1,
                "restrictions": {
                    "min": None,
                    "max": None,
                    "allowed": None,
                },
            }
        ],
        "criterionTypes": None,
        "supportedDomains": None,
        "moreInfoUrl": None,
        "sync": _DO_NOT_SYNC_AS_ISSUE_MODEL,
    },
    "cmcc": {
        "modelFamilyKey": "cmcc",
        "modelVersion": "1.0.0",
        "versionLabel": "v1",
        "displayName": "CMCC",
        "aliases": ["CMCC"],
        "role": "utilityModel",
        "status": "pendingIntegration",
        "publicInIssueCatalog": False,
        "evaluationStructure": None,
        "isConsensus": True,
        "isMultiCriteria": None,
        "inputKind": "cmccOpinionVector",
        "outputKind": "adjustedConsensusOpinions",
        "supportsScenarios": False,
        "parameters": [
            {
                "key": "eps",
                "label": "Epsilon",
                "type": "number",
                "required": False,
                "default": None,
                "restrictions": {
                    "min": None,
                    "max": None,
                    "allowed": None,
                },
            },
            {
                "key": "mu0",
                "label": "Mu 0",
                "type": "number",
                "required": False,
                "default": None,
                "restrictions": {
                    "min": 0,
                    "max": 1,
                    "allowed": None,
                },
            },
            {
                "key": "lower_bound",
                "label": "Lower bound",
                "type": "number",
                "required": False,
                "default": 0,
                "restrictions": {
                    "min": None,
                    "max": None,
                    "allowed": None,
                },
            },
            {
                "key": "upper_bound",
                "label": "Upper bound",
                "type": "number",
                "required": False,
                "default": 1,
                "restrictions": {
                    "min": None,
                    "max": None,
                    "allowed": None,
                },
            },
        ],
        "criterionTypes": None,
        "supportedDomains": None,
        "moreInfoUrl": None,
        "sync": _DO_NOT_SYNC_AS_ISSUE_MODEL,
    },
}

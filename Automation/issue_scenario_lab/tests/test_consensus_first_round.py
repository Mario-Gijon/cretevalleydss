from __future__ import annotations

from copy import deepcopy
from typing import Any

import pytest

from issue_scenario_lab.errors import ScenarioLabError
from issue_scenario_lab.scenarios.consensus_first_round import (
    PARAMETERS,
    _collective,
    _context,
    _domain,
    _pairwise,
    _payload,
    _select_model,
    _validate_collective,
    _validate_pairwise,
)


def _model() -> dict[str, Any]:
    return {
        "id": "hv",
        "apiModelKey": "herrera_viedma_crp",
        "modelKind": "issue",
        "visibleInIssueCreation": True,
        "manifestSync": {"isStale": False},
        "implementationStatus": "ready",
        "publicUsable": True,
        "supportsConsensus": True,
        "supportsConsensusSimulation": True,
        "usesCriteriaWeights": True,
        "usesExpertWeights": False,
        "usesFuzzyCriteriaWeights": False,
        "usesCriterionTypes": False,
        "evaluationStructureKey": "alternativePairwiseByCriterion",
        "supportedExpressionDomains": [{"typeKey": "numericContinuous", "constraints": {"min": 0, "max": 1}}],
        "parameters": [
            {"key": "ag_lq", "scope": "global", "parameterStructureKey": "intervalGlobal", "required": True, "restrictions": {"ordered": "strictIncreasing"}},
            {"key": "ex_lq", "scope": "global", "parameterStructureKey": "intervalGlobal", "required": True, "restrictions": {"ordered": "strictIncreasing"}},
            {"key": "b", "scope": "global", "parameterStructureKey": "selectGlobal", "required": True, "restrictions": {"allowed": [0.5, 0.7, 0.9, 1]}},
            {"key": "beta", "scope": "global", "parameterStructureKey": "numberGlobal", "required": True, "restrictions": {"min": 0, "max": 1}},
        ],
    }


def _context_payload() -> dict[str, Any]:
    ids = {"Balanced choice": "balanced", "Premium choice": "premium", "Budget choice": "budget"}
    criteria = {"Quality": "quality", "Cost": "cost"}
    empty = {
        criterion_id: {row: {column: {"value": ""} for column in ids.values() if column != row} for row in ids.values()} for criterion_id in criteria.values()
    }
    return {
        "stage": "alternativeEvaluation",
        "structureKey": "alternativePairwiseByCriterion",
        "consensusPhase": 0,
        "completed": False,
        "evaluationContext": {
            "issue": {"id": "issue", "currentStage": "alternativeEvaluation", "isConsensus": True},
            "model": {"apiModelKey": "herrera_viedma_crp"},
            "alternatives": [{"id": value, "name": name} for name, value in ids.items()],
            "leafCriteria": [
                {"id": value, "name": name, "expressionDomain": {"typeKey": "numericContinuous", "definition": {"min": 0, "max": 1}}}
                for name, value in criteria.items()
            ],
        },
        "payload": empty,
    }


def test_herrera_viedma_catalogue_and_explicit_parameters_succeed() -> None:
    assert _select_model({"models": [_model()]})["id"] == "hv"
    assert PARAMETERS == {"ag_lq": [0.3, 0.8], "ex_lq": [0.5, 1.0], "b": 1, "beta": 0.8}


@pytest.mark.parametrize(
    "field,value", [("supportsConsensus", False), ("supportsConsensusSimulation", False), ("usesExpertWeights", True), ("evaluationStructureKey", "wrong")]
)
def test_herrera_viedma_catalogue_rejects_incompatible_contract(field: str, value: Any) -> None:
    model = _model()
    model[field] = value
    with pytest.raises(ScenarioLabError, match="incompatible"):
        _select_model({"models": [model]})


def test_exact_continuous_domain_and_creation_payload() -> None:
    domain = _domain(
        {
            "globals": [
                {"id": "narrow", "typeKey": "numericContinuous", "definition": {"min": 0.1, "max": 0.9}},
                {"id": "full", "typeKey": "numericContinuous", "definition": {"min": 0, "max": 1}},
            ],
            "userDomains": [],
        }
    )
    assert domain["id"] == "full"
    payload = _payload("name", "hv", ["a@example.test", "b@example.test"], "full")
    assert payload["isConsensus"] is True and payload["simulateConsensus"] is False
    assert payload["criteriaWeightingConfig"]["payload"] == {"weightsByCriterion": {"criterion-quality": 0.60, "criterion-cost": 0.40}}


def test_empty_pairwise_and_distinct_reciprocal_payloads() -> None:
    response = _context_payload()
    context = _context(response, "issue")
    first, second = _pairwise(context, expert_b=False), _pairwise(context, expert_b=True)
    assert first != second
    _validate_pairwise(first, {"quality", "cost"}, {"balanced", "premium", "budget"})
    broken = deepcopy(first)
    broken["quality"]["balanced"]["premium"]["value"] = 0.5
    with pytest.raises(ScenarioLabError, match="reciprocal"):
        _validate_pairwise(broken, {"quality", "cost"}, {"balanced", "premium", "budget"})


def test_collective_uses_only_first_persisted_criterion() -> None:
    expected = _collective(_context(_context_payload(), "issue"))
    _validate_collective(deepcopy(expected), expected)
    with pytest.raises(ScenarioLabError, match="aggregated first criterion"):
        _validate_collective({"quality": expected["quality"], "cost": {}}, expected)

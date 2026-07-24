from __future__ import annotations

from copy import deepcopy
from typing import Any

import pytest

from issue_scenario_lab.errors import ScenarioLabError
from issue_scenario_lab.scenarios.no_consensus_expert_weights import (
    _issue_payload,
    _matrix,
    _positive_domain,
    _select_model,
    _validate_collective,
    _weighted,
)
from issue_scenario_lab.scenarios.numeric_values import positive_numeric_levels


def _waspas_model() -> dict[str, Any]:
    return {
        "id": "waspas-id",
        "apiModelKey": "waspas",
        "modelKind": "issue",
        "visibleInIssueCreation": True,
        "manifestSync": {"isStale": False},
        "implementationStatus": "ready",
        "publicUsable": True,
        "supportsConsensus": False,
        "supportsConsensusSimulation": False,
        "usesCriteriaWeights": True,
        "usesExpertWeights": True,
        "usesFuzzyCriteriaWeights": False,
        "usesCriterionTypes": True,
        "isMultiCriteria": True,
        "evaluationStructureKey": "alternativeCriteriaMatrix",
        "supportedExpressionDomains": [{"typeKey": "numericDiscrete"}],
        "parameters": [
            {
                "key": "lambda",
                "scope": "global",
                "parameterStructureKey": "numberGlobal",
                "required": True,
                "default": 0.5,
                "restrictions": {"min": 0, "max": 1, "allowed": None},
            }
        ],
    }


def _context() -> dict[str, Any]:
    domain = {"typeKey": "numericDiscrete", "definition": {"min": 0, "max": 12, "step": 2}}
    return {
        "alternatives": [{"id": "balanced", "name": "Balanced choice"}, {"id": "premium", "name": "Premium choice"}, {"id": "budget", "name": "Budget choice"}],
        "leafCriteria": [
            {"id": "quality", "name": "Quality", "type": "benefit", "expressionDomain": domain},
            {"id": "cost", "name": "Cost", "type": "cost", "expressionDomain": domain},
        ],
    }


def test_waspas_catalogue_selects_only_compatible_api_model_key() -> None:
    assert _select_model({"models": [_waspas_model()]})["id"] == "waspas-id"


@pytest.mark.parametrize(
    "field,value", [("usesExpertWeights", False), ("supportsConsensus", True), ("evaluationStructureKey", "wrong"), ("publicUsable", False)]
)
def test_waspas_catalogue_rejects_incompatible_models(field: str, value: Any) -> None:
    model = _waspas_model()
    model[field] = value
    with pytest.raises(ScenarioLabError, match="WASPAS model is incompatible"):
        _select_model({"models": [model]})


def test_positive_levels_skip_zero_and_respect_discrete_step() -> None:
    assert positive_numeric_levels({"typeKey": "numericDiscrete", "definition": {"min": 0, "max": 12, "step": 2}}) == (2.0, 8.0, 12.0)
    with pytest.raises(ScenarioLabError, match="three distinct positive"):
        positive_numeric_levels({"typeKey": "numericDiscrete", "definition": {"min": 0, "max": 2, "step": 2}})


def test_domain_selection_continues_past_non_positive_discrete_domain() -> None:
    chosen = _positive_domain(
        {
            "globals": [
                {"id": "bad", "typeKey": "numericDiscrete", "definition": {"min": 0, "max": 2, "step": 2}},
                {"id": "good", "typeKey": "numericDiscrete", "definition": {"min": 1, "max": 9, "step": 2}},
            ],
            "userDomains": [],
        },
        {"numericDiscrete"},
    )
    assert chosen["id"] == "good"


def test_creator_weight_payload_and_conflicting_positive_matrices_use_persisted_ids() -> None:
    payload = _issue_payload("name", "waspas-id", ["a@example.test", "b@example.test"], "domain")
    assert payload["paramValues"] == {"lambda": 0.5}
    assert payload["addedExperts"] == [{"email": "a@example.test", "weight": 0.75}, {"email": "b@example.test", "weight": 0.25}]
    assert payload["criteriaWeightingConfig"]["payload"] == {"weightsByCriterion": {"criterion-quality": 0.60, "criterion-cost": 0.40}}
    first, second = _matrix(_context(), expert_b=False), _matrix(_context(), expert_b=True)
    assert first != second
    assert all(value > 0 for matrix in (first, second) for row in matrix.values() for value in row.values())
    expected = _weighted(first, second)
    _validate_collective(deepcopy(expected), expected)
    broken = deepcopy(expected)
    broken["balanced"]["quality"] += 0.1
    with pytest.raises(ScenarioLabError, match="0.75/0.25"):
        _validate_collective(broken, expected)

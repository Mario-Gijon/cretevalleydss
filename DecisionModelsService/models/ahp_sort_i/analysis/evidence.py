"""Validated frozen execution evidence for AHPSort I analysis."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
import hashlib
import json
import math
from typing import Any

from fastapi.responses import JSONResponse

from schemas.model_requests import GenericModelExecutionRequest

from ..executor import _execution_input, execute_ahp_sort_i


NUMERIC_TOLERANCE = 1e-10


class AnalysisEvidenceUnavailable(ValueError):
    """Frozen execution input needed for optional analysis is unavailable."""


class InvalidOriginalExecution(ValueError):
    """The stored AHPSort I result conflicts with its frozen input."""


@dataclass(frozen=True)
class AHPSortIEvidence:
    """Validated input and reproduced output for one selected execution."""

    source_phase: int
    executed_rounds: int
    execution_id: str | None
    comparison_key: str
    frozen_input: dict[str, Any]
    profile_mode: str
    criterion_weights_by_id: dict[str, float]
    criteria: list[dict[str, Any]]
    alternatives: list[dict[str, Any]]
    categories: list[dict[str, Any]]
    profiles: list[dict[str, Any]]
    experts: list[dict[str, Any]]
    profile_tie_policy: str | None
    group_tie_policy: str | None
    executed_assignments: dict[str, str]
    baseline_result: dict[str, Any]


def _mapping(value: Any, field: str) -> dict[str, Any]:
    if not isinstance(value, Mapping):
        raise AnalysisEvidenceUnavailable(f"{field} must be an object")
    return dict(value)


def _executed_rounds(context: Any) -> list[dict[str, Any]]:
    if not isinstance(context, Mapping):
        raise AnalysisEvidenceUnavailable("Model issue analysis context must be an object")
    rounds = context.get("rounds")
    if not isinstance(rounds, list) or not rounds:
        raise AnalysisEvidenceUnavailable("No completed execution is available")

    normalized = []
    seen_phases: set[int] = set()
    for index, raw_round in enumerate(rounds):
        entry = _mapping(raw_round, f"context.rounds[{index}]")
        phase = entry.get("phase")
        if isinstance(phase, bool) or not isinstance(phase, int):
            raise AnalysisEvidenceUnavailable(
                f"context.rounds[{index}].phase must be an integer"
            )
        if phase in seen_phases:
            raise AnalysisEvidenceUnavailable("Executed phase IDs must be unique")
        seen_phases.add(phase)
        execution = entry.get("execution")
        if execution is not None:
            normalized.append(
                {
                    "phase": phase,
                    "execution": _mapping(
                        execution, f"context.rounds[{index}].execution"
                    ),
                }
            )

    if not normalized:
        raise AnalysisEvidenceUnavailable("No completed execution is available")
    return sorted(normalized, key=lambda item: item["phase"])


def _require_reproduced_value(actual: Any, expected: Any, field: str) -> None:
    """Require all reproduced fields, tolerating only JSON float round-tripping."""
    if isinstance(expected, Mapping):
        if not isinstance(actual, Mapping):
            raise InvalidOriginalExecution(f"Stored {field} is incomplete")
        for key, expected_value in expected.items():
            if key not in actual:
                raise InvalidOriginalExecution(f"Stored {field}.{key} is missing")
            _require_reproduced_value(actual[key], expected_value, f"{field}.{key}")
        return

    if isinstance(expected, list):
        if not isinstance(actual, list) or len(actual) != len(expected):
            raise InvalidOriginalExecution(f"Stored {field} does not match the frozen input")
        for index, (actual_value, expected_value) in enumerate(zip(actual, expected)):
            _require_reproduced_value(actual_value, expected_value, f"{field}[{index}]")
        return

    if isinstance(expected, bool):
        matches = isinstance(actual, bool) and actual is expected
    elif isinstance(expected, (int, float)):
        matches = False
        if not isinstance(actual, bool) and isinstance(actual, (int, float)):
            try:
                actual_number = float(actual)
                expected_number = float(expected)
            except (OverflowError, ValueError):
                pass
            else:
                matches = math.isfinite(actual_number) and math.isclose(
                    actual_number,
                    expected_number,
                    rel_tol=NUMERIC_TOLERANCE,
                    abs_tol=NUMERIC_TOLERANCE,
                )
    else:
        matches = actual == expected

    if not matches:
        raise InvalidOriginalExecution(
            f"Stored {field} conflicts with a reproduction of the frozen input"
        )


def _run_frozen_request(raw_input: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    try:
        request = GenericModelExecutionRequest.model_validate(raw_input)
        execution_input = _execution_input(request)
    except (KeyError, TypeError, ValueError) as error:
        raise InvalidOriginalExecution(
            f"The frozen AHPSort I request cannot be validated: {error}"
        ) from error

    response = execute_ahp_sort_i(request)
    if isinstance(response, JSONResponse):
        try:
            response_data = json.loads(response.body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise InvalidOriginalExecution(
                "The frozen AHPSort I request could not be reproduced"
            ) from error
    else:
        response_data = response

    if not isinstance(response_data, Mapping) or response_data.get("success") is not True:
        reason = (
            response_data.get("message")
            if isinstance(response_data, Mapping)
            else None
        )
        raise InvalidOriginalExecution(
            "The frozen AHPSort I request could not be reproduced"
            + (f": {reason}" if isinstance(reason, str) and reason else "")
        )
    reproduced = response_data.get("data")
    if not isinstance(reproduced, Mapping):
        raise InvalidOriginalExecution("Reproduced AHPSort I result is incomplete")
    return execution_input, dict(reproduced)


def _expert_names(raw_input: Mapping[str, Any]) -> dict[str, str]:
    names = {}
    for evaluation in raw_input.get("evaluations", []):
        if not isinstance(evaluation, Mapping):
            continue
        expert = evaluation.get("expert")
        if not isinstance(expert, Mapping):
            continue
        expert_id = expert.get("id")
        name = expert.get("name")
        if (
            isinstance(expert_id, str)
            and expert_id.strip()
            and isinstance(name, str)
            and name.strip()
        ):
            names[expert_id] = name.strip()
    return names


def extract_ahp_sort_i_evidence(context: Any) -> AHPSortIEvidence:
    """Validate the latest selected execution against its frozen AHPSort I input."""
    rounds = _executed_rounds(context)
    final_round = rounds[-1]
    phase = final_round["phase"]
    execution = final_round["execution"]

    model_context = execution.get("modelContext")
    if model_context is not None:
        if not isinstance(model_context, Mapping):
            raise AnalysisEvidenceUnavailable("The selected execution model context is invalid")
        model_key = model_context.get("apiModelKey")
        if model_key is not None and model_key != "ahp_sort_i":
            raise AnalysisEvidenceUnavailable(
                "The selected execution does not identify AHPSort I"
            )

    raw_input = execution.get("input")
    if not isinstance(raw_input, Mapping):
        raise AnalysisEvidenceUnavailable(
            "The frozen execution request needed for AHPSort I analysis is unavailable"
        )
    frozen_input = dict(raw_input)
    try:
        comparison_payload = json.dumps(
            frozen_input,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
            allow_nan=False,
        ).encode("utf-8")
    except (TypeError, ValueError) as error:
        raise AnalysisEvidenceUnavailable(
            "The frozen AHPSort I request cannot be compared across executions"
        ) from error

    execution_result = execution.get("result")
    if not isinstance(execution_result, Mapping):
        raise InvalidOriginalExecution("Stored AHPSort I execution result is missing")
    standard_result = execution_result.get("standardResult")
    if not isinstance(standard_result, Mapping):
        raise InvalidOriginalExecution("Stored AHPSort I sorting result is missing")

    execution_input, reproduced = _run_frozen_request(frozen_input)
    _require_reproduced_value(dict(standard_result), reproduced, "standardResult")

    weights = execution_input["criterionWeightsById"]
    criteria = [
        {
            "criterionId": item["id"],
            "name": item["name"],
            "weight": float(weights[item["id"]]),
        }
        for item in execution_input["criteria"]
    ]
    alternatives = [
        {"alternativeId": item["id"], "name": item["name"]}
        for item in execution_input["alternatives"]
    ]
    categories = [
        {
            "categoryId": item["categoryId"],
            "label": item["label"],
            "order": item["order"],
        }
        for item in execution_input["resultCategories"]
    ]
    request_names = _expert_names(frozen_input)
    experts = [
        {
            "expertId": item["expertId"],
            **(
                {"name": request_names[item["expertId"]]}
                if item["expertId"] in request_names
                else {}
            ),
            "alternativeProfileComparisons": item["comparisons"],
            "profileComparisons": item["profileComparisons"],
        }
        for item in execution_input["expertEvaluations"]
    ]
    assignments = {
        item["alternativeId"]: item["categoryId"]
        for item in reproduced["assignments"]
    }

    return AHPSortIEvidence(
        source_phase=phase,
        executed_rounds=len(rounds),
        execution_id=(
            str(execution["attemptId"])
            if execution.get("attemptId") is not None
            else None
        ),
        comparison_key=hashlib.sha256(comparison_payload).hexdigest(),
        frozen_input=frozen_input,
        profile_mode=execution_input["profileMode"],
        criterion_weights_by_id=dict(weights),
        criteria=criteria,
        alternatives=alternatives,
        categories=categories,
        profiles=[dict(item) for item in execution_input["profiles"]],
        experts=experts,
        profile_tie_policy=execution_input.get("tiePolicy"),
        group_tie_policy=execution_input.get("groupTiePolicy"),
        executed_assignments=assignments,
        baseline_result=reproduced,
    )


__all__ = [
    "AHPSortIEvidence",
    "AnalysisEvidenceUnavailable",
    "InvalidOriginalExecution",
    "NUMERIC_TOLERANCE",
    "extract_ahp_sort_i_evidence",
]

"""Validated frozen execution evidence for TOPSIS-Sort Model Analysis."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
import hashlib
import json
import math
from typing import Any

from schemas.model_requests import GenericModelExecutionRequest

from ..executor import _input
from ..run import TopsisSort2016Error, run_topsis_sort_2016


# Tolerates insignificant JSON float round-tripping while remaining far below
# any coefficient precision shown in the Analysis visualizations.
COEFFICIENT_TOLERANCE = 1e-10


class AnalysisEvidenceUnavailable(ValueError):
    """Frozen evidence is missing or incomplete for optional analysis."""


class InvalidOriginalExecution(ValueError):
    """Stored output conflicts with a reproduction of its frozen input."""


@dataclass(frozen=True)
class TopsisSort2016Evidence:
    source_phase: int
    executed_rounds: int
    execution_id: str | None
    comparison_key: str
    frozen_input: dict[str, Any]
    alternatives: list[dict[str, Any]]
    criteria: list[dict[str, Any]]
    collective_matrix: list[list[float]]
    profiles: list[dict[str, Any]]
    categories: list[dict[str, Any]]
    executed_assignments: dict[str, str]
    baseline_result: dict[str, Any]


def _mapping(value: Any, field: str) -> dict[str, Any]:
    if not isinstance(value, Mapping):
        raise AnalysisEvidenceUnavailable(f"{field} must be an object")
    return dict(value)


def _finite(value: Any, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise AnalysisEvidenceUnavailable(f"{field} must be a finite number")
    number = float(value)
    if not math.isfinite(number):
        raise AnalysisEvidenceUnavailable(f"{field} must be a finite number")
    return number


def _executed_rounds(context: dict[str, Any]) -> list[dict[str, Any]]:
    rounds = context.get("rounds")
    if not isinstance(rounds, list) or not rounds:
        raise AnalysisEvidenceUnavailable("No completed execution is available")

    normalized = []
    seen_phases: set[int] = set()
    for index, item in enumerate(rounds):
        entry = _mapping(item, f"context.rounds[{index}]")
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
                {"phase": phase, "execution": _mapping(execution, f"context.rounds[{index}].execution")}
            )

    if not normalized:
        raise AnalysisEvidenceUnavailable("No completed execution is available")
    return sorted(normalized, key=lambda item: item["phase"])


def _compare_numeric_mapping(
    actual: Any,
    expected: Mapping[str, float],
    field: str,
) -> None:
    if not isinstance(actual, Mapping) or set(actual) != set(expected):
        raise InvalidOriginalExecution(f"Stored {field} does not match the frozen input")
    for key, expected_value in expected.items():
        try:
            actual_value = _finite(actual[key], f"{field}.{key}")
        except AnalysisEvidenceUnavailable as error:
            raise InvalidOriginalExecution(str(error)) from error
        if not math.isclose(
            actual_value,
            float(expected_value),
            rel_tol=COEFFICIENT_TOLERANCE,
            abs_tol=COEFFICIENT_TOLERANCE,
        ):
            raise InvalidOriginalExecution(
                f"Stored {field}.{key} conflicts with a reproduction of the frozen input"
            )


def _compare_distance_mapping(
    actual: Any,
    expected: Mapping[str, Mapping[str, float]],
    field: str,
) -> None:
    if not isinstance(actual, Mapping) or set(actual) != set(expected):
        raise InvalidOriginalExecution(f"Stored {field} does not match the frozen input")
    for identifier, distances in expected.items():
        stored = actual.get(identifier)
        if not isinstance(stored, Mapping):
            raise InvalidOriginalExecution(f"Stored {field}.{identifier} is incomplete")
        if set(stored) != set(distances):
            raise InvalidOriginalExecution(f"Stored {field}.{identifier} is incomplete")
        for distance_key, expected_value in distances.items():
            try:
                actual_value = _finite(
                    stored[distance_key], f"{field}.{identifier}.{distance_key}"
                )
            except AnalysisEvidenceUnavailable as error:
                raise InvalidOriginalExecution(str(error)) from error
            if not math.isclose(
                actual_value,
                float(expected_value),
                rel_tol=COEFFICIENT_TOLERANCE,
                abs_tol=COEFFICIENT_TOLERANCE,
            ):
                raise InvalidOriginalExecution(
                    f"Stored {field}.{identifier}.{distance_key} conflicts with a reproduction"
                )


def _validate_stored_result(
    standard_result: dict[str, Any],
    reproduced: dict[str, Any],
) -> dict[str, str]:
    if standard_result.get("categoryOrderSemantics") != "lower-order-is-less-preferred":
        raise InvalidOriginalExecution("Stored sorting category order semantics are invalid")

    expected_categories = [
        {
            "categoryId": item["category_id"],
            "label": item["label"],
            "order": item["order"],
        }
        for item in reproduced["categories"]
    ]
    if standard_result.get("categories") != expected_categories:
        raise InvalidOriginalExecution(
            "Stored categories conflict with the frozen category configuration"
        )

    expected_assignments = {
        item["alternative_id"]: item["category_id"]
        for item in reproduced["assignments"]
    }
    raw_assignments = standard_result.get("assignments")
    if not isinstance(raw_assignments, list):
        raise InvalidOriginalExecution("Stored sorting assignments are missing")
    assignments: dict[str, str] = {}
    for index, item in enumerate(raw_assignments):
        if not isinstance(item, Mapping):
            raise InvalidOriginalExecution(f"Stored assignment {index} is invalid")
        alternative_id = item.get("alternativeId")
        category_id = item.get("categoryId")
        if not isinstance(alternative_id, str) or not isinstance(category_id, str):
            raise InvalidOriginalExecution(f"Stored assignment {index} is invalid")
        if alternative_id in assignments:
            raise InvalidOriginalExecution("Stored alternatives have duplicate assignments")
        assignments[alternative_id] = category_id
    if assignments != expected_assignments:
        raise InvalidOriginalExecution(
            "Stored assignments conflict with a reproduction of the frozen input"
        )

    diagnostics = standard_result.get("diagnostics")
    if not isinstance(diagnostics, Mapping):
        raise AnalysisEvidenceUnavailable(
            "Stored TOPSIS-Sort closeness and distance diagnostics are unavailable"
        )
    expected_diagnostics = reproduced["diagnostics"]
    for field in (
        "closeness_by_alternative_id",
        "closeness_by_profile_id",
    ):
        expected = expected_diagnostics[field]
        actual = diagnostics.get(field)
        if not isinstance(actual, Mapping) or set(actual) != set(expected):
            raise AnalysisEvidenceUnavailable(
                f"Stored {field} diagnostics are unavailable or incomplete"
            )
        _compare_numeric_mapping(actual, expected, f"diagnostics.{field}")
    for field in ("distances_by_alternative_id", "distances_by_profile_id"):
        expected = expected_diagnostics[field]
        actual = diagnostics.get(field)
        if not isinstance(actual, Mapping) or set(actual) != set(expected):
            raise AnalysisEvidenceUnavailable(
                f"Stored {field} diagnostics are unavailable or incomplete"
            )
        _compare_distance_mapping(actual, expected, f"diagnostics.{field}")
    return assignments


def extract_topsis_sort_2016_evidence(
    context: dict[str, Any],
) -> TopsisSort2016Evidence:
    """Validate the latest selected execution against its frozen request."""
    if not isinstance(context, dict):
        raise AnalysisEvidenceUnavailable("Model issue analysis context must be an object")

    rounds = _executed_rounds(context)
    final_round = rounds[-1]
    phase = final_round["phase"]
    execution = final_round["execution"]
    model_context = execution.get("modelContext") or {}
    if isinstance(model_context, Mapping):
        model_key = model_context.get("apiModelKey")
        if model_key is not None and model_key != "topsis_sort_2016":
            raise AnalysisEvidenceUnavailable(
                "The selected execution does not identify TOPSIS-Sort 2016"
            )

    raw_input = execution.get("input")
    if not isinstance(raw_input, Mapping):
        raise AnalysisEvidenceUnavailable(
            "The frozen execution request needed for TOPSIS-Sort analysis is unavailable"
        )
    frozen_input = dict(raw_input)
    try:
        request = GenericModelExecutionRequest.model_validate(frozen_input)
        execution_input = _input(request)
    except (KeyError, TypeError, ValueError) as error:
        raise AnalysisEvidenceUnavailable(
            f"The frozen TOPSIS-Sort request is incomplete: {error}"
        ) from error

    run_input = {
        key: execution_input[key]
        for key in ("alternatives", "criteria", "profiles", "categories")
    }
    try:
        reproduced = run_topsis_sort_2016(**run_input)
    except TopsisSort2016Error as error:
        raise InvalidOriginalExecution(
            f"The frozen request cannot reproduce a valid TOPSIS-Sort result: {error}"
        ) from error

    result = execution.get("result")
    if not isinstance(result, Mapping):
        raise InvalidOriginalExecution("Stored TOPSIS-Sort execution result is missing")
    standard_result = result.get("standardResult")
    if not isinstance(standard_result, Mapping):
        raise InvalidOriginalExecution("Stored sorting@1 result is missing")
    assignments = _validate_stored_result(dict(standard_result), reproduced)

    request_context = frozen_input.get("context") or {}
    if not isinstance(request_context, Mapping):
        raise AnalysisEvidenceUnavailable("The frozen request context is invalid")
    names_by_id = {
        item.get("id"): item.get("name")
        for item in request_context.get("alternatives", [])
        if isinstance(item, Mapping)
    }
    criterion_names_by_id = {
        item.get("id"): item.get("name")
        for item in request_context.get("criteria", [])
        if isinstance(item, Mapping)
    }
    alternatives = [
        {
            "alternativeId": item["alternative_id"],
            "name": str(names_by_id.get(item["alternative_id"]) or item["alternative_id"]),
            "valuesByCriterionId": dict(item["values_by_criterion_id"]),
        }
        for item in execution_input["alternatives"]
    ]
    criteria = [
        {
            "criterionId": item["criterion_id"],
            "name": str(criterion_names_by_id.get(item["criterion_id"]) or item["criterion_id"]),
            "direction": item["direction"],
            "weight": float(item["weight"]),
            "minimum": item["minimum"],
            "maximum": item["maximum"],
        }
        for item in execution_input["criteria"]
    ]
    collective_matrix = [
        [float(value) for value in row]
        for row in execution_input["collective_matrix"].tolist()
    ]

    try:
        comparison_payload = json.dumps(
            frozen_input,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
        ).encode("utf-8")
    except (TypeError, ValueError) as error:
        raise AnalysisEvidenceUnavailable(
            "The frozen request cannot be compared across executions"
        ) from error

    return TopsisSort2016Evidence(
        source_phase=phase,
        executed_rounds=len(rounds),
        execution_id=(
            str(execution["attemptId"])
            if execution.get("attemptId") is not None
            else None
        ),
        comparison_key=hashlib.sha256(comparison_payload).hexdigest(),
        frozen_input=frozen_input,
        alternatives=alternatives,
        criteria=criteria,
        collective_matrix=collective_matrix,
        profiles=execution_input["profiles"],
        categories=execution_input["categories"],
        executed_assignments=assignments,
        baseline_result=reproduced,
    )


__all__ = [
    "AnalysisEvidenceUnavailable",
    "COEFFICIENT_TOLERANCE",
    "InvalidOriginalExecution",
    "TopsisSort2016Evidence",
    "extract_topsis_sort_2016_evidence",
]

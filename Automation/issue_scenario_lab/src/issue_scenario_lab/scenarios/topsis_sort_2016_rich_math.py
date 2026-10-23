"""Offline validation of the rich TOPSIS-Sort Scenario Lab fixture.

This helper runs inside DecisionModelsService's Python environment so it uses
the exact existing MCC, TOPSIS-Sort, projection, and Model Analysis code.
"""

from __future__ import annotations

import json
import math
import sys
from collections import Counter
from pathlib import Path
from typing import Any


def _project_root() -> Path:
    # .../Automation/issue_scenario_lab/src/issue_scenario_lab/scenarios/<file>
    return Path(__file__).resolve().parents[5]


def _close_maps(actual: dict[str, Any], expected: dict[str, Any], *, tolerance: float = 1e-8) -> bool:
    return set(actual) == set(expected) and all(
        isinstance(actual[key], (int, float)) and math.isfinite(float(actual[key])) and abs(float(actual[key]) - float(expected[key])) <= tolerance
        for key in expected
    )


def validate_fixture(
    fixture_path: Path,
    *,
    include_interpretation: bool = False,
) -> dict[str, Any]:
    project_root = _project_root()
    service_root = project_root / "DecisionModelsService"
    sys.path.insert(0, str(service_root))

    import numpy as np
    from models.topsis_sort_2016.analysis import analyze_issue
    from models.topsis_sort_2016.executor import (
        _output,
        build_plots_graphic_from_execution_input,
    )
    from models.topsis_sort_2016.run import run_topsis_sort_2016
    from services.criteria_weights_consensus.mcc_weights import solve_mcc_weights

    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
    criteria = fixture["criteria"]
    criteria_keys = [item["key"] for item in criteria]
    expert_weights = fixture["weightsByExpert"]
    mcc = solve_mcc_weights(
        criteria=[{"id": item["key"], "name": item["name"]} for item in criteria],
        expert_weights_by_expert=expert_weights,
    )
    collective_weights = mcc["weightsByCriterion"]
    if not _close_maps(collective_weights, fixture["expectedCriteriaWeights"]):
        raise ValueError("MCC collective weights differ from the fixture's frozen reference")

    matrix_by_expert = fixture["evaluationMatricesByExpert"]
    if len(matrix_by_expert) != 4 or len({json.dumps(value, sort_keys=True) for value in matrix_by_expert.values()}) != 4:
        raise ValueError("the fixture must provide four distinct expert matrices")
    alternative_keys = [item["key"] for item in fixture["alternatives"]]
    individual_matrices = []
    for matrix in matrix_by_expert.values():
        if set(matrix) != set(alternative_keys):
            raise ValueError("an expert matrix is missing or adds alternatives")
        rows = []
        for alternative_key in alternative_keys:
            row = matrix[alternative_key]
            if set(row) != set(criteria_keys):
                raise ValueError("an expert matrix is missing or adds criteria")
            rows.append([float(row[key]) for key in criteria_keys])
        individual_matrices.append(rows)
    collective_matrix = np.mean(np.asarray(individual_matrices, dtype=float), axis=0)

    alternatives = [
        {
            "alternative_id": item["key"],
            "values_by_criterion_id": {key: float(collective_matrix[index, column]) for column, key in enumerate(criteria_keys)},
        }
        for index, item in enumerate(fixture["alternatives"])
    ]
    model_criteria = [
        {
            "criterion_id": item["key"],
            "direction": item["type"],
            "weight": float(collective_weights[item["key"]]),
            "minimum": fixture["scale"]["minimum"],
            "maximum": 10,
        }
        for item in criteria
    ]
    profiles = [
        {
            "profile_id": profile["profileId"],
            "category_id": profile["categoryId"],
            "values_by_criterion_id": profile["valuesByCriterionId"],
        }
        for profile in fixture["boundaryProfiles"]["profiles"]
    ]
    categories = [
        {
            "category_id": item["categoryId"],
            "label": item["label"],
            "order": item["order"],
        }
        for item in fixture["orderedCategories"]
    ]
    result = run_topsis_sort_2016(
        alternatives=alternatives,
        criteria=model_criteria,
        profiles=profiles,
        categories=categories,
    )
    assignments = {item["alternative_id"]: item["category_id"] for item in result["assignments"]}
    if assignments != fixture["expectedAssignments"]:
        raise ValueError("TOPSIS-Sort assignments differ from the fixture's frozen reference")
    if len(assignments) != 10 or any(not 0 <= value <= 1 for value in result["diagnostics"]["closeness_by_alternative_id"].values()):
        raise ValueError("baseline assignments or closeness coefficients are incomplete")
    for distances in [*result["diagnostics"]["distances_by_alternative_id"].values(), *result["diagnostics"]["distances_by_profile_id"].values()]:
        if any(not math.isfinite(float(value)) or float(value) < 0 for value in distances.values()):
            raise ValueError("baseline ideal distances must be finite and non-negative")

    criteria_by_key = {item["key"]: item for item in criteria}
    alternatives_by_key = {item["key"]: item for item in fixture["alternatives"]}
    frozen_input = {
        "context": {
            "alternatives": [{"id": key, "name": alternatives_by_key[key]["name"]} for key in alternative_keys],
            "criteria": [
                {
                    "id": key,
                    "name": criteria_by_key[key]["name"],
                    "type": criteria_by_key[key]["type"],
                    "expressionDomain": {
                        "typeKey": "numericContinuous",
                        "definition": {"min": fixture["scale"]["minimum"], "max": fixture["scale"]["maximum"]},
                    },
                }
                for key in criteria_keys
            ],
        },
        "modelParameters": {
            "weights": collective_weights,
            "orderedCategories": fixture["orderedCategories"],
            "boundaryProfiles": fixture["boundaryProfiles"],
        },
        "evaluations": [
            {
                "expert": {"id": alias, "email": f"{alias}@fixture.invalid", "name": alias.replace("_", " ").title()},
                "payload": {alternative_key: dict(matrix[alternative_key]) for alternative_key in alternative_keys},
            }
            for alias, matrix in matrix_by_expert.items()
        ],
    }
    projection = build_plots_graphic_from_execution_input(frozen_input)
    if projection.get("reason") or len(projection.get("expert_points", [])) != 4:
        raise ValueError(f"the Expert–collective projection is unavailable: {projection.get('reason')}")
    projected_experts = [tuple(point) for point in projection["expert_points"]]
    if len(set(projected_experts)) < 2 or len(set(matrix_by_expert)) != 4:
        raise ValueError("independent expert matrices must produce non-identical projected points")

    context = {
        "rounds": [
            {
                "phase": 0,
                "execution": {
                    "modelContext": {"apiModelKey": "topsis_sort_2016"},
                    "input": frozen_input,
                    "result": {"standardResult": _output(result)},
                },
            }
        ]
    }
    analysis = analyze_issue(context)
    facts = analysis.get("facts", {})
    if facts.get("status") != "available" or len(facts.get("alternatives", [])) != 10 or len(facts.get("profiles", [])) != 4:
        raise ValueError("TOPSIS-Sort Model Analysis did not reproduce the complete baseline")
    sensitivity_items = facts.get("sensitivity", {}).get("items", [])
    if len(sensitivity_items) != 6:
        raise ValueError("Criterion weight sensitivity must include all six criteria")
    changed_criteria = [
        item["criterionId"] for item in sensitivity_items if any(point.get("available") and point.get("changedAssignments") for point in item.get("points", []))
    ]
    if len(changed_criteria) < 2:
        raise ValueError("weight sensitivity must produce category changes for at least two criteria")
    baseline_assignments = {item["alternativeId"]: item["categoryId"] for item in facts["alternatives"]}
    for item in sensitivity_items:
        baseline_point = next(
            (point for point in item.get("points", []) if point.get("variedWeight") == item["configuredWeight"]),
            None,
        )
        if (
            not isinstance(baseline_point, dict)
            or baseline_point.get("available") is not True
            or {entry["alternativeId"]: entry["categoryId"] for entry in baseline_point.get("assignments", [])} != baseline_assignments
        ):
            raise ValueError("sensitivity baseline point does not reproduce the configured MCC assignments")

    summary = {
        "mccWeightsByCriterion": collective_weights,
        "assignmentsByAlternativeKey": assignments,
        "categoryCounts": dict(Counter(assignments.values())),
        "sensitivityChangedCriteria": changed_criteria,
        "projection": projection,
        "analysisStatus": facts["status"],
        "analysisSectionIds": [section.get("id") for section in analysis.get("sections", [])],
    }
    if include_interpretation:
        summary["interpretation"] = analysis["interpretation"]
    return summary


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: topsis_sort_2016_rich_math.py FIXTURE.json")
    summary = validate_fixture(Path(sys.argv[1]))
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()

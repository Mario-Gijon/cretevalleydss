"""DecisionModelsService adapter for the original TOPSIS-Sort (2016) core."""

from collections.abc import Mapping
import math
from numbers import Real
from typing import Any

import numpy as np
from fastapi.responses import JSONResponse

from models.shared_alternative_matrix import extract_id_keyed_alternative_criteria_input
from models.shared_expression_domains import expression_domain_type_key
from schemas.model_requests import GenericModelExecutionRequest
from services.criteria_weights import ordered_numeric_weights
from services.model_executors.responses import error_response, success_response
from utils.get_plots_graphics_from_matrices import get_plots_graphics_from_matrices

from .run import run_topsis_sort_2016


NUMERIC_DOMAIN_TYPES = {"numericContinuous", "numericDiscrete"}


def _finite_number(value: Any, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, Real):
        raise ValueError(f"{field} must be a finite numeric value")
    number = float(value)
    if not math.isfinite(number):
        raise ValueError(f"{field} must be a finite numeric value")
    return number


def _numeric_domain(
    expression_domain: Any,
    field: str,
) -> tuple[float, float, float | None]:
    type_key = expression_domain_type_key(expression_domain)
    if type_key not in NUMERIC_DOMAIN_TYPES:
        raise ValueError(
            f"{field} must use numericContinuous or numericDiscrete; received '{type_key or 'unknown'}'"
        )

    definition = expression_domain.get("definition")
    if not isinstance(definition, Mapping):
        raise ValueError(f"{field}.definition must contain numeric domain limits")

    minimum = _finite_number(definition.get("min"), f"{field}.definition.min")
    maximum = _finite_number(definition.get("max"), f"{field}.definition.max")
    if minimum >= maximum:
        raise ValueError(f"{field}.definition.min must be less than max")

    step = None
    if type_key == "numericDiscrete":
        step = _finite_number(definition.get("step"), f"{field}.definition.step")
        if step <= 0:
            raise ValueError(f"{field}.definition.step must be greater than 0")
    return minimum, maximum, step


def _check_evaluation_domain(
    value: float,
    *,
    criterion: Mapping[str, Any],
    field: str,
) -> None:
    minimum, maximum, step = _numeric_domain(
        criterion.get("expressionDomain"), f"{field}.expressionDomain"
    )
    if not minimum <= value <= maximum:
        raise ValueError(f"{field} must be within numeric domain [{minimum}, {maximum}]")

    if step is not None:
        offset = (value - minimum) / step
        if abs(offset - round(offset)) > 1e-9:
            raise ValueError(f"{field} must align with the configured discrete step")


def _evaluation_value(value: Any, criterion: dict[str, Any], field: str) -> float:
    if value is None or value == "":
        raise ValueError(f"{field} is required")

    raw_values = value if isinstance(value, list) else [value]
    if not raw_values:
        raise ValueError(f"{field} must contain at least one numeric value")

    values = []
    for index, raw_value in enumerate(raw_values):
        value_field = f"{field}[{index}]" if isinstance(value, list) else field
        numeric_value = _finite_number(raw_value, value_field)
        _check_evaluation_domain(
            numeric_value,
            criterion=criterion,
            field=value_field,
        )
        values.append(numeric_value)
    # Match the service's existing matrix executors: average multiple values
    # recorded for one expert/cell, then average the expert matrices below.
    return float(sum(values) / len(values))


def _expert_key(expert: dict[str, Any], index: int) -> str:
    for field in ("id", "email", "name"):
        value = expert.get(field)
        if value is not None:
            normalized = str(value).strip()
            if normalized:
                return normalized
    return f"expert_{index + 1}"


def _expert_label(expert: Mapping[str, Any], index: int) -> str:
    for field in ("name", "email", "id"):
        value = expert.get(field)
        if value is not None:
            normalized = str(value).strip()
            if normalized:
                return normalized
    return f"Expert {index + 1}"


def _criterion_direction(value: Any) -> str:
    key = str(value or "").strip().lower()
    if key in {"benefit", "max"}:
        return "benefit"
    if key in {"cost", "min"}:
        return "cost"
    raise ValueError(f"Unsupported criterion type: {value}")


def _matrix_evidence(payload: GenericModelExecutionRequest) -> dict[str, Any]:
    context = payload.context or {}
    criteria_context = context.get("criteria") or []

    # Fail early on non-numeric domains, including for direct adapter callers.
    for index, criterion in enumerate(criteria_context):
        if not isinstance(criterion, Mapping):
            raise ValueError(f"context.criteria[{index}] must be an object")
        _numeric_domain(
            criterion.get("expressionDomain"),
            f"context.criteria[{index}].expressionDomain",
        )

    extracted = extract_id_keyed_alternative_criteria_input(
        payload=payload,
        expert_key_fn=_expert_key,
        evaluation_value_fn=_evaluation_value,
    )
    ranges = []
    for index, criterion in enumerate(extracted["criterion_items"]):
        minimum, maximum, _ = _numeric_domain(
            criterion["expressionDomain"],
            f"context.criteria[{index}].expressionDomain",
        )
        ranges.append([minimum, maximum])

    evaluations = list(payload.evaluations or [])
    expert_keys = list(extracted["matrices"])
    expert_labels = [
        _expert_label(evaluation.get("expert") or {}, index)
        for index, evaluation in enumerate(evaluations)
    ]
    expert_emails = [
        (str((evaluation.get("expert") or {}).get("email") or "").strip() or None)
        for evaluation in evaluations
    ]
    expert_matrices = [
        np.asarray(extracted["matrices"][key], dtype=float) for key in expert_keys
    ]
    collective_matrix = np.mean(expert_matrices, axis=0)
    return {
        **extracted,
        "expert_keys": expert_keys,
        "expert_labels": expert_labels,
        "expert_emails": expert_emails,
        "visualization_ranges": ranges,
        "expert_matrices": expert_matrices,
        "collective_matrix": collective_matrix,
    }


def _is_finite_projection_point(point: Any) -> bool:
    return (
        isinstance(point, list)
        and len(point) == 2
        and all(
            isinstance(value, Real) and math.isfinite(float(value))
            for value in point
        )
    )


def _plots_graphic(matrix_evidence: Mapping[str, Any]) -> dict[str, Any]:
    try:
        projection = get_plots_graphics_from_matrices(
            matrix_evidence["expert_matrices"],
            matrix_evidence["collective_matrix"],
            method="MDS",
            feature_ranges=matrix_evidence["visualization_ranges"],
        )
        if projection.get("reason"):
            return projection

        expert_points = projection.get("expert_points")
        collective_point = projection.get("collective_point")
        expert_keys = matrix_evidence["expert_keys"]
        expert_labels = matrix_evidence["expert_labels"]
        expert_emails = matrix_evidence["expert_emails"]
        if (
            not isinstance(expert_points, list)
            or len(expert_points) != len(expert_keys)
            or len(expert_labels) != len(expert_keys)
            or len(expert_emails) != len(expert_keys)
            or not all(_is_finite_projection_point(point) for point in expert_points)
            or not _is_finite_projection_point(collective_point)
        ):
            return {"reason": "projection_failed"}
        if len(set(expert_keys)) != len(expert_keys):
            return {"reason": "duplicate_expert_identity"}

        result = {
            **projection,
            "expert_ids": expert_keys,
            "expert_labels": expert_labels,
        }
        identical_groups: list[list[str]] = []
        remaining = set(range(len(expert_keys)))
        while remaining:
            index = min(remaining)
            group = [
                candidate
                for candidate in sorted(remaining)
                if np.array_equal(
                    matrix_evidence["expert_matrices"][index],
                    matrix_evidence["expert_matrices"][candidate],
                )
            ]
            remaining.difference_update(group)
            if len(group) > 1:
                identical_groups.append([expert_keys[item] for item in group])
        result["identical_evaluation_groups"] = identical_groups
        result["collective_identical_expert_ids"] = [
            expert_key
            for expert_key, expert_matrix in zip(
                expert_keys, matrix_evidence["expert_matrices"]
            )
            if np.array_equal(expert_matrix, matrix_evidence["collective_matrix"])
        ]
        if any(expert_emails):
            result["expert_emails"] = expert_emails
        return result
    except Exception:
        # Optional analytical evidence must never make a valid classification
        # fail if a visualization backend encounters an unexpected edge case.
        return {"reason": "projection_failed"}


def build_plots_graphic_from_execution_input(
    execution_input: Mapping[str, Any],
) -> dict[str, Any]:
    """Rebuild presentation-only evidence from a frozen execution request."""
    payload = GenericModelExecutionRequest.model_validate(execution_input)
    return _plots_graphic(_matrix_evidence(payload))


def _categories(model_parameters: Mapping[str, Any]) -> list[dict[str, Any]]:
    raw_categories = model_parameters.get("orderedCategories")
    if not isinstance(raw_categories, list):
        raise ValueError("modelParameters.orderedCategories must be an array")

    categories = []
    for index, category in enumerate(raw_categories):
        if not isinstance(category, Mapping):
            raise ValueError(
                f"modelParameters.orderedCategories[{index}] must be an object"
            )
        unknown_fields = set(category) - {"categoryId", "label", "order"}
        if unknown_fields:
            unexpected = sorted(unknown_fields)[0]
            raise ValueError(
                f"modelParameters.orderedCategories[{index}] "
                f"contains unsupported field '{unexpected}'"
            )
        category_id = category.get("categoryId")
        label = category.get("label")
        order = category.get("order")
        if not isinstance(category_id, str) or not category_id.strip():
            raise ValueError(
                f"modelParameters.orderedCategories[{index}].categoryId is required"
            )
        if not isinstance(label, str) or not label.strip():
            raise ValueError(
                f"modelParameters.orderedCategories[{index}].label is required"
            )
        if isinstance(order, bool) or not isinstance(order, int) or order < 0:
            raise ValueError(
                f"modelParameters.orderedCategories[{index}].order "
                "must be a non-negative integer"
            )
        categories.append(
            {
                "category_id": category_id.strip(),
                "label": label.strip(),
                "order": order,
            }
        )
    return categories


def _profiles(model_parameters: Mapping[str, Any]) -> list[dict[str, Any]]:
    raw_boundary_profiles = model_parameters.get("boundaryProfiles")
    if not isinstance(raw_boundary_profiles, Mapping):
        raise ValueError("modelParameters.boundaryProfiles must be an object")
    if set(raw_boundary_profiles) != {"profiles"}:
        raise ValueError(
            "modelParameters.boundaryProfiles must contain only a profiles array"
        )

    raw_profiles = raw_boundary_profiles.get("profiles")
    if not isinstance(raw_profiles, list):
        raise ValueError("modelParameters.boundaryProfiles.profiles must be an array")

    profiles = []
    for index, profile in enumerate(raw_profiles):
        if not isinstance(profile, Mapping):
            profiles.append(profile)
            continue
        unknown_fields = set(profile) - {
            "profileId",
            "categoryId",
            "valuesByCriterionId",
        }
        if unknown_fields:
            unexpected = sorted(unknown_fields)[0]
            raise ValueError(
                f"modelParameters.boundaryProfiles.profiles[{index}] "
                f"contains unsupported field '{unexpected}'"
            )
        values = profile.get("valuesByCriterionId")
        profiles.append(
            {
                "profile_id": profile.get("profileId"),
                "category_id": profile.get("categoryId"),
                "values_by_criterion_id": values,
            }
        )
    return profiles


def _input(payload: GenericModelExecutionRequest) -> dict[str, Any]:
    model_parameters = payload.modelParameters or {}
    matrix_evidence = _matrix_evidence(payload)
    extracted = matrix_evidence
    weights = ordered_numeric_weights(
        payload,
        allow_empty=False,
        error_label="weights",
    )
    if len(weights) != len(extracted["criterion_ids"]):
        raise ValueError("weights length must match the number of criteria")

    criteria = []
    for index, criterion in enumerate(extracted["criterion_items"]):
        minimum, maximum = matrix_evidence["visualization_ranges"][index]
        criteria.append(
            {
                "criterion_id": criterion["id"],
                "direction": _criterion_direction(criterion.get("type")),
                "weight": weights[index],
                "minimum": minimum,
                "maximum": maximum,
            }
        )

    collective_matrix = matrix_evidence["collective_matrix"]
    alternatives = [
        {
            "alternative_id": alternative_id,
            "values_by_criterion_id": {
                criterion_id: float(collective_matrix[row_index, column_index])
                for column_index, criterion_id in enumerate(extracted["criterion_ids"])
            },
        }
        for row_index, alternative_id in enumerate(extracted["alternative_ids"])
    ]

    return {
        "alternatives": alternatives,
        "criteria": criteria,
        "profiles": _profiles(model_parameters),
        "categories": _categories(model_parameters),
        "expert_matrices": matrix_evidence["expert_matrices"],
        "collective_matrix": collective_matrix,
        "expert_keys": matrix_evidence["expert_keys"],
        "expert_labels": matrix_evidence["expert_labels"],
        "expert_emails": matrix_evidence["expert_emails"],
        "visualization_ranges": matrix_evidence["visualization_ranges"],
    }


def _output(run_result: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "categories": [
            {
                "categoryId": category["category_id"],
                "label": category["label"],
                "order": category["order"],
            }
            for category in run_result["categories"]
        ],
        "categoryOrderSemantics": run_result["category_order_semantics"],
        "assignments": [
            {
                "alternativeId": assignment["alternative_id"],
                "categoryId": assignment["category_id"],
            }
            for assignment in run_result["assignments"]
        ],
        "diagnostics": run_result["diagnostics"],
    }


def execute_topsis_sort_2016(
    payload: GenericModelExecutionRequest,
) -> dict[str, Any] | JSONResponse:
    """Execute TOPSIS-Sort internally and return the ``sorting@1`` shape."""

    try:
        execution_input = _input(payload)
        result = run_topsis_sort_2016(
            alternatives=execution_input["alternatives"],
            criteria=execution_input["criteria"],
            profiles=execution_input["profiles"],
            categories=execution_input["categories"],
        )
        output = _output(result)
        output["plotsGraphic"] = _plots_graphic(execution_input)
        return success_response(
            "TOPSIS-Sort 2016 executed successfully",
            output,
        )
    except Exception as error:
        return error_response(
            f"Error executing TOPSIS-Sort 2016: {error}",
            code="INTERNAL_ERROR",
        )


__all__ = ["execute_topsis_sort_2016"]

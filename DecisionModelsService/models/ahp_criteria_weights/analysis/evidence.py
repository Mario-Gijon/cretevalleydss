"""Validation and extraction of frozen AHP criteria-weight evidence."""

from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Any

from models.saaty_scale import is_saaty_scale_value
from services.results_analysis.mcc_weight_analysis import (
    MCC_ANALYSIS_TOLERANCE,
    build_mcc_weight_adjustment_facts,
)


WEIGHT_TOLERANCE = 1e-6
CONSISTENCY_REVIEW_THRESHOLD = 0.10
MODEL_KEY = "ahp_criteria_weights"
STRUCTURE_KEY = "criteriaPairwiseAHP"


class AnalysisEvidenceUnavailable(ValueError):
    """The selected execution has no usable AHP weighting evidence."""


@dataclass(frozen=True)
class AHPWeightingEvidence:
    phase: int
    attempt_id: str | None
    criteria: list[dict[str, str]]
    experts: list[dict[str, str]]
    individual_weights_by_expert: dict[str, dict[str, float]]
    final_weights_by_criterion: dict[str, float] | None
    aggregation_method: str | None
    mcc: dict[str, Any]
    consistency_by_expert: dict[str, dict[str, Any]]
    status: str
    issues: list[str]


def _object(value: Any, field: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError(f"{field} must be an object")
    return value


def _list(value: Any, field: str, *, non_empty: bool = False) -> list[Any]:
    if not isinstance(value, list) or (non_empty and not value):
        raise ValueError(f"{field} must be a{ ' non-empty' if non_empty else ''} list")
    return value


def _string(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} must be a non-empty string")
    return value.strip()


def _number(value: Any, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field} must be numeric")
    number = float(value)
    if not math.isfinite(number):
        raise ValueError(f"{field} must be finite")
    return number


def _close(actual: float, expected: float, tolerance: float = WEIGHT_TOLERANCE) -> bool:
    return math.isclose(float(actual), float(expected), rel_tol=tolerance, abs_tol=tolerance)


def _same_persisted_value(actual: Any, expected: Any) -> bool:
    if isinstance(actual, bool) or isinstance(expected, bool):
        return actual is expected
    if isinstance(actual, (int, float)) and isinstance(expected, (int, float)):
        return math.isclose(float(actual), float(expected), rel_tol=WEIGHT_TOLERANCE, abs_tol=WEIGHT_TOLERANCE)
    if isinstance(actual, dict) and isinstance(expected, dict):
        return set(actual) == set(expected) and all(_same_persisted_value(actual[key], expected[key]) for key in actual)
    if isinstance(actual, list) and isinstance(expected, list):
        return len(actual) == len(expected) and all(_same_persisted_value(left, right) for left, right in zip(actual, expected))
    return actual == expected


def _validate_vector(value: Any, criterion_ids: list[str], field: str) -> dict[str, float]:
    vector = _object(value, field)
    if set(vector) != set(criterion_ids):
        raise ValueError(f"{field} must contain exactly the executed criterion ids")
    result = {criterion_id: _number(vector[criterion_id], f"{field}.{criterion_id}") for criterion_id in criterion_ids}
    if any(weight <= 0 or weight > 1 for weight in result.values()):
        raise ValueError(f"{field} must contain weights in (0, 1]")
    if not _close(sum(result.values()), 1.0):
        raise ValueError(f"{field} must sum to one")
    return result


def _execution_for_model(context: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    rounds = _list(context.get("rounds"), "context.rounds", non_empty=True)
    candidates: list[tuple[int, dict[str, Any]]] = []
    for index, entry_value in enumerate(rounds):
        entry = _object(entry_value, f"context.rounds[{index}]")
        execution = _object(entry.get("execution"), f"context.rounds[{index}].execution")
        model_context = execution.get("modelContext")
        api_key = model_context.get("apiModelKey") if isinstance(model_context, dict) else None
        request = execution.get("input")
        request_context = request.get("context") if isinstance(request, dict) else None
        structure = request_context.get("structure") if isinstance(request_context, dict) else None
        if api_key == MODEL_KEY or (not api_key and isinstance(structure, dict) and structure.get("key") == STRUCTURE_KEY):
            phase = entry.get("phase")
            if isinstance(phase, bool) or not isinstance(phase, int):
                raise ValueError(f"context.rounds[{index}].phase must be an integer")
            candidates.append((phase, execution))
    if not candidates:
        raise AnalysisEvidenceUnavailable("No executed AHP criteria-weighting evidence is available")
    candidates.sort(key=lambda candidate: candidate[0])
    if len(candidates) > 1 and candidates[-1][0] == candidates[-2][0]:
        raise AnalysisEvidenceUnavailable("The frozen AHP criteria-weighting execution is ambiguous")
    return candidates[-1]


def _criteria_from_execution(execution: dict[str, Any]) -> list[dict[str, str]]:
    request = _object(execution.get("input"), "execution.input")
    context = _object(request.get("context"), "execution.input.context")
    structure = _object(context.get("structure"), "execution.input.context.structure")
    if structure.get("key") != STRUCTURE_KEY or structure.get("stage") != "criteriaWeighting":
        raise ValueError("The frozen execution is not criteriaPairwiseAHP criteria weighting")
    criteria_source = _list(context.get("criteria"), "execution.input.context.criteria", non_empty=True)
    criteria = []
    seen = set()
    for index, item_value in enumerate(criteria_source):
        item = _object(item_value, f"execution.input.context.criteria[{index}]")
        criterion_id = _string(item.get("id"), f"criteria[{index}].id")
        name = _string(item.get("name"), f"criteria[{index}].name")
        if criterion_id in seen:
            raise ValueError(f"Duplicate criterion id '{criterion_id}' in the frozen execution")
        seen.add(criterion_id)
        criteria.append({"criterionId": criterion_id, "name": name})
    return criteria


def _expert_identity(evaluation: dict[str, Any], index: int, context: dict[str, Any]) -> dict[str, str]:
    expert = _object(evaluation.get("expert"), f"evaluations[{index}].expert")
    email = expert.get("email")
    expert_id = expert.get("id")
    key = email.strip() if isinstance(email, str) and email.strip() else expert_id.strip() if isinstance(expert_id, str) and expert_id.strip() else None
    if key is None:
        raise ValueError(f"evaluations[{index}].expert must have an id or email")
    name = expert.get("name")
    if not isinstance(name, str) or not name.strip():
        directory = context.get("semanticDirectory")
        by_id = directory.get("expertsById") if isinstance(directory, dict) else None
        semantic = (by_id or {}).get(expert_id) if isinstance(by_id, dict) and expert_id else None
        name = semantic.get("name") if isinstance(semantic, dict) else None
    if not isinstance(name, str) or not name.strip():
        name = expert_id if isinstance(expert_id, str) and expert_id.strip() else key
    return {"expertKey": key, "name": name.strip()}


def _validate_evaluation_comparisons(
    evaluation: dict[str, Any], criterion_ids: list[str], expert_key: str, index: int
) -> None:
    payload = _object(evaluation.get("payload"), f"evaluations[{index}].payload")
    if set(payload) != {"comparisons"}:
        raise ValueError(f"evaluations[{index}].payload must contain exactly comparisons")
    comparisons = _list(payload.get("comparisons"), f"evaluations[{index}].payload.comparisons")
    expected = len(criterion_ids) * (len(criterion_ids) - 1) // 2
    seen: set[frozenset[str]] = set()
    for comparison_index, comparison_value in enumerate(comparisons):
        field = f"evaluations[{index}].payload.comparisons[{comparison_index}]"
        comparison = _object(comparison_value, field)
        first = _string(comparison.get("criterionId"), f"{field}.criterionId")
        second = _string(comparison.get("comparedCriterionId"), f"{field}.comparedCriterionId")
        if first not in criterion_ids or second not in criterion_ids or first == second:
            raise ValueError(f"{field} references an invalid criterion pair for expert '{expert_key}'")
        pair = frozenset((first, second))
        if pair in seen:
            raise ValueError(f"{field} duplicates a criterion pair for expert '{expert_key}'")
        seen.add(pair)
        value = _number(comparison.get("value"), f"{field}.value")
        if not is_saaty_scale_value(value):
            raise ValueError(f"{field}.value is outside the stored Saaty scale")
    if len(seen) != expected:
        raise ValueError(f"Expert '{expert_key}' has incomplete frozen AHP comparisons")


def _validate_diagnostic(
    diagnostic: Any,
    *,
    expert: dict[str, str],
    weights: dict[str, float],
    criteria_count: int,
    comparison_count: int,
) -> dict[str, Any]:
    value = _object(diagnostic, f"diagnostics.{expert['expertKey']}")
    if value.get("expertKey") != expert["expertKey"]:
        raise ValueError("stored diagnostic expert identity does not match the frozen evaluation")
    diagnostic_weights = _validate_vector(value.get("weightsByCriterion"), list(weights), "diagnostic.weightsByCriterion")
    if any(not _close(diagnostic_weights[key], weights[key]) for key in weights):
        raise ValueError("stored diagnostic priorities do not match the frozen AHP weights")
    if value.get("completedComparisons") != comparison_count or value.get("requiredComparisons") != comparison_count:
        raise ValueError("stored diagnostic comparison counts do not match the frozen evaluation")
    lambda_max = _number(value.get("lambdaMax"), "diagnostic.lambdaMax")
    if lambda_max <= 0:
        raise ValueError("stored diagnostic lambdaMax must be positive")
    ratio = value.get("consistencyRatio")
    if criteria_count <= 2:
        if ratio is not None or value.get("consistencyStatus") != "not_applicable":
            raise ValueError("stored consistency status is invalid for a matrix of this size")
        return {"available": True, "consistencyRatio": None, "consistencyStatus": "not_applicable"}
    ratio = _number(ratio, "diagnostic.consistencyRatio")
    if ratio < 0:
        raise ValueError("stored consistency ratio must be non-negative")
    status = "consistent" if ratio <= CONSISTENCY_REVIEW_THRESHOLD else "review"
    if value.get("consistencyStatus") != status:
        raise ValueError("stored consistency status does not match its CR")
    consistency_index = _number(value.get("consistencyIndex"), "diagnostic.consistencyIndex")
    random_index = _number(value.get("randomIndex"), "diagnostic.randomIndex")
    if consistency_index < 0 or random_index <= 0:
        raise ValueError("stored consistency indices are invalid")
    return {
        "available": True,
        "consistencyRatio": ratio,
        "consistencyStatus": status,
        "consistencyIndex": consistency_index,
        "randomIndex": random_index,
        "lambdaMax": lambda_max,
    }


def _available_mcc() -> dict[str, Any]:
    return {"available": False, "reason": "MCC evidence is unavailable or invalid"}


def _validate_mcc(
    *,
    aggregation: dict[str, Any],
    individual: dict[str, dict[str, float]],
    criteria: list[dict[str, str]],
    experts: list[dict[str, str]],
    final_weights: dict[str, float],
) -> dict[str, Any]:
    mcc = _object(aggregation.get("mcc"), "rawOutput.aggregation.mcc")
    keys = [expert["expertKey"] for expert in experts]
    ids = [criterion["criterionId"] for criterion in criteria]
    originals_source = _object(mcc.get("originalWeightsByExpert"), "MCC originalWeightsByExpert")
    adjusted_source = _object(mcc.get("adjustedWeightsByExpert"), "MCC adjustedWeightsByExpert")
    if set(originals_source) != set(keys) or set(adjusted_source) != set(keys):
        raise ValueError("MCC expert identities do not match the frozen AHP evaluations")
    originals = {}
    adjusted = {}
    for key in keys:
        originals[key] = _validate_vector(originals_source[key], ids, f"MCC.originalWeightsByExpert.{key}")
        adjusted[key] = _validate_vector(adjusted_source[key], ids, f"MCC.adjustedWeightsByExpert.{key}")
        if any(not _close(originals[key][criterion_id], individual[key][criterion_id]) for criterion_id in ids):
            raise ValueError(f"MCC original weights do not match AHP priorities for '{key}'")
    mcc_collective = _validate_vector(mcc.get("weightsByCriterion"), ids, "MCC.weightsByCriterion")
    if any(not _close(mcc_collective[key], final_weights[key]) for key in ids):
        raise ValueError("MCC collective weights do not match the persisted criteria-weight result")
    expert_count = len(keys)
    for criterion_id in ids:
        stored_mean = sum(adjusted[key][criterion_id] for key in keys) / expert_count
        if not _close(stored_mean, mcc_collective[criterion_id]):
            raise ValueError("MCC collective weights do not match the stored adjusted expert vectors")
    epsilon = _number(mcc.get("eps"), "MCC.eps")
    if epsilon < 0:
        raise ValueError("MCC.eps must be non-negative")
    objective = None if mcc.get("objective") is None else _number(mcc.get("objective"), "MCC.objective")
    if objective is not None and objective < 0:
        raise ValueError("MCC.objective must be non-negative")
    status = _string(mcc.get("status"), "MCC.status")
    if status != "Optimal":
        raise ValueError("stored MCC optimizer status is not Optimal")
    result = build_mcc_weight_adjustment_facts(
        criteria=criteria,
        experts=experts,
        original_weights_by_expert=originals,
        adjusted_weights_by_expert=adjusted,
        collective_weights_by_criterion=mcc_collective,
        epsilon=epsilon,
        objective=objective,
        status=status,
    )
    if not _close(sum(mcc_collective[item["criterionId"]] for item in criteria), 1.0):
        raise ValueError("MCC collective weights are not normalized")
    return {**result, "materialAdjustments": result["totalAbsoluteAdjustment"] > MCC_ANALYSIS_TOLERANCE}


def extract_ahp_criteria_weights_evidence(context: dict[str, Any]) -> AHPWeightingEvidence:
    """Validate frozen execution inputs against the persisted AHP/MCC outputs."""

    phase, execution = _execution_for_model(_object(context, "context"))
    request = _object(execution.get("input"), "execution.input")
    criteria = _criteria_from_execution(execution)
    criterion_ids = [item["criterionId"] for item in criteria]
    evaluations = _list(request.get("evaluations"), "execution.input.evaluations", non_empty=True)
    experts = []
    seen_keys = set()
    for index, evaluation_value in enumerate(evaluations):
        evaluation = _object(evaluation_value, f"evaluations[{index}]")
        expert = _expert_identity(evaluation, index, context)
        if expert["expertKey"] in seen_keys:
            raise ValueError(f"Duplicate frozen AHP evaluation for expert '{expert['expertKey']}'")
        seen_keys.add(expert["expertKey"])
        _validate_evaluation_comparisons(evaluation, criterion_ids, expert["expertKey"], index)
        experts.append(expert)

    result = _object(execution.get("result"), "execution.result")
    raw = _object(result.get("rawOutput"), "execution.result.rawOutput")
    standard = result.get("standardResult")
    standard = standard if isinstance(standard, dict) else {}
    standard_collective = standard.get("collectiveEvaluations")
    individual: dict[str, dict[str, float]] = {}
    issues: list[str] = []
    try:
        individual_source = _object(raw.get("expertWeightsByExpert"), "rawOutput.expertWeightsByExpert")
        if set(individual_source) != seen_keys:
            raise ValueError("Stored AHP expert identities do not match the frozen evaluations")
        for expert in experts:
            individual[expert["expertKey"]] = _validate_vector(
                individual_source[expert["expertKey"]], criterion_ids,
                f"rawOutput.expertWeightsByExpert.{expert['expertKey']}",
            )
        if raw.get("nExperts") != len(experts):
            raise ValueError("Stored AHP expert count does not match the frozen evaluations")
        if not isinstance(standard_collective, dict):
            raise ValueError("standardResult.collectiveEvaluations is missing")
        duplicate_individual = _object(standard_collective.get("expertWeightsByExpert"), "standardResult.collectiveEvaluations.expertWeightsByExpert")
        if set(duplicate_individual) != seen_keys:
            raise ValueError("Persisted collective evaluations do not match the frozen AHP expert identities")
        for expert in experts:
            key = expert["expertKey"]
            duplicate_vector = _validate_vector(duplicate_individual[key], criterion_ids, f"standardResult.collectiveEvaluations.expertWeightsByExpert.{key}")
            if any(not _close(duplicate_vector[criterion_id], individual[key][criterion_id]) for criterion_id in criterion_ids):
                raise ValueError(f"Persisted collective evaluations do not match AHP weights for '{key}'")
    except (KeyError, TypeError, ValueError) as error:
        issues.append(f"Individual AHP weights unavailable: {error}")
        individual = {}

    final_weights = None
    try:
        final_weights = _validate_vector(standard.get("weightsByCriterion"), criterion_ids, "standardResult.weightsByCriterion")
    except (KeyError, TypeError, ValueError) as error:
        issues.append(f"Final criterion weights unavailable: {error}")

    aggregation_source = raw.get("aggregation")
    aggregation = aggregation_source if isinstance(aggregation_source, dict) else {}
    method = aggregation.get("method") if isinstance(aggregation.get("method"), str) else None
    if not isinstance(standard_collective, dict) or not _same_persisted_value(standard_collective.get("aggregation"), aggregation):
        issues.append("Persisted collective aggregation metadata do not match the frozen AHP execution")
        method = None
    mcc_facts = _available_mcc()
    if len(experts) == 1 and method == "singleExpert" and individual and final_weights:
        try:
            if aggregation.get("singleExpertKey") != experts[0]["expertKey"]:
                raise ValueError("Stored single-expert aggregation identity does not match the execution")
            if any(not _close(individual[experts[0]["expertKey"]][key], final_weights[key]) for key in criterion_ids):
                raise ValueError("Stored final weights do not match the single expert's AHP priorities")
        except (KeyError, TypeError, ValueError) as error:
            issues.append(f"Final criterion weights unavailable: {error}")
            final_weights = None
    elif len(experts) > 1 and method == "mcc" and individual and final_weights:
        try:
            mcc_facts = _validate_mcc(
                aggregation=aggregation,
                individual=individual,
                criteria=criteria,
                experts=experts,
                final_weights=final_weights,
            )
            collective_weights = _validate_vector(standard_collective.get("weightsByCriterion"), criterion_ids, "standardResult.collectiveEvaluations.weightsByCriterion")
            if any(not _close(collective_weights[key], final_weights[key]) for key in criterion_ids):
                raise ValueError("Persisted collective evaluations do not match the final MCC weights")
        except (KeyError, TypeError, ValueError) as error:
            issues.append(f"MCC evidence unavailable: {error}")
            mcc_facts = _available_mcc()
            final_weights = None
    else:
        if len(experts) > 1:
            issues.append("MCC evidence unavailable: the frozen execution does not identify a valid multi-expert MCC result")
        final_weights = None

    if len(experts) == 1 and method != "singleExpert":
        issues.append("Final criterion weights unavailable: the stored aggregation does not identify a single expert")

    diagnostics: dict[str, dict[str, Any]] = {}
    diagnostic_source = raw.get("expertDiagnosticsByExpert")
    comparison_count = len(criterion_ids) * (len(criterion_ids) - 1) // 2
    for expert in experts:
        key = expert["expertKey"]
        try:
            if key not in individual:
                raise ValueError("the corresponding validated individual weights are unavailable")
            if not isinstance(diagnostic_source, dict) or key not in diagnostic_source:
                raise ValueError("no stored diagnostic is available")
            diagnostics[key] = _validate_diagnostic(
                diagnostic_source[key], expert=expert, weights=individual[key],
                criteria_count=len(criteria), comparison_count=comparison_count,
            )
            duplicate_diagnostics = standard_collective.get("expertDiagnosticsByExpert") if isinstance(standard_collective, dict) else None
            if not isinstance(duplicate_diagnostics, dict) or key not in duplicate_diagnostics or not _same_persisted_value(duplicate_diagnostics[key], diagnostic_source[key]):
                raise ValueError("persisted diagnostic copies do not match")
        except (KeyError, TypeError, ValueError) as error:
            diagnostics[key] = {"available": False, "reason": str(error)}

    status = "available" if final_weights is not None else "partial" if individual or any(item["available"] for item in diagnostics.values()) else "unavailable"
    return AHPWeightingEvidence(
        phase=phase,
        attempt_id=str(execution.get("attemptId")) if execution.get("attemptId") is not None else None,
        criteria=criteria,
        experts=experts,
        individual_weights_by_expert=individual,
        final_weights_by_criterion=final_weights,
        aggregation_method=method,
        mcc=mcc_facts,
        consistency_by_expert=diagnostics,
        status=status,
        issues=issues,
    )


__all__ = [
    "AHPWeightingEvidence",
    "AnalysisEvidenceUnavailable",
    "CONSISTENCY_REVIEW_THRESHOLD",
    "WEIGHT_TOLERANCE",
    "extract_ahp_criteria_weights_evidence",
]

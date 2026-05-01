from __future__ import annotations

from typing import Any


def _to_number(value: Any) -> float | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    return None


def _to_scalar(value: Any) -> tuple[float | None, bool]:
    if isinstance(value, dict):
        value = value.get("value")

    if isinstance(value, list) and len(value) == 3:
        numbers = [_to_number(item) for item in value]
        if any(number is None for number in numbers):
            return None, False
        return sum(numbers) / 3.0, True

    number = _to_number(value)
    return number, False


def _normalize_collective_pairwise_matrix(
    collective: dict[str, Any],
) -> tuple[dict[str, float], list[str], list[str]]:
    vector: dict[str, float] = {}
    used_fields: list[str] = []
    missing_fields: list[str] = []

    if not isinstance(collective, dict) or not collective:
        missing_fields.append("result.collectiveEvaluations")
        return vector, used_fields, missing_fields

    for criterion_name, rows in collective.items():
        if not isinstance(criterion_name, str) or not criterion_name.strip():
            continue
        if not isinstance(rows, list):
            continue
        for row in rows:
            if not isinstance(row, dict):
                continue
            alternative = row.get("id")
            if not isinstance(alternative, str) or not alternative.strip():
                continue
            for compared_alternative, raw_value in row.items():
                if compared_alternative == "id":
                    continue
                if (
                    not isinstance(compared_alternative, str)
                    or not compared_alternative.strip()
                    or compared_alternative == alternative
                ):
                    continue
                value = _to_number(raw_value)
                if value is None:
                    continue
                key = f"{criterion_name}::{alternative}::{compared_alternative}"
                vector[key] = value

    if vector:
        used_fields.append("result.collectiveEvaluations")
    else:
        missing_fields.append("result.collectiveEvaluations")
    return vector, used_fields, missing_fields


def _normalize_expert_pairwise_vectors(
    canonical_by_expert: dict[str, Any],
) -> tuple[dict[str, dict[str, float]], list[str], list[str]]:
    vectors: dict[str, dict[str, float]] = {}
    used_fields: list[str] = []
    missing_fields: list[str] = []

    if not isinstance(canonical_by_expert, dict) or not canonical_by_expert:
        missing_fields.append("evaluations.canonicalByExpert")
        return vectors, used_fields, missing_fields

    for expert_key, expert_payload in canonical_by_expert.items():
        if not isinstance(expert_payload, dict):
            continue
        expert_vector: dict[str, float] = {}
        for criterion_name, cells in expert_payload.items():
            if not isinstance(criterion_name, str) or not criterion_name.strip():
                continue
            if not isinstance(cells, dict):
                continue
            for cell_key, cell_payload in cells.items():
                if not isinstance(cell_payload, dict):
                    continue
                alternative = cell_payload.get("alternative")
                compared_alternative = cell_payload.get("comparedAlternative")
                if not isinstance(alternative, str) or not isinstance(compared_alternative, str):
                    if isinstance(cell_key, str) and "::" in cell_key:
                        parts = cell_key.split("::", 1)
                        if len(parts) == 2:
                            alternative = parts[0]
                            compared_alternative = parts[1]
                if (
                    not isinstance(alternative, str)
                    or not alternative.strip()
                    or not isinstance(compared_alternative, str)
                    or not compared_alternative.strip()
                    or alternative == compared_alternative
                ):
                    continue
                value, _ = _to_scalar(cell_payload)
                if value is None:
                    continue
                key = f"{criterion_name}::{alternative}::{compared_alternative}"
                expert_vector[key] = value
        if expert_vector:
            vectors[str(expert_key)] = expert_vector

    if vectors:
        used_fields.append("evaluations.canonicalByExpert")
    else:
        missing_fields.append("evaluations.canonicalByExpert")
    return vectors, used_fields, missing_fields


def _expert_name_by_email(context: dict[str, Any]) -> dict[str, str | None]:
    result: dict[str, str | None] = {}
    for expert in context.get("experts") or []:
        if not isinstance(expert, dict):
            continue
        email = expert.get("email")
        if not isinstance(email, str) or not email.strip():
            continue
        result[email] = expert.get("name") if isinstance(expert.get("name"), str) else None
    return result


def analyze_expert_agreement(context: dict[str, Any]) -> dict[str, Any]:
    used_fields: list[str] = []
    missing_fields: list[str] = []

    evaluations = context.get("evaluations") or {}
    result = context.get("result") or {}

    canonical_by_expert = evaluations.get("canonicalByExpert") or {}
    collective = result.get("collectiveEvaluations") or {}

    if canonical_by_expert:
        used_fields.append("evaluations.canonicalByExpert")
    else:
        missing_fields.append("evaluations.canonicalByExpert")

    if collective:
        used_fields.append("result.collectiveEvaluations")
    else:
        missing_fields.append("result.collectiveEvaluations")

    if not canonical_by_expert or not collective:
        return {
            "agreement": {
                "status": "insufficient_data",
                "hotspots": [],
                "fuzzyCentroidApproximationUsed": False,
            },
            "expertDiagnostics": {
                "available": False,
                "mode": "unknown",
                "reason": "missing_required_inputs",
                "expertCount": len(context.get("experts") or []),
            },
            "used_fields": used_fields,
            "missing_fields": missing_fields,
            "agreement_warning": None,
        }

    hotspots: list[dict[str, Any]] = []
    fuzzy_approximated = False

    for expert_key, expert_matrix in canonical_by_expert.items():
        if not isinstance(expert_matrix, dict):
            continue

        for alternative_name, by_criterion in expert_matrix.items():
            if not isinstance(by_criterion, dict):
                continue
            collective_by_criterion = collective.get(alternative_name)
            if not isinstance(collective_by_criterion, dict):
                continue

            for criterion_name, expert_value_raw in by_criterion.items():
                collective_raw = collective_by_criterion.get(criterion_name)
                expert_value, expert_fuzzy = _to_scalar(expert_value_raw)
                collective_value, collective_fuzzy = _to_scalar(collective_raw)

                if expert_value is None or collective_value is None:
                    continue

                fuzzy_approximated = fuzzy_approximated or expert_fuzzy or collective_fuzzy
                hotspots.append(
                    {
                        "expert": expert_key,
                        "alternative": alternative_name,
                        "criterion": criterion_name,
                        "distance": abs(expert_value - collective_value),
                        "expertValue": expert_value,
                        "collectiveValue": collective_value,
                    }
                )

    pairwise_expert_vectors, pairwise_used, pairwise_missing = _normalize_expert_pairwise_vectors(
        canonical_by_expert
    )
    pairwise_collective_vector, pairwise_collective_used, pairwise_collective_missing = (
        _normalize_collective_pairwise_matrix(collective)
    )

    used_fields = sorted(set(used_fields + pairwise_used + pairwise_collective_used))
    missing_fields = sorted(
        set(missing_fields + pairwise_missing + pairwise_collective_missing)
    )

    expert_name_map = _expert_name_by_email(context)
    experts_count = len([expert for expert in (context.get("experts") or []) if isinstance(expert, dict)])
    comparable_experts_count = len(pairwise_expert_vectors)
    expert_diagnostics: dict[str, Any] = {
        "available": False,
        "mode": "pairwise",
        "expertCount": experts_count,
        "comparableExpertCount": comparable_experts_count,
    }

    if experts_count == 1:
        if comparable_experts_count == 1:
            only_expert = next(iter(pairwise_expert_vectors.keys()))
            expert_cells = list(pairwise_expert_vectors.values())[0].values()
            if expert_cells:
                expert_cells_list = list(expert_cells)
                decisiveness = sum(abs(float(value) - 0.5) for value in expert_cells_list) / len(
                    expert_cells_list
                )
                expert_diagnostics["singleExpertDecisiveness"] = {
                    "expertEmail": only_expert,
                    "expertName": expert_name_map.get(only_expert),
                    "value": decisiveness,
                }
        expert_diagnostics["reason"] = "single_expert"

    elif experts_count >= 2 and comparable_experts_count >= 2 and pairwise_collective_vector:
        comparable_distances: list[dict[str, Any]] = []
        decisiveness_rows: list[dict[str, Any]] = []

        for expert_email, expert_vector in pairwise_expert_vectors.items():
            overlap_keys = [key for key in expert_vector.keys() if key in pairwise_collective_vector]
            if not overlap_keys:
                continue

            differences = [
                abs(float(expert_vector[key]) - float(pairwise_collective_vector[key]))
                for key in overlap_keys
            ]
            mean_distance = sum(differences) / len(differences)
            comparable_distances.append(
                {
                    "expertEmail": expert_email,
                    "expertName": expert_name_map.get(expert_email),
                    "distance": mean_distance,
                    "overlapCellCount": len(overlap_keys),
                }
            )

            expert_cells = list(expert_vector.values())
            decisiveness_rows.append(
                {
                    "expertEmail": expert_email,
                    "expertName": expert_name_map.get(expert_email),
                    "value": (
                        sum(abs(float(value) - 0.5) for value in expert_cells) / len(expert_cells)
                        if expert_cells
                        else 0.0
                    ),
                }
            )

        if comparable_distances:
            sorted_distances = sorted(comparable_distances, key=lambda item: item["distance"])
            average_distance = sum(item["distance"] for item in comparable_distances) / len(
                comparable_distances
            )

            expert_diagnostics = {
                "available": True,
                "mode": "pairwise",
                "expertCount": experts_count,
                "distanceMetric": "mean_absolute_difference",
                "closestToCollective": sorted_distances[0],
                "farthestFromCollective": sorted_distances[-1],
                "averageDistanceToCollective": average_distance,
                "distances": sorted_distances,
                "decisiveness": sorted(
                    decisiveness_rows, key=lambda item: item["value"], reverse=True
                ),
                "mostDecisiveExpert": (
                    sorted(decisiveness_rows, key=lambda item: item["value"], reverse=True)[0]
                    if decisiveness_rows
                    else None
                ),
                "mostNeutralExpert": (
                    sorted(decisiveness_rows, key=lambda item: item["value"])[0]
                    if decisiveness_rows
                    else None
                ),
            }
        else:
            expert_diagnostics["reason"] = "missing_comparable_pairwise_vectors"
    else:
        expert_diagnostics["reason"] = "missing_comparable_pairwise_vectors"

    hotspots = sorted(hotspots, key=lambda item: item["distance"], reverse=True)[:10]
    status = "ok" if hotspots else "insufficient_numeric_overlap"

    return {
        "agreement": {
            "status": status,
            "hotspots": hotspots,
            "fuzzyCentroidApproximationUsed": fuzzy_approximated,
        },
        "expertDiagnostics": expert_diagnostics,
        "used_fields": used_fields,
        "missing_fields": missing_fields,
        "agreement_warning": None,
    }

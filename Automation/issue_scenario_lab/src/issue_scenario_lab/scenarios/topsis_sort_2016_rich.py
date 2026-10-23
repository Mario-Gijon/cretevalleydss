from __future__ import annotations

import json
import math
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from issue_scenario_lab.api.issues import IssuesApi
from issue_scenario_lab.api.session_pool import SessionPool
from issue_scenario_lab.errors import ManifestError, ScenarioLabError
from issue_scenario_lab.manifest.models import GeneratedIssue
from issue_scenario_lab.manifest.store import ManifestStore
from issue_scenario_lab.scenarios.no_consensus_basic import _id, _items
from issue_scenario_lab.scenarios.no_consensus_criteria_weighting import _select_weighting_model
from issue_scenario_lab.scenarios.numeric_values import numeric_levels
from issue_scenario_lab.scenarios.topsis_sort_2016 import (
    MODEL_KEY,
    RESULT_STRUCTURE_KEY,
    RESULT_STRUCTURE_VERSION,
    _compatible_model,
    _domain_accepts,
    _finite,
    _new_generation_id,
    _supported_domain_type_keys,
    _validate_sorting_result,
)

SCENARIO_ID = "topsis-sort-2016-rich"
CRITERIA_STAGE = "criteriaWeighting"
ALTERNATIVE_STAGE = "alternativeEvaluation"
WEIGHTING_MODEL_KEY = "manual_criteria_weights"
FIXTURE_PATH = Path(__file__).parents[3] / "data" / "topsis_sort_2016_rich.json"
MATH_VALIDATOR_PATH = Path(__file__).with_name("topsis_sort_2016_rich_math.py")
EXPECTED_CATEGORY_LABELS = ["Very Low", "Low", "Medium", "High", "Very High"]


@dataclass(frozen=True)
class GenerationResult:
    generation_id: str
    issue_id: str
    issue_name: str
    owner_alias: str
    expert_aliases: tuple[str, ...]
    manifest_path: str
    collective_weights_by_criterion_name: dict[str, float]
    assignments_by_alternative_name: dict[str, str]
    offline_validation: dict[str, Any]


def load_fixture(path: Path = FIXTURE_PATH) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ScenarioLabError(f"unable to load rich TOPSIS-Sort fixture: {path}") from error
    if not isinstance(data, dict):
        raise ScenarioLabError("rich TOPSIS-Sort fixture must be an object")
    validate_fixture(data)
    return data


def validate_fixture(data: dict[str, Any]) -> None:
    criteria, alternatives, participants = data.get("criteria"), data.get("alternatives"), data.get("participants")
    if not isinstance(criteria, list) or len(criteria) != 6:
        raise ScenarioLabError("rich TOPSIS-Sort fixture must contain exactly six evaluable criteria")
    if not isinstance(alternatives, list) or len(alternatives) != 10:
        raise ScenarioLabError("rich TOPSIS-Sort fixture must contain exactly ten alternatives")
    if not isinstance(participants, dict) or participants.get("creator") != "owner":
        raise ScenarioLabError("fixture participant creator must use the owner alias")
    expert_keys = participants.get("experts")
    if (
        not isinstance(expert_keys, list)
        or len(expert_keys) != 4
        or len(set(expert_keys)) != 4
        or any(not isinstance(alias, str) or not alias for alias in expert_keys)
    ):
        raise ScenarioLabError("fixture must declare four unique expert aliases")
    if data.get("scenarioId") != SCENARIO_ID or data.get("models") != {"decision": MODEL_KEY, "criteriaWeighting": WEIGHTING_MODEL_KEY}:
        raise ScenarioLabError("fixture scenario or model keys are incompatible")
    if not isinstance(data.get("title"), str) or not isinstance(data.get("description"), str) or "sintético" not in data["description"].casefold():
        raise ScenarioLabError("fixture must document a synthetic study")
    scale = data.get("scale")
    if not isinstance(scale, dict) or scale.get("minimum") != 1 or scale.get("maximum") != 10 or not isinstance(scale.get("meaning"), str):
        raise ScenarioLabError("fixture must define the shared synthetic 1–10 scale and its meaning")

    criterion_keys = [item.get("key") for item in criteria if isinstance(item, dict)]
    criterion_names = [item.get("name") for item in criteria if isinstance(item, dict)]
    if len(criterion_keys) != 6 or len(set(criterion_keys)) != 6 or len(set(criterion_names)) != 6:
        raise ScenarioLabError("fixture criteria require six unique keys and names")
    expected_criteria = {
        "quality": "benefit",
        "purchase_cost": "cost",
        "delivery_reliability": "benefit",
        "delivery_time": "cost",
        "sustainability": "benefit",
        "after_sales_support": "benefit",
    }
    if {item["key"]: item.get("type") for item in criteria} != expected_criteria:
        raise ScenarioLabError("fixture benefit/cost directions differ from the documented supplier criteria")
    alternative_keys = [item.get("key") for item in alternatives if isinstance(item, dict)]
    alternative_names = [item.get("name") for item in alternatives if isinstance(item, dict)]
    if len(alternative_keys) != 10 or len(set(alternative_keys)) != 10 or len(set(alternative_names)) != 10:
        raise ScenarioLabError("fixture alternatives require ten unique keys and names")
    if any(not isinstance(item.get("description"), str) or not item["description"].strip() for item in alternatives):
        raise ScenarioLabError("every synthetic supplier must have a short profile description")

    weights = data.get("weightsByExpert")
    if not isinstance(weights, dict) or set(weights) != set(expert_keys):
        raise ScenarioLabError("fixture must contain one criteria-weight vector per configured expert")
    weight_vectors: list[tuple[float, ...]] = []
    for alias, vector in weights.items():
        if (
            not isinstance(vector, dict)
            or set(vector) != set(criterion_keys)
            or any(not _finite(value) or not 0 <= float(value) <= 1 for value in vector.values())
        ):
            raise ScenarioLabError(f"criteria weights for {alias} must cover all six leaves with finite values in [0, 1]")
        if abs(math.fsum(float(vector[key]) for key in criterion_keys) - 1.0) > 1e-9:
            raise ScenarioLabError(f"criteria weights for {alias} must sum to 1")
        weight_vectors.append(tuple(float(vector[key]) for key in criterion_keys))
    if len(set(weight_vectors)) != 4:
        raise ScenarioLabError("all four expert criteria-weight vectors must differ")
    expected_weights = data.get("expectedCriteriaWeights")
    if not isinstance(expected_weights, dict) or set(expected_weights) != set(criterion_keys) or abs(math.fsum(expected_weights.values()) - 1) > 1e-9:
        raise ScenarioLabError("fixture must record a normalized reference vector from the MCC calculation")

    matrices = data.get("evaluationMatricesByExpert")
    if not isinstance(matrices, dict) or set(matrices) != set(expert_keys):
        raise ScenarioLabError("fixture must contain one evaluation matrix per configured expert")
    normalized_matrices = []
    for alias, matrix in matrices.items():
        if not isinstance(matrix, dict) or set(matrix) != set(alternative_keys):
            raise ScenarioLabError(f"{alias} matrix must contain all ten alternatives exactly once")
        normalized = []
        for alternative_key in alternative_keys:
            row = matrix[alternative_key]
            if not isinstance(row, dict) or set(row) != set(criterion_keys):
                raise ScenarioLabError(f"{alias} matrix row {alternative_key} must contain all six criteria")
            for value in row.values():
                if not _finite(value) or not scale["minimum"] <= float(value) <= scale["maximum"]:
                    raise ScenarioLabError("supplier evaluations must be finite values inside the documented 1–10 domain")
            normalized.append(tuple(float(row[key]) for key in criterion_keys))
        normalized_matrices.append(tuple(normalized))
    if len(set(normalized_matrices)) != 4:
        raise ScenarioLabError("all four expert evaluation matrices must differ")

    categories = data.get("orderedCategories")
    if not isinstance(categories, list) or [item.get("label") for item in categories if isinstance(item, dict)] != EXPECTED_CATEGORY_LABELS:
        raise ScenarioLabError("fixture must use Very Low, Low, Medium, High, Very High in preference order")
    if len(categories) != 5 or [item.get("order") for item in categories] != list(range(5)):
        raise ScenarioLabError("fixture category order must be consecutive from least to most preferred")
    category_ids = [item.get("categoryId") for item in categories]
    if len(set(category_ids)) != 5 or any(not isinstance(item, str) or not item for item in category_ids):
        raise ScenarioLabError("fixture category IDs must be unique")

    boundary = data.get("boundaryProfiles")
    profiles = boundary.get("profiles") if isinstance(boundary, dict) else None
    expected_boundary_ids = [item["categoryId"] for item in categories[1:]]
    if not isinstance(profiles, list) or len(profiles) != 4 or [item.get("categoryId") for item in profiles] != expected_boundary_ids:
        raise ScenarioLabError("fixture must contain exactly four boundaries, one for each non-bottom category")
    directions = {item["key"]: item["type"] for item in criteria}
    previous: dict[str, float] | None = None
    seen_profile_ids: set[str] = set()
    for profile in profiles:
        values = profile.get("valuesByCriterionId") if isinstance(profile, dict) else None
        profile_id = profile.get("profileId") if isinstance(profile, dict) else None
        if (
            not isinstance(profile_id, str)
            or not profile_id
            or profile_id in seen_profile_ids
            or not isinstance(values, dict)
            or set(values) != set(criterion_keys)
        ):
            raise ScenarioLabError("each boundary profile needs a unique ID and all six criterion values")
        seen_profile_ids.add(profile_id)
        if any(not _finite(value) or not scale["minimum"] <= float(value) <= scale["maximum"] for value in values.values()):
            raise ScenarioLabError("boundary profile values must be finite and within the shared 1–10 domain")
        if previous is not None:
            strict = False
            for key, direction in directions.items():
                earlier, later = float(previous[key]), float(values[key])
                if direction == "benefit" and later < earlier or direction == "cost" and later > earlier:
                    raise ScenarioLabError("boundary profiles must be monotonically ordered in each criterion direction")
                strict = strict or later != earlier
            if not strict:
                raise ScenarioLabError("consecutive boundary profiles must differ on at least one criterion")
        previous = values
    expected_assignments = data.get("expectedAssignments")
    if (
        not isinstance(expected_assignments, dict)
        or set(expected_assignments) != set(alternative_keys)
        or not set(expected_assignments.values()).issubset(set(category_ids))
    ):
        raise ScenarioLabError("fixture must freeze one expected category for each supplier")


def _issue_payload(issue_name: str, model_id: str, expert_emails: list[str], domain_id: str, fixture: dict[str, Any]) -> dict[str, Any]:
    source_criterion_ids = {item["key"]: f"criterion-{item['key']}" for item in fixture["criteria"]}
    profiles = [
        {
            "profileId": profile["profileId"],
            "categoryId": profile["categoryId"],
            "valuesByCriterionId": {source_criterion_ids[key]: value for key, value in profile["valuesByCriterionId"].items()},
        }
        for profile in fixture["boundaryProfiles"]["profiles"]
    ]
    return {
        "issueName": issue_name,
        "issueDescription": fixture["description"],
        "selectedModelId": model_id,
        "alternatives": [{"name": item["name"], "description": item["description"]} for item in fixture["alternatives"]],
        "criteria": [{"id": source_criterion_ids[item["key"]], "name": item["name"], "type": item["type"], "children": []} for item in fixture["criteria"]],
        "addedExperts": expert_emails,
        "expressionDomainConfig": {"mode": "global", "globalDomainId": domain_id},
        "closureDate": None,
        "isConsensus": False,
        "simulateConsensus": False,
        "paramValues": {"orderedCategories": fixture["orderedCategories"], "boundaryProfiles": {"profiles": profiles}},
        "criteriaWeightingParameters": {},
        "criteriaWeightingConfig": {
            "mode": "expertManual",
            "source": "experts",
            "method": "manual",
            "structureKey": "manualCriteriaWeights",
            "level": "leaf",
            "payload": {},
        },
    }


def _offline_validation(fixture_path: Path) -> dict[str, Any]:
    project_root = Path(__file__).resolve().parents[5]
    override = os.environ.get("DECISION_MODELS_PYTHON")
    runtime_candidates = [Path(override)] if override else []
    runtime_candidates.extend([project_root / "DecisionModelsService/.venv/bin/python", project_root / "DecisionModelsService/.venv/Scripts/python.exe"])
    runtime = next((candidate for candidate in runtime_candidates if candidate.is_file()), None)
    if runtime is None:
        raise ScenarioLabError("DecisionModelsService Python runtime is required for offline MCC/TOPSIS-Sort preflight; set DECISION_MODELS_PYTHON")
    try:
        completed = subprocess.run(
            [str(runtime), str(MATH_VALIDATOR_PATH), str(fixture_path.resolve())],
            check=False,
            capture_output=True,
            text=True,
            timeout=90,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        raise ScenarioLabError(f"offline MCC/TOPSIS-Sort preflight could not run: {error}") from error
    if completed.returncode != 0:
        detail = completed.stderr.strip().splitlines()
        reason = detail[-1] if detail else "math validator returned no diagnostic"
        raise ScenarioLabError(f"offline MCC/TOPSIS-Sort preflight failed: {reason}")
    try:
        result = json.loads(completed.stdout)
    except json.JSONDecodeError as error:
        raise ScenarioLabError("offline MCC/TOPSIS-Sort preflight returned invalid JSON") from error
    if not isinstance(result, dict) or result.get("analysisStatus") != "available":
        raise ScenarioLabError("offline MCC/TOPSIS-Sort preflight did not validate Model Analysis")
    return result


def _compatible_domain(domains_data: Any, supported: set[str], fixture: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(domains_data, dict):
        raise ScenarioLabError("expression domain response must be an object")
    globals_, user_domains = domains_data.get("globals", []), domains_data.get("userDomains", [])
    if not isinstance(globals_, list) or not isinstance(user_domains, list):
        raise ScenarioLabError("expression domain globals and userDomains must be arrays")
    all_values = [fixture["scale"]["minimum"], fixture["scale"]["maximum"]]
    all_values.extend(value for matrix in fixture["evaluationMatricesByExpert"].values() for row in matrix.values() for value in row.values())
    all_values.extend(value for profile in fixture["boundaryProfiles"]["profiles"] for value in profile["valuesByCriterionId"].values())
    for type_key in ("numericDiscrete", "numericContinuous"):
        for domain in [*globals_, *user_domains]:
            if not isinstance(domain, dict) or domain.get("typeKey") != type_key or type_key not in supported or not _id(domain):
                continue
            try:
                numeric_levels(domain)
            except ScenarioLabError:
                continue
            if all(_domain_accepts(domain, value) for value in all_values):
                return domain
    raise ScenarioLabError("no compatible numeric expression domain represents all expert matrices and profiles")


def _weight_context(response: Any, issue_id: str, fixture: dict[str, Any]) -> tuple[dict[str, Any], tuple[tuple[str, str], ...]]:
    if (
        not isinstance(response, dict)
        or response.get("stage") != CRITERIA_STAGE
        or response.get("structureKey") != "manualCriteriaWeights"
        or response.get("consensusPhase") != 0
        or response.get("completed") is not False
    ):
        raise ScenarioLabError("criteria-weighting evaluation context is incompatible")
    context, payload = response.get("decisionContext"), response.get("payload")
    issue, structure, model = (context.get(key) for key in ("issue", "structure", "model")) if isinstance(context, dict) else (None, None, None)
    if not isinstance(issue, dict) or _id(issue) != issue_id or issue.get("currentStage") != CRITERIA_STAGE or issue.get("isConsensus") is not False:
        raise ScenarioLabError("criteria-weighting context does not identify the active non-consensus issue")
    if (
        not isinstance(structure, dict)
        or structure.get("key") != "manualCriteriaWeights"
        or structure.get("stage") != CRITERIA_STAGE
        or not isinstance(model, dict)
        or model.get("apiModelKey") != WEIGHTING_MODEL_KEY
    ):
        raise ScenarioLabError("criteria-weighting context does not use manual_criteria_weights")
    criteria = _items(context, "leafCriteria")
    by_name = {item.get("name"): item for item in criteria}
    if set(by_name) != {item["name"] for item in fixture["criteria"]} or len(criteria) != 6:
        raise ScenarioLabError("criteria-weighting context must expose the six persisted leaf criteria")
    if any(not _id(by_name[item["name"]]) or by_name[item["name"]].get("type") not in (None, item["type"]) for item in fixture["criteria"]):
        raise ScenarioLabError("criteria-weighting context has missing IDs or unexpected leaf directions")
    identities = tuple(sorted((name, _id(item) or "") for name, item in by_name.items()))
    weights = payload.get("weightsByCriterion") if isinstance(payload, dict) else None
    if (
        not isinstance(payload, dict)
        or set(payload) != {"weightsByCriterion"}
        or not isinstance(weights, dict)
        or set(weights) != {identifier for _, identifier in identities}
        or any(value != "" for value in weights.values())
    ):
        raise ScenarioLabError("criteria-weighting context must return the canonical empty persisted vector")
    return context, identities


def _weight_payload(context: dict[str, Any], fixture: dict[str, Any], expert_key: str) -> dict[str, Any]:
    criteria = {item.get("name"): item for item in _items(context, "leafCriteria")}
    vector = fixture["weightsByExpert"][expert_key]
    weights = {_id(criteria[item["name"]]) or "": float(vector[item["key"]]) for item in fixture["criteria"]}
    if "" in weights or len(weights) != 6 or abs(math.fsum(weights.values()) - 1) > 1e-9:
        raise ScenarioLabError(f"{expert_key} weight submission is not a complete normalized persisted vector")
    return {"weightsByCriterion": weights}


def _validate_weight_compute(
    response: Any, *, fixture: dict[str, Any], criterion_ids_by_key: dict[str, str], emails_by_alias: dict[str, str]
) -> dict[str, float]:
    if (
        not isinstance(response, dict)
        or response.get("stage") != CRITERIA_STAGE
        or response.get("structureKey") != "manualCriteriaWeights"
        or response.get("consensusPhase") != 0
        or response.get("currentStage") != ALTERNATIVE_STAGE
    ):
        raise ScenarioLabError("criteria-weighting computation did not transition to alternativeEvaluation")
    result = response.get("result")
    weights = result.get("weightsByCriterion") if isinstance(result, dict) else None
    expected_ids = set(criterion_ids_by_key.values())
    if (
        not isinstance(weights, dict)
        or set(weights) != expected_ids
        or any(not _finite(value) or not 0 <= float(value) <= 1 for value in weights.values())
        or abs(math.fsum(float(value) for value in weights.values()) - 1) > 1e-6
    ):
        raise ScenarioLabError("MCC returned incomplete or unnormalized collective weights")
    collective = result.get("collectiveEvaluations")
    if not isinstance(collective, dict) or collective.get("weightsByCriterion") != weights or result.get("consensusMeasure") is not None:
        raise ScenarioLabError("manual_criteria_weights did not return the collective weight payload")
    raw = result.get("rawOutput")
    mcc = raw.get("mcc") if isinstance(raw, dict) else None
    if (
        not isinstance(raw, dict)
        or raw.get("useMcc") is not True
        or raw.get("nExperts") != 4
        or not isinstance(mcc, dict)
        or mcc.get("status") != "Optimal"
        or mcc.get("useMcc") is not True
    ):
        raise ScenarioLabError("four expert weight vectors were not aggregated by MCC")
    if not _same_number_map(mcc.get("weightsByCriterion"), weights):
        raise ScenarioLabError("MCC diagnostics do not match the effective collective weights")
    originals = raw.get("expertWeightsByExpert")
    expected_emails = {emails_by_alias[alias] for alias in fixture["participants"]["experts"]}
    if not isinstance(originals, dict) or set(originals) != expected_emails:
        raise ScenarioLabError("MCC did not preserve all four original expert vectors by identity")
    for alias in fixture["participants"]["experts"]:
        vector_by_id = originals.get(emails_by_alias[alias])
        expected = {criterion_ids_by_key[key]: fixture["weightsByExpert"][alias][key] for key in criterion_ids_by_key}
        if not _same_number_map(vector_by_id, expected):
            raise ScenarioLabError(f"MCC original vector does not match the submitted weights for {alias}")
    expected_by_id = {criterion_ids_by_key[key]: value for key, value in fixture["expectedCriteriaWeights"].items()}
    if not _same_number_map(weights, expected_by_id):
        raise ScenarioLabError("effective criteria weights differ from the independently validated MCC reference")
    return {key: float(value) for key, value in weights.items()}


def _same_number_map(actual: Any, expected: dict[str, Any], *, tolerance: float = 1e-7) -> bool:
    return (
        isinstance(actual, dict)
        and set(actual) == set(expected)
        and all(_finite(actual[key]) and abs(float(actual[key]) - float(expected[key])) <= tolerance for key in expected)
    )


def _evaluation_context(response: Any, issue_id: str, model_id: str, fixture: dict[str, Any]) -> tuple[dict[str, Any], dict[str, str], dict[str, str]]:
    if (
        not isinstance(response, dict)
        or response.get("stage") != ALTERNATIVE_STAGE
        or response.get("structureKey") != "alternativeCriteriaMatrix"
        or response.get("consensusPhase") != 0
        or response.get("completed") is not False
    ):
        raise ScenarioLabError("alternative-evaluation context is incompatible")
    context = response.get("decisionContext")
    issue, structure, model = (context.get(key) for key in ("issue", "structure", "model")) if isinstance(context, dict) else (None, None, None)
    if (
        not isinstance(issue, dict)
        or _id(issue) != issue_id
        or issue.get("currentStage") != ALTERNATIVE_STAGE
        or issue.get("isConsensus") is not False
        or not isinstance(structure, dict)
        or structure.get("key") != "alternativeCriteriaMatrix"
        or not isinstance(model, dict)
        or _id(model) != model_id
        or model.get("apiModelKey") != MODEL_KEY
    ):
        raise ScenarioLabError("alternative-evaluation context does not identify the expected TOPSIS-Sort issue")
    alternatives, criteria = _items(context, "alternatives"), _items(context, "leafCriteria")
    alternatives_by_name, criteria_by_name = {item.get("name"): item for item in alternatives}, {item.get("name"): item for item in criteria}
    if (
        set(alternatives_by_name) != {item["name"] for item in fixture["alternatives"]}
        or len(alternatives) != 10
        or set(criteria_by_name) != {item["name"] for item in fixture["criteria"]}
        or len(criteria) != 6
    ):
        raise ScenarioLabError("persisted alternatives or evaluable leaf criteria differ from the fixture")
    alternative_ids = {name: _id(item) for name, item in alternatives_by_name.items()}
    criterion_ids = {name: _id(item) for name, item in criteria_by_name.items()}
    if (
        any(not value for value in [*alternative_ids.values(), *criterion_ids.values()])
        or len(set(alternative_ids.values())) != 10
        or len(set(criterion_ids.values())) != 6
    ):
        raise ScenarioLabError("Backend did not persist unique MongoDB IDs for all alternatives and leaf criteria")
    matrices = fixture["evaluationMatricesByExpert"]
    for criterion in fixture["criteria"]:
        persisted = criteria_by_name[criterion["name"]]
        if persisted.get("type") != criterion["type"]:
            raise ScenarioLabError(f"persisted direction for {criterion['name']} differs from the fixture")
        domain = persisted.get("expressionDomain")
        if not isinstance(domain, dict) or domain.get("typeKey") not in {"numericDiscrete", "numericContinuous"}:
            raise ScenarioLabError(f"persisted numeric expression domain is missing for {criterion['name']}")
        values = [matrix[alternative["key"]][criterion["key"]] for matrix in matrices.values() for alternative in fixture["alternatives"]]
        values.extend(profile["valuesByCriterionId"][criterion["key"]] for profile in fixture["boundaryProfiles"]["profiles"])
        if any(not _domain_accepts(domain, value) for value in values):
            raise ScenarioLabError(f"persisted expression domain cannot represent all {criterion['name']} values")
    empty_payload = response.get("payload")
    expected_alt_ids, expected_criterion_ids = set(alternative_ids.values()), set(criterion_ids.values())
    if (
        not isinstance(empty_payload, dict)
        or set(empty_payload) != expected_alt_ids
        or any(not isinstance(row, dict) or set(row) != expected_criterion_ids or any(value != "" for value in row.values()) for row in empty_payload.values())
    ):
        raise ScenarioLabError("evaluation payload is not the complete empty persisted 10×6 matrix")
    return context, {name: str(value) for name, value in alternative_ids.items()}, {name: str(value) for name, value in criterion_ids.items()}


def _validate_active_profiles(active: dict[str, Any], fixture: dict[str, Any], criteria_ids_by_name: dict[str, str]) -> None:
    parameters = active.get("modelParameters")
    if not isinstance(parameters, dict) or parameters.get("orderedCategories") != fixture["orderedCategories"]:
        raise ScenarioLabError("persisted ordered categories differ from the fixture")
    persisted_profiles = (parameters.get("boundaryProfiles") or {}).get("profiles")
    expected_profiles = [
        {
            "profileId": profile["profileId"],
            "categoryId": profile["categoryId"],
            "valuesByCriterionId": {
                criteria_ids_by_name[next(item["name"] for item in fixture["criteria"] if item["key"] == key)]: value
                for key, value in profile["valuesByCriterionId"].items()
            },
        }
        for profile in fixture["boundaryProfiles"]["profiles"]
    ]
    if persisted_profiles != expected_profiles:
        raise ScenarioLabError("Backend did not persist boundary profiles with MongoDB criterion IDs and original scale values")
    if any(identifier.startswith("criterion-") for profile in persisted_profiles for identifier in profile["valuesByCriterionId"]):
        raise ScenarioLabError("temporary fixture criterion IDs remain in persisted boundary profiles")


def _evaluation_matrix(context: dict[str, Any], fixture: dict[str, Any], expert_key: str) -> dict[str, dict[str, float]]:
    alternatives = {item.get("name"): _id(item) for item in _items(context, "alternatives")}
    criteria = {item.get("name"): _id(item) for item in _items(context, "leafCriteria")}
    source = fixture["evaluationMatricesByExpert"][expert_key]
    matrix: dict[str, dict[str, float]] = {}
    for alternative in fixture["alternatives"]:
        alternative_id = alternatives.get(alternative["name"])
        if not alternative_id:
            raise ScenarioLabError(f"missing persisted ID for supplier {alternative['name']}")
        matrix[alternative_id] = {}
        for criterion in fixture["criteria"]:
            criterion_id = criteria.get(criterion["name"])
            value = source[alternative["key"]][criterion["key"]]
            if not criterion_id or not _finite(value) or not fixture["scale"]["minimum"] <= float(value) <= fixture["scale"]["maximum"]:
                raise ScenarioLabError(f"{expert_key} evaluation is incomplete or invalid")
            matrix[alternative_id][criterion_id] = float(value)
    if len(matrix) != 10 or any(len(row) != 6 for row in matrix.values()):
        raise ScenarioLabError("each individual expert evaluation must be a complete 10×6 matrix")
    return matrix


def _validate_finished(
    detail: Any,
    *,
    issue_id: str,
    issue_name: str,
    fixture: dict[str, Any],
    alternative_ids_by_name: dict[str, str],
    criterion_ids_by_name: dict[str, str],
    expert_ids_by_email: dict[str, str],
    effective_weights: dict[str, float],
) -> dict[str, str]:
    if not isinstance(detail, dict):
        raise ScenarioLabError("finished issue detail must be an object")
    issue, lifecycle, models, configuration = detail.get("issue"), detail.get("lifecycle"), detail.get("models"), detail.get("configuration")
    model_key = (((models or {}).get("base") or {}).get("technical") or {}).get("apiModelKey") if isinstance(models, dict) else None
    weighting_key = (((models or {}).get("criteriaWeighting") or {}).get("technical") or {}).get("apiModelKey") if isinstance(models, dict) else None
    weighting_config = configuration.get("criteriaWeighting") if isinstance(configuration, dict) else None
    alternative_config = configuration.get("alternativeEvaluation") if isinstance(configuration, dict) else None
    if (
        not isinstance(issue, dict)
        or _id(issue) != issue_id
        or issue.get("name") != issue_name
        or not isinstance(lifecycle, dict)
        or lifecycle.get("currentStage") != "finished"
        or lifecycle.get("active") is not False
        or model_key != MODEL_KEY
        or weighting_key != WEIGHTING_MODEL_KEY
    ):
        raise ScenarioLabError("finished issue identity, model, or lifecycle is incompatible")
    if (
        not isinstance(weighting_config, dict)
        or weighting_config.get("required") is not True
        or weighting_config.get("source") != "expertCriteriaWeighting"
        or weighting_config.get("structureKey") != "manualCriteriaWeights"
        or weighting_config.get("level") != "leaf"
        or not isinstance(alternative_config, dict)
        or alternative_config.get("structureKey") != "alternativeCriteriaMatrix"
    ):
        raise ScenarioLabError("finished issue does not preserve the two configured evaluation stages")
    if detail.get("consensus", {}).get("enabled") is not False or detail.get("consensus", {}).get("rounds") not in (None, []):
        raise ScenarioLabError("finished issue unexpectedly enables consensus rounds")

    participants = _items(detail, "participants")
    accepted = [item for item in participants if item.get("invitationStatus") == "accepted"]
    accepted_by_email = {(item.get("expert") or {}).get("email"): _id(item.get("expert") or {}) for item in accepted if isinstance(item.get("expert"), dict)}
    expected_emails = set(expert_ids_by_email)
    if (
        len(accepted) != 4
        or set(accepted_by_email) != expected_emails
        or any(
            not accepted_by_email[email] or item.get("weightsCompleted") is not True or item.get("evaluationCompleted") is not True
            for email in expected_emails
            for item in accepted
            if (item.get("expert") or {}).get("email") == email
        )
    ):
        raise ScenarioLabError("finished issue must contain four accepted experts complete in both stages")
    persisted_expert_ids = {accepted_by_email[email] for email in expected_emails}
    if persisted_expert_ids != set(expert_ids_by_email.values()):
        raise ScenarioLabError("expert identities differ between configured aliases and Finished Issue")

    evaluations = detail.get("evaluations")
    individual = evaluations.get("individual") if isinstance(evaluations, dict) else None
    contexts = evaluations.get("contexts") if isinstance(evaluations, dict) else None
    collective = evaluations.get("collective") if isinstance(evaluations, dict) else None
    if not isinstance(individual, list) or not isinstance(contexts, list) or not isinstance(collective, list):
        raise ScenarioLabError("Finished Issue evaluation audit is incomplete")
    expected_stages = {CRITERIA_STAGE: "manualCriteriaWeights", ALTERNATIVE_STAGE: "alternativeCriteriaMatrix"}
    stage_experts = {stage: set() for stage in expected_stages}
    for evaluation in individual:
        if (
            not isinstance(evaluation, dict)
            or evaluation.get("stage") not in expected_stages
            or evaluation.get("phase") != 0
            or evaluation.get("completed") is not True
            or evaluation.get("structureKey") != expected_stages[evaluation["stage"]]
            or not evaluation.get("submittedAt")
        ):
            raise ScenarioLabError("Finished Issue contains an incomplete individual stage evaluation")
        stage_experts[evaluation["stage"]].add(evaluation.get("expertId"))
    if any(stage_experts[stage] != persisted_expert_ids for stage in expected_stages) or len(individual) != 8:
        raise ScenarioLabError("all four stable expert IDs must occur once in both persisted stages")
    context_by_stage = {item.get("stage"): item for item in contexts if isinstance(item, dict) and item.get("phase") == 0}
    if set(context_by_stage) != set(expected_stages):
        raise ScenarioLabError("Finished Issue must retain one context for each evaluation stage")
    for stage, structure_key in expected_stages.items():
        context = context_by_stage[stage]
        decision_context = context.get("decisionContext")
        model = decision_context.get("model") if isinstance(decision_context, dict) else None
        expected_model = WEIGHTING_MODEL_KEY if stage == CRITERIA_STAGE else MODEL_KEY
        if (
            context.get("structureKey") != structure_key
            or not isinstance(model, dict)
            or model.get("apiModelKey") != expected_model
            or _id((decision_context or {}).get("issue")) != issue_id
        ):
            raise ScenarioLabError(f"Finished Issue {stage} context does not preserve the configured plugin")

    criteria = detail.get("criteria")
    criterion_nodes = _items(criteria, "nodes") if isinstance(criteria, dict) else []
    leaf_nodes = [item for item in criterion_nodes if item.get("isLeaf") is True]
    if len(leaf_nodes) != 6 or {_id(item) for item in leaf_nodes} != set(criterion_ids_by_name.values()):
        raise ScenarioLabError("Finished Issue must retain exactly the six persisted leaf criteria")
    final_weights = criteria.get("finalWeights") if isinstance(criteria, dict) else None
    persisted_weights = final_weights.get("byCriterionId") if isinstance(final_weights, dict) else None
    if not _same_number_map(persisted_weights, effective_weights):
        raise ScenarioLabError("Finished Issue finalWeights differ from the effective MCC weights")
    weight_result_source = final_weights.get("source") if isinstance(final_weights, dict) else None
    phase_results = [item for item in _items(detail, "phaseResults") if item.get("phase") == 0 and item.get("stage") in expected_stages]
    if len(phase_results) != 2:
        raise ScenarioLabError("Finished Issue must persist both criteria weighting and alternative result phases")
    result_by_stage = {item.get("stage"): item for item in phase_results}
    weight_result, sorting_result = result_by_stage.get(CRITERIA_STAGE), result_by_stage.get(ALTERNATIVE_STAGE)
    if (
        not isinstance(weight_result, dict)
        or not isinstance(sorting_result, dict)
        or weight_result.get("id") != (weight_result_source or {}).get("stageResultId")
        or (weight_result_source or {}).get("kind") != "criteriaWeightingStageResult"
    ):
        raise ScenarioLabError("persisted final weights must reference the criteriaWeighting MCC phase result")
    if sorting_result.get("resultStructureKey") != RESULT_STRUCTURE_KEY or sorting_result.get("resultStructureVersion") != RESULT_STRUCTURE_VERSION:
        raise ScenarioLabError("Finished Issue result is not sorting@1")
    standard = sorting_result.get("standardizedOutput")
    expected_by_id = {alternative_ids_by_name[item["name"]]: fixture["expectedAssignments"][item["key"]] for item in fixture["alternatives"]}
    actual = _validate_sorting_result(standard, categories=fixture["orderedCategories"], expected_by_alternative_id=expected_by_id)
    for entry in (sorting_result, standard, sorting_result.get("rawOutput"), sorting_result.get("modelSpecificOutput")):
        if isinstance(entry, dict) and any(key in entry for key in ("rank", "score", "rankedAlternatives")):
            raise ScenarioLabError("TOPSIS-Sort Finished Issue must not expose ranking fields")
    if not isinstance(sorting_result.get("rawOutput"), dict) or not isinstance(sorting_result.get("modelSpecificOutput"), dict):
        raise ScenarioLabError("Finished Issue must retain TOPSIS-Sort diagnostics")

    collective_by_stage = {item.get("stage"): item for item in collective if isinstance(item, dict) and item.get("phase") == 0}
    if set(collective_by_stage) != set(expected_stages):
        raise ScenarioLabError("Finished Issue must retain collective payloads for both stages")
    criteria_collective = collective_by_stage[CRITERIA_STAGE]
    if criteria_collective.get("phaseResultId") != weight_result.get("id") or not _same_number_map(
        (criteria_collective.get("rawPayload") or {}).get("weightsByCriterion"), effective_weights
    ):
        raise ScenarioLabError("persisted collective criteria weighting differs from MCC final weights")
    if collective_by_stage[ALTERNATIVE_STAGE].get("phaseResultId") != sorting_result.get("id"):
        raise ScenarioLabError("persisted collective alternative matrix does not reference the sorting result")

    persisted_alternatives = _items(detail, "alternatives")
    if len(persisted_alternatives) != 10 or {_id(item) for item in persisted_alternatives} != set(alternative_ids_by_name.values()):
        raise ScenarioLabError("Finished Issue alternatives do not preserve the ten IDs used by sorting@1")
    return {item["name"]: actual[alternative_ids_by_name[item["name"]]] for item in fixture["alternatives"]}


def _active_issue(api: IssuesApi, issue_id: str) -> dict[str, Any]:
    issue = next((item for item in _items(api.active_issues(), "issues") if _id(item) == issue_id), None)
    if not isinstance(issue, dict):
        raise ScenarioLabError("generated TOPSIS-Sort issue is no longer visible as active")
    return issue


def generate(
    sessions: SessionPool,
    store: ManifestStore,
    *,
    owner_alias: str = "owner",
    expert_a_alias: str = "expert_a",
    expert_b_alias: str = "expert_b",
    expert_c_alias: str = "expert_c",
    expert_d_alias: str = "expert_d",
    fixture_path: Path = FIXTURE_PATH,
) -> GenerationResult:
    fixture = load_fixture(fixture_path)
    offline_summary = _offline_validation(fixture_path)
    expert_aliases = (expert_a_alias, expert_b_alias, expert_c_alias, expert_d_alias)
    aliases = (owner_alias, *expert_aliases)
    if any(alias not in sessions.users for alias in aliases) or len(set(aliases)) != 5:
        raise ScenarioLabError(f"{SCENARIO_ID} requires five configured distinct aliases: owner and four experts")
    emails_by_alias = {alias: sessions.users[alias].email for alias in aliases}
    if len({email.casefold() for email in emails_by_alias.values()}) != 5:
        raise ScenarioLabError("owner and four expert accounts must have distinct email identities")
    expert_emails = [emails_by_alias[alias] for alias in expert_aliases]

    generation_id, issue_id = _new_generation_id(store), None
    issue_name = f"[AUTO:{generation_id}] {fixture['title']}"
    try:
        # Authenticate all five identities before any create request is sent.
        for alias in aliases:
            sessions.login(alias)
        owner = IssuesApi(sessions.client_for(owner_alias))
        models = owner.models()
        decision_model = _compatible_model(models)
        weighting_model = _select_weighting_model(models)
        if weighting_model.get("apiModelKey") != WEIGHTING_MODEL_KEY:
            raise ScenarioLabError("criteria weighting catalogue did not resolve manual_criteria_weights")
        users = _items(owner.users(), "users")
        missing = [email for email in expert_emails if not any(str(item.get("email", "")).casefold() == email.casefold() for item in users)]
        if missing:
            raise ScenarioLabError("configured experts are missing from the Backend user catalogue: " + ", ".join(missing))
        supported = _supported_domain_type_keys(decision_model)
        domain = _compatible_domain(owner.expression_domains(), supported, fixture)
        if not _id(domain):
            raise ScenarioLabError("compatible numeric expression domain has no persisted ID")

        owner.create_issue(_issue_payload(issue_name, _id(decision_model) or "", expert_emails, _id(domain) or "", fixture))
        matches = [item for item in _items(owner.active_issues(), "issues") if item.get("name") == issue_name]
        if len(matches) != 1 or not _id(matches[0]):
            raise ScenarioLabError("created issue could not be resolved uniquely from owner active issues")
        issue_id = _id(matches[0]) or ""
        active = matches[0]
        if (
            active.get("currentStage") != CRITERIA_STAGE
            or active.get("isConsensus") is not False
            or active.get("isIssueOwner") is not True
            or active.get("evaluationStructureKey") != "alternativeCriteriaMatrix"
            or active.get("criteriaWeightsStructureKey") != "manualCriteriaWeights"
            or active.get("resultStructureKey") != RESULT_STRUCTURE_KEY
            or active.get("resultStructureVersion") != RESULT_STRUCTURE_VERSION
        ):
            raise ScenarioLabError("new issue did not start in criteriaWeighting with the required sorting@1 configuration")
        for alias in expert_aliases:
            IssuesApi(sessions.client_for(alias)).respond_to_invitation(issue_id, "accepted")

        weight_identity: tuple[tuple[str, str], ...] | None = None
        submitted_weights: dict[str, dict[str, float]] = {}
        for index, (alias, expert_key) in enumerate(zip(expert_aliases, fixture["participants"]["experts"], strict=True)):
            context, identity = _weight_context(IssuesApi(sessions.client_for(alias)).evaluation(issue_id, CRITERIA_STAGE), issue_id, fixture)
            if weight_identity is not None and identity != weight_identity:
                raise ScenarioLabError("expert criteriaWeighting contexts do not use the same persisted leaf IDs")
            weight_identity = identity
            payload = _weight_payload(context, fixture, expert_key)
            submitted_weights[alias] = payload["weightsByCriterion"]
            response = IssuesApi(sessions.client_for(alias)).submit_evaluation(issue_id, CRITERIA_STAGE, payload)
            expected_stage = "weightsFinished" if index == 3 else CRITERIA_STAGE
            if (
                not isinstance(response, dict)
                or response.get("completed") is not True
                or response.get("stage") != CRITERIA_STAGE
                or response.get("structureKey") != "manualCriteriaWeights"
                or response.get("consensusPhase") != 0
                or response.get("currentStage") != expected_stage
            ):
                raise ScenarioLabError(f"{alias} criteriaWeighting submission did not advance through the expected lifecycle")
        if len(set(json.dumps(value, sort_keys=True) for value in submitted_weights.values())) != 4 or weight_identity is None:
            raise ScenarioLabError("the four expert weight submissions must be distinct")
        active = _active_issue(owner, issue_id)
        if active.get("currentStage") != "weightsFinished":
            raise ScenarioLabError("issue did not reach weightsFinished after four criteria submissions")
        criterion_ids_by_name = dict(weight_identity)
        criterion_ids_by_key = {item["key"]: criterion_ids_by_name[item["name"]] for item in fixture["criteria"]}
        effective_weights = _validate_weight_compute(
            owner.compute_evaluation(issue_id, CRITERIA_STAGE),
            fixture=fixture,
            criterion_ids_by_key=criterion_ids_by_key,
            emails_by_alias={alias: emails_by_alias[alias] for alias in expert_aliases},
        )
        active = _active_issue(owner, issue_id)
        if active.get("currentStage") != ALTERNATIVE_STAGE:
            raise ScenarioLabError("MCC calculation did not transition to alternativeEvaluation")

        alternative_identity: tuple[tuple[str, str], ...] | None = None
        alternatives_by_name: dict[str, str] | None = None
        submitted_matrices: list[dict[str, dict[str, float]]] = []
        for alias, expert_key in zip(expert_aliases, fixture["participants"]["experts"], strict=True):
            context, alternatives_by_name, criteria_ids_by_name = _evaluation_context(
                IssuesApi(sessions.client_for(alias)).evaluation(issue_id, ALTERNATIVE_STAGE), issue_id, _id(decision_model) or "", fixture
            )
            identity = tuple(sorted([*alternatives_by_name.items(), *criteria_ids_by_name.items()]))
            if alternative_identity is not None and identity != alternative_identity:
                raise ScenarioLabError("expert alternativeEvaluation contexts use inconsistent persisted IDs")
            if criteria_ids_by_name != criterion_ids_by_name:
                raise ScenarioLabError("criterion IDs changed between criteriaWeighting and alternativeEvaluation")
            alternative_identity = identity
            _validate_active_profiles(active, fixture, criteria_ids_by_name)
            matrix = _evaluation_matrix(context, fixture, expert_key)
            submitted_matrices.append(matrix)
            response = IssuesApi(sessions.client_for(alias)).submit_evaluation(issue_id, ALTERNATIVE_STAGE, matrix)
            if not isinstance(response, dict) or response.get("completed") is not True or response.get("currentStage") != ALTERNATIVE_STAGE:
                raise ScenarioLabError(f"{alias} alternativeEvaluation submission did not complete correctly")
        if len({json.dumps(matrix, sort_keys=True) for matrix in submitted_matrices}) != 4 or alternative_identity is None or alternatives_by_name is None:
            raise ScenarioLabError("the four expert alternative evaluation matrices must be complete and distinct")

        result_response = owner.compute_evaluation(issue_id, ALTERNATIVE_STAGE)
        result = result_response.get("result") if isinstance(result_response, dict) else None
        if not isinstance(result_response, dict) or result_response.get("stage") != ALTERNATIVE_STAGE or result_response.get("currentStage") != "finished":
            raise ScenarioLabError("TOPSIS-Sort did not finish the issue")
        expected_by_id = {alternatives_by_name[item["name"]]: fixture["expectedAssignments"][item["key"]] for item in fixture["alternatives"]}
        _validate_sorting_result(result, categories=fixture["orderedCategories"], expected_by_alternative_id=expected_by_id)
        finished_matches = [item for item in _items(owner.finished_issues(), "issues") if _id(item) == issue_id or item.get("name") == issue_name]
        if len(finished_matches) != 1:
            raise ScenarioLabError("computed issue could not be resolved uniquely from Finished Issues")
        detail = owner.finished_issue(issue_id)
        expert_ids_by_email = {
            (item.get("expert") or {}).get("email"): _id(item.get("expert") or {})
            for item in _items(detail, "participants")
            if isinstance(item.get("expert"), dict)
        }
        assignments = _validate_finished(
            detail,
            issue_id=issue_id,
            issue_name=issue_name,
            fixture=fixture,
            alternative_ids_by_name=alternatives_by_name,
            criterion_ids_by_name=criterion_ids_by_name,
            expert_ids_by_email={email: expert_ids_by_email.get(email, "") or "" for email in expert_emails},
            effective_weights=effective_weights,
        )
        entry = GeneratedIssue(
            generationId=generation_id,
            scenarioId=SCENARIO_ID,
            issueId=issue_id,
            issueName=issue_name,
            ownerAlias=owner_alias,
            visibleUserAliases=list(aliases),
        )
        try:
            store.add(entry)
        except ManifestError as error:
            raise ScenarioLabError(f"issue finished but manifest persistence failed; issueId={issue_id}: {error}") from error
        return GenerationResult(
            generation_id=generation_id,
            issue_id=issue_id,
            issue_name=issue_name,
            owner_alias=owner_alias,
            expert_aliases=expert_aliases,
            manifest_path=str(store.path),
            collective_weights_by_criterion_name={item["name"]: effective_weights[criterion_ids_by_name[item["name"]]] for item in fixture["criteria"]},
            assignments_by_alternative_name=assignments,
            offline_validation=offline_summary,
        )
    except Exception as error:
        if issue_id:
            raise ScenarioLabError(
                f"{SCENARIO_ID} failed after issue creation (generationId={generation_id}, issueName={issue_name}, issueId={issue_id}): {error}"
            ) from error
        if isinstance(error, ScenarioLabError):
            raise
        raise ScenarioLabError(f"{SCENARIO_ID} preflight failed (generationId={generation_id}): {error}") from error


__all__ = [
    "FIXTURE_PATH",
    "SCENARIO_ID",
    "_issue_payload",
    "_validate_finished",
    "_weight_context",
    "_weight_payload",
    "generate",
    "load_fixture",
    "validate_fixture",
]

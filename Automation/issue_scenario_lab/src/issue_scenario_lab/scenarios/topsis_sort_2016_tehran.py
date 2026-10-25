from __future__ import annotations

import importlib.util
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from issue_scenario_lab.api.issues import IssuesApi
from issue_scenario_lab.api.session_pool import SessionPool
from issue_scenario_lab.errors import ManifestError, ScenarioLabError
from issue_scenario_lab.manifest.models import GeneratedIssue
from issue_scenario_lab.manifest.store import ManifestStore
from issue_scenario_lab.scenarios.no_consensus_basic import _id, _items
from issue_scenario_lab.scenarios.topsis_sort_2016 import (
    MODEL_KEY,
    RESULT_STRUCTURE_KEY,
    RESULT_STRUCTURE_VERSION,
    _compatible_domain,
    _compatible_model,
    _domain_accepts,
    _new_generation_id,
    _supported_domain_type_keys,
    _validate_sorting_result,
)

SCENARIO_ID = "topsis-sort-2016-tehran"
STAGE = "alternativeEvaluation"
DOMAIN_NAME = "TOPSIS-Sort Tehran 2016 original numeric scale"
FIXTURE_PATH = Path(__file__).parents[5] / "DecisionModelsService" / "models" / "topsis_sort_2016" / "tehran_2016.py"
TABLE_3_ROUNDING_TOLERANCE = 5.01e-5
TABLE_4_DISTANCE_ROUNDING_TOLERANCE = 5.01e-5
TABLE_4_CLOSENESS_ROUNDING_TOLERANCE = 9e-5


@dataclass(frozen=True)
class GenerationResult:
    generation_id: str
    issue_id: str
    issue_name: str
    owner_alias: str
    expert_aliases: tuple[str, ...]
    manifest_path: str
    assignments_by_alternative_name: dict[str, str]
    max_table_3_absolute_difference: float
    max_table_4_distance_absolute_difference: float
    max_table_4_closeness_absolute_difference: float
    expression_domain_name: str
    expression_domain_range: tuple[float, float]
    expression_domain_created: bool


def _authoritative_data() -> Any:
    try:
        spec = importlib.util.spec_from_file_location("topsis_sort_2016_tehran_source", FIXTURE_PATH)
        if spec is None or spec.loader is None:
            raise ImportError("source fixture loader is unavailable")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    except (ImportError, OSError, AttributeError) as error:
        raise ScenarioLabError(f"unable to load authoritative TOPSIS-Sort Tehran fixture: {FIXTURE_PATH}") from error


def load_fixture() -> dict[str, Any]:
    """Adapt the scientific fixture directly; do not maintain a second data copy."""

    source = _authoritative_data()
    source_profiles = {profile["profile_id"]: profile for profile in source.TEHRAN_PROFILES}
    source_profiles_by_category = {profile["category_id"]: profile for profile in source.TEHRAN_PROFILES}
    category_order = list(source.TEHRAN_CATEGORIES)
    alternatives = [
        {
            "key": item["alternative_id"],
            "sourceId": item["alternative_id"],
            "name": f"District {index}",
            "valuesByCriterionId": dict(item["values_by_criterion_id"]),
        }
        for index, item in enumerate(source.TEHRAN_ALTERNATIVES, start=1)
    ]
    criteria = [
        {"key": item["criterion_id"], "name": item["criterion_id"], "type": item["direction"], "weight": item["weight"]} for item in source.TEHRAN_CRITERIA
    ]
    profiles = []
    for category in category_order[1:]:
        source_profile = source_profiles_by_category[category["category_id"]]
        profiles.append(
            {
                "profileId": source_profile["profile_id"],
                "categoryId": source_profile["category_id"],
                "valuesByCriterionId": dict(source_profile["values_by_criterion_id"]),
            }
        )
    class_by_district = {f"district-{index:02d}": paper_class for index, paper_class in enumerate(source.PUBLISHED_TABLE_5_CLASS_BY_DISTRICT, start=1)}
    category_by_paper_class = {int(category["category_id"].rsplit("C", 1)[1]): category["category_id"] for category in category_order}
    fixture = {
        "title": "TOPSIS-Sort 2016 — Tehran reproduction",
        "description": (
            "Reproduction of Sabokbar et al. (2016), Tehran example, Tables 1–5. "
            "The published study provides one evaluation matrix; one invited expert submits that matrix unchanged. "
            "Consensus is disabled. Paper classes run from C1 (best) to C5 (worst), while this application orders "
            "categories from least to most preferred, so the configured order is C5, C4, C3, C2, C1. "
            "Boundary profiles are consequently submitted in p4, p3, p2, p1 order."
        ),
        "criteria": criteria,
        "criteriaWeights": {item["criterion_id"]: item["weight"] for item in source.TEHRAN_CRITERIA},
        "alternatives": alternatives,
        "orderedCategories": [{"categoryId": item["category_id"], "label": item["label"], "order": item["order"]} for item in category_order],
        "boundaryProfiles": {"profiles": profiles},
        "evaluations": {item["key"]: dict(item["valuesByCriterionId"]) for item in alternatives},
        "expectedAssignments": {district_id: category_by_paper_class[paper_class] for district_id, paper_class in class_by_district.items()},
        "publishedTable3": source.PUBLISHED_TABLE_3_DIRECT_WEIGHTED,
        "publishedTable3Ideal": source.PUBLISHED_TABLE_3_IDEAL_DIRECT,
        "publishedTable3AntiIdeal": source.PUBLISHED_TABLE_3_ANTI_IDEAL_DIRECT,
        "publishedTable4": source.PUBLISHED_TABLE_4_DISTANCES,
        "sourceProfilesById": source_profiles,
    }
    validate_fixture(fixture)
    return fixture


def validate_fixture(fixture: dict[str, Any]) -> None:
    criteria, alternatives = fixture.get("criteria"), fixture.get("alternatives")
    if not isinstance(criteria, list) or len(criteria) != 5 or not isinstance(alternatives, list) or len(alternatives) != 22:
        raise ScenarioLabError("Tehran fixture must contain five criteria and 22 districts")
    if [item.get("key") for item in criteria] != ["g1", "g2", "g3", "g4", "g5"]:
        raise ScenarioLabError("Tehran criteria must preserve the published g1–g5 order")
    if [item.get("type") for item in criteria] != ["benefit", "benefit", "benefit", "benefit", "cost"]:
        raise ScenarioLabError("Tehran criterion directions differ from the published benefit/cost settings")
    if any(item.get("weight") != 0.2 for item in criteria) or fixture.get("criteriaWeights") != dict.fromkeys(("g1", "g2", "g3", "g4", "g5"), 0.2):
        raise ScenarioLabError("Tehran criteria must keep the published equal weights of 0.2")
    categories = fixture.get("orderedCategories")
    if not isinstance(categories, list) or len(categories) != 5 or [item["order"] for item in categories] != list(range(5)):
        raise ScenarioLabError("Tehran categories must be ordered C5 through C1 from least to most preferred")
    expected_categories = ["tehran-C5", "tehran-C4", "tehran-C3", "tehran-C2", "tehran-C1"]
    if [item["categoryId"] for item in categories] != expected_categories:
        raise ScenarioLabError("Tehran class direction mapping must remain explicit and reversed for the application")
    profiles = (fixture.get("boundaryProfiles") or {}).get("profiles")
    if not isinstance(profiles, list) or len(profiles) != 4 or [item["profileId"] for item in profiles] != ["p4", "p3", "p2", "p1"]:
        raise ScenarioLabError("Tehran boundaries must be mapped in application preference order p4, p3, p2, p1")
    if [item["categoryId"] for item in profiles] != expected_categories[1:]:
        raise ScenarioLabError("each Tehran boundary must identify its upper category")
    for alternative in alternatives:
        if set(alternative.get("valuesByCriterionId", {})) != {item["key"] for item in criteria}:
            raise ScenarioLabError("every Tehran district must preserve all five original evaluations")
    if len(fixture.get("expectedAssignments", {})) != 22 or len(fixture.get("publishedTable4", {})) != 26:
        raise ScenarioLabError("Tehran validation references must cover all 22 districts and four profiles")
    if set(fixture["expectedAssignments"].values()) - {"tehran-C1", "tehran-C2", "tehran-C3"}:
        raise ScenarioLabError("published Tehran Table 5 unexpectedly assigns a district to C4 or C5")


def _finite(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))


def _fixture_values(fixture: dict[str, Any]) -> list[float]:
    return [float(value) for row in fixture["evaluations"].values() for value in row.values()] + [
        float(value) for profile in fixture["boundaryProfiles"]["profiles"] for value in profile["valuesByCriterionId"].values()
    ]


def _compatible_domain_or_create(owner_api: IssuesApi, supported: set[str], fixture: dict[str, Any]) -> tuple[dict[str, Any], bool]:
    domains = owner_api.expression_domains()
    try:
        return _compatible_domain(domains, supported, fixture), False
    except ScenarioLabError as error:
        if str(error) != "no compatible numeric expression domain can represent every fixture value":
            raise
    if "numericContinuous" not in supported:
        raise ScenarioLabError("TOPSIS-Sort supports no compatible continuous domain for the original Tehran values")

    values = _fixture_values(fixture)
    definition = {"min": min(values), "max": max(values)}
    user_domains = domains.get("userDomains", []) if isinstance(domains, dict) else []
    named_domains = [item for item in user_domains if isinstance(item, dict) and item.get("name") == DOMAIN_NAME]
    if named_domains:
        existing = named_domains[0]
        current_definition = existing.get("definition", {})
        if (
            len(named_domains) != 1
            or existing.get("typeKey") != "numericContinuous"
            or current_definition.get("min") != definition["min"]
            or current_definition.get("max") != definition["max"]
        ):
            raise ScenarioLabError(f"a user expression domain named '{DOMAIN_NAME}' exists with different settings; it was not changed")
        raise ScenarioLabError(f"the existing '{DOMAIN_NAME}' domain does not pass the fixture compatibility check")

    created = owner_api.create_expression_domain({"name": DOMAIN_NAME, "typeKey": "numericContinuous", "definition": definition})
    if not isinstance(created, dict) or not _id(created):
        raise ScenarioLabError("Backend did not return the created Tehran numericContinuous domain")
    refreshed = owner_api.expression_domains()
    selected = _compatible_domain(refreshed, supported, fixture)
    selected_definition = selected.get("definition", {})
    if (
        _id(selected) != _id(created)
        or selected.get("name") != DOMAIN_NAME
        or selected_definition.get("min") != definition["min"]
        or selected_definition.get("max") != definition["max"]
    ):
        raise ScenarioLabError("created Tehran numeric domain was not returned unchanged in the subsequent Backend read")
    return selected, True


def _issue_payload(issue_name: str, model_id: str, expert_email: str, domain_id: str, fixture: dict[str, Any]) -> dict[str, Any]:
    criteria = [{"id": f"criterion-{item['key']}", "name": item["name"], "type": item["type"], "children": []} for item in fixture["criteria"]]
    weights = {f"criterion-{key}": value for key, value in fixture["criteriaWeights"].items()}
    profiles = [
        {
            "profileId": item["profileId"],
            "categoryId": item["categoryId"],
            "valuesByCriterionId": {f"criterion-{key}": value for key, value in item["valuesByCriterionId"].items()},
        }
        for item in fixture["boundaryProfiles"]["profiles"]
    ]
    return {
        "issueName": issue_name,
        "issueDescription": fixture["description"],
        "selectedModelId": model_id,
        "alternatives": [{"name": item["name"], "description": "Tehran metropolitan district"} for item in fixture["alternatives"]],
        "criteria": [{"id": "criterion-root", "name": "Tehran environmental quality", "type": "group", "children": criteria}],
        "addedExperts": [expert_email],
        "expressionDomainConfig": {"mode": "global", "globalDomainId": domain_id},
        "closureDate": None,
        "isConsensus": False,
        "simulateConsensus": False,
        "paramValues": {"orderedCategories": fixture["orderedCategories"], "boundaryProfiles": {"profiles": profiles}},
        "criteriaWeightingParameters": {},
        "criteriaWeightingConfig": {
            "mode": "creatorManual",
            "source": "creator",
            "method": "manual",
            "structureKey": "manualCriteriaWeights",
            "payload": {"weightsByCriterion": weights},
        },
    }


def _validate_empty_matrix(payload: Any, alternatives: list[dict[str, Any]], criteria: list[dict[str, Any]]) -> None:
    alternative_ids = {_id(item) for item in alternatives}
    criterion_ids = {_id(item) for item in criteria}
    if not isinstance(payload, dict) or set(payload) != alternative_ids:
        raise ScenarioLabError("expert evaluation context is not an empty matrix for all 22 persisted districts")
    if any(
        not isinstance(payload[item_id], dict) or set(payload[item_id]) != criterion_ids or any(value != "" for value in payload[item_id].values())
        for item_id in alternative_ids
    ):
        raise ScenarioLabError("expert evaluation context is not an empty 22×5 matrix")


def _validate_evaluation_context(response: Any, issue_id: str, model_id: str, fixture: dict[str, Any]) -> tuple[dict[str, Any], dict[str, str], dict[str, str]]:
    if (
        not isinstance(response, dict)
        or response.get("stage") != STAGE
        or response.get("structureKey") != "alternativeCriteriaMatrix"
        or response.get("consensusPhase") != 0
        or response.get("completed") is not False
    ):
        raise ScenarioLabError("Tehran expert evaluation context is incompatible")
    context = response.get("decisionContext")
    issue, structure, model = (context.get(key) for key in ("issue", "structure", "model")) if isinstance(context, dict) else (None, None, None)
    if (
        not isinstance(issue, dict)
        or _id(issue) != issue_id
        or issue.get("currentStage") != STAGE
        or issue.get("isConsensus") is not False
        or not isinstance(structure, dict)
        or structure.get("key") != "alternativeCriteriaMatrix"
        or not isinstance(model, dict)
        or _id(model) != model_id
        or model.get("apiModelKey") != MODEL_KEY
    ):
        raise ScenarioLabError("Tehran context does not identify the expected non-consensus TOPSIS-Sort Issue")
    alternatives, criteria = _items(context, "alternatives"), _items(context, "leafCriteria")
    alternatives_by_name = {item.get("name"): item for item in alternatives}
    criteria_by_name = {item.get("name"): item for item in criteria}
    if set(alternatives_by_name) != {item["name"] for item in fixture["alternatives"]} or len(alternatives) != 22:
        raise ScenarioLabError("persisted alternatives do not match the 22 Tehran districts")
    if set(criteria_by_name) != {item["name"] for item in fixture["criteria"]} or len(criteria) != 5:
        raise ScenarioLabError("persisted leaf criteria do not match g1–g5")
    alternative_ids = {name: _id(item) for name, item in alternatives_by_name.items()}
    criterion_ids = {name: _id(item) for name, item in criteria_by_name.items()}
    if (
        any(not value for value in [*alternative_ids.values(), *criterion_ids.values()])
        or len(set(alternative_ids.values())) != 22
        or len(set(criterion_ids.values())) != 5
    ):
        raise ScenarioLabError("Backend did not persist unique canonical IDs for Tehran alternatives and criteria")
    for expected in fixture["criteria"]:
        criterion = criteria_by_name[expected["name"]]
        if criterion.get("type") != expected["type"]:
            raise ScenarioLabError(f"persisted direction for {expected['name']} differs from the paper")
        domain = criterion.get("expressionDomain")
        values = [row[expected["key"]] for row in fixture["evaluations"].values()]
        values.extend(profile["valuesByCriterionId"][expected["key"]] for profile in fixture["boundaryProfiles"]["profiles"])
        if (
            not isinstance(domain, dict)
            or domain.get("typeKey") not in {"numericDiscrete", "numericContinuous"}
            or any(not _domain_accepts(domain, value) for value in values)
        ):
            raise ScenarioLabError(f"persisted expression domain cannot represent all original {expected['name']} values")
    _validate_empty_matrix(response.get("payload"), alternatives, criteria)
    return context, {key: str(value) for key, value in alternative_ids.items()}, {key: str(value) for key, value in criterion_ids.items()}


def _validate_active_configuration(active: dict[str, Any], alternative_ids: dict[str, str], criterion_ids: dict[str, str], fixture: dict[str, Any]) -> None:
    if set(alternative_ids) != {item["name"] for item in fixture["alternatives"]} or set(criterion_ids) != {item["name"] for item in fixture["criteria"]}:
        raise ScenarioLabError("persisted Tehran ID mappings do not cover every alternative and criterion")
    parameters = active.get("modelParameters")
    if not isinstance(parameters, dict) or parameters.get("orderedCategories") != fixture["orderedCategories"]:
        raise ScenarioLabError("persisted Tehran categories differ from the reversed application preference order")
    persisted_profiles = (parameters.get("boundaryProfiles") or {}).get("profiles")
    expected_profiles = [
        {
            "profileId": profile["profileId"],
            "categoryId": profile["categoryId"],
            "valuesByCriterionId": {criterion_ids[key]: value for key, value in profile["valuesByCriterionId"].items()},
        }
        for profile in fixture["boundaryProfiles"]["profiles"]
    ]
    if persisted_profiles != expected_profiles:
        raise ScenarioLabError("persisted Tehran profiles do not preserve original values and MongoDB criterion IDs")
    final_weights = active.get("finalWeights")
    if not isinstance(final_weights, dict) or any(
        not _finite(final_weights.get(key)) or abs(float(final_weights[key]) - 0.2) > 1e-9 for key in fixture["criteriaWeights"]
    ):
        raise ScenarioLabError("persisted criteria weights do not match the paper's equal 0.2 weights")


def _evaluation_matrix(context: dict[str, Any], fixture: dict[str, Any]) -> dict[str, dict[str, float]]:
    alternative_ids = {item.get("name"): _id(item) for item in _items(context, "alternatives")}
    criterion_ids = {item.get("name"): _id(item) for item in _items(context, "leafCriteria")}
    matrix = {}
    for alternative in fixture["alternatives"]:
        alternative_id = alternative_ids.get(alternative["name"])
        if not alternative_id:
            raise ScenarioLabError(f"missing persisted ID for {alternative['name']}")
        matrix[alternative_id] = {}
        for criterion in fixture["criteria"]:
            criterion_id = criterion_ids.get(criterion["name"])
            if not criterion_id:
                raise ScenarioLabError(f"missing persisted ID for {criterion['name']}")
            matrix[alternative_id][criterion_id] = fixture["evaluations"][alternative["key"]][criterion["key"]]
    if len(matrix) != 22 or any(len(row) != 5 for row in matrix.values()):
        raise ScenarioLabError("Tehran input did not produce a complete 22×5 matrix")
    return matrix


def _expected_matrix(alternative_ids: dict[str, str], criterion_ids: dict[str, str], fixture: dict[str, Any]) -> dict[str, dict[str, float]]:
    return {
        alternative_ids[alternative["name"]]: {
            criterion_ids[criterion["name"]]: fixture["evaluations"][alternative["key"]][criterion["key"]] for criterion in fixture["criteria"]
        }
        for alternative in fixture["alternatives"]
    }


def _max_absolute_difference(actual: list[float], expected: list[float]) -> float:
    if len(actual) != len(expected):
        raise ScenarioLabError("published and computed Tehran values have different dimensions")
    return max((abs(float(value) - float(reference)) for value, reference in zip(actual, expected, strict=True)), default=0.0)


def _validate_published_diagnostics(
    result: dict[str, Any], fixture: dict[str, Any], alternative_ids: dict[str, str], criterion_ids: dict[str, str]
) -> tuple[float, float, float]:
    diagnostics = result.get("diagnostics")
    if not isinstance(diagnostics, dict):
        raise ScenarioLabError("Tehran sorting result has no mathematical diagnostics")
    criterion_order = [criterion_ids[item["name"]] for item in fixture["criteria"]]
    weighted_alternatives = diagnostics.get("weighted_values_by_alternative_id")
    weighted_profiles = diagnostics.get("weighted_values_by_profile_id")
    if not isinstance(weighted_alternatives, dict) or not isinstance(weighted_profiles, dict):
        raise ScenarioLabError("Tehran result does not preserve the weighted alternative and profile matrices")
    max_table_3 = 0.0
    for reference_id, expected_row in fixture["publishedTable3"].items():
        current_id = reference_id if reference_id.startswith("p") else alternative_ids[f"District {int(reference_id.rsplit('-', 1)[1])}"]
        source_row = weighted_profiles.get(current_id) if reference_id.startswith("p") else weighted_alternatives.get(current_id)
        if not isinstance(source_row, dict) or any(key not in source_row for key in criterion_order):
            raise ScenarioLabError(f"weighted Table 3 row is missing for {reference_id}")
        displayed = [float(source_row[key]) for key in criterion_order[:4]]
        displayed.append(0.2 - float(source_row[criterion_order[4]]))
        max_table_3 = max(max_table_3, _max_absolute_difference(displayed, list(expected_row)))
    if max_table_3 > TABLE_3_ROUNDING_TOLERANCE:
        raise ScenarioLabError(f"computed weighted Table 3 differs beyond publication rounding ({max_table_3:.8g})")

    for field, expected in (
        ("positive_ideal_by_criterion_id", fixture["publishedTable3Ideal"]),
        ("negative_ideal_by_criterion_id", fixture["publishedTable3AntiIdeal"]),
    ):
        actual_by_id = diagnostics.get(field)
        if not isinstance(actual_by_id, dict) or any(key not in actual_by_id for key in criterion_order):
            raise ScenarioLabError(f"Tehran result does not preserve {field}")
        direct = [float(actual_by_id[key]) for key in criterion_order[:4]]
        direct.append(0.2 - float(actual_by_id[criterion_order[4]]))
        if _max_absolute_difference(direct, list(expected)) > TABLE_3_ROUNDING_TOLERANCE:
            raise ScenarioLabError(f"computed {field} differs from published Table 3 beyond rounding")

    distances_alternatives = diagnostics.get("distances_by_alternative_id")
    distances_profiles = diagnostics.get("distances_by_profile_id")
    closeness_alternatives = diagnostics.get("closeness_by_alternative_id")
    closeness_profiles = diagnostics.get("closeness_by_profile_id")
    if not all(isinstance(item, dict) for item in (distances_alternatives, distances_profiles, closeness_alternatives, closeness_profiles)):
        raise ScenarioLabError("Tehran result is missing Euclidean distance or closeness diagnostics")
    max_distance_difference = max_closeness_difference = 0.0
    for reference_id, expected in fixture["publishedTable4"].items():
        if reference_id.startswith("p"):
            distances = distances_profiles.get(reference_id)
            closeness = closeness_profiles.get(reference_id)
        else:
            current_id = alternative_ids[f"District {int(reference_id.rsplit('-', 1)[1])}"]
            distances = distances_alternatives.get(current_id)
            closeness = closeness_alternatives.get(current_id)
        if not isinstance(distances, dict) or not _finite(closeness):
            raise ScenarioLabError(f"Table 4 distance/closeness row is missing for {reference_id}")
        distance_difference = _max_absolute_difference(
            [float(distances.get("to_positive_ideal", math.nan)), float(distances.get("to_negative_ideal", math.nan))], list(expected[:2])
        )
        closeness_difference = abs(float(closeness) - float(expected[2]))
        max_distance_difference = max(max_distance_difference, distance_difference)
        max_closeness_difference = max(max_closeness_difference, closeness_difference)
    if max_distance_difference > TABLE_4_DISTANCE_ROUNDING_TOLERANCE or max_closeness_difference > TABLE_4_CLOSENESS_ROUNDING_TOLERANCE:
        raise ScenarioLabError(
            "computed Table 4 distances or closeness differ beyond tolerances for the paper's rounded intermediate table "
            f"(distance={max_distance_difference:.8g}, closeness={max_closeness_difference:.8g})"
        )
    return max_table_3, max_distance_difference, max_closeness_difference


def _validate_finished(
    detail: Any,
    *,
    issue_id: str,
    issue_name: str,
    fixture: dict[str, Any],
    alternative_ids: dict[str, str],
    criterion_ids: dict[str, str],
) -> tuple[dict[str, str], tuple[float, float, float]]:
    if not isinstance(detail, dict):
        raise ScenarioLabError("Finished Tehran Issue detail must be an object")
    issue, lifecycle, models = detail.get("issue"), detail.get("lifecycle"), detail.get("models")
    base_model = (models or {}).get("base") if isinstance(models, dict) else None
    technical = base_model.get("technical") if isinstance(base_model, dict) else None
    if (
        not isinstance(issue, dict)
        or _id(issue) != issue_id
        or issue.get("name") != issue_name
        or not isinstance(lifecycle, dict)
        or lifecycle.get("currentStage") != "finished"
        or lifecycle.get("active") is not False
        or not isinstance(technical, dict)
        or technical.get("apiModelKey") != MODEL_KEY
    ):
        raise ScenarioLabError("Finished Tehran Issue identity, lifecycle, or base model is incompatible")
    consensus = detail.get("consensus")
    if not isinstance(consensus, dict) or consensus.get("enabled") is not False or consensus.get("rounds") not in (None, []):
        raise ScenarioLabError("Tehran Issue unexpectedly contains consensus rounds")
    phase_results = [item for item in _items(detail, "phaseResults") if item.get("stage") == STAGE and item.get("phase") == 0]
    if (
        len(phase_results) != 1
        or phase_results[0].get("resultStructureKey") != RESULT_STRUCTURE_KEY
        or phase_results[0].get("resultStructureVersion") != RESULT_STRUCTURE_VERSION
    ):
        raise ScenarioLabError("Finished Tehran Issue must preserve one sorting@1 base result")
    result = phase_results[0].get("standardizedOutput")
    expected_by_id = {alternative_ids[item["name"]]: fixture["expectedAssignments"][item["key"]] for item in fixture["alternatives"]}
    actual = _validate_sorting_result(result, categories=fixture["orderedCategories"], expected_by_alternative_id=expected_by_id)
    metrics = _validate_published_diagnostics(result, fixture, alternative_ids, criterion_ids)
    if set(actual.values()) - {"tehran-C1", "tehran-C2", "tehran-C3"}:
        raise ScenarioLabError("Finished Tehran Issue assigned a district to original paper class C4 or C5")
    criteria = detail.get("criteria")
    nodes = _items(criteria, "nodes") if isinstance(criteria, dict) else []
    weights = ((criteria or {}).get("finalWeights") or {}).get("byCriterionId") if isinstance(criteria, dict) else None
    if not isinstance(weights, dict) or any(
        not _finite(weights.get(criterion_ids[item["name"]])) or abs(float(weights[criterion_ids[item["name"]]]) - 0.2) > 1e-9 for item in fixture["criteria"]
    ):
        raise ScenarioLabError("Finished Tehran Issue effective weights differ from the paper's equal weights")
    if any(key not in criterion_ids.values() for key in weights) or len([item for item in nodes if item.get("isLeaf") is True]) != 5:
        raise ScenarioLabError("Finished Tehran Issue criteria evidence does not preserve exactly g1–g5")
    evaluation_audit = detail.get("evaluations")
    individual = _items(evaluation_audit, "individual") if isinstance(evaluation_audit, dict) else []
    collective = _items(evaluation_audit, "collective") if isinstance(evaluation_audit, dict) else []
    if len(individual) != 1 or individual[0].get("stage") != STAGE or individual[0].get("phase") != 0 or individual[0].get("completed") is not True:
        raise ScenarioLabError("Finished Tehran Issue must preserve the one completed original expert matrix")
    expected_matrix = _expected_matrix(alternative_ids, criterion_ids, fixture)
    if individual[0].get("rawPayload") != expected_matrix:
        raise ScenarioLabError("Finished Tehran individual evaluation differs from the published 22×5 input matrix")
    collective_stage = [item for item in collective if item.get("stage") == STAGE and item.get("phase") == 0]
    if len(collective_stage) != 1 or collective_stage[0].get("rawPayload") != expected_matrix:
        raise ScenarioLabError("Finished Tehran collective evaluation differs from the published 22×5 input matrix")
    participants = _items(detail, "participants")
    accepted = [item for item in participants if item.get("invitationStatus") == "accepted"]
    if len(accepted) != 1 or accepted[0].get("evaluationCompleted") is not True:
        raise ScenarioLabError("Finished Tehran Issue must contain the one submitted original evaluation matrix")
    for key in ("rank", "score", "rankedAlternatives"):
        if key in result or key in phase_results[0]:
            raise ScenarioLabError("sorting result unexpectedly contains ranking fields")
    return {item["name"]: actual[alternative_ids[item["name"]]] for item in fixture["alternatives"]}, metrics


def generate(
    sessions: SessionPool,
    store: ManifestStore,
    *,
    owner_alias: str = "owner",
    expert_alias: str = "expert_a",
) -> GenerationResult:
    fixture = load_fixture()
    aliases = (owner_alias, expert_alias)
    if len(set(aliases)) != 2 or any(alias not in sessions.users for alias in aliases):
        raise ScenarioLabError(f"{SCENARIO_ID} requires distinct configured aliases: owner and one expert")
    emails = [sessions.users[alias].email for alias in aliases]
    if len({email.casefold() for email in emails}) != 2:
        raise ScenarioLabError("owner and expert emails must be distinct")
    generation_id, issue_id = _new_generation_id(store), None
    issue_name = f"[AUTO:{generation_id}] TOPSIS-Sort 2016 — Tehran reproduction"
    try:
        for alias in aliases:
            sessions.login(alias)
        owner_api = IssuesApi(sessions.client_for(owner_alias))
        model = _compatible_model(owner_api.models())
        users = _items(owner_api.users(), "users")
        if not any(str(item.get("email", "")).casefold() == emails[1].casefold() for item in users):
            raise ScenarioLabError("configured expert is absent from the Backend user catalogue")
        domain, domain_created = _compatible_domain_or_create(owner_api, _supported_domain_type_keys(model), fixture)
        create_response = owner_api.create_issue(_issue_payload(issue_name, _id(model) or "", emails[1], _id(domain) or "", fixture))
        if isinstance(create_response, dict):
            issue_id = _id(create_response) or _id(create_response.get("issue") or {})
        matches = [item for item in _items(owner_api.active_issues(), "issues") if item.get("name") == issue_name]
        if len(matches) != 1 or not _id(matches[0]):
            raise ScenarioLabError("created Tehran Issue could not be resolved uniquely from owner active issues")
        active = matches[0]
        issue_id = _id(active) or ""
        if (
            active.get("currentStage") != STAGE
            or active.get("isConsensus") is not False
            or active.get("isIssueOwner") is not True
            or active.get("evaluationStructureKey") != "alternativeCriteriaMatrix"
            or active.get("resultStructureKey") != RESULT_STRUCTURE_KEY
            or active.get("resultStructureVersion") != RESULT_STRUCTURE_VERSION
        ):
            raise ScenarioLabError("created Tehran Issue does not match the non-consensus alternativeCriteriaMatrix/sorting@1 contract")
        expert_api = IssuesApi(sessions.client_for(expert_alias))
        expert_api.respond_to_invitation(issue_id, "accepted")
        context_response = expert_api.evaluation(issue_id, STAGE)
        context, alternative_ids_by_name, criterion_ids_by_name = _validate_evaluation_context(context_response, issue_id, _id(model) or "", fixture)
        current_active = next((item for item in _items(owner_api.active_issues(), "issues") if _id(item) == issue_id), None)
        if not isinstance(current_active, dict):
            raise ScenarioLabError("Tehran Issue disappeared from owner active issues")
        _validate_active_configuration(current_active, alternative_ids_by_name, criterion_ids_by_name, fixture)
        submission = expert_api.submit_evaluation(issue_id, STAGE, _evaluation_matrix(context, fixture))
        if not isinstance(submission, dict) or submission.get("completed") is not True or submission.get("currentStage") != STAGE:
            raise ScenarioLabError("the original Tehran evaluation matrix was not accepted")
        computed = owner_api.compute_evaluation(issue_id, STAGE)
        result = computed.get("result") if isinstance(computed, dict) else None
        if not isinstance(computed, dict) or computed.get("stage") != STAGE or computed.get("currentStage") != "finished":
            raise ScenarioLabError("TOPSIS-Sort did not finish the Tehran Issue")
        expected_by_id = {alternative_ids_by_name[item["name"]]: fixture["expectedAssignments"][item["key"]] for item in fixture["alternatives"]}
        _validate_sorting_result(result, categories=fixture["orderedCategories"], expected_by_alternative_id=expected_by_id)
        metrics = _validate_published_diagnostics(result, fixture, alternative_ids_by_name, criterion_ids_by_name)
        finished = [item for item in _items(owner_api.finished_issues(), "issues") if _id(item) == issue_id]
        if len(finished) != 1:
            raise ScenarioLabError("computed Tehran Issue could not be resolved uniquely from Finished Issues")
        assignments, finished_metrics = _validate_finished(
            owner_api.finished_issue(issue_id),
            issue_id=issue_id,
            issue_name=issue_name,
            fixture=fixture,
            alternative_ids=alternative_ids_by_name,
            criterion_ids=criterion_ids_by_name,
        )
        if metrics != finished_metrics:
            raise ScenarioLabError("execution response and persisted Finished Issue diagnostics differ")
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
            raise ScenarioLabError(f"Tehran Issue finished but manifest persistence failed; issueId={issue_id}: {error}") from error
        domain_definition = domain["definition"]
        return GenerationResult(
            generation_id,
            issue_id,
            issue_name,
            owner_alias,
            (expert_alias,),
            str(store.path),
            assignments,
            *metrics,
            domain["name"],
            (float(domain_definition["min"]), float(domain_definition["max"])),
            domain_created,
        )
    except Exception as error:
        if issue_id:
            raise ScenarioLabError(
                f"{SCENARIO_ID} failed after issue creation (generationId={generation_id}, issueName={issue_name}, issueId={issue_id}): {error}"
            ) from error
        if isinstance(error, ScenarioLabError):
            raise
        raise ScenarioLabError(f"{SCENARIO_ID} preflight failed (generationId={generation_id}, issueName={issue_name}): {error}") from error


__all__ = ["FIXTURE_PATH", "SCENARIO_ID", "load_fixture", "validate_fixture", "generate"]

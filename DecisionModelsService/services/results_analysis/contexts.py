from copy import deepcopy

from .analytical_projection_reconstruction import reconstruct_sorting_projection
from .categorical_agreement_projection import build_categorical_agreement_projection

_SORTING_ORDER_SEMANTICS = "lower-order-is-less-preferred"


def _selected_execution(round_entry: dict) -> dict:
    execution = round_entry.get("selectedExecution")
    if execution is None:
        raise ValueError("Results Analysis round requires selectedExecution")
    return execution


def _result_structure(analysis_context: dict, execution: dict) -> dict:
    metadata = execution.get("resultStructure") or (analysis_context.get("issue") or {}).get("resultStructure")
    if not isinstance(metadata, dict):
        raise ValueError("Results Analysis execution requires resultStructure metadata")
    key = metadata.get("key")
    version = metadata.get("version")
    if not isinstance(key, str) or not key.strip() or not isinstance(version, int) or isinstance(version, bool) or version < 1:
        raise ValueError("Results Analysis execution has invalid resultStructure metadata")
    return {"key": key.strip(), "version": version}


def _ahp_sort_classification_relationship(
    analysis_context: dict,
    execution: dict,
    standard_result: dict,
    categories: list[dict],
    assignments: list[dict],
) -> dict | None:
    """Project saved AHPSort I individual/group categories to a safe summary."""
    diagnostics = standard_result.get("diagnostics")
    if not isinstance(diagnostics, dict) or diagnostics.get("modelKey") != "ahp_sort_i":
        return None
    individual = diagnostics.get("individualResultsByExpertId")
    request_evaluations = (execution.get("input") or {}).get("evaluations")
    if not isinstance(individual, dict) or len(individual) < 2 or not isinstance(request_evaluations, list):
        return None

    expert_names: dict[str, str] = {}
    directory = (analysis_context.get("semanticDirectory") or {}).get("expertsById") or {}
    if not isinstance(directory, dict):
        return None
    for evaluation in request_evaluations:
        expert = evaluation.get("expert") if isinstance(evaluation, dict) else None
        expert_id = expert.get("id") if isinstance(expert, dict) else None
        if not isinstance(expert_id, str) or not expert_id.strip() or expert_id in expert_names:
            return None
        saved = directory.get(expert_id)
        name = saved.get("name") if isinstance(saved, dict) else None
        if not isinstance(name, str) or not name.strip():
            name = expert.get("name") if isinstance(expert, dict) else None
        if not isinstance(name, str) or not name.strip():
            return None
        expert_names[expert_id] = name.strip()

    if set(individual) != set(expert_names):
        return None
    categories_by_id = {item["categoryId"]: item for item in categories}
    collective_by_alternative = {item["alternativeId"]: item for item in assignments}
    alternative_names = (analysis_context.get("semanticDirectory") or {}).get("alternativesById") or {}
    experts = []
    duplicate_names = {name for name in expert_names.values() if list(expert_names.values()).count(name) > 1}
    for expert_id in sorted(expert_names, key=lambda key: (key.casefold(), key)):
        result = individual.get(expert_id)
        by_alternative = result.get("resultsByAlternativeId") if isinstance(result, dict) else None
        if not isinstance(by_alternative, dict) or set(by_alternative) != set(collective_by_alternative):
            return None
        matches = 0
        disagreements = []
        for alternative_id, collective in collective_by_alternative.items():
            individual_assignment = by_alternative.get(alternative_id)
            category_id = individual_assignment.get("categoryId") if isinstance(individual_assignment, dict) else None
            if category_id not in categories_by_id:
                return None
            if category_id == collective["categoryId"]:
                matches += 1
                continue
            alternative = alternative_names.get(alternative_id) or {}
            alternative_name = alternative.get("name") if isinstance(alternative, dict) else None
            disagreements.append({
                "alternative": alternative_name if isinstance(alternative_name, str) and alternative_name.strip() else alternative_id,
                "individualCategory": categories_by_id[category_id]["label"],
                "collectiveCategory": collective["categoryLabel"],
            })
        name = expert_names[expert_id]
        if name in duplicate_names:
            name = f"{name} ({expert_id[-6:]})"
        total = len(collective_by_alternative)
        experts.append({
            "expertId": expert_id,
            "name": name,
            "exactCategoryMatches": matches,
            "totalAlternatives": total,
            "matchRate": matches / total if total else None,
            "disagreements": disagreements,
        })
    if not experts or any(item["totalAlternatives"] == 0 for item in experts):
        return None
    relationship = {"metric": "exact_category_match_rate", "experts": experts}
    alternative_ids = sorted(collective_by_alternative)
    projection_participants = [
        {
            "kind": "expert",
            "name": (
                f"{expert_names[expert_id]} ({expert_id[-6:]})"
                if expert_names[expert_id] in duplicate_names
                else f"{expert_names[expert_id]} (expert)"
                if expert_names[expert_id] == "Collective result"
                else expert_names[expert_id]
            ),
            "categoryIds": [
                (individual[expert_id]["resultsByAlternativeId"][alternative_id] or {}).get("categoryId")
                for alternative_id in alternative_ids
            ],
        }
        for expert_id in sorted(expert_names, key=lambda key: (key.casefold(), key))
    ]
    collective_pattern = [collective_by_alternative[alternative_id]["categoryId"] for alternative_id in alternative_ids]
    projection_participants.append({
        "kind": "collective",
        "name": "Collective result",
        "categoryIds": collective_pattern,
    })
    auxiliary_projection = build_categorical_agreement_projection(projection_participants)
    if auxiliary_projection is not None:
        relationship["auxiliaryProjection"] = auxiliary_projection
    return relationship


def _sorting_result_context(analysis_context: dict, standard_result: dict, execution: dict) -> dict:
    categories = standard_result.get("categories")
    assignments = standard_result.get("assignments")
    alternatives_by_id = (analysis_context.get("semanticDirectory") or {}).get("alternativesById") or {}
    if standard_result.get("categoryOrderSemantics") != _SORTING_ORDER_SEMANTICS:
        raise ValueError("sorting@1 result has unsupported category order semantics")
    if not isinstance(categories, list) or not categories:
        raise ValueError("sorting@1 result requires configured categories")
    if not isinstance(assignments, list):
        raise ValueError("sorting@1 result requires assignments")
    if not isinstance(alternatives_by_id, dict) or not alternatives_by_id or any(
        not isinstance(alternative, dict) for alternative in alternatives_by_id.values()
    ):
        raise ValueError("sorting@1 analysis requires the alternative semantic directory")

    normalized_categories = []
    category_ids = set()
    category_orders = set()
    for index, category in enumerate(categories):
        if not isinstance(category, dict):
            raise ValueError(f"sorting@1 category at index {index} must be an object")
        category_id = category.get("categoryId")
        label = category.get("label")
        order = category.get("order")
        if not isinstance(category_id, str) or not category_id.strip():
            raise ValueError(f"sorting@1 category at index {index} requires a categoryId")
        if not isinstance(label, str) or not label.strip():
            raise ValueError(f"sorting@1 category at index {index} requires a label")
        if not isinstance(order, int) or isinstance(order, bool) or order < 0:
            raise ValueError(f"sorting@1 category at index {index} requires a non-negative integer order")
        if category_id in category_ids or order in category_orders:
            raise ValueError("sorting@1 categories must have unique IDs and orders")
        category_ids.add(category_id)
        category_orders.add(order)
        normalized_categories.append({"categoryId": category_id, "label": label.strip(), "order": order})

    normalized_categories.sort(key=lambda category: category["order"])
    if [category["order"] for category in normalized_categories] != list(range(len(normalized_categories))):
        raise ValueError("sorting@1 category order must be complete and contiguous from zero")

    assignments_by_alternative = {}
    for index, assignment in enumerate(assignments):
        if not isinstance(assignment, dict):
            raise ValueError(f"sorting@1 assignment at index {index} must be an object")
        alternative_id = assignment.get("alternativeId")
        category_id = assignment.get("categoryId")
        if not isinstance(alternative_id, str) or not alternative_id.strip():
            raise ValueError(f"sorting@1 assignment at index {index} requires an alternativeId")
        if not isinstance(category_id, str) or category_id not in category_ids:
            raise ValueError(f"sorting@1 assignment at index {index} references an unknown category")
        if alternative_id in assignments_by_alternative:
            raise ValueError("sorting@1 alternatives must have exactly one assignment")
        if alternative_id not in alternatives_by_id:
            raise ValueError("sorting@1 assignment references an unknown alternative")
        assignments_by_alternative[alternative_id] = category_id

    expected_alternative_ids = set(alternatives_by_id)
    if set(assignments_by_alternative) != expected_alternative_ids:
        raise ValueError("sorting@1 assignments must cover every configured alternative exactly once")

    categories_by_id = {category["categoryId"]: category for category in normalized_categories}
    normalized_assignments = []
    for alternative_id, category_id in assignments_by_alternative.items():
        alternative_name = alternatives_by_id[alternative_id].get("name")
        if not isinstance(alternative_name, str) or not alternative_name.strip():
            alternative_name = alternative_id
        normalized_assignments.append(
            {
                "alternativeId": alternative_id,
                "name": alternative_name.strip(),
                "categoryId": category_id,
                "categoryLabel": categories_by_id[category_id]["label"],
                "categoryOrder": categories_by_id[category_id]["order"],
            }
        )
    normalized_assignments.sort(key=lambda assignment: (assignment["categoryOrder"], assignment["name"], assignment["alternativeId"]))
    projected = {
        "categories": normalized_categories,
        "categoryOrderSemantics": _SORTING_ORDER_SEMANTICS,
        "assignments": normalized_assignments,
    }
    classification_relationship = _ahp_sort_classification_relationship(
        analysis_context,
        execution,
        standard_result,
        normalized_categories,
        normalized_assignments,
    )
    if classification_relationship is not None:
        projected["expertCollectiveClassificationRelationship"] = classification_relationship
    return projected


def build_generic_round_context(analysis_context: dict, round_entry: dict) -> dict:
    """Project an executed round to model-independent evidence only."""
    execution = _selected_execution(round_entry)
    standard_result = execution["result"]["standardResult"]
    result_structure = _result_structure(analysis_context, execution)
    projected_result = {}
    if result_structure["key"] == "ranking" and result_structure["version"] == 1:
        projected_result["ranking"] = [
            {
                "alternativeId": entry["alternativeId"],
                "rank": entry["rank"],
                **({"score": entry["score"]} if "score" in entry else {}),
            }
            for entry in standard_result.get("rankedAlternatives", [])
        ]
    elif result_structure["key"] == "sorting" and result_structure["version"] == 1:
        projected_result.update(_sorting_result_context(analysis_context, standard_result, execution))
    else:
        raise ValueError(f"Generic Results Analysis does not support {result_structure['key']}@{result_structure['version']}")
    start = round_entry.get("start")
    projection = standard_result.get("plotsGraphic")
    if result_structure == {"key": "sorting", "version": 1}:
        rebuilt_projection = reconstruct_sorting_projection(execution)
        # TOPSIS-Sort stores frozen numeric input with the execution. Rebuild
        # only optional display evidence so historical rounded projections can
        # regain full coordinate precision and exact-matrix provenance without
        # re-running classification. Keep a valid stored projection as fallback
        # when the frozen input is absent or no longer usable.
        if rebuilt_projection and not rebuilt_projection.get("reason"):
            projection = rebuilt_projection
        elif not projection:
            projection = rebuilt_projection

    return deepcopy(
        {
            "phase": round_entry["phase"],
            "participants": start.get("participants") if start else None,
            "attempts": round_entry.get("executionAttempts", []),
            "execution": {
                "attemptId": execution["attemptId"],
                "startedAt": execution["startedAt"],
                "completedAt": execution["completedAt"],
                "resultStructure": result_structure,
                **projected_result,
                "consensusMeasure": standard_result.get("consensusMeasure"),
                "expertCollectiveProjection": projection,
            },
        }
    )


def _executed_rounds(analysis_context: dict) -> list[dict]:
    return sorted(
        (
            entry
            for entry in analysis_context.get("rounds", [])
            if entry.get("selectedExecution") is not None
        ),
        key=lambda entry: entry["phase"],
    )


def build_generic_issue_context(analysis_context: dict) -> dict:
    """Project the issue to information generic analysis may safely interpret."""
    issue = analysis_context["issue"]
    rounds = [
        build_generic_round_context(analysis_context, entry)
        for entry in _executed_rounds(analysis_context)
    ]
    structures = [round_entry["execution"]["resultStructure"] for round_entry in rounds]
    if structures and any(structure != structures[0] for structure in structures[1:]):
        raise ValueError("One Results Analysis execution cannot mix result structures across phases")
    result_structure = structures[0] if structures else issue.get("resultStructure")
    return deepcopy(
        {
            "resultStructure": result_structure,
            "issue": {
                "id": issue["id"],
                "name": issue["name"],
                "description": issue["description"],
                "lifecycle": issue["lifecycle"],
                "consensus": issue["consensus"],
            },
            "participants": analysis_context["participants"],
            "semanticDirectory": analysis_context["semanticDirectory"],
            "rounds": rounds,
        }
    )


def build_model_round_context(analysis_context: dict, round_entry: dict) -> dict:
    """Provide an executed round's exact mathematical input to its own model."""
    execution = _selected_execution(round_entry)
    return deepcopy(
        {
            "phase": round_entry["phase"],
            "issue": analysis_context["issue"],
            "decisionSpace": analysis_context["decisionSpace"],
            "participants": analysis_context["participants"],
            "semanticDirectory": analysis_context["semanticDirectory"],
            "execution": execution,
        }
    )


def build_model_issue_context(analysis_context: dict) -> dict:
    """Provide issue-level frozen data and exact executed-round evidence to a model."""
    return deepcopy(
        {
            "issue": analysis_context["issue"],
            "decisionSpace": analysis_context["decisionSpace"],
            "participants": analysis_context["participants"],
            "semanticDirectory": analysis_context["semanticDirectory"],
            "rounds": [
                {"phase": entry["phase"], "execution": entry["selectedExecution"]}
                for entry in _executed_rounds(analysis_context)
            ],
        }
    )

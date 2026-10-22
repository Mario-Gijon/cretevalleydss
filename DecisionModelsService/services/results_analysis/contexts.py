from copy import deepcopy

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


def _sorting_result_context(analysis_context: dict, standard_result: dict) -> dict:
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
    return {
        "categories": normalized_categories,
        "categoryOrderSemantics": _SORTING_ORDER_SEMANTICS,
        "assignments": normalized_assignments,
    }


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
        projected_result.update(_sorting_result_context(analysis_context, standard_result))
    else:
        raise ValueError(f"Generic Results Analysis does not support {result_structure['key']}@{result_structure['version']}")
    start = round_entry.get("start")

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
                "expertCollectiveProjection": standard_result.get("plotsGraphic"),
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

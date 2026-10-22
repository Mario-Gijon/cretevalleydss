def _category_signature(categories):
    return tuple(
        (item.get("categoryId"), item.get("label"), item.get("order"))
        for item in categories or []
    )


def categorical_alternative_relationships(rounds):
    """Project category membership and only compare phases with identical semantics."""
    phases = []
    for round_entry in rounds or []:
        execution = round_entry.get("execution") or {}
        categories = execution.get("categories") or []
        alternatives = execution.get("assignments") or []
        groups_by_id = {
            category["categoryId"]: {
                "categoryId": category["categoryId"],
                "label": category["label"],
                "order": category["order"],
                "alternatives": [],
            }
            for category in categories
        }
        for alternative in alternatives:
            groups_by_id[alternative["categoryId"]]["alternatives"].append(
                {
                    "alternativeId": alternative["alternativeId"],
                    "name": alternative["name"],
                }
            )
        groups = list(groups_by_id.values())
        phases.append(
            {
                "phase": round_entry.get("phase"),
                "categoryOrderSemantics": execution.get("categoryOrderSemantics"),
                "categories": categories,
                "alternatives": alternatives,
                "groups": groups,
            }
        )

    transitions = []
    unavailable_transitions = []
    for previous, current in zip(phases, phases[1:]):
        previous_ids = {item["alternativeId"] for item in previous["alternatives"]}
        current_ids = {item["alternativeId"] for item in current["alternatives"]}
        if previous["categoryOrderSemantics"] != current["categoryOrderSemantics"] or _category_signature(previous["categories"]) != _category_signature(current["categories"]):
            unavailable_transitions.append(
                {"fromPhase": previous["phase"], "toPhase": current["phase"], "reason": "category_configuration_changed"}
            )
            continue
        if previous_ids != current_ids:
            unavailable_transitions.append(
                {"fromPhase": previous["phase"], "toPhase": current["phase"], "reason": "alternative_set_changed"}
            )
            continue

        previous_by_id = {item["alternativeId"]: item for item in previous["alternatives"]}
        current_by_id = {item["alternativeId"]: item for item in current["alternatives"]}
        changes = []
        unchanged = []
        for alternative_id in sorted(previous_ids):
            before = previous_by_id[alternative_id]
            after = current_by_id[alternative_id]
            if before["categoryId"] == after["categoryId"]:
                unchanged.append({"alternativeId": alternative_id, "name": after["name"], "categoryId": after["categoryId"], "categoryLabel": after["categoryLabel"]})
            else:
                changes.append(
                    {
                        "alternativeId": alternative_id,
                        "name": after["name"],
                        "fromCategoryId": before["categoryId"],
                        "fromCategoryLabel": before["categoryLabel"],
                        "fromCategoryOrder": before["categoryOrder"],
                        "toCategoryId": after["categoryId"],
                        "toCategoryLabel": after["categoryLabel"],
                        "toCategoryOrder": after["categoryOrder"],
                    }
                )
        transitions.append(
            {
                "fromPhase": previous["phase"],
                "toPhase": current["phase"],
                "changes": changes,
                "unchanged": unchanged,
            }
        )

    return {
        "mode": "categorical",
        "available": bool(phases),
        "phases": phases,
        "transitions": transitions,
        "unavailableTransitions": unavailable_transitions,
    }

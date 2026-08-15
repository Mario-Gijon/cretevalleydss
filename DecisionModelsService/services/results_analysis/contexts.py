from copy import deepcopy


def _selected_execution(round_entry: dict) -> dict:
    execution = round_entry.get("selectedExecution")
    if execution is None:
        raise ValueError("Results Analysis round requires selectedExecution")
    return execution


def build_generic_round_context(analysis_context: dict, round_entry: dict) -> dict:
    """Project an executed round to model-independent evidence only."""
    execution = _selected_execution(round_entry)
    standard_result = execution["result"]["standardResult"]
    ranking = [
        {"alternativeId": entry["alternativeId"], "rank": entry["rank"]}
        for entry in standard_result.get("rankedAlternatives", [])
    ]
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
                "ranking": ranking,
                "consensusMeasure": standard_result.get("consensusMeasure"),
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
    return deepcopy(
        {
            "issue": {
                "id": issue["id"],
                "name": issue["name"],
                "description": issue["description"],
                "lifecycle": issue["lifecycle"],
                "consensus": issue["consensus"],
            },
            "participants": analysis_context["participants"],
            "semanticDirectory": analysis_context["semanticDirectory"],
            "rounds": [
                build_generic_round_context(analysis_context, entry)
                for entry in _executed_rounds(analysis_context)
            ],
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

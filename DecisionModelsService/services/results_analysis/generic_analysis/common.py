from math import isfinite


def finite(value):
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and isfinite(value)
    )


def fmt(value):
    return f"{value:.4f}".rstrip("0").rstrip(".") if finite(value) else "—"


def ordinal(value):
    value = int(value)
    if 10 <= value % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(value % 10, "th")
    return f"{value}{suffix}"


def phase_label(phase):
    if phase == 0:
        return "Initial"
    if isinstance(phase, int):
        return f"Round {phase}"
    return f"Phase {phase}"


def alternative_name(context, alternative_id):
    alternatives = (
        (context.get("semanticDirectory") or {}).get("alternativesById") or {}
    )
    return (alternatives.get(alternative_id) or {}).get("name") or alternative_id


def ranking(context, entries):
    result = []
    for entry in entries or []:
        alternative_id = entry.get("alternativeId")
        rank = entry.get("rank")
        if alternative_id is None or not finite(rank):
            continue
        result.append(
            {
                "alternativeId": alternative_id,
                "name": alternative_name(context, alternative_id),
                "rank": rank,
            }
        )
    return sorted(result, key=lambda item: (item["rank"], item["name"]))


def attempt_summary(entries):
    entries = entries or []
    return {
        "total": len(entries),
        "succeeded": sum(item.get("status") == "succeeded" for item in entries),
        "failed": sum(item.get("status") == "failed" for item in entries),
        "applied": sum(
            item.get("applicationStatus") == "applied" for item in entries
        ),
        "hadRetries": len(entries) > 1,
    }

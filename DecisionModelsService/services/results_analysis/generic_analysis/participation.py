def participant_summary(context, rounds):
    participants = context.get("participants") or {}
    historical = participants.get("historicalIdentities") or []
    current = participants.get("current") or []
    completed = sum(item.get("evaluationCompleted") is True for item in current)

    phase_counts = []
    for round_entry in rounds:
        round_participants = round_entry.get("participants")
        if not isinstance(round_participants, list):
            continue
        phase_counts.append(
            {
                "phase": round_entry["phase"],
                "participantCount": len(round_participants),
            }
        )

    participant_counts = [entry["participantCount"] for entry in phase_counts]
    stable_across_phases = (
        len(participant_counts) >= 2
        and all(count == participant_counts[0] for count in participant_counts[1:])
    )

    return {
        "historicalCount": len(historical),
        "currentCount": len(current),
        "acceptedCurrentCount": sum(
            item.get("invitationStatus") == "accepted" for item in current
        ),
        "evaluationCompletedCurrentCount": completed,
        "evaluationCompletionRate": completed / len(current) if current else None,
        "phaseCounts": phase_counts,
        "participantCountStableAcrossPhases": stable_across_phases,
        "participantCountChange": (
            participant_counts[-1] - participant_counts[0]
            if len(participant_counts) >= 2
            else None
        ),
    }

"""Baseline analysis facts prepared from validated frozen AHPSort I evidence."""

from __future__ import annotations

from typing import Any

from .evidence import AHPSortIEvidence


def _priority_details(result: dict[str, Any]) -> dict[str, Any]:
    local_priorities = {}
    for criterion_id, criterion in (result.get("localPrioritiesByCriterion") or {}).items():
        profile_priorities = criterion.get("profilesById") or criterion.get(
            "centralProfilesById"
        )
        local_priorities[criterion_id] = {
            "alternative": criterion.get("alternative"),
            **(
                {"profilesById": dict(profile_priorities)}
                if isinstance(profile_priorities, dict)
                else {}
            ),
        }
    return {
        "categoryId": result["categoryId"],
        "globalPriority": result.get("globalPriority"),
        "profileGlobalPrioritiesById": dict(
            result.get("profileGlobalPrioritiesById")
            or result.get("centralProfilePrioritiesById")
            or {}
        ),
        "localPrioritiesByCriterion": local_priorities,
        "classification": dict(result.get("classification") or {}),
    }


def build_core_facts(evidence: AHPSortIEvidence) -> dict[str, Any]:
    """Expose the validated baseline fields needed by interpretation and graphs."""
    diagnostics = evidence.baseline_result.get("diagnostics", {})
    raw_individual = diagnostics.get("individualResultsByExpertId")
    if not isinstance(raw_individual, dict) and len(evidence.experts) == 1:
        raw_individual = {evidence.experts[0]["expertId"]: diagnostics}
    individual_results = {
        expert_id: {
            "resultsByAlternativeId": {
                alternative_id: _priority_details(result)
                for alternative_id, result in (
                    expert_result.get("resultsByAlternativeId") or {}
                ).items()
            }
        }
        for expert_id, expert_result in (raw_individual or {}).items()
    }
    collective_results = {
        alternative_id: {
            key: result.get(key)
            for key in (
                "categoryId",
                "selectedCategoryId",
                "votesByCategoryId",
                "classificationsByExpertId",
                "aggregationStatus",
                "tieDetected",
                "tiePolicy",
            )
            if key in result
        }
        for alternative_id, result in (diagnostics.get("resultsByAlternativeId") or {}).items()
    } if len(evidence.experts) > 1 else {}
    return {
        "status": "available",
        "sourcePhase": evidence.source_phase,
        "executedRounds": evidence.executed_rounds,
        "executionId": evidence.execution_id,
        "comparisonKey": evidence.comparison_key,
        "profileMode": evidence.profile_mode,
        "criteria": [dict(item) for item in evidence.criteria],
        "effectiveWeightsByCriterion": dict(evidence.criterion_weights_by_id),
        "alternatives": [dict(item) for item in evidence.alternatives],
        "categories": [dict(item) for item in evidence.categories],
        "profiles": [dict(item) for item in evidence.profiles],
        "experts": [
            {
                "expertId": item["expertId"],
                **({"name": item["name"]} if item.get("name") else {}),
            }
            for item in evidence.experts
        ],
        "profileTiePolicy": evidence.profile_tie_policy,
        "groupTiePolicy": evidence.group_tie_policy,
        "executedAssignments": dict(evidence.executed_assignments),
        "individualResultsByExpertId": individual_results,
        "collectiveResultsByAlternativeId": collective_results,
        "aggregationMethod": diagnostics.get("aggregationMethod"),
    }


__all__ = ["build_core_facts"]

from copy import deepcopy


def normalize_analysis_result(value):
    """Validate and detach an optional model-analysis result."""
    if value is None:
        return None

    if not isinstance(value, dict):
        raise TypeError("Analysis result must be a dict or None")

    allowed_fields = {"facts", "interpretation", "visualizations", "sections"}
    unexpected_fields = set(value) - allowed_fields
    if unexpected_fields:
        raise ValueError(
            "Analysis result contains unsupported fields: "
            + ", ".join(sorted(unexpected_fields))
        )

    if "facts" in value and not isinstance(value["facts"], dict):
        raise TypeError("Analysis result facts must be a dict")
    if "interpretation" in value and not isinstance(value["interpretation"], str):
        raise TypeError("Analysis result interpretation must be a string")
    if "visualizations" in value and not isinstance(value["visualizations"], list):
        raise TypeError("Analysis result visualizations must be a list")
    if "sections" in value and not isinstance(value["sections"], list):
        raise TypeError("Analysis result sections must be a list")

    return deepcopy(value)

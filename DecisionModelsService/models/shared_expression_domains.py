from typing import Any


SUPPORTED_EXPRESSION_DOMAIN_TYPE_KEYS = frozenset(
    {
        "numericContinuous",
        "numericDiscrete",
        "linguisticOrdinal",
        "linguisticFuzzy",
        "linguistic2Tuple",
    }
)


def expression_domain_type_key(expression_domain: Any) -> str:
    if not isinstance(expression_domain, dict):
        return ""

    return str(expression_domain.get("typeKey") or "").strip()


def expression_domain_definition(expression_domain: Any) -> dict[str, Any]:
    if not isinstance(expression_domain, dict):
        return {}

    definition = expression_domain.get("definition")
    if not isinstance(definition, dict):
        return {}

    return definition


def resolve_linguistic_label_key(value: Any, field: str) -> str:
    if not isinstance(value, dict):
        raise ValueError(
            f"{field}.value must be an object with exactly the key 'labelKey'"
        )

    if set(value.keys()) != {"labelKey"}:
        raise ValueError(
            f"{field}.value must be an object with exactly the key 'labelKey'"
        )

    label_key = str(value.get("labelKey") or "").strip()
    if not label_key:
        raise ValueError(f"{field}.value.labelKey is required")

    return label_key


def resolve_linguistic_label_definition(
    *,
    value: Any,
    expression_domain: dict[str, Any],
    field: str,
) -> dict[str, Any]:
    label_key = resolve_linguistic_label_key(value, field)
    labels = expression_domain_definition(expression_domain).get("labels")

    if not isinstance(labels, list) or len(labels) == 0:
        raise ValueError(
            f"{field}.expressionDomain.definition.labels is required"
        )

    for label_definition in labels:
        if not isinstance(label_definition, dict):
            continue

        current_label_key = str(label_definition.get("key") or "").strip()
        if current_label_key == label_key:
            return label_definition

    raise ValueError(f"Unknown linguistic label '{label_key}'")


def resolve_linguistic_2tuple_value(
    *,
    value: Any,
    expression_domain: dict[str, Any],
    field: str,
) -> dict[str, Any]:
    """
    Validate and resolve a canonical linguistic 2-tuple value.

    A linguistic 2-tuple is represented as:

        {
            "labelKey": str,
            "alpha": float,
        }

    Given the position i of labelKey in the ordered linguistic scale:

        beta = i + alpha

    with:

        -0.5 <= alpha < 0.5

    and beta constrained to the valid scale interval.
    """

    if not isinstance(value, dict) or set(value.keys()) != {
        "labelKey",
        "alpha",
    }:
        raise ValueError(
            f"{field}.value must be an object with exactly "
            "'labelKey' and 'alpha'"
        )

    raw_label_key = value.get("labelKey")
    if not isinstance(raw_label_key, str) or not raw_label_key.strip():
        raise ValueError(f"{field}.value.labelKey is required")

    label_key = raw_label_key.strip()

    raw_alpha = value.get("alpha")
    if isinstance(raw_alpha, bool) or not isinstance(
        raw_alpha, (int, float)
    ):
        raise ValueError(f"{field}.value.alpha must be a finite number")

    alpha = float(raw_alpha)

    if alpha != alpha or alpha in {float("inf"), float("-inf")}:
        raise ValueError(f"{field}.value.alpha must be a finite number")

    if alpha < -0.5 or alpha >= 0.5:
        raise ValueError(
            f"{field}.value.alpha must be greater than or equal to "
            "-0.5 and less than 0.5"
        )

    labels = expression_domain_definition(expression_domain).get("labels")

    if not isinstance(labels, list) or len(labels) == 0:
        raise ValueError(
            f"{field}.expressionDomain.definition.labels is required"
        )

    matching_indexes = []

    for index, label_definition in enumerate(labels):
        if not isinstance(label_definition, dict):
            continue

        current_label_key = label_definition.get("key")
        if current_label_key == label_key:
            matching_indexes.append(index)

    if len(matching_indexes) != 1:
        raise ValueError(f"Unknown linguistic label '{label_key}'")

    label_index = matching_indexes[0]
    beta = float(label_index + alpha)
    maximum_index = len(labels) - 1

    if beta < 0 or beta > maximum_index:
        raise ValueError(
            f"{field}.value.labelKey and alpha produce an "
            "out-of-range linguistic position"
        )

    return {
        "labelKey": label_key,
        "alpha": alpha,
        "labelIndex": label_index,
        "beta": beta,
    }
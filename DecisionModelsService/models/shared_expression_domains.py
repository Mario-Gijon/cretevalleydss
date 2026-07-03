from typing import Any


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
    if isinstance(value, str):
        label_key = value.strip()
    elif isinstance(value, dict):
        label_key = str(value.get("labelKey") or "").strip()
    else:
        label_key = ""

    if not label_key:
        raise ValueError(f"{field}.value is required")

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
        raise ValueError(f"{field}.expressionDomain.definition.labels is required")

    for label_definition in labels:
        if not isinstance(label_definition, dict):
            continue

        current_label_key = str(label_definition.get("key") or "").strip()
        if current_label_key == label_key:
            return label_definition

    raise ValueError(f"Unknown linguistic label '{label_key}'")


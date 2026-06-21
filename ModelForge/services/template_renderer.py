import re


PLACEHOLDER_PATTERN = re.compile(r"{{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*}}")


def render_template_strict(template: str, values: dict[str, str]) -> str:
    missing_placeholders = {
        placeholder_name
        for placeholder_name in PLACEHOLDER_PATTERN.findall(template)
        if placeholder_name not in values
    }

    if missing_placeholders:
        missing_display = ", ".join(sorted(missing_placeholders))
        raise ValueError(f"Missing template placeholder values: {missing_display}")

    rendered = template

    for placeholder_name in sorted(set(PLACEHOLDER_PATTERN.findall(template))):
        rendered = re.sub(
            rf"{{{{\s*{placeholder_name}\s*}}}}",
            lambda _match, replacement=values[placeholder_name]: replacement,
            rendered,
        )

    unresolved = PLACEHOLDER_PATTERN.findall(rendered)
    if unresolved:
        unresolved_display = ", ".join(sorted(set(unresolved)))
        raise ValueError(f"Unresolved template placeholders remain: {unresolved_display}")

    return rendered

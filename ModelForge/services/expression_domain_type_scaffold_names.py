from dataclasses import dataclass

from schemas.scaffold_expression_domain_type import (
    ExpressionDomainTypeScaffoldDefinition,
)


@dataclass(frozen=True)
class ExpressionDomainTypeScaffoldNames:
    type_key: str
    pascal_case_type_key: str
    creation_form_component_name: str
    evaluation_input_component_name: str
    backend_export_name: str
    backend_creation_definition_function_name: str
    backend_evaluation_value_function_name: str
    frontend_export_name: str


def _to_pascal_case(type_key: str) -> str:
    parts = []
    current = type_key[0]

    for character in type_key[1:]:
        if character.isupper():
            parts.append(current)
            current = character
            continue
        current += character

    parts.append(current)
    return "".join(part[:1].upper() + part[1:] for part in parts if part)


def build_expression_domain_type_scaffold_names(
    definition: ExpressionDomainTypeScaffoldDefinition,
) -> ExpressionDomainTypeScaffoldNames:
    pascal_case_type_key = _to_pascal_case(definition.typeKey)

    return ExpressionDomainTypeScaffoldNames(
        type_key=definition.typeKey,
        pascal_case_type_key=pascal_case_type_key,
        creation_form_component_name=f"{pascal_case_type_key}CreationForm",
        evaluation_input_component_name=f"{pascal_case_type_key}EvaluationInput",
        backend_export_name=definition.typeKey,
        backend_creation_definition_function_name=(
            f"normalize{pascal_case_type_key}CreationDefinition"
        ),
        backend_evaluation_value_function_name=(
            f"normalize{pascal_case_type_key}EvaluationValue"
        ),
        frontend_export_name=f"{definition.typeKey}ExpressionDomainType",
    )

from dataclasses import dataclass

from schemas.scaffold_parameter import ParameterScaffoldPreviewRequest


@dataclass(frozen=True)
class ParameterScaffoldNames:
    parameter_structure_key: str
    component_name: str
    field_component_name: str
    read_only_component_name: str
    backend_structure_export_name: str
    validate_function_name: str


def _to_pascal_case(parameter_structure_key: str) -> str:
    parts = []
    current = parameter_structure_key[0]

    for character in parameter_structure_key[1:]:
        if character.isupper():
            parts.append(current)
            current = character
            continue
        current += character

    parts.append(current)
    return "".join(part[:1].upper() + part[1:] for part in parts if part)


def build_parameter_scaffold_names(
    request: ParameterScaffoldPreviewRequest,
) -> ParameterScaffoldNames:
    parameter_structure_key = request.parameterStructureKey
    component_name = request.componentName or _to_pascal_case(parameter_structure_key)

    return ParameterScaffoldNames(
        parameter_structure_key=parameter_structure_key,
        component_name=component_name,
        field_component_name=f"{component_name}ParameterField",
        read_only_component_name=f"{component_name}ParameterReadOnly",
        backend_structure_export_name=(
            request.backendStructureExportName
            or f"{parameter_structure_key}ParameterStructure"
        ),
        validate_function_name=(
            request.validateFunctionName
            or f"validate{component_name}Parameter"
        ),
    )

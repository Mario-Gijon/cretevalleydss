from dataclasses import dataclass

from schemas.scaffold_evaluation_structure import (
    EvaluationStructureScaffoldPreviewRequest,
)


@dataclass(frozen=True)
class EvaluationStructureScaffoldNames:
    evaluation_structure_key: str
    component_name: str
    view_component_name: str
    backend_structure_export_name: str


def _to_pascal_case(evaluation_structure_key: str) -> str:
    parts = []
    current = evaluation_structure_key[0]

    for character in evaluation_structure_key[1:]:
        if character.isupper():
            parts.append(current)
            current = character
            continue
        current += character

    parts.append(current)
    return "".join(part[:1].upper() + part[1:] for part in parts if part)


def build_evaluation_structure_scaffold_names(
    request: EvaluationStructureScaffoldPreviewRequest,
) -> EvaluationStructureScaffoldNames:
    evaluation_structure_key = request.evaluationStructureKey
    component_name = request.componentName or _to_pascal_case(evaluation_structure_key)

    return EvaluationStructureScaffoldNames(
        evaluation_structure_key=evaluation_structure_key,
        component_name=component_name,
        view_component_name=f"{component_name}View",
        backend_structure_export_name=(
            request.backendStructureExportName or evaluation_structure_key
        ),
    )

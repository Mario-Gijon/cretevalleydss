from dataclasses import dataclass


@dataclass(frozen=True)
class ModelScaffoldNames:
    api_model_key: str
    api_endpoint_path: str
    snake_case_model_name: str
    execute_function_name: str
    run_function_name: str
    request_examples_constant: str
    response_examples_constant: str


def build_model_scaffold_names(api_model_key: str) -> ModelScaffoldNames:
    normalized_key = api_model_key.strip()

    return ModelScaffoldNames(
        api_model_key=normalized_key,
        api_endpoint_path=f"/{normalized_key}",
        snake_case_model_name=normalized_key,
        execute_function_name=f"execute_{normalized_key}",
        run_function_name=f"run_{normalized_key}",
        request_examples_constant=f"{normalized_key.upper()}_REQUEST_EXAMPLES",
        response_examples_constant=f"{normalized_key.upper()}_RESPONSE_EXAMPLES",
    )

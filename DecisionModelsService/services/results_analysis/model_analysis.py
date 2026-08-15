from importlib import import_module, invalidate_caches, reload
import sys


def load_model_analysis_handlers(api_model_key: str):
    """Load optional ``models.<api_model_key>.analysis`` handlers when present."""
    invalidate_caches()
    module_path = f"models.{api_model_key}.analysis"
    model_package_path = f"models.{api_model_key}"

    try:
        module = (
            reload(sys.modules[module_path])
            if module_path in sys.modules
            else import_module(module_path)
        )
    except ModuleNotFoundError as error:
        if error.name in {module_path, model_package_path}:
            return None
        raise

    handlers = {}
    for name in ("analyze_round", "analyze_issue"):
        if not hasattr(module, name):
            continue
        handler = getattr(module, name)
        if not callable(handler):
            raise TypeError(f"{module_path}.{name} must be callable")
        handlers[name] = handler

    return handlers or None

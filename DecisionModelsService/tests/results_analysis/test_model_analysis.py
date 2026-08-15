import importlib
import sys

import pytest

from services.results_analysis.model_analysis import load_model_analysis_handlers


def install_model_package(monkeypatch, tmp_path, key, analysis_source=None):
    package_root = tmp_path / "models"
    model_dir = package_root / key
    model_dir.mkdir(parents=True)
    (model_dir / "__init__.py").write_text("")
    if analysis_source is not None:
        (model_dir / "analysis.py").write_text(analysis_source)

    models = importlib.import_module("models")
    monkeypatch.setattr(models, "__path__", [str(package_root)])
    monkeypatch.delitem(sys.modules, f"models.{key}", raising=False)
    monkeypatch.delitem(sys.modules, f"models.{key}.analysis", raising=False)


def test_model_analysis_discovery_treats_missing_analysis_as_optional(monkeypatch, tmp_path):
    install_model_package(monkeypatch, tmp_path, "no_analysis")
    assert load_model_analysis_handlers("no_analysis") is None


def test_model_analysis_discovery_treats_modules_without_handlers_as_optional(monkeypatch, tmp_path):
    install_model_package(monkeypatch, tmp_path, "no_handlers", "VALUE = 1\n")
    assert load_model_analysis_handlers("no_handlers") is None


@pytest.mark.parametrize(
    ("key", "source", "expected"),
    [
        ("round_only", "def analyze_round(context):\n    return None\n", {"analyze_round"}),
        ("issue_only", "def analyze_issue(context):\n    return None\n", {"analyze_issue"}),
        ("both", "def analyze_round(context):\n    return None\n\ndef analyze_issue(context):\n    return None\n", {"analyze_round", "analyze_issue"}),
    ],
)
def test_model_analysis_discovery_recognizes_independent_optional_handlers(monkeypatch, tmp_path, key, source, expected):
    install_model_package(monkeypatch, tmp_path, key, source)
    handlers = load_model_analysis_handlers(key)
    assert set(handlers) == expected
    assert all(callable(handler) for handler in handlers.values())


def test_model_analysis_discovery_rejects_non_callable_handlers(monkeypatch, tmp_path):
    install_model_package(monkeypatch, tmp_path, "bad_handler", "analyze_round = 1\n")
    with pytest.raises(TypeError, match="analyze_round must be callable"):
        load_model_analysis_handlers("bad_handler")


def test_model_analysis_discovery_reloads_existing_module(monkeypatch, tmp_path):
    install_model_package(monkeypatch, tmp_path, "reloadable", "def analyze_round(context):\n    return None\n")
    assert set(load_model_analysis_handlers("reloadable")) == {"analyze_round"}

    analysis_path = tmp_path / "models" / "reloadable" / "analysis.py"
    analysis_path.write_text(
        "def analyze_round(context):\n    return None\n\ndef analyze_issue(context):\n    return None\n"
    )
    assert set(load_model_analysis_handlers("reloadable")) == {
        "analyze_round",
        "analyze_issue",
    }


def test_model_analysis_discovery_propagates_internal_import_failure(monkeypatch, tmp_path):
    install_model_package(monkeypatch, tmp_path, "broken", "import missing_analysis_dependency\n")
    with pytest.raises(ModuleNotFoundError, match="missing_analysis_dependency"):
        load_model_analysis_handlers("broken")

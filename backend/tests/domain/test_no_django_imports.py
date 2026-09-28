"""Constitution Principle VI: domain package must not import Django."""

from __future__ import annotations

import ast
from pathlib import Path

DOMAIN_DIR = Path(__file__).resolve().parents[2] / "domain"


def _iter_domain_source_files() -> list[Path]:
    if not DOMAIN_DIR.is_dir():
        return []
    return sorted(p for p in DOMAIN_DIR.rglob("*.py") if p.is_file())


def _django_import_lines(tree: ast.AST, path: Path) -> list[str]:
    violations: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name == "django" or alias.name.startswith("django."):
                    violations.append(f"{path}: import {alias.name}")
        elif isinstance(node, ast.ImportFrom):
            module = node.module or ""
            if module == "django" or module.startswith("django."):
                violations.append(f"{path}: from {module} import …")
    return violations


def test_domain_package_exists_with_modules() -> None:
    modules = _iter_domain_source_files()
    assert modules, (
        f"expected at least one Python module under {DOMAIN_DIR}; "
        "create backend/domain/ with domain logic modules"
    )


def test_domain_modules_do_not_import_django() -> None:
    all_violations: list[str] = []
    for path in _iter_domain_source_files():
        source = path.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(path))
        all_violations.extend(_django_import_lines(tree, path))
    assert not all_violations, "django imports in domain layer:\n" + "\n".join(
        all_violations
    )

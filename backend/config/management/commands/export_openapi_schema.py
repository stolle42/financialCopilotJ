import importlib
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Write the Ninja OpenAPI schema to a JSON file."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--api",
            required=True,
            help="Dotted path to the NinjaAPI instance (e.g. config.api.api).",
        )
        parser.add_argument(
            "--output",
            required=True,
            help="Path to the output JSON file.",
        )

    def handle(self, *args, **options) -> None:
        api_path: str = options["api"]
        output_path = Path(options["output"])

        if "." not in api_path:
            raise CommandError(f"Invalid --api path: {api_path!r}")

        module_name, attr_name = api_path.rsplit(".", 1)
        try:
            module = importlib.import_module(module_name)
            api = getattr(module, attr_name)
        except (ImportError, AttributeError) as exc:
            raise CommandError(f"Could not load API at {api_path!r}") from exc

        schema = api.get_openapi_schema()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            json.dumps(schema, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        self.stdout.write(self.style.SUCCESS(f"Wrote OpenAPI schema to {output_path}"))

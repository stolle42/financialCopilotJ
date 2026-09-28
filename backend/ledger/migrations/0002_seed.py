from decimal import Decimal

from django.db import migrations

EXPENSE_CATEGORIES = [
    "Groceries",
    "Eating out",
    "Transport",
    "Housing",
    "Utilities",
    "Health",
    "Leisure",
    "Shopping",
    "Subscriptions",
    "Travel",
    "Gifts",
]

INCOME_CATEGORIES = [
    "Salary",
    "Refunds",
    "Gifts",
    "Interest",
    "Other income",
]

CHART_COLOURS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
]

PROTECTED_COLOUR = "#94a3b8"


def seed(apps, schema_editor) -> None:
    Account = apps.get_model("ledger", "Account")
    Category = apps.get_model("ledger", "Category")
    ManualEntryPreference = apps.get_model("ledger", "ManualEntryPreference")

    if Account.objects.filter(name="Cash").exists():
        return

    cash = Account.objects.create(
        name="Cash",
        type="cash",
        opening_balance=Decimal("0.00"),
    )

    ManualEntryPreference.objects.update_or_create(
        id=1,
        defaults={"last_manual_entry_account_id": cash.id},
    )

    def create_side(side: str, names: list[str]) -> None:
        for index, name in enumerate(names):
            Category.objects.create(
                name=name,
                side=side,
                colour=CHART_COLOURS[index % len(CHART_COLOURS)],
                protected_role=None,
            )
        Category.objects.create(
            name="Uncategorised",
            side=side,
            colour=PROTECTED_COLOUR,
            protected_role="uncategorised",
        )
        Category.objects.create(
            name="Unaccounted",
            side=side,
            colour=PROTECTED_COLOUR,
            protected_role="unaccounted",
        )

    create_side("expense", EXPENSE_CATEGORIES)
    create_side("income", INCOME_CATEGORIES)


def unseed(apps, schema_editor) -> None:
    Account = apps.get_model("ledger", "Account")
    Category = apps.get_model("ledger", "Category")
    ManualEntryPreference = apps.get_model("ledger", "ManualEntryPreference")
    ManualEntryPreference.objects.filter(id=1).delete()
    Category.objects.all().delete()
    Account.objects.filter(name="Cash").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("ledger", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]

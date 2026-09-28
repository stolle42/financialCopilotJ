from decimal import Decimal

from django.db import models
from django.db.models import Q


class AccountType(models.TextChoices):
    CHECKING = "checking", "Checking"
    SAVINGS = "savings", "Savings"
    CREDIT_CARD = "credit_card", "Credit card"
    CASH = "cash", "Cash"
    OTHER = "other", "Other"


class Side(models.TextChoices):
    EXPENSE = "expense", "Expense"
    INCOME = "income", "Income"


class Kind(models.TextChoices):
    EXPENSE = "expense", "Expense"
    INCOME = "income", "Income"
    TRANSFER = "transfer", "Transfer"


class ProtectedRole(models.TextChoices):
    UNCATEGORISED = "uncategorised", "Uncategorised"
    UNACCOUNTED = "unaccounted", "Unaccounted"


class Account(models.Model):
    name = models.CharField(max_length=200, unique=True)
    type = models.CharField(max_length=20, choices=AccountType.choices)
    opening_balance = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class ManualEntryPreference(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    last_manual_entry_account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name="+",
    )


class Category(models.Model):
    name = models.CharField(max_length=200)
    colour = models.CharField(max_length=7)
    side = models.CharField(max_length=10, choices=Side.choices)
    protected_role = models.CharField(
        max_length=20,
        choices=ProtectedRole.choices,
        null=True,
        blank=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["side", "name"],
                name="unique_category_name_per_side",
            ),
            models.UniqueConstraint(
                fields=["side", "protected_role"],
                condition=Q(protected_role__isnull=False),
                name="unique_protected_role_per_side",
            ),
        ]
        ordering = ["side", "name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.side})"


class Transaction(models.Model):
    date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True)
    kind = models.CharField(max_length=10, choices=Kind.choices)
    account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name="transactions",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="transactions",
    )
    destination_account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="incoming_transfers",
    )

    class Meta:
        ordering = ["-date", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(amount__gte=0),
                name="transaction_amount_non_negative",
            ),
            models.CheckConstraint(
                condition=(
                    Q(
                        kind=Kind.TRANSFER,
                        category__isnull=True,
                        destination_account__isnull=False,
                    )
                    & ~Q(destination_account=models.F("account"))
                )
                | (
                    ~Q(kind=Kind.TRANSFER)
                    & Q(category__isnull=False)
                    & Q(destination_account__isnull=True)
                ),
                name="transaction_kind_shape",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.date} {self.kind} {self.amount}"

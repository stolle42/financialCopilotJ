from decimal import Decimal

from django.db import models
from django.db.models import Q

from ledger.models import Account, Category, Kind


class MappingProfile(models.Model):
    name = models.CharField(max_length=200, unique=True)
    date_column = models.CharField(max_length=200)
    amount_column = models.CharField(max_length=200, null=True, blank=True)
    debit_column = models.CharField(max_length=200, null=True, blank=True)
    credit_column = models.CharField(max_length=200, null=True, blank=True)
    description_column = models.CharField(max_length=200)
    counterparty_column = models.CharField(max_length=200, null=True, blank=True)
    date_format = models.CharField(max_length=50)
    decimal_separator = models.CharField(max_length=1, choices=[(".", "."), (",", ",")])
    encoding = models.CharField(max_length=50)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(amount_column__isnull=False)
                    & Q(debit_column__isnull=True)
                    & Q(credit_column__isnull=True)
                )
                | (
                    Q(amount_column__isnull=True)
                    & Q(debit_column__isnull=False)
                    & Q(credit_column__isnull=False)
                ),
                name="mapping_profile_amount_layout",
            ),
        ]
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class PendingBatch(models.Model):
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="import_batches")
    profile = models.ForeignKey(
        MappingProfile, on_delete=models.PROTECT, related_name="batches"
    )
    source_filename = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.source_filename


class PendingRow(models.Model):
    batch = models.ForeignKey(PendingBatch, on_delete=models.CASCADE, related_name="rows")
    row_number = models.PositiveIntegerField()
    raw_line = models.TextField()
    parse_error = models.TextField(null=True, blank=True)
    date = models.DateField(null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    description = models.TextField(blank=True)
    counterparty = models.CharField(max_length=500, null=True, blank=True)
    kind = models.CharField(max_length=10, choices=Kind.choices)
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="pending_rows",
    )
    destination_account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="pending_transfer_rows",
    )
    is_duplicate = models.BooleanField(default=False)
    include = models.BooleanField(default=True)

    class Meta:
        ordering = ["row_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["batch", "row_number"],
                name="unique_row_number_per_batch",
            ),
        ]

    def __str__(self) -> str:
        return f"row {self.row_number}"

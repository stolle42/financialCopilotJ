from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from ledger.models import Category


class Budget(models.Model):
    category = models.OneToOneField(
        Category,
        on_delete=models.CASCADE,
        related_name="budget",
    )
    monthly_limit = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        ordering = ["category__name"]

    def clean(self) -> None:
        if self.monthly_limit <= Decimal("0"):
            raise ValidationError("monthly_limit must be greater than zero")

    def save(self, *args, **kwargs) -> None:
        self.full_clean()
        super().save(*args, **kwargs)

"""Domain tests for ledger balance and validation rules."""

from decimal import Decimal

import pytest

from domain import ledger


class TestSignedEffect:
    def test_expense_reduces_source_account(self) -> None:
        assert ledger.signed_effect("expense", Decimal("10.00"), is_destination=False) == Decimal(
            "-10.00"
        )

    def test_income_increases_source_account(self) -> None:
        assert ledger.signed_effect("income", Decimal("10.00"), is_destination=False) == Decimal(
            "10.00"
        )

    def test_transfer_reduces_source_and_increases_destination(self) -> None:
        assert ledger.signed_effect("transfer", Decimal("25.00"), is_destination=False) == Decimal(
            "-25.00"
        )
        assert ledger.signed_effect("transfer", Decimal("25.00"), is_destination=True) == Decimal(
            "25.00"
        )

    def test_zero_amount_is_allowed(self) -> None:
        assert ledger.signed_effect("expense", Decimal("0.00"), is_destination=False) == Decimal(
            "0.00"
        )


class TestComputeBalance:
    def test_sums_opening_and_effects(self) -> None:
        opening = Decimal("100.00")
        effects = [Decimal("-10.00"), Decimal("5.00")]
        assert ledger.compute_balance(opening, effects) == Decimal("95.00")


class TestValidate:
    def test_rejects_negative_amount(self) -> None:
        with pytest.raises(ledger.ValidationError, match="amount"):
            ledger.validate(
                kind="expense",
                amount=Decimal("-1.00"),
                category_side="expense",
                destination_account_id=None,
                account_id=1,
            )

    def test_expense_requires_matching_category_side(self) -> None:
        with pytest.raises(ledger.ValidationError, match="category"):
            ledger.validate(
                kind="expense",
                amount=Decimal("1.00"),
                category_side="income",
                destination_account_id=None,
                account_id=1,
            )

    def test_income_requires_matching_category_side(self) -> None:
        with pytest.raises(ledger.ValidationError, match="category"):
            ledger.validate(
                kind="income",
                amount=Decimal("1.00"),
                category_side="expense",
                destination_account_id=None,
                account_id=1,
            )

    def test_transfer_requires_destination_not_equal_to_account(self) -> None:
        with pytest.raises(ledger.ValidationError, match="destination"):
            ledger.validate(
                kind="transfer",
                amount=Decimal("1.00"),
                category_side=None,
                destination_account_id=1,
                account_id=1,
            )

    def test_transfer_rejects_category_side(self) -> None:
        with pytest.raises(ledger.ValidationError, match="category"):
            ledger.validate(
                kind="transfer",
                amount=Decimal("1.00"),
                category_side="expense",
                destination_account_id=2,
                account_id=1,
            )

    def test_transfer_requires_destination(self) -> None:
        with pytest.raises(ledger.ValidationError, match="destination"):
            ledger.validate(
                kind="transfer",
                amount=Decimal("1.00"),
                category_side=None,
                destination_account_id=None,
                account_id=1,
            )

    def test_expense_with_matching_side_passes(self) -> None:
        ledger.validate(
            kind="expense",
            amount=Decimal("0.00"),
            category_side="expense",
            destination_account_id=None,
            account_id=1,
        )

    def test_transfer_with_different_destination_passes(self) -> None:
        ledger.validate(
            kind="transfer",
            amount=Decimal("10.00"),
            category_side=None,
            destination_account_id=2,
            account_id=1,
        )

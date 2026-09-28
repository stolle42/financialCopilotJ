"""Domain tests for CSV import parsing."""

from __future__ import annotations

import time
from decimal import Decimal
from pathlib import Path

import pytest

from domain import csv_import

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"


def _signed_profile(**overrides) -> csv_import.CsvMappingProfile:
    base = {
        "date_column": "date",
        "amount_column": "amount",
        "debit_column": None,
        "credit_column": None,
        "description_column": "description",
        "counterparty_column": None,
        "date_format": "%Y-%m-%d",
        "decimal_separator": ".",
        "encoding": "utf-8",
    }
    base.update(overrides)
    return csv_import.CsvMappingProfile(**base)


class TestDetectDelimiter:
    @pytest.mark.parametrize(
        ("header", "expected"),
        [
            ("a,b,c", ","),
            ("a;b;c", ";"),
            ("a\tb\tc", "\t"),
        ],
    )
    def test_detects_most_common(self, header: str, expected: str) -> None:
        assert csv_import.detect_delimiter(header) == expected


class TestProposeKind:
    def test_signed_negative_is_expense(self) -> None:
        assert (
            csv_import.propose_kind(
                signed_amount=Decimal("-1"), debit=None, credit=None
            )
            == "expense"
        )

    def test_signed_positive_is_income(self) -> None:
        assert (
            csv_import.propose_kind(signed_amount=Decimal("1"), debit=None, credit=None)
            == "income"
        )

    def test_debit_column_is_expense(self) -> None:
        assert (
            csv_import.propose_kind(signed_amount=None, debit=Decimal("1"), credit=None)
            == "expense"
        )

    def test_credit_column_is_income(self) -> None:
        assert (
            csv_import.propose_kind(signed_amount=None, debit=None, credit=Decimal("1"))
            == "income"
        )


class TestParseRows:
    def test_signed_comma_fixture(self) -> None:
        text = (FIXTURES / "signed_comma.csv").read_text(encoding="utf-8")
        rows = csv_import.parse_rows(text, _signed_profile())
        assert len(rows) == 3
        assert rows[0].date.isoformat() == "2026-01-15"
        assert rows[0].amount == Decimal("10.50")
        assert rows[0].parse_error is None

    def test_debit_credit_cp1252(self) -> None:
        raw = (FIXTURES / "debit_credit_semicolon_cp1252.csv").read_bytes()
        profile = csv_import.CsvMappingProfile(
            date_column="Datum",
            amount_column=None,
            debit_column="Soll",
            credit_column="Haben",
            description_column="Text",
            counterparty_column=None,
            date_format="%d.%m.%Y",
            decimal_separator=",",
            encoding="cp1252",
        )
        text = csv_import.decode_bytes(raw, profile)
        rows = csv_import.parse_rows(text, profile)
        assert len(rows) == 2
        assert rows[0].amount == Decimal("10.50")
        assert rows[1].amount == Decimal("100.00")

    def test_unparsable_rows(self) -> None:
        text = (FIXTURES / "with_unparsable_rows.csv").read_text(encoding="utf-8")
        rows = csv_import.parse_rows(text, _signed_profile())
        assert rows[0].parse_error is None
        assert rows[1].parse_error == "unreadable date"
        assert rows[2].parse_error == "missing amount"

    def test_header_only_yields_zero_rows(self) -> None:
        text = (FIXTURES / "header_only.csv").read_text(encoding="utf-8")
        assert csv_import.parse_rows(text, _signed_profile()) == []

    def test_parses_5000_rows_under_ten_seconds(self) -> None:
        header = "date,amount,description\n"
        body = "".join(
            f"2026-01-{(index % 28) + 1:02d},-1.00,row {index}\n"
            for index in range(5000)
        )
        start = time.perf_counter()
        rows = csv_import.parse_rows(header + body, _signed_profile())
        elapsed = time.perf_counter() - start
        assert len(rows) == 5000
        assert elapsed < 10

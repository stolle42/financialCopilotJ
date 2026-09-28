"""Pure-Python CSV import parsing (no Django imports)."""

from __future__ import annotations

import csv
import io
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation


@dataclass(frozen=True)
class CsvMappingProfile:
    date_column: str
    amount_column: str | None
    debit_column: str | None
    credit_column: str | None
    description_column: str
    counterparty_column: str | None
    date_format: str
    decimal_separator: str
    encoding: str


@dataclass
class ParsedCsvRow:
    row_number: int
    raw_line: str
    date: date | None
    amount: Decimal | None
    description: str
    counterparty: str | None
    parse_error: str | None = None
    proposed_kind: str | None = None


def detect_delimiter(header_line: str) -> str:
    candidates = [",", ";", "\t"]
    counts = {char: header_line.count(char) for char in candidates}
    best = max(counts, key=counts.get)
    if counts[best] == 0:
        return ","
    return best


def propose_kind(*, signed_amount: Decimal | None, debit: Decimal | None, credit: Decimal | None) -> str:
    if debit is not None and debit > 0:
        return "expense"
    if credit is not None and credit > 0:
        return "income"
    if signed_amount is not None:
        if signed_amount < 0:
            return "expense"
        if signed_amount > 0:
            return "income"
    return "expense"


def decode_bytes(data: bytes, profile: CsvMappingProfile) -> str:
    return data.decode(profile.encoding)


def parse_rows(text: str, profile: CsvMappingProfile) -> list[ParsedCsvRow]:
    lines = [line for line in text.splitlines() if line.strip() != ""]
    if len(lines) <= 1:
        return []

    delimiter = detect_delimiter(lines[0])
    reader = csv.DictReader(io.StringIO("\n".join(lines)), delimiter=delimiter)
    rows: list[ParsedCsvRow] = []
    for index, record in enumerate(reader, start=1):
        raw_line = lines[index] if index < len(lines) else ""
        rows.append(_parse_record(index, raw_line, record, profile))
    return rows


def _parse_decimal(raw: str, decimal_separator: str) -> Decimal:
    text = raw.strip()
    if text == "":
        raise InvalidOperation("empty")
    negative = text.startswith("-")
    if negative:
        text = text[1:].strip()
    if decimal_separator == ",":
        text = text.replace(".", "").replace(",", ".")
    value = Decimal(text)
    return -value if negative else value


def _parse_record(
    row_number: int,
    raw_line: str,
    record: dict[str, str | None],
    profile: CsvMappingProfile,
) -> ParsedCsvRow:
    description = (record.get(profile.description_column) or "").strip()
    counterparty = None
    if profile.counterparty_column:
        counterparty = (record.get(profile.counterparty_column) or "").strip() or None

    date_raw = (record.get(profile.date_column) or "").strip()
    try:
        if date_raw == "":
            raise ValueError("missing date")
        parsed_date = datetime.strptime(date_raw, profile.date_format).date()
    except ValueError:
        return ParsedCsvRow(
            row_number=row_number,
            raw_line=raw_line,
            date=None,
            amount=None,
            description=description,
            counterparty=counterparty,
            parse_error="unreadable date",
        )

    try:
        signed: Decimal | None = None
        debit_val: Decimal | None = None
        credit_val: Decimal | None = None
        if profile.amount_column:
            raw_amount = (record.get(profile.amount_column) or "").strip()
            if raw_amount == "":
                raise InvalidOperation("missing amount")
            signed = _parse_decimal(raw_amount, profile.decimal_separator)
            amount = abs(signed)
        else:
            debit_raw = (record.get(profile.debit_column or "") or "").strip()
            credit_raw = (record.get(profile.credit_column or "") or "").strip()
            if debit_raw == "" and credit_raw == "":
                raise InvalidOperation("missing amount")
            if debit_raw:
                debit_val = _parse_decimal(debit_raw, profile.decimal_separator)
                amount = abs(debit_val)
            else:
                credit_val = _parse_decimal(credit_raw, profile.decimal_separator)
                amount = abs(credit_val)
        proposed = propose_kind(
            signed_amount=signed,
            debit=debit_val,
            credit=credit_val,
        )
    except InvalidOperation:
        return ParsedCsvRow(
            row_number=row_number,
            raw_line=raw_line,
            date=parsed_date,
            amount=None,
            description=description,
            counterparty=counterparty,
            parse_error="missing amount",
        )

    return ParsedCsvRow(
        row_number=row_number,
        raw_line=raw_line,
        date=parsed_date,
        amount=amount,
        description=description,
        counterparty=counterparty,
        proposed_kind=proposed,
    )

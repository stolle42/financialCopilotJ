from decimal import Decimal

from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from ninja import File, Form, Router, UploadedFile
from ninja.errors import HttpError

from imports.models import MappingProfile, PendingBatch
from imports.schemas import (
    ConfirmOut,
    MappingProfileIn,
    MappingProfileOut,
    MappingProfilePatchIn,
    PendingBatchDetailOut,
    PendingBatchSummaryOut,
    PendingRowOut,
    PendingRowPatchIn,
    VendorGroupOut,
)
from imports.services import (
    ImportError,
    batch_detail,
    confirm_batch,
    create_batch,
    discard_batch,
    update_rows,
)

router = Router(tags=["import"])


def _validate_amount_layout(data: dict) -> None:
    amount = data.get("amount_column")
    debit = data.get("debit_column")
    credit = data.get("credit_column")
    signed = amount not in (None, "")
    split = debit not in (None, "") and credit not in (None, "")
    if signed == split:
        raise HttpError(400, "set either amount_column or debit_column and credit_column")


def _summary(batch: PendingBatch) -> dict:
    rows = batch.rows.all()
    return {
        "id": batch.id,
        "account_id": batch.account_id,
        "profile_id": batch.profile_id,
        "source_filename": batch.source_filename,
        "created_at": batch.created_at,
        "row_count": rows.count(),
        "unparsable_count": rows.filter(parse_error__isnull=False).count(),
        "duplicate_count": rows.filter(is_duplicate=True).count(),
    }


def _row_out(row) -> dict:
    amount = None
    if row.amount is not None:
        amount = format(row.amount.quantize(Decimal("0.01")), "f")
    return {
        "id": row.id,
        "row_number": row.row_number,
        "raw_line": row.raw_line,
        "parse_error": row.parse_error,
        "date": row.date,
        "amount": amount,
        "description": row.description,
        "counterparty": row.counterparty,
        "kind": row.kind,
        "category_id": row.category_id,
        "destination_account_id": row.destination_account_id,
        "is_duplicate": row.is_duplicate,
        "include": row.include,
    }


def _detail_payload(batch: PendingBatch) -> dict:
    detail = batch_detail(batch)
    summary = _summary(batch)
    return {
        **summary,
        "groups": [
            {
                "counterparty": group.counterparty,
                "rows": [_row_out(row) for row in group.rows],
            }
            for group in detail["groups"]
        ],
        "ungrouped_rows": [_row_out(row) for row in detail["ungrouped_rows"]],
        "unparsable_rows": [_row_out(row) for row in detail["unparsable_rows"]],
    }


@router.get("/import/profiles", response=list[MappingProfileOut])
def list_profiles(request):
    return MappingProfile.objects.all()


@router.post("/import/profiles", response=MappingProfileOut)
def create_profile(request, payload: MappingProfileIn):
    data = payload.dict()
    _validate_amount_layout(data)
    try:
        return MappingProfile.objects.create(**data)
    except IntegrityError as exc:
        raise HttpError(400, "profile name must be unique") from exc


@router.patch("/import/profiles/{profile_id}", response=MappingProfileOut)
def patch_profile(request, profile_id: int, payload: MappingProfilePatchIn):
    profile = get_object_or_404(MappingProfile, pk=profile_id)
    updates = payload.dict(exclude_unset=True)
    for field in (
        "amount_column",
        "debit_column",
        "credit_column",
        "date_column",
        "description_column",
        "counterparty_column",
        "date_format",
        "decimal_separator",
        "encoding",
        "name",
    ):
        if field not in updates:
            updates[field] = getattr(profile, field)
    _validate_amount_layout(updates)
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(profile, key, value)
    try:
        profile.save()
    except IntegrityError as exc:
        raise HttpError(400, "profile name must be unique") from exc
    return profile


@router.delete("/import/profiles/{profile_id}", response={204: None})
def delete_profile(request, profile_id: int):
    profile = get_object_or_404(MappingProfile, pk=profile_id)
    profile.delete()
    return 204, None


@router.post("/import/batches", response=PendingBatchDetailOut)
def upload_batch(
    request,
    account_id: int = Form(...),
    profile_id: int = Form(...),
    file: UploadedFile = File(...),
):
    profile = get_object_or_404(MappingProfile, pk=profile_id)
    try:
        batch = create_batch(
            file_bytes=file.read(),
            filename=file.name,
            account_id=account_id,
            profile=profile,
        )
    except ImportError as exc:
        raise HttpError(400, str(exc)) from exc
    return _detail_payload(batch)


@router.get("/import/batches", response=list[PendingBatchSummaryOut])
def list_batches(request):
    summaries = []
    for batch in PendingBatch.objects.all():
        summaries.append(_summary(batch))
    return summaries


@router.get("/import/batches/{batch_id}", response=PendingBatchDetailOut)
def get_batch(request, batch_id: int):
    batch = get_object_or_404(PendingBatch, pk=batch_id)
    return _detail_payload(batch)


@router.patch("/import/batches/{batch_id}/rows", response=PendingBatchDetailOut)
def patch_batch_rows(request, batch_id: int, payload: list[PendingRowPatchIn]):
    batch = get_object_or_404(PendingBatch, pk=batch_id)
    patches = []
    for item in payload:
        data = item.model_dump(exclude_unset=True)
        data["row_id"] = item.row_id
        patches.append(data)
    update_rows(batch, patches)
    return _detail_payload(batch)


@router.post("/import/batches/{batch_id}/confirm", response=ConfirmOut)
def confirm(request, batch_id: int):
    batch = get_object_or_404(PendingBatch, pk=batch_id)
    try:
        created = confirm_batch(batch)
    except ImportError as exc:
        raise HttpError(400, str(exc)) from exc
    return {"created": created}


@router.delete("/import/batches/{batch_id}", response={204: None})
def discard(request, batch_id: int):
    batch = get_object_or_404(PendingBatch, pk=batch_id)
    discard_batch(batch)
    return 204, None

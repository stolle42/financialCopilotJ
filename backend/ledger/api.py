from decimal import Decimal

from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from ninja import Query, Router
from ninja.errors import HttpError

from domain import ledger
from ledger import services
from ledger.models import Account, Category, Transaction
from ledger.schemas import (
    AccountIn,
    AccountPatchIn,
    AccountWithBalanceOut,
    CategoryIn,
    CategoryOut,
    CategoryPatchIn,
    ManualEntryDefaultsOut,
    ReconcileIn,
    ReconcileOut,
    TransactionIn,
    TransactionOut,
    TransactionPatchIn,
)

router = Router(tags=["ledger"])


def _account_with_balance(account: Account) -> dict:
    balances = services.account_balances()
    opening = account.opening_balance.quantize(Decimal("0.01"))
    balance = balances.get(account.id, Decimal("0.00")).quantize(Decimal("0.01"))
    return {
        "id": account.id,
        "name": account.name,
        "type": account.type,
        "opening_balance": format(opening, "f"),
        "balance": format(balance, "f"),
    }


@router.get("/accounts", response=list[AccountWithBalanceOut])
def list_accounts(request):
    balances = services.account_balances()
    result = []
    for account in Account.objects.all():
        opening = account.opening_balance.quantize(Decimal("0.01"))
        balance = balances.get(account.id, Decimal("0.00")).quantize(Decimal("0.01"))
        result.append(
            {
                "id": account.id,
                "name": account.name,
                "type": account.type,
                "opening_balance": format(opening, "f"),
                "balance": format(balance, "f"),
            }
        )
    return result


@router.post("/accounts", response=AccountWithBalanceOut)
def create_account(request, body: AccountIn):
    try:
        account = Account.objects.create(
            name=body.name,
            type=body.type,
            opening_balance=Decimal(body.opening_balance),
        )
    except IntegrityError as exc:
        raise HttpError(400, "account name must be unique") from exc
    return _account_with_balance(account)


@router.patch("/accounts/{account_id}", response=AccountWithBalanceOut)
def patch_account(request, account_id: int, body: AccountPatchIn):
    account = get_object_or_404(Account, pk=account_id)
    if body.name is not None:
        account.name = body.name
    if body.type is not None:
        account.type = body.type
    if body.opening_balance is not None:
        account.opening_balance = Decimal(body.opening_balance)
    try:
        account.save()
    except IntegrityError as exc:
        raise HttpError(400, "account name must be unique") from exc
    return _account_with_balance(account)


@router.post("/accounts/{account_id}/reconcile", response=ReconcileOut)
def reconcile_account(request, account_id: int, body: ReconcileIn):
    account = get_object_or_404(Account, pk=account_id)
    try:
        tx, balance = services.reconcile(
            account, actual_balance=Decimal(body.actual_balance)
        )
    except (ledger.ValidationError, ValueError) as exc:
        raise HttpError(400, str(exc)) from exc
    return {
        "transaction": tx,
        "balance": format(balance.quantize(Decimal("0.01")), "f"),
    }


@router.get("/categories", response=list[CategoryOut])
def list_categories(request):
    return Category.objects.all()


@router.post("/categories", response=CategoryOut)
def create_category_route(request, body: CategoryIn):
    try:
        return services.create_category(
            name=body.name, colour=body.colour, side=body.side
        )
    except ValueError as exc:
        raise HttpError(400, str(exc)) from exc


@router.patch("/categories/{category_id}", response=CategoryOut)
def patch_category(request, category_id: int, body: CategoryPatchIn):
    category = get_object_or_404(Category, pk=category_id)
    try:
        return services.update_category(category, name=body.name, colour=body.colour)
    except ValueError as exc:
        raise HttpError(400, str(exc)) from exc


@router.delete("/categories/{category_id}", response={204: None})
def delete_category_route(request, category_id: int):
    category = get_object_or_404(Category, pk=category_id)
    try:
        services.delete_category(category)
    except ValueError as exc:
        raise HttpError(409, str(exc)) from exc
    return 204, None


@router.get("/transactions/defaults", response=ManualEntryDefaultsOut)
def transaction_defaults(request):
    return services.manual_entry_defaults()


@router.get("/transactions", response=list[TransactionOut])
def list_transactions(
    request,
    account_id: int | None = None,
    category_id: int | None = None,
    kind: str | None = None,
    from_date: str | None = Query(None, alias="from"),
    to: str | None = None,
    q: str | None = None,
):
    qs = Transaction.objects.all()
    if account_id is not None:
        qs = qs.filter(account_id=account_id)
    if category_id is not None:
        qs = qs.filter(category_id=category_id)
    if kind is not None:
        qs = qs.filter(kind=kind)
    if from_date is not None:
        qs = qs.filter(date__gte=from_date)
    if to is not None:
        qs = qs.filter(date__lte=to)
    if q:
        qs = qs.filter(description__icontains=q)
    return qs.order_by("-date", "-id")


@router.post("/transactions", response=TransactionOut)
def create_transaction_route(request, body: TransactionIn):
    try:
        return services.create_transaction(
            date=body.posted_on,
            amount=Decimal(body.amount),
            description=body.description,
            kind=body.kind,
            account_id=body.account_id,
            category_id=body.category_id,
            destination_account_id=body.destination_account_id,
            update_default_account=True,
        )
    except (ledger.ValidationError, ValueError) as exc:
        raise HttpError(400, str(exc)) from exc


@router.patch("/transactions/{transaction_id}", response=TransactionOut)
def patch_transaction(request, transaction_id: int, body: TransactionPatchIn):
    tx = get_object_or_404(Transaction, pk=transaction_id)
    updates = body.model_dump(exclude_unset=True, by_alias=False)
    if "posted_on" in updates:
        updates["date"] = updates.pop("posted_on")
    if "amount" in updates and updates["amount"] is not None:
        updates["amount"] = Decimal(updates["amount"])
    try:
        return services.update_transaction(
            tx, updates=updates, update_default_account=True
        )
    except (ledger.ValidationError, ValueError) as exc:
        raise HttpError(400, str(exc)) from exc


@router.delete("/transactions/{transaction_id}", response={204: None})
def delete_transaction(request, transaction_id: int):
    tx = get_object_or_404(Transaction, pk=transaction_id)
    tx.delete()
    return 204, None

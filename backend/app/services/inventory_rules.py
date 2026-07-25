class InventoryRuleError(ValueError):
    pass


def validate_log_balances(
    *,
    normal_jars: int,
    ready_jars: int,
    rescue_1_jars: int,
    rescue_2_jars: int,
    discarded_jars: int,
    discard_reason: str | None,
) -> None:
    for field, value in (
        ("normal_jars", normal_jars),
        ("ready_jars", ready_jars),
        ("rescue_1_jars", rescue_1_jars),
        ("rescue_2_jars", rescue_2_jars),
        ("discarded_jars", discarded_jars),
    ):
        if value < 0:
            raise InventoryRuleError(f"{field} no puede ser negativo")

    if discarded_jars > 0 and discard_reason is None:
        raise InventoryRuleError(
            "discard_reason es obligatorio cuando discarded_jars > 0"
        )

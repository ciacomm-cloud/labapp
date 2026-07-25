from datetime import date


def dias_transcurridos(last_subculture_date: date, today: date | None = None) -> int:
    today = today or date.today()
    return (today - last_subculture_date).days


def semaforo_antiguedad(dias: int) -> str:
    if dias <= 25:
        return "verde"
    if dias <= 35:
        return "amarillo"
    return "rojo"


def estado_critico(
    *, normal_jars: int, rescue_1_jars: int, rescue_2_jars: int
) -> bool:
    return normal_jars <= 1 and (rescue_1_jars > 0 or rescue_2_jars > 0)


def compute_log_metrics(
    *,
    last_subculture_date: date,
    normal_jars: int,
    rescue_1_jars: int,
    rescue_2_jars: int,
    today: date | None = None,
) -> dict:
    dias = dias_transcurridos(last_subculture_date, today=today)
    return {
        "dias_transcurridos": dias,
        "semaforo_antiguedad": semaforo_antiguedad(dias),
        "estado_critico": estado_critico(
            normal_jars=normal_jars,
            rescue_1_jars=rescue_1_jars,
            rescue_2_jars=rescue_2_jars,
        ),
    }

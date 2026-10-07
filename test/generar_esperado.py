"""Genera test/esperado.json con los resultados de Python (isla/rezos.py) para comparar con la PWA.

Usa ciudades de la zona horaria de España peninsular (como el ordenador) y fechas con cambio de hora.
    python test/generar_esperado.py
"""
import datetime as dt
import json
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, "..", "..", "isla"))
import rezos  # noqa: E402

CIUDADES = {"Vilobi": (41.851, 2.708), "Madrid": (40.4168, -3.7038), "Sevilla": (37.3891, -5.9845),
            "Bilbao": (43.263, -2.935), "Barcelona": (41.3851, 2.1734), "Valencia": (39.4699, -0.3763)}
FECHAS = [dt.date(2026, 1, 1), dt.date(2026, 2, 14), dt.date(2026, 3, 20), dt.date(2026, 3, 28), dt.date(2026, 3, 29),
          dt.date(2026, 3, 30), dt.date(2026, 5, 10), dt.date(2026, 6, 21), dt.date(2026, 8, 15), dt.date(2026, 9, 22),
          dt.date(2026, 10, 2), dt.date(2026, 10, 24), dt.date(2026, 10, 25), dt.date(2026, 10, 26),
          dt.date(2026, 12, 21), dt.date(2027, 2, 28)]
METODOS = [{"fajr": 18, "isha": 17, "asr": "standard"}, {"fajr": 15, "isha": 15, "asr": "hanafi"},
           {"fajr": 12, "isha": 12, "asr": "standard", "ajuste_min": {"dhuhr": 2, "maghrib": 1}}]

casos = []
for ciudad, (lat, lon) in CIUDADES.items():
    for i, f in enumerate(FECHAS):
        cfg = {"lat": lat, "lon": lon, **METODOS[(i + len(ciudad)) % 3]}
        h = rezos.horarios(f, cfg)
        casos.append({"ciudad": ciudad, "y": f.year, "m": f.month, "d": f.day, "cfg": cfg,
                      "esperado": {k: v.strftime("%H:%M") for k, v in h.items()}})
sol = []
for ahora in [dt.datetime(2026, 10, 2, 3, 0), dt.datetime(2026, 10, 2, 7, 0), dt.datetime(2026, 10, 2, 8, 30),
              dt.datetime(2026, 10, 2, 13, 39), dt.datetime(2026, 10, 2, 19, 0), dt.datetime(2026, 10, 2, 22, 15),
              dt.datetime(2026, 6, 21, 21, 0), dt.datetime(2026, 12, 21, 17, 30)]:
    noche, frac, d0, d1 = rezos.posicion_sol(ahora)
    sol.append({"ahora": ahora.strftime("%Y-%m-%dT%H:%M:00"), "noche": noche, "frac": frac})
prox = []
for ahora in [dt.datetime(2026, 10, 2, 5, 0), dt.datetime(2026, 10, 2, 14, 0), dt.datetime(2026, 10, 2, 23, 50)]:
    r = rezos.proximo(ahora)
    prox.append({"ahora": ahora.strftime("%Y-%m-%dT%H:%M:00"), "id": r[0], "cuando": r[1].strftime("%Y-%m-%dT%H:%M")})
qib = []
for nombre, (lat, lon) in {**CIUDADES, "NuevaYork": (40.7, -74.0), "Yakarta": (-6.2, 106.8), "Sidney": (-33.87, 151.2)}.items():
    rumbo, km = rezos.qibla(lat, lon)
    qib.append({"ciudad": nombre, "lat": lat, "lon": lon, "rumbo": rumbo, "km": km, "punto": rezos.punto_cardinal(rumbo)})
with open(os.path.join(AQUI, "esperado.json"), "w", encoding="utf-8") as f:
    json.dump({"casos": casos, "sol": sol, "proximo": prox, "qibla": qib}, f, ensure_ascii=False, indent=1)
print(f"{len(casos)} casos de horarios, {len(sol)} de sol, {len(prox)} de proximo, {len(qib)} de qibla")

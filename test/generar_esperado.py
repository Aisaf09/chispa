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
import chispa_agenda as ag  # noqa: E402

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
# agenda: los mismos textos y el mismo "ahora" en Python y en JS
AHORAS = [dt.datetime(2026, 10, 8, 12, 0), dt.datetime(2026, 10, 8, 7, 5), dt.datetime(2026, 12, 31, 23, 30)]
TEXTOS = ["recuérdame llamar al médico mañana a las 17:30", "r entregar la práctica el viernes a las 9",
          "recuérdame beber agua todos los días a las 11", "recuérdame ir al gimnasio los lunes y miércoles a las 7:30",
          "r reunión 15/10 a las 18.00", "r sacar la basura hoy a las 10", "r estudiar redes pasado mañana 20:15",
          "r comprar pan", "r llamar a casa a las 18", "r llamar a mamá a las 5 de la tarde", "r llamar a mamá el sábado",
          "recuerda: revisar el correo cada día a las 8", "r cumpleaños 02/01 a las 10", "r examen 31/02 a las 9",
          "r ver a Ali los martes, jueves y sábados 19:00", "comprar pan", "reunión mañana", "r   ", "r hora a las 25:00"]
agenda = []
for ahora in AHORAS:
    for t in TEXTOS:
        agenda.append({"ahora": ahora.strftime("%Y-%m-%dT%H:%M:00"), "texto": t, "esperado": ag.parsear(t, ahora)})
rs = [{"id": 1, "texto": "x", "fecha": "2026-10-08", "hora": "17:30", "dias": []},
      {"id": 2, "texto": "y", "fecha": None, "hora": "07:30", "dias": [0, 2]},
      {"id": 3, "texto": "z", "fecha": "2026-10-05", "hora": "08:00", "dias": []},
      {"id": 4, "texto": "w", "fecha": None, "hora": "12:00", "dias": list(range(7))}]
orden = []
for ahora in AHORAS:
    orden.append({"ahora": ahora.strftime("%Y-%m-%dT%H:%M:00"), "agenda": rs,
                  "esperado": [{"id": r["id"], "cuando": c.strftime("%Y-%m-%dT%H:%M"), "txt": ag.etiqueta_cuando(c, ahora)}
                               for c, r in ag.ordenar(rs, ahora)]})
habitos = []
for d in range(1, 15):
    f = dt.date(2026, 10, d)
    habitos.append({"fecha": f.isoformat(), "esperado": [list(h) for h in ag.habitos_del_dia(f)]})
ev = [{"start": dt.datetime(2026, 10, 9, 14, 0), "titulo": "Práctica de redes"}]
habitos.append({"fecha": "2026-10-08", "entregas": [{"start": "2026-10-09T14:00", "titulo": "Práctica de redes"}],
                "esperado": [list(h) for h in ag.habitos_del_dia(dt.date(2026, 10, 8), ev)]})
# tareas: mismo texto y mismo día en Python y en JS (parsear, orden, etiqueta, completar y resumen)
import chispa_tareas as tar  # noqa: E402
HOYS = [dt.date(2026, 11, 9), dt.date(2026, 11, 14), dt.date(2026, 12, 31)]     # lunes, sábado, jueves fin de año
T_TEXTOS = ["entregar informe viernes !!", "llamar al banco mañana", "comprar pan", "estudiar redes pasado mañana !",
            "gimnasio cada día", "revisar correo entre semana", "pagar alquiler cada mes", "regar plantas cada semana el sábado",
            "examen 15/12 !!!", "cita 31/02", "llamar a mamá por la mañana", "hoy: limpiar la habitación", "   ",
            "!!", "preparar el Miércoles la reunión", "comprar billetes el domingo !", "repasar 2/1/27", "Mañana sacar la basura"]
tparse = [{"hoy": h.isoformat(), "texto": t, "esperado": tar.parsear(t, h)} for h in HOYS for t in T_TEXTOS]
T_LISTA = [{"id": 1, "texto": "a", "hecha": False, "fecha": "2026-11-05", "prio": 0},
           {"id": 2, "texto": "b", "hecha": False, "fecha": "2026-11-09", "prio": 2},
           {"id": 3, "texto": "c", "hecha": False, "fecha": "2026-11-09", "prio": 0},
           {"id": 4, "texto": "d", "hecha": False},
           {"id": 5, "texto": "e", "hecha": True, "fecha": "2026-11-01"},
           {"id": 6, "texto": "f", "hecha": False, "fecha": "2026-11-10", "prio": 1, "repetir": "semanal"},
           {"id": 7, "texto": "g", "hecha": False, "fecha": "2026-11-13"},
           {"id": 8, "texto": "h", "hecha": False, "fecha": "2026-12-25", "prio": 1},
           {"id": 9, "texto": "i", "hecha": False, "fecha": "2026-11-07", "prio": 2}]
torden = [{"hoy": h.isoformat(), "lista": T_LISTA, "orden": [t["id"] for t in tar.ordenar(T_LISTA, h)],
           "etiquetas": {t["id"]: tar.etiqueta(t, h) for t in T_LISTA}, "resumen": tar.resumen(T_LISTA, h)}
          for h in HOYS[:2]]
tsig = [{"fecha": f, "repetir": r, "hoy": h, "esperado": tar.siguiente_fecha(f, r, dt.date.fromisoformat(h))}
        for f, r, h in [("2026-11-09", "diaria", "2026-11-09"), ("2026-11-02", "diaria", "2026-11-09"),
                        ("2026-11-13", "laborables", "2026-11-13"), ("2026-11-14", "laborables", "2026-11-14"),
                        ("2026-11-09", "semanal", "2026-11-09"), ("2026-10-01", "semanal", "2026-11-09"),
                        ("2026-01-31", "mensual", "2026-01-31"), ("2026-12-15", "mensual", "2026-12-15"),
                        ("2026-11-20", "semanal", "2026-11-09")]]
with open(os.path.join(AQUI, "esperado.json"), "w", encoding="utf-8") as f:
    json.dump({"casos": casos, "sol": sol, "proximo": prox, "qibla": qib, "agenda": agenda, "orden": orden,
               "habitos": habitos, "tareas_parsear": tparse, "tareas_orden": torden, "tareas_siguiente": tsig},
              f, ensure_ascii=False, indent=1)
print(f"{len(casos)} casos de horarios, {len(sol)} de sol, {len(prox)} de proximo, {len(qib)} de qibla, "
      f"{len(agenda)} de agenda, {len(orden)} de orden, {len(habitos)} de habitos, "
      f"{len(tparse) + len(torden) + len(tsig)} de tareas")

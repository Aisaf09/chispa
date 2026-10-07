"""Genera los iconos de la PWA con el personaje en pixel art de Chispa (isla/chispa_ui.py).

    python herramientas/generar_iconos.py
"""
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
ISLA = os.path.join(AQUI, "..", "..", "isla")
sys.path.insert(0, os.path.join(ISLA, "libs"))
sys.path.insert(0, ISLA)
from PIL import Image  # noqa: E402
import chispa_ui as ui  # noqa: E402

FONDO = (10, 10, 12, 255)


def icono(tam, proporcion):
    """Fondo casi negro a sangre (iOS y Android le aplican su propia mascara) y la mascota centrada."""
    im = Image.new("RGBA", (tam, tam), FONDO)
    celda = max(1, int(tam * proporcion / 13))                       # la mascota mide 13 x 11 celdas
    m = ui.pixel_clawd(celda, False, False)
    im.alpha_composite(m, ((tam - m.width) // 2, (tam - m.height) // 2))
    return im.convert("RGB")


SALIDA = os.path.join(AQUI, "..", "icons")
os.makedirs(SALIDA, exist_ok=True)
for nombre, tam, prop in (("icon-192.png", 192, 0.66), ("icon-512.png", 512, 0.66), ("apple-touch-icon.png", 180, 0.66),
                          ("maskable-512.png", 512, 0.46)):             # maskable: zona segura del 80 % central
    icono(tam, prop).save(os.path.join(SALIDA, nombre), optimize=True)
    print("icono", nombre, tam)

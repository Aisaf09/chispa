# Chispa en el iPhone (PWA)

Versión para el teléfono de Chispa (la app de Windows en `../isla`). **Fase 1: todo funciona sin nube**, guardando los datos en el propio teléfono.

## Qué incluye
- Próxima oración y horarios (calculados en el dispositivo, mismo algoritmo que `isla/rezos.py`) con cuenta atrás.
- Hoy: los 5 rezos y los 5 hábitos marcables, racha y anillo de progreso (10 puntos).
- Tareas, Tasbih (meta 33/99/100), temporizador de foco (90/20 min) que sigue contando con la pantalla bloqueada.
- Fe: arco del sol/luna, horarios y **Qibla con la brújula real del iPhone**.
- Ubicación: GPS del iPhone (pide permiso) o manual. Método de cálculo y Asr configurables.
- Instalable (manifest + service worker) y funciona sin conexión.

## Fases (cada una con visto bueno)
1. ✅ PWA sin nube (esta).
2. Sincronización con Supabase (Chispa en Windows ↔ PWA).
3. Avisos de oración con Web Push (iOS 16.4+, PWA en la pantalla de inicio).
4. Despliegue en GitHub Pages (HTTPS: necesario para GPS, brújula e instalación en el iPhone).

## Probar en el ordenador
```
cd Asistente-IA/pwa
python -m http.server 8765 --bind 127.0.0.1
# abrir http://127.0.0.1:8765/
```
(En el teléfono hace falta HTTPS: GPS, brújula y service worker no funcionan por HTTP. Por eso llega con la fase 4.)

## Pruebas
```
python test/generar_esperado.py              # referencia de Python (isla/rezos.py)
TZ=Europe/Madrid node test/test_rezos.mjs    # la PWA da los mismos minutos que Chispa
node test/test_store.mjs                     # hábitos, racha, tareas, Tasbih, temporizador
python herramientas/generar_iconos.py        # regenera los iconos
```

## Privacidad
Sin claves ni cuentas en esta fase. Nada sale del teléfono.

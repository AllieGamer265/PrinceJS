# Implementación: Cambio de color de los zapatos del personaje

Resumen corto
- Objetivo: permitir al jugador elegir el color de los zapatos del personaje (Kid / Prince) desde la UI y aplicarlo en tiempo de ejecución.
- Enfoque recomendado (menos invasivo y mantenible): extraer los zapatos como una capa separada (asset "shoe"), renderizar esa capa como un sprite adicional anclado al actor y permitir usar varias variantes de color (frames) o tintar esa capa.

Contrato (inputs / outputs / criterios de éxito)
- Input: selección de color desde UI (nombre o índice).
- Output: el actor principal muestra zapatos del color seleccionado en todas sus animaciones y frames.
- Persistencia: la selección se guarda en `localStorage` y en `GameState` para restaurarla entre sesiones.
- Criterios de éxito: la opción está disponible en la UI, el cambio es visible inmediatamente y se preserva al reiniciar la escena/juego.

Resumen técnico del código actual (detectado durante la investigación)
- Los sprites de personajes se cargan como atlas en `PreloadScene.js` (p.ej. `this.load.atlas('kid','assets/gfx/kid.png','assets/gfx/kid.json')`).
- `Actor.updateCharPosition()` establece el frame actual con `this.setFrame(this.charName + '-' + this.charFrame)` y calcula posición / orientación.
- `Fighter` y `Kid` trabajan con `this.animation` (JSON) y frames cuyo nombre es `'<charName>-<frameId>'`.
- No existe en el código actual una capa separada para zapatos.

Opciones de implementación (pros/cons)

1) Capa de zapato separada (recomendada)
- Requisito de assets: crear un atlas o set de frames que contenga solo la silueta/píxeles de los zapatos (en la misma resolución) para cada frame de animación, o un atlas con las mismas claves pero que represente únicamente la parte del zapato. Alternativa: crear un atlas `kid-shoes` que contenga frames nombrados `kid-<frame>-shoe-<color>`.
- Implementación: en el constructor de `Actor` (o `Fighter`/`Kid`), crear un sprite adicional `this.shoe = scene.add.sprite(0,0,'kid')` (o `kid-shoes`) con depth entre el actor y elementos relevantes; en `updateCharPosition()` posicionarlo exactamente sobre el actor y escoger su frame correspondiente (p.ej. `this.shoe.setFrame(this.charName + '-' + this.charFrame + '-shoe-' + colorIndex)`), o aplicar `setTint()` si el asset shoe es monocromático.
- Ventajas: control total del color sin tocar el atlas principal; permite múltiples colores con bajo coste en runtime; es la solución más portable con Phaser.
- Inconvenientes: requiere preparar assets extra (shoe-only) para cada frame o depender de tintado correcto.

2) Variantes completas en atlas (por color)
- Requisito: generar imágenes de personajes completas por cada color de zapato (p.ej. `kid_red.png`, `kid_blue.png`) y atlas JSON correspondientes. Luego usar `setFrame` con el atlas apropiado o cambiar la textura del sprite (`setTexture`).
- Ventajas: sencillo en código (cambiar textura/atlas). No requiere sobreposición exacta.
- Inconvenientes: duplicación masiva de assets (todo el personaje por cada color), mayor tamaño y mantenimiento.

3) Palette swap / Shader (tint mapping)
- Usar un shader o técnica de palette-swap para reemplazar colores concretos en la textura en tiempo real.
- Ventajas: muy flexible, no duplica assets.
- Inconvenientes: más complejo; requiere escribir shader/fragment code y asegurar compatibilidad en plataformas objetivo; puede ser demasiada complejidad para esta base de código.

Recomendación: empezar por la opción 1 (capa de zapato separada). Si no es viable por la forma de los assets, usar la opción 2 como fallback.

Cambios de archivos propuestos
- Assets (fuera del repo):
  - Extraer la porción de zapato para cada frame de animación del `kid` y generar un atlas `assets/gfx/kid-shoes.png` + `assets/gfx/kid-shoes.json` que contenga frames nombrados `kid-<frame>-shoe-<color>` o `kid-<frame>` si se usará tint.
- Código (archivos a modificar):
  1. `src/scripts/scenes/PreloadScene.js`
     - Añadir carga del atlas de zapatos (p.ej. `this.load.atlas('kid-shoes','assets/gfx/kid-shoes.png','assets/gfx/kid-shoes.json');`).
  2. `src/scripts/actors/Actor.js` (o crear una subclase común)
     - En constructor: crear `this.shoe` sprite: `this.shoe = scene.add.sprite(0,0,'kid-shoes');` y configurar origen, depth y visibilidad.
     - Añadir propiedad `this.shoeColor` y método `setShoeColor(color)` que actualice `this.shoe`.
     - En `updateCharPosition()`: después de `this.setFrame(...)` actualizar posición y frame de `this.shoe`, p.ej. `this.shoe.setFrame(this.charName + '-' + this.charFrame + '-shoe-' + this.shoeColor)` y colocar `this.shoe.x = this.x + offsetX; this.shoe.y = this.y + offsetY;` respetando `scaleX` o `charFace` (mirar cómo se maneja `this.scaleX *= -charFace`).
     - En `remove()` ocultar la shoe también.
  3. `src/scripts/ui/Interface.js`
     - Añadir UI (por ejemplo un pequeño menú en la pantalla de título o en la UI principal) para seleccionar color; podría ser un set de botones o un selector con 4 opciones. Al seleccionar, llamar `this.player.setShoeColor(index)` y guardar en `GameState.shoeColor`.
  4. `src/scripts/ui/GameState.js` (o el módulo `GameState`) 
     - Añadir `kidShoeColor` / `shoeColor` con valor por defecto.
     - Añadir helpers para persistir en `localStorage` (si existe ya una función de guardado, integrarla) o guardar en `window.localStorage` directamente.
  5. `src/scripts/scenes/GameScene.js`
     - Al crear al `Kid`, pasarle el color desde `GameState` o invocar `kid.setShoeColor(GameState.kidShoeColor)`.

Detalles de implementación en `Actor` (pseudo-pasos)
1. En constructor (después de scene.add.existing(this)):
   - this.shoeColor = GameState.kidShoeColor || 0;
   - this.shoe = scene.add.sprite(0,0,'kid-shoes');
   - this.shoe.setOrigin(0,1);
   - this.shoe.setDepth(this.depth - 0.5) o algún valor entre el actor y otros elementos (ajustar según necesidad);
   - if (this.charFace == -1) this.shoe.scaleX *= -1; (igual que sword in Fighter)
2. Crear método:
   - setShoeColor(colorIndex) { this.shoeColor = colorIndex; update shoe frame accordingly }
3. En updateCharPosition():
   - después de setFrame(...) y calcular x/y, hacer:
       this.shoe.x = this.x + shoeOffsetX; // offsets pueden ser 0 o leerse de animation json
       this.shoe.y = this.y + shoeOffsetY;
       this.shoe.setOrigin(0,1);
       const shoeFrameName = `${this.charName}-${this.charFrame}-shoe-${this.shoeColor}`;
       if (this.shoe.texture.key == 'kid-shoes') this.shoe.setFrame(shoeFrameName);
       else if (using tint-mode) this.shoe.setFrame(this.charName + '-' + this.charFrame), this.shoe.setTint(colorHex);

Notas sobre offsets y orientación
- Algunos frames pueden necesitar offsets diferentes; la anims JSON (por ejemplo `kid-anims`) incluye `framedef` con `fdx`/`fdy` que representan desplazamientos. Para zapatos podríamos necesitar un `shoeOffset` adicional. Dos opciones:
  - Añadir metadatos al `kid-anims` JSON (por ejemplo `framedef.shoeDx`, `shoeDy`) durante el proceso de creación de assets.
  - Ajustar con un valor único (ej.: x + 0, y + 0) y luego corregir manualmente los frames problemáticos.

UI y persistencia
- Añadir en `Interface` (o en `TitleScene`) un selector visual minimalista: 4 pequeños sprites que muestran el color y responden a click.
- Al elegir color:
  - Actualizar `GameState.kidShoeColor = index`.
  - Guardar en localStorage: `localStorage.setItem('princejs.shoeColor', index)`.
  - Invocar `player.setShoeColor(index)` si el jugador está activo.
- Al arrancar la escena (en `GameScene.create`) cargar el color desde `localStorage` y aplicar a `Kid`.

Pruebas mínimas (QA)
- Prueba 1 (happy path): Seleccionar color 2 en la UI; comprobar que el Kid muestra el color inmediatamente y que persiste al reiniciar la escena y recargar la página.
- Prueba 2 (sin assets shoe): fallback a tint: comprobar que la zapato-layer tintada cambia y que no rompe otras partes de la imagen.
- Prueba 3 (miradas y animaciones): comprobar frames extremos (saltar, colgar, correr) para que la shoe esté bien alineada.
- Prueba 4 (modo espejo): comprobar que al virar el actor (charFace flip) la shoe mantiene la orientación correcta.

Riesgos y edge-cases
- Assets no disponibles: pedir al diseñador extraer zapatos por frame. Si no es posible, la opción 2 (duplicar atlas) es la alternativa.
- Offsets imprecisos: algunos frames pueden desalinearse; requerirá ajustar offsets por frame.
- Performance: agregar un sprite por actor incrementa draw calls pero debería ser insignificante en este juego (pocos actores activos).

Estimatión de esfuerzo (rápido)
- Preparar assets shoe (1-3 horas si hay herramientas/psd; más si hay que recortar manualmente). 
- Implementación código + UI básico: ~2-4 horas.
- Tests y ajustes de offsets: 1-3 horas.

Pasos concretos para el primer PR (mínimo viable)
1. Preparar un atlas `kid-shoes` con una sola variante (por ejemplo color 0) y frames `kid-<frame>` que se alineen con `kid`.
2. Modificar `PreloadScene.js` para cargar `kid-shoes`.
3. Implementar en `Actor.js` la creación de `this.shoe` y la lógica simple para posicionarlo y setear frame (sin selector aún).
4. En `GameScene.create()` aplicar `kid.setShoeColor(GameState.kidShoeColor || 0)`.
5. Añadir un pequeño método en `GameState` para persistir `kidShoeColor`.
6. Commits + PR explicando cambios y pidiendo revisión de assets.

Siguientes mejoras opcionales
- Añadir shader de palette-swap para no depender de assets adicionales.
- Añadir editor in-game para ajustar offsets por frame.
- Soportar color por enemigo/guard para skinning de NPCs.

Archivos propuestos a crear/modificar (resumen)
- Crear: `IMPLEMENTACION_zapatos_de_colores.md` (este archivo)
- Modificar: `src/scripts/scenes/PreloadScene.js` (carga de assets), `src/scripts/actors/Actor.js` (shoe sprite y lógica), `src/scripts/ui/Interface.js` (selector UI), `src/scripts/ui/GameState.js` (persistencia), `src/scripts/scenes/GameScene.js` (aplicar color al crear player)

Comandos sugeridos para acompañar el PR
```powershell
# crear rama para esta feature (si aún no existe)
git checkout -b feature/zapatos-de-colores
# añadir archivo de plan y cambios futuros
git add IMPLEMENTACION_zapatos_de_colores.md
git commit -m "docs: plan de implementación para cambiar color de zapatos"
# push
git push -u origin feature/zapatos-de-colores
```

Resumen y siguiente paso inmediato
- He redactado este plan detallado con la opción recomendada (capa de zapato separada). El siguiente paso que puedo ejecutar ahora es: crear el primer cambio mínimo en código (preload + Actor) que permita renderizar una capa de zapatos neutral, o si prefieres, puedo generar los `stubs` de código para `Actor.js`/`PreloadScene.js` para empezar la implementación.


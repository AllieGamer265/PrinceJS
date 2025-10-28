# Implementación: Zapatos de colores (Opción 4 — Placeholder tintable)

Este documento explica en detalle la "Opción 4" (placeholder tintable) para mostrar zapatos de colores en el personaje cuando no existen assets específicos de zapatos por frame. Está pensado para que cualquier desarrollador pueda implementarlo sin depender de nuevos assets gráficos.

## Objetivo
- Mostrar visualmente zapatos de colores en el personaje (Kid/Prince) sin necesidad de generar un atlas `*-shoes` por frame.
- Ser una solución rápida y no invasiva que permita una demo o prototipo funcional mientras se prepara la solución definitiva con assets.

## Contrato
- Input: índice de color (por ejemplo 0..3) seleccionado desde la UI o `GameState.kidShoeColor`.
- Output: un sprite `shoe` posicionado y coloreado/tintado sobre los pies del actor durante las animaciones.
- Persistencia: el índice de color ya se guarda en `GameState.kidShoeColor` (módulo existente). El código usará ese valor.
- Criterios de éxito: al escoger un color en la UI, el actor visible (player) mostrará un zapato coloreado alineado razonablemente sobre el pie; persistirá entre recargas.

## Requisito previo
- No se requiere asset extra. Se generará una textura placeholder (procedural) llamada `shoe-placeholder` la primera vez que la escena la necesite.
- El proyecto ya contiene la UI que escribe `GameState.kidShoeColor` y el esqueleto de `Actor` con `this.shoe` y métodos auxiliares.

## Archivos a tocar (mínimo)
- `src/scripts/actors/Actor.js` — añadir fallback que genere el placeholder, lo posicione y lo tint.
- (Opcional) `src/scripts/scenes/PreloadScene.js` — no es estrictamente necesario, usamos textura generada en runtime.
- (Opcional) `src/scripts/ui/Interface.js` — ya tiene el selector; verificar que llama a `player.setShoeColor(idx)`.

> Nota: `GameState.kidShoeColor` ya existe y se persiste en `localStorage`.

## Diseño general
1. Si existe un atlas `charName-shoes` con frames `-shoe-` (solución completa), el código actual en `Actor` ya lo soporta y mantiene `this.shoeIsReal === true` — no interferir con eso.
2. Si no existe atlas real (`this.shoeIsReal === false`), entonces crear/reutilizar una textura procedural `shoe-placeholder` y asignarla a `this.shoe` para que se muestre y se aplique `setTint()` según la selección de color.
3. Posicionar el sprite `this.shoe` sobre el pie del actor en `updateCharPosition()` con offsets ajustables (valores por defecto que pueden ser afinados por QA).
4. Soportar volteo horizontal (mirror) del actor aplicando `scaleX` al `shoe` para que siga la orientación.

## Paleta de colores
- Definir la paleta en un solo lugar (recomendado): en `Interface.js` ya hay un array `shoeColors`. Para evitar duplicación, se puede exportar una constante en `src/scripts/Config.js` o referirse a `Interface`/`GameState` si es accesible.
- Ejemplo de paleta (ya presente):
  - 0 => 0xff0000 (rojo)
  - 1 => 0x00aaff (celeste)
  - 2 => 0x00cc44 (verde)
  - 3 => 0xffcc00 (amarillo)

Recomendación: si se hace más de un cambio, mover la paleta a `Config.js` como `SHOE_COLORS` para reutilizarla.

## Cambios concretos (snippet para `Actor.js`)
A continuación hay fragmentos de código para integrar en `Actor.js`. El objetivo es mínimo y seguro: si el proyecto ya tiene una `this.shoe` real, no tocarla; si no, crear un placeholder y mostrarlo.

1) Generar y asignar el placeholder en el constructor (o justo después del bloque que intenta cargar `kid-shoes`).

```javascript
// --- Insertar después del bloque que define this.shoe / this.shoeIsReal ---
if (!this.shoeIsReal) {
    // Crear / reutilizar textura placeholder para zapatos (una sola vez por escena)
    if (!scene.textures.exists('shoe-placeholder')) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        // Dibujar una forma simple representando un zapato (ajusta tamaño según escala del juego)
        g.fillStyle(0xffffff, 1);
        // Dibujar una pequeña elipse o rect redondeado; los parámetros pueden cambiarse
        g.fillEllipse(8, 4, 16, 8); // ancho 16, alto 8
        g.generateTexture('shoe-placeholder', 16, 8);
        g.destroy();
    }

    if (!this.shoe) {
        this.shoe = scene.add.sprite(this.x || 0, this.y || 0, 'shoe-placeholder').setOrigin(0, 1);
        this.shoe.setDepth(this.depth - 0.5);
    } else {
        this.shoe.setTexture('shoe-placeholder');
    }
    this.shoe.setVisible(true);
    // Aplicar color inicial (usamos GameState.kidShoeColor)
    try {
        const colors = [0xff0000, 0x00aaff, 0x00cc44, 0xffcc00];
        this.shoe.setTint(colors[this.shoeColor] || 0xffffff);
    } catch (e) { /* silent */ }
}
```

2) Actualizar `updateCharPosition()` para posicionar y tintar el placeholder cuando `this.shoeIsReal` es falso. Añadir esto dentro del método, en el bloque donde se actualiza la shoe:

```javascript
// Fallback para shoe-placeholder (dentro de updateCharPosition())
if (this.shoe && !this.shoeIsReal) {
    // Offsets (valores iniciales; pueden ajustarse) -- fine-tune por QA
    const shoeOffsetX = 0;
    const shoeOffsetY = 0;
    this.shoe.x = this.x + shoeOffsetX;
    this.shoe.y = this.y + shoeOffsetY;
    this.shoe.setOrigin(0, 1);

    // Mirror/flip handling: asegurarse que sigue la escala/orientación del actor
    const baseScaleX = Math.abs(this.scaleX) || 1;
    this.shoe.scaleX = (this.charFace === -1) ? -baseScaleX : baseScaleX;
    this.shoe.scaleY = Math.abs(this.scaleY) || 1;

    // Aplicar tint basado en GameState (o this.shoeColor)
    try {
        const colors = [0xff0000, 0x00aaff, 0x00cc44, 0xffcc00];
        this.shoe.setTint(colors[this.shoeColor] || 0xffffff);
    } catch (e) {}

    this.shoe.setVisible(this.visible);
}
```

3) Actualizar `setShoeColor()` (si no está ya) para aplicar tint de forma inmediata:

```javascript
setShoeColor(colorIndex) {
    this.shoeColor = colorIndex;
    try {
        const colors = [0xff0000, 0x00aaff, 0x00cc44, 0xffcc00];
        if (this.shoe) this.shoe.setTint(colors[this.shoeColor] || 0xffffff);
    } catch (e) {}
    try { if (typeof GameState !== 'undefined') { GameState.kidShoeColor = colorIndex; if (typeof GameState.save === 'function') GameState.save(); } } catch(e) {}
}
```

> Nota: el proyecto ya tiene un `setShoeColor` en `Actor.js`; si existe, extiende su lógica para validar `this.shoe` y aplicar `setTint`.

## Offsets y ajuste por animación
- La solución placeholder no será pixel-perfect para todos los frames. Hay dos estrategias:
  1. Offsets globales (rápido): usar valores comunes `shoeOffsetX`, `shoeOffsetY` para la mayoría de frames y ajustar manualmente si hay problemas mayores.
  2. Offsets por frame (preciso): mantener un mapa `shoeOffsets = { frameId: {dx, dy} }` y en `updateCharPosition()` aplicar `const off = shoeOffsets[this.charFrame] || {dx:0,dy:0}` para posicionar correctamente por frame.
- Recomendación: empezar con offsets globales y durante QA registrar frames con mayor desalineación y añadir entradas al mapa `shoeOffsets` sólo para los que lo necesiten.

## QA / Checklist de pruebas
- [ ] Seleccionar cada color en la UI; verificar que el zapato cambia de color inmediatamente.
- [ ] Reiniciar la escena / recargar la página y verificar que la selección persiste.
- [ ] Verificar poses críticas: correr, salto, colgar, agacharse. Corregir offsets por frame problemáticos.
- [ ] Verificar volteo horizontal: al cambiar la orientación del actor el zapato debe seguir la orientación (mirrored).
- [ ] Verificar que no se renderiza un duplicado si más adelante se dispone de un atlas real (`this.shoeIsReal === true`).

## Consideraciones de rendimiento
- Se genera una sola textura placeholder por escena (`shoe-placeholder`) y se reusa, por lo que el impacto es mínimo.
- Se añade un sprite por actor que tenga zapatos; en juegos con muchos actores podría incrementar draw calls, pero en este juego el número de actores es bajo.

## Siguientes pasos y migración a solución definitiva
- Una vez disponibles los assets `kid-shoes` por frame, el código existente en `Actor.js` detectará frames con `-shoe-` y usará el atlas real. Para migrar:
  1. Generar `assets/gfx/kid-shoes.png` y `kid-shoes.json` con frames que contengan `-shoe-` en el nombre, o al menos frames `kid-<frame>` para usar tint.
  2. Actualizar `PreloadScene.js` para cargar `kid-shoes` desde los assets reales (reemplazar la línea placeholder).
  3. QA: desactivar placeholder y verificar alineación. Ajustar offsets si hace falta.

## Sugerencias extra
- Mover la paleta de colores a `Config.js` como `SHOE_COLORS` y usar esa constante desde `Interface.js` y `Actor.js` para evitar duplicación.
- Añadir un pequeño mapa `shoeOffsets` en `src/scripts/actors/shoeOffsets.js` si se desea mantener offsets por frame versionable en control de versiones.

## Resumen
La Opción 4 (placeholder tintable) es una solución rápida y práctica para hacer visible la selección de color de zapatos sin depender de assets nuevos. Requiere tocar principalmente `Actor.js` para crear/reutilizar una textura placeholder, posicionar el sprite y aplicar `setTint()` según `GameState.kidShoeColor`. Esta implementación permite mostrar el efecto inmediatamente y servirá como base hasta que se generen assets definitivos o se implemente un shader de palette-swap.

---

Si quieres, implemento ahora el cambio mínimo en `Actor.js` y creo un PR con los ajustes y pruebas locales (toma ~30–90 minutos). Si prefieres primero revisar el documento o cambiar la paleta por defecto, dime qué quieres ajustar.

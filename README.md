# Lanza Cubos 3D

Juego didáctico de tiro al blanco en 3D hecho con Three.js y WebXR. El paisaje panorámico inspirado en la imagen de referencia rodea al jugador con una ciudad, un bosque fantástico y montañas. Apunta a los blancos flotantes y lanza cubos de colores para sumar puntos.

## Autor

**Jocelin Ramirez Flores**  
**Número de control:** 21200662  
**Materia:** Desarrollo de Soluciones en ambientes virtuales

## Cómo jugar

- Mueve el cursor sobre un blanco y haz clic, o pulsa **Espacio** para lanzar hacia el blanco central.
- También puedes pulsar **Lanzar cubo**. Cada impacto suma un punto, reproduce un efecto de sonido y hace reaparecer el blanco en otro lugar.
- El récord se guarda en este navegador.
- En un visor compatible, pulsa **Enter VR**, apunta con el rayo de un control y aprieta el gatillo.

## Archivos

```text
index.html
css/styles.css
js/main.js
assets/world-panorama.jpg
README.md
```

## Ejecutar

Abre el proyecto con un servidor estático (por ejemplo, la extensión Live Server de VS Code). Para usar VR desde otro dispositivo, publícalo en un sitio con HTTPS. El navegador y el visor deben ser compatibles con WebXR; Three.js y sus módulos se cargan desde jsDelivr, así que se requiere conexión a internet.

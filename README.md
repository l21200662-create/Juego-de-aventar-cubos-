# Lanza Cubos 3D

Juego de habilidad en 3D hecho con Three.js y WebXR. Lanza cubos y observa su caída hasta la plataforma; cada cubo que aterriza se queda en la torre con un color nuevo. Incluye efectos de sonido generados en el navegador, récord guardado localmente y modo VR para visores compatibles.

## Autor

**Jocelin Ramirez Flores**  
**Número de control:** 21200662  
**Materia:** Desarrollo de Soluciones en ambientes virtuales

## Cómo jugar

- Pulsa **Lanzar cubo**, haz clic en la escena o presiona **Espacio**.
- Mira el cubo volar, girar y aterrizar. Al tocar la torre emite un sonido y suma un punto.
- Cada lanzamiento exitoso agrega otro color. El récord se guarda en este navegador.
- En un visor compatible, pulsa **Enter VR** y usa el gatillo de cualquiera de los controles para lanzar.

## Archivos

```text
index.html
css/styles.css
js/main.js
README.md
```

## Ejecutar

Abre el proyecto con un servidor estático (por ejemplo, la extensión Live Server de VS Code). Para usar VR desde otro dispositivo, publícalo en un sitio con HTTPS. El navegador y el visor deben ser compatibles con WebXR; Three.js y sus módulos se cargan desde jsDelivr, así que se requiere conexión a internet.

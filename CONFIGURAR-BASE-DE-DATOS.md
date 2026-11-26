# Configurar la base de datos y el iPhone

La app guarda todo en una **Hoja de Google** (tu "base de datos"). Así los datos
no se pierden si se borra la caché, se reinicia el celular o cambias de equipo,
y puedes usar la app en el iPhone y en el PC con los mismos datos.

Se hace **una sola vez** y toma unos 10 minutos.

---

## Paso 1 · Crear la hoja y el script (desde un computador)

1. Entra a <https://sheets.google.com> con tu cuenta de Google y crea una hoja
   en blanco. Ponle de nombre **Nómina Castillo**.
2. En el menú: **Extensiones → Apps Script**. Se abre el editor.
3. Borra todo lo que aparece y pega el contenido del archivo
   [`google-apps-script/Codigo.gs`](google-apps-script/Codigo.gs) de este repositorio.
4. En la línea `const CLAVE = 'CAMBIA-ESTA-CLAVE';` cambia el texto entre comillas
   por una clave tuya (ejemplo: `'Castillo-2026-nomina'`). Anótala.
5. Guarda (ícono de disquete).
6. Arriba, en la lista de funciones, elige **inicializar** y pulsa **Ejecutar**.
   Google pedirá permisos: **Revisar permisos → tu cuenta → Configuración avanzada →
   Ir a (proyecto) → Permitir**. Es normal: el permiso es para que el script
   escriba en *tu* hoja. Se crean las pestañas **Empleados**, **Dias** y **Semanas**.

## Paso 2 · Publicar el script como aplicación web

1. En el editor: **Implementar → Nueva implementación**.
2. En el engranaje de "Tipo" elige **Aplicación web**.
3. Configura:
   - **Ejecutar como:** Yo (tu correo)
   - **Quién tiene acceso:** Cualquier usuario
4. **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).

> "Cualquier usuario" es necesario para que la app pueda conectarse, pero sin la
> **clave** nadie puede leer ni cambiar nada.
>
> Si algún día cambias el código del script: **Implementar → Gestionar
> implementaciones → editar (lápiz) → Versión: Nueva versión → Implementar**.
> Así el enlace `/exec` sigue siendo el mismo.

## Paso 3 · Publicar la app en internet (para abrirla en el iPhone)

El iPhone necesita abrir la app desde una dirección `https://`. Opción gratuita:

**GitHub Pages**
1. Integra (merge) la solicitud de cambios a `main`.
2. En el repositorio NOMINA: **Settings → Pages → Branch: `main` / `(root)` → Save**.
3. En 1–2 minutos queda en `https://autocastillo.github.io/NOMINA/`.

> En repositorios **privados**, GitHub Pages requiere un plan de pago. Si no lo
> tienes, puedes poner el repositorio público: ahí solo está el programa; los
> datos de los empleados y la clave **no** están en el repositorio.
>
> Alternativa sin GitHub: <https://app.netlify.com/drop> y arrastra la carpeta
> del proyecto (index.html, manifest.json, sw.js e íconos).

## Paso 4 · Instalar en el iPhone

1. Abre la dirección de la app en **Safari**.
2. Toca **Compartir** (cuadro con flecha) → **Agregar a pantalla de inicio** → **Agregar**.
3. Abre la app desde el ícono **Nómina** de la pantalla de inicio.

## Paso 5 · Conectar la app con la hoja

Dentro de la app (la del ícono, no la de Safari, porque en iPhone son
independientes):

1. **Ajustes → Base de datos (Hoja de Google)**.
2. Pega el enlace `/exec` del paso 2 y escribe tu clave.
3. **Conectar y cargar datos**.

Arriba debe aparecer el punto verde **"Guardado en la hoja de Google"**.
Si ya tenías datos marcados en ese dispositivo y la hoja está vacía, se suben solos.

Repite el paso 5 en cada equipo donde uses la app (PC, otro celular): todos
verán los mismos datos.

---

## Cómo funciona

- Cada vez que marcas un día, un adelanto, una nota o un pago, se guarda en la hoja en 1 segundo.
- Si no hay internet, la app lo guarda en espera (aparece "Sin conexión · N cambio(s) por subir")
  y lo sube sola cuando vuelve la conexión.
- Al abrir la app, carga siempre los datos de la hoja.
- Si se borra la caché del iPhone, solo hay que volver a hacer el paso 5: todo vuelve desde la hoja.
- Puedes abrir la hoja para ver o descargar los datos (Archivo → Descargar → Excel).
  Mejor **no editar** la hoja a mano mientras usas la app.

**Pestañas de la hoja**

| Pestaña | Contenido |
|---|---|
| Empleados | Número (1–3), nombre y tarifas de cada empleado |
| Dias | Empleado, fecha, día, jornada y valor de cada día trabajado |
| Semanas | Por semana: pagada, fecha de pago, adelanto y nota |

**Opcional:** para no tener que pegar el enlace en cada equipo, escríbelo en
`index.html`, en la línea `const URL_BASE_DATOS = '';`. Así solo pedirá la clave.

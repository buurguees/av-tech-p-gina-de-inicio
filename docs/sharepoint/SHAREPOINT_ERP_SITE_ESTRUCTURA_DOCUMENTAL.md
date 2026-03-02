# Estructura Propuesta del Site SharePoint ERP

Fecha: 2026-03-02
Estado: decision operativa base
Ambito: archivo documental ERP NEXO AV

## Este documento es la referencia buena

La referencia activa y mantenible para SharePoint debe ser esta:

- `docs/sharepoint/SHAREPOINT_ERP_SITE_ESTRUCTURA_DOCUMENTAL.md`

Si existe otra copia en otra carpeta del repo, esta debe considerarse secundaria o pendiente de limpieza.

## Objetivo

Definir la estructura final del site de SharePoint para que actue como archivo documental del ERP, con foco en:

- facturas de venta emitidas
- presupuestos emitidos
- facturas de compra
- tickets y gastos
- documentacion por cliente y proyecto
- documentacion contable y fiscal
- trabajo agil con gestor

La idea no es sustituir la base contable del ERP, sino tener un repositorio documental claro, consultable y estable, donde los PDFs y archivos subidos queden archivados de forma ordenada y trazable.

## Principios de diseno

1. El ERP sigue siendo la fuente de verdad transaccional.
2. SharePoint es el archivo documental oficial.
3. Una factura emitida debe apuntar siempre a un PDF cerrado y archivado.
4. La estructura debe priorizar trabajo real de administracion y gestor.
5. Se acepta duplicidad documental cuando mejora control y navegacion.
6. La navegacion por cliente y proyecto debe estar separada de la navegacion por mes fiscal.
7. Contabilidad debe leerse por ejercicio y mes, no mezclada con la logica operativa de ventas y compras.

## Modelo general del site

Nombre recomendado del site:
- `ERP NEXO AV - Archivo Documental`

Objetivo de usabilidad:

- que administracion encuentre un documento en menos de 3 clics si conoce mes, proveedor, cliente o proyecto
- que gestor pueda trabajar directamente por meses
- que comercial y PM puedan trabajar por cliente y proyecto
- que contabilidad tenga una biblioteca propia por ejercicio y mes
- que la documentacion laboral y societaria quede separada y protegida

Bibliotecas principales recomendadas:

1. `Ventas`
2. `Compras`
3. `Clientes`
4. `Contabilidad`
5. `Recursos Humanos`
6. `Productos y Servicios`
7. `Plantillas y Documentos Maestros`
8. `Importaciones y OCR`

## Navegacion recomendada del site

No basta con una buena estructura de carpetas. El site debe ser navegable para perfiles no tecnicos.

### Menu lateral recomendado

```text
Inicio
Ventas
Compras
Clientes
Contabilidad
Recursos Humanos
Productos y Servicios
Plantillas y Documentos Maestros
Importaciones y OCR
Busquedas rapidas
Ayuda de uso
```

### Pagina de inicio recomendada

La home del site no debe ser un listado de archivos. Debe ser un panel de acceso.

Bloques recomendados:

1. `Accesos rapidos`
   - Facturas de venta del mes actual
   - Facturas de compra del mes actual
   - Carpeta de clientes
   - Resumen contable anual
   - Tickets del mes actual
   - Cierre mensual en curso
2. `Buscar por`
   - cliente
   - proveedor
   - proyecto
   - mes
   - numero de documento
   - resumen contable
3. `Gestoria`
   - ventas del mes actual
   - compras del mes actual
   - contabilidad del ejercicio
   - carpeta del cierre mensual
4. `Pendientes`
   - OCR pendiente
   - documentos sin clasificar
   - documentos duplicados detectados

### Principio de navegacion

Cada biblioteca debe ofrecer tres formas de acceso:

1. por carpetas
2. por vistas guardadas
3. por filtros de metadatos

## Perfiles de usuario y recorrido esperado

### Administracion

Necesita:

- localizar ventas por mes
- localizar compras por mes o proveedor
- localizar documentacion por cliente y proyecto
- preparar documentacion para gestor

Recorrido recomendado:

- entra a `Ventas`, `Compras`, `Clientes` o `Contabilidad`
- usa la logica principal de cada biblioteca
- abre PDF o copia enlace

### Gestoria

Necesita:

- trabajar por mes
- descargar soporte de ventas y compras
- revisar documentacion contable
- revisar IVA, IRPF y resumen economico

Recorrido recomendado:

- entra a `Ventas`, `Compras` o `Contabilidad`
- trabaja por carpeta mensual

### Comercial / PM / direccion

Necesita:

- encontrar presupuestos, facturas y gastos por cliente y proyecto

Recorrido recomendado:

- entra a `Clientes`
- navega `Cliente > Proyecto > Facturas / Presupuestos / Gastos`

### Tecnicos / socios

Necesita:

- encontrar tickets y gastos por mes, beneficiario o proyecto

Recorrido recomendado:

- entra a `Compras/Tickets y Gastos`
- usa `Por Mes`, `Por Beneficiario` o `Por Proyecto`

## Biblioteca 1: Ventas

Objetivo:

- guardar PDFs definitivos de facturas y presupuestos de venta
- priorizar trabajo rapido con gestor
- ordenar solo por criterio mensual

### Estructura propuesta

```text
Ventas/
  Facturas Emitidas/
    {year}/
      {month}/
  Presupuestos Emitidos/
    {year}/
      {month}/
```

Ejemplo:

```text
Ventas/
  Facturas Emitidas/
    2026/
      2026-01/
      2026-02/
  Presupuestos Emitidos/
    2026/
      2026-01/
      2026-02/
```

### Regla operativa

- en `Ventas` solo se archiva por mes
- no se ordena por cliente dentro de `Ventas`
- no se ordena por proyecto dentro de `Ventas`
- la clasificacion por cliente y proyecto se resuelve en `Clientes`
- esta decision prioriza velocidad de trabajo con gestor y revision fiscal mensual

### Nombres de archivo recomendados

Facturas:
- `F-26-000023 - SOFT CONTROLS - AQSYZRYWV - 2026-02-24.pdf`

Presupuestos:
- `P-26-000041 - SOFT CONTROLS - AQSYZRYWV - 2026-02-22.pdf`

Si hay version:
- `P-26-000041-V2 - SOFT CONTROLS - 2026-02-23.pdf`

### Vistas recomendadas

1. `Facturas del mes actual`
2. `Facturas del ejercicio`
3. `Presupuestos del mes actual`
4. `Presupuestos del ejercicio`
5. `Documentos emitidos esta semana`

### Validacion tecnica ya realizada en `Ventas`

Fecha de validacion:
- `2026-03-02`

Prueba ejecutada:

- creacion de carpeta `_tests` en la biblioteca `Ventas`
- subida de un PDF de prueba pequeno por Microsoft Graph
- recuperacion de `sharepoint_item_id`, `webUrl` y `eTag`
- escritura de metadatos ERP sobre el documento subido

Resultado:

- la app ya puede escribir en la biblioteca `Ventas`
- la app ya puede crear carpetas
- la app ya puede subir PDFs
- la app ya puede actualizar columnas del `listItem` asociado al archivo

Resultado concreto de la prueba:

- carpeta creada: `_tests`
- archivo subido: `factura_test.pdf`
- `sharepoint_item_id`: `REDACTED_SHAREPOINT_ITEM_ID`
- `webUrl`: `https://<tenant>.sharepoint.com/sites/<site>/Ventas/_tests/factura_test.pdf`
- `eTag` inicial: `"{59D5879A-F598-4C3E-99F4-8FA965621920},1"`

Metadatos validados en SharePoint:

- `DocumentoERPId`
- `TipoDocumento`
- `Cliente`
- `Proyecto`
- `MesFiscal`
- `EstadoERP`
- `HashPDF`

Metadatos escritos correctamente en la prueba:

- `DocumentoERPId = INV-2026-000001`
- `TipoDocumento = Factura`
- `Cliente = SOFT CONTROLS`
- `MesFiscal = 2026-03`
- `EstadoERP = Emitida`
- `HashPDF = sha256:...`

Observacion importante:

- la columna `HashRegistro` no existe todavia en la biblioteca `Ventas`
- si se quiere guardar hash documental y hash de registro por separado, habra que crear esa columna en SharePoint
- mientras tanto, `HashPDF` ya esta operativo y validado

Implicacion para NEXO AV:

- el ERP ya puede guardar en SharePoint el PDF final emitido
- el ERP ya puede guardar el `sharepoint_item_id`, `webUrl` y `eTag` como referencias persistentes
- el siguiente paso correcto es sustituir la descarga dinamica desde plantilla por lectura del PDF archivado en SharePoint, pasando siempre por backend

### Regla funcional obligatoria para documentos emitidos

Cuando una factura o un presupuesto ya esta emitido:

- el ERP debe mostrar siempre el PDF archivado en SharePoint
- el ERP debe descargar siempre el PDF archivado en SharePoint
- el ERP no debe volver a renderizar ese documento desde plantilla

La plantilla solo puede usarse para:

- borradores
- vista previa antes de emitir
- soporte interno controlado, si alguna vez hiciera falta reconstruccion tecnica

Regla por estado:

- `DRAFT`: puede usar plantilla dinamica
- `ISSUED` o equivalente emitido: debe usar exclusivamente el PDF archivado

Si un documento emitido no tiene PDF archivado:

- debe tratarse como incidencia documental
- no debe resolverse regenerando desde plantilla como comportamiento normal

Motivo:

- evita que cambien documentos historicos por cambios en productos, proyectos, sitios, textos, logos o plantilla
- garantiza que lo que ve el usuario en ERP sea exactamente lo emitido y archivado

Campos recomendados en base de datos para este flujo:

- `archived_pdf_provider`
- `sharepoint_item_id`
- `sharepoint_web_url`
- `sharepoint_etag`
- `archived_pdf_path`
- `archived_pdf_generated_at`
- `archived_pdf_hash`

Ruta objetivo en esta biblioteca:

- una factura emitida debe quedar en `Ventas/Facturas Emitidas/{year}/{month}`
- un presupuesto emitido debe quedar en `Ventas/Presupuestos Emitidos/{year}/{month}`

## Biblioteca 2: Compras

Objetivo:

- guardar facturas de proveedor
- facilitar consulta mensual para IVA soportado
- mantener acceso secundario por proveedor

### Estructura propuesta

```text
Compras/
  {year}/
    {month}/
  Proveedores/
    {provider}/
      {month}/
```

Ejemplo:

```text
Compras/
  2026/
    2026-01/
    2026-02/
  Proveedores/
    TELEFONICA DE ESPANA SAU/
      2026-01/
      2026-02/
```

### Regla de duplicidad

- la ruta principal es `Compras/{year}/{month}`
- la ruta espejo es `Compras/Proveedores/{provider}/{month}`
- no se necesita una rama por proyecto dentro de `Compras`

### Nombres de archivo recomendados

- `C-26-000046 - TELEFONICA DE ESPANA SAU - FAC-ENERO - 2026-03-01.pdf`
- `C-26-000006 - RENOM GESTIONS INICIATIVES SL - 2026-01-31.pdf`

### Vistas recomendadas

1. `Facturas del mes actual`
2. `Facturas por proveedor`
3. `Facturas del ejercicio`
4. `Facturas pendientes de contabilizar`
5. `Facturas con soporte incompleto`

## Biblioteca 3: Clientes

Objetivo:

- concentrar la vision documental operativa por cliente y proyecto
- permitir a comercial, PM y administracion navegar por relacion real con cliente
- separar esta logica de la biblioteca `Ventas`

### Estructura propuesta

```text
Clientes/
  {CLIENTE}/
    {PROYECTO}/
      Facturas/
      Presupuestos/
      Gastos/
```

### Regla operativa

- esta biblioteca es la referencia natural para trabajo por cliente y proyecto
- las facturas y presupuestos pueden existir aqui como copia espejo documental
- `Gastos` agrupa compras y tickets imputados al proyecto o cliente
- si un cliente no tiene proyecto, se puede crear un contenedor `General`

### Vistas recomendadas

1. `Clientes activos`
2. `Documentos por cliente`
3. `Documentos por proyecto`
4. `Facturas por cliente`
5. `Gastos por proyecto`

## Biblioteca 4: Contabilidad

Objetivo:

- ordenar documentacion contable por ejercicio y mes
- disponer de una carpeta anual con resumen economico vivo
- facilitar control interno y lectura contable

### Estructura propuesta

```text
Contabilidad/
  {year}/
    Resumen_PyG_{year}.xlsx
    {month}/
```

Ejemplo:

```text
Contabilidad/
  2026/
    Resumen_PyG_2026.xlsx
    2026-01/
    2026-02/
```

### Regla operativa

- dentro de cada `year` debe existir un Excel resumen vivo del ejercicio
- ese Excel debe actualizarse automaticamente conforme avance el ano
- la fuente del resumen debe ser el PyG del ERP, no una edicion manual en SharePoint
- la carpeta mensual puede contener exportes contables, diarios, mayores, balances, conciliaciones y cierres

### Requisito importante

Dentro de cada `year` se quiere:

- un `Resumen_PyG_{year}.xlsx`
- actualizado automaticamente
- acumulado desde enero hasta el mes actual
- coherente con el PyG del ERP

### Contenido recomendado por mes

- diario del mes
- mayor del mes
- balance de sumas y saldos
- PyG mensual
- soportes de regularizacion o cierre
- extractos o conciliaciones si procede

### Vistas recomendadas

1. `Mes actual`
2. `Ejercicio actual`
3. `Resumen anual`
4. `Pendiente de cierre`

## Biblioteca 5: Recursos Humanos

Objetivo:

- centralizar documentacion laboral y societaria sensible
- separar expedientes personales de la documentacion contable general
- mantener nominas, contratos y certificados bien ordenados por persona y por ano

### Estructura propuesta

```text
Recursos Humanos/
  Empleados/
    {EMPLEADO}/
      Expediente/
      Nominas/
        {AÑO}/
      Contratos/
      IRPF y Certificados/
      Seguridad Social/
      Vacaciones y Ausencias/
      Otros Documentos/
  Socios/
    {SOCIO}/
      Expediente/
      Nominas o Retribuciones/
        {AÑO}/
      Contratos y Acuerdos/
      IRPF y Certificados/
      Seguridad Social/
      Otros Documentos/
  Modelos y Plantillas/
  Reportes/
    {AÑO}/
```

### Regla operativa

- `Recursos Humanos` no debe mezclarse con `Contabilidad`
- la documentacion personal o salarial debe vivir aqui aunque exista reflejo contable en otra biblioteca
- las nominas se ordenan por persona y por ano
- los socios deben tener rama propia, separada de empleados

### Nombres recomendados

Carpetas de persona:

- `Nombre Apellido`
- `Nombre Apellido Apellido`

Archivos de nomina:

- `Nomina - 2026-01.pdf`
- `Nomina - 2026-02.pdf`

Archivos de certificados:

- `Certificado IRPF - 2026.pdf`
- `Resumen Retribuciones - 2026.pdf`

### Convencion oficial de nombres para RRHH

La nomenclatura de `Recursos Humanos` debe ser especialmente consistente por sensibilidad documental y por necesidad de busqueda rapida.

#### Carpetas de empleados y socios

Formato recomendado:

- `{Nombre} {Apellido}`
- `{Nombre} {Apellido1} {Apellido2}` cuando aplique

Reglas:

- usar nombre real de la persona, no alias
- evitar parentesis, guiones o codigos internos salvo necesidad legal
- mantener mismo formato para empleados y socios

Ejemplos:

- `Alex Burgues`
- `Marta Lopez Garcia`

#### Subcarpetas estandar por persona

Para empleados:

- `Expediente`
- `Nominas`
- `Contratos`
- `IRPF y Certificados`
- `Seguridad Social`
- `Vacaciones y Ausencias`
- `Otros Documentos`

Para socios:

- `Expediente`
- `Nominas o Retribuciones`
- `Contratos y Acuerdos`
- `IRPF y Certificados`
- `Seguridad Social`
- `Otros Documentos`

#### Nombres de nominas

Formato oficial:

- `Nomina - {YYYY-MM}.pdf`

Ejemplos:

- `Nomina - 2026-01.pdf`
- `Nomina - 2026-02.pdf`

Si en el futuro se necesita distinguir extraordinarias:

- `Nomina Extraordinaria - {YYYY-MM}.pdf`

#### Nombres de contratos

Formato oficial:

- `Contrato Laboral - {YYYY-MM-DD}.pdf`
- `Anexo de Contrato - {YYYY-MM-DD}.pdf`

Ejemplos:

- `Contrato Laboral - 2026-01-01.pdf`
- `Anexo de Contrato - 2026-06-01.pdf`

Para socios:

- `Acuerdo Societario - {YYYY-MM-DD}.pdf`
- `Retribucion Socio - {YYYY-MM-DD}.pdf`

#### Nombres de certificados e IRPF

Formato oficial:

- `Certificado IRPF - {YYYY}.pdf`
- `Resumen Retribuciones - {YYYY}.pdf`
- `Certificado de Empresa - {YYYY-MM-DD}.pdf`

Ejemplos:

- `Certificado IRPF - 2026.pdf`
- `Resumen Retribuciones - 2026.pdf`
- `Certificado de Empresa - 2026-02-15.pdf`

#### Nombres de documentos de Seguridad Social

Formato oficial:

- `Alta Seguridad Social - {YYYY-MM-DD}.pdf`
- `Baja Seguridad Social - {YYYY-MM-DD}.pdf`
- `Variacion Seguridad Social - {YYYY-MM-DD}.pdf`

#### Nombres de vacaciones y ausencias

Formato oficial:

- `Vacaciones - {YYYY}.pdf`
- `Ausencia - {YYYY-MM-DD}.pdf`
- `Baja Medica - {YYYY-MM-DD}.pdf`

#### Regla final para RRHH

Si hubiera duda entre dos nombres posibles, elegir siempre el que cumpla mejor esto:

1. identificar a la persona sin ambiguedad
2. identificar el tipo documental de un vistazo
3. identificar el periodo o fecha exacta
4. evitar nombres largos pero poco claros

### Vistas recomendadas

1. `Nominas del mes`
2. `Nominas del ejercicio`
3. `Expedientes empleados`
4. `Expedientes socios`
5. `Documentos pendientes de revision`

### Relacion con contabilidad

- `Contabilidad` guarda el reflejo economico y los reportes contables
- `Recursos Humanos` guarda expediente, nominas y documentacion personal
- si una nomina genera soporte contable o fiscal, puede existir referencia cruzada, pero no debe duplicarse la logica documental

## Biblioteca 6: Productos y Servicios

Objetivo:

- centralizar la documentacion maestra de productos, servicios y packs
- ordenar imagenes, fichas, datos tecnicos y excels resumen
- facilitar mantenimiento del catalogo y soporte comercial u operativo
- mantener una vista clara por categoria para administracion, comercial y operaciones
- disponer de una carpeta especifica de `Packs` separada del resto

### Estructura propuesta

```text
Productos y Servicios/
  Productos/
    Por Categoria/
      {CATEGORIA}/
        Imagenes/
        Fichas/
        Datos/
        Excels/
        Individual/
          {SKU} - {NOMBRE}/
  Servicios/
    Por Categoria/
      {CATEGORIA}/
        Imagenes/
        Fichas/
        Datos/
        Excels/
        Individual/
          {SKU} - {NOMBRE}/
  Packs/
    Imagenes/
    Fichas/
    Datos/
    Excels/
    Individual/
      {PACK_CODE} - {NOMBRE}/
  Resumenes/
    Por Categoria/
    Global/
```

Ejemplo:

```text
Productos y Servicios/
  Productos/
    Por Categoria/
      Iluminacion/
        Imagenes/
        Fichas/
        Datos/
        Excels/
        Individual/
          LED-000245 - Panel Led 600x600/
      Sonido/
        Imagenes/
        Fichas/
        Datos/
        Excels/
        Individual/
          AUD-000031 - Altavoz Activo 12/
  Servicios/
    Por Categoria/
      Montaje/
        Imagenes/
        Fichas/
        Datos/
        Excels/
        Individual/
          SRV-000018 - Montaje de Pantalla Led/
  Packs/
    Imagenes/
    Fichas/
    Datos/
    Excels/
    Individual/
      PACK-00007 - Escenario Basico/
  Resumenes/
    Por Categoria/
      Resumen Categoria - Iluminacion.xlsx
      Resumen Categoria - Sonido.xlsx
    Global/
      Resumen Global Productos y Servicios.xlsx
```

### Regla operativa

- `Productos` y `Servicios` deben separarse claramente
- la navegacion principal debe ser por categoria
- cada categoria puede tener su propio Excel resumen
- cada producto o servicio puede tener su carpeta individual si necesita documentacion propia
- `Packs` debe tener rama propia separada del resto
- `Datos` debe contener hojas de datos, fichas maestras, especificaciones y extractos tecnicos
- `Resumenes` debe servir como acceso rapido a excels consolidados por categoria y a un consolidado global
- si un producto o servicio se usa en el ERP, el identificador visible debe mantenerse estable en SharePoint

### Contenido esperado

- imagenes de producto o servicio
- fichas tecnicas o comerciales
- hojas de datos o fichas maestras
- excels resumen por categoria
- excels o fichas individuales por producto o servicio
- documentacion de packs

### Navegacion recomendada

La biblioteca debe poder trabajarse de dos maneras:

1. por `tipo de catalogo`
2. por `categoria`

Recorrido recomendado:

- administracion y operaciones entran por `Productos` o `Servicios`
- comercial suele entrar por `Packs` o por la categoria comercial
- direccion puede trabajar directamente desde `Resumenes`

### Subcarpetas recomendadas por item individual

Dentro de `Individual/{SKU} - {NOMBRE}` conviene usar una estructura breve y estable:

```text
{SKU} - {NOMBRE}/
  Imagen Principal/
  Galeria/
  Ficha Comercial/
  Ficha Tecnica/
  Datos ERP/
  Tarifas y Costes/
```

Esto permite separar:

- imagenes de uso comercial
- documentacion tecnica
- extractos o excels vinculados al ERP
- tarifas o costes si se decide archivarlos documentalmente

### Nombres recomendados

Categorias:

- `Iluminacion`
- `Sonido`
- `Video`
- `Estructuras`
- `Montaje`
- `Mantenimiento`
- `Consultoria`

Carpetas individuales:

- `{SKU} - {NOMBRE}`

Ejemplos:

- `LED-000245 - Panel Led 600x600`
- `SRV-000018 - Montaje de Pantalla Led`
- `PACK-00007 - Escenario Basico`

Excels resumen:

- `Resumen Categoria - Iluminacion.xlsx`
- `Resumen Categoria - Sonido.xlsx`
- `Resumen Global Productos y Servicios.xlsx`

Archivos individuales recomendados:

- `LED-000245 - Panel Led 600x600 - Ficha Tecnica.pdf`
- `LED-000245 - Panel Led 600x600 - Datos ERP.xlsx`
- `SRV-000018 - Montaje de Pantalla Led - Ficha Comercial.pdf`
- `PACK-00007 - Escenario Basico - Resumen.xlsx`

### Vistas recomendadas

1. `Productos por categoria`
2. `Servicios por categoria`
3. `Packs`
4. `Resumenes por categoria`
5. `Resumen global`
6. `Items con ficha tecnica`
7. `Items con datos ERP`

## Tickets y Gastos dentro de Compras

Objetivo:

- guardar tickets, justificantes y gastos rapidos
- facilitar revisiones mensuales
- mantener acceso por tecnico o socio si hace falta

### Estructura propuesta

```text
Compras/
  Tickets y Gastos/
    Por Mes/
      {year}/
        {month}/
          Dietas/
          Gasolina/
          Material/
          Parking/
          Transporte/
          Alojamiento/
          Otros/
    Por Beneficiario/
      {USUARIO_O_SOCIO}/
        {year}/
          {month}/
    Por Proyecto/
      {year}/
        {PROJECT_NUMBER} - {PROJECT_NAME}/
```

### Regla de duplicidad

- una ruta principal por mes y categoria
- una ruta espejo por beneficiario
- opcionalmente una ruta espejo por proyecto

### Nombres de archivo recomendados

- `T-26-000024 - Gasolina - Alex Burgues - 2026-02-25.pdf`
- `T-26-000025 - Parking - Proyecto 000018 - 2026-02-25.pdf`

### Vistas recomendadas

1. `Tickets del mes actual`
2. `Tickets por beneficiario`
3. `Tickets por proyecto`
4. `Tickets pendientes de revision`
5. `Tickets sin categoria`

## Cierres y Gestoria dentro de Contabilidad

Objetivo:

- concentrar la documentacion ya preparada para gestor
- separar el trabajo fiscal del archivo documental diario

### Estructura propuesta

```text
Contabilidad/
  {year}/
    Cierres y Gestoria/
      Mensual/
        {month}/
          01_Facturas_Venta/
          02_Facturas_Compra/
          03_Tickets/
          04_Resumen_IVA/
          05_Resumen_IRPF/
          06_Extractos_y_Apoyos/
          07_PyG_y_Cierres/
      Trimestral/
        {quarter}/
          01_Modelo_303/
          02_Modelo_111/
          03_Resumen_Ventas/
          04_Resumen_Compras/
          05_Documentacion_Soporte/
```

### Regla de navegacion

- esta biblioteca debe ser la entrada natural del gestor cuando el cierre ya este preparado
- no debe requerir navegar por todo el site si el cierre ya esta generado

### Vistas recomendadas

1. `Mes actual`
2. `Ultimo cierre mensual`
3. `Trimestre actual`
4. `Pendiente de enviar a gestor`
5. `Enviado a gestor`

## Biblioteca 7: Plantillas y Documentos Maestros

Objetivo:

- separar claramente plantillas vivas de documentos emitidos

### Estructura propuesta

```text
Plantillas y Documentos Maestros/
  Facturas/
    Plantilla_Vigente/
    Historico_Plantillas/
  Presupuestos/
    Plantilla_Vigente/
    Historico_Plantillas/
  Textos_Legales/
  Logos_y_Identidad/
  Datos_Bancarios/
```

Regla:

- nunca mezclar esto con documentos emitidos

## Biblioteca 8: Importaciones y OCR

Objetivo:

- aislar documentos pendientes de clasificar
- evitar que borradores OCR contaminen el archivo oficial

### Estructura propuesta

```text
Importaciones y OCR/
  Entrada_Scanner/
  Pendiente_Revision/
  Duplicados_Detectados/
  Rechazados/
  Procesados/
```

Regla:

- un archivo solo pasa a bibliotecas finales cuando ya existe documento ERP asociado

## Metadatos recomendados en SharePoint

Aunque exista estructura por carpetas, conviene usar columnas de metadatos:

- `TipoDocumento`
- `SerieDocumento`
- `NumeroDocumento`
- `FechaDocumento`
- `AnoFiscal`
- `MesFiscal`
- `Cliente`
- `Proveedor`
- `Proyecto`
- `CategoriaGasto`
- `EstadoERP`
- `DocumentoERPId`
- `HashPDF`
- `OrigenERP`
- `EmitidoPor`
- `ArchivadoPor`
- `ArchivadoEn`

## Columnas de biblioteca para SharePoint

Esta seccion define las columnas recomendadas para poder trabajar la integracion de forma operativa en SharePoint y desde backend.

Reglas:

- los nombres deben crearse con formato simple y estable
- evitar espacios, acentos y caracteres especiales en el nombre interno
- el nombre visible puede ser mas natural, pero el nombre interno debe mantenerse estable
- si una columna ya existe, no renombrar el nombre interno

### Columnas ya confirmadas en `Ventas`

Estas columnas ya han sido verificadas en SharePoint y se pueden usar desde Graph:

- `DocumentoERPId`
- `TipoDocumento`
- `Cliente`
- `Proyecto`
- `MesFiscal`
- `EstadoERP`
- `HashPDF`

Columna pendiente detectada:

- `HashRegistro`

### Propuesta de columnas por biblioteca

#### Ventas

| Nombre visible | Nombre interno recomendado | Tipo SharePoint | Estado |
| --- | --- | --- | --- |
| Documento ERP | `DocumentoERPId` | Single line of text | Confirmada |
| Tipo de documento | `TipoDocumento` | Choice | Confirmada |
| Cliente | `Cliente` | Single line of text | Confirmada |
| Proyecto | `Proyecto` | Single line of text | Confirmada |
| Mes fiscal | `MesFiscal` | Single line of text | Confirmada |
| Estado ERP | `EstadoERP` | Choice | Confirmada |
| Hash PDF | `HashPDF` | Single line of text | Confirmada |
| Hash Registro | `HashRegistro` | Single line of text | Pendiente |
| Ano fiscal | `AnoFiscal` | Number | Recomendada |
| Numero documento | `NumeroDocumento` | Single line of text | Recomendada |
| Fecha documento | `FechaDocumento` | Date and Time | Recomendada |
| Archivado por | `ArchivadoPor` | Single line of text | Recomendada |
| Archivado en | `ArchivadoEn` | Date and Time | Recomendada |
| SharePoint Item Id | `SharepointItemId` | Single line of text | Recomendada |
| SharePoint ETag | `SharepointETag` | Single line of text | Recomendada |

#### Compras

| Nombre visible | Nombre interno recomendado | Tipo SharePoint | Estado |
| --- | --- | --- | --- |
| Documento ERP | `DocumentoERPId` | Single line of text | Recomendada |
| Tipo de documento | `TipoDocumento` | Choice | Recomendada |
| Proveedor | `Proveedor` | Single line of text | Recomendada |
| Cliente imputado | `Cliente` | Single line of text | Opcional |
| Proyecto imputado | `Proyecto` | Single line of text | Opcional |
| Mes fiscal | `MesFiscal` | Single line of text | Recomendada |
| Ano fiscal | `AnoFiscal` | Number | Recomendada |
| Estado ERP | `EstadoERP` | Choice | Recomendada |
| Hash PDF | `HashPDF` | Single line of text | Recomendada |
| Hash Registro | `HashRegistro` | Single line of text | Recomendada |
| Numero documento | `NumeroDocumento` | Single line of text | Recomendada |
| Fecha documento | `FechaDocumento` | Date and Time | Recomendada |
| Archivado por | `ArchivadoPor` | Single line of text | Recomendada |
| Archivado en | `ArchivadoEn` | Date and Time | Recomendada |

#### Clientes

| Nombre visible | Nombre interno recomendado | Tipo SharePoint | Estado |
| --- | --- | --- | --- |
| Documento ERP | `DocumentoERPId` | Single line of text | Recomendada |
| Tipo de documento | `TipoDocumento` | Choice | Recomendada |
| Cliente | `Cliente` | Single line of text | Recomendada |
| Proyecto | `Proyecto` | Single line of text | Recomendada |
| Mes fiscal | `MesFiscal` | Single line of text | Recomendada |
| Ano fiscal | `AnoFiscal` | Number | Recomendada |
| Estado ERP | `EstadoERP` | Choice | Recomendada |
| Hash PDF | `HashPDF` | Single line of text | Recomendada |
| Hash Registro | `HashRegistro` | Single line of text | Recomendada |
| Numero documento | `NumeroDocumento` | Single line of text | Recomendada |
| Fecha documento | `FechaDocumento` | Date and Time | Recomendada |

#### Contabilidad

| Nombre visible | Nombre interno recomendado | Tipo SharePoint | Estado |
| --- | --- | --- | --- |
| Tipo de documento | `TipoDocumento` | Choice | Recomendada |
| Ano fiscal | `AnoFiscal` | Number | Recomendada |
| Mes fiscal | `MesFiscal` | Single line of text | Recomendada |
| Fecha generacion | `FechaGeneracion` | Date and Time | Recomendada |
| Generado por | `GeneradoPor` | Single line of text | Recomendada |
| Estado ERP | `EstadoERP` | Choice | Recomendada |
| Documento ERP | `DocumentoERPId` | Single line of text | Opcional |
| Hash PDF | `HashPDF` | Single line of text | Opcional |
| Hash Registro | `HashRegistro` | Single line of text | Opcional |

#### Recursos Humanos

| Nombre visible | Nombre interno recomendado | Tipo SharePoint | Estado |
| --- | --- | --- | --- |
| Tipo de documento | `TipoDocumento` | Choice | Recomendada |
| Tipo de persona | `TipoPersona` | Choice | Recomendada |
| Persona | `Persona` | Single line of text | Recomendada |
| Nombre | `Nombre` | Single line of text | Recomendada |
| Apellidos | `Apellidos` | Single line of text | Recomendada |
| Documento identidad | `DocumentoIdentidad` | Single line of text | Recomendada |
| Ano fiscal | `AnoFiscal` | Number | Recomendada |
| Mes fiscal | `MesFiscal` | Single line of text | Opcional |
| Fecha documento | `FechaDocumento` | Date and Time | Recomendada |
| Fecha inicio | `FechaInicio` | Date and Time | Opcional |
| Fecha fin | `FechaFin` | Date and Time | Opcional |
| Departamento | `Departamento` | Choice | Recomendada |
| Cargo | `Cargo` | Single line of text | Recomendada |
| Tipo contrato | `TipoContrato` | Choice | Recomendada |
| Estado ERP | `EstadoERP` | Choice | Opcional |
| Documento ERP | `DocumentoERPId` | Single line of text | Opcional |
| Hash PDF | `HashPDF` | Single line of text | Recomendada |
| Confidencialidad | `Confidencialidad` | Choice | Recomendada |
| Archivado por | `ArchivadoPor` | Single line of text | Recomendada |
| Archivado en | `ArchivadoEn` | Date and Time | Recomendada |

#### Productos y Servicios

| Nombre visible | Nombre interno recomendado | Tipo SharePoint | Estado |
| --- | --- | --- | --- |
| Tipo catalogo | `TipoCatalogo` | Choice | Recomendada |
| Categoria | `Categoria` | Single line of text | Recomendada |
| Subcategoria | `Subcategoria` | Single line of text | Opcional |
| SKU | `SKU` | Single line of text | Recomendada |
| Codigo pack | `CodigoPack` | Single line of text | Opcional |
| Nombre item | `NombreItem` | Single line of text | Recomendada |
| Familia documental | `FamiliaDocumental` | Choice | Recomendada |
| Tipo de documento | `TipoDocumento` | Choice | Recomendada |
| Unidad de negocio | `UnidadNegocio` | Single line of text | Opcional |
| Estado catalogo | `EstadoCatalogo` | Choice | Recomendada |
| Estado ERP | `EstadoERP` | Choice | Opcional |
| Documento ERP | `DocumentoERPId` | Single line of text | Opcional |
| Fecha documento | `FechaDocumento` | Date and Time | Opcional |
| Fecha actualizacion | `FechaActualizacion` | Date and Time | Recomendada |
| Version documento | `VersionDocumento` | Single line of text | Opcional |
| Hash PDF | `HashPDF` | Single line of text | Opcional |
| Hash Registro | `HashRegistro` | Single line of text | Opcional |

#### Tickets y Gastos dentro de Compras

| Nombre visible | Nombre interno recomendado | Tipo SharePoint | Estado |
| --- | --- | --- | --- |
| Documento ERP | `DocumentoERPId` | Single line of text | Recomendada |
| Tipo de documento | `TipoDocumento` | Choice | Recomendada |
| Categoria gasto | `CategoriaGasto` | Choice | Recomendada |
| Beneficiario | `Beneficiario` | Single line of text | Recomendada |
| Proyecto | `Proyecto` | Single line of text | Opcional |
| Mes fiscal | `MesFiscal` | Single line of text | Recomendada |
| Ano fiscal | `AnoFiscal` | Number | Recomendada |
| Estado ERP | `EstadoERP` | Choice | Recomendada |
| Hash PDF | `HashPDF` | Single line of text | Recomendada |
| Hash Registro | `HashRegistro` | Single line of text | Recomendada |
| Numero documento | `NumeroDocumento` | Single line of text | Recomendada |
| Fecha documento | `FechaDocumento` | Date and Time | Recomendada |

#### Cierres y Gestoria dentro de Contabilidad

| Nombre visible | Nombre interno recomendado | Tipo SharePoint | Estado |
| --- | --- | --- | --- |
| Tipo de documento | `TipoDocumento` | Choice | Recomendada |
| Ano fiscal | `AnoFiscal` | Number | Recomendada |
| Mes fiscal | `MesFiscal` | Single line of text | Recomendada |
| Periodo fiscal | `PeriodoFiscal` | Single line of text | Recomendada |
| Estado entrega gestor | `EstadoEntregaGestor` | Choice | Recomendada |
| Fecha generacion | `FechaGeneracion` | Date and Time | Recomendada |
| Generado por | `GeneradoPor` | Single line of text | Recomendada |

### Columnas minimas que conviene crear ya

Si quieres avanzar sin sobrecargar SharePoint desde el inicio, estas son las columnas minimas recomendadas:

- `DocumentoERPId`
- `TipoDocumento`
- `Cliente`
- `Proveedor`
- `Proyecto`
- `MesFiscal`
- `AnoFiscal`
- `EstadoERP`
- `NumeroDocumento`
- `FechaDocumento`
- `HashPDF`
- `HashRegistro`
- `ArchivadoPor`
- `ArchivadoEn`

Para `Recursos Humanos`, añadir desde el inicio tambien:

- `TipoPersona`
- `Persona`
- `Departamento`
- `Cargo`
- `TipoContrato`
- `Confidencialidad`

Para `Productos y Servicios`, añadir desde el inicio tambien:

- `TipoCatalogo`
- `Categoria`
- `SKU`

## Valores recomendados para columnas Choice

Esta seccion fija que columnas son de tipo `Choice` y que valores conviene cargar en SharePoint.

Reglas:

- si una columna aparece aqui, debe crearse como `Choice`
- el resto de columnas documentadas como `Single line of text`, `Number` o `Date and Time` deben mantenerse con ese tipo
- salvo necesidad clara, usar `dropDownMenu`
- evitar cambiar opciones ya utilizadas en produccion; si hace falta, anadir nuevas y migrar despues

### Ventas

- `TipoDocumento`:
  - `Factura`
  - `Presupuesto`
  - `Factura Rectificativa`
  - `Abono`
- `EstadoERP`:
  - `Draft`
  - `Emitida`
  - `Pagada`
  - `Parcialmente Pagada`
  - `Vencida`
  - `Anulada`

### Compras

- `TipoDocumento`:
  - `Factura Compra`
  - `Factura Proforma`
  - `Ticket`
  - `Recibo`
  - `Gasto`
  - `Nota de Abono`
- `EstadoERP`:
  - `Pendiente`
  - `Pendiente Validacion`
  - `Validada`
  - `Pagada`
  - `Parcialmente Pagada`
  - `Anulada`

### Clientes

- `TipoDocumento`:
  - `Factura`
  - `Presupuesto`
  - `Gasto`
  - `Contrato`
  - `Anexo`
  - `Otro`
- `EstadoERP`:
  - `Draft`
  - `Emitida`
  - `Aceptado`
  - `Rechazado`
  - `Pagada`
  - `Anulada`

### Contabilidad

- `TipoDocumento`:
  - `Asiento`
  - `Mayor`
  - `Balance`
  - `PyG`
  - `Libro Diario`
  - `Libro IVA`
  - `Resumen IRPF`
  - `Cierre Mensual`
  - `Cierre Trimestral`
  - `Cierre Anual`
  - `Otro`
- `EstadoERP`:
  - `Borrador`
  - `Generado`
  - `Revisado`
  - `Cerrado`
  - `Enviado`

### Recursos Humanos

- `TipoDocumento`:
  - `Nomina`
  - `Contrato`
  - `Anexo de Contrato`
  - `Certificado IRPF`
  - `Resumen Retribuciones`
  - `Certificado de Empresa`
  - `Alta Seguridad Social`
  - `Baja Seguridad Social`
  - `Variacion Seguridad Social`
  - `Vacaciones`
  - `Ausencia`
  - `Baja Medica`
  - `Acuerdo Societario`
  - `Retribucion Socio`
  - `Otro`
- `TipoPersona`:
  - `Empleado`
  - `Socio`
- `Departamento`:
  - `Administracion`
  - `Direccion`
  - `Comercial`
  - `Tecnico`
  - `Operaciones`
  - `Otro`
- `TipoContrato`:
  - `Indefinido`
  - `Temporal`
  - `Formacion`
  - `Mercantil`
  - `Societario`
  - `Otro`
- `EstadoERP`:
  - `Activo`
  - `Inactivo`
  - `Baja`
  - `Archivado`
- `Confidencialidad`:
  - `Alta`
  - `Muy Alta`

### Productos y Servicios

- `TipoCatalogo`:
  - `Producto`
  - `Servicio`
  - `Pack`
- `FamiliaDocumental`:
  - `Imagen`
  - `Ficha Comercial`
  - `Ficha Tecnica`
  - `Datos ERP`
  - `Excel Resumen`
  - `Tarifa`
  - `Coste`
  - `Otro`
- `TipoDocumento`:
  - `Ficha Tecnica`
  - `Ficha Comercial`
  - `Imagen`
  - `Excel Resumen`
  - `Hoja de Datos`
  - `Tarifa`
  - `Coste`
  - `Documento Maestro`
  - `Otro`
- `EstadoCatalogo`:
  - `Activo`
  - `En Revision`
  - `Descatalogado`
  - `Archivado`
- `EstadoERP`:
  - `Activo`
  - `Inactivo`
  - `Archivado`

### Tickets y Gastos dentro de Compras

- `TipoDocumento`:
  - `Ticket`
  - `Factura Simplificada`
  - `Recibo`
  - `Justificante`
  - `Gasto`
- `CategoriaGasto`:
  - `Dietas`
  - `Gasolina`
  - `Material`
  - `Parking`
  - `Transporte`
  - `Alojamiento`
  - `Peajes`
  - `Representacion`
  - `Otros`
- `EstadoERP`:
  - `Pendiente`
  - `Pendiente Revision`
  - `Validado`
  - `Pagado`
  - `Anulado`

### Cierres y Gestoria dentro de Contabilidad

- `TipoDocumento`:
  - `Facturas Venta`
  - `Facturas Compra`
  - `Tickets`
  - `Resumen IVA`
  - `Resumen IRPF`
  - `Extractos y Apoyos`
  - `PyG y Cierres`
  - `Modelo 303`
  - `Modelo 111`
  - `Resumen Ventas`
  - `Resumen Compras`
  - `Documentacion Soporte`
- `EstadoEntregaGestor`:
  - `Pendiente`
  - `En Preparacion`
  - `Preparado`
  - `Enviado`
  - `Validado`

## Matriz de alineacion ERP DB vs SharePoint

Esta seccion fija como deben mapearse los datos reales del ERP a las columnas documentales de SharePoint.

Principio:

- SharePoint no debe inventar estados ni nombres que no puedan reconstruirse desde DB
- cuando la DB tenga un modelo legacy o hibrido, SharePoint debe usar un valor derivado y estable
- si un dato no existe persistido en DB, debe marcarse como `gap` antes de automatizar archivado masivo

### Hallazgos principales de alineacion

1. `Ventas`
   - la DB sigue usando `sales.invoices.status` como campo hibrido legacy
   - el frontend ya trabaja con separacion conceptual `doc_status`, `payment_status` e `is_overdue`
   - conclusion: `EstadoERP` en SharePoint no debe copiar el `status` raw sin mapear
2. `Presupuestos`
   - el enum real de DB es `quotes.quote_status`
   - valores reales detectados en repo: `DRAFT`, `SENT`, `APPROVED`, `REJECTED`, `EXPIRED`, `INVOICED`
   - conclusion: las opciones de SharePoint deben seguir este conjunto y no una variante libre
3. `Compras`
   - `sales.purchase_invoices.status` sigue siendo legacy e hibrido
   - el frontend ya normaliza a `PENDING_VALIDATION`, `APPROVED`, `CANCELLED` mas estado de pago derivado
   - conclusion: `EstadoERP` de SharePoint debe usar el estado normalizado y no necesariamente el valor raw persistido
4. `Catalogo`
   - aqui si existe soporte real en DB para documentos externos y SharePoint
   - `catalog.product_documents` ya guarda `provider`, `sharepoint_item_id`, `sharepoint_drive_id`, `sharepoint_site_id`, `file_url`, `file_name`
   - conclusion: `Productos y Servicios` es hoy la parte mas preparada para integracion documental completa
5. `RRHH / Nominas`
   - existen `internal.employees`, `internal.partners`, `accounting.payroll_runs`, `accounting.partner_compensation_runs` y `accounting.payroll_payments`
   - no existe todavia un bloque documental SharePoint persistido equivalente
   - conclusion: la biblioteca puede existir ya, pero la sincronizacion backend necesitara nuevas columnas/tablas de enlace

### Mapeo recomendado por biblioteca

#### Ventas

| SharePoint | Origen ERP recomendado | Regla |
| --- | --- | --- |
| `DocumentoERPId` | `sales.invoices.id` | Guardar UUID real del documento |
| `NumeroDocumento` | `sales.invoices.invoice_number` | Si no existe y esta en borrador, usar `preliminary_number` solo en borradores |
| `Cliente` | `crm.clients.company_name` | Resolver por `client_id` |
| `Proyecto` | `projects.projects.project_number` + `project_name` | Formato visible estable |
| `MesFiscal` | `issue_date` | Derivar `YYYY-MM` |
| `AnoFiscal` | `issue_date` | Derivar `YYYY` |
| `FechaDocumento` | `issue_date` | Fecha oficial del documento emitido |
| `EstadoERP` | derivado de `sales.invoices.status` | Mapear a conjunto SharePoint estable |
| `HashPDF` | no existe persistido hoy | Gap |
| `HashRegistro` | no existe persistido hoy | Gap |
| `SharepointItemId` | no existe persistido hoy | Gap |
| `SharepointETag` | no existe persistido hoy | Gap |

Mapeo recomendado de `sales.invoices.status` a `Ventas.EstadoERP`:

- `DRAFT` o `PENDING_ISSUE` -> `Draft`
- `ISSUED` -> `Emitida`
- `PARTIAL` -> `Parcialmente Pagada`
- `PAID` -> `Pagada`
- `OVERDUE` -> `Vencida`
- `CANCELLED` o `RECTIFIED` -> `Anulada`

Nota:

- este mapeo sigue la logica de [salesInvoiceStatuses.ts](/C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/constants/salesInvoiceStatuses.ts)
- a medio plazo conviene que la DB exponga `doc_status` y `payment_status` por separado

#### Presupuestos en Ventas o Clientes

| SharePoint | Origen ERP recomendado | Regla |
| --- | --- | --- |
| `DocumentoERPId` | `quotes.quotes.id` | UUID real |
| `NumeroDocumento` | `quotes.quotes.quote_number` | Numero oficial del presupuesto |
| `Cliente` | `crm.clients.company_name` | Resolver por `client_id` |
| `Proyecto` | `projects.projects.project_number` + `project_name` | Si existe `project_id` |
| `FechaDocumento` | `created_at` o fecha de envio | Definir criterio final |
| `MesFiscal` | fecha elegida para archivado | Recomendado: fecha de envio o `created_at` si no hay otra |
| `AnoFiscal` | fecha elegida para archivado | Derivado |
| `EstadoERP` | `quotes.quotes.status` | Copia normalizada |

Mapeo recomendado de `quotes.quotes.status` a `EstadoERP`:

- `DRAFT` -> `Draft`
- `SENT` -> `Enviado`
- `APPROVED` -> `Aceptado`
- `REJECTED` -> `Rechazado`
- `EXPIRED` -> `Vencido`
- `INVOICED` -> `Facturado`

#### Compras

| SharePoint | Origen ERP recomendado | Regla |
| --- | --- | --- |
| `DocumentoERPId` | `sales.purchase_invoices.id` | UUID real |
| `NumeroDocumento` | `internal_purchase_number` o `invoice_number` | Priorizar numero interno definitivo |
| `Proveedor` | `internal.suppliers.company_name` o `internal.technicians.company_name` o `manual_beneficiary_name` | Resolver `provider_name` normalizado |
| `Cliente` | `client_id -> crm.clients.company_name` | Solo si existe imputacion |
| `Proyecto` | `project_id -> projects.projects` | Solo si existe imputacion |
| `MesFiscal` | `issue_date` | Derivar `YYYY-MM` |
| `AnoFiscal` | `issue_date` | Derivar `YYYY` |
| `FechaDocumento` | `issue_date` | Fecha fiscal |
| `TipoDocumento` | `document_type` | Mapear `INVOICE`, `TICKET`, `EXPENSE` |
| `EstadoERP` | derivado de `sales.purchase_invoices.status` | No usar raw sin mapear |
| `HashPDF` | no existe persistido hoy | Gap |
| `HashRegistro` | no existe persistido hoy | Gap |

Mapeo recomendado de `sales.purchase_invoices.status` a `Compras.EstadoERP`:

- `DRAFT`, `PENDING`, `SCANNED`, `PENDING_VALIDATION` -> `Pendiente Validacion`
- `REGISTERED`, `APPROVED` -> `Validada`
- `PARTIAL` -> `Parcialmente Pagada`
- `PAID` -> `Pagada`
- `CANCELLED`, `BLOCKED` -> `Anulada`

Mapeo recomendado de `sales.purchase_invoices.document_type` a `Compras.TipoDocumento`:

- `INVOICE` -> `Factura Compra`
- `TICKET` -> `Ticket`
- `EXPENSE` -> `Gasto`

#### Clientes

| SharePoint | Origen ERP recomendado | Regla |
| --- | --- | --- |
| `Cliente` | `crm.clients.company_name` | Nombre visible |
| `DocumentoERPId` | depende del documento | Factura, presupuesto o gasto |
| `TipoDocumento` | depende del modulo origen | Factura, Presupuesto, Gasto, Contrato |
| `Proyecto` | `projects.projects.project_number` + `project_name` | Siempre que exista |
| `MesFiscal` | fecha documental principal | Derivado |
| `AnoFiscal` | fecha documental principal | Derivado |
| `EstadoERP` | segun origen | Usar mapping del modulo de origen |

Nota:

- `Clientes` es una vista documental cruzada
- no necesita inventar un estado propio, solo reutilizar el del documento origen

#### Contabilidad

| SharePoint | Origen ERP recomendado | Regla |
| --- | --- | --- |
| `AnoFiscal` | `year` o `entry_date` | Segun documento |
| `MesFiscal` | `month` o `entry_date` | Derivado |
| `FechaGeneracion` | `generated_at` o `created_at` | Segun reporte |
| `GeneradoPor` | `generated_by` / `created_by` | Nombre o UUID |
| `EstadoERP` | segun tabla origen | Por ejemplo `accounting.monthly_reports.status` |
| `HashPDF` | `accounting.monthly_reports.pdf_hash` | Ya existe en informes mensuales |

Caso ya alineado:

- `accounting.monthly_reports` ya tiene `storage_path`, `pdf_hash`, `generated_at`, `generated_by` y `status`
- esta tabla es buena candidata para enlazar el futuro `Resumen PyG` y cierres en SharePoint

#### Recursos Humanos

| SharePoint | Origen ERP recomendado | Regla |
| --- | --- | --- |
| `TipoPersona` | tabla origen | `Empleado` o `Socio` |
| `Persona` | `internal.employees.full_name` o `internal.partners.full_name` | Nombre visible |
| `DocumentoIdentidad` | `tax_id` | NIF/CIF/NIE segun caso |
| `AnoFiscal` | `period_year` | Nominas y retribuciones |
| `MesFiscal` | `period_month` | Convertir a `YYYY-MM` |
| `FechaDocumento` | fecha de generacion o pago | Definir criterio final |
| `TipoDocumento` | tabla origen | Nomina, Retribucion, Pago, Certificado |
| `EstadoERP` | `accounting.payroll_runs.status` o `accounting.partner_compensation_runs.status` | Normalizado |

Mapeo recomendado de estados de nomina/retribucion a `EstadoERP`:

- `DRAFT` -> `Borrador`
- `POSTED` -> `Confirmada`
- `PAID` -> `Pagada`
- `CANCELLED` -> `Cancelada`

Gap actual:

- no existe todavia una tabla documental tipo `payroll_documents` con `sharepoint_item_id`, `hash_pdf` o equivalente

#### Productos y Servicios

| SharePoint | Origen ERP recomendado | Regla |
| --- | --- | --- |
| `TipoCatalogo` | `catalog.products.product_type` | `PRODUCT`, `SERVICE`, `BUNDLE` |
| `Categoria` | `catalog.categories.name` | Resolver por `category_id` |
| `SKU` | `catalog.products.sku` | Identificador principal |
| `NombreItem` | `catalog.products.name` | Nombre visible |
| `EstadoCatalogo` | `catalog.products.is_active` | Derivar `Activo` / `Archivado` |
| `DocumentoERPId` | `catalog.products.id` o `catalog.product_documents.id` | Segun nivel documental |
| `FechaActualizacion` | `catalog.products.updated_at` o `catalog.product_documents.created_at` | Segun caso |

Mapeo recomendado de `catalog.products.product_type` a `TipoCatalogo`:

- `PRODUCT` -> `Producto`
- `SERVICE` -> `Servicio`
- `BUNDLE` -> `Pack`

Caso ya alineado:

- `catalog.product_documents` ya soporta `provider`, `sharepoint_item_id`, `sharepoint_drive_id`, `sharepoint_site_id`, `file_url` y `file_name`

### Gaps de persistencia que hay que resolver antes del archivado masivo

1. `Ventas`
   - faltan campos persistidos de archivo final SharePoint en DB
   - minimo recomendado:
     - `archived_pdf_provider`
     - `sharepoint_item_id`
     - `sharepoint_drive_id`
     - `sharepoint_site_id`
     - `sharepoint_web_url`
     - `sharepoint_etag`
     - `archived_pdf_hash`
     - `archived_pdf_generated_at`
2. `Presupuestos`
   - mismo gap que en ventas
3. `Compras`
   - hoy existe `file_path` y `file_name`, pero no identificadores SharePoint ni hash
4. `RRHH`
   - falta capa documental persistida completa
5. `HashRegistro`
   - no existe aun como dato persistido en DB ni como columna creada en SharePoint

### Decision operativa recomendada

Hasta que la DB se alinee mejor, el backend debe trabajar asi:

1. leer datos del ERP
2. normalizar estados a un vocabulario SharePoint cerrado
3. derivar `AnoFiscal`, `MesFiscal` y `FechaDocumento`
4. subir PDF o archivo final
5. guardar de vuelta en DB los identificadores SharePoint y hashes

No se recomienda:

- copiar estados raw de DB a SharePoint sin mapping
- lanzar archivado masivo antes de crear campos persistidos de enlace
- usar la URL final del PDF como unico dato sin `item_id` y `etag`
- `NombreItem`

## Metadatos obligatorios por tipo documental

### Ventas

- `TipoDocumento`
- `NumeroDocumento`
- `FechaDocumento`
- `Cliente`
- `MesFiscal`
- `AnoFiscal`
- `DocumentoERPId`
- `HashPDF`

### Compras

- `TipoDocumento`
- `NumeroDocumento`
- `FechaDocumento`
- `Proveedor`
- `MesFiscal`
- `AnoFiscal`
- `DocumentoERPId`
- `HashPDF`

### Clientes

- `TipoDocumento`
- `Cliente`
- `Proyecto`
- `FechaDocumento`
- `DocumentoERPId`
- `HashPDF`

### Contabilidad

- `TipoDocumento`
- `AnoFiscal`
- `MesFiscal`
- `FechaGeneracion`
- `GeneradoPor`

### Recursos Humanos

- `TipoDocumento`
- `Persona`
- `TipoPersona`
- `AnoFiscal`
- `MesFiscal` cuando aplique
- `DocumentoERPId` si existe relacion en ERP
- `EstadoERP` cuando aplique

### Productos y Servicios

- `TipoCatalogo`
- `Categoria`
- `SKU`
- `NombreItem`
- `TipoDocumento`
- `FechaDocumento` cuando aplique

### Tickets

- `TipoDocumento`
- `NumeroDocumento`
- `FechaDocumento`
- `CategoriaGasto`
- `Beneficiario`
- `MesFiscal`
- `AnoFiscal`
- `DocumentoERPId`
- `HashPDF`

### Cierres y Gestoria dentro de Contabilidad

- `TipoDocumento`
- `PeriodoFiscal`
- `AnoFiscal`
- `MesFiscal` o `Trimestre`
- `EstadoEntregaGestor`
- `FechaGeneracion`
- `GeneradoPor`

## Reglas operativas por documento

### Factura de venta emitida

- se genera PDF final
- se archiva en `Ventas/Facturas Emitidas/{year}/{month}`
- se replica en `Clientes/{cliente}/{proyecto}/Facturas` si aplica
- el ERP debe abrir siempre ese PDF archivado

### Presupuesto emitido

- se genera PDF final de presupuesto
- se archiva en `Ventas/Presupuestos Emitidos/{year}/{month}`
- se replica en `Clientes/{cliente}/{proyecto}/Presupuestos` si aplica

### Factura de compra

- el PDF subido o documento aprobado se archiva en `Compras/{year}/{month}`
- se replica en `Compras/Proveedores/{provider}/{month}`
- se replica en `Clientes/{cliente}/{proyecto}/Gastos` si el gasto esta imputado a proyecto o cliente

### Ticket

- el PDF o imagen origen se archiva en `Compras/Tickets y Gastos`
- se replica en `Por Mes`, `Por Beneficiario` y `Por Proyecto` si aplica

### Documento contable

- se archiva en `Contabilidad/{year}/{month}`
- el resumen anual se actualiza en `Contabilidad/{year}/Resumen_PyG_{year}.xlsx`
- ese resumen debe venir del ERP de forma automatica

### Cierre y gestor

- la documentacion de cierre y gestor se archiva dentro de `Contabilidad/{year}/Cierres y Gestoria`
- no se mantiene como biblioteca separada

### Documento de recursos humanos

- se archiva en `Recursos Humanos/Empleados/{persona}` o `Recursos Humanos/Socios/{persona}`
- las nominas deben quedar en la subcarpeta anual correspondiente
- los certificados e IRPF deben quedar en su subcarpeta especifica
- la documentacion personal no debe guardarse en `Contabilidad`

### Documento de productos y servicios

- se archiva en `Productos y Servicios`
- la navegacion principal debe ser por categoria
- los packs deben archivarse en rama propia
- las imagenes, fichas y excels resumen deben quedar agrupados por categoria o item

## Estructura optima para navegacion diaria

Si hay que elegir una sola logica principal por biblioteca, la recomendacion es:

- `Ventas`: principal por mes
- `Compras`: principal por mes
- `Clientes`: principal por cliente y proyecto
- `Contabilidad`: principal por ejercicio y mes
- `Recursos Humanos`: principal por persona y ano
- `Productos y Servicios`: principal por categoria
- `Tickets y Gastos`: subestructura dentro de `Compras`, principal por mes
- `Cierres y Gestoria`: subestructura dentro de `Contabilidad`, principal por periodo fiscal

Motivo:

- ventas se dejan optimizadas para gestor y revision mensual
- compras se dejan optimizadas para control fiscal mensual sin perder acceso por proveedor
- clientes concentra la navegacion comercial y documental por relacion real
- contabilidad debe leerse por ejercicio y cierre
- recursos humanos debe leerse por persona, tipo de documento y ejercicio
- productos y servicios debe leerse por categoria y por item
- tickets se trabajan mas por cierres mensuales
- gestoria siempre trabaja por periodo

## Estructura de carpetas recomendada para 2026

```text
ERP NEXO AV - Archivo Documental/
  Ventas/
    Facturas Emitidas/
      2026/
        2026-01/
        2026-02/
    Presupuestos Emitidos/
      2026/
        2026-01/
        2026-02/
  Compras/
    2026/
      2026-01/
      2026-02/
    Proveedores/
      TELEFONICA DE ESPANA SAU/
        2026-01/
        2026-02/
  Clientes/
    SOFT CONTROLS/
      PRJ-2026-000007 - AQSYZRYWV/
        Facturas/
        Presupuestos/
        Gastos/
  Contabilidad/
    2026/
      Resumen_PyG_2026.xlsx
      2026-01/
      2026-02/
      Cierres y Gestoria/
        Mensual/
          2026-01/
          2026-02/
  Recursos Humanos/
    Empleados/
      Alex Burgues/
        Expediente/
        Nominas/
          2026/
        IRPF y Certificados/
    Socios/
      Socio 01/
        Expediente/
        Nominas o Retribuciones/
          2026/
        IRPF y Certificados/
  Productos y Servicios/
    Productos/
      Por Categoria/
        Iluminacion/
          Imagenes/
          Fichas/
          Excels/
          Individual/
    Servicios/
      Por Categoria/
        Montaje/
          Imagenes/
          Fichas/
          Excels/
          Individual/
    Packs/
      Imagenes/
      Fichas/
      Excels/
      Individual/
  Compras/
    Tickets y Gastos/
      Por Mes/
        2026/
          2026-02/
            Gasolina/
            Parking/
            Material/
      Por Beneficiario/
        Alex Burgues/
          2026/
            2026-02/
      Por Proyecto/
        2026/
          000018 - EIKONOS - MA 3 - Meeting Vox/
  Contabilidad/
    2026/
      Cierres y Gestoria/
        Mensual/
          2026-01/
          2026-02/
        Trimestral/
          2026-T1/
  Plantillas y Documentos Maestros/
  Importaciones y OCR/
```

## Ventajas de esta estructura

- acceso rapido para gestor por mes en ventas, compras y contabilidad
- acceso operativo por cliente y proyecto en una biblioteca separada
- separacion clara de documentacion laboral y societaria sensible
- orden claro del catalogo de productos, servicios y packs
- trabajo comodo para administracion
- trabajo comodo para gestor
- separacion clara entre documento emitido y plantilla
- facilidad para preparar IVA, IRPF y cierres
- facilita auditoria y localizacion de soporte documental

## Estructura de permisos recomendada

No conviene romper herencia en exceso por carpeta. Mejor pocos grupos bien definidos.

Grupos recomendados:

1. `ERP-Administracion`
   - lectura y escritura en Ventas, Compras, Clientes, Contabilidad y Recursos Humanos
2. `ERP-Direccion`
   - lectura global
3. `ERP-Comercial`
   - lectura en Clientes y Ventas
4. `ERP-Tecnicos`
   - lectura limitada en Tickets/Gastos propios o compartidos segun politica
5. `ERP-RRHH`
   - lectura y escritura en `Recursos Humanos`
6. `ERP-Gestoria`
   - lectura en `Ventas`, `Compras` y `Contabilidad`

## Recomendaciones de experiencia de usuario

1. Evitar mas de 4 niveles profundos de navegacion visibles para el usuario medio.
2. Priorizar vistas por metadatos sobre carpetas extremadamente profundas.
3. Poner nombres de carpetas y vistas en castellano natural.
4. Mantener numeracion de carpetas de gestor para que el orden visual sea estable.
5. Anadir una pagina `Ayuda de uso` con reglas de busqueda por biblioteca.

## Criterios para considerar la estructura buena

La estructura sera buena si cumple esto:

1. Una factura de venta se encuentra de forma inmediata por mes en `Ventas`.
2. Un documento de cliente se encuentra por cliente y proyecto en `Clientes`.
3. Una factura de compra se encuentra por mes o proveedor.
4. Contabilidad se puede revisar por ejercicio y mes, con Excel anual actualizado.
5. La documentacion de empleados y socios se encuentra por persona y por ano en `Recursos Humanos`.
6. Un ticket se encuentra por mes o beneficiario dentro de `Compras/Tickets y Gastos`.
7. El gestor puede trabajar desde `Ventas`, `Compras` y `Contabilidad`.
8. El usuario medio no necesita saber el ID interno del ERP.
9. Un PDF emitido no cambia aunque cambie la plantilla o el maestro de productos.

## Riesgos si no se gobierna bien

- duplicidades no controladas
- archivos huerfanos sin referencia ERP
- versiones distintas del mismo documento
- sobrecarga de mantenimiento si no se automatiza
- divergencia entre resumen contable Excel y PyG real del ERP

## Reglas de gobierno recomendadas

1. No subir manualmente documentos emitidos a carpetas finales fuera del ERP.
2. Toda copia espejo debe conservar el mismo `DocumentoERPId` y `HashPDF`.
3. La version visible en ERP debe ser la misma que la archivada.
4. Si hay rectificativa, nunca se sobreescribe el documento anterior.
5. Los documentos OCR pendientes no deben entrar en bibliotecas finales.
6. El `Resumen_PyG_{year}.xlsx` debe ser generado o actualizado automaticamente desde ERP.

## Decisiones ya fijadas para la siguiente fase

1. `Ventas` queda solo ordenada por mes.
2. `Clientes` sera la biblioteca de navegacion por cliente y proyecto.
3. `Compras` queda ordenada por mes con espejo por proveedor.
4. `Tickets y Gastos` queda dentro de `Compras`.
5. `Contabilidad` queda ordenada por ejercicio y mes, e incluye `Cierres y Gestoria`.
6. `Recursos Humanos` sera la biblioteca de expedientes, nominas y documentacion de socios.
7. Dentro de cada ejercicio en `Contabilidad` existira un Excel anual automatico de resumen PyG.

## Convencion oficial de nombres

Esta convencion se adopta como criterio base para SharePoint. Debe prevalecer sobre nombres improvisados o variantes locales.

### Criterios generales

- usar nombres claros y profesionales en castellano natural
- evitar siglas internas no evidentes para usuarios de administracion o gestoria
- evitar caracteres especiales innecesarios
- usar capitalizacion consistente en bibliotecas y carpetas principales
- usar formato `YYYY-MM` para meses
- usar nombres de cliente, proveedor y proyecto limpios y legibles

### Bibliotecas

Los nombres oficiales recomendados son:

- `Ventas`
- `Compras`
- `Clientes`
- `Contabilidad`
- `Recursos Humanos`
- `Plantillas y Documentos Maestros`
- `Importaciones y OCR`

### Carpetas principales por biblioteca

En `Ventas`:

- `Facturas Emitidas`
- `Presupuestos Emitidos`

En `Compras`:

- `{AÑO}`
- `Proveedores`

En `Clientes`:

- `{CLIENTE}`
- `{PROYECTO}`
- `Facturas`
- `Presupuestos`
- `Gastos`

En `Contabilidad`:

- `{AÑO}`
- `Resumen PyG {AÑO}.xlsx`
- `{AÑO}-{MES}`
- `Cierres y Gestoria`
- `Mensual`
- `Trimestral`

En `Recursos Humanos`:

- `Empleados`
- `Socios`
- `Expediente`
- `Nominas`
- `Contratos`
- `IRPF y Certificados`
- `Seguridad Social`
- `Vacaciones y Ausencias`
- `Otros Documentos`
- `Modelos y Plantillas`
- `Reportes`

En `Compras/Tickets y Gastos`:

- `Por Mes`
- `Por Beneficiario`
- `Por Proyecto`

### Formato oficial para anos y meses

- año: `2026`
- mes: `2026-01`
- trimestre: `2026-T1`

### Formato oficial para clientes

Regla recomendada:

- usar nombre fiscal o comercial limpio
- quitar ruido tipografico innecesario
- mantener lectura natural

Ejemplos:

- `Soft Controls`
- `Canon Bcn 22`
- `Telefonica de Espana Sau`

### Formato oficial para proveedores

Regla recomendada:

- usar nombre fiscal limpio
- mantener sufijos societarios si ayudan a identificar

Ejemplos:

- `Telefonica de Espana Sau`
- `Renom Gestions Iniciatives Sl`

### Formato oficial para proyectos

Formato recomendado corto:

- `{CODIGO_PROYECTO} - {NOMBRE_CORTO}`

Formato recomendado ampliado cuando haga falta mas contexto:

- `{CODIGO_PROYECTO} - {NOMBRE_CORTO} - {CLIENTE}`

Ejemplos:

- `PRJ-2026-000007 - AQSYZRYWV`
- `PRJ-2026-000007 - AQSYZRYWV - Soft Controls`

### Formato oficial para nombres de archivo

Facturas de venta:

- `{NUMERO_FACTURA} - {CLIENTE} - {FECHA}.pdf`

Ejemplo:

- `F-26-000001 - Soft Controls - 2026-01-02.pdf`

Presupuestos:

- `{NUMERO_PRESUPUESTO} - {CLIENTE} - {FECHA}.pdf`

Ejemplo:

- `P-26-000041 - Soft Controls - 2026-02-22.pdf`

Facturas de compra:

- `{NUMERO_INTERNO_COMPRA} - {PROVEEDOR} - {FECHA}.pdf`

Ejemplo:

- `C-26-000046 - Telefonica de Espana Sau - 2026-03-01.pdf`

Tickets:

- `{NUMERO_TICKET} - {CATEGORIA} - {BENEFICIARIO} - {FECHA}.pdf`

Ejemplo:

- `T-26-000024 - Gasolina - Alex Burgues - 2026-02-25.pdf`

Resumen contable anual:

- `Resumen PyG {AÑO}.xlsx`

Ejemplo:

- `Resumen PyG 2026.xlsx`

### Estructura de nombres recomendada por biblioteca

Ventas:

- `Ventas/Facturas Emitidas/{AÑO}/{AÑO-MES}`
- `Ventas/Presupuestos Emitidos/{AÑO}/{AÑO-MES}`

Compras:

- `Compras/{AÑO}/{AÑO-MES}`
- `Compras/Proveedores/{PROVEEDOR}/{AÑO-MES}`
- `Compras/Tickets y Gastos/Por Mes/{AÑO}/{AÑO-MES}`

Clientes:

- `Clientes/{CLIENTE}/{PROYECTO}/Facturas`
- `Clientes/{CLIENTE}/{PROYECTO}/Presupuestos`
- `Clientes/{CLIENTE}/{PROYECTO}/Gastos`

Contabilidad:

- `Contabilidad/{AÑO}/Resumen PyG {AÑO}.xlsx`
- `Contabilidad/{AÑO}/{AÑO-MES}`
- `Contabilidad/{AÑO}/Cierres y Gestoria/Mensual/{AÑO-MES}`
- `Contabilidad/{AÑO}/Cierres y Gestoria/Trimestral/{AÑO}-T{N}`

Recursos Humanos:

- `Recursos Humanos/Empleados/{PERSONA}/Nominas/{AÑO}`
- `Recursos Humanos/Empleados/{PERSONA}/Expediente`
- `Recursos Humanos/Socios/{PERSONA}/Nominas o Retribuciones/{AÑO}`
- `Recursos Humanos/Socios/{PERSONA}/Expediente`

### Regla final de estilo

Si hubiera duda entre dos nombres posibles, elegir siempre el que cumpla mejor esto:

1. que un usuario no tecnico lo entienda sin explicacion
2. que el gestor lo pueda localizar rapidamente por periodo
3. que administracion lo pueda leer sin conocer el ID interno del ERP
4. que el nombre siga siendo estable con el paso del tiempo

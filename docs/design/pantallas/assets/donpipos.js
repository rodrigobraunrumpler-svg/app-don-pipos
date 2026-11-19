/* Maqueta de la app de Don Pipos: datos de ejemplo, pantallas y lo que pasa al tocarlas.
   Todo vive en esta página: no guarda nada ni se conecta a ningún servidor. */
(function () {
  "use strict";

  /* ---------- Íconos extra (Lucide «house» y el logo de WhatsApp) ---------- */
  const sprite = document.querySelector("body > svg");
  if (sprite) {
    sprite.insertAdjacentHTML(
      "beforeend",
      '<symbol id="i-house" viewBox="0 0 24 24"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></symbol>' +
        '<symbol id="i-whatsapp" viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3z"/><path fill="currentColor" stroke="none" d="M9.3 8.4c.2-.3.4-.4.7-.4h.5c.2 0 .4.2.5.4l.7 1.7c.1.2 0 .5-.1.6l-.6.7a6.5 6.5 0 0 0 2.9 2.9l.7-.6c.2-.2.4-.2.6-.1l1.7.7c.2.1.4.3.4.5v.6c0 .3-.2.6-.4.8-.6.4-1.3.6-2 .4a8.3 8.3 0 0 1-5.6-5.6c-.2-.7 0-1.4.4-2z"/></symbol>',
    );
  }

  /* ---------- Utilidades ---------- */
  const fmt = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
  const sol = (centimos) => fmt.format(centimos / 100);
  const ic = (nombre, clase) => `<svg class="i${clase ? " " + clase : ""}" aria-hidden="true"><use href="#i-${nombre}"/></svg>`;
  const num = (n) => "#" + String(n).padStart(4, "0");
  const plural = (nombre) => (nombre.includes(" ") ? nombre : nombre + "s");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Datos de ejemplo (alfajores y precios reales) ---------- */
  const PRODUCTOS = [
    { id: "coqueta", nombre: "Coqueta", precio: 1200, foto: "img/coqueta.jpg", stock: 13, minimo: 6, semana: 5, finde: 9 },
    { id: "morenita", nombre: "Morenita", precio: 1200, inicial: "M", tono: "cacao", stock: 4, minimo: 6, semana: 4, finde: 7 },
    { id: "limon", nombre: "Limon Kiss", precio: 1200, foto: "img/limon-kiss.jpg", stock: 0, minimo: 5, semana: 3, finde: 6 },
    { id: "manteadita", nombre: "Manteadita", precio: 1200, foto: "img/manteadita.jpg", stock: 21, minimo: 6, semana: 4, finde: 6 },
    { id: "pipo", nombre: "Pipo Crush", precio: 1300, inicial: "P", tono: "oliva", stock: -2, minimo: 4, semana: 2, finde: 4 },
  ];
  const P = Object.fromEntries(PRODUCTOS.map((p) => [p.id, p]));
  const ENVIO = 500; // costo del delivery de ejemplo: el real lo define el dueño en Ajustes
  // Desde mañana (jueves): s = lunes a viernes, f = sábado o domingo
  const PATRON = ["s", "s", "f", "f", "s", "s", "s"];
  const DIAS = ["mañana", "el viernes", "el sábado", "el domingo", "el lunes", "el martes", "el miércoles"];

  const ESTADOS = {
    nuevo: { t: "Nuevo", i: "sparkles" },
    preparando: { t: "Preparando", i: "chef-hat" },
    camino: { t: "En camino", i: "motorbike" },
    listo: { t: "Listo para recoger", i: "shopping-bag" },
    entregado: { t: "Entregado", i: "check-check" },
    anulado: { t: "Anulado", i: "circle-x" },
  };
  const STOCK = {
    ok: { t: "Alcanza", i: "circle-check" },
    poco: { t: "Poco", i: "triangle-alert" },
    agotado: { t: "Agotado", i: "package-x" },
    revisar: { t: "Revisar", i: "circle-alert" },
  };
  const METODOS = { yape: "Yape", plin: "Plin", transferencia: "Transferencia", efectivo: "Efectivo" };
  const VISTAS = {
    datos: "Con datos",
    cargando: "Cargando",
    vacio: "Sin datos",
    error: "Error",
    sininternet: "Sin internet",
    pausa: "Servidor en pausa",
    borrador: "Borrador recuperado",
    mostrador: "Venta en el mostrador",
    sinhistorial: "Sin historial",
    sincostos: "Sin costos",
    apagada: "Fidelidad apagada",
    actualizando: "Actualizando",
    fallo: "Falla al guardar",
    espera: "Espera de 15 min",
    primeravez: "Primera vez",
    cuadra: "Cuadra",
    falta: "Falta dinero",
    conpin: "Con PIN",
    pinmal: "PIN incorrecto",
    bloqueado: "Bloqueado",
  };

  const S = {
    pedidos: [
      { n: 37, cliente: "Jorge P.", tipo: "delivery", ayer: true, items: { coqueta: 3, manteadita: 1 }, total: 5300, estado: "entregado", pagos: [{ m: "efectivo", c: 2900, ayer: true }] },
      { n: 39, cliente: null, tipo: "mostrador", items: { coqueta: 2, manteadita: 1 }, total: 3600, estado: "entregado", pagos: [{ m: "efectivo", c: 3600 }] },
      { n: 40, cliente: "Lucía R.", tipo: "delivery", items: { morenita: 3, pipo: 2 }, total: 6700, estado: "entregado", pagos: [{ m: "yape", c: 6700 }] },
      { n: 41, cliente: "Carlos M.", tipo: "recoge", items: { limon: 4 }, total: 4800, estado: "entregado", pagos: [{ m: "plin", c: 4800 }] },
      { n: 42, cliente: "Ana Q.", tipo: "delivery", items: { coqueta: 2, pipo: 1 }, total: 4200, estado: "camino", pagos: [], historial: [["nuevo", "10:40"], ["preparando", "10:52"], ["camino", "11:20"]] },
      { n: 43, cliente: null, tipo: "mostrador", items: { manteadita: 1 }, total: 1200, estado: "entregado", pagos: [{ m: "efectivo", c: 1200 }] },
      { n: 44, cliente: "Miguel A.", tipo: "recoge", hora: "11:30", items: { manteadita: 6 }, total: 6600, estado: "preparando", pagos: [{ m: "yape", c: 3000 }] },
      { n: 45, cliente: "Patricia V.", tipo: "recoge", items: { coqueta: 8, morenita: 8, manteadita: 8 }, total: 28800, estado: "nuevo", programado: "Jueves 19, 10:00", pagos: [{ m: "transferencia", c: 15000, ayer: true }] },
    ],
    borrador: nuevoBorrador({ coqueta: 2, pipo: 1 }),
    siguiente: 46,
    envio: ENVIO,
    diasProduccion: 7,
    deshacer: {},
    menuNuevo: null,
    conteo: null,
    guardado: null,
    produccion: {},
    produccionHecha: null,
    porque: "coqueta",
    detalle: "coqueta",
    merma: null,
    toast: {},
    movimientos: {
      coqueta: [
        { t: "Hoy 10:40", d: "Venta #0042, Ana Q.", c: -2, tipo: "venta" },
        { t: "Hoy 08:55", d: "Venta #0039, mostrador", c: -2, tipo: "venta" },
        { t: "Hoy 08:10", d: "Merma: rota", c: -1, tipo: "merma" },
        { t: "Ayer 17:30", d: "Producción", c: 20, tipo: "produccion" },
        { t: "Ayer 16:05", d: "Venta #0036, Jorge P.", c: -3, tipo: "venta" },
      ],
      morenita: [
        { t: "Hoy 09:30", d: "Venta #0040, Lucía R.", c: -3, tipo: "venta" },
        { t: "Ayer 17:30", d: "Producción", c: 12, tipo: "produccion" },
      ],
      limon: [
        { t: "Hoy 10:05", d: "Venta #0041, Carlos M.", c: -4, tipo: "venta" },
        { t: "Lunes 18:00", d: "Producción", c: 15, tipo: "produccion" },
      ],
      manteadita: [
        { t: "Hoy 11:30", d: "Venta #0044, Miguel A.", c: -6, tipo: "venta" },
        { t: "Hoy 11:15", d: "Venta #0043, mostrador", c: -1, tipo: "venta" },
        { t: "Ayer 17:30", d: "Producción", c: 18, tipo: "produccion" },
      ],
      pipo: [
        { t: "Hoy 10:40", d: "Venta #0042, Ana Q.", c: -1, tipo: "venta" },
        { t: "Hoy 09:30", d: "Venta #0040, Lucía R.", c: -2, tipo: "venta" },
      ],
    },
  };

  function nuevoBorrador(items) {
    return {
      items: { ...items },
      entrega: "delivery",
      hora: "13:00",
      cuando: "hoy",
      sinCliente: false,
      descuentoAbierto: false,
      descuento: 0,
      motivo: null,
      pago: "yape",
      pagaAhora: "recibir",
      parte: 2000,
      guardadoComo: null,
    };
  }

  /* ---------- Cuentas ---------- */
  const estadoStock = (p) => (p.stock < 0 ? "revisar" : p.stock === 0 ? "agotado" : p.stock < p.minimo ? "poco" : "ok");
  const demanda = (p, d) => (PATRON[d] === "f" ? p.finde : p.semana);
  function alcance(p) {
    let resto = p.stock;
    let dias = 0;
    while (dias < 7 && resto >= demanda(p, dias)) {
      resto -= demanda(p, dias);
      dias++;
    }
    return dias;
  }
  function lineaStock(p) {
    const e = estadoStock(p);
    if (e === "revisar") return `${-p.stock} vendidos de más: toca para ajustar`;
    if (e === "agotado") return "Sin stock";
    const d = alcance(p);
    if (d === 0) return "No alcanza para mañana";
    if (d >= 7) return "Alcanza para más de una semana";
    return "Alcanza hasta " + DIAS[d - 1];
  }
  const semanal = (p) => Array.from({ length: S.diasProduccion }, (_, d) => demanda(p, d % 7)).reduce((a, x) => a + x, 0);
  const periodoTitulo = () => (S.diasProduccion === 7 ? "Esta semana" : `Para los próximos ${S.diasProduccion} días`);
  const periodoFrase = () => (S.diasProduccion === 7 ? "en la semana" : `en los próximos ${S.diasProduccion} días`);
  const periodoAlDia = () => (S.diasProduccion === 7 ? "esta semana" : `los próximos ${S.diasProduccion} días`);
  const sugerido = (p) => Math.max(0, semanal(p) + p.minimo - p.stock);
  const totalSugerido = () => PRODUCTOS.reduce((a, p) => a + sugerido(p), 0);
  const aProducir = (p) => (p.id in S.produccion ? S.produccion[p.id] : sugerido(p));

  const lineas = (items) =>
    Object.entries(items)
      .filter(([, n]) => n > 0)
      .map(([id, n]) => ({ p: P[id], n }));
  const unidades = (items) => lineas(items).reduce((a, l) => a + l.n, 0);
  const subtotal = (items) => lineas(items).reduce((a, l) => a + l.n * l.p.precio, 0);
  function detalleTexto(items) {
    const ls = lineas(items).map((l) => `${l.n} ${l.n === 1 ? l.p.nombre : plural(l.p.nombre)}`);
    return ls.length > 1 ? ls.slice(0, -1).join(", ") + " y " + ls[ls.length - 1] : ls[0] || "";
  }
  function totales(b) {
    const sub = subtotal(b.items);
    const envio = b.entrega === "delivery" ? S.envio : 0;
    const desc = Math.min(b.descuento || 0, sub + envio);
    return { sub, envio, desc, total: sub + envio - desc };
  }
  const pagado = (pedido) => pedido.pagos.reduce((a, x) => a + x.c, 0);
  const pendiente = (pedido) => Math.max(0, pedido.total - pagado(pedido));
  const clienteDe = (b) => (b.entrega === "mostrador" && b.sinCliente ? null : "Sofía L.");

  /* ---------- Piezas ---------- */
  const ficha = (p, tam) =>
    p.foto
      ? `<span class="ficha${tam ? " " + tam : ""}"><img src="${p.foto}" alt=""></span>`
      : `<span class="ficha ficha-${p.tono}${tam ? " " + tam : ""}" aria-hidden="true">${p.inicial}</span>`;
  const chipEstado = (e) => `<span class="estado e-${e}">${ic(ESTADOS[e].i)}${ESTADOS[e].t}</span>`;
  const chipStock = (e) => `<span class="estado e-${e}">${ic(STOCK[e].i)}${STOCK[e].t}</span>`;
  const barra = (sinRed) =>
    `<div class="barra-estado"><span>11:40</span><span class="sb">${ic(sinRed ? "wifi-off" : "wifi")}<i class="senal"></i><i class="bateria"><b></b></i></span></div>`;
  const DESTINO_TAB = { inicio: "inicio", pedidos: "pedidos", stock: "stock", mas: "ajustes" };
  function tabs(activa) {
    const t = [
      ["inicio", "house", "Inicio"],
      ["pedidos", "clipboard-list", "Pedidos"],
      ["nuevo"],
      ["stock", "package", "Stock"],
      ["mas", "layout-grid", "Más"],
    ];
    return `<nav class="tabs" aria-label="Secciones de la app">${t
      .map(([k, i, txt]) =>
        k === "nuevo"
          ? `<button class="tab-nuevo" data-accion="menu-nuevo" aria-label="Anotar algo nuevo" aria-haspopup="dialog">${ic("plus")}</button>`
          : `<button class="tab${k === activa ? " activa" : ""}"${k === activa ? ' aria-current="page"' : ` data-accion="ir" data-a="${DESTINO_TAB[k]}"`}>${ic(i)}<span>${txt}</span></button>`,
      )
      .join("")}</nav>`;
  }
  const AHORA = "11:40"; // la hora de la maqueta, la misma de la barra del celular
  const minutos = (h) => h.split(":").reduce((a, x) => a * 60 + Number(x), 0);
  function demora(p) {
    if (!p.hora || p.programado || p.ayer || p.dia) return 0;
    const hecho = p.tipo === "recoge" ? ["listo", "entregado", "anulado"] : ["entregado", "anulado"];
    return hecho.includes(p.estado) ? 0 : Math.max(0, minutos(AHORA) - minutos(p.hora));
  }
  // Fila de pedido, la misma en Inicio y en Pedidos: quién, qué pidió y cuánto, con su estado y lo que falta cobrar
  function tipoCorto(p) {
    if (p.tipo === "delivery") return `${ic("motorbike")}<span>Delivery</span>`;
    if (p.tipo === "recoge") return `${ic("shopping-bag")}<span>Recoge ${p.programado || p.hora || "13:00"}</span>`;
    return `${ic("store")}<span>Mostrador</span>`;
  }
  function filaPedido(p, terminado) {
    const falta = pendiente(p);
    const cobro =
      p.estado === "anulado"
        ? `<span class="ped-cobro">Anulado</span>`
        : falta === 0
          ? `<span class="ped-cobro pagado">Pagado</span>`
          : `<span class="ped-cobro">${pagado(p) > 0 ? "Falta" : "Cobrar"} ${sol(falta)}</span>`;
    const que = lineas(p.items)
      .map((l) => `${l.n} ${l.n === 1 ? l.p.nombre : plural(l.p.nombre)}`)
      .join(", ");
    const dia = p.ayer ? ", ayer" : p.dia ? ", " + p.dia.toLowerCase() : "";
    const tarde = demora(p);
    return `<li><button class="pedido pedido-btn${terminado ? " terminado" : ""}${tarde ? " demorado" : ""}" data-accion="ver-pedido" data-n="${p.n}"><span class="ped-izq"><span class="ped-linea"><span class="ped-num">${num(p.n)}${dia}</span><span class="ped-det">${tipoCorto(p)}</span></span><span class="ped-cli"><span>${p.cliente || "Cliente de mostrador"}</span>${tarde ? `<span class="tarde">${tarde} min tarde</span>` : ""}</span><span class="ped-que">${que}</span></span><span class="ped-der">${chipEstado(p.estado)}<span class="ped-total">${sol(p.total)}</span>${cobro}</span></button></li>`;
  }
  const marco = (sinRed, contenido, pie) =>
    `${barra(sinRed)}<div class="contenido${sinRed ? " sin-red" : ""}">${contenido}</div>${pie || ""}`;
  const esqTarjeta = (alto) => `<span class="esq esq-tarjeta" style="--h:${alto}px"></span>`;
  const esqFilas = (n, circulo = true) =>
    `<div class="esq-filas">${Array.from(
      { length: n },
      (_, i) =>
        `<div class="esq-fila">${circulo ? '<span class="esq esq-circ"></span>' : ""}<span class="esq-lineas"><span class="esq" style="--w:${[62, 48, 70, 55, 66][i % 5]}%"></span><span class="esq" style="--w:${[38, 30, 44, 34, 40][i % 5]}%;--h:11px"></span></span><span class="esq" style="--w:54px;--h:18px"></span></div>`,
    ).join("")}</div>`;
  const tirar = () => `<div class="tirar" role="status"><span class="girando" aria-hidden="true"></span>Actualizando…</div>`;
  const esqueleto = (medidas) =>
    `<div class="esqueleto">${medidas.map(([w, h]) => `<span style="--w:${w}%;--h:${h}px"></span>`).join("")}</div>`;
  const avisoRed = (texto) => `<div class="aviso aviso-red">${ic("wifi-off")}<p>${texto}</p></div>`;
  const pantallaError = (que) =>
    `<div class="vacio">${ic("circle-alert", "grande")}<h2>No se pudo cargar ${que}</h2><p>Revisa tu conexión y vuelve a intentar. Si sigue igual, escribe a soporte.</p><button class="btn btn-primario" data-accion="toast" data-msg="Volviendo a intentar…">${ic("refresh-cw")}Reintentar</button></div>`;
  const pantallaPausa = () =>
    `<div class="vacio">${ic("cloud-off", "grande")}<h2>El servidor está en pausa</h2><p>La app no puede traer tus datos porque el servidor se pausó por falta de uso o está en mantenimiento. Tus datos están a salvo.</p><button class="btn btn-primario" data-accion="toast" data-msg="Se abriría WhatsApp con soporte">${ic("whatsapp")}Escribir a soporte</button><button class="btn btn-texto" data-accion="toast" data-msg="Volviendo a intentar…">${ic("refresh-cw")}Reintentar</button></div>`;
  const cabeceraInicio = () =>
    `<div class="cabecera"><span class="logo"><img src="img/logo.png" alt="">Don Pipos</span><button class="btn-icono" aria-label="Avisos" data-accion="toast" data-msg="Morenita se está acabando">${ic("bell")}<i class="punto"></i></button></div>`;
  function cabForm(titulo, sub, destino) {
    return `<div class="cab-form"><button class="btn-icono" aria-label="Volver"${destino ? ` data-accion="ir" data-a="${destino}"` : ""}>${ic("arrow-left")}</button><div><h1>${titulo}</h1><p>${sub}</p></div></div>`;
  }
  function stepper(id, n, accionMenos, accionMas, nombre, minimo) {
    return `<div class="stepper" role="group" aria-label="Cantidad de ${nombre}"><button data-accion="${accionMenos}" data-id="${id}" aria-label="${n === 1 && !minimo ? "Quitar" : "Quitar uno"}: ${nombre}"${minimo && n <= 0 ? " disabled" : ""}>${ic(n === 1 && !minimo ? "trash-2" : "minus")}</button><output>${n}</output><button data-accion="${accionMas}" data-id="${id}" aria-label="Agregar uno: ${nombre}">${ic("plus")}</button></div>`;
  }

  const ULTIMO_SOFIA = { limon: 2, manteadita: 2 };
  function extrasCliente(b) {
    const DPx = window.DonPipos;
    const firma = (items) => JSON.stringify(lineas(items).map((l) => [l.p.id, l.n]));
    const repetido = firma(b.items) === firma(ULTIMO_SOFIA);
    const repetir = `<div class="sugerido-cliente">${ic("history")}<span>Su último pedido (jueves 12): ${detalleTexto(ULTIMO_SOFIA)}</span>${
      repetido ? `<small>Repetido</small>` : `<button class="link" data-accion="repetir">Repetir</button>`
    }</div>`;
    if (!DPx || !DPx.premioListo || !DPx.premioListo("Sofía L.")) return repetir;
    const aplicado = b.motivo === "Fidelidad" && b.descuento > 0;
    return (
      repetir +
      `<div class="premio">${ic("star")}<span><b>${aplicado ? "Premio aplicado" : "Sofía tiene su premio listo"}</b><small>${
        aplicado ? `${DPx.premioTexto()}: −${sol(b.descuento)}` : `${DPx.premioTexto()}, por completar su tarjeta de sellos`
      }</small></span>${
        aplicado
          ? `<button class="link" data-accion="quitar-premio">Quitar</button>`
          : `<button class="btn btn-primario btn-chico" data-accion="aplicar-premio">Aplicar</button>`
      }</div>`
    );
  }
  const hojaNuevo = () =>
    `<button class="velo" data-accion="cerrar-menu-nuevo" aria-label="Cerrar"></button><div class="hoja" role="dialog" aria-label="Anotar algo nuevo"><span class="asa"></span><h2>¿Qué quieres anotar?</h2><div class="menu-nuevo">${[
      ["pedido1", "clipboard-list", "Un pedido", "Lo que lleva, la entrega y el pago"],
      ["venta", "store", "Una venta de mostrador", "Sin cliente: eliges y cobras en un toque"],
      ["gasto", "receipt", "Un gasto", "El monto, el tipo y la foto de la boleta"],
      ["produccion", "package-check", "La producción", "Lo que hiciste hoy"],
    ]
      .map(([a, i, t, d]) => `<button data-accion="nuevo-ir" data-a="${a}">${ic(i)}<span><b>${t}</b><small>${d}</small></span>${ic("chevron-right")}</button>`)
      .join("")}</div></div>`;
  function hojaConteo() {
    const c = S.conteo;
    const cambios = c.ids.filter((id) => c.valores[id] !== P[id].stock).length;
    const filas = c.ids
      .map((id) => {
        const p = P[id];
        const v = c.valores[id];
        const dif = v - p.stock;
        return `<li class="conteo-fila">${ficha(p, "mini")}<span class="conteo-info"><b>${p.nombre}</b><small>Registrado: ${p.stock}</small></span><span class="conteo-dif${
          dif > 0 ? " mas" : dif < 0 ? " menos" : ""
        }">${dif === 0 ? "Igual" : (dif > 0 ? "+" : "−") + Math.abs(dif)}</span>${stepper(id, v, "conteo-menos", "conteo-mas", p.nombre, true)}</li>`;
      })
      .join("");
    return `<button class="velo" data-accion="cerrar-conteo" aria-label="Cerrar"></button><div class="hoja" role="dialog" aria-label="Contar stock"><span class="asa"></span><h2>Contar stock</h2><p class="hoja-sub">Pon lo que hay de verdad. La diferencia queda anotada como ajuste.</p><ul class="conteo">${filas}</ul><button class="btn btn-primario ancho" data-accion="guardar-conteo"${
      cambios ? "" : " disabled"
    }>${cambios ? `Guardar ${cambios} ${cambios === 1 ? "ajuste" : "ajustes"}` : "Sin diferencias"}</button></div>`;
  }

  /* ---------- Pantallas ---------- */
  const PANTALLAS = {
    inicio(v) {
      if (v === "cargando") {
        return marco(false, cabeceraInicio() + esqueleto([[45, 30], [30, 16]]) + esqTarjeta(220) + esqTarjeta(118) + esqFilas(3, false), tabs("inicio"));
      }
      if (v === "error") return marco(false, cabeceraInicio() + pantallaError("el resumen de hoy"), tabs("inicio"));
      if (v === "pausa") return marco(false, cabeceraInicio() + pantallaPausa(), tabs("inicio"));
      const sinRed = v === "sininternet";
      const vacio = v === "vacio";
      const hoy = vacio ? [] : S.pedidos.filter((p) => !p.programado && !p.ayer);
      const cobrosHoy = vacio ? [] : S.pedidos.flatMap((p) => p.pagos.filter((x) => !x.ayer));
      const cobrado = cobrosHoy.reduce((a, x) => a + x.c, 0);
      const porMetodo = Object.keys(METODOS).map((m) => [m, cobrosHoy.filter((x) => x.m === m).reduce((a, x) => a + x.c, 0)]);
      const entregados = hoy.filter((p) => p.estado === "entregado").length;
      const porEntregar = hoy.filter((p) => ["nuevo", "preparando", "camino", "listo"].includes(p.estado));
      const proximos = vacio ? [] : S.pedidos.filter((p) => p.programado);
      const porCobrar = vacio ? 0 : S.pedidos.filter((p) => p.estado !== "anulado").reduce((a, p) => a + pendiente(p), 0);

      const hero = `<section class="hero" aria-label="Lo cobrado hoy">
        <div class="hero-cab"><p class="hero-etq">Cobrado hoy</p>${vacio ? "" : `<button class="hero-link" data-accion="ir" data-a="caja">Cuadrar caja ›</button>`}</div>
        <p class="hero-monto">${sol(cobrado)}</p>
        ${
          vacio
            ? `<p class="hero-vacio">Todavía no hay pedidos hoy. Lo cobrado aparece aquí, separado por medio de pago.</p>`
            : `<div class="medios"><div class="barra-medios" aria-hidden="true">${porMetodo
                .filter(([, c]) => c > 0)
                .map(([m, c]) => `<i class="m-${m}" style="width:${(c / cobrado) * 100}%"></i>`)
                .join("")}</div><ul>${porMetodo
                .filter(([, c]) => c > 0)
                .map(([m, c]) => `<li><i class="punto-m m-${m}"></i>${METODOS[m]}<b>${sol(c)}</b></li>`)
                .join("")}</ul></div>
              <div class="hero-pie"><button data-accion="ver-pedidos" data-v="hoy"><b>${entregados}</b><span>entregados</span></button><button data-accion="ver-pedidos" data-v="entregar"><b>${porEntregar.length}</b><span>por entregar</span></button><button data-accion="ir" data-a="porcobrar"><b>${sol(porCobrar)}</b><span>por cobrar</span></button></div>`
        }
      </section>`;

      // Lo urgente va arriba: primero lo agotado, después lo que hay que revisar y lo que se acaba
      // [orden, ícono, tono, título, detalle, acción]: primero lo que va tarde y lo agotado
      const tarde = vacio
        ? []
        : hoy
            .filter((p) => demora(p) > 0)
            .map((p) => [0, "clock", "u-0", `${num(p.n)} de ${p.cliente || "mostrador"} va ${demora(p)} min tarde`, `${p.tipo === "recoge" ? "Recoge" : "Entrega"} a las ${p.hora}: márcalo o avísale`, `data-accion="ver-pedido" data-n="${p.n}"`]);
      const urgentes = vacio
        ? []
        : tarde
            .concat(
              PRODUCTOS.map((p) => {
                const e = estadoStock(p);
                if (e === "agotado") return [1, "triangle-alert", "u-0", `${p.nombre} está agotado`, "Registrar producción", `data-accion="ir" data-a="produccion"`];
                if (e === "revisar") return [2, "triangle-alert", "u-1", `Revisa el stock de ${p.nombre}`, lineaStock(p), `data-accion="detalle" data-id="${p.id}"`];
                if (e === "poco") return [3, "clock", "u-1", `${p.nombre} ${lineaStock(p).toLowerCase()}`, "Registrar producción", `data-accion="ir" data-a="produccion"`];
                return null;
              }).filter(Boolean),
            )
            .sort((a, b) => a[0] - b[0]);
      const urgente = urgentes.length
        ? `<section class="urgente" aria-label="Para atender">${urgentes
            .map(([, i, tono, t, sub, accion]) => `<button class="urg-fila ${tono}" ${accion}>${ic(i)}<span><b>${t}</b><small>${sub}</small></span>${ic("chevron-right")}</button>`)
            .join("")}</section>`
        : "";
      const bandeja = `<section class="bloque" aria-label="Tu stock">
        <div class="bloque-cab"><h2>Tu stock</h2><button class="link" data-accion="ir" data-a="stock">Ver stock</button></div>
        <ul class="bandeja">${PRODUCTOS.map(
          (p) =>
            `<li><button class="pieza s-${estadoStock(p)}" data-accion="detalle" data-id="${p.id}" aria-label="${p.nombre}: ${p.stock} en stock. Ver detalle">${ficha(p)}<b>${p.stock}</b><span class="nombre">${p.nombre}</span></button></li>`,
        ).join("")}</ul>
      </section>`;

      const total = totalSugerido();
      const sugerencia = `<section class="sugerencia" aria-label="Qué producir">${
        total
          ? `<div class="sug-cab">${ic("cookie")}<div><h2>${periodoTitulo()} conviene hacer ${total} alfajores</h2><p>Según lo que vendes cada día y lo que tienes.</p></div></div>
            <ul class="sug-lista">${PRODUCTOS.filter((p) => sugerido(p) > 0)
              .map((p) => `<li>${ficha(p, "mini")}<span>${p.nombre}</span><b>${sugerido(p)}</b></li>`)
              .join("")}</ul>
            <button class="btn btn-primario ancho" data-accion="ir" data-a="produccion"${sinRed ? " disabled" : ""}>Registrar producción</button>`
          : `<p class="sug-al-dia">${ic("circle-check")}Tu producción está al día para ${periodoAlDia()}.</p>`
      }</section>`;

      const listas = vacio
        ? `<section class="bloque"><div class="vacio-chico">Cuando anotes un pedido, aparece aquí con su estado y lo que falta cobrar.<button class="btn btn-primario ancho" data-accion="ir" data-a="pedido1">${ic("plus")}Anotar un pedido</button></div></section>`
        : `<section class="bloque"><div class="bloque-cab"><h2>Por entregar</h2><span class="cuenta">${porEntregar.length}</span></div><ul class="pedidos">${porEntregar.map((p) => filaPedido(p)).join("")}</ul></section>
           ${proximos.length ? `<section class="bloque"><div class="bloque-cab"><h2>Próximos</h2><span class="cuenta">${proximos.length}</span></div><ul class="pedidos">${proximos.map((p) => filaPedido(p)).join("")}</ul></section>` : ""}`;

      return marco(
        sinRed,
        (v === "actualizando" ? tirar() : "") +
          cabeceraInicio() +
          (sinRed ? avisoRed("Sin conexión. Ves lo último que se cargó, a las 11:32.") : "") +
          `<div class="saludo"><h1>Buenos días</h1><p>Miércoles 18 de noviembre</p></div>` +
          urgente +
          hero +
          bandeja +
          sugerencia +
          listas,
        tabs("inicio"),
      );
    },

    pedido1(v) {
      const b = S.borrador;
      const cab = cabForm("Nuevo pedido", "Paso 1 de 2: qué lleva", "inicio");
      if (v === "cargando") {
        return marco(false, cab + esqFilas(5), `<div class="pie-accion"><div class="pie-total"><span>Cargando alfajores…</span><b>${sol(0)}</b></div><button class="btn btn-primario" disabled>Seguir</button></div>`);
      }
      const sinRed = v === "sininternet";
      const avisos =
        (v === "borrador" ? `<div class="aviso aviso-borrador">${ic("history")}<p>Recuperamos el pedido que dejaste a medias a las 11:32.</p><button class="link" data-accion="vaciar">Empezar de nuevo</button></div>` : "") +
        (sinRed ? avisoRed("Sin conexión. Puedes armar el pedido: queda guardado en el celular hasta que vuelva la señal.") : "");
      const filas = PRODUCTOS.map((p) => {
        const n = b.items[p.id] || 0;
        const e = estadoStock(p);
        const hint =
          e === "agotado"
            ? `<span class="hint hint-agotado">Agotado</span>`
            : e === "revisar"
              ? `<span class="hint hint-agotado">Stock en ${p.stock}</span>`
              : `<span class="hint${e === "poco" ? " hint-poco" : ""}">Quedan ${p.stock}</span>`;
        const control = n
          ? stepper(p.id, n, "menos", "mas", p.nombre)
          : `<button class="agregar" data-accion="mas" data-id="${p.id}" aria-label="Agregar: ${p.nombre}">${ic("plus")}</button>`;
        const aviso =
          n > Math.max(p.stock, 0)
            ? `<li class="prod-aviso">${ic("triangle-alert")}<span>${
                p.stock > 0 ? `Solo quedan ${p.stock}.` : "No hay en stock."
              } Puedes anotarlo igual y ajustar el stock después.</span></li>`
            : "";
        return `<li class="prod">${ficha(p)}<div class="prod-info"><b>${p.nombre}</b><span>${sol(p.precio)}</span>${hint}</div>${control}</li>${aviso}`;
      }).join("");
      const u = unidades(b.items);
      const pie = `<div class="pie-accion"><div class="pie-total"><span>${u ? `${u} ${u === 1 ? "alfajor" : "alfajores"}` : "Elige al menos un alfajor"}</span><b>${sol(subtotal(b.items))}</b></div><button class="btn btn-primario" data-accion="ir" data-a="pedido2"${u ? "" : " disabled"}>Seguir</button></div>`;
      return marco(sinRed, cab + avisos + `<ul class="prods">${filas}</ul>`, pie);
    },

    pedido2(v) {
      const b = S.borrador;
      const cab = cabForm("Entrega y pago", "Paso 2 de 2", "pedido1");
      if (v === "pausa") return marco(false, cab + pantallaPausa());
      const sinRed = v === "sininternet";
      const t = totales(b);
      const mostrador = b.entrega === "mostrador";
      const cliente = clienteDe(b);

      const campoCliente = `<section class="campo"><h3>Cliente</h3>${
        cliente
          ? `<label class="entrada">${ic("phone")}<input value="987 654 321" inputmode="tel" aria-label="Teléfono del cliente" readonly></label>
             <div class="coincide"><span class="avatar">SL</span><div><b>Sofía L.</b><span>3 pedidos, el último hace 6 días</span></div>${ic("circle-check")}</div>
             ${extrasCliente(b)}`
          : `<p class="nota">${ic("store")}<span>Cliente de mostrador: la venta se guarda sin nombre.</span></p>`
      }${
        mostrador
          ? `<div class="chips" style="margin-top:10px"><button class="chip" aria-pressed="${b.sinCliente}" data-accion="sin-cliente">${ic("user-x")}Sin cliente</button></div>`
          : ""
      }</section>`;

      const entregas = [
        ["recoge", "shopping-bag", "Recoge"],
        ["delivery", "motorbike", "Delivery"],
        ["mostrador", "store", "Mostrador"],
      ];
      const detalleEntrega =
        b.entrega === "delivery"
          ? `<label class="entrada">${ic("map-pin")}<input value="Jr. Lima 412" aria-label="Dirección de entrega" readonly></label><p class="nota">${ic("motorbike")}<span>Delivery: ${sol(S.envio)}. El monto lo cambia el dueño en Ajustes.</span></p>`
          : b.entrega === "recoge"
            ? `<div class="chips" style="margin-top:10px">${["En 30 min", "13:00", "Otra hora"]
                .map((h) => `<button class="chip" aria-pressed="${b.hora === h}" data-accion="hora" data-v="${h}">${ic("clock")}${h}</button>`)
                .join("")}</div>`
            : `<p class="nota">${ic("info")}<span>Se guarda como entregado y pagado al momento.</span></p>`;
      const campoEntrega = `<section class="campo"><h3>Entrega</h3><div class="segmentos" role="radiogroup" aria-label="Entrega">${entregas
        .map(([k, i, txt]) => `<button role="radio" aria-checked="${b.entrega === k}" data-accion="entrega" data-v="${k}">${ic(i)}${txt}</button>`)
        .join("")}</div>${detalleEntrega}</section>`;

      const campoCuando = mostrador
        ? ""
        : `<section class="campo"><h3>Cuándo</h3><div class="chips"><button class="chip" aria-pressed="${b.cuando === "hoy"}" data-accion="cuando" data-v="hoy">Hoy</button><button class="chip" aria-pressed="${b.cuando === "otro"}" data-accion="cuando" data-v="otro">${ic("calendar")}Otro día</button></div>${
            b.cuando === "otro"
              ? `<label class="entrada">${ic("calendar-days")}<input value="Jueves 19 de noviembre, 10:00" aria-label="Fecha de entrega" readonly></label><p class="nota">${ic("info")}<span>Aparece en «Próximos» hasta ese día.</span></p>`
              : ""
          }</section>`;

      const campoDescuento = `<section class="campo">${
        b.descuentoAbierto
          ? `<h3>Descuento</h3><label class="entrada">S/<input type="number" min="0" step="0.5" value="${(b.descuento / 100).toFixed(2)}" data-input="descuento" aria-label="Monto del descuento en soles"></label>
             <div class="chips" style="margin-top:10px">${["Caja", "Cliente frecuente", "Fidelidad", "Otro"]
               .map((m) => `<button class="chip" aria-pressed="${b.motivo === m}" data-accion="motivo" data-v="${m}">${m}</button>`)
               .join("")}</div>`
          : `<button class="fila-boton" data-accion="abrir-descuento">${ic("badge-percent")}Agregar descuento</button>`
      }</section>`;

      const pagaAhora = mostrador ? "todo" : b.pagaAhora;
      const opcionesPago = [
        ["todo", "Todo"],
        ["parte", "Una parte"],
        ["recibir", b.entrega === "recoge" ? "Al recoger" : "Al recibir"],
      ];
      const campoPago = `<section class="campo"><h3>Pago</h3><div class="chips">${Object.entries(METODOS)
        .filter(([k]) => !S.mediosActivos || S.mediosActivos[k])
        .map(([k, txt]) => `<button class="chip" aria-pressed="${b.pago === k}" data-accion="pago" data-v="${k}">${txt}</button>`)
        .join("")}</div>${
        mostrador
          ? ""
          : `<h4>Paga ahora</h4><div class="segmentos" role="radiogroup" aria-label="Cuánto paga ahora">${opcionesPago
              .map(([k, txt]) => `<button role="radio" aria-checked="${pagaAhora === k}" data-accion="paga" data-v="${k}">${txt}</button>`)
              .join("")}</div>${
              pagaAhora === "parte"
                ? `<label class="entrada">S/<input type="number" min="0" step="0.5" value="${(b.parte / 100).toFixed(2)}" data-input="parte" aria-label="Monto del adelanto en soles"></label>`
                : ""
            }`
      }</section>`;

      const parte = Math.min(b.parte, t.total);
      const cobro =
        pagaAhora === "todo"
          ? `Pagado ahora con ${METODOS[b.pago]}.`
          : pagaAhora === "parte"
            ? `Adelanto de ${sol(parte)} con ${METODOS[b.pago]}. Falta ${sol(t.total - parte)}.`
            : `Se cobra ${sol(t.total)} ${b.entrega === "recoge" ? "al recoger" : "al recibir"}.`;
      const resumen = `<section class="resumen" aria-label="Resumen"><dl>
        <div><dt>${unidades(b.items)} alfajores</dt><dd>${sol(t.sub)}</dd></div>
        ${t.envio ? `<div><dt>Delivery</dt><dd>${sol(t.envio)}</dd></div>` : ""}
        ${t.desc ? `<div><dt>Descuento${b.motivo ? ` (${b.motivo.toLowerCase()})` : ""}</dt><dd>−${sol(t.desc)}</dd></div>` : ""}
        <div class="total"><dt>Total</dt><dd>${sol(t.total)}</dd></div></dl>
        <p class="cobro">${cobro}</p></section>`;

      const yaGuardado = b.guardadoComo;
      const avisos =
        (sinRed ? avisoRed("Sin conexión. El pedido queda en borrador y lo guardas cuando vuelva la señal.") : "") +
        (v === "error" ? `<div class="aviso aviso-error">${ic("circle-alert")}<p>No se pudo guardar el pedido. Tus datos siguen aquí: vuelve a intentar.</p></div>` : "");
      const pie = yaGuardado
        ? `<div class="pie-accion columna"><button class="btn btn-primario ancho" disabled>${ic("check")}Guardado como ${num(yaGuardado)}</button><button class="btn btn-texto" data-accion="otro">Anotar otro pedido</button></div>`
        : `<div class="pie-accion"><button class="btn btn-primario ancho" data-accion="guardar"${sinRed || !unidades(b.items) ? " disabled" : ""}>${
            v === "error" ? ic("refresh-cw") + "Reintentar" : "Guardar pedido de " + sol(t.total)
          }</button></div>`;
      return marco(sinRed, cab + avisos + campoCliente + campoEntrega + campoCuando + campoDescuento + campoPago + resumen, pie);
    },

    guardado(v) {
      const g = v === "mostrador" ? vistaPrevia({ entrega: "mostrador", sinCliente: true }) : S.guardado || vistaPrevia();
      const mostrador = !g.cliente;
      const nombre = g.cliente ? g.cliente.split(" ")[0] : "";
      const entrega =
        g.entrega === "delivery" ? "delivery" : g.entrega === "recoge" ? "recoge en el local" : "venta en el mostrador";
      const cuando = g.cuando === "otro" ? "el jueves 19" : "hoy";
      const t = g.t;
      const parte = Math.min(g.parte, t.total);
      const estadoCobro =
        g.entrega === "mostrador" || g.pagaAhora === "todo"
          ? `<span class="estado e-entregado">${ic("check")}Pagado con ${METODOS[g.pago]}</span>`
          : g.pagaAhora === "parte"
            ? `<span class="estado e-preparando">${ic("hand-coins")}Falta cobrar ${sol(t.total - parte)}</span>`
            : `<span class="estado e-preparando">${ic("hand-coins")}Se cobra ${sol(t.total)} ${g.entrega === "recoge" ? "al recoger" : "al recibir"}</span>`;
      const pagoTexto =
        g.pagaAhora === "todo"
          ? `Total: ${sol(t.total)}, ya está pagado.`
          : g.pagaAhora === "parte"
            ? `Total: ${sol(t.total)}. Recibimos tu adelanto de ${sol(parte)}; faltan ${sol(t.total - parte)}.`
            : `Total: ${sol(t.total)}.`;
      const despues =
        g.cuando === "otro"
          ? "Lo entregamos el jueves 19 de noviembre, a las 10:00."
          : g.entrega === "recoge"
            ? "Te avisamos cuando esté listo para recoger."
            : "Te avisamos cuando salga.";
      const DPm = window.DonPipos;
      const mensaje =
        DPm && DPm.mensajeGuardado
          ? DPm.mensajeGuardado(g)
          : `Hola ${nombre}, recibimos tu pedido ${num(g.n)}: ${detalleTexto(g.items)}. ${pagoTexto} ${despues} ¡Gracias!`;

      const cuerpo = `<div class="listo-cab"><span class="listo-check">${ic("check")}</span><h1>Pedido ${num(g.n)} guardado</h1><p>${
        mostrador ? "Venta en el mostrador, entregada" : `${g.cliente}, ${entrega} ${cuando}`
      }</p></div>
        <section class="tarjeta" aria-label="Detalle del pedido"><ul>${lineas(g.items)
          .map((l) => `<li><span>${l.n} ${l.n === 1 ? l.p.nombre : plural(l.p.nombre)}</span><span>${sol(l.n * ((g.precios && g.precios[l.p.id]) || l.p.precio))}</span></li>`)
          .join("")}${t.envio ? `<li><span>Delivery</span><span>${sol(t.envio)}</span></li>` : ""}${
        t.desc ? `<li><span>Descuento</span><span>−${sol(t.desc)}</span></li>` : ""
      }<li class="total"><span>Total</span><span>${sol(t.total)}</span></li></ul>${estadoCobro}</section>
        ${
          mostrador
            ? `<p class="nota" style="margin-top:16px">${ic("info")}<span>Venta en el mostrador: el cliente está ahí, no hay a quién avisar.</span></p>`
            : `<section class="whatsapp"><h2>${ic("whatsapp")}Así le llega a ${nombre}</h2><div class="chat"><p class="burbuja">${mensaje}<time>11:41</time></p></div><p class="nota">${ic("pen-line")}<span>El texto del mensaje se cambia en Ajustes.</span></p></section>`
        }`;
      const pie = `<div class="pie-accion columna">${
        mostrador
          ? ""
          : `<button class="btn btn-whatsapp ancho" data-accion="toast" data-msg="Se abriría WhatsApp con este mensaje para ${nombre}">${ic("whatsapp")}Avisar por WhatsApp</button>`
      }<button class="btn ${mostrador ? "btn-primario" : "btn-secundario"} ancho" data-accion="otro">Anotar otro pedido</button></div>`;
      return marco(false, cuerpo, pie);
    },

    stock(v) {
      const cab = `<div class="titulo"><h1>Stock</h1><p>Actualizado a las 11:40</p></div>`;
      const cabAccion = `<div class="titulo-fijo" aria-hidden="true"><span>Stock</span></div><div class="titulo con-accion"><div><h1>Stock</h1><p>Actualizado a las 11:40</p></div><button class="link" data-accion="abrir-conteo" data-donde="stock"${
        v === "sininternet" ? " disabled" : ""
      }>${ic("clipboard-check")}Contar stock</button></div>`;
      if (v === "cargando") return marco(false, cab + esqTarjeta(74) + esqFilas(5), tabs("stock"));
      if (v === "error") return marco(false, cab + pantallaError("el stock"), tabs("stock"));
      if (v === "pausa") return marco(false, cab + pantallaPausa(), tabs("stock"));
      if (v === "vacio") {
        return marco(
          false,
          cab +
            `<div class="vacio">${ic("package", "grande")}<h2>Todavía no hay productos</h2><p>Agrega tus alfajores con su precio en Ajustes para empezar a llevar el stock.</p><button class="btn btn-primario" data-accion="toast" data-msg="Se abriría Ajustes, Productos">${ic("settings")}Ir a Ajustes</button></div>`,
          tabs("stock"),
        );
      }
      const sinRed = v === "sininternet";
      const total = totalSugerido();
      const volvieron = S.produccionHecha ? S.produccionHecha.volvieron : [];
      const filas = PRODUCTOS.map((p) => {
        const e = estadoStock(p);
        // en la web, un alfajor sin stock (cero o en negativo) aparece «Agotado»
        const web =
          p.stock <= 0
            ? `<span class="web web-off">${ic("link")}Agotado en la web</span>`
            : volvieron.includes(p.id)
              ? `<span class="web web-on">${ic("link")}Ya disponible en la web</span>`
              : "";
        return `<li><button class="stock-fila s-${e}" data-accion="detalle" data-id="${p.id}">${ficha(p)}<span class="sf-info"><b>${p.nombre}</b><small>${lineaStock(p)}</small>${web}</span><span class="sf-num">${p.stock}</span></button></li>`;
      }).join("");
      const sug = total
        ? `<button class="sug-mini" data-accion="ir" data-a="produccion">${ic("cookie")}<span><b>${periodoTitulo()} conviene hacer ${total} alfajores</b><small>Ver cuánto de cada uno</small></span>${ic("chevron-right")}</button>`
        : `<p class="sug-al-dia" style="margin-top:12px">${ic("circle-check")}Tu producción está al día para ${periodoAlDia()}.</p>`;
      const acciones = `<div class="acciones doble"><button class="btn btn-secundario" data-accion="abrir-merma" data-donde="stock"${sinRed ? " disabled" : ""}>Anotar merma</button><button class="btn btn-primario" data-accion="ir" data-a="produccion"${sinRed ? " disabled" : ""}>Registrar producción</button></div>`;
      return marco(
        sinRed,
        (v === "actualizando" ? tirar() : "") + cabAccion + (sinRed ? avisoRed("Sin conexión. Ves el stock de las 11:32; para registrar, espera la señal.") : "") + sug + `<ul class="stock">${filas}</ul>` + acciones,
        tabs("stock") + (S.merma && S.merma.donde === "stock" ? hojaMerma() : "") + (S.conteo && S.conteo.donde === "stock" ? hojaConteo() : ""),
      );
    },

    produccion(v) {
      const cab = cabForm("Registrar producción", "Hoy, miércoles 18 de noviembre", "stock");
      if (v === "cargando") {
        return marco(false, cab + esqTarjeta(64) + esqFilas(5), `<div class="pie-accion"><button class="btn btn-primario ancho" disabled>Guardar producción</button></div>`);
      }
      if (S.produccionHecha) {
        const h = S.produccionHecha;
        const nombres = h.volvieron.map((id) => P[id].nombre);
        return marco(
          false,
          cab +
            `<div class="vacio">${ic("package-check", "grande")}<h2>Producción guardada</h2><p>Sumaste ${h.total} alfajores y el stock ya está al día.${
              nombres.length ? ` ${nombres.join(" y ")} ${nombres.length > 1 ? "vuelven" : "vuelve"} a aparecer disponibles en la web.`.replace("vuelve a aparecer disponibles", "vuelve a aparecer disponible") : ""
            }</p><button class="btn btn-primario" data-accion="ir" data-a="stock">${ic("package")}Ver stock</button><button class="btn btn-texto" data-accion="deshacer-produccion">${ic("undo-2")}Deshacer</button></div>`,
        );
      }
      const sinHistorial = v === "sinhistorial";
      const filas = PRODUCTOS.map((p) => {
        const n = sinHistorial ? S.produccion[p.id] || 0 : aProducir(p);
        const abierto = !sinHistorial && S.porque === p.id;
        const explicacion =
          `Vende unas ${p.semana} al día de lunes a viernes y ${p.finde} los sábados y domingos: ${semanal(p)} ${periodoFrase()}. ` +
          `Más tu mínimo (${p.minimo})` +
          (p.stock > 0 ? `, menos lo que tienes (${p.stock})` : p.stock < 0 ? `, más las ${-p.stock} que vendiste de más` : ", y hoy no tienes ninguno") +
          `: ${sugerido(p)}.`;
        return `<li class="prod">${ficha(p)}<div class="prod-info"><b>${p.nombre}</b>${
          sinHistorial
            ? `<span>Anota cuántos hiciste</span>`
            : `<span>Sugerido: ${sugerido(p)}</span><button class="porque-btn" aria-expanded="${abierto}" data-accion="porque" data-id="${p.id}">Por qué ${sugerido(p)}${ic("chevron-down")}</button>`
        }</div>${stepper(p.id, n, "prod-menos", "prod-mas", p.nombre, true)}</li>${abierto ? `<li class="porque">${explicacion}</li>` : ""}`;
      }).join("");
      const total = PRODUCTOS.reduce((a, p) => a + (sinHistorial ? S.produccion[p.id] || 0 : aProducir(p)), 0);
      const info = sinHistorial
        ? `<div class="info">${ic("info")}<p>Todavía no hay ventas suficientes para sugerir. Anota lo que hiciste y desde la próxima semana la app sugiere sola.</p></div>`
        : `<div class="info">${ic("info")}<p>Lo sugerido cubre ${S.diasProduccion} días. Si produces más o menos seguido, cámbialo en Ajustes y la cuenta se ajusta sola.</p></div>`;
      const pie = `<div class="pie-accion"><button class="btn btn-primario ancho" data-accion="guardar-produccion" data-sh="${sinHistorial ? 1 : 0}"${total ? "" : " disabled"}>Guardar producción: ${total} alfajores</button></div>`;
      return marco(false, cab + info + `<ul class="prods">${filas}</ul>`, pie);
    },

    historial(v) {
      const p = P[S.detalle];
      const cab = cabForm(p.nombre, sol(p.precio), "stock");
      if (v === "error") return marco(false, cab + pantallaError("los movimientos"));
      if (v === "cargando") return marco(false, cab + esqTarjeta(78) + esqTarjeta(72) + esqTarjeta(160) + esqFilas(3));
      const sinRed = v === "sininternet";
      const e = estadoStock(p);
      const d = alcance(p);
      const alcanceCorto = e === "agotado" ? "0 días" : e === "revisar" ? "Revisar" : d >= 7 ? "7+ días" : `${d} ${d === 1 ? "día" : "días"}`;
      const maxDia = Math.max(p.semana, p.finde);
      const barras = ["L", "M", "M", "J", "V", "S", "D"]
        .map((_, i) => {
          const finde = i >= 5;
          const valor = finde ? p.finde : p.semana;
          return `<i class="${finde ? "finde" : ""}" style="--h:${(valor / maxDia) * 100}%" title="${valor} al día"></i>`;
        })
        .join("");
      const movs = (S.movimientos[p.id] || [])
        .map(
          (m, i) =>
            `<li class="mov${m.nuevo && i === 0 ? " nuevo-mov" : ""}"><span class="mov-ic ${m.tipo}">${ic(
              m.tipo === "produccion" ? "package-check" : m.tipo === "merma" ? "trash-2" : m.tipo === "devolucion" ? "rotate-ccw" : m.tipo === "ajuste" ? "clipboard-check" : "shopping-bag",
            )}</span><span class="mov-txt"><b>${m.d}</b><span>${m.t}</span></span><span class="mov-c${m.c > 0 ? " mas" : ""}">${m.c > 0 ? "+" : "−"}${Math.abs(m.c)}</span></li>`,
        )
        .join("");
      const web =
        p.stock <= 0 ? `<span class="web web-off">${ic("link")}Agotado en la web</span>` : `<span class="web web-on">${ic("link")}Disponible en la web</span>`;
      const cuerpo =
        cab +
        (sinRed ? avisoRed("Sin conexión. Ves los movimientos de las 11:32.") : "") +
        `<div class="det-cab">${ficha(p, "grande")}<div>${chipStock(e)}<br>${web}</div></div>
         <div class="stats"><div><b>${p.stock}</b><span>en stock</span></div><div><b>${alcanceCorto}</b><span>le alcanza</span></div><div><b>${p.minimo}</b><span>mínimo</span></div></div>
         <section class="bloque"><div class="bloque-cab"><h2>Cómo se vende</h2></div>
           <div class="semana" aria-hidden="true">${barras}</div><div class="semana-dias" aria-hidden="true"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
           <p class="nota">${ic("chart-column")}<span>Unas ${p.semana} al día de lunes a viernes y ${p.finde} los sábados y domingos, según las últimas 4 semanas.</span></p>
         </section>
         <section class="bloque"><div class="bloque-cab"><h2>Movimientos</h2></div><ul class="movs">${movs}</ul></section>`;
      const pie = `<div class="pie-accion doble"><button class="btn btn-secundario" data-accion="abrir-conteo" data-donde="historial"${sinRed ? " disabled" : ""}>Contar stock</button><button class="btn btn-primario" data-accion="abrir-merma" data-donde="historial"${sinRed ? " disabled" : ""}>Anotar merma</button></div>`;
      return marco(sinRed, cuerpo, pie + (S.merma && S.merma.donde === "historial" ? hojaMerma() : "") + (S.conteo && S.conteo.donde === "historial" ? hojaConteo() : ""));
    },
  };

  function vistaPrevia(cambios) {
    const b = { ...S.borrador, ...cambios };
    return { n: S.siguiente, items: b.items, cliente: clienteDe(b), entrega: b.entrega, cuando: b.cuando, t: totales(b), pagaAhora: b.entrega === "mostrador" ? "todo" : b.pagaAhora, parte: b.parte, pago: b.pago };
  }

  function hojaMerma() {
    const m = S.merma;
    const p = P[m.id];
    const elegir =
      m.donde === "stock"
        ? `<h3>Alfajor</h3><div class="chips">${PRODUCTOS.map(
            (x) => `<button class="chip" aria-pressed="${m.id === x.id}" data-accion="merma-id" data-id="${x.id}">${x.nombre}</button>`,
          ).join("")}</div>`
        : "";
    return `<button class="velo" data-accion="cerrar-merma" aria-label="Cerrar"></button>
      <div class="hoja" role="dialog" aria-label="Anotar merma"><span class="asa"></span><h2>Anotar merma</h2>${elegir}
        <div class="fila-merma"><span>${ficha(p, "mini")}${p.nombre}</span>${stepper(p.id, m.cant, "merma-menos", "merma-mas", p.nombre, true)}</div>
        <h3>Motivo</h3><div class="chips">${["Rota", "Vencida", "Regalo", "Otro"]
          .map((r) => `<button class="chip" aria-pressed="${m.motivo === r}" data-accion="merma-motivo" data-v="${r}">${r}</button>`)
          .join("")}</div>
        <button class="btn btn-primario ancho" data-accion="guardar-merma"${m.cant ? "" : " disabled"}>Guardar merma</button></div>`;
  }

  /* ---------- Pintar ---------- */
  const telefonos = Array.from(document.querySelectorAll(".telefono[data-pantalla]"));

  function pintar(cual) {
    telefonos.forEach((tel) => {
      const id = tel.dataset.pantalla;
      if (cual && !cual.includes(id)) return;
      if (!PANTALLAS[id]) return;
      const app = tel.querySelector(".app");
      const vista = tel.dataset.vista || "datos";
      const viejo = app.querySelector(".contenido");
      const y = viejo ? viejo.scrollTop : 0;
      app.innerHTML =
        PANTALLAS[id](vista) +
        (S.toast[id]
          ? `<div class="toast" role="status">${ic("info")}<span>${S.toast[id]}</span>${S.deshacer[id] ? `<button class="toast-accion" data-accion="deshacer">Deshacer</button>` : ""}</div>`
          : "") +
        (S.menuNuevo === id ? hojaNuevo() : "");
      app.classList.toggle("letra-grande", tel.dataset.letra === "grande");
      const nuevo = app.querySelector(".contenido");
      if (nuevo) nuevo.scrollTop = y;
    });
  }

  function marcarCambio(ids) {
    ids.forEach((id) => {
      const marcoEl = document.querySelector(`.telefono[data-pantalla="${id}"] .marco`);
      if (!marcoEl) return;
      marcoEl.classList.add("cambio");
      setTimeout(() => marcoEl.classList.remove("cambio"), 900);
    });
  }

  function ir(id) {
    const tel = document.querySelector(`.telefono[data-pantalla="${id}"]`);
    if (!tel) return;
    tel.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    marcarCambio([id]);
  }

  // Con «deshacer», el aviso dura unos segundos más y trae el botón para volver atrás
  function toast(id, msg, deshacer) {
    S.toast[id] = msg;
    if (deshacer) S.deshacer[id] = deshacer;
    else delete S.deshacer[id];
    pintar([id]);
    clearTimeout(toast[id]);
    toast[id] = setTimeout(
      () => {
        delete S.toast[id];
        delete S.deshacer[id];
        pintar([id]);
      },
      deshacer ? 5000 : 2400,
    );
  }

  /* ---------- Acciones ---------- */
  const ACCIONES = {};
  const INPUTS = {};
  const GUARDAR = new Set(["guardar", "guardar-gasto", "guardar-produccion", "guardar-pago", "guardar-conteo", "guardar-editar", "guardar-merma", "guardar-correccion", "guardar-producto", "guardar-anular", "borrar-cliente", "guardar-venta", "guardar-cierre"]);
  function guardarPedido() {
    const b = S.borrador;
    const t = totales(b);
    const n = S.siguiente++;
    const mostrador = b.entrega === "mostrador";
    const paga = mostrador ? "todo" : b.pagaAhora;
    const cliente = clienteDe(b);
    const pagos = paga === "todo" ? [{ m: b.pago, c: t.total }] : paga === "parte" ? [{ m: b.pago, c: Math.min(b.parte, t.total) }] : [];
    lineas(b.items).forEach(({ p, n: cant }) => {
      p.stock -= cant;
      S.movimientos[p.id].unshift({ t: "Ahora", d: `Venta ${num(n)}, ${cliente || "mostrador"}`, c: -cant, tipo: "venta", nuevo: true });
    });
    const precios = Object.fromEntries(lineas(b.items).map(({ p }) => [p.id, p.precio]));
    if (b.motivo === "Fidelidad" && b.descuento > 0 && window.DonPipos && window.DonPipos.premioCanjeado) window.DonPipos.premioCanjeado(cliente);
    S.pedidos.push({
      n,
      precios,
      envio: t.envio,
      descuento: t.desc,
      cliente,
      tipo: mostrador ? "mostrador" : b.entrega,
      hora: b.hora,
      items: { ...b.items },
      total: t.total,
      estado: mostrador ? "entregado" : "nuevo",
      programado: b.cuando === "otro" ? "Jueves 19, 10:00" : undefined,
      pagos,
    });
    S.guardado = { n, precios, items: { ...b.items }, cliente, entrega: b.entrega, cuando: b.cuando, t, pagaAhora: paga, parte: b.parte, pago: b.pago };
    b.guardadoComo = n;
    pintar();
    marcarCambio(["inicio", "stock", "historial", "guardado"]);
    ir("guardado");
  }

  function guardarProduccion(sinHistorial) {
    const volvieron = [];
    let total = 0;
    const deltas = {};
    PRODUCTOS.forEach((p) => {
      const n = sinHistorial ? S.produccion[p.id] || 0 : aProducir(p);
      if (!n) return;
      if (p.stock <= 0 && p.stock + n > 0) volvieron.push(p.id);
      p.stock += n;
      deltas[p.id] = n;
      total += n;
      S.movimientos[p.id].unshift({ t: "Ahora", d: "Producción", c: n, tipo: "produccion", nuevo: true });
    });
    S.produccionHecha = { total, volvieron, deltas };
    S.produccion = {};
    pintar();
    marcarCambio(["inicio", "stock", "historial"]);
  }

  function deshacerProduccion() {
    const h = S.produccionHecha;
    if (!h) return;
    Object.entries(h.deltas).forEach(([id, n]) => {
      P[id].stock -= n;
      const i = S.movimientos[id].findIndex((m) => m.tipo === "produccion" && m.t === "Ahora");
      if (i >= 0) S.movimientos[id].splice(i, 1);
    });
    S.produccionHecha = null;
    pintar();
    marcarCambio(["inicio", "stock", "historial"]);
  }

  document.addEventListener("click", (ev) => {
    const vistaBtn = ev.target.closest(".vistas button[data-vista]");
    if (vistaBtn) {
      const tel = vistaBtn.closest(".telefono");
      tel.dataset.vista = vistaBtn.dataset.vista;
      tel.querySelectorAll(".vistas button").forEach((x) => x.setAttribute("aria-pressed", String(x === vistaBtn)));
      pintar([tel.dataset.pantalla]);
      return;
    }
    const el = ev.target.closest("[data-accion]");
    if (!el || el.disabled) return;
    const tel = el.closest(".telefono");
    const donde = tel ? tel.dataset.pantalla : null;
    if (GUARDAR.has(el.dataset.accion)) {
      el.disabled = true;
      el.classList.add("guardando");
      el.innerHTML = `<span class="girando" aria-hidden="true"></span>Guardando…`;
      setTimeout(
        () => {
          if (navigator.vibrate) navigator.vibrate(15); // vibración corta al guardar (en Android)
          ejecutar(el, tel, donde);
        },
        reduce ? 300 : 800,
      );
      return;
    }
    ejecutar(el, tel, donde);
  });

  function ejecutar(el, tel, donde) {
    const b = S.borrador;
    const id = el.dataset.id;
    const v = el.dataset.v;
    switch (el.dataset.accion) {
      case "ir":
        ir(el.dataset.a);
        return;
      case "toast":
        toast(donde, el.dataset.msg);
        return;
      case "mas":
        if (b.guardadoComo) S.borrador = nuevoBorrador({});
        S.borrador.items[id] = (S.borrador.items[id] || 0) + 1;
        pintar(["pedido1", "pedido2", "guardado"]);
        marcarCambio(["pedido2", "guardado"]);
        return;
      case "menos":
        if (b.guardadoComo) S.borrador = nuevoBorrador({ ...b.items });
        S.borrador.items[id] = Math.max(0, (S.borrador.items[id] || 0) - 1);
        pintar(["pedido1", "pedido2", "guardado"]);
        marcarCambio(["pedido2", "guardado"]);
        return;
      case "vaciar":
        S.borrador = nuevoBorrador({});
        pintar(["pedido1", "pedido2", "guardado"]);
        return;
      case "entrega":
        b.entrega = v;
        if (v === "mostrador") b.cuando = "hoy";
        pintar(["pedido2", "guardado"]);
        marcarCambio(["guardado"]);
        return;
      case "hora":
        b.hora = v;
        pintar(["pedido2"]);
        return;
      case "cuando":
        b.cuando = v;
        pintar(["pedido2", "guardado"]);
        return;
      case "sin-cliente":
        b.sinCliente = !b.sinCliente;
        pintar(["pedido2", "guardado"]);
        return;
      case "abrir-descuento":
        b.descuentoAbierto = true;
        b.descuento = 600;
        b.motivo = "Cliente frecuente";
        pintar(["pedido2", "guardado"]);
        return;
      case "motivo":
        b.motivo = v;
        pintar(["pedido2", "guardado"]);
        return;
      case "pago":
        b.pago = v;
        pintar(["pedido2", "guardado"]);
        return;
      case "paga":
        b.pagaAhora = v;
        pintar(["pedido2", "guardado"]);
        marcarCambio(["guardado"]);
        return;
      case "guardar":
        guardarPedido();
        return;
      case "otro":
        S.borrador = nuevoBorrador({});
        S.guardado = null;
        pintar(["pedido1", "pedido2", "guardado"]);
        ir("pedido1");
        return;
      case "detalle":
        S.detalle = id;
        S.merma = null;
        pintar(["historial"]);
        ir("historial");
        return;
      case "porque":
        S.porque = S.porque === id ? null : id;
        pintar(["produccion"]);
        return;
      case "prod-mas":
      case "prod-menos": {
        const tela = document.querySelector('.telefono[data-pantalla="produccion"]');
        const sh = tela.dataset.vista === "sinhistorial";
        const actual = sh ? S.produccion[id] || 0 : aProducir(P[id]);
        S.produccion[id] = Math.max(0, actual + (el.dataset.accion === "prod-mas" ? 1 : -1));
        pintar(["produccion"]);
        return;
      }
      case "guardar-produccion":
        guardarProduccion(el.dataset.sh === "1");
        return;
      case "deshacer-produccion":
        deshacerProduccion();
        return;
      case "abrir-merma":
        S.merma = { donde: el.dataset.donde, id: el.dataset.donde === "stock" ? "coqueta" : S.detalle, cant: 1, motivo: "Rota" };
        pintar(["stock", "historial"]);
        return;
      case "cerrar-merma":
        S.merma = null;
        pintar(["stock", "historial"]);
        return;
      case "merma-id":
        S.merma.id = id;
        pintar([S.merma.donde]);
        return;
      case "merma-mas":
        S.merma.cant += 1;
        pintar([S.merma.donde]);
        return;
      case "merma-menos":
        S.merma.cant = Math.max(0, S.merma.cant - 1);
        pintar([S.merma.donde]);
        return;
      case "merma-motivo":
        S.merma.motivo = v;
        pintar([S.merma.donde]);
        return;
      case "guardar-merma": {
        const m = S.merma;
        const p = P[m.id];
        p.stock -= m.cant;
        S.movimientos[p.id].unshift({ t: "Ahora", d: `Merma: ${m.motivo.toLowerCase()}`, c: -m.cant, tipo: "merma", nuevo: true });
        const lugar = m.donde;
        S.merma = null;
        S.detalle = p.id;
        pintar();
        marcarCambio(["inicio", "stock", "historial"].filter((x) => x !== lugar));
        toast(lugar, `Merma guardada: ${m.cant} ${m.cant === 1 ? p.nombre : plural(p.nombre)}`, () => {
          p.stock += m.cant;
          S.movimientos[p.id].shift();
          marcarCambio(["inicio", "stock", "historial"]);
        });
        return;
      }
      case "deshacer": {
        const volver = S.deshacer[donde];
        delete S.deshacer[donde];
        delete S.toast[donde];
        clearTimeout(toast[donde]);
        if (volver) volver();
        pintar();
        return;
      }
      case "menu-nuevo":
        S.menuNuevo = donde;
        pintar([donde]);
        return;
      case "cerrar-menu-nuevo":
        S.menuNuevo = null;
        pintar([donde]);
        return;
      case "nuevo-ir":
        S.menuNuevo = null;
        pintar([donde]);
        ir(el.dataset.a);
        return;
      case "repetir":
        if (b.guardadoComo) S.borrador = nuevoBorrador({});
        S.borrador.items = { ...ULTIMO_SOFIA };
        pintar(["pedido1", "pedido2", "guardado"]);
        marcarCambio(["pedido1", "guardado"]);
        return;
      case "aplicar-premio":
        b.descuentoAbierto = true;
        b.descuento = window.DonPipos.montoPremio(b.items);
        b.motivo = "Fidelidad";
        pintar(["pedido2", "guardado"]);
        marcarCambio(["guardado"]);
        return;
      case "quitar-premio":
        b.descuento = 0;
        b.motivo = null;
        b.descuentoAbierto = false;
        pintar(["pedido2", "guardado"]);
        return;
      case "abrir-conteo": {
        const lugar = el.dataset.donde;
        S.conteo = {
          donde: lugar,
          ids: lugar === "historial" ? [S.detalle] : PRODUCTOS.map((x) => x.id),
          valores: Object.fromEntries(PRODUCTOS.map((x) => [x.id, Math.max(0, x.stock)])),
        };
        pintar([lugar]);
        return;
      }
      case "conteo-mas":
      case "conteo-menos":
        S.conteo.valores[id] = Math.max(0, S.conteo.valores[id] + (el.dataset.accion === "conteo-mas" ? 1 : -1));
        pintar([S.conteo.donde]);
        return;
      case "cerrar-conteo": {
        const lugar = S.conteo.donde;
        S.conteo = null;
        pintar([lugar]);
        return;
      }
      case "guardar-conteo": {
        const c = S.conteo;
        const cambios = c.ids.filter((x) => c.valores[x] !== P[x].stock).map((x) => ({ id: x, antes: P[x].stock, despues: c.valores[x] }));
        cambios.forEach((x) => {
          P[x.id].stock = x.despues;
          S.movimientos[x.id].unshift({ t: "Ahora", d: "Conteo: ajuste", c: x.despues - x.antes, tipo: "ajuste", nuevo: true });
        });
        const lugar = c.donde;
        S.conteo = null;
        pintar();
        marcarCambio(["inicio", "stock", "historial"].filter((x) => x !== lugar));
        toast(lugar, `Stock ajustado: ${cambios.length} ${cambios.length === 1 ? "alfajor" : "alfajores"}`, () => {
          cambios.forEach((x) => {
            P[x.id].stock = x.antes;
            S.movimientos[x.id].shift();
          });
          marcarCambio(["inicio", "stock", "historial"]);
        });
        return;
      }
      default:
        if (ACCIONES[el.dataset.accion]) ACCIONES[el.dataset.accion](el, { tel, donde });
    }
  }

  document.addEventListener("input", (ev) => {
    const campo = ev.target.closest("[data-input]");
    if (!campo) return;
    if (INPUTS[campo.dataset.input]) {
      INPUTS[campo.dataset.input](campo);
      return;
    }
    const centimos = Math.max(0, Math.round(parseFloat(campo.value || "0") * 100) || 0);
    S.borrador[campo.dataset.input] = centimos;
    // solo el resumen y el mensaje: repintar el formulario quitaría el foco del campo
    pintar(["guardado"]);
    const tel = campo.closest(".telefono");
    const res = tel.querySelector(".resumen");
    if (res) {
      const tmp = document.createElement("div");
      tmp.innerHTML = PANTALLAS.pedido2(tel.dataset.vista || "datos");
      const nuevo = tmp.querySelector(".resumen");
      if (nuevo) res.replaceWith(nuevo);
      const boton = tel.querySelector('[data-accion="guardar"]');
      const nuevoBoton = tmp.querySelector('[data-accion="guardar"]');
      if (boton && nuevoBoton) boton.innerHTML = nuevoBoton.innerHTML;
    }
  });

  /* ---------- Arranque ---------- */
  telefonos.forEach((tel) => {
    const vistas = tel.dataset.vistas.split(",");
    tel.dataset.vista = vistas[0];
    tel.querySelector(".vistas").innerHTML =
      `<span>Ver la pantalla:</span>` +
      vistas.map((v, i) => `<button type="button" data-vista="${v}" aria-pressed="${i === 0}">${VISTAS[v]}</button>`).join("");
  });
  document.querySelector('[data-leyenda="pedido"]').innerHTML = Object.keys(ESTADOS).map(chipEstado).join("");
  document.querySelector('[data-leyenda="stock"]').innerHTML = Object.keys(STOCK).map(chipStock).join("");
  document.querySelectorAll("[data-icono]").forEach((el) => el.insertAdjacentHTML("afterbegin", ic(el.dataset.icono)));

  // Celulares a escala cuando la ventana es más angosta que el marco
  // En pantallas de laptop, los tres celulares de una fila se achican un poco para no partir la fila
  function encajar() {
    document.querySelectorAll(".telefonos").forEach((fila) => {
      const tels = fila.querySelectorAll(".telefono");
      const ancho = fila.clientWidth;
      const hueco = 28;
      const n = tels.length;
      let escala = Math.min(1, ancho / 410);
      if (n >= 3 && n * 410 + (n - 1) * hueco > ancho) {
        const justa = (ancho - (n - 1) * hueco) / (n * 410);
        if (justa >= 0.78) escala = justa;
      }
      fila.style.setProperty("--escala", escala);
      tels.forEach((tel) => {
        const enc = tel.querySelector(".encaje");
        enc.style.width = 410 * escala + "px";
        enc.style.height = 864 * escala + "px";
        enc.firstElementChild.style.transform = escala < 1 ? `scale(${escala})` : "";
      });
    });
  }
  window.addEventListener("resize", encajar);
  encajar();
  pintar();

  window.DonPipos = {
    S,
    P,
    PRODUCTOS,
    PANTALLAS,
    ACCIONES,
    INPUTS,
    VISTAS,
    ESTADOS,
    METODOS,
    pintar,
    toast,
    ir,
    marcarCambio,
    u: { sol, ic, num, plural, ficha, chipEstado, filaPedido, demora, chipStock, marco, cabForm, stepper, esqueleto, esqTarjeta, esqFilas, tirar, barra, avisoRed, pantallaError, pantallaPausa, tabs, lineas, unidades, subtotal, detalleTexto, pendiente, pagado, estadoStock },
  };
})();

/* Maqueta de la app de Don Pipos, segunda tanda: pedidos, gastos, reportes, clientes y fidelidad, ajustes y acceso.
   Usa los datos y las piezas de donpipos.js (window.DonPipos), así lo que cambia aquí se ve en la primera tanda. */
(function () {
  "use strict";
  const DP = window.DonPipos;
  if (!DP) return;
  const { S, P, PRODUCTOS, PANTALLAS, ACCIONES, INPUTS, ESTADOS, METODOS, pintar, toast, ir, marcarCambio } = DP;
  const { sol, ic, num, plural, ficha, chipEstado, filaPedido, marco, cabForm, stepper, esqueleto, esqTarjeta, esqFilas, tirar, barra, avisoRed, pantallaError, pantallaPausa, tabs, lineas, detalleTexto, pendiente, pagado } = DP.u;

  const sprite = document.querySelector("body > svg");
  if (sprite) {
    sprite.insertAdjacentHTML(
      "beforeend",
      '<symbol id="i-fingerprint" viewBox="0 0 24 24"><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/></symbol><symbol id="i-delete" viewBox="0 0 24 24"><path d="M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/><path d="m12 9 6 6"/><path d="m18 9-6 6"/></symbol>',
    );
  }

  /* ---------- Utilidades ---------- */
  const titulo = (h, sub) => `<div class="titulo-fijo" aria-hidden="true"><span>${h}</span></div><div class="titulo"><h1>${h}</h1>${sub ? `<p>${sub}</p>` : ""}</div>`;
  const aCentimos = (valor) => Math.max(0, Math.round(parseFloat(String(valor).replace(",", ".") || "0") * 100) || 0);
  const pedidoN = (n) => S.pedidos.find((p) => p.n === n) || S.historico.find((p) => p.n === n);
  const iniciales = (nombre) =>
    nombre
      .replace(/\./g, "")
      .split(/\s+/)
      .map((x) => x[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  const interruptor = (accion, activo, etiqueta, extra) =>
    `<button class="switch" role="switch" aria-checked="${activo}" aria-label="${etiqueta}" data-accion="${accion}"${extra || ""}><i></i></button>`;
  const hoja = (etiqueta, cuerpo, cerrar) =>
    `<button class="velo" data-accion="${cerrar}" aria-label="Cerrar"></button><div class="hoja" role="dialog" aria-label="${etiqueta}"><span class="asa"></span>${cuerpo}</div>`;
  const repintar = (ids) => pintar(ids);

  /* ---------- Datos de ejemplo ---------- */
  const CLIENTES = [
    { id: "patricia", nombre: "Patricia V.", tel: "900 000 105", pedidos: 5, gastado: 41200, ultimo: "Ayer", dias: 1, sellos: 5, favorito: "Coqueta", promos: true, pasados: [[33, "Sábado 14", 9600], [21, "Martes 10", 7200]] },
    { id: "lucia", nombre: "Lucía R.", tel: "900 000 128", pedidos: 9, gastado: 38600, ultimo: "Hoy, 09:30", dias: 0, sellos: 7, favorito: "Morenita", promos: true, direccion: "Jr. Callao 318", nota: "Prefiere que le escriban antes de salir.", pasados: [[31, "Lunes 16", 3600], [24, "Jueves 12", 4800], [17, "Sábado 7", 6100]] },
    { id: "ana", nombre: "Ana Q.", tel: "900 000 110", pedidos: 7, gastado: 25400, ultimo: "Hoy, 10:40", dias: 0, sellos: 9, favorito: "Coqueta", promos: true, direccion: "Jr. Bellido 210", pasados: [[29, "Domingo 15", 3700], [19, "Domingo 8", 2400]] },
    { id: "jorge", nombre: "Jorge P.", tel: "900 000 154", pedidos: 6, gastado: 21400, ultimo: "Ayer", dias: 1, sellos: 8, favorito: "Coqueta", promos: false, direccion: "Av. Cusco 145", pasados: [[36, "Ayer", 3600], [26, "Viernes 13", 2400]] },
    { id: "carlos", nombre: "Carlos M.", tel: "900 000 177", pedidos: 4, gastado: 16800, ultimo: "Hoy, 10:05", dias: 0, sellos: 4, favorito: "Limon Kiss", promos: true, pasados: [[22, "Miércoles 11", 4800]] },
    { id: "miguel", nombre: "Miguel A.", tel: "900 000 112", pedidos: 2, gastado: 10200, ultimo: "Hoy, 11:30", dias: 0, sellos: 2, favorito: "Manteadita", promos: false, pasados: [[12, "Lunes 2", 3600]] },
    { id: "sofia", nombre: "Sofía L.", tel: "987 654 321", pedidos: 3, gastado: 9600, ultimo: "Hace 6 días", dias: 6, sellos: 10, favorito: "Coqueta", promos: true, direccion: "Jr. Lima 412", pasados: [[27, "Jueves 12", 4800]] },
    { id: "rosa", nombre: "Rosa T.", tel: "900 000 141", pedidos: 3, gastado: 7200, ultimo: "Hace 34 días", dias: 34, sellos: 3, favorito: "Limon Kiss", promos: true, pasados: [[8, "15 de octubre", 2400]] },
    { id: "martin", nombre: "Martín C.", tel: "900 000 166", pedidos: 1, gastado: 2400, ultimo: "Hace 41 días", dias: 41, sellos: 1, favorito: "Morenita", promos: false, pasados: [[3, "8 de octubre", 2400]] },
  ];
  const clientePorNombre = (nombre) => CLIENTES.find((c) => c.nombre === nombre) || null;

  const CATEGORIAS = {
    insumos: { t: "Insumos", i: "wheat" },
    empaques: { t: "Empaques", i: "package" },
    delivery: { t: "Delivery", i: "motorbike" },
    servicios: { t: "Servicios", i: "flame" },
    otros: { t: "Otros", i: "receipt" },
  };
  S.gastos = [
    { t: "Hoy, 09:10", hoy: true, semana: true, cat: "insumos", d: "Chocolate de cobertura", c: 8600, m: "yape", foto: true },
    { t: "Ayer", semana: true, cat: "empaques", d: "Cajas para 6 alfajores", c: 4500, m: "efectivo", foto: false },
    { t: "Lunes 16", semana: true, cat: "delivery", d: "Moto, pedidos del fin de semana", c: 3000, m: "efectivo", foto: false },
    { t: "Sábado 14", cat: "insumos", d: "Harina, mantequilla y azúcar", c: 13250, m: "transferencia", foto: true },
    { t: "Viernes 13", cat: "servicios", d: "Gas", c: 5200, m: "efectivo", foto: false },
    { t: "Miércoles 11", cat: "insumos", d: "Queso crema y frutos secos", c: 7400, m: "yape", foto: true },
  ];
  // Lo gastado antes en el mes y que no se lista aquí, por categoría
  const GASTOS_ANTES = { insumos: 45000, empaques: 12000, delivery: 9000, servicios: 9600, otros: 7000 };
  S.gastoNuevo = { monto: 2500, cat: "insumos", m: "efectivo", nota: "Mantequilla", foto: false };

  // Lo cobrado del 1 al 17 de noviembre, por medio de pago; hoy se suma lo cobrado en la app
  const COBRADO_ANTES = { yape: 151300, plin: 47200, transferencia: 64000, efectivo: 66800 };
  const RANKING = { coqueta: 80, manteadita: 68, morenita: 60, limon: 50, pipo: 27 };
  const CANALES = [
    ["WhatsApp", 58, "whatsapp"],
    ["En el local", 41, "store"],
    ["Desde la web", 12, "link"],
  ];
  const COSTOS = { coqueta: 510, morenita: 480, limon: 530, manteadita: 460, pipo: 620 };
  PRODUCTOS.forEach((p) => {
    p.costo = COSTOS[p.id];
    p.web = true;
  });

  // Los pedidos de ejemplo guardan el precio de cada alfajor del día en que se vendieron
  S.pedidos.forEach((o) => {
    if (!o.precios) o.precios = Object.fromEntries(Object.keys(o.items).map((id) => [id, P[id].precio]));
    if (o.envio === undefined) o.envio = o.tipo === "delivery" ? 500 : 0;
    if (o.descuento === undefined) o.descuento = o.n === 44 ? 600 : 0;
  });
  S.mediosActivos = { yape: true, plin: true, transferencia: true, efectivo: true };
  S.gastoEdit = null;
  S.hojaCliente = null;
  S.ajusteHoja = null;
  S.recordatorios = { programados: true, stock: true, saldos: true };
  S.puesta = { paso: 1, stock: { coqueta: 0, morenita: 0, limon: 0, manteadita: 0, pipo: 0 }, tipos: { insumos: true, empaques: true, delivery: true, servicios: true, otros: false } };
  const mediosVisibles = () => Object.entries(METODOS).filter(([k]) => S.mediosActivos[k]);

  // Foto del estado para «Deshacer»: pedidos, stock, movimientos y sellos
  function foto() {
    return { pedidos: structuredClone(S.pedidos), stocks: PRODUCTOS.map((x) => x.stock), movs: structuredClone(S.movimientos), sellos: CLIENTES.map((c) => c.sellos) };
  }
  function volver(f) {
    S.pedidos.splice(0, S.pedidos.length, ...f.pedidos);
    PRODUCTOS.forEach((x, i) => (x.stock = f.stocks[i]));
    Object.keys(f.movs).forEach((k) => (S.movimientos[k] = f.movs[k]));
    CLIENTES.forEach((c, i) => (c.sellos = f.sellos[i]));
    S.hojaPedido = null;
  }
  const precioDe = (o, id) => (o.precios && o.precios[id]) || P[id].precio;

  S.filtroPedidos = "hoy";
  S.detallePedido = 42;
  S.hojaPedido = null;
  S.periodo = "mes";
  S.rankingPor = "unidades";
  S.filtroClientes = "todos";
  S.clienteSel = "lucia";
  S.fidelidad = { activa: true, meta: 10, premio: "alfajor" };
  S.productoEdit = null;
  S.huella = true;
  // Acceso: el equipo crea la cuenta con su número y un PIN. La primera vez en un celular escribe los dos
  // (el servidor cuenta los intentos); después entra con huella o PIN
  const NUMERO = "900 000 100"; // número de ejemplo del dueño
  const PIN = "197346"; // el PIN que le dio el equipo, en la maqueta
  const BLOQUEOS = { 0: "Al salir", 1: "Al minuto", 5: "A los 5 min", 15: "A los 15 min" };
  const ingresoNuevo = () => ({ paso: "pin", pin: "", intentos: 5, mal: false, revisando: false });
  S.ingreso = ingresoNuevo();
  S.desbloqueo = { pin: "", intentos: 5, mal: false };
  S.bloqueo = 5; // minutos con la app en segundo plano antes de pedir huella o PIN
  // Pedidos de días anteriores: solo para ver el paginado de «Todos» (el servidor manda páginas de 20)
  S.paginas = 1;
  S.cargandoMas = false;
  const CLIENTE_ANTES = { 34: "Miguel A.", 30: "Lucía R.", 22: "Ana Q.", 15: "Carlos M.", 8: "Patricia V.", 2: "Sofía L." };
  S.historico = Array.from({ length: 38 }, (_, i) => 38 - i)
    .filter((n) => n !== 37)
    .map((n) => {
      const cliente = CLIENTE_ANTES[n] || null;
      const tipo = !cliente ? "mostrador" : n % 2 ? "recoge" : "delivery";
      const items = { [PRODUCTOS[n % PRODUCTOS.length].id]: 1 + (n % 3) };
      if (cliente) items[PRODUCTOS[(n + 2) % PRODUCTOS.length].id] = 2;
      const precios = Object.fromEntries(Object.keys(items).map((id) => [id, P[id].precio]));
      const envio = tipo === "delivery" ? S.envio : 0;
      const total = Object.entries(items).reduce((suma, [id, c]) => suma + c * precios[id], envio);
      const ayer = n >= 32;
      const dia = ayer ? undefined : n >= 25 ? "Lunes 16" : n >= 18 ? "Domingo 15" : n >= 11 ? "Sábado 14" : n >= 4 ? "Viernes 13" : "Jueves 12";
      if (n === 38) return { n, cliente, tipo, ayer, items, precios, total, estado: "anulado", motivo: "se anotó dos veces", pagos: [] };
      return { n, cliente, tipo, ayer, dia, items, precios, envio, total, estado: "entregado", pagos: [{ m: ["efectivo", "yape", "plin", "efectivo", "transferencia"][n % 5], c: total, ayer, dia }] };
    });
  const PREMIOS = { alfajor: "1 alfajor gratis", descuento: "S/ 10.00 de descuento", otro: "Otro premio" };
  const MENSAJES_BASE = {
    confirmacion: "Hola {nombre}, recibimos tu pedido {numero}: {detalle}. Total: {total}. {adelanto} {entrega} ¡Gracias!",
    camino: "Hola {nombre}, tu pedido {numero} va en camino. {pago}",
    listo: "Hola {nombre}, tu pedido {numero} está listo para recoger. {pago}",
    entregado: "¡Gracias por tu compra, {nombre}! {sellos}",
    saldo: "Hola {nombre}, te recordamos el saldo de tu pedido {numero}: {falta}. Puedes pagar por Yape, Plin, transferencia o efectivo.",
    extranamos: "Hola {nombre}, hace tiempo que no te vemos por Don Pipos. ¿Se te antoja un alfajor esta semana?",
  };
  const MENSAJES_T = {
    confirmacion: "Confirmación del pedido",
    camino: "En camino",
    listo: "Listo para recoger",
    entregado: "Entregado",
    saldo: "Recordatorio de saldo",
    extranamos: "Te extrañamos (solo con permiso)",
  };
  S.mensajes = { ...MENSAJES_BASE };
  S.mensajeSel = "camino";

  /* ---------- Cuentas ---------- */
  const FLUJO = { delivery: ["nuevo", "preparando", "camino", "entregado"], recoge: ["nuevo", "preparando", "listo", "entregado"], mostrador: ["entregado"] };
  const SIGUIENTE_T = { preparando: "Empezar a preparar", camino: "Marcar en camino", listo: "Marcar listo para recoger", entregado: "Marcar entregado" };
  const cobrosHoy = () => S.pedidos.flatMap((p) => p.pagos.filter((x) => !x.ayer));
  const cobradoHoyPor = (m) => cobrosHoy().filter((x) => x.m === m).reduce((a, x) => a + x.c, 0);
  const ingresosMes = () => Object.keys(COBRADO_ANTES).reduce((a, m) => a + COBRADO_ANTES[m] + cobradoHoyPor(m), 0);
  const gastoCat = (cat) => GASTOS_ANTES[cat] + S.gastos.filter((g) => g.cat === cat && !g.anulado).reduce((a, g) => a + g.c, 0);
  const gastosMes = () => Object.keys(CATEGORIAS).reduce((a, c) => a + gastoCat(c), 0);
  const fidelidadActiva = (vista) => S.fidelidad.activa && vista !== "apagada";
  function contexto(p, vista) {
    const c = clientePorNombre(p.cliente);
    const falta = pendiente(p);
    return {
      nombre: (p.cliente || "").split(" ")[0],
      numero: num(p.n),
      detalle: detalleTexto(p.items),
      total: sol(p.total),
      falta: sol(falta),
      adelanto: pagado(p) >= p.total ? "Ya está pagado." : pagado(p) > 0 ? `Recibimos tu adelanto de ${sol(pagado(p))}; faltan ${sol(falta)}.` : "",
      entrega: p.programado
        ? `Lo entregamos el ${p.programado.toLowerCase()}.`
        : p.tipo === "recoge"
          ? "Te avisamos cuando esté listo para recoger."
          : p.tipo === "delivery"
            ? "Te avisamos cuando salga."
            : "",
      pago: falta > 0 ? `Total a pagar: ${sol(falta)} (Yape, Plin, transferencia o efectivo).` : "Ya está pagado.",
      sellos:
        fidelidadActiva(vista) && c
          ? c.sellos >= S.fidelidad.meta
            ? `Completaste tu tarjeta de sellos: tu próximo pedido lleva ${PREMIOS[S.fidelidad.premio].toLowerCase()}.`
            : `Llevas ${c.sellos} de ${S.fidelidad.meta} sellos para tu premio.`
          : "",
    };
  }
  const llenar = (plantilla, ctx) =>
    plantilla
      .replace(/\{(\w+)\}/g, (m, k) => (k in ctx ? ctx[k] : m))
      .replace(/\s+/g, " ")
      .trim();
  const burbuja = (texto) => `<div class="chat"><p class="burbuja">${texto}<time>11:41</time></p></div>`;

  const FILTROS = [
    ["hoy", "Hoy", (p) => !p.programado && !p.ayer],
    ["entregar", "Por entregar", (p) => ["nuevo", "preparando", "camino", "listo"].includes(p.estado)],
    ["cobrar", "Por cobrar", (p) => p.estado !== "anulado" && pendiente(p) > 0],
    ["proximos", "Próximos", (p) => Boolean(p.programado)],
    ["todos", "Todos", () => true],
  ];

  /* ---------- Pantallas: pedidos ---------- */
  const TERMINADO = ["entregado", "anulado"];
  function filasPedidos(lista) {
    if (S.filtroPedidos !== "hoy") return lista.map((p) => filaPedido(p)).join("");
    const enCurso = lista.filter((p) => !TERMINADO.includes(p.estado));
    const hechos = lista.filter((p) => TERMINADO.includes(p.estado));
    const grupo = (t) => `<li class="ped-grupo">${t}</li>`;
    return (
      (enCurso.length ? grupo("En curso") + enCurso.map((p) => filaPedido(p)).join("") : "") +
      (hechos.length ? grupo("Terminados") + hechos.map((p) => filaPedido(p, true)).join("") : "")
    );
  }
  PANTALLAS.pedidos = function (v) {
    const cab = titulo("Pedidos", "Miércoles 18 de noviembre");
    if (v === "cargando") return marco(false, cab + esqTarjeta(46) + esqueleto([[70, 36]]) + esqFilas(5, false), tabs("pedidos"));
    if (v === "error") return marco(false, cab + pantallaError("los pedidos"), tabs("pedidos"));
    if (v === "vacio") {
      return marco(
        false,
        cab +
          `<div class="vacio">${ic("clipboard-list", "grande")}<h2>Todavía no hay pedidos</h2><p>Anota el primero con el botón + de abajo. Aquí verás su estado y lo que falta cobrar.</p><button class="btn btn-primario" data-accion="ir" data-a="pedido1">${ic("plus")}Anotar un pedido</button></div>`,
        tabs("pedidos"),
      );
    }
    const sinRed = v === "sininternet";
    const filtro = FILTROS.find((f) => f[0] === S.filtroPedidos);
    // «Todos» suma los días anteriores y llega de 20 en 20; el total lo cuenta el servidor
    const todos = S.filtroPedidos === "todos";
    const total = S.pedidos.length + S.historico.length;
    const orden = (todos ? S.pedidos.concat(S.historico) : S.pedidos.filter(filtro[2])).sort((a, b) => b.n - a.n);
    const lista = todos ? orden.slice(0, S.paginas * 20) : orden;
    const chips = `<div class="chips filtros">${FILTROS.map(
      ([k, txt, f]) =>
        `<button class="chip" aria-pressed="${S.filtroPedidos === k}" data-accion="filtro-pedidos" data-v="${k}">${txt} <b>${k === "todos" ? total : S.pedidos.filter(f).length}</b></button>`,
    ).join("")}</div>`;
    const masPedidos = !todos
      ? ""
      : S.cargandoMas
        ? `<div class="mas-cargando" role="status">${esqFilas(2, false)}<p><span class="girando" aria-hidden="true"></span>Cargando más…</p></div>`
        : lista.length < total
          ? `<p class="paginado">Mostrando ${lista.length} de ${total}</p><button class="fila-boton" data-accion="mas-pedidos"${sinRed ? " disabled" : ""}>${ic("chevron-down")}Cargar ${Math.min(20, total - lista.length)} más</button>`
          : `<p class="paginado">No hay más pedidos: ya ves los ${total}.</p>`;
    return marco(
      sinRed,
      (v === "actualizando" ? tirar() : "") +
        cab +
        (sinRed ? avisoRed("Sin conexión. Ves los pedidos de las 11:32.") : "") +
        `<label class="entrada buscar">${ic("search")}<input placeholder="Buscar por cliente o número" aria-label="Buscar pedidos"></label>` +
        chips +
        (lista.length ? `<ul class="pedidos">${filasPedidos(lista)}</ul>${masPedidos}` : `<div class="vacio-chico">No hay pedidos en «${filtro[1]}».</div>`),
      tabs("pedidos"),
    );
  };

  function lineaTiempo(p) {
    const pasos = FLUJO[p.tipo];
    const horas = Object.fromEntries(p.historial || []);
    const actual = p.estado === "anulado" ? -1 : pasos.indexOf(p.estado);
    return `<ol class="linea-tiempo">${pasos
      .map((e, i) => {
        const clase = i < actual ? "hecho" : i === actual ? "actual" : "";
        const hora = horas[e] || (i <= actual ? p.dia || (p.ayer ? "Ayer" : "Hoy") : "Pendiente");
        return `<li class="${clase}"><span class="lt-punto">${ic(i < actual ? "check" : ESTADOS[e].i)}</span><span class="lt-txt"><b>${ESTADOS[e].t}</b><small>${hora}</small></span></li>`;
      })
      .join("")}</ol>`;
  }

  PANTALLAS.pedido = function (v) {
    const p = pedidoN(S.detallePedido);
    const cliente = clientePorNombre(p.cliente);
    const tipo = p.tipo === "delivery" ? "delivery" : p.tipo === "recoge" ? "recoge en el local" : "mostrador";
    const cab = cabForm(`Pedido ${num(p.n)}`, `${p.cliente || "Cliente de mostrador"}, ${tipo}${p.programado ? " el " + p.programado.toLowerCase() : p.ayer ? " ayer" : p.dia ? " el " + p.dia.toLowerCase() : " hoy"}`, "pedidos");
    if (v === "error") return marco(false, cab + pantallaError("el pedido"));
    if (v === "cargando") return marco(false, cab + esqueleto([[34, 26]]) + esqTarjeta(176) + esqTarjeta(52) + esqTarjeta(150) + esqFilas(2, false));
    const sinRed = v === "sininternet";
    const pasos = FLUJO[p.tipo];
    const i = pasos.indexOf(p.estado);
    const sig = p.estado === "anulado" || i < 0 ? null : pasos[i + 1];
    const falta = pendiente(p);
    const plantilla = { nuevo: "confirmacion", camino: "camino", listo: "listo", entregado: "entregado" }[p.estado];

    const anulado = p.estado === "anulado" ? `<div class="aviso aviso-error">${ic("circle-x")}<p>Pedido anulado: ${p.motivo || "sin motivo"}. Los alfajores volvieron al stock.</p></div>` : "";
    const accion = sig
      ? `<button class="btn btn-primario ancho" data-accion="avanzar"${sinRed ? " disabled" : ""}>${ic(ESTADOS[sig].i)}${SIGUIENTE_T[sig]}</button>`
      : "";
    const aviso =
      plantilla && p.cliente && p.estado !== "anulado" && !p.dia
        ? `<section class="whatsapp"><h2>${ic("whatsapp")}Avisar «${ESTADOS[p.estado].t.toLowerCase()}» a ${p.cliente.split(" ")[0]}</h2>${burbuja(
            llenar(S.mensajes[plantilla], contexto(p, v)),
          )}<button class="btn btn-wa-borde ancho" data-accion="toast" data-msg="Se abriría WhatsApp con este mensaje">${ic("whatsapp")}Enviar por WhatsApp</button></section>`
        : "";
    const items = `<section class="tarjeta" aria-label="Detalle"><ul>${lineas(p.items)
      .map((l) => `<li><span class="it-nombre">${l.n} ${l.n === 1 ? l.p.nombre : plural(l.p.nombre)}<small class="cu">${sol(precioDe(p, l.p.id))} c/u</small></span><span>${sol(l.n * precioDe(p, l.p.id))}</span></li>`)
      .join("")}${p.envio ? `<li><span>Delivery</span><span>${sol(p.envio)}</span></li>` : ""}${
      p.descuento ? `<li><span>Descuento</span><span>−${sol(p.descuento)}</span></li>` : ""
    }<li class="total"><span>Total</span><span>${sol(p.total)}</span></li></ul><p class="nota">${ic("lock")}<span>Los precios quedan como se vendieron, aunque después cambien.</span></p></section>`;
    const pagos = `<section class="bloque"><div class="bloque-cab"><h2>Pagos</h2>${
      falta > 0 && p.estado !== "anulado" ? `<button class="link" data-accion="abrir-pago"${sinRed ? " disabled" : ""}>Registrar pago</button>` : ""
    }</div><ul class="movs">${
      p.pagos.length
        ? p.pagos
            .map((x) => `<li class="mov"><span class="mov-ic produccion">${ic("hand-coins")}</span><span class="mov-txt"><b>${METODOS[x.m]}</b><span>${x.dia || (x.ayer ? "Ayer" : "Hoy")}</span></span><span class="mov-c mas">${sol(x.c)}</span></li>`)
            .join("")
        : `<li class="mov"><span class="mov-ic">${ic("hourglass")}</span><span class="mov-txt"><b>Sin pagos todavía</b><span>${p.tipo === "recoge" ? "Se cobra al recoger" : "Se cobra al entregar"}</span></span></li>`
    }</ul><p class="falta${falta ? "" : " ok"}">${falta ? `Falta cobrar ${sol(falta)}` : `${ic("circle-check")}Pagado completo`}</p></section>`;
    const clienteCard = cliente
      ? `<section class="bloque"><div class="bloque-cab"><h2>Cliente</h2><button class="link" data-accion="ver-cliente" data-id="${cliente.id}">Ver ficha</button></div><div class="coincide"><span class="avatar">${iniciales(cliente.nombre)}</span><div><b>${cliente.nombre}</b><span>${cliente.tel}${cliente.direccion ? `, ${cliente.direccion}` : ""}</span></div></div>${
          p.tipo === "delivery" && cliente.direccion
            ? `<button class="fila-boton mapa" data-accion="toast" data-msg="Se abriría Google Maps con ${cliente.direccion}, Huamanga">${ic("map-pin")}Ver en el mapa</button>`
            : ""
        }</section>`
      : "";
    const anular =
      p.estado !== "anulado" && p.estado !== "entregado"
        ? `<div class="acciones"><button class="btn btn-secundario ancho" data-accion="abrir-editar"${sinRed ? " disabled" : ""}>${ic("pencil")}Editar pedido</button><button class="btn btn-texto peligro" data-accion="abrir-anular"${sinRed ? " disabled" : ""}>${ic("circle-x")}Anular</button></div>`
        : "";
    let hojaHtml = "";
    if (S.hojaPedido && S.hojaPedido.tipo === "pago") {
      const h = S.hojaPedido;
      hojaHtml = hoja(
        "Registrar pago",
        `<h2>${h.alEntregar ? "¿Ya cobraste?" : "Registrar pago"}</h2><p class="hoja-sub">Falta cobrar ${sol(falta)} del pedido ${num(p.n)}.</p>
         <h3>Monto</h3><label class="entrada">S/<input type="number" min="0" step="0.5" value="${(h.monto / 100).toFixed(2)}" data-input="pago-monto" aria-label="Monto del pago en soles"></label>
         <h3>Medio de pago</h3><div class="chips">${Object.entries(METODOS)
           .map(([k, t]) => `<button class="chip" aria-pressed="${h.m === k}" data-accion="pago-medio" data-v="${k}">${t}</button>`)
           .join("")}</div>
         <button class="btn btn-primario ancho" data-accion="guardar-pago">Guardar pago</button>${
           h.alEntregar ? `<button class="btn btn-texto ancho" data-accion="cerrar-hoja-pedido">Todavía no, queda por cobrar</button>` : ""
         }`,
        "cerrar-hoja-pedido",
      );
    } else if (S.hojaPedido && S.hojaPedido.tipo === "editar") {
      const h = S.hojaPedido;
      const total = PRODUCTOS.reduce((a, x) => a + (h.items[x.id] || 0) * precioDe(p, x.id), 0) + (p.envio || 0) - (p.descuento || 0);
      const cambio = PRODUCTOS.some((x) => (h.items[x.id] || 0) !== (p.items[x.id] || 0));
      const vacio = !PRODUCTOS.some((x) => h.items[x.id]);
      hojaHtml = hoja(
        "Editar pedido",
        `<h2>Editar el pedido ${num(p.n)}</h2><p class="hoja-sub">Lo que ya estaba conserva su precio; lo que agregues va al precio de hoy.</p>
         <ul class="conteo">${PRODUCTOS.map(
           (x) =>
             `<li class="conteo-fila">${ficha(x, "mini")}<span class="conteo-info"><b>${x.nombre}</b><small>${sol(precioDe(p, x.id))} c/u</small></span>${stepper(x.id, h.items[x.id] || 0, "editar-menos", "editar-mas", x.nombre, true)}</li>`,
         ).join("")}</ul>
         <p class="falta">Nuevo total: ${sol(total)}</p>
         <button class="btn btn-primario ancho" data-accion="guardar-editar"${cambio && !vacio ? "" : " disabled"}>${vacio ? "Deja al menos un alfajor" : "Guardar cambios"}</button>`,
        "cerrar-hoja-pedido",
      );
    } else if (S.hojaPedido && S.hojaPedido.tipo === "anular") {
      const h = S.hojaPedido;
      hojaHtml = hoja(
        "Anular pedido",
        `<h2>Anular el pedido ${num(p.n)}</h2><p class="hoja-sub">Los alfajores vuelven al stock. El pedido no se borra: queda como anulado, con su motivo.</p>
         <h3>Motivo</h3><div class="chips">${["El cliente canceló", "Error al anotar", "Sin stock", "Otro"]
           .map((m) => `<button class="chip" aria-pressed="${h.motivo === m}" data-accion="anular-motivo" data-v="${m}">${m}</button>`)
           .join("")}</div>
         <button class="btn btn-primario ancho peligro-solido" data-accion="guardar-anular">Anular pedido</button><button class="btn btn-texto ancho" data-accion="cerrar-hoja-pedido">No, dejarlo como está</button>`,
        "cerrar-hoja-pedido",
      );
    }
    // La acción que toca ahora queda fija abajo: el siguiente estado o, ya entregado, cobrar lo que falta
    const principal =
      accion ||
      (falta > 0 && p.estado !== "anulado" ? `<button class="btn btn-primario ancho" data-accion="abrir-pago"${sinRed ? " disabled" : ""}>${ic("hand-coins")}Registrar pago de ${sol(falta)}</button>` : "");
    return marco(
      sinRed,
      cab + (sinRed ? avisoRed("Sin conexión. Ves el pedido de las 11:32; para cambiarlo, espera la señal.") : "") + anulado + `<div class="estado-actual">${chipEstado(p.estado)}</div>` + lineaTiempo(p) + aviso + items + pagos + clienteCard + anular,
      (principal ? `<div class="pie-accion">${principal}</div>` : "") + hojaHtml,
    );
  };

  PANTALLAS.porcobrar = function (v) {
    const cab = cabForm("Por cobrar", "Lo que te deben, de todos los pedidos", "pedidos");
    if (v === "cargando") return marco(false, cab + esqTarjeta(118) + esqFilas(4, false), tabs("pedidos"));
    const sinRed = v === "sininternet";
    const deudas = v === "vacio" ? [] : S.pedidos.filter((p) => p.estado !== "anulado" && pendiente(p) > 0).sort((a, b) => pendiente(b) - pendiente(a));
    const total = deudas.reduce((a, p) => a + pendiente(p), 0);
    if (!deudas.length) {
      return marco(false, cab + `<div class="vacio">${ic("circle-check", "grande")}<h2>Nadie te debe</h2><p>Todo lo entregado está cobrado. Cuando quede un saldo, aparece aquí.</p></div>`, tabs("pedidos"));
    }
    const filas = deudas
      .map((p) => {
        const conAdelanto = pagado(p) > 0;
        const entregado = p.estado === "entregado";
        const motivo = entregado
          ? `Entregado${p.ayer ? " ayer" : ""}, quedó debiendo`
          : conAdelanto
            ? `Adelanto de ${sol(pagado(p))}${p.programado ? ", entrega " + p.programado.toLowerCase() : ""}`
            : p.tipo === "recoge"
              ? "Se cobra al recoger"
              : "Se cobra al entregar";
        const recordar = entregado || conAdelanto;
        const nombre = (p.cliente || "").split(" ")[0];
        const msg = llenar(S.mensajes.saldo, contexto(p, v));
        return `<li class="deuda"><button class="deuda-info" data-accion="ver-pedido" data-n="${p.n}"><span class="ped-num">${num(p.n)}</span><b>${p.cliente || "Cliente de mostrador"}</b><small>${motivo}</small></button><span class="deuda-der"><b>${sol(pendiente(p))}</b>${
          recordar && p.cliente
            ? `<button class="chip chip-wa" data-accion="toast" data-msg="Se abriría WhatsApp: «${msg.replace(/"/g, "&quot;")}»"${sinRed ? " disabled" : ""}>${ic("whatsapp")}Recordar a ${nombre}</button>`
            : `<small>Sin recordatorio todavía</small>`
        }</span></li>`;
      })
      .join("");
    return marco(
      sinRed,
      cab +
        (sinRed ? avisoRed("Sin conexión. Ves los saldos de las 11:32.") : "") +
        `<section class="resumen-deuda"><p>Te deben</p><b>${sol(total)}</b><small>${deudas.length} ${deudas.length === 1 ? "pedido" : "pedidos"}</small></section>` +
        `<ul class="deudas">${filas}</ul>` +
        `<p class="nota">${ic("info")}<span>El recordatorio solo aparece si ya entregaste o si recibiste un adelanto.</span></p>`,
      tabs("pedidos"),
    );
  };

  /* ---------- Pantallas: gastos ---------- */
  PANTALLAS.gastos = function (v) {
    const cab = titulo("Gastos", "Noviembre");
    if (v === "cargando") return marco(false, cab + esqTarjeta(232) + esqTarjeta(50) + esqFilas(4), tabs("mas"));
    if (v === "error") return marco(false, cab + pantallaError("los gastos"), tabs("mas"));
    if (v === "vacio") {
      return marco(
        false,
        cab +
          `<div class="vacio">${ic("receipt", "grande")}<h2>Todavía no hay gastos este mes</h2><p>Anota cada compra con su boleta. Así el reporte te dice cuánto ganas de verdad.</p><button class="btn btn-primario" data-accion="ir" data-a="gasto">${ic("plus")}Anotar un gasto</button></div>`,
        tabs("mas"),
      );
    }
    const sinRed = v === "sininternet";
    const total = gastosMes();
    const max = Math.max(...Object.keys(CATEGORIAS).map(gastoCat));
    const porCat = Object.entries(CATEGORIAS)
      .sort((a, b) => gastoCat(b[0]) - gastoCat(a[0]))
      .map(([k, c]) => `<li><span class="bh-nombre">${ic(c.i)}${c.t}</span><span class="bh-barra"><i style="width:${(gastoCat(k) / max) * 100}%"></i></span><b>${sol(gastoCat(k))}</b></li>`)
      .join("");
    const filas = S.gastos
      .map(
        (g, i) =>
          `<li><button class="mov gasto-btn${g.nuevo && i === 0 ? " nuevo-mov" : ""}${g.anulado ? " anulado" : ""}" data-accion="ver-gasto" data-i="${i}"><span class="mov-ic">${ic(CATEGORIAS[g.cat].i)}</span><span class="mov-txt"><b>${g.d}</b><span>${
            g.anulado ? "Anulado" : g.corregido ? `Corregido, antes ${sol(g.corregido)}` : `${g.t}, ${METODOS[g.m]}`
          }${g.foto ? " " + ic("camera", "foto-ic") : ""}</span></span><span class="mov-c">${g.anulado ? `<s>${sol(g.c)}</s>` : sol(g.c)}</span></button></li>`,
      )
      .join("");
    let hojaGasto = "";
    if (S.gastoEdit) {
      const g = S.gastos[S.gastoEdit.i];
      hojaGasto = hoja(
        "Gasto",
        `<h2>${g.d}</h2><p class="hoja-sub">${CATEGORIAS[g.cat].t}, ${g.t.toLowerCase()}, ${METODOS[g.m]}${g.foto ? ", con foto de la boleta" : ""}.</p>${
          g.anulado
            ? `<div class="aviso aviso-error">${ic("circle-x")}<p>Este gasto está anulado: no cuenta en los totales.</p></div>`
            : `<h3>Monto</h3><label class="entrada">S/<input type="number" min="0" step="0.5" value="${(S.gastoEdit.monto / 100).toFixed(2)}" data-input="corregir-monto" aria-label="Monto del gasto en soles"></label>${
                g.corregido ? `<p class="nota">${ic("history")}<span>Ya se corrigió: antes era ${sol(g.corregido)}.</span></p>` : ""
              }<p class="nota">${ic("lock")}<span>Nada se borra: la corrección y la anulación quedan anotadas.</span></p>
               <button class="btn btn-primario ancho" data-accion="guardar-correccion">Guardar corrección</button><button class="btn btn-texto peligro ancho" data-accion="anular-gasto">${ic("circle-x")}Anular gasto</button>`
        }`,
        "cerrar-gasto",
      );
    }
    return marco(
      sinRed,
      cab +
        (sinRed ? avisoRed("Sin conexión. Ves los gastos de las 11:32.") : "") +
        `<section class="tarjeta"><p class="kpi-etq">Gastado en noviembre</p><p class="kpi-monto">${sol(total)}</p><ul class="barras-h">${porCat}</ul></section>
         <div class="acciones"><button class="btn btn-primario ancho" data-accion="ir" data-a="gasto"${sinRed ? " disabled" : ""}>${ic("plus")}Anotar gasto</button></div>
         <section class="bloque"><div class="bloque-cab"><h2>Últimos gastos</h2><button class="link" data-accion="toast" data-msg="Se abriría la lista completa del mes">Ver todos</button></div><ul class="movs">${filas}</ul><p class="nota">${ic("info")}<span>Toca un gasto para corregirlo o anularlo.</span></p></section>`,
      tabs("mas") + hojaGasto,
    );
  };

  PANTALLAS.gasto = function (v) {
    const g = S.gastoNuevo;
    const cab = cabForm("Anotar gasto", "Hoy, miércoles 18 de noviembre", "gastos");
    const sinRed = v === "sininternet";
    const cuerpo =
      (sinRed ? avisoRed("Sin conexión. El gasto queda en borrador y lo guardas cuando vuelva la señal.") : "") +
      (v === "error" ? `<div class="aviso aviso-error">${ic("circle-alert")}<p>No se pudo guardar el gasto. Tus datos siguen aquí: vuelve a intentar.</p></div>` : "") +
      `<label class="monto-grande"><span>S/</span><input type="number" min="0" step="0.5" value="${(g.monto / 100).toFixed(2)}" data-input="gasto-monto" aria-label="Monto del gasto en soles"></label>
       <section class="campo"><h3>Tipo de gasto</h3><div class="chips">${Object.entries(CATEGORIAS)
         .map(([k, c]) => `<button class="chip" aria-pressed="${g.cat === k}" data-accion="gasto-cat" data-v="${k}">${ic(c.i)}${c.t}</button>`)
         .join("")}</div><p class="nota">${ic("pen-line")}<span>Los tipos de gasto se cambian en Ajustes.</span></p></section>
       <section class="campo"><h3>En qué</h3><label class="entrada">${ic("notebook-pen")}<input value="${g.nota}" data-input="gasto-nota" aria-label="En qué se gastó" placeholder="Por ejemplo, chocolate de cobertura"></label></section>
       <section class="campo"><h3>Cómo pagaste</h3><div class="chips">${mediosVisibles()
         .map(([k, t]) => `<button class="chip" aria-pressed="${g.m === k}" data-accion="gasto-medio" data-v="${k}">${t}</button>`)
         .join("")}</div></section>
       <section class="campo"><h3>Boleta</h3>${
         g.foto
           ? `<div class="foto-boleta"><span class="fb-img">${ic("receipt")}</span><span><b>Foto de la boleta</b><small>Se guarda junto al gasto</small></span><button class="link" data-accion="gasto-foto">Quitar</button></div>`
           : `<button class="fila-boton" data-accion="gasto-foto">${ic("camera")}Tomar foto de la boleta</button>`
       }</section>`;
    const pie = `<div class="pie-accion"><button class="btn btn-primario ancho" data-accion="guardar-gasto"${sinRed || !g.monto ? " disabled" : ""}>${
      v === "error" ? ic("refresh-cw") + "Reintentar" : "Guardar gasto de " + sol(g.monto)
    }</button></div>`;
    return marco(sinRed, cab + cuerpo, pie);
  };

  /* ---------- Pantallas: reportes ---------- */
  PANTALLAS.reportes = function (v) {
    const periodo = `<div class="segmentos" role="radiogroup" aria-label="Periodo">${[
      ["semana", "Semana"],
      ["mes", "Mes"],
      ["elegir", "Elegir fechas"],
    ]
      .map(([k, t]) => `<button role="radio" aria-checked="${S.periodo === k}" data-accion="periodo" data-v="${k}">${t}</button>`)
      .join("")}</div>`;
    const cab = titulo("Reportes", S.periodo === "semana" ? "Del lunes 16 a hoy" : "Noviembre, hasta hoy");
    if (v === "cargando") return marco(false, cab + periodo + esqTarjeta(128) + `<div class="esq-par">${esqTarjeta(92)}${esqTarjeta(92)}</div>` + esqTarjeta(196), tabs("mas"));
    if (v === "error") return marco(false, cab + pantallaError("los reportes"), tabs("mas"));
    if (v === "vacio") {
      return marco(false, cab + periodo + `<div class="vacio">${ic("chart-column", "grande")}<h2>Todavía no hay datos</h2><p>Cuando anotes pedidos y gastos, aquí verás cuánto entra, cuánto sale y cuánto ganas.</p></div>`, tabs("mas"));
    }
    const sinRed = v === "sininternet";
    const semana = S.periodo === "semana";
    const gastosSemana = S.gastos.filter((g) => g.semana && !g.anulado).reduce((a, g) => a + g.c, 0);
    const ingresos = semana ? 31200 + 48100 + cobrosHoy().reduce((a, x) => a + x.c, 0) : ingresosMes();
    const gastos = semana ? gastosSemana : gastosMes();
    const ganancia = ingresos - gastos;
    const ANTES = semana ? { i: 90500, g: 21000, t: "la semana pasada" } : { i: 311200, g: 118000, t: "octubre" };
    const delta = (actual, antes, subirEsBueno) => {
      const pct = Math.round(((actual - antes) / antes) * 100);
      const tono = pct === 0 ? "" : (pct > 0) === subirEsBueno ? " bien" : " ojo";
      return `<span class="delta${tono}">${ic(pct >= 0 ? "trending-up" : "trending-down")}${pct > 0 ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct)} % frente a ${ANTES.t}</span>`;
    };
    const barras = semana
      ? [
          ["Lun", 31200, 3000],
          ["Mar", 48100, 4500],
          ["Hoy", cobrosHoy().reduce((a, x) => a + x.c, 0), S.gastos.filter((g) => g.hoy && !g.anulado).reduce((a, g) => a + g.c, 0)],
        ]
      : [
          ["1 al 7", 118000, 41000],
          ["8 al 14", 132000, 41600],
          ["15 a hoy", ingresos - 118000 - 132000, gastos - 41000 - 41600],
        ];
    const maxB = Math.max(...barras.flatMap((b) => [b[1], b[2]]));
    const sel = Math.min(S.barraSel ?? barras.length - 1, barras.length - 1);
    const nombreBarra = (t) => ({ Lun: "El lunes", Mar: "El martes", Hoy: "Hoy" })[t] || `Del ${t}`;
    const grafico = `<section class="bloque"><div class="bloque-cab"><h2>Entra y sale</h2><span class="leyenda-mini"><i class="lm-in"></i>Ingresos <i class="lm-out"></i>Gastos</span></div>
      <p class="grafico-dato" aria-live="polite">${nombreBarra(barras[sel][0])} entró <b>${sol(barras[sel][1])}</b> y salió <b>${sol(barras[sel][2])}</b>.</p>
      <div class="grafico">${barras
        .map(
          ([t, i, g], k) =>
            `<button class="g-col${k === sel ? " sel" : ""}" data-accion="barra" data-v="${k}" aria-pressed="${k === sel}" aria-label="${nombreBarra(t)}: entró ${sol(i)}, salió ${sol(g)}"><span class="g-par"><i class="g-in" style="--h:${(i / maxB) * 100}%"></i><i class="g-out" style="--h:${(g / maxB) * 100}%"></i></span><small>${t}</small></button>`,
        )
        .join("")}</div></section>`;
    const metodos = Object.keys(METODOS).map((m) => [m, semana ? 0 : COBRADO_ANTES[m] + cobradoHoyPor(m)]);
    const maxM = Math.max(...metodos.map((x) => x[1]), 1);
    const porMedio = semana
      ? ""
      : `<section class="bloque"><div class="bloque-cab"><h2>Por medio de pago</h2></div><ul class="barras-h tarjeta">${metodos
          .map(([m, c]) => `<li><span class="bh-nombre"><i class="punto-m m-${m}"></i>${METODOS[m]}</span><span class="bh-barra"><i class="m-${m}" style="width:${(c / maxM) * 100}%"></i></span><b>${sol(c)}</b></li>`)
          .join("")}</ul></section>`;
    return marco(
      sinRed,
      cab +
        (sinRed ? avisoRed("Sin conexión. Ves los números de las 11:32.") : "") +
        periodo +
        `<section class="kpis"><div class="kpi kpi-ganancia"><p>Ganancia</p><b>${sol(ganancia)}</b><small>Ingresos menos gastos</small>${delta(ganancia, ANTES.i - ANTES.g, true)}</div><div class="kpi"><p>Ingresos</p><b>${sol(ingresos)}</b><small>Pagos recibidos</small>${delta(ingresos, ANTES.i, true)}</div><div class="kpi"><p>Gastos</p><b>${sol(gastos)}</b><small>Lo anotado</small>${delta(gastos, ANTES.g, false)}</div></section>` +
        grafico +
        porMedio +
        `<div class="acciones"><button class="btn btn-secundario ancho" data-accion="ir" data-a="ranking">${ic("cookie")}Ver alfajores</button><button class="btn btn-secundario ancho" data-accion="toast" data-msg="Se descargaría un archivo de Excel (CSV) de noviembre">${ic("download")}Exportar</button></div>`,
      tabs("mas"),
    );
  };

  PANTALLAS.ranking = function (v) {
    const cab = cabForm("Alfajores", "Noviembre, pedidos entregados", "reportes");
    if (v === "cargando") return marco(false, cab + esqTarjeta(48) + esqFilas(5) + esqTarjeta(130));
    const porSoles = S.rankingPor === "soles";
    const filas = PRODUCTOS.map((p) => ({ p, u: RANKING[p.id], s: RANKING[p.id] * p.precio })).sort((a, b) => (porSoles ? b.s - a.s : b.u - a.u));
    const max = porSoles ? filas[0].s : filas[0].u;
    const toggle = `<div class="segmentos" role="radiogroup" aria-label="Ver por">${[
      ["unidades", "Unidades"],
      ["soles", "Soles"],
    ]
      .map(([k, t]) => `<button role="radio" aria-checked="${S.rankingPor === k}" data-accion="ranking-por" data-v="${k}">${t}</button>`)
      .join("")}</div>`;
    const ranking = `<ol class="ranking tarjeta">${filas
      .map(
        (f, i) =>
          `<li><span class="rk-pos">${i + 1}</span>${ficha(f.p, "mini")}<span class="rk-info"><b>${f.p.nombre}</b><span class="bh-barra"><i style="width:${((porSoles ? f.s : f.u) / max) * 100}%"></i></span></span><b class="rk-valor">${porSoles ? sol(f.s) : f.u}</b></li>`,
      )
      .join("")}</ol>`;
    const totalCanales = CANALES.reduce((a, c) => a + c[1], 0);
    const canales = `<section class="bloque"><div class="bloque-cab"><h2>Por dónde llegan los pedidos</h2></div><div class="tarjeta"><div class="barra-canales" aria-hidden="true">${CANALES.map(
      (c, i) => `<i class="c${i}" style="width:${(c[1] / totalCanales) * 100}%"></i>`,
    ).join("")}</div><ul class="canales">${CANALES.map((c, i) => `<li><i class="punto-c c${i}"></i>${ic(c[2])}${c[0]}<b>${c[1]} pedidos</b></li>`).join("")}</ul></div></section>`;
    const ganancia =
      v === "sincostos"
        ? `<section class="bloque"><div class="bloque-cab"><h2>Ganancia por alfajor</h2></div><div class="vacio-chico">Pon un costo aproximado a cada alfajor en Productos y aquí verás cuánto ganas con cada uno.<button class="btn btn-primario ancho" data-accion="ir" data-a="productos">${ic("settings")}Ir a Productos</button></div></section>`
        : `<section class="bloque"><div class="bloque-cab"><h2>Ganancia por alfajor</h2></div><ul class="movs">${PRODUCTOS.map((p) => {
            if (!p.costo) return `<li class="mov">${ficha(p, "mini")}<span class="mov-txt"><b>${p.nombre}</b><span>Sin costo: ponlo en Productos</span></span><span class="mov-c">—</span></li>`;
            const margen = p.precio - p.costo;
            return `<li class="mov">${ficha(p, "mini")}<span class="mov-txt"><b>${p.nombre}</b><span>Gana ${sol(margen)} por alfajor (cuesta ${sol(p.costo)})</span></span><span class="mov-c mas">${sol(margen * RANKING[p.id])}</span></li>`;
          }).join("")}</ul><p class="nota">${ic("info")}<span>Con el costo aproximado de cada alfajor, que se cambia en Productos.</span></p></section>`;
    return marco(false, cab + toggle + ranking + canales + ganancia);
  };

  /* ---------- Pantallas: clientes y fidelidad ---------- */
  PANTALLAS.clientes = function (v) {
    const cab = titulo("Clientes", `${CLIENTES.length} clientes`);
    if (v === "cargando") return marco(false, cab + esqTarjeta(46) + esqueleto([[80, 36]]) + esqFilas(6), tabs("mas"));
    if (v === "vacio") {
      return marco(false, cab + `<div class="vacio">${ic("users-round", "grande")}<h2>Todavía no hay clientes</h2><p>Se registran solos al anotar un pedido con su teléfono.</p></div>`, tabs("mas"));
    }
    const sinRed = v === "sininternet";
    const filtros = [
      ["todos", "Todos"],
      ["top", "Los que más compran"],
      ["novuelven", "No vuelven"],
    ];
    let lista = CLIENTES.slice();
    if (S.filtroClientes === "top") lista = lista.sort((a, b) => b.gastado - a.gastado).slice(0, 5);
    else if (S.filtroClientes === "novuelven") lista = lista.filter((c) => c.dias > 30);
    else lista = lista.sort((a, b) => a.dias - b.dias);
    const filas = lista
      .map((c, i) => {
        const fila = `<button class="cli-fila" data-accion="ver-cliente" data-id="${c.id}"><span class="avatar${c.dias > 30 ? " apagado" : ""}">${iniciales(c.nombre)}</span><span class="cli-info"><b>${S.filtroClientes === "top" ? `${i + 1}. ` : ""}${c.nombre}</b><small>${c.pedidos} ${c.pedidos === 1 ? "pedido" : "pedidos"}, último ${c.ultimo.toLowerCase()}</small></span><span class="cli-monto">${sol(c.gastado)}</span></button>`;
        if (S.filtroClientes !== "novuelven") return `<li>${fila}</li>`;
        const msg = llenar(S.mensajes.extranamos, { nombre: c.nombre.split(" ")[0] });
        return `<li class="cli-li">${fila}${
          c.promos
            ? `<button class="chip chip-wa" data-accion="toast" data-msg="Se abriría WhatsApp: «${msg}»"${sinRed ? " disabled" : ""}>${ic("whatsapp")}Escribirle</button>`
            : `<small class="sin-permiso">Sin permiso para promociones</small>`
        }</li>`;
      })
      .join("");
    const nota =
      S.filtroClientes === "novuelven"
        ? `<p class="nota">${ic("info")}<span>Solo puedes escribirles una promoción a quienes aceptaron recibirlas.</span></p>`
        : "";
    return marco(
      sinRed,
      cab +
        (sinRed ? avisoRed("Sin conexión. Ves los clientes de las 11:32.") : "") +
        `<label class="entrada buscar">${ic("search")}<input placeholder="Buscar por nombre o teléfono" aria-label="Buscar clientes"></label>` +
        `<div class="chips filtros">${filtros.map(([k, t]) => `<button class="chip" aria-pressed="${S.filtroClientes === k}" data-accion="filtro-clientes" data-v="${k}">${t}</button>`).join("")}</div>` +
        `<ul class="clientes-lista">${filas}</ul>` +
        nota,
      tabs("mas"),
    );
  };

  function tarjetaSellos(c, vista) {
    if (!fidelidadActiva(vista)) return "";
    const meta = S.fidelidad.meta;
    const tiene = Math.min(c.sellos, meta);
    const falta = meta - tiene;
    return `<section class="sellos-tarjeta"><div class="bloque-cab"><h2>Tarjeta de sellos</h2><span>${tiene} de ${meta}</span></div><ol class="sellos">${Array.from(
      { length: meta },
      (_, i) => `<li class="${i < tiene ? "lleno" : ""}">${ic(i < tiene ? "cookie" : "dot")}</li>`,
    ).join("")}</ol><p>${falta ? `Le ${falta === 1 ? "falta 1 compra" : `faltan ${falta} compras`} para su premio: ${PREMIOS[S.fidelidad.premio].toLowerCase()}.` : "Premio listo: se aplica como descuento en su próximo pedido."}</p></section>`;
  }

  PANTALLAS.cliente = function (v) {
    const c = CLIENTES.find((x) => x.id === S.clienteSel);
    const cab = cabForm(c.nombre, c.tel, "clientes");
    if (v === "cargando") return marco(false, cab + esqTarjeta(50) + esqTarjeta(72) + esqTarjeta(176) + esqFilas(3, false));
    const sinRed = v === "sininternet";
    if (c.borrado) {
      return marco(
        false,
        cab +
          `<div class="aviso aviso-error">${ic("shield-check")}<p>Datos borrados hoy, a pedido del cliente. Sus pedidos siguen en las cuentas como «Cliente borrado».</p></div>` +
          `<div class="stats"><div><b>${c.pedidos}</b><span>pedidos</span></div><div><b>${sol(c.gastado).replace(".00", "")}</b><span>gastado</span></div><div><b>—</b><span>contacto</span></div></div>`,
      );
    }
    const hojaBorrar =
      S.hojaCliente === "borrar"
        ? hoja(
            "Borrar datos del cliente",
            `<h2>Borrar los datos de ${c.nombre}</h2><p class="hoja-sub">Se borran su nombre, teléfono, dirección y notas. Sus pedidos quedan en las cuentas como «Cliente borrado». No se puede deshacer.</p><button class="btn ancho peligro-solido" data-accion="borrar-cliente">${ic("trash-2")}Borrar sus datos</button><button class="btn btn-texto ancho" data-accion="cerrar-hoja-cliente">Cancelar</button>`,
            "cerrar-hoja-cliente",
          )
        : "";
    const actuales = S.pedidos.filter((p) => p.cliente === c.nombre).sort((a, b) => b.n - a.n);
    const historial =
      actuales
        .map((p) => `<li class="mov"><span class="mov-ic">${ic("clipboard-list")}</span><span class="mov-txt"><b>${num(p.n)}</b><span>${p.programado ? p.programado : p.ayer ? "Ayer" : "Hoy"}</span></span><span class="cli-hist-der">${chipEstado(p.estado)}<b>${sol(p.total)}</b></span></li>`)
        .join("") +
      c.pasados
        .map(([n, f, t]) => `<li class="mov"><span class="mov-ic">${ic("clipboard-list")}</span><span class="mov-txt"><b>${num(n)}</b><span>${f}</span></span><span class="cli-hist-der">${chipEstado("entregado")}<b>${sol(t)}</b></span></li>`)
        .join("");
    return marco(
      sinRed,
      cab +
        (sinRed ? avisoRed("Sin conexión. Ves la ficha de las 11:32.") : "") +
        `<div class="acciones"><button class="btn btn-whatsapp ancho" data-accion="toast" data-msg="Se abriría el chat de WhatsApp con ${c.nombre.split(" ")[0]}">${ic("whatsapp")}WhatsApp</button><button class="btn btn-secundario ancho" data-accion="toast" data-msg="Se llamaría a ${c.tel}">${ic("phone")}Llamar</button></div>` +
        `<div class="stats"><div><b>${c.pedidos}</b><span>pedidos</span></div><div><b>${sol(c.gastado).replace(".00", "")}</b><span>gastado</span></div><div><b>${c.ultimo.split(",")[0]}</b><span>último</span></div></div>` +
        tarjetaSellos(c, v) +
        `<p class="nota">${ic("heart")}<span>Su favorito: ${c.favorito}.${c.direccion ? ` Dirección: ${c.direccion}.` : ""}</span></p>` +
        (c.nota ? `<p class="nota">${ic("pen-line")}<span>${c.nota}</span></p>` : "") +
        `<div class="fila-switch"><span><b>Acepta recibir promociones</b><small>Si no, solo se le escribe por sus pedidos.</small></span>${interruptor("promos", c.promos, "Acepta recibir promociones")}</div>` +
        `<section class="bloque"><div class="bloque-cab"><h2>Sus pedidos</h2></div><ul class="movs">${historial}</ul></section>` +
        `<button class="btn btn-texto peligro ancho" data-accion="abrir-borrar-cliente"${sinRed ? " disabled" : ""}>${ic("trash-2")}Borrar datos de este cliente</button>` +
        `<p class="nota">${ic("info")}<span>Si un cliente pide que borren sus datos, la ley de datos personales le da ese derecho.</span></p>`,
      hojaBorrar,
    );
  };

  PANTALLAS.fidelidad = function (v) {
    const cab = cabForm("Fidelidad", "Tarjeta de sellos", "ajustes");
    if (v === "cargando") return marco(false, cab + esqTarjeta(76) + esqTarjeta(90) + esqTarjeta(230));
    const activa = fidelidadActiva(v);
    const f = S.fidelidad;
    const cerca = CLIENTES.filter((c) => c.sellos >= f.meta - 2).sort((a, b) => b.sellos - a.sellos);
    const config = activa
      ? `<section class="campo"><h3>Sellos para el premio</h3><div class="fila-merma"><span>Cada compra suma un sello</span>${stepper("meta", f.meta, "meta-menos", "meta-mas", "sellos para el premio", true)}</div></section>
         <section class="campo"><h3>Premio</h3><div class="chips">${Object.entries(PREMIOS)
           .map(([k, t]) => `<button class="chip" aria-pressed="${f.premio === k}" data-accion="premio" data-v="${k}">${t}</button>`)
           .join("")}</div></section>
         <section class="sellos-tarjeta"><div class="bloque-cab"><h2>Así la ve el cliente</h2><span>6 de ${f.meta}</span></div><ol class="sellos">${Array.from(
           { length: f.meta },
           (_, i) => `<li class="${i < 6 ? "lleno" : ""}">${ic(i < 6 ? "cookie" : "dot")}</li>`,
         ).join("")}</ol><p>Al completar: ${PREMIOS[f.premio].toLowerCase()}, como descuento con el motivo «fidelidad».</p></section>
         <section class="bloque"><div class="bloque-cab"><h2>Cerca del premio</h2></div><ul class="movs">${
           cerca.length
             ? cerca
                 .map((c) => {
                   const falta = Math.max(0, f.meta - c.sellos);
                   return `<li class="mov"><span class="avatar">${iniciales(c.nombre)}</span><span class="mov-txt"><b>${c.nombre}</b><span>${falta ? `Le ${falta === 1 ? "falta 1" : `faltan ${falta}`}` : "Premio listo"}</span></span><span class="mov-c">${Math.min(c.sellos, f.meta)}/${f.meta}</span></li>`;
                 })
                 .join("")
             : `<li class="mov"><span class="mov-txt"><b>Nadie todavía</b><span>Aparecen aquí cuando les faltan 2 o menos.</span></span></li>`
         }</ul></section>`
      : `<div class="vacio">${ic("star", "grande")}<h2>La fidelidad está apagada</h2><p>Enciéndela cuando decidas la meta y el premio. Mientras tanto, no aparece en los pedidos ni en las fichas.</p></div>`;
    return marco(
      false,
      cab +
        `<div class="fila-switch"><span><b>Fidelidad activa</b><small>Regla de ejemplo: el dueño define la meta y el premio.</small></span>${interruptor("fidelidad", activa, "Fidelidad activa")}</div>` +
        config,
    );
  };

  /* ---------- Pantallas: ajustes ---------- */
  PANTALLAS.ajustes = function (v) {
    if (v === "cargando") return marco(false, titulo("Más", "Don Pipos") + esqTarjeta(62) + esqFilas(4, false) + esqFilas(6, false), tabs("mas"));
    const sinRed = v === "sininternet";
    const filaHoja = (icono, texto, valor, clave) =>
      `<li><button class="aj-fila" data-accion="ajuste-hoja" data-v="${clave}">${ic(icono)}<span>${texto}</span>${valor ? `<small>${valor}</small>` : ""}${ic("chevron-right", "aj-flecha")}</button></li>`;
    let hojaAjuste = "";
    if (S.ajusteHoja === "tipos") {
      hojaAjuste = `<h2>Tipos de gasto</h2><p class="hoja-sub">Los que eliges al anotar un gasto.</p><ul class="movs">${Object.entries(CATEGORIAS)
        .map(([k, c]) => `<li class="mov"><span class="mov-ic">${ic(c.i)}</span><span class="mov-txt"><b>${c.t}</b><span>${S.gastos.filter((g) => g.cat === k && !g.anulado).length} gastos recientes</span></span>${ic("pencil", "aj-flecha")}</li>`)
        .join("")}</ul><button class="fila-boton" style="margin-top:12px" data-accion="toast" data-msg="Se abriría el formulario para un tipo de gasto nuevo">${ic("plus")}Agregar tipo de gasto</button>`;
    } else if (S.ajusteHoja === "medios") {
      hojaAjuste = `<h2>Medios de pago</h2><p class="hoja-sub">Los que apagues dejan de aparecer al anotar pedidos y gastos.</p><ul class="movs">${Object.entries(METODOS)
        .map(([k, t]) => `<li class="mov"><span class="mov-txt"><b>${t}</b></span>${interruptor("medio", S.mediosActivos[k], t, ` data-v="${k}"`)}</li>`)
        .join("")}</ul>`;
    } else if (S.ajusteHoja === "delivery") {
      hojaAjuste = `<h2>Delivery</h2><p class="hoja-sub">Lo que cobras por llevar un pedido. Se suma solo al elegir delivery.</p><h3>Costo</h3><label class="entrada">S/<input type="number" min="0" step="0.5" value="${(S.envio / 100).toFixed(2)}" data-input="envio" aria-label="Costo del delivery en soles"></label><p class="nota">${ic("map-pin")}<span>Zona de reparto: por definir con el dueño.</span></p>`;
    } else if (S.ajusteHoja === "recordatorios") {
      hojaAjuste = `<h2>Recordatorios</h2><p class="hoja-sub">Avisos del propio celular, aunque la app esté cerrada.</p><ul class="movs">${[
        ["programados", "Pedidos para otro día", "El día antes, a las 18:00"],
        ["stock", "Alfajores que se acaban", "Cuando quedan para un día o menos"],
        ["saldos", "Saldos pendientes", "Si alguien debe desde hace un día"],
      ]
        .map(([k, t, d]) => `<li class="mov"><span class="mov-txt"><b>${t}</b><span>${d}</span></span>${interruptor("recordatorio", S.recordatorios[k], t, ` data-v="${k}"`)}</li>`)
        .join("")}</ul>`;
    } else if (S.ajusteHoja === "bloqueo") {
      hojaAjuste = `<h2>Pedir huella o PIN</h2><p class="hoja-sub">Cuánto tiempo puede quedar la app en segundo plano antes de pedirlos otra vez.</p><div class="chips">${Object.entries(BLOQUEOS)
        .map(([k, t]) => `<button class="chip" aria-pressed="${S.bloqueo === Number(k)}" data-accion="bloqueo" data-v="${k}">${t}</button>`)
        .join("")}</div><p class="nota">${ic("shield-check")}<span>Aunque el celular esté desbloqueado, la app pide tu huella o PIN al volver.</span></p>`;
    } else if (S.ajusteHoja === "produccion") {
      hojaAjuste = `<h2>Producción</h2><p class="hoja-sub">La sugerencia cubre los días hasta tu siguiente tanda.</p><div class="fila-merma"><span>Produces cada</span>${stepper("dias", S.diasProduccion, "dias-menos", "dias-mas", "días entre producciones", true)}</div><p class="nota">${ic("info")}<span>${S.diasProduccion === 1 ? "Produces todos los días" : `Cada ${S.diasProduccion} días`}: Inicio y Stock sugieren para ese periodo.</span></p>`;
    }
    const hojaAj = hojaAjuste ? hoja("Ajuste", hojaAjuste + `<button class="btn btn-primario ancho" data-accion="cerrar-ajuste">Listo</button>`, "cerrar-ajuste") : "";
    const fila = (icono, texto, valor, destino, extra) =>
      `<li><button class="aj-fila"${destino ? ` data-accion="ir" data-a="${destino}"` : extra ? ` data-accion="toast" data-msg="${extra}"` : ""}>${ic(icono)}<span>${texto}</span>${valor ? `<small>${valor}</small>` : ""}${ic("chevron-right", "aj-flecha")}</button></li>`;
    return marco(
      sinRed,
      titulo("Más", "Don Pipos") +
        (sinRed ? avisoRed("Sin conexión. Los cambios esperan a que vuelva la señal.") : "") +
        `<div class="respaldo">${ic("shield-check")}<span><b>Tus datos están respaldados</b><small>Última copia de seguridad: hoy, 03:00</small></span></div>` +
        `<section class="grupo"><h2>Tu negocio</h2><ul>${fila("receipt", "Gastos", sol(gastosMes()), "gastos")}${fila("chart-column", "Reportes", "Noviembre", "reportes")}${fila("users-round", "Clientes", `${CLIENTES.length}`, "clientes")}${fila("hand-coins", "Por cobrar", "", "porcobrar")}${fila("calculator", "Cuadre de caja", S.caja.cerrado ? "Cerrado" : "Hoy", "caja")}</ul></section>
         <section class="grupo"><h2>Ajustes</h2><ul>${fila("cookie", "Productos y precios", `${PRODUCTOS.length} alfajores`, "productos")}${filaHoja("tags", "Tipos de gasto", `${Object.keys(CATEGORIAS).length}`, "tipos")}${filaHoja("wallet", "Medios de pago", `${mediosVisibles().length}`, "medios")}${filaHoja("motorbike", "Delivery", sol(S.envio), "delivery")}${filaHoja("chef-hat", "Producción", S.diasProduccion === 1 ? "Cada día" : `Cada ${S.diasProduccion} días`, "produccion")}${filaHoja("bell", "Recordatorios", `${Object.values(S.recordatorios).filter(Boolean).length} activos`, "recordatorios")}${fila("message-square-text", "Mensajes de WhatsApp", "5", "mensajes")}${fila("star", "Fidelidad", S.fidelidad.activa ? `${S.fidelidad.meta} sellos` : "Apagada", "fidelidad")}</ul></section>
         <section class="grupo"><h2>Cuenta</h2><ul><li><div class="aj-fila">${ic("smartphone")}<span>Tu número</span><small>+51 ${NUMERO}</small></div></li><li><div class="aj-fila">${ic("fingerprint")}<span>Entrar con huella</span>${interruptor("huella", S.huella, "Entrar con huella")}</div></li>${filaHoja("timer", "Pedir huella o PIN", BLOQUEOS[S.bloqueo], "bloqueo")}${fila("key-round", "Cambiar PIN", "", "", "Te pediría tu PIN actual y luego el nuevo, dos veces; se cambia en el servidor")}<li><button class="aj-fila" data-accion="ingresar-de-nuevo">${ic("log-out")}<span>Cerrar sesión en este celular</span>${ic("chevron-right", "aj-flecha")}</button></li></ul></section>
         <section class="grupo"><h2>Ayuda</h2><ul>${fila("whatsapp", "Soporte por WhatsApp", "", "", "Se abriría WhatsApp con soporte")}${fila("download", "Exportar a Excel", "", "", "Se descargaría un archivo de Excel (CSV)")}</ul></section>
         <p class="version">Versión 1.0 (prototipo)</p>`,
      tabs("mas") + hojaAj,
    );
  };

  PANTALLAS.productos = function (v) {
    const cab = cabForm("Productos y precios", "Se copian solos a la web", "ajustes");
    if (v === "cargando") return marco(false, cab + esqTarjeta(70) + esqFilas(5));
    const sinRed = v === "sininternet";
    const filas = PRODUCTOS.map(
      (p) =>
        `<li><button class="prod prod-btn" data-accion="editar-producto" data-id="${p.id}">${ficha(p)}<span class="prod-info"><b>${p.nombre}</b><span>${sol(p.precio)}</span><small class="prod-extra">Mínimo ${p.minimo}, cuesta ${p.costo ? sol(p.costo) : "sin definir"}</small></span><span class="web ${p.web ? "web-on" : "web-off"}">${ic("link")}${p.web ? "En la web" : "Oculto"}</span></button></li>`,
    ).join("");
    let hojaHtml = "";
    if (S.productoEdit) {
      const p = P[S.productoEdit];
      hojaHtml = hoja(
        "Editar producto",
        `<h2>${p.nombre}</h2>
         <h3>Precio</h3><label class="entrada">S/<input type="number" min="0.5" step="0.5" value="${(p.precio / 100).toFixed(2)}" data-input="precio" aria-label="Precio en soles"></label>
         <h3>Costo aproximado</h3><label class="entrada">S/<input type="number" min="0" step="0.1" value="${p.costo ? (p.costo / 100).toFixed(2) : ""}" data-input="costo" aria-label="Costo aproximado en soles" placeholder="Para ver tu ganancia"></label>
         <div class="fila-merma"><span>Stock mínimo</span>${stepper("min", p.minimo, "min-menos", "min-mas", "stock mínimo", true)}</div>
         <div class="fila-switch"><span><b>Mostrar en la web</b><small>Si lo apagas, desaparece de la web.</small></span>${interruptor("web", p.web, "Mostrar en la web")}</div>
         <p class="nota">${ic("lock")}<span>Los pedidos ya anotados mantienen su precio.</span></p>
         <button class="btn btn-primario ancho" data-accion="guardar-producto">Guardar</button>`,
        "cerrar-producto",
      );
    }
    return marco(
      sinRed,
      cab +
        (sinRed ? avisoRed("Sin conexión. Los cambios de precio esperan a que vuelva la señal.") : "") +
        `<div class="info">${ic("info")}<p>El precio y si está disponible se ven en la web en unos segundos. Las fotos y descripciones se cambian en el panel de la web.</p></div>` +
        `<ul class="prods">${filas}</ul>` +
        `<button class="fila-boton" style="margin-top:14px" data-accion="toast" data-msg="Se abriría el formulario para un producto nuevo">${ic("plus")}Agregar producto</button>`,
      hojaHtml,
    );
  };

  PANTALLAS.mensajes = function (v) {
    const cab = cabForm("Mensajes de WhatsApp", "Lo que le llega al cliente en cada paso", "ajustes");
    if (v === "cargando") return marco(false, cab + esqFilas(6, false));
    const ejemplo = pedidoN(42);
    const filas = Object.keys(MENSAJES_T)
      .map((k) => {
        const abierto = S.mensajeSel === k;
        const ctx = contexto(ejemplo, "datos");
        return `<li class="msj${abierto ? " abierto" : ""}"><button class="msj-cab" aria-expanded="${abierto}" data-accion="mensaje-sel" data-v="${k}"><b>${MENSAJES_T[k]}</b>${
          abierto ? "" : `<small>${S.mensajes[k].slice(0, 46)}…</small>`
        }${ic("chevron-down", "msj-flecha")}</button>${
          abierto
            ? `<div class="msj-cuerpo"><textarea data-input="mensaje" aria-label="Texto del mensaje ${MENSAJES_T[k]}" rows="4">${S.mensajes[k]}</textarea>
               <div class="chips variables">${["nombre", "numero", "detalle", "total", "adelanto", "entrega", "pago", "falta", "sellos"]
                 .map((x) => `<button class="chip" data-accion="variable" data-v="${x}">{${x}}</button>`)
                 .join("")}</div>
               <h3>Así le llega (con el pedido #0042)</h3>${burbuja(llenar(S.mensajes[k], ctx))}
               ${S.mensajes[k] !== MENSAJES_BASE[k] ? `<button class="link" data-accion="mensaje-reset">Volver al texto original</button>` : ""}</div>`
            : ""
        }</li>`;
      })
      .join("");
    return marco(false, cab + `<ul class="msjs">${filas}</ul>`);
  };

  /* ---------- Detalles que se sienten ---------- */
  PANTALLAS.recordatorios = function () {
    const evento = S.pedidos.find((x) => x.programado && x.estado !== "anulado");
    const poco = PRODUCTOS.filter((x) => x.stock > 0 && x.stock < x.minimo);
    const deudor = S.pedidos.find((x) => x.ayer && x.estado === "entregado" && pendiente(x) > 0);
    const avisos = [
      S.recordatorios.programados && evento
        ? `<button class="notif" data-accion="ver-pedido" data-n="${evento.n}"><img src="img/logo.png" alt=""><span><small><span>Don Pipos</span><span>ayer, 18:00</span></small><b>Mañana a las 10:00: pedido de ${evento.cliente}</b><span>${Object.values(evento.items).reduce((a, n) => a + n, 0)} alfajores para recoger. Falta cobrar ${sol(pendiente(evento))}.</span></span></button>`
        : "",
      S.recordatorios.stock && poco.length
        ? `<button class="notif" data-accion="detalle" data-id="${poco[0].id}"><img src="img/logo.png" alt=""><span><small><span>Don Pipos</span><span>hace 5 min</span></small><b>${poco[0].nombre} se está acabando</b><span>Quedan ${poco[0].stock}. Toca para ver cuánto conviene producir.</span></span></button>`
        : "",
      S.recordatorios.saldos && deudor
        ? `<button class="notif" data-accion="ir" data-a="porcobrar"><img src="img/logo.png" alt=""><span><small><span>Don Pipos</span><span>09:00</span></small><b>${deudor.cliente} te debe ${sol(pendiente(deudor))}</b><span>Desde ayer. Toca para enviarle un recordatorio.</span></span></button>`
        : "",
    ].filter(Boolean);
    return `<div class="notif-fondo">${barra(false)}<div class="notif-hora"><b>11:40</b><span>Miércoles 18 de noviembre</span></div><div class="notifs">${
      avisos.length ? avisos.join("") : `<p class="notif-vacio">Sin avisos de Don Pipos.</p>`
    }</div><p class="notif-pie">Son avisos del propio celular: funcionan aunque la app esté cerrada.</p></div>`;
  };
  PANTALLAS.grande = () => PANTALLAS.inicio("datos");

  /* ---------- Pantallas: acceso ---------- */
  PANTALLAS.puesta = function () {
    const pz = S.puesta;
    if (pz.paso > 3) {
      return marco(
        false,
        `<div class="vacio">${ic("circle-check", "grande")}<h2>Todo listo</h2><p>Ya puedes anotar tu primer pedido. Lo que cargaste se cambia cuando quieras en Ajustes.</p><button class="btn btn-primario" data-accion="puesta-a-inicio">${ic("house")}Ir a Inicio</button><button class="btn btn-texto" data-accion="puesta-reiniciar">${ic("rotate-ccw")}Ver de nuevo</button></div>`,
      );
    }
    const cab = `<div class="puesta-cab">${
      pz.paso > 1 ? `<button class="btn-icono" aria-label="Paso anterior" data-accion="puesta-atras">${ic("arrow-left")}</button>` : `<img src="img/logo.png" alt="">`
    }<p>Paso ${pz.paso} de 3</p></div><div class="puesta-barra" aria-hidden="true">${[1, 2, 3].map((i) => `<i class="${i <= pz.paso ? "lleno" : ""}"></i>`).join("")}</div>`;
    let cuerpo = "";
    if (pz.paso === 1) {
      cuerpo = `<div class="puesta-tit"><h1>Tus productos</h1><p>Revisa tus alfajores y sus precios. Puedes cambiarlos después en Ajustes.</p></div><ul class="prods">${PRODUCTOS.map(
        (x) => `<li class="prod">${ficha(x)}<div class="prod-info"><b>${x.nombre}</b><span>${sol(x.precio)}</span></div>${ic("circle-check")}</li>`,
      ).join("")}</ul><button class="fila-boton" style="margin-top:12px" data-accion="toast" data-msg="Se abriría el formulario para un producto nuevo">${ic("plus")}Agregar otro producto</button>`;
    } else if (pz.paso === 2) {
      cuerpo = `<div class="puesta-tit"><h1>Tu stock de hoy</h1><p>¿Cuántos tienes de cada uno ahora mismo? Desde aquí la app lleva la cuenta.</p></div><ul class="prods">${PRODUCTOS.map(
        (x) => `<li class="prod">${ficha(x)}<div class="prod-info"><b>${x.nombre}</b><span>En stock</span></div>${stepper(x.id, pz.stock[x.id], "puesta-menos", "puesta-mas", x.nombre, true)}</li>`,
      ).join("")}</ul>`;
    } else {
      cuerpo = `<div class="puesta-tit"><h1>Tus tipos de gasto</h1><p>Elige los que usas para anotar tus compras. Puedes agregar otros.</p></div><div class="chips">${Object.entries(CATEGORIAS)
        .map(([k, c]) => `<button class="chip" aria-pressed="${pz.tipos[k]}" data-accion="puesta-tipo" data-v="${k}">${ic(c.i)}${c.t}</button>`)
        .join("")}</div>`;
    }
    const pie = `<div class="pie-accion"><button class="btn btn-primario ancho" data-accion="puesta-siguiente">${pz.paso === 3 ? "Terminar" : "Siguiente"}</button></div>`;
    return marco(false, cab + cuerpo, pie);
  };

  PANTALLAS.carga = function () {
    return `<div class="carga-app"><img src="img/logo.png" alt=""><h1>Don Pipos</h1><p>Cargando tu día…</p><span class="carga-barra"><i></i></span></div>`;
  };

  // Teclado y puntos del PIN: los mismos para ingresar y para entrar
  const teclado = (accion, izquierda) =>
    `<div class="teclado" role="group" aria-label="Teclado numérico">${["1", "2", "3", "4", "5", "6", "7", "8", "9"]
      .map((k) => `<button class="tecla" data-accion="${accion}" data-v="${k}">${k}</button>`)
      .join("")}${izquierda || "<span></span>"}<button class="tecla" data-accion="${accion}" data-v="0">0</button><button class="tecla tecla-icono" data-accion="${accion}" data-v="borrar" aria-label="Borrar">${ic("delete")}</button></div>`;
  const puntos = (n, mal) =>
    `<div class="pin-puntos${mal ? " mal" : ""}" role="img" aria-label="${n} de 6 números">${Array.from({ length: 6 }, (_, i) => `<i class="${i < n ? "lleno" : ""}"></i>`).join("")}</div>`;
  const quedan = (n) => (n === 1 ? "queda 1 intento" : `quedan ${n} intentos`);
  const olvide = `<button class="btn btn-texto ancho" data-accion="toast" data-msg="Se abriría WhatsApp con el equipo para pedir un PIN nuevo">Olvidé mi PIN</button>`;

  PANTALLAS.ingresar = function (v) {
    const sinRed = v === "sininternet";
    if (v === "espera") {
      return marco(
        false,
        `<div class="acceso"><span class="acceso-ic grande">${ic("timer")}</span><h1>Espera 15 minutos</h1><p>Hubo 5 intentos con un PIN equivocado. Por seguridad, podrás intentarlo otra vez a las 11:55.</p>
          <button class="btn btn-secundario ancho" data-accion="toast" data-msg="Se abriría WhatsApp con el equipo para pedir un PIN nuevo">${ic("whatsapp")}Pedir un PIN nuevo al equipo</button>
          <p class="acceso-pie">Con 10 intentos fallidos, la cuenta queda bloqueada hasta que el equipo la revise.</p></div>`,
      );
    }
    const g = v === "pinmal" ? { paso: "pin", pin: "", intentos: 3, mal: true } : sinRed ? { ...S.ingreso, paso: "pin", revisando: false } : S.ingreso;
    // Una sola pantalla: el número y el PIN; al completar el PIN se comprueba solo, sin botón
    if (g.paso === "pin") {
      const estado = g.revisando
        ? `<p class="revisando" role="status"><span class="girando" aria-hidden="true"></span>Comprobando…</p>`
        : g.mal
          ? `<p class="huella-msj">PIN incorrecto. Te ${quedan(g.intentos)}.</p>`
          : "";
      return marco(
        sinRed,
        `<div class="acceso acceso-uno"><img class="acceso-logo chico" src="img/logo.png" alt=""><h1>Ingresa a tu app</h1><p>Con tu número y el PIN que te dio el equipo.</p>
          ${sinRed ? avisoRed("Sin conexión. Para ingresar la primera vez necesitas internet.") : ""}
          <section class="campo"><h3>Tu número</h3><label class="entrada"><span class="prefijo">+51</span><input inputmode="numeric" value="${NUMERO}" aria-label="Número de celular"></label></section>
          <section class="campo"><h3>Tu PIN</h3><div class="entrada pin-caja${g.mal ? " mal" : ""}">${puntos(g.pin.length, g.mal)}</div>${estado}</section>
          ${olvide}</div>`,
        `<div class="teclado-zona"${sinRed ? " inert" : ""}>${teclado("ingreso-tecla")}</div>`,
      );
    }
    return marco(
      false,
      `<div class="acceso huella"><span class="huella-btn" aria-hidden="true">${ic("fingerprint")}</span><h1>¿Entrar con tu huella?</h1><p>Es lo más rápido. Si la huella falla, entras con tu PIN.</p>
        <button class="btn btn-primario ancho" data-accion="ingreso-huella" data-v="si">${ic("fingerprint")}Usar mi huella</button>
        <button class="btn btn-texto ancho" data-accion="ingreso-huella" data-v="no">Ahora no</button></div>`,
    );
  };

  PANTALLAS.huella = function (v) {
    if (v === "bloqueado") {
      return marco(
        false,
        `<div class="acceso"><span class="acceso-ic grande">${ic("lock")}</span><h1>Cerramos la sesión</h1><p>Hubo 5 intentos con un PIN equivocado, así que la app se cerró en este celular. Tus pedidos y datos siguen guardados.</p>
          <button class="btn btn-primario ancho" data-accion="ingresar-de-nuevo">Ingresar de nuevo</button>
          <p class="acceso-pie">Con tu número y tu PIN, como la primera vez.</p></div>`,
      );
    }
    if (v === "datos" && S.huella) {
      return marco(
        false,
        `<div class="acceso huella"><img class="acceso-logo" src="img/logo.png" alt=""><h1>Hola de nuevo</h1><p>Toca el sensor para entrar.</p>
          <button class="huella-btn" data-accion="ir" data-a="inicio" aria-label="Entrar con huella">${ic("fingerprint")}</button>
          <p class="huella-msj ok">Con tu huella entras en un segundo.</p>
          <button class="btn btn-texto ancho" data-accion="usar-pin">Usar mi PIN</button></div>`,
      );
    }
    const d = v === "pinmal" ? { pin: "", intentos: 3, mal: true } : S.desbloqueo;
    const izquierda = S.huella ? `<button class="tecla tecla-icono" data-accion="usar-huella" aria-label="Entrar con huella">${ic("fingerprint")}</button>` : "";
    return marco(
      false,
      `<div class="acceso acceso-paso"><img class="acceso-logo chico" src="img/logo.png" alt=""><h1>Escribe tu PIN</h1><p>Para entrar a Don Pipos.</p>${puntos(d.pin.length, d.mal)}${
        d.mal ? `<p class="huella-msj">PIN incorrecto. Te ${quedan(d.intentos)}.</p>` : ""
      }${olvide}</div>`,
      `<div class="teclado-zona">${teclado("pin-tecla", izquierda)}</div>`,
    );
  };

  /* ---------- Venta de mostrador: sin cliente, se elige y se cobra en una pantalla ---------- */
  S.venta = {};
  const EN_MEDIO = { efectivo: "en efectivo", yape: "por Yape", plin: "por Plin", transferencia: "por transferencia" };
  PANTALLAS.venta = function (v) {
    const sinRed = v === "sininternet";
    const ls = lineas(S.venta);
    const cant = ls.reduce((a, l) => a + l.n, 0);
    const total = ls.reduce((a, l) => a + l.n * l.p.precio, 0);
    const filas = PRODUCTOS.map((p) => {
      const n = S.venta[p.id] || 0;
      const nota = p.stock - n <= 0 ? `<small class="v-sin">Sin stock</small>` : `<small>Quedan ${p.stock - n}</small>`; // avisa, no bloquea (D12)
      return `<li class="prod${n ? " con" : ""}">${ficha(p)}<button class="prod-info venta-toque" data-accion="venta-mas" data-id="${p.id}" aria-label="Sumar un ${p.nombre}"><b>${p.nombre}</b><span>${sol(p.precio)}</span>${nota}</button>${stepper(p.id, n, "venta-menos", "venta-mas", p.nombre, true)}</li>`;
    }).join("");
    const pie = `<div class="pie-accion columna venta-pie"><div class="venta-total"><span>${cant ? `${cant} ${cant === 1 ? "alfajor" : "alfajores"}` : "Toca un alfajor para sumarlo"}</span>${cant ? `<button class="link" data-accion="venta-vaciar">Vaciar</button>` : ""}<b>${sol(total)}</b></div><p class="venta-con">Cobrar con</p><div class="venta-cobrar">${mediosVisibles()
      .sort((x, y) => (y[0] === "efectivo") - (x[0] === "efectivo")) // en el mostrador, efectivo primero
      .map(([k, t]) => `<button class="btn btn-secundario" data-accion="guardar-venta" data-v="${k}"${!cant || sinRed ? " disabled" : ""}>${t}</button>`)
      .join("")}</div></div>`;
    return marco(
      sinRed,
      cabForm("Venta de mostrador", "Sin cliente: se cobra en el momento", "inicio") +
        (sinRed ? avisoRed("Sin conexión. La venta se guarda cuando vuelva la señal.") : "") +
        `<ul class="prods">${filas}</ul>`,
      pie,
    );
  };

  /* ---------- Cuadre de caja: lo que debería haber en efectivo frente a lo que se contó ---------- */
  S.caja = { fondo: 5000, contado: null, cerrado: null };
  const efectivoHoy = () => S.pedidos.flatMap((p) => p.pagos.filter((x) => !x.ayer && x.m === "efectivo")).reduce((a, x) => a + x.c, 0);
  const gastosEfectivoHoy = () => S.gastos.filter((g) => g.hoy && !g.anulado && g.m === "efectivo").reduce((a, g) => a + g.c, 0);
  const cobradoHoyPorMedio = (m) => S.pedidos.flatMap((p) => p.pagos.filter((x) => !x.ayer && x.m === m)).reduce((a, x) => a + x.c, 0);
  function resultadoCaja(diferencia) {
    if (diferencia === 0) return `<div class="caja-res cuadra">${ic("circle-check")}<p><b>La caja cuadra.</b> Todo el efectivo está.</p></div>`;
    if (diferencia > 0) return `<div class="caja-res sobra">${ic("circle-plus")}<p><b>Sobran ${sol(diferencia)}.</b> Revisa si falta anotar una venta.</p></div>`;
    return `<div class="caja-res falta">${ic("circle-minus")}<p><b>Faltan ${sol(-diferencia)}.</b> Revisa si falta anotar un gasto o un vuelto.</p></div>`;
  }
  PANTALLAS.caja = function (v) {
    const cab = cabForm("Cuadre de caja", "Hoy, miércoles 18 de noviembre", "inicio");
    if (v === "cargando") return marco(false, cab + esqTarjeta(196) + esqTarjeta(56) + esqTarjeta(120));
    const sinRed = v === "sininternet";
    const c = S.caja;
    const esperado = c.fondo + efectivoHoy() - gastosEfectivoHoy();
    if (c.cerrado && v === "datos") {
      return marco(
        false,
        cab +
          `<div class="vacio">${ic("circle-check", "grande")}<h2>Día cerrado</h2><p>${
            c.cerrado.diferencia === 0 ? `La caja cuadró: ${sol(c.cerrado.esperado)} en efectivo.` : `${c.cerrado.diferencia > 0 ? "Sobraron" : "Faltaron"} ${sol(Math.abs(c.cerrado.diferencia))}. Quedó anotado.`
          }</p><button class="btn btn-texto" data-accion="caja-reabrir">${ic("rotate-ccw")}Volver a contar</button></div>`,
      );
    }
    const fija = v === "cuadra" || v === "falta";
    const contado = v === "cuadra" ? esperado : v === "falta" ? esperado - 1000 : c.contado;
    const otros = ["yape", "plin", "transferencia"].map((m) => [m, cobradoHoyPorMedio(m)]).filter(([, x]) => x > 0);
    return marco(
      sinRed,
      cab +
        (sinRed ? avisoRed("Sin conexión. Puedes contar; el cierre se guarda cuando vuelva la señal.") : "") +
        `<section class="tarjeta caja"><h2>Efectivo</h2>
          <label class="caja-fila"><span>Abriste con</span><span class="entrada caja-monto">S/<input type="number" min="0" step="0.5" value="${(c.fondo / 100).toFixed(2)}" data-input="caja-fondo" aria-label="Con cuánto abriste la caja, en soles"${fija ? " readonly" : ""}></span></label>
          <div class="caja-esperado"><p class="caja-fila"><span>Cobrado en efectivo</span><b>+ ${sol(efectivoHoy())}</b></p><p class="caja-fila"><span>Gastos pagados en efectivo</span><b>− ${sol(gastosEfectivoHoy())}</b></p><p class="caja-fila total"><span>Debería haber</span><b>${sol(esperado)}</b></p></div>
        </section>
        <section class="campo"><h3>¿Cuánto hay en la caja?</h3><label class="entrada">S/<input type="number" min="0" step="0.5" placeholder="Cuenta billetes y monedas" value="${contado == null ? "" : (contado / 100).toFixed(2)}" data-input="caja-contado" aria-label="Cuánto hay en la caja, en soles"${fija ? " readonly" : ""}></label></section>
        <div class="caja-resultado">${contado == null ? "" : resultadoCaja(contado - esperado)}</div>
        ${
          otros.length
            ? `<section class="tarjeta caja"><h2>Yape, Plin y transferencias</h2>${otros.map(([m, x]) => `<p class="caja-fila"><span><i class="punto-m m-${m}"></i>${METODOS[m]}</span><b>${sol(x)}</b></p>`).join("")}<p class="nota">${ic("smartphone")}<span>Compáralos con lo que muestran sus apps.</span></p></section>`
            : ""
        }`,
      `<div class="pie-accion"><button class="btn btn-primario ancho" data-accion="guardar-cierre" data-contado="${contado ?? ""}"${contado == null || sinRed ? " disabled" : ""}>Cerrar el día</button></div>`,
    );
  };

  const inicioBase = PANTALLAS.inicio;
  PANTALLAS.inicio = (v) =>
    v !== "primeravez"
      ? inicioBase(v)
      : inicioBase("vacio") +
        `<div class="consejo-velo" aria-hidden="true"></div><div class="consejo" role="dialog" aria-label="Consejo"><p><b>Anota tu primer pedido</b>Toca + abajo: eliges los alfajores, quién los pide y cómo paga.</p><button class="btn btn-primario" data-accion="consejo-listo">Entendido</button></div>`;

  DP.premioListo = (nombre) => {
    const c = clientePorNombre(nombre);
    return Boolean(S.fidelidad.activa && c && c.sellos >= S.fidelidad.meta);
  };
  DP.premioTexto = () => PREMIOS[S.fidelidad.premio];
  DP.montoPremio = (items) => {
    if (S.fidelidad.premio === "descuento") return 1000;
    if (S.fidelidad.premio === "otro") return 0;
    const precios = lineas(items).map((l) => l.p.precio);
    return precios.length ? Math.min(...precios) : 0;
  };
  DP.premioCanjeado = (nombre) => {
    const c = clientePorNombre(nombre);
    if (c) c.sellos = 0;
  };
  DP.mensajeGuardado = (g) => {
    const parte = Math.min(g.parte, g.t.total);
    const pagos = g.entrega === "mostrador" || g.pagaAhora === "todo" ? [{ c: g.t.total }] : g.pagaAhora === "parte" ? [{ c: parte }] : [];
    const pseudo = { n: g.n, items: g.items, cliente: g.cliente, total: g.t.total, pagos, tipo: g.entrega, programado: g.cuando === "otro" ? "jueves 19 de noviembre, a las 10:00" : undefined, estado: "nuevo" };
    return llenar(S.mensajes.confirmacion, contexto(pseudo, "datos"));
  };

  /* ---------- Acciones ---------- */
  Object.assign(ACCIONES, {
    "filtro-pedidos": (el) => {
      S.filtroPedidos = el.dataset.v;
      repintar(["pedidos"]);
    },
    "ver-pedido": (el) => {
      S.detallePedido = Number(el.dataset.n);
      S.hojaPedido = null;
      repintar(["pedido"]);
      ir("pedido");
    },
    avanzar: () => {
      const f = foto();
      const p = pedidoN(S.detallePedido);
      const pasos = FLUJO[p.tipo];
      const i = pasos.indexOf(p.estado);
      if (i < 0 || i >= pasos.length - 1) return;
      const sig = pasos[i + 1];
      if (navigator.vibrate) navigator.vibrate(15); // vibración corta al cambiar de estado (en Android)
      p.estado = sig;
      p.historial = (p.historial || pasos.slice(0, i + 1).map((e) => [e, "Hoy"])).concat([[sig, "Ahora"]]);
      if (vistaDe("pedido") === "fallo") {
        // se ve al instante; si el servidor no responde, vuelve atrás y lo dice
        const antes = ESTADOS[pasos[i]].t;
        repintar(["pedido"]);
        setTimeout(() => {
          volver(f);
          pintar();
          toast("pedido", `No se pudo guardar: el pedido volvió a «${antes}». Revisa la señal y vuelve a intentar.`);
        }, 1000);
        return;
      }
      if (sig === "entregado") {
        const c = clientePorNombre(p.cliente);
        if (c && S.fidelidad.activa) c.sellos += 1; // cada compra entregada suma un sello
        if (pendiente(p) > 0) S.hojaPedido = { tipo: "pago", monto: pendiente(p), m: "efectivo", alEntregar: true };
      }
      repintar(["pedido", "pedidos", "porcobrar", "inicio", "cliente", "clientes", "fidelidad"]);
      marcarCambio(["pedidos", "inicio"]);
      toast("pedido", `${num(p.n)}: ${ESTADOS[sig].t.toLowerCase()}`, () => volver(f));
    },
    "abrir-pago": () => {
      const p = pedidoN(S.detallePedido);
      S.hojaPedido = { tipo: "pago", monto: pendiente(p), m: "yape" };
      repintar(["pedido"]);
    },
    "pago-medio": (el) => {
      S.hojaPedido.m = el.dataset.v;
      repintar(["pedido"]);
    },
    "guardar-pago": () => {
      const p = pedidoN(S.detallePedido);
      const h = S.hojaPedido;
      const monto = Math.min(h.monto, pendiente(p));
      if (monto > 0) p.pagos.push({ m: h.m, c: monto });
      S.hojaPedido = null;
      repintar(["pedido", "pedidos", "porcobrar", "inicio", "reportes", "ajustes"]);
      marcarCambio(["inicio", "porcobrar", "reportes"]);
      toast("pedido", `Pago guardado: ${sol(monto)} con ${METODOS[h.m]}`);
    },
    "abrir-anular": () => {
      S.hojaPedido = { tipo: "anular", motivo: "El cliente canceló" };
      repintar(["pedido"]);
    },
    "anular-motivo": (el) => {
      S.hojaPedido.motivo = el.dataset.v;
      repintar(["pedido"]);
    },
    "guardar-anular": () => {
      const f = foto();
      const p = pedidoN(S.detallePedido);
      p.estado = "anulado";
      p.motivo = S.hojaPedido.motivo.toLowerCase();
      lineas(p.items).forEach(({ p: prod, n }) => {
        prod.stock += n;
        S.movimientos[prod.id].unshift({ t: "Ahora", d: `Anulado ${num(p.n)}: vuelve al stock`, c: n, tipo: "devolucion", nuevo: true });
      });
      S.hojaPedido = null;
      pintar();
      marcarCambio(["inicio", "stock", "historial", "pedidos", "porcobrar"]);
      toast("pedido", `Pedido ${num(p.n)} anulado`, () => volver(f));
    },
    "abrir-editar": () => {
      const p = pedidoN(S.detallePedido);
      S.hojaPedido = { tipo: "editar", items: { ...p.items } };
      repintar(["pedido"]);
    },
    "editar-mas": (el) => {
      const it = S.hojaPedido.items;
      it[el.dataset.id] = (it[el.dataset.id] || 0) + 1;
      repintar(["pedido"]);
    },
    "editar-menos": (el) => {
      const it = S.hojaPedido.items;
      it[el.dataset.id] = Math.max(0, (it[el.dataset.id] || 0) - 1);
      repintar(["pedido"]);
    },
    "guardar-editar": () => {
      const f = foto();
      const p = pedidoN(S.detallePedido);
      const nuevos = S.hojaPedido.items;
      PRODUCTOS.forEach((x) => {
        const dif = (nuevos[x.id] || 0) - (p.items[x.id] || 0);
        if (!dif) return;
        if (!p.precios[x.id]) p.precios[x.id] = x.precio;
        x.stock -= dif;
        S.movimientos[x.id].unshift({ t: "Ahora", d: `Pedido ${num(p.n)} editado`, c: -dif, tipo: dif > 0 ? "venta" : "devolucion", nuevo: true });
      });
      p.items = Object.fromEntries(Object.entries(nuevos).filter(([, n]) => n > 0));
      p.total = Object.entries(p.items).reduce((a, [id, n]) => a + n * precioDe(p, id), 0) + (p.envio || 0) - (p.descuento || 0);
      S.hojaPedido = null;
      pintar();
      marcarCambio(["inicio", "stock", "historial", "pedidos", "porcobrar"]);
      toast("pedido", `Pedido ${num(p.n)} actualizado: ${sol(p.total)}`, () => volver(f));
    },
    "cerrar-hoja-pedido": () => {
      S.hojaPedido = null;
      repintar(["pedido"]);
    },
    "gasto-cat": (el) => {
      S.gastoNuevo.cat = el.dataset.v;
      repintar(["gasto"]);
    },
    "gasto-medio": (el) => {
      S.gastoNuevo.m = el.dataset.v;
      repintar(["gasto"]);
    },
    "gasto-foto": () => {
      S.gastoNuevo.foto = !S.gastoNuevo.foto;
      repintar(["gasto"]);
    },
    "guardar-gasto": () => {
      const g = S.gastoNuevo;
      S.gastos.unshift({ t: "Ahora", hoy: true, semana: true, cat: g.cat, d: g.nota || CATEGORIAS[g.cat].t, c: g.monto, m: g.m, foto: g.foto, nuevo: true });
      S.gastoNuevo = { monto: 0, cat: g.cat, m: g.m, nota: "", foto: false };
      repintar(["gasto", "gastos", "reportes", "ajustes"]);
      marcarCambio(["gastos", "reportes"]);
      toast("gasto", `Gasto guardado: ${sol(g.monto)}`);
    },
    periodo: (el) => {
      if (el.dataset.v === "elegir") {
        toast("reportes", "Se abriría el calendario para elegir las fechas");
        return;
      }
      S.periodo = el.dataset.v;
      repintar(["reportes"]);
    },
    "ranking-por": (el) => {
      S.rankingPor = el.dataset.v;
      repintar(["ranking"]);
    },
    "filtro-clientes": (el) => {
      S.filtroClientes = el.dataset.v;
      repintar(["clientes"]);
    },
    "ver-cliente": (el) => {
      S.clienteSel = el.dataset.id;
      repintar(["cliente"]);
      ir("cliente");
    },
    promos: () => {
      const c = CLIENTES.find((x) => x.id === S.clienteSel);
      c.promos = !c.promos;
      repintar(["cliente", "clientes"]);
    },
    fidelidad: () => {
      S.fidelidad.activa = !S.fidelidad.activa;
      repintar(["fidelidad", "cliente", "ajustes", "pedido"]);
      marcarCambio(["cliente"]);
    },
    "meta-mas": () => {
      S.fidelidad.meta = Math.min(20, S.fidelidad.meta + 1);
      repintar(["fidelidad", "cliente", "ajustes", "pedido"]);
    },
    "meta-menos": () => {
      S.fidelidad.meta = Math.max(3, S.fidelidad.meta - 1);
      repintar(["fidelidad", "cliente", "ajustes", "pedido"]);
    },
    premio: (el) => {
      S.fidelidad.premio = el.dataset.v;
      repintar(["fidelidad", "cliente"]);
    },
    "editar-producto": (el) => {
      S.productoEdit = el.dataset.id;
      S.productoBorrador = { ...P[el.dataset.id] };
      repintar(["productos"]);
    },
    "cerrar-producto": () => {
      if (S.productoBorrador) Object.assign(P[S.productoEdit], S.productoBorrador);
      S.productoEdit = null;
      S.productoBorrador = null;
      repintar(["productos"]);
    },
    "min-mas": () => {
      P[S.productoEdit].minimo += 1;
      repintar(["productos"]);
    },
    "min-menos": () => {
      P[S.productoEdit].minimo = Math.max(0, P[S.productoEdit].minimo - 1);
      repintar(["productos"]);
    },
    web: () => {
      P[S.productoEdit].web = !P[S.productoEdit].web;
      repintar(["productos"]);
    },
    "guardar-producto": () => {
      const p = P[S.productoEdit];
      S.productoEdit = null;
      S.productoBorrador = null;
      pintar();
      marcarCambio(["pedido1", "ranking", "stock"]);
      toast("productos", `${p.nombre} guardado: ${sol(p.precio)}. En la web se ve en unos segundos.`);
    },
    huella: () => {
      S.huella = !S.huella;
      repintar(["ajustes", "huella"]);
    },
    bloqueo: (el) => {
      S.bloqueo = Number(el.dataset.v);
      repintar(["ajustes"]);
    },
    "mensaje-sel": (el) => {
      S.mensajeSel = S.mensajeSel === el.dataset.v ? null : el.dataset.v;
      repintar(["mensajes"]);
    },
    variable: (el) => {
      S.mensajes[S.mensajeSel] = `${S.mensajes[S.mensajeSel]} {${el.dataset.v}}`.replace(/\s+/g, " ");
      repintar(["mensajes", "pedido", "porcobrar"]);
    },
    "mensaje-reset": () => {
      S.mensajes[S.mensajeSel] = MENSAJES_BASE[S.mensajeSel];
      repintar(["mensajes", "pedido", "porcobrar"]);
    },
    "ver-gasto": (el) => {
      const i = Number(el.dataset.i);
      S.gastoEdit = { i, monto: S.gastos[i].c };
      repintar(["gastos"]);
    },
    "cerrar-gasto": () => {
      S.gastoEdit = null;
      repintar(["gastos"]);
    },
    "guardar-correccion": () => {
      const g = S.gastos[S.gastoEdit.i];
      const antes = { c: g.c, corregido: g.corregido };
      if (S.gastoEdit.monto !== g.c) {
        g.corregido = g.corregido || g.c;
        g.c = S.gastoEdit.monto;
      }
      S.gastoEdit = null;
      repintar(["gastos", "reportes", "ajustes"]);
      marcarCambio(["reportes"]);
      toast("gastos", `Gasto corregido: ${sol(g.c)}`, () => Object.assign(g, antes));
    },
    "anular-gasto": () => {
      const g = S.gastos[S.gastoEdit.i];
      g.anulado = true;
      S.gastoEdit = null;
      repintar(["gastos", "reportes", "ajustes"]);
      marcarCambio(["reportes"]);
      toast("gastos", "Gasto anulado", () => {
        g.anulado = false;
      });
    },
    "abrir-borrar-cliente": () => {
      S.hojaCliente = "borrar";
      repintar(["cliente"]);
    },
    "cerrar-hoja-cliente": () => {
      S.hojaCliente = null;
      repintar(["cliente"]);
    },
    "borrar-cliente": () => {
      const c = CLIENTES.find((x) => x.id === S.clienteSel);
      const viejo = c.nombre;
      Object.assign(c, { borrado: true, nombre: "Cliente borrado", tel: "Sin datos de contacto", direccion: null, nota: null, promos: false });
      S.pedidos.forEach((x) => {
        if (x.cliente === viejo) x.cliente = "Cliente borrado";
      });
      S.hojaCliente = null;
      pintar();
      marcarCambio(["clientes", "pedidos"]);
    },
    "ajuste-hoja": (el) => {
      S.ajusteHoja = el.dataset.v;
      repintar(["ajustes"]);
    },
    "cerrar-ajuste": () => {
      S.ajusteHoja = null;
      repintar(["ajustes"]);
    },
    medio: (el) => {
      const k = el.dataset.v;
      const activos = Object.values(S.mediosActivos).filter(Boolean).length;
      if (S.mediosActivos[k] && activos === 1) {
        toast("ajustes", "Deja al menos un medio de pago");
        return;
      }
      S.mediosActivos[k] = !S.mediosActivos[k];
      repintar(["ajustes", "pedido2", "gasto"]);
      marcarCambio(["pedido2", "gasto"]);
    },
    recordatorio: (el) => {
      S.recordatorios[el.dataset.v] = !S.recordatorios[el.dataset.v];
      repintar(["ajustes", "recordatorios"]);
      marcarCambio(["recordatorios"]);
    },
    "dias-mas": () => {
      S.diasProduccion = Math.min(14, S.diasProduccion + 1);
      repintar(["ajustes", "inicio", "stock", "produccion"]);
      marcarCambio(["inicio", "stock", "produccion"]);
    },
    "dias-menos": () => {
      S.diasProduccion = Math.max(1, S.diasProduccion - 1);
      repintar(["ajustes", "inicio", "stock", "produccion"]);
      marcarCambio(["inicio", "stock", "produccion"]);
    },
    "puesta-siguiente": () => {
      S.puesta.paso += 1;
      repintar(["puesta"]);
    },
    "puesta-atras": () => {
      S.puesta.paso = Math.max(1, S.puesta.paso - 1);
      repintar(["puesta"]);
    },
    "puesta-mas": (el) => {
      S.puesta.stock[el.dataset.id] += 1;
      repintar(["puesta"]);
    },
    "puesta-menos": (el) => {
      S.puesta.stock[el.dataset.id] = Math.max(0, S.puesta.stock[el.dataset.id] - 1);
      repintar(["puesta"]);
    },
    "puesta-tipo": (el) => {
      S.puesta.tipos[el.dataset.v] = !S.puesta.tipos[el.dataset.v];
      repintar(["puesta"]);
    },
    "puesta-reiniciar": () => {
      S.puesta.paso = 1;
      repintar(["puesta"]);
    },
    "mas-pedidos": cargarMasPedidos,
    "venta-mas": (el) => {
      S.venta[el.dataset.id] = (S.venta[el.dataset.id] || 0) + 1;
      repintar(["venta"]);
    },
    "venta-menos": (el) => {
      const id = el.dataset.id;
      if ((S.venta[id] || 0) > 1) S.venta[id] -= 1;
      else delete S.venta[id];
      repintar(["venta"]);
    },
    "venta-vaciar": () => {
      S.venta = {};
      repintar(["venta"]);
    },
    "guardar-venta": (el) => {
      const f = foto();
      const n = S.siguiente++;
      const ls = lineas(S.venta);
      const precios = Object.fromEntries(ls.map(({ p }) => [p.id, p.precio]));
      const total = ls.reduce((a, l) => a + l.n * l.p.precio, 0);
      ls.forEach(({ p, n: c }) => {
        p.stock -= c;
        S.movimientos[p.id].unshift({ t: "Ahora", d: `Venta ${num(n)}, mostrador`, c: -c, tipo: "venta", nuevo: true });
      });
      S.pedidos.push({ n, cliente: null, tipo: "mostrador", items: { ...S.venta }, precios, total, estado: "entregado", pagos: [{ m: el.dataset.v, c: total }] });
      S.venta = {};
      pintar();
      marcarCambio(["inicio", "stock", "pedidos", "caja"]);
      toast("venta", `Venta ${num(n)} guardada: ${sol(total)} ${EN_MEDIO[el.dataset.v]}`, () => {
        volver(f);
        S.siguiente = n;
      });
    },
    "guardar-cierre": (el) => {
      const esperado = S.caja.fondo + efectivoHoy() - gastosEfectivoHoy();
      S.caja.contado = Number(el.dataset.contado);
      S.caja.cerrado = { esperado, diferencia: S.caja.contado - esperado };
      repintar(["ajustes"]);
      ponerVista("caja", "datos");
    },
    "caja-reabrir": () => {
      S.caja.cerrado = null;
      repintar(["caja", "ajustes"]);
    },
    "ver-pedidos": (el) => {
      S.filtroPedidos = el.dataset.v;
      repintar(["pedidos"]);
      ir("pedidos");
    },
    barra: (el) => {
      S.barraSel = Number(el.dataset.v);
      repintar(["reportes"]);
    },
    "puesta-a-inicio": () => {
      ponerVista("inicio", "primeravez");
      ir("inicio");
    },
    "consejo-listo": () => ponerVista("inicio", "vacio"),
    "ingreso-tecla": (el) => {
      if (vistaDe("ingresar") === "pinmal") Object.assign(S.ingreso, { paso: "pin", pin: "" });
      const g = S.ingreso;
      if (g.revisando) return;
      g.pin = teclear(g.pin, el.dataset.v);
      g.mal = false;
      g.revisando = g.pin.length === 6;
      ponerVista("ingresar", "datos");
      if (!g.revisando) return;
      // El servidor compara el PIN con su hash y cuenta los intentos de la cuenta, no del celular
      setTimeout(() => {
        g.revisando = false;
        if (g.pin === PIN) {
          Object.assign(g, { paso: "huella", pin: "", intentos: 5 });
          return repintar(["ingresar"]);
        }
        Object.assign(g, { pin: "", intentos: g.intentos - 1, mal: true });
        if (g.intentos > 0) return repintar(["ingresar"]);
        S.ingreso = ingresoNuevo();
        ponerVista("ingresar", "espera");
      }, 700);
    },
    "ingreso-huella": (el) => {
      S.huella = el.dataset.v === "si";
      S.ingreso = ingresoNuevo();
      repintar(["huella", "ajustes"]);
      toast("ingresar", "Listo: ya entraste en este celular");
      ir("puesta");
    },
    "ingresar-de-nuevo": () => {
      S.ingreso = ingresoNuevo();
      S.desbloqueo = { pin: "", intentos: 5, mal: false };
      ponerVista("ingresar", "datos");
      ir("ingresar");
    },
    "usar-pin": () => ponerVista("huella", "conpin"),
    "usar-huella": () => ponerVista("huella", "datos"),
    "pin-tecla": (el) => {
      if (vistaDe("huella") === "pinmal") ponerVista("huella", "conpin");
      const d = S.desbloqueo;
      if (d.pin.length === 6) return;
      d.pin = teclear(d.pin, el.dataset.v);
      d.mal = false;
      repintar(["huella"]);
      if (d.pin.length < 6) return;
      setTimeout(() => {
        if (d.pin === PIN) {
          S.desbloqueo = { pin: "", intentos: 5, mal: false };
          repintar(["huella"]);
          ir("inicio");
          return;
        }
        Object.assign(d, { pin: "", intentos: d.intentos - 1, mal: true });
        if (d.intentos > 0) return repintar(["huella"]);
        // 5 errores: se borra la sesión de este celular y hay que ingresar otra vez con número y PIN
        S.desbloqueo = { pin: "", intentos: 5, mal: false };
        ponerVista("huella", "bloqueado");
      }, 300);
    },
  });

  /* ---------- Campos que se escriben: solo se repinta lo que cambia, para no perder el foco ---------- */
  function actualizarEn(id, selector, html) {
    const tel = document.querySelector(`.telefono[data-pantalla="${id}"]`);
    const destino = tel && tel.querySelector(selector);
    if (!destino) return;
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    const nuevo = tmp.querySelector(selector);
    if (nuevo) destino.replaceWith(nuevo);
  }
  const vistaDe = (id) => document.querySelector(`.telefono[data-pantalla="${id}"]`).dataset.vista || "datos";
  function ponerVista(id, vista) {
    const tel = document.querySelector(`.telefono[data-pantalla="${id}"]`);
    tel.dataset.vista = vista;
    tel.querySelectorAll(".vistas button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.vista === vista)));
    repintar([id]);
  }
  const teclear = (valor, k) => (k === "borrar" ? valor.slice(0, -1) : valor.length < 6 ? valor + k : valor);
  // Al llegar al final de «Todos», pide la página siguiente (en la app: onEndReached de la lista)
  function cargarMasPedidos() {
    const total = S.pedidos.length + S.historico.length;
    if (S.filtroPedidos !== "todos" || S.cargandoMas || S.paginas * 20 >= total || !["datos", "actualizando"].includes(vistaDe("pedidos"))) return;
    S.cargandoMas = true;
    repintar(["pedidos"]);
    setTimeout(() => {
      S.cargandoMas = false;
      S.paginas += 1;
      repintar(["pedidos"]);
    }, 900);
  }
  document.addEventListener(
    "scroll",
    (ev) => {
      if (ev.target instanceof Element && ev.target.matches(".contenido")) ev.target.classList.toggle("encogido", ev.target.scrollTop > 40);
    },
    true,
  );
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-tema]");
    if (!b) return;
    b.setAttribute("aria-pressed", String(document.body.classList.toggle("oscuro")));
  });
  document.addEventListener(
    "scroll",
    (ev) => {
      const c = ev.target;
      if (c instanceof Element && c.matches('.telefono[data-pantalla="pedidos"] .contenido') && c.scrollTop + c.clientHeight >= c.scrollHeight - 60) cargarMasPedidos();
    },
    true,
  );
  const actualizarCaja = () => {
    const html = PANTALLAS.caja(vistaDe("caja"));
    [".caja-esperado", ".caja-resultado", ".pie-accion"].forEach((sel) => actualizarEn("caja", sel, html));
  };
  Object.assign(INPUTS, {
    "caja-fondo": (campo) => {
      S.caja.fondo = aCentimos(campo.value);
      actualizarCaja();
    },
    "caja-contado": (campo) => {
      S.caja.contado = campo.value === "" ? null : aCentimos(campo.value);
      actualizarCaja();
    },
    "pago-monto": (campo) => {
      S.hojaPedido.monto = aCentimos(campo.value);
    },
    "gasto-monto": (campo) => {
      S.gastoNuevo.monto = aCentimos(campo.value);
      actualizarEn("gasto", ".pie-accion", PANTALLAS.gasto(vistaDe("gasto")));
    },
    "gasto-nota": (campo) => {
      S.gastoNuevo.nota = campo.value;
    },
    precio: (campo) => {
      const centimos = aCentimos(campo.value);
      if (centimos > 0) P[S.productoEdit].precio = centimos;
    },
    costo: (campo) => {
      const centimos = aCentimos(campo.value);
      P[S.productoEdit].costo = centimos || null;
    },
    "corregir-monto": (campo) => {
      S.gastoEdit.monto = aCentimos(campo.value);
    },
    envio: (campo) => {
      S.envio = aCentimos(campo.value);
      repintar(["pedido2", "guardado"]);
    },
    mensaje: (campo) => {
      S.mensajes[S.mensajeSel] = campo.value;
      actualizarEn("mensajes", ".msj.abierto .chat", PANTALLAS.mensajes("datos"));
    },
  });

  // «Cerrar» la hoja de un producto sin guardar descarta lo escrito; «Guardar» lo deja
  pintar();
})();

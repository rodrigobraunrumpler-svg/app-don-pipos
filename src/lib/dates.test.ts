import * as dates from "@/lib/dates";
import {
  addDays,
  businessDate,
  businessDayRange,
  businessTime,
  daysBetween,
  formatLongDate,
  formatMonth,
  formatShortDate,
  formatTime,
  formatWeekday,
  formatWhen,
  previousDay,
  TIME_ZONE,
} from "@/lib/dates";

test("la zona es la de Lima", () => {
  expect(TIME_ZONE).toBe("America/Lima");
});

test("a las 23:59 de Lima sigue siendo el mismo día; a las 00:00 ya es el siguiente", () => {
  expect(businessDate(new Date("2026-11-19T04:59:59Z"))).toBe("2026-11-18");
  expect(businessDate(new Date("2026-11-19T05:00:00Z"))).toBe("2026-11-19");
});

test("el día va de las 00:00 de Lima a las 00:00 del día siguiente", () => {
  const { from, to } = businessDayRange("2026-11-18");
  expect(from.toISOString()).toBe("2026-11-18T05:00:00.000Z");
  expect(to.toISOString()).toBe("2026-11-19T05:00:00.000Z");
});

test.each([
  ["2026-11-30", "2026-11-30T05:00:00.000Z", "2026-12-01T05:00:00.000Z"],
  ["2026-12-31", "2026-12-31T05:00:00.000Z", "2027-01-01T05:00:00.000Z"],
  ["2028-02-29", "2028-02-29T05:00:00.000Z", "2028-03-01T05:00:00.000Z"],
])("el día %s termina donde empieza el siguiente, también a fin de mes y en año bisiesto", (date, from, to) => {
  const range = businessDayRange(date);
  expect(range.from.toISOString()).toBe(from);
  expect(range.to.toISOString()).toBe(to);
});

test.each([
  ["18-11-2026", "con el día primero"],
  ["2026-02-30", "un 30 de febrero"],
  ["2027-02-29", "un 29 de febrero de un año que no es bisiesto"],
  ["2026-11-00", "el día cero"],
  ["2026-13-01", "el mes trece"],
  ["2026-11-18T05:00:00.000Z", "una fecha con hora"],
  ["2026-11-8", "sin el cero del día"],
  ["", "vacío"],
])("«%s» no es un día (%s): no se calcula un rango de otro día", (date) => {
  expect(() => businessDayRange(date)).toThrow(RangeError);
  expect(() => businessDayRange(date)).toThrow(`«${date}» no es un día válido. Se espera AAAA-MM-DD, como 2026-11-18.`);
});

test("las fechas se escriben en español de Perú", () => {
  const instant = new Date("2026-11-18T16:40:00Z");
  expect(formatLongDate(instant)).toBe("Miércoles 18 de noviembre");
  expect(formatTime(instant)).toBe("11:40");
});

test("la hora va de 00:00 a 23:59, sin a. m. ni p. m.", () => {
  expect(formatTime(new Date("2026-11-18T20:05:00Z"))).toBe("15:05");
  expect(formatTime(new Date("2026-11-19T04:59:00Z"))).toBe("23:59");
  expect(formatTime(new Date("2026-11-18T05:00:00Z"))).toBe("00:00");
});

test("el desfase fijo que usa el celular da el mismo día y la misma hora que America/Lima", () => {
  // Node sí conoce la zona: si Perú volviera a cambiar la hora, esta prueba lo avisa
  const lima = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short",
    hourCycle: "h23",
  });
  const different: string[] = [];
  for (let time = Date.UTC(2026, 0, 1); time < Date.UTC(2031, 0, 1); time += 187 * 60_000) {
    const instant = new Date(time);
    const ours = `${businessDate(instant)}, ${formatTime(instant)}`;
    if (ours !== lima.format(instant)) different.push(`${instant.toISOString()}: ${ours} / ${lima.format(instant)}`);
  }
  expect(different).toEqual([]);
});

// Para leer el desfase de una zona, @date-fns/tz usa una función de Intl que el motor de JavaScript del celular
// (Hermes) no trae, según su documentación. Aquí Intl falla cada vez que se le pide una zona, que es el peor caso,
// y las fechas tienen que salir igual de bien
describe("en el motor del celular, donde Intl no sabe de zonas horarias", () => {
  const RealDateTimeFormat = Intl.DateTimeFormat;
  let phone: typeof dates;

  beforeAll(() => {
    jest.spyOn(Intl, "DateTimeFormat").mockImplementation((locales, options) => {
      if (options?.timeZone !== undefined || options?.timeZoneName === "longOffset")
        throw new RangeError("Este motor no tiene zonas horarias");
      return new RealDateTimeFormat(locales, options);
    });
    // Una copia nueva del módulo y de su librería, sin nada calculado antes con el Intl de Node
    jest.isolateModules(() => {
      phone = jest.requireActual<typeof dates>("@/lib/dates");
    });
  });
  afterAll(() => jest.restoreAllMocks());

  test("el Intl simulado falla al pedirle una zona", () => {
    expect(() => new Intl.DateTimeFormat("en-US", { timeZone: "America/Lima" })).toThrow(RangeError);
    expect(() => new Intl.DateTimeFormat("en-US", { timeZoneName: "longOffset" })).toThrow(RangeError);
  });

  test("el día del negocio sigue cambiando a la medianoche de Lima", () => {
    expect(phone.businessDate(new Date("2026-11-19T04:59:59Z"))).toBe("2026-11-18");
    expect(phone.businessDate(new Date("2026-11-19T05:00:00Z"))).toBe("2026-11-19");
  });

  test("el rango del día sigue yendo de 00:00 a 00:00 de Lima", () => {
    const { from, to } = phone.businessDayRange("2026-11-18");
    expect(from.toISOString()).toBe("2026-11-18T05:00:00.000Z");
    expect(to.toISOString()).toBe("2026-11-19T05:00:00.000Z");
  });

  test("la fecha larga y la hora siguen saliendo en hora de Lima y en español", () => {
    const instant = new Date("2026-11-18T16:40:00Z");
    expect(phone.formatLongDate(instant)).toBe("Miércoles 18 de noviembre");
    expect(phone.formatTime(instant)).toBe("11:40");
  });

  test("el día de la semana y la fecha corta también", () => {
    expect(phone.formatWeekday(new Date("2026-11-16T23:00:00Z"))).toBe("Lunes");
    expect(phone.formatShortDate(new Date("2026-11-11T22:30:00Z"))).toBe("11 nov");
  });
});

test("el día de la semana, con mayúscula, en hora de Lima", () => {
  expect(formatWeekday(new Date("2026-11-16T23:00:00Z"))).toBe("Lunes");
  // 04:59 UTC del martes 17 todavía es lunes en Lima
  expect(formatWeekday(new Date("2026-11-17T04:59:00Z"))).toBe("Lunes");
});

test("la fecha corta, en hora de Lima", () => {
  expect(formatShortDate(new Date("2026-11-11T22:30:00Z"))).toBe("11 nov");
  expect(formatShortDate(new Date("2026-12-01T04:59:00Z"))).toBe("30 nov");
});

test("cuándo pasó algo, en una fila: hoy y ayer con la hora, la semana con el día y lo de antes con la fecha", () => {
  const now = new Date("2026-11-19T16:40:00.000Z"); // jueves 19, 11:40 de Lima
  expect(formatWhen(new Date("2026-11-19T14:10:00.000Z"), now)).toBe("Hoy, 09:10");
  expect(formatWhen(new Date("2026-11-19T04:30:00.000Z"), now)).toBe("Ayer, 23:30");
  expect(formatWhen(new Date("2026-11-16T15:00:00.000Z"), now)).toBe("Lunes 16");
  expect(formatWhen(new Date("2026-11-09T15:00:00.000Z"), now)).toBe("9 nov");
  expect(formatWhen(new Date("2026-11-21T15:00:00.000Z"), now)).toBe("21 nov");
});

test("hoy y ayer salen del día de Lima, también de noche, cuando en UTC ya es el día siguiente", () => {
  // Jueves 19 de noviembre, 21:00 en Lima: en UTC ya es viernes 20
  const now = new Date("2026-11-20T02:00:00.000Z");
  expect(formatWhen(new Date("2026-11-20T01:10:00.000Z"), now)).toBe("Hoy, 20:10");
  // Las 23:30 del miércoles en Lima son las 04:30 del jueves en UTC
  expect(formatWhen(new Date("2026-11-19T04:30:00.000Z"), now)).toBe("Ayer, 23:30");
});

test("el nombre del mes de Lima", () => {
  expect(formatMonth(new Date("2026-12-01T04:30:00.000Z"))).toBe("noviembre");
});

test("el día anterior, también al cambiar de mes y de año", () => {
  expect(previousDay("2026-11-20")).toBe("2026-11-19");
  expect(previousDay("2026-12-01")).toBe("2026-11-30");
  expect(previousDay("2027-01-01")).toBe("2026-12-31");
});

test("sumar o restar días a un día de Lima", () => {
  expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
  expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  expect(addDays("2026-11-18", -7)).toBe("2026-11-11");
});

test("un día de Lima a una hora, como instante", () => {
  expect(businessTime("2026-11-18", "18:00").toISOString()).toBe("2026-11-18T23:00:00.000Z");
  expect(businessTime("2026-11-19", "09:30").toISOString()).toBe("2026-11-19T14:30:00.000Z");
});

test("cuántos días hay entre dos días de Lima", () => {
  expect(daysBetween("2026-11-17", "2026-11-18")).toBe(1);
  expect(daysBetween("2026-11-28", "2026-12-02")).toBe(4);
  expect(daysBetween("2026-11-18", "2026-11-18")).toBe(0);
});

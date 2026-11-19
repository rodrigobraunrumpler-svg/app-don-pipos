import * as dates from "@/lib/dates";
import { businessDate, businessDayRange, formatLongDate, formatTime, TIME_ZONE } from "@/lib/dates";

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

test("las fechas se escriben en español de Perú", () => {
  const instant = new Date("2026-11-18T16:40:00Z");
  expect(formatLongDate(instant)).toBe("Miércoles 18 de noviembre");
  expect(formatTime(instant)).toBe("11:40");
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

// El motor de JavaScript del celular (Hermes) no trae los datos de zonas horarias que Node sí tiene.
// Aquí Intl falla como allá cuando se le pide una zona, y las fechas tienen que salir igual de bien
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
});

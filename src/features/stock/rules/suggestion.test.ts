import { suggestionTitle, upToDateText, weekdayNote, whyText } from "./suggestion";

const COQUETA = {
  suggested: 36,
  expected: 43,
  weekdayUnits: 25,
  weekdayDays: 5,
  weekendUnits: 18,
  weekendDays: 2,
  minStock: 6,
  onHand: 13,
};

test("el título de la sugerencia, según cada cuánto se produce", () => {
  expect(suggestionTitle(145, 7)).toBe("Esta semana conviene hacer 145 alfajores");
  expect(suggestionTitle(1, 10)).toBe("Para los próximos 10 días conviene hacer 1 alfajor");
  expect(upToDateText(7)).toBe("Tu producción está al día para esta semana.");
  expect(upToDateText(3)).toBe("Tu producción está al día para los próximos 3 días.");
});

test("«Por qué 36», como la maqueta", () => {
  expect(whyText(COQUETA, 7)).toBe(
    "Vende unas 5 al día de lunes a viernes y 9 los sábados y domingos: 43 en la semana. Más tu mínimo (6), menos lo que tienes (13): 36.",
  );
  expect(whyText({ ...COQUETA, onHand: -2, suggested: 51 }, 7)).toBe(
    "Vende unas 5 al día de lunes a viernes y 9 los sábados y domingos: 43 en la semana. Más tu mínimo (6), más las 2 que vendiste de más: 51.",
  );
  expect(whyText({ ...COQUETA, onHand: 0, suggested: 49 }, 7)).toBe(
    "Vende unas 5 al día de lunes a viernes y 9 los sábados y domingos: 43 en la semana. Más tu mínimo (6), y hoy no tienes ninguno: 49.",
  );
  expect(whyText({ ...COQUETA, weekendUnits: 0, weekendDays: 0, expected: 10, suggested: 3 }, 2)).toBe(
    "Vende unas 5 al día de lunes a viernes: 10 en los próximos 2 días. Más tu mínimo (6), menos lo que tienes (13): 3.",
  );
  expect(whyText({ ...COQUETA, weekdayUnits: 0, weekdayDays: 0, expected: 18, suggested: 11 }, 2)).toBe(
    "Vende unas 9 al día los sábados y domingos: 18 en los próximos 2 días. Más tu mínimo (6), menos lo que tienes (13): 11.",
  );
});

test("la nota de «Cómo se vende»: el promedio de lunes a viernes y el de los fines de semana, redondeados", () => {
  const days = [4.6, 5, 5.2, 4.8, 5.4, 9.5, 8.5].map((average, index) => ({ dow: index + 1, average }));
  expect(weekdayNote(days)).toBe(
    "Unas 5 al día de lunes a viernes y 9 los sábados y domingos, según las últimas 4 semanas.",
  );
});

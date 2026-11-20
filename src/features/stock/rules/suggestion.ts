type Why = {
  suggested: number;
  expected: number;
  weekdayUnits: number;
  weekdayDays: number;
  weekendUnits: number;
  weekendDays: number;
  minStock: number;
  onHand: number;
};

const period = (days: number) => (days === 7 ? "esta semana" : `los próximos ${days} días`);
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// «Esta semana conviene hacer 145 alfajores» (la maqueta), según cada cuánto produce el negocio
export function suggestionTitle(total: number, horizonDays: number): string {
  const when = horizonDays === 7 ? "Esta semana" : `Para ${period(horizonDays)}`;
  return `${when} conviene hacer ${total} ${total === 1 ? "alfajor" : "alfajores"}`;
}

export function upToDateText(horizonDays: number): string {
  return `Tu producción está al día para ${period(horizonDays)}.`;
}

// «Por qué 36»: lo que vende de lunes a viernes y los fines de semana, la venta esperada, el mínimo y lo que tiene
export function whyText(item: Why, horizonDays: number): string {
  const weekday = item.weekdayDays
    ? `unas ${Math.round(item.weekdayUnits / item.weekdayDays)} al día de lunes a viernes`
    : "";
  const weekend = item.weekendDays ? `${Math.round(item.weekendUnits / item.weekendDays)} los sábados y domingos` : "";
  const sells =
    weekday && weekend ? `${weekday} y ${weekend}` : weekday || `unas ${weekend.replace(" los", " al día los")}`;
  const stock =
    item.onHand > 0
      ? `, menos lo que tienes (${item.onHand})`
      : item.onHand < 0
        ? `, más las ${-item.onHand} que vendiste de más`
        : ", y hoy no tienes ninguno";
  const span = horizonDays === 7 ? "en la semana" : `en ${period(horizonDays)}`;
  return capitalize(
    `vende ${sells}: ${item.expected} ${span}. Más tu mínimo (${item.minStock})${stock}: ${item.suggested}.`,
  );
}

// La nota de «Cómo se vende» (la maqueta): el promedio de lunes a viernes y el de los fines de semana, redondeados
export function weekdayNote(days: { dow: number; average: number }[]): string {
  const mean = (list: { average: number }[]) =>
    Math.round(list.reduce((sum, day) => sum + day.average, 0) / Math.max(list.length, 1));
  const weekday = mean(days.filter((day) => day.dow <= 5));
  const weekend = mean(days.filter((day) => day.dow >= 6));
  return `Unas ${weekday} al día de lunes a viernes y ${weekend} los sábados y domingos, según las últimas 4 semanas.`;
}

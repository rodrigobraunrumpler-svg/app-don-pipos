// Módulo reports: lo único que ven las pantallas y los otros módulos. Cada cosa se exporta por su nombre.
export { homeSummaryQuery, rankingQuery, reportSummaryQuery } from "./queries/reports";
export { reportsKeys } from "./queries/keys";
export { periodRange } from "./rules/period";
export type { HomeSummary, Ranking, ReportSummary } from "./schema/report";
export { HomeScreen } from "./components/home-screen";
export { ReportsScreen } from "./components/reports-screen";
export { RankingScreen } from "./components/ranking-screen";
export { ReportsRow } from "./components/reports-row";

import type { MacroEvidence, MacroReport, MacroReportResponse } from './types';
import { createEmptyMacroReport } from './macroReportUtils';

/** @deprecated Use createEmptyMacroReport() — no fake pre-filled data */
export const DEFAULT_MACRO_REPORT: MacroReport = createEmptyMacroReport();

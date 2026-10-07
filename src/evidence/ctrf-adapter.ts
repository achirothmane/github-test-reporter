import type { CTRFReport } from "ctrf";
import { isTestFlaky } from "../ctrf/core/src/methods/run-insights.js";
import {
	CI_RETRY_GATE_EVIDENCE_SCHEMA,
	assertCiRetryGateEvidenceV1,
	type CiRetryGateEvidenceQualityV1,
	type CiRetryGateEvidenceSubjectV1,
	type CiRetryGateEvidenceV1,
} from "./ci-retry-gate-contract.js";
import {
	aggregateCtrfHistory,
	toHistoricalSignals,
	type CtrfHistoryAggregation,
} from "./ctrf-history.js";

export interface CtrfEvidenceContextV1 {
	subject: CiRetryGateEvidenceSubjectV1;
	observedAt: string;
	sourceRefs: string[];
	producerVersion: string;
	capturedAt?: string;
}

function requireCount(value: unknown, field: string): number {
	if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
		throw new TypeError("Invalid CTRF summary field: " + field);
	}
	return value;
}

function requireCurrentReport(report: CTRFReport): void {
	if (!report?.results?.summary || !Array.isArray(report.results.tests)) {
		throw new TypeError("Current CTRF report is missing summary or tests");
	}
	const summary = report.results.summary;
	requireCount(summary.tests, "tests");
	requireCount(summary.passed, "passed");
	requireCount(summary.failed, "failed");
	requireCount(summary.skipped, "skipped");
	if (
		typeof summary.start !== "number" ||
		!Number.isFinite(summary.start) ||
		typeof summary.stop !== "number" ||
		!Number.isFinite(summary.stop) ||
		summary.stop < summary.start
	) {
		throw new TypeError("Current CTRF report has an invalid time interval");
	}
}

function buildQuality(
	report: CTRFReport,
	history: CtrfHistoryAggregation,
	suppliedHistory: number,
): CiRetryGateEvidenceQualityV1 {
	const reasons: string[] = [];

	if (report.results.summary.tests !== report.results.tests.length) {
		reasons.push("CTRF summary test count differs from test observations.");
	}
	if (suppliedHistory === 0) {
		reasons.push("No comparable historical CTRF reports were supplied.");
	} else if (history.runs === 0) {
		reasons.push("No supplied historical CTRF report was usable.");
	}
	if (history.ignored > 0) {
		reasons.push(
			String(history.ignored) +
				" historical CTRF report(s) were ignored as malformed.",
		);
	}
	if (history.runs > 0 && history.tests === 0) {
		reasons.push("Historical CTRF reports contained no test observations.");
	}

	return {
		level: reasons.length === 0 ? "COMPLETE" : "PARTIAL",
		reasons,
	};
}

export function buildCiRetryGateEvidenceFromCtrf(
	currentReport: CTRFReport,
	previousReports: CTRFReport[],
	context: CtrfEvidenceContextV1,
): CiRetryGateEvidenceV1 {
	requireCurrentReport(currentReport);

	const summary = currentReport.results.summary;
	const history = aggregateCtrfHistory(previousReports);
	const evidence: CiRetryGateEvidenceV1 = {
		schemaVersion: CI_RETRY_GATE_EVIDENCE_SCHEMA,
		authority: "EVIDENCE_ONLY",
		subject: context.subject,
		framework: currentReport.results.tool?.name?.trim() || "unknown",
		observedAt: context.observedAt,
		summary: {
			tests: requireCount(summary.tests, "tests"),
			passed: requireCount(summary.passed, "passed"),
			failed: requireCount(summary.failed, "failed"),
			skipped: requireCount(summary.skipped, "skipped"),
			flaky: currentReport.results.tests.filter(isTestFlaky).length,
			durationMs: Number((summary.stop - summary.start).toFixed(2)),
		},
		historicalSignals: toHistoricalSignals(history),
		provenance: {
			sourceFormat: "CTRF",
			sourceRefs: [...context.sourceRefs],
			producer: "test-evidence-engine",
			producerVersion: context.producerVersion,
			capturedAt: context.capturedAt ?? context.observedAt,
		},
		quality: buildQuality(currentReport, history, previousReports.length),
	};

	assertCiRetryGateEvidenceV1(evidence);
	return evidence;
}

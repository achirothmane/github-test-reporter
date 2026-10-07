import type { CTRFReport, Test } from "ctrf";
import { isTestFlaky } from "../ctrf/core/src/methods/run-insights.js";
import type { CiRetryGateHistoricalSignalsV1 } from "./ci-retry-gate-contract.js";

export interface CtrfHistoryAggregation {
	runs: number;
	tests: number;
	failed: number;
	flaky: number;
	durations: number[];
	ignored: number;
}

function usable(report: CTRFReport): boolean {
	return Boolean(
		report?.results?.summary &&
			Array.isArray(report.results.tests) &&
			typeof report.results.summary.tests === "number" &&
			Number.isFinite(report.results.summary.tests),
	);
}

function observedDuration(test: Test): number | null {
	if (
		typeof test.duration !== "number" ||
		!Number.isFinite(test.duration) ||
		test.duration < 0
	) {
		return null;
	}
	return test.duration;
}

function p95(values: number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
	return Number(sorted[index].toFixed(2));
}

function rate(numerator: number, denominator: number): number | null {
	if (denominator === 0) return null;
	return Number((numerator / denominator).toFixed(4));
}

export function aggregateCtrfHistory(
	reports: CTRFReport[],
): CtrfHistoryAggregation {
	const history: CtrfHistoryAggregation = {
		runs: 0,
		tests: 0,
		failed: 0,
		flaky: 0,
		durations: [],
		ignored: 0,
	};

	for (const report of reports) {
		if (!usable(report)) {
			history.ignored += 1;
			continue;
		}

		history.runs += 1;
		for (const test of report.results.tests) {
			history.tests += 1;
			if (test.status === "failed") history.failed += 1;
			if (isTestFlaky(test)) history.flaky += 1;

			const duration = observedDuration(test);
			if (duration !== null) history.durations.push(duration);
		}
	}

	return history;
}

export function toHistoricalSignals(
	history: CtrfHistoryAggregation,
): CiRetryGateHistoricalSignalsV1 {
	return {
		historyWindowRuns: history.runs,
		failRate: rate(history.failed, history.tests),
		flakyRate: rate(history.flaky, history.tests),
		p95DurationMs: p95(history.durations),
	};
}

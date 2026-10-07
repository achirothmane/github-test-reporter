import type { CTRFReport } from "ctrf";
import {
	buildCiRetryGateEvidenceFromCtrf,
	type CtrfEvidenceContextV1,
} from "../../src/evidence/ctrf-adapter.js";

const SHA = "0123456789abcdef0123456789abcdef01234567";

function context(): CtrfEvidenceContextV1 {
	return {
		subject: {
			repository: "example/project",
			workflowName: "CI",
			runId: 101,
			runAttempt: 1,
			headSha: SHA,
		},
		observedAt: "2026-10-07T07:00:00Z",
		sourceRefs: ["artifact://ctrf/current"],
		producerVersion: "0.1.0-dev",
	};
}

function report(
	tests: Array<{
		name: string;
		status: "passed" | "failed" | "skipped" | "pending" | "other";
		duration?: number;
		flaky?: boolean;
		retries?: number;
	}>,
	start = 1000,
	stop = 2000,
): CTRFReport {
	const passed = tests.filter((test) => test.status === "passed").length;
	const failed = tests.filter((test) => test.status === "failed").length;
	const skipped = tests.filter((test) => test.status === "skipped").length;
	const pending = tests.filter((test) => test.status === "pending").length;
	const other = tests.filter((test) => test.status === "other").length;

	return {
		reportFormat: "CTRF",
		specVersion: "1.0.0",
		results: {
			tool: { name: "vitest" },
			summary: {
				tests: tests.length,
				passed,
				failed,
				skipped,
				pending,
				other,
				start,
				stop,
			},
			tests,
		},
	} as CTRFReport;
}

describe("CTRF to CI Retry Gate evidence adapter", () => {
	it("binds observations without granting retry authority", () => {
		const current = report([
			{ name: "passes", status: "passed", duration: 100 },
			{ name: "fails", status: "failed", duration: 200 },
			{ name: "recovered", status: "passed", duration: 150, retries: 1 },
		]);

		const evidence = buildCiRetryGateEvidenceFromCtrf(current, [], context());

		expect(evidence.authority).toBe("EVIDENCE_ONLY");
		expect(evidence.subject.runId).toBe(101);
		expect(evidence.framework).toBe("vitest");
		expect(evidence.summary).toEqual({
			tests: 3,
			passed: 2,
			failed: 1,
			skipped: 0,
			flaky: 1,
			durationMs: 1000,
		});
	});

	it("represents missing history as null rather than zero risk", () => {
		const evidence = buildCiRetryGateEvidenceFromCtrf(
			report([{ name: "passes", status: "passed", duration: 100 }]),
			[],
			context(),
		);

		expect(evidence.historicalSignals).toEqual({
			historyWindowRuns: 0,
			failRate: null,
			flakyRate: null,
			p95DurationMs: null,
		});
		expect(evidence.quality.level).toBe("PARTIAL");
	});

	it("calculates historical signals from previous reports only", () => {
		const current = report([
			{ name: "current-failure", status: "failed", duration: 9999 },
		]);
		const history = [
			report([
				{ name: "a", status: "passed", duration: 10 },
				{ name: "b", status: "failed", duration: 20 },
			]),
			report([
				{ name: "a", status: "passed", duration: 30, flaky: true },
				{ name: "c", status: "passed", duration: 40 },
			]),
		];

		const evidence = buildCiRetryGateEvidenceFromCtrf(
			current,
			history,
			context(),
		);

		expect(evidence.historicalSignals.historyWindowRuns).toBe(2);
		expect(evidence.historicalSignals.failRate).toBe(0.25);
		expect(evidence.historicalSignals.flakyRate).toBe(0.25);
		expect(evidence.historicalSignals.p95DurationMs).toBe(40);
		expect(evidence.quality.level).toBe("COMPLETE");
	});

	it("does not treat malformed history as evidence", () => {
		const malformed = { results: {} } as CTRFReport;
		const evidence = buildCiRetryGateEvidenceFromCtrf(
			report([{ name: "a", status: "passed", duration: 10 }]),
			[malformed],
			context(),
		);

		expect(evidence.historicalSignals.historyWindowRuns).toBe(0);
		expect(evidence.historicalSignals.failRate).toBeNull();
		expect(evidence.quality.level).toBe("PARTIAL");
		expect(evidence.quality.reasons.join(" ")).toContain("ignored");
	});

	it("marks summary/test-count contradiction as partial", () => {
		const current = report([{ name: "a", status: "passed", duration: 10 }]);
		current.results.summary.tests = 2;

		const evidence = buildCiRetryGateEvidenceFromCtrf(
			current,
			[report([{ name: "old", status: "passed", duration: 8 }])],
			context(),
		);

		expect(evidence.quality.level).toBe("PARTIAL");
		expect(evidence.quality.reasons.join(" ")).toContain("differs");
	});

	it("refuses an invalid current time interval", () => {
		const current = report(
			[{ name: "a", status: "passed", duration: 10 }],
			2000,
			1000,
		);

		expect(() =>
			buildCiRetryGateEvidenceFromCtrf(current, [], context()),
		).toThrow(TypeError);
	});

	it("refuses an envelope without provenance references", () => {
		const invalidContext = context();
		invalidContext.sourceRefs = [];

		expect(() =>
			buildCiRetryGateEvidenceFromCtrf(
				report([{ name: "a", status: "passed", duration: 10 }]),
				[],
				invalidContext,
			),
		).toThrow(TypeError);
	});
});

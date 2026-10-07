export const CI_RETRY_GATE_EVIDENCE_SCHEMA =
	"test-evidence-engine.ci-retry-gate.v1" as const;

export type EvidenceQuality = "COMPLETE" | "PARTIAL" | "INSUFFICIENT";

export interface CiRetryGateEvidenceSubjectV1 {
	repository: string;
	workflowName: string;
	runId: number;
	runAttempt: number;
	headSha: string;
}

export interface CiRetryGateEvidenceSummaryV1 {
	tests: number;
	passed: number;
	failed: number;
	skipped: number;
	flaky: number;
	durationMs: number;
}

export interface CiRetryGateHistoricalSignalsV1 {
	historyWindowRuns: number;
	failRate: number | null;
	flakyRate: number | null;
	p95DurationMs: number | null;
}

export interface CiRetryGateEvidenceProvenanceV1 {
	sourceFormat: "CTRF" | "JUNIT" | "OTHER";
	sourceRefs: string[];
	producer: string;
	producerVersion: string;
	capturedAt: string;
}

export interface CiRetryGateEvidenceQualityV1 {
	level: EvidenceQuality;
	reasons: string[];
}

export interface CiRetryGateEvidenceV1 {
	schemaVersion: typeof CI_RETRY_GATE_EVIDENCE_SCHEMA;
	authority: "EVIDENCE_ONLY";
	subject: CiRetryGateEvidenceSubjectV1;
	framework: string;
	observedAt: string;
	summary: CiRetryGateEvidenceSummaryV1;
	historicalSignals: CiRetryGateHistoricalSignalsV1;
	provenance: CiRetryGateEvidenceProvenanceV1;
	quality: CiRetryGateEvidenceQualityV1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
	return Number.isInteger(value) && Number(value) >= 0;
}

function isPositiveInteger(value: unknown): value is number {
	return Number.isInteger(value) && Number(value) > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
	return (
		typeof value === "number" && Number.isFinite(value) && Number(value) >= 0
	);
}

function isRateOrNull(value: unknown): value is number | null {
	return (
		value === null ||
		(typeof value === "number" &&
			Number.isFinite(value) &&
			value >= 0 &&
			value <= 1)
	);
}

function isIsoDate(value: unknown): value is string {
	return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function isHeadSha(value: unknown): value is string {
	return (
		typeof value === "string" && /^[a-f0-9]{40}([a-f0-9]{24})?$/i.test(value)
	);
}

function isStringArray(value: unknown): value is string[] {
	return (
		Array.isArray(value) && value.every((entry) => isNonEmptyString(entry))
	);
}

function isSubject(value: unknown): value is CiRetryGateEvidenceSubjectV1 {
	if (!isRecord(value)) return false;

	return (
		isNonEmptyString(value.repository) &&
		value.repository.includes("/") &&
		isNonEmptyString(value.workflowName) &&
		isPositiveInteger(value.runId) &&
		isPositiveInteger(value.runAttempt) &&
		isHeadSha(value.headSha)
	);
}

function isSummary(value: unknown): value is CiRetryGateEvidenceSummaryV1 {
	if (!isRecord(value)) return false;

	const counts = [
		value.tests,
		value.passed,
		value.failed,
		value.skipped,
		value.flaky,
	];

	return (
		counts.every(isNonNegativeInteger) &&
		isNonNegativeNumber(value.durationMs) &&
		Number(value.passed) + Number(value.failed) + Number(value.skipped) <=
			Number(value.tests)
	);
}

function isHistoricalSignals(
	value: unknown,
): value is CiRetryGateHistoricalSignalsV1 {
	if (!isRecord(value)) return false;

	return (
		isNonNegativeInteger(value.historyWindowRuns) &&
		isRateOrNull(value.failRate) &&
		isRateOrNull(value.flakyRate) &&
		(value.p95DurationMs === null || isNonNegativeNumber(value.p95DurationMs))
	);
}

function isProvenance(
	value: unknown,
): value is CiRetryGateEvidenceProvenanceV1 {
	if (!isRecord(value)) return false;

	return (
		(value.sourceFormat === "CTRF" ||
			value.sourceFormat === "JUNIT" ||
			value.sourceFormat === "OTHER") &&
		isStringArray(value.sourceRefs) &&
		value.sourceRefs.length > 0 &&
		isNonEmptyString(value.producer) &&
		isNonEmptyString(value.producerVersion) &&
		isIsoDate(value.capturedAt)
	);
}

function isQuality(value: unknown): value is CiRetryGateEvidenceQualityV1 {
	if (!isRecord(value)) return false;

	return (
		(value.level === "COMPLETE" ||
			value.level === "PARTIAL" ||
			value.level === "INSUFFICIENT") &&
		Array.isArray(value.reasons) &&
		value.reasons.every((reason) => isNonEmptyString(reason))
	);
}

export function validateCiRetryGateEvidenceV1(
	value: unknown,
): value is CiRetryGateEvidenceV1 {
	if (!isRecord(value)) return false;

	return (
		value.schemaVersion === CI_RETRY_GATE_EVIDENCE_SCHEMA &&
		value.authority === "EVIDENCE_ONLY" &&
		isSubject(value.subject) &&
		isNonEmptyString(value.framework) &&
		isIsoDate(value.observedAt) &&
		isSummary(value.summary) &&
		isHistoricalSignals(value.historicalSignals) &&
		isProvenance(value.provenance) &&
		isQuality(value.quality)
	);
}

export function assertCiRetryGateEvidenceV1(
	value: unknown,
): asserts value is CiRetryGateEvidenceV1 {
	if (!validateCiRetryGateEvidenceV1(value)) {
		throw new TypeError(
			"Invalid test-evidence-engine.ci-retry-gate.v1 evidence envelope",
		);
	}
}

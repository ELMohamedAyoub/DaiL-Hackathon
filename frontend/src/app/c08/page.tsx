"use client";

import { useEffect, useRef, useState } from "react";

type NumericClaim = {
  kind: "attendance" | "planned-capacity";
  value: number;
  unit: string;
  period: string;
  source_evidence_id: string;
  source_text: string;
  interpretation: string;
};

type Report = {
  programme_id: string;
  programme_name: string;
  reporting_period: string;
  status: "draft" | "sent-back" | "approved";
  numeric_claims: NumericClaim[];
  completion_claim: {
    value: "not stated";
    statement: string;
    period: string;
    source_evidence_id: string;
    source_text: string;
  };
  flagged_evidence: {
    evidence_id: string;
    evidence_type: string;
    source_text: string;
    disposition: string;
    reason: string;
  }[];
  source_cross_checks: {
    status: "needs-review" | "unresolved";
    source_evidence_ids: string[];
    finding: string;
    action: string;
  }[];
  partner_questions: {
    id: string;
    question: string;
    source_evidence_id: string;
  }[];
  reviewer_notes: { id: string; text: string }[];
  data_status: string;
  approval?: { reviewer_name: string; simulated: true; effect: string };
  send_back?: { reviewer_name: string; reason: string; simulated: true };
  history: { event: string; reviewer_name: string; detail: string; at: string }[];
  rules: string[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8461";
const REVIEWER_NAME = "Maya El Idrissi";

type ProgrammeSummary = { id: string; label: string; official: boolean };

function EvidenceReveal({
  id,
  text,
  defaultOpen = false,
  label = "Reveal raw source text",
}: {
  id: string;
  text: string;
  defaultOpen?: boolean;
  label?: string;
}) {
  return (
    <details className="evidence-source group" open={defaultOpen}>
      <summary>{label}</summary>
      <blockquote>
        “{text}”
        <cite>{id} · synthetic source record</cite>
      </blockquote>
    </details>
  );
}

function AskAboutReport({ programmeId }: { programmeId: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  async function ask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;

    setAsking(true);
    setAskError(null);
    setAnswer(null);
    try {
      const response = await fetch(`${API_URL}/programmes/${programmeId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { answer: string };
      setAnswer(data.answer);
    } catch {
      setAskError("Couldn't get an answer. Confirm the API is running, then try again.");
    } finally {
      setAsking(false);
    }
  }

  return (
    <section className="ask-panel no-print" aria-labelledby="ask-heading">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="ask-heading" className="font-display text-xl">Ask about this report</h2>
        <span className="tag">answers only from this report's evidence</span>
      </div>
      <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">
        Grounded in the claim ledger above, nothing else. It will say so, and name the
        missing record, if the report doesn't contain the answer.
      </p>
      <form onSubmit={ask} className="ask-form">
        <input
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="e.g. How many people completed the programme?"
          disabled={asking}
          aria-label="Question about this report"
        />
        <button type="submit" disabled={asking || !question.trim()}>
          {asking ? "Asking…" : "Ask"}
        </button>
      </form>
      {answer && <p className="ask-answer">{answer}</p>}
      {askError && (
        <p role="alert" className="mt-3 bg-danger-soft p-3 text-xs font-semibold text-danger">
          {askError}
        </p>
      )}
    </section>
  );
}

type Stage = "idle" | "processed";

export default function C08Page() {
  const [programmes, setProgrammes] = useState<ProgrammeSummary[]>([]);
  const [programmeId, setProgrammeId] = useState("PRG-SYN");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [showSendBack, setShowSendBack] = useState(false);
  const [sendBackReason, setSendBackReason] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const reportStartRef = useRef<HTMLElement>(null);
  const attendanceClaim = report?.numeric_claims.find((claim) => claim.kind === "attendance");
  const planClaim = report?.numeric_claims.find((claim) => claim.kind === "planned-capacity");

  useEffect(() => {
    fetch(`${API_URL}/programmes`)
      .then((response) => (response.ok ? response.json() : []))
      .then((data: ProgrammeSummary[]) => setProgrammes(data))
      .catch(() => setProgrammes([]));
  }, []);

  useEffect(() => {
    if (stage !== "processed") return;
    const frame = window.requestAnimationFrame(() => {
      reportStartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [stage]);

  function resetForNewProgramme(nextId: string) {
    setProgrammeId(nextId);
    setReport(null);
    setStage("idle");
    setShowSendBack(false);
    setSendBackReason("");
    setError(null);
  }

  function simulateIncomingEvidence() {
    setLoadingEvidence(true);
    setError(null);
    fetch(`${API_URL}/programmes/${programmeId}/report`)
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<Report>;
      })
      .then((data) => {
        setReport(data);
        setStage("processed");
      })
      .catch(() =>
        setError("Report unavailable. Start the API on port 8461 and try again."),
      )
      .finally(() => setLoadingEvidence(false));
  }

  async function approve() {
    setWorking(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/programmes/${programmeId}/report/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewer_name: REVIEWER_NAME,
            simulated: true,
          }),
        },
      );
      if (!response.ok) throw new Error();
      setReport((await response.json()) as Report);
      setShowSendBack(false);
      setSendBackReason("");
    } catch {
      setError("Simulated approval failed. Confirm the API is running, then try again.");
    } finally {
      setWorking(false);
    }
  }

  async function sendBack(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = sendBackReason.trim();
    if (!reason) return;

    setWorking(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/programmes/${programmeId}/report/send-back`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewer_name: REVIEWER_NAME,
            reason,
            simulated: true,
          }),
        },
      );
      if (!response.ok) throw new Error();
      setReport((await response.json()) as Report);
      setShowSendBack(false);
      setSendBackReason("");
    } catch {
      setError("Send-back failed. Confirm the API is running, then try again.");
    } finally {
      setWorking(false);
    }
  }

  function reviewerDecision() {
    if (!report) return null;
    return (
      <section id="review" className="review-strip review-strip-primary">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold">Decision by {REVIEWER_NAME}</h2>
            <span className="tag">simulated human action</span>
          </div>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted">
            Approve this cautious wording, or send it back with a reason. The underlying evidence and numbers never change.
          </p>
        </div>
        {report.status === "approved" ? (
          <div className="approval-confirmation">
            Approved <span>simulated · status only</span>
          </div>
        ) : (
          <div className="review-actions no-print">
            <div className="review-buttons">
              <button type="button" onClick={approve} disabled={working} className="approval-button">
                {working ? "Recording action…" : "Approve wording"}
              </button>
              <button
                type="button"
                onClick={() => setShowSendBack((visible) => !visible)}
                disabled={working}
                className="send-back-button"
                aria-expanded={showSendBack}
                aria-controls="send-back-form"
              >
                Request evidence
              </button>
            </div>
            {showSendBack && (
              <form id="send-back-form" onSubmit={sendBack} className="send-back-form">
                <label htmlFor="send-back-reason">What does the partner need to clarify or provide?</label>
                <p className="send-back-helper">This reason becomes part of the visible review history.</p>
                <div>
                  <input
                    id="send-back-reason"
                    type="text"
                    value={sendBackReason}
                    onChange={(event) => setSendBackReason(event.target.value)}
                    required
                    disabled={working}
                  />
                  <button type="submit" disabled={working || !sendBackReason.trim()}>
                    {working ? "Recording action…" : "Send request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="luma-header no-print">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-5 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="luma-mark" aria-hidden="true">
              <i /><i /><i /><i />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-[-0.01em]">Luma Evidence</p>
              <p className="text-[0.68rem] text-muted">Clear claims. Traceable sources.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="luma-context">C08</span>
            <span className="luma-data-badge">Synthetic data</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 sm:py-12">
        {stage !== "processed" && <section className="luma-intro no-print mb-10 px-5 py-7 text-white sm:px-8 sm:py-9">
          <p className="inline-flex border border-white/40 bg-white/10 px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.04em] text-white">
            the problem
          </p>
          <blockquote className="mt-3 max-w-2xl font-display text-xl leading-snug sm:text-2xl">
            &ldquo;A field update, an attendance sheet and a coordinator note tell slightly
            different stories. I need a report that explains what is supported, what is
            uncertain, and what we should ask the partner next.&rdquo;
          </blockquote>
          <p className="mt-3 text-xs text-slate-300">
            Programme reporting officer, C08 (synthetic exercise dialogue, not a real client
            quote)
          </p>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-200">
            What follows is a working prototype, not slides. Real: the rules engine, the live
            API, this interface. Simulated: the exercise data, the named reviewer, and the
            approval action.
          </p>
        </section>}

        {stage !== "processed" && <section className="grid gap-6 border-b border-border pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="mb-3 text-sm font-semibold text-teal">C08 · participation report</p>
            <h1 className="max-w-3xl font-display text-4xl leading-[1.05] tracking-[-0.025em] sm:text-6xl">
              Turn mixed evidence into a report you can defend.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
              See the supported result first, then inspect the discrepancy and every source behind it.
            </p>
          </div>
          {report && (
            <div className="report-status-wrap">
              <div className={`state-stamp report-status state-report-${report.status}`}>
                <span>Report status</span>
                <strong>{report.status}</strong>
                <small>
                  {report.status === "draft"
                    ? "Awaiting named reviewer"
                    : report.status === "sent-back"
                      ? "More evidence requested"
                      : "Simulated human approval"}
                </small>
              </div>
              {report.status === "sent-back" && report.send_back && (
                <p className="send-back-reason">
                  <strong>{report.send_back.reviewer_name}</strong>
                  <span>{report.send_back.reason}</span>
                </p>
              )}
            </div>
          )}
        </section>}

        {error && (
          <p role="alert" className="mt-8 bg-danger-soft p-5 text-sm font-semibold text-danger">
            {error}
          </p>
        )}

        {stage === "idle" && !error && (
          <section className="mt-8 border border-border bg-surface px-5 py-8 sm:px-8">
            {programmes.length > 1 && (
              <div className="mb-6">
                <p className="tag">choose a case</p>
                <p className="mt-2 max-w-xl text-xs leading-5 text-muted">
                  One official exercise record, plus demo-only cases built to exercise the
                  same rules engine against scenarios the official record does not cover.
                  Demo cases are clearly labeled and never alter the official file.
                </p>
                <div className="mt-3 grid gap-2">
                  {programmes.map((programme) => (
                    <button
                      key={programme.id}
                      type="button"
                      onClick={() => resetForNewProgramme(programme.id)}
                      className={`programme-option ${programme.id === programmeId ? "programme-option-active" : ""}`}
                    >
                      <span className="font-mono text-[0.65rem] font-bold">{programme.id}</span>
                      <span>{programme.label}</span>
                      <span className="tag">{programme.official ? "official record" : "demo only"}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="tag">data source</p>
            <p className="mt-2 font-mono text-xs text-muted">
              {programmes.find((p) => p.id === programmeId)?.official
                ? "octopus-candidate-pack/C08/initial.json"
                : `octopus-candidate-pack/C08/demo-cases/${programmeId}.json`}
            </p>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
              Nothing has been read yet. Trigger the simulated submission to load the
              evidence records exactly as they exist in that file.
            </p>
            <button
              type="button"
              onClick={simulateIncomingEvidence}
              disabled={loadingEvidence}
              className="approval-button mt-5"
            >
              {loadingEvidence ? "Cross-checking evidence…" : "Simulate submission and review evidence"}
            </button>
          </section>
        )}

        {report && (
          <div className="evidence-reveal">
            {stage === "processed" && (
              <>
            <section ref={reportStartRef} className="decision-summary" aria-labelledby="decision-summary-heading">
              <div className="decision-summary-heading">
                <div>
                  <p className="tag">reviewer brief</p>
                  <h2 id="decision-summary-heading" className="mt-2 font-display text-3xl sm:text-4xl">
                    {attendanceClaim?.value ?? "unknown"} attended. {planClaim?.value ?? "unknown"} was the target. Completion is unknown.
                  </h2>
                </div>
                <span className="decision-badge">One evidence gap remains</span>
              </div>

              <div className="decision-grid">
                <article>
                  <span className="decision-label decision-label-supported">Supported</span>
                  <strong>{attendanceClaim?.value ?? "unknown"} people attended</strong>
                  <p>Use this as the actual participation figure.</p>
                  <small>Source: {attendanceClaim?.source_evidence_id ?? "No attendance record"}</small>
                </article>
                <article>
                  <span className="decision-label decision-label-context">Target only</span>
                  <strong>{planClaim?.value ?? "unknown"} people planned</strong>
                  <p>Show this as capacity, not people trained or attended.</p>
                  <small>Source: {planClaim?.source_evidence_id ?? "No plan record"}</small>
                </article>
                <article>
                  <span className="decision-label decision-label-unknown">Not established</span>
                  <strong>Completion cannot be reported</strong>
                  <p>Attendance alone does not prove completion.</p>
                  <small>Source: {report.completion_claim.source_evidence_id || "Assessment missing"}</small>
                </article>
              </div>

              {report.source_cross_checks[0] && (
                <div className="decision-discrepancy">
                  <div><span aria-hidden="true">!</span><strong>How the mismatch is handled</strong></div>
                  <p>{report.source_cross_checks[0].finding}</p>
                  <p><strong>Recommended action:</strong> {report.source_cross_checks[0].action}</p>
                </div>
              )}

              <div className="recommended-wording">
                <span>Recommended report wording</span>
                <p>
                  “{attendanceClaim?.value ?? "No confirmed count of"} participants attended during {report.reporting_period}, against a planned capacity of {planClaim?.value ?? "an unstated number"}. Completion is not stated pending confirmation of the assessment record.”
                </p>
              </div>
            </section>

            {reviewerDecision()}

            <section aria-labelledby="rules-heading" className="mt-6 border border-border bg-surface px-5 py-6 sm:px-7">
              <h2 id="rules-heading" className="font-display text-xl">Why this wording is safe</h2>
              <p className="mt-1 text-sm text-muted">
                The exact rule text from the source record, checked against this report.
              </p>
              <ol className="mt-4 grid gap-2">
                {[
                  {
                    text: report.rules[0],
                    satisfied: report.numeric_claims.every(
                      (claim) => claim.unit && claim.period && claim.source_evidence_id,
                    ) && Boolean(report.completion_claim.period),
                  },
                  {
                    text: report.rules[1],
                    satisfied: report.status === "draft" || Boolean(report.approval),
                  },
                  {
                    text: report.rules[2],
                    satisfied: report.completion_claim.value === "not stated",
                  },
                ].map((rule, index) =>
                  rule.text ? (
                    <li
                      key={rule.text}
                      className="rule-check claim-card-reveal"
                      style={{ animationDelay: `${index * 110}ms` }}
                    >
                      <span className={`rule-mark ${rule.satisfied ? "rule-mark-pass" : "rule-mark-fail"}`} aria-hidden="true">
                        {rule.satisfied ? "✓" : "!"}
                      </span>
                      <span>{rule.text}</span>
                    </li>
                  ) : null,
                )}
              </ol>
            </section>

            <nav aria-label="Report sections" className="report-nav no-print">
              <a href="#cross-checks">Comparison detail</a>
              <a href="#claims">Supporting evidence</a>
              <a href="#excluded">Narrative context</a>
              <a href="#questions">Questions</a>
              {report.history.length > 0 && <a href="#history">History</a>}
            </nav>

            <section className="report-masthead">
              <div>
                <span className="tag">source data</span>
                <p className="mt-2 font-mono text-xs font-bold text-muted">{report.programme_id}</p>
                <h2 className="mt-1 font-display text-3xl sm:text-4xl">{report.programme_name}</h2>
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <div className="report-period">
                  <span>Reporting period</span>
                  <strong>{report.reporting_period}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="no-print export-button"
                >
                  Export report (print / save as PDF)
                </button>
              </div>
            </section>

            <section id="cross-checks" aria-labelledby="cross-checks-heading" className="cross-check-section">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="cross-checks-heading" className="font-display text-3xl">Comparison detail</h2>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
                    Plan and attendance remain authoritative for different metrics. Narrative evidence is compared with both, kept visible, and routed to review when its meaning could change the report.
                  </p>
                </div>
                <span className="tag">comparison, not automatic truth</span>
              </div>
              <div className="grid gap-4">
                {report.source_cross_checks.map((check, index) => (
                  <article key={`${check.source_evidence_ids.join("-")}-${index}`} className="cross-check-card">
                    <div className="cross-check-status">
                      <span aria-hidden="true">!</span>
                      <strong>{check.status === "needs-review" ? "Review discrepancy" : "Unable to compare"}</strong>
                    </div>
                    <div>
                      <p className="font-mono text-xs font-bold text-muted">{check.source_evidence_ids.join(" ↔ ")}</p>
                      <p className="mt-3 text-sm font-semibold leading-6">{check.finding}</p>
                      <p className="mt-2 text-sm leading-6 text-muted"><strong>Next action:</strong> {check.action}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section id="claims" aria-labelledby="claims-heading" className="py-8">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="claims-heading" className="font-display text-3xl">Supporting evidence</h2>
                  <p className="mt-1 text-sm text-muted">The audit trail behind the reviewer brief. Open any source to inspect the supplied text.</p>
                </div>
                <span className="tag">generated from initial.json</span>
              </div>

              <div className="claim-grid">
                {report.numeric_claims.map((claim, index) => (
                  <article
                    key={claim.kind}
                    className={`claim-card claim-${claim.kind} claim-card-reveal`}
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    <div className="claim-card-topline">
                      <span>{claim.kind === "attendance" ? "Attendance" : "Planned capacity"}</span>
                      <span className="font-mono">{claim.source_evidence_id}</span>
                    </div>
                    <div className="claim-value">
                      <strong>{claim.value}</strong>
                      <span>{claim.unit}</span>
                    </div>
                    <p className="claim-interpretation">{claim.interpretation}</p>
                    <dl className="claim-meta">
                      <div><dt>Period</dt><dd>{claim.period}</dd></div>
                      <div><dt>Unit</dt><dd>{claim.unit}</dd></div>
                    </dl>
                    <EvidenceReveal id={claim.source_evidence_id} text={claim.source_text} />
                  </article>
                ))}

                <article
                  className="claim-card claim-completion claim-card-reveal"
                  style={{ animationDelay: `${report.numeric_claims.length * 90}ms` }}
                >
                  <div className="claim-card-topline">
                    <span>Completion</span>
                    <span className="font-mono">{report.completion_claim.source_evidence_id}</span>
                  </div>
                  <div className="completion-state">Not stated</div>
                  <p className="claim-interpretation">{report.completion_claim.statement}</p>
                  <dl className="claim-meta">
                    <div><dt>Period</dt><dd>{report.completion_claim.period}</dd></div>
                  </dl>
                  <EvidenceReveal id={report.completion_claim.source_evidence_id} text={report.completion_claim.source_text} />
                </article>
              </div>
            </section>

            <section id="excluded" className="flagged-band" aria-labelledby="flagged-heading">
              <div className="flagged-marker" aria-hidden="true">!</div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="flagged-heading" className="font-display text-2xl">Narrative evidence kept for review</h2>
                  <span className="tag">compared, not used as a numeric citation</span>
                </div>
                {report.flagged_evidence.map((item) => (
                  <div key={item.evidence_id} className="mt-4">
                    <p className="font-mono text-xs font-bold text-danger">{item.evidence_id} · {item.evidence_type}</p>
                    <p className="mt-2 max-w-3xl text-sm leading-6">{item.reason}</p>
                    <EvidenceReveal
                      id={item.evidence_id}
                      text={item.source_text}
                      defaultOpen
                      label="Read narrative record"
                    />
                  </div>
                ))}
              </div>
            </section>

            <section id="questions" className="py-8" aria-labelledby="partner-questions-heading">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="partner-questions-heading" className="font-display text-3xl">Questions for the partner</h2>
                  <p className="mt-1 text-sm text-muted">Follow-up requests tied to incomplete or excluded evidence.</p>
                </div>
                <span className="tag">generated from initial.json</span>
              </div>
              <div className="grid gap-4">
                {report.partner_questions.map((item) => (
                  <article key={item.id} className="claim-card">
                    <div className="claim-card-topline">
                      <span>{item.id}</span>
                      <span className="font-mono">{item.source_evidence_id}</span>
                    </div>
                    <p className="mt-4 text-sm font-semibold leading-6">{item.question}</p>
                    <dl className="claim-meta">
                      <div><dt>Source</dt><dd>{item.source_evidence_id}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
            </section>

            {report.history.length > 0 && (
              <section id="history" className="mb-8" aria-labelledby="history-heading">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 id="history-heading" className="font-display text-2xl">Review history</h2>
                    <p className="mt-1 text-sm text-muted">Append-only. Nothing here is rewritten, only added to.</p>
                  </div>
                  <span className="tag">simulated reviewer actions</span>
                </div>
                <ol className="history-list">
                  {report.history.map((entry, index) => (
                    <li key={`${entry.at}-${index}`} className={`history-entry history-${entry.event}`}>
                      <span className="history-marker" aria-hidden="true" />
                      <div>
                        <p className="history-headline">
                          <strong>{entry.reviewer_name}</strong> {entry.event === "approved" ? "approved" : "sent back"} the report
                        </p>
                        {entry.detail && <p className="history-detail">{entry.detail}</p>}
                        <p className="history-timestamp">{entry.at}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {report.reviewer_notes[0] && (
              <aside className="mt-5 bg-slate-soft px-4 py-3 text-sm leading-6">
                <span className="mr-2 font-mono text-xs font-bold">{report.reviewer_notes[0].id}</span>
                <span className="tag mr-2">locked reviewer note</span>
                {report.reviewer_notes[0].text}
              </aside>
            )}

            <AskAboutReport programmeId={programmeId} />
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

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
  confidence: "high" | "low";
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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? (
  typeof window === "undefined"
    ? "http://localhost:8461"
    : `${window.location.protocol}//${window.location.hostname}:8461`
);
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

const VISIBLE_GROUP_ITEMS = 2;

function CrossCheckList({ checks }: { checks: Report["source_cross_checks"] }) {
  const visible = checks.slice(0, VISIBLE_GROUP_ITEMS);
  const rest = checks.slice(VISIBLE_GROUP_ITEMS);

  function renderCard(check: Report["source_cross_checks"][number], index: number) {
    return (
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
    );
  }

  return (
    <div className="grid gap-4">
      {visible.map(renderCard)}
      {rest.map((check, index) => {
        const itemIndex = index + VISIBLE_GROUP_ITEMS;
        const label = check.status === "needs-review" ? "Review discrepancy" : "Unable to compare";

        return (
          <details
            key={`${check.source_evidence_ids.join("-")}-${itemIndex}`}
            name="source-cross-checks"
            className="group-collapse"
          >
            <summary>{check.source_evidence_ids.join(" ↔ ")} · {label}</summary>
            <div className="mt-4">{renderCard(check, itemIndex)}</div>
          </details>
        );
      })}
    </div>
  );
}

function FlaggedEvidenceList({ items }: { items: Report["flagged_evidence"] }) {
  const visible = items.slice(0, VISIBLE_GROUP_ITEMS);
  const rest = items.slice(VISIBLE_GROUP_ITEMS);

  function renderItem(item: Report["flagged_evidence"][number]) {
    return (
      <div key={item.evidence_id} className="mt-4">
        <p className="font-mono text-xs font-bold text-danger">{item.evidence_id} · {item.evidence_type}</p>
        <p className="mt-2 max-w-3xl text-sm leading-6">{item.reason}</p>
        <EvidenceReveal id={item.evidence_id} text={item.source_text} defaultOpen label="Read narrative record" />
      </div>
    );
  }

  return (
    <>
      {visible.map(renderItem)}
      {rest.map((item) => (
        <details key={item.evidence_id} name="flagged-evidence" className="group-collapse mt-4">
          <summary>{item.evidence_id} · {item.evidence_type}</summary>
          <div>{renderItem(item)}</div>
        </details>
      ))}
    </>
  );
}

const WORKFLOW_STEPS = [
  "Select evidence",
  "Cross-check records",
  "Review wording",
  "Record decision",
];

function WorkflowProgress({ currentStep }: { currentStep: number }) {
  return (
    <nav className="workflow-progress no-print" aria-label="Review workflow">
      <ol>
        {WORKFLOW_STEPS.map((step, index) => {
          const state = index < currentStep ? "complete" : index === currentStep ? "current" : "upcoming";
          return (
            <li key={step} className={`workflow-step workflow-step-${state}`} aria-current={state === "current" ? "step" : undefined}>
              <span className="workflow-step-marker" aria-hidden="true">
                {state === "complete" ? "✓" : index + 1}
              </span>
              <span className="workflow-step-label">{step}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const SUGGESTED_QUESTIONS = [
  "How many people attended?",
  "Did the programme succeed overall?",
  "What does the voice note tell us?",
  "Was the completion assessment submitted?",
  "What should we ask the partner next?",
];

function AskAboutReport({ programmeId, reportReady }: { programmeId: string; reportReady: boolean }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<{ question: string; answer: string }[]>([]);
  const [askError, setAskError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [exchanges, asking]);

  async function askText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !reportReady) return;

    setAsking(true);
    setAskError(null);
    try {
      const response = await fetch(`${API_URL}/programmes/${programmeId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { answer: string };
      setExchanges((prev) => [...prev, { question: trimmed, answer: data.answer }]);
      setQuestion("");
    } catch {
      setAskError("Couldn't get an answer. Confirm the API is running, then try again.");
    } finally {
      setAsking(false);
    }
  }

  function ask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askText(question);
  }

  return (
    <div className="ask-widget no-print">
      {open && (
        <section
          className={`ask-panel${exchanges.length > 0 || asking ? " ask-panel-active" : ""}`}
          aria-labelledby="ask-heading"
        >
          <div className="ask-panel-header">
            <div>
              <h2 id="ask-heading" className="font-display text-base">Ask about this report</h2>
              <p className="ask-panel-subhead">Answers only from this report&rsquo;s evidence.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="ask-panel-close"
            >
              ×
            </button>
          </div>

          {!reportReady && (
            <p className="ask-empty">
              Pick a case and trigger the simulated submission first. This widget can only
              answer from a report that has actually been generated.
            </p>
          )}

          {reportReady && exchanges.length === 0 && !asking && (
            <p className="ask-empty">
              Grounded in the claim ledger, nothing else. It will say so, and name the
              missing record, if the report doesn&rsquo;t contain the answer.
            </p>
          )}

          {(exchanges.length > 0 || asking) && (
            <div className="ask-thread" aria-live="polite">
              {exchanges.map((exchange, index) => (
                <div key={index} className="ask-exchange">
                  <p className="ask-question">{exchange.question}</p>
                  <p className="ask-answer">{exchange.answer}</p>
                </div>
              ))}
              {asking && <p className="ask-answer ask-answer-loading">Checking the report evidence…</p>}
              <div ref={threadEndRef} />
            </div>
          )}

          {reportReady && exchanges.length === 0 && !asking && (
            <div className="ask-suggestions">
              {SUGGESTED_QUESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void askText(suggestion)}
                  disabled={asking}
                  className="ask-suggestion"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {askError && (
            <p role="alert" className="ask-error">
              {askError}
            </p>
          )}

          <form onSubmit={ask} className="ask-form">
            <input
              type="text"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={reportReady ? "e.g. How many people completed the programme?" : "Trigger a case first"}
              disabled={asking || !reportReady}
              aria-label="Question about this report"
            />
            <button type="submit" disabled={asking || !reportReady || !question.trim()}>
              {asking ? "Asking…" : "Ask"}
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((visible) => !visible)}
        className="ask-launcher"
        aria-expanded={open}
        aria-label={open ? "Close ask panel" : "Ask about this report"}
      >
        {open ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
            <path
              d="M4 5.5C4 4.67 4.67 4 5.5 4h13c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5H9l-4.2 3.36A.5.5 0 0 1 4 19V5.5Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <circle cx="8.5" cy="10" r="1" fill="currentColor" />
            <circle cx="12" cy="10" r="1" fill="currentColor" />
            <circle cx="15.5" cy="10" r="1" fill="currentColor" />
          </svg>
        )}
      </button>
    </div>
  );
}

type Stage = "idle" | "processed";
type TransitionPhase = "idle" | "reading" | "ready";

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
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>("idle");
  const reportStartRef = useRef<HTMLElement>(null);
  const attendanceClaim = report?.numeric_claims.find((claim) => claim.kind === "attendance");
  const planClaim = report?.numeric_claims.find((claim) => claim.kind === "planned-capacity");
  const workflowStep = transitionPhase === "reading"
    ? 1
    : stage === "idle"
      ? 0
      : report?.status === "draft"
        ? 2
        : 3;

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
    setTransitionPhase("idle");
  }

  async function simulateIncomingEvidence() {
    const startedAt = performance.now();
    setLoadingEvidence(true);
    setTransitionPhase("reading");
    setError(null);
    try {
      const response = await fetch(`${API_URL}/programmes/${programmeId}/report`);
      if (!response.ok) throw new Error();
      const data = (await response.json()) as Report;
      const minimumReadingTime = 900;
      const remaining = Math.max(0, minimumReadingTime - (performance.now() - startedAt));
      await new Promise((resolve) => window.setTimeout(resolve, remaining));
      setReport(data);
      setTransitionPhase("ready");
      await new Promise((resolve) => window.setTimeout(resolve, 520));
      setStage("processed");
      setTransitionPhase("idle");
    } catch {
      setError("Report unavailable. Start the API on port 8461 and try again.");
      setTransitionPhase("idle");
    } finally {
      setLoadingEvidence(false);
    }
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
          <div className="approval-confirmation status-confirmation" role="status">
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
    <main className={`min-h-[100dvh] bg-paper text-ink phase-${stage}`}>
      {transitionPhase !== "idle" && (
        <div className={`phase-transition phase-transition-${transitionPhase} no-print`} role="status" aria-live="polite">
          <div className="phase-transition-glow" aria-hidden="true" />
          <div className="phase-transition-card">
            <div className="phase-scan" aria-hidden="true">
              <span /><span /><span /><span />
            </div>
            <p className="phase-transition-kicker">
              {transitionPhase === "reading" ? "Evidence review in progress" : "Evidence review complete"}
            </p>
            <h2>{transitionPhase === "reading" ? "Cross-checking every record" : "Traceable claims are ready"}</h2>
            <p>
              {transitionPhase === "reading"
                ? "Separating supported counts, planned capacity and narrative context."
                : "Opening the reviewer brief with every claim linked to its source."}
            </p>
            <div className="phase-progress" aria-hidden="true"><span /></div>
          </div>
        </div>
      )}
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

      <WorkflowProgress currentStep={workflowStep} />

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

            <section aria-labelledby="rules-heading" className="scroll-reveal mt-6 border border-border bg-surface px-5 py-6 sm:px-7">
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

            <section aria-labelledby="stakes-heading" className="stakes-section scroll-reveal">
              <h2 id="stakes-heading" className="font-display text-xl">Why the exact wording matters</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
                This isn&apos;t a hypothetical risk. The American Red Cross raised $488M for Haiti
                earthquake relief and reported progress toward 130,000 homes; an investigation
                later found 6 had been built. In 2025 and 2026, AI-generated reports at Deloitte
                and EY were publicly withdrawn after containing fabricated content. A report that
                turns a target into an actual, or infers completion from attendance, is the same
                failure mode at a smaller scale.
              </p>

              <div className="stakes-compare">
                <article className="stakes-card stakes-card-bad">
                  <span className="tag">illustrative, not a real tool&apos;s output</span>
                  <h3>What a naive AI summarizer would write</h3>
                  <p>
                    &ldquo;20 participants completed the Exercise week 1 programme, meeting the
                    planned target.&rdquo;
                  </p>
                  <ul>
                    <li>Turns the PLAN-A target into an attendance figure</li>
                    <li>Infers completion from participation alone</li>
                    <li>No source cited for either claim</li>
                  </ul>
                </article>
                <article className="stakes-card stakes-card-good">
                  <span className="tag">what this report actually says</span>
                  <h3>This report</h3>
                  <p>
                    &ldquo;{attendanceClaim?.value ?? "No confirmed count of"} people attended{" "}
                    {report.reporting_period} ({attendanceClaim?.source_evidence_id ?? "no record"}
                    ). {planClaim?.value ?? "An unstated number"} was the planned capacity, not
                    attendance ({planClaim?.source_evidence_id ?? "no record"}). Completion is not
                    stated ({report.completion_claim.source_evidence_id || "no assessment record"}
                    ).&rdquo;
                  </p>
                  <ul>
                    <li>Every number traces to one evidence record</li>
                    <li>Target and actual stay separate, always</li>
                    <li>Absence is stated, never filled in</li>
                  </ul>
                </article>
              </div>
            </section>

            <nav aria-label="Report sections" className="report-nav no-print scroll-reveal">
              <a href="#cross-checks">Comparison detail</a>
              <a href="#claims">Supporting evidence</a>
              <a href="#excluded">Narrative context</a>
              <a href="#questions">Questions</a>
              {report.history.length > 0 && <a href="#history">History</a>}
              {programmes.length > 1 && (
                <button
                  type="button"
                  onClick={() => resetForNewProgramme(programmeId)}
                  className="report-nav-reset"
                >
                  Try another case
                </button>
              )}
            </nav>

            <section className="report-masthead scroll-reveal">
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

            <section id="cross-checks" aria-labelledby="cross-checks-heading" className="cross-check-section scroll-reveal">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="cross-checks-heading" className="font-display text-3xl">Comparison detail</h2>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
                    Plan and attendance remain authoritative for different metrics. Narrative evidence is compared with both, kept visible, and routed to review when its meaning could change the report.
                  </p>
                </div>
                <span className="tag">comparison, not automatic truth</span>
              </div>
              <CrossCheckList checks={report.source_cross_checks} />
            </section>

            <section id="claims" aria-labelledby="claims-heading" className="scroll-reveal py-8">
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
                      {claim.confidence === "low" && (
                        <span className="tag" title="Regex found more than one number in this record; an LLM picked the most likely count.">
                          AI-assisted, low confidence
                        </span>
                      )}
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

            <section id="excluded" className="flagged-band scroll-reveal" aria-labelledby="flagged-heading">
              <div className="flagged-marker" aria-hidden="true">!</div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="flagged-heading" className="font-display text-2xl">Narrative evidence kept for review</h2>
                  <span className="tag">compared, not used as a numeric citation</span>
                </div>
                <FlaggedEvidenceList items={report.flagged_evidence} />
              </div>
            </section>

            <section id="questions" className="scroll-reveal py-8" aria-labelledby="partner-questions-heading">
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
              <section id="history" className="scroll-reveal mb-8" aria-labelledby="history-heading">
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

            <section className="pitch-close" aria-label="Summary">
              <p>
                Every number above traced to one source record. Nothing was inferred.
                Nothing was assumed. That is the whole pitch.
              </p>
            </section>
              </>
            )}
          </div>
        )}
      </div>
      <AskAboutReport key={programmeId} programmeId={programmeId} reportReady={stage === "processed"} />
    </main>
  );
}

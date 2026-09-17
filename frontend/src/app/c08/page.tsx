"use client";

import { useState } from "react";

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
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8461";
const PROGRAMME_ID = "PRG-SYN";
const REVIEWER_NAME = "Maya El Idrissi";

function EvidenceReveal({ id, text }: { id: string; text: string }) {
  return (
    <details className="evidence-source group">
      <summary>Reveal raw source text</summary>
      <blockquote>
        “{text}”
        <cite>{id} · synthetic source record</cite>
      </blockquote>
    </details>
  );
}

type Stage = "idle" | "arrived" | "processed";

export default function C08Page() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [showSendBack, setShowSendBack] = useState(false);
  const [sendBackReason, setSendBackReason] = useState("");
  const [stage, setStage] = useState<Stage>("idle");

  function simulateIncomingEvidence() {
    setLoadingEvidence(true);
    setError(null);
    fetch(`${API_URL}/programmes/${PROGRAMME_ID}/report`)
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<Report>;
      })
      .then((data) => {
        setReport(data);
        setStage("arrived");
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
        `${API_URL}/programmes/${PROGRAMME_ID}/report/approve`,
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
        `${API_URL}/programmes/${PROGRAMME_ID}/report/send-back`,
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

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="no-print border-b border-ink bg-navy text-white">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-5 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center border border-white/40 font-display text-xl">C08</span>
            <div>
              <p className="text-sm font-semibold">Evidence report desk</p>
              <p className="text-xs text-slate-300">Claims, sources, reviewer status</p>
            </div>
          </div>
          <span className="border border-amber/70 bg-amber/10 px-2.5 py-1 text-xs font-semibold text-amber">
            Synthetic exercise data
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 sm:py-12">
        <section className="no-print mb-10 border border-navy bg-navy px-5 py-7 text-white sm:px-8 sm:py-9">
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
        </section>

        <section className="grid gap-6 border-b border-border pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="mb-3 text-sm font-semibold text-teal">C08 · participation report</p>
            <h1 className="max-w-3xl font-display text-4xl leading-[1.05] tracking-[-0.025em] sm:text-6xl">
              Every claim keeps its receipt.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
              Attendance, planned capacity, and missing completion evidence remain separate. Approval changes visibility status only, not the generated claims.
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
        </section>

        {error && <p role="alert" className="mt-8 border-l-4 border-danger bg-danger-soft p-5 text-sm">{error}</p>}

        {stage === "idle" && !error && (
          <section className="mt-8 border border-border bg-surface px-5 py-8 sm:px-8">
            <p className="tag">data source</p>
            <p className="mt-2 font-mono text-xs text-muted">
              octopus-candidate-pack/C08/initial.json
            </p>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
              Nothing has been read yet. Trigger the simulated submission to load the four
              evidence records exactly as they exist in that file.
            </p>
            <button
              type="button"
              onClick={simulateIncomingEvidence}
              disabled={loadingEvidence}
              className="approval-button mt-5"
            >
              {loadingEvidence ? "Reading evidence…" : "Simulate: evidence submitted for review"}
            </button>
          </section>
        )}

        {report && (
          <div className="evidence-reveal">
            <section aria-labelledby="what-arrived-heading" className="mt-8 border border-border bg-slate-soft px-4 py-6 sm:px-7 sm:py-8">
              <h2 id="what-arrived-heading" className="font-display text-3xl">What arrived</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Four source records arrived with details that disagree before processing.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
                {[
                  {
                    id: report.numeric_claims.find((claim) => claim.kind === "planned-capacity")?.source_evidence_id ?? "PLAN-A",
                    text: report.numeric_claims.find((claim) => claim.kind === "planned-capacity")?.source_text ?? "",
                    position: "lg:-translate-y-1 lg:-rotate-1",
                  },
                  {
                    id: report.numeric_claims.find((claim) => claim.kind === "attendance")?.source_evidence_id ?? "SHEET-A",
                    text: report.numeric_claims.find((claim) => claim.kind === "attendance")?.source_text ?? "",
                    position: "lg:translate-y-2 lg:rotate-1",
                  },
                  {
                    id: report.flagged_evidence[0]?.evidence_id ?? "VOICE-A",
                    text: report.flagged_evidence[0]?.source_text ?? "",
                    position: "lg:translate-y-1 lg:-rotate-2",
                  },
                  {
                    id: report.completion_claim.source_evidence_id,
                    text: report.completion_claim.source_text,
                    position: "lg:-translate-y-1 lg:rotate-1",
                  },
                ].map((evidence) => (
                  <article
                    key={evidence.id}
                    className={`min-w-0 border border-border bg-paper p-4 ${evidence.position}`}
                  >
                    <p className="font-mono text-xs font-bold text-muted">{evidence.id}</p>
                    <p className="mt-3 text-sm leading-6">{evidence.text}</p>
                  </article>
                ))}
              </div>

              {stage === "arrived" && (
                <button
                  type="button"
                  onClick={() => setStage("processed")}
                  className="approval-button mt-7"
                >
                  Process this evidence
                </button>
              )}
            </section>

            {stage === "processed" && (
              <>
            <div className="border-b border-border pb-4 pt-10">
              <h2 className="font-display text-2xl sm:text-3xl">What we can actually report</h2>
            </div>

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

            <section aria-labelledby="claims-heading" className="py-8">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="claims-heading" className="font-display text-3xl">Claim ledger</h2>
                  <p className="mt-1 text-sm text-muted">Select a source control to inspect the exact supplied text.</p>
                </div>
                <span className="tag">generated from initial.json</span>
              </div>

              <div className="claim-grid">
                {report.numeric_claims.map((claim) => (
                  <article key={claim.kind} className={`claim-card claim-${claim.kind}`}>
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
                      <div><dt>Source</dt><dd>{claim.source_evidence_id}</dd></div>
                    </dl>
                    <EvidenceReveal id={claim.source_evidence_id} text={claim.source_text} />
                  </article>
                ))}

                <article className="claim-card claim-completion">
                  <div className="claim-card-topline">
                    <span>Completion</span>
                    <span className="font-mono">{report.completion_claim.source_evidence_id}</span>
                  </div>
                  <div className="completion-state">Not stated</div>
                  <p className="claim-interpretation">{report.completion_claim.statement}</p>
                  <dl className="claim-meta">
                    <div><dt>Period</dt><dd>{report.completion_claim.period}</dd></div>
                    <div><dt>Source</dt><dd>{report.completion_claim.source_evidence_id}</dd></div>
                  </dl>
                  <EvidenceReveal id={report.completion_claim.source_evidence_id} text={report.completion_claim.source_text} />
                </article>
              </div>
            </section>

            <section className="flagged-band" aria-labelledby="flagged-heading">
              <div className="flagged-marker" aria-hidden="true">!</div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="flagged-heading" className="font-display text-2xl">Excluded evidence</h2>
                  <span className="tag">not a numeric citation</span>
                </div>
                {report.flagged_evidence.map((item) => (
                  <div key={item.evidence_id} className="mt-4">
                    <p className="font-mono text-xs font-bold text-danger">{item.evidence_id} · {item.evidence_type}</p>
                    <p className="mt-2 max-w-3xl text-sm leading-6">{item.reason}</p>
                    <EvidenceReveal id={item.evidence_id} text={item.source_text} />
                  </div>
                ))}
              </div>
            </section>

            <section className="py-8" aria-labelledby="partner-questions-heading">
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
              <section className="mb-8" aria-labelledby="history-heading">
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

            <section className="review-strip">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold">Named reviewer</h2>
                  <span className="tag">simulated human action</span>
                </div>
                <p className="mt-2 font-display text-2xl">{REVIEWER_NAME}</p>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-muted">
                  Approval flips draft to approved. It does not verify truth, change a number, or infer completion.
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
                      {working ? "Recording action…" : "Approve report (simulation)"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSendBack((visible) => !visible)}
                      disabled={working}
                      className="send-back-button"
                      aria-expanded={showSendBack}
                      aria-controls="send-back-form"
                    >
                      Send back for more evidence
                    </button>
                  </div>
                  {showSendBack && (
                    <form id="send-back-form" onSubmit={sendBack} className="send-back-form">
                      <label htmlFor="send-back-reason">Reason</label>
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
                          {working ? "Recording action…" : "Confirm send-back"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </section>

            {report.reviewer_notes[0] && (
              <aside className="mt-5 border-l-2 border-navy bg-slate-soft px-4 py-3 text-sm leading-6">
                <span className="mr-2 font-mono text-xs font-bold">{report.reviewer_notes[0].id}</span>
                <span className="tag mr-2">locked reviewer note</span>
                {report.reviewer_notes[0].text}
              </aside>
            )}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

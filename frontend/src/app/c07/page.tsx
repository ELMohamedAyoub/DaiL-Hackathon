"use client";

import { useState } from "react";

type Mismatch = {
  document_id: string;
  application_field: string;
  application_value: string;
  document_field: string;
  document_value: string;
};

type DocumentEvidence = {
  id: string;
  type: string;
  status: string;
  organisation?: string;
};

type Readiness = {
  application_id: string;
  organisation: string;
  requested_activity: string;
  state: "review-ready" | "needs-clarification" | "missing-items";
  missing_document_types: string[];
  mismatches: Mismatch[];
  documents: DocumentEvidence[];
  reviewer_notes: {
    id: string;
    text: string;
    locked_correction: boolean;
  }[];
  data_status: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8461";

const labels: Record<string, string> = {
  registration: "Registration record",
  "activity-plan": "Activity plan",
  "responsible-person-signoff": "Named responsible-person signoff",
};

function displayType(type: string) {
  return labels[type] ?? type;
}

export default function C07Page() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState<Record<string, string>>({});

  async function simulate(applicationId: string) {
    setSelectedId(applicationId);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `${API_URL}/applications/${applicationId}/readiness`,
      );
      if (!response.ok) throw new Error("The readiness service did not respond.");
      setResult((await response.json()) as Readiness);
    } catch {
      setError(
        "No evidence report is available. Start the backend on port 8461, then try the simulation again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function acknowledge() {
    if (!result) return;
    setAcknowledged((current) => ({
      ...current,
      [result.application_id]: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
  }

  const acknowledgement = result
    ? acknowledged[result.application_id]
    : undefined;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink bg-navy text-white">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center border border-white/40 font-display text-xl">
              C07
            </span>
            <div>
              <p className="text-sm font-semibold">Evidence desk</p>
              <p className="text-xs text-slate-300">Readiness check &amp; route</p>
            </div>
          </div>
          <span className="border border-amber/70 bg-amber/10 px-2.5 py-1 text-xs font-semibold text-amber">
            Synthetic exercise data
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 sm:py-12">
        <section className="grid gap-7 border-b border-border pb-8 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <div>
            <p className="mb-3 text-sm font-semibold text-teal">C07 prototype</p>
            <h1 className="max-w-3xl font-display text-4xl leading-[1.05] tracking-[-0.025em] sm:text-6xl">
              Is the evidence ready for a human review?
            </h1>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted lg:justify-self-end">
            This tool reports document readiness and routes ambiguity. A named
            human reviewer remains responsible for the application outcome.
          </p>
        </section>

        <section className="grid gap-8 py-8 lg:grid-cols-[300px_1fr]">
          <aside aria-label="Simulation controls">
            <h2 className="font-display text-2xl">Simulate an arrival</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Each trigger requests a fresh report from the FastAPI endpoint.
            </p>
            <div className="mt-5 grid gap-3">
              {[
                ["APP-1", "Clean near-miss"],
                ["APP-2", "Ambiguous record"],
              ].map(([id, description]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => simulate(id)}
                  aria-pressed={selectedId === id}
                  className="case-trigger group border-l-4 border-border bg-surface px-4 py-4 text-left hover:border-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal aria-pressed:border-teal aria-pressed:bg-teal-soft"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm font-bold">{id}</span>
                    <span className="tag">simulated trigger</span>
                  </span>
                  <span className="mt-2 block text-sm text-muted">
                    {description} <span className="text-xs">(demo label)</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-6 border-t border-border pt-4 text-xs leading-5 text-muted">
              <p>Source: initial.json</p>
              <p>Classification: synthetic exercise</p>
            </div>
          </aside>

          <section aria-live="polite" className="min-w-0">
            {!selectedId && (
              <div className="grid min-h-[430px] place-items-center border border-dashed border-border bg-surface p-8 text-center">
                <div className="max-w-sm">
                  <div className="mx-auto mb-5 grid size-12 place-items-center border border-border font-display text-2xl text-muted">
                    ?
                  </div>
                  <h2 className="font-display text-3xl">Waiting for a simulated application</h2>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    Choose either demo case to load its evidence-backed report.
                  </p>
                </div>
              </div>
            )}

            {loading && (
              <div className="min-h-[430px] border border-border bg-surface p-6">
                <p className="animate-pulse text-sm font-semibold text-muted">
                  Checking supplied evidence…
                </p>
              </div>
            )}

            {error && (
              <div className="border-l-4 border-danger bg-danger-soft p-6">
                <h2 className="font-display text-2xl">Report unavailable</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{error}</p>
              </div>
            )}

            {result && !loading && (
              <div className="evidence-reveal border border-border bg-surface">
                <div className="grid gap-5 border-b border-border p-5 sm:grid-cols-[1fr_auto] sm:p-7">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-muted">
                        {result.application_id}
                      </span>
                      <span className="tag">source data</span>
                    </div>
                    <h2 className="mt-2 font-display text-3xl sm:text-4xl">
                      {result.organisation}
                    </h2>
                    <p className="mt-2 text-sm text-muted">
                      {result.requested_activity} <span className="tag ml-2">source data</span>
                    </p>
                  </div>
                  <div className={`state-stamp state-${result.state}`}>
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em]">
                      Readiness state
                    </span>
                    <strong className="mt-1 block text-sm">
                      {result.state === "missing-items"
                        ? "Missing items"
                        : result.state === "needs-clarification"
                          ? "Needs clarification"
                          : "Review-ready"}
                    </strong>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2">
                  <div className="border-b border-border p-5 sm:p-7 lg:border-b-0 lg:border-r">
                    <h3 className="text-sm font-bold">Evidence ledger</h3>
                    <ul className="mt-4 divide-y divide-border border-y border-border">
                      {result.documents.map((document) => (
                        <li key={document.id} className="grid grid-cols-[1fr_auto] gap-4 py-3 text-sm">
                          <span>
                            {displayType(document.type)}
                            <span className="ml-2 font-mono text-xs text-muted">{document.id}</span>
                          </span>
                          <span className={document.status === "present" ? "text-teal" : "text-amber-dark"}>
                            {document.status}
                          </span>
                        </li>
                      ))}
                      {result.missing_document_types
                        .filter((type) => !result.documents.some((document) => document.type === type))
                        .map((type) => (
                          <li key={type} className="grid grid-cols-[1fr_auto] gap-4 py-3 text-sm">
                            <span>{displayType(type)}</span>
                            <span className="text-amber-dark">not supplied</span>
                          </li>
                        ))}
                    </ul>

                    {result.reviewer_notes.map((note) => (
                      <div key={note.id} className="mt-5 border-l-2 border-navy bg-slate-soft px-4 py-3 text-sm leading-6">
                        <div className="mb-1 flex flex-wrap items-center gap-2 font-semibold">
                          <span>{note.id}</span>
                          <span className="tag">source note</span>
                          {note.locked_correction && <span className="tag">locked wording</span>}
                        </div>
                        {note.text}
                      </div>
                    ))}
                  </div>

                  <div className="p-5 sm:p-7">
                    <h3 className="text-sm font-bold">Items requiring attention</h3>
                    {result.missing_document_types.length === 0 && result.mismatches.length === 0 ? (
                      <p className="mt-4 border-l-2 border-teal bg-teal-soft px-4 py-3 text-sm leading-6">
                        All required evidence is present. The case may proceed to human review.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {result.missing_document_types.map((type) => (
                          <div key={type} className="border-l-2 border-amber bg-amber-soft px-4 py-3">
                            <p className="text-xs font-bold text-amber-dark">Missing evidence</p>
                            <p className="mt-1 text-sm">{displayType(type)}</p>
                          </div>
                        ))}
                        {result.mismatches.map((mismatch) => (
                          <div key={mismatch.document_id} className="border-l-2 border-danger bg-danger-soft px-4 py-3">
                            <p className="text-xs font-bold text-danger">Clarification needed · {mismatch.document_id}</p>
                            <p className="mt-2 text-sm leading-6">
                              Application {mismatch.application_field}: “{mismatch.application_value}”
                              <br />
                              Document {mismatch.document_field}: “{mismatch.document_value}”
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-border bg-slate-soft p-5 sm:p-7">
                  <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold">Reviewer routing</h3>
                        <span className="tag">simulated</span>
                      </div>
                      <p className="mt-2 text-sm text-muted">
                        Maya El Idrissi <span className="tag ml-1">synthetic reviewer</span>
                      </p>
                      <p className="mt-2 max-w-2xl text-xs leading-5 text-muted">
                        Acknowledgement records that a human has seen this report. It does not alter the readiness state.
                      </p>
                    </div>
                    {acknowledgement ? (
                      <div className="border border-teal bg-teal-soft px-4 py-3 text-sm text-teal">
                        Routed &amp; acknowledged at {acknowledgement}
                        <span className="mt-1 block text-[10px] uppercase tracking-wide">browser-local simulation</span>
                      </div>
                    ) : (
                      <button type="button" onClick={acknowledge} className="bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal">
                        Mark as seen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

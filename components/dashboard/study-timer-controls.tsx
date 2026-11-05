"use client";

import React from "react";
import { useStudyTimer } from "@/app/lib/study-timer-context";
import { Loader2, Pause, Play, Square } from "lucide-react";
import { formatClock, formatDuration } from "@/app/lib/format";
import type { Subject } from "@/components/dashboard/use-subjects";

const NO_SUBJECT_VALUE = "__none__";

export function StudyTimerControls({ subjects, onSignIn, onSessionSaved }: { subjects: Subject[]; onSignIn?: () => void; onSessionSaved?: () => void }) {
  const { status, elapsedMs, session, start, pause, resume, stop } = useStudyTimer();
  const [subjectValue, setSubjectValue] = React.useState(NO_SUBJECT_VALUE);

  return (
    <section className="group relative paper-grain rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-16px_rgba(24,24,27,0.14)]">
      <h2 className="font-display text-lg font-semibold">Study timer</h2>
      <p className="mt-3 font-display text-4xl tabular-nums">{formatClock(elapsedMs / 1000)}</p>
      <div className="mt-4 flex items-center gap-2">
        {status === "idle" ? (
          <>
            <select value={subjectValue} onChange={e=>setSubjectValue(e.target.value)} className="rounded-xl border px-3 py-2">
              <option value={NO_SUBJECT_VALUE}>No subject</option>
              {subjects.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={()=>start(subjectValue===NO_SUBJECT_VALUE?null:subjectValue)} className="rounded-xl bg-accent-500 px-4 py-2 text-white"><Play className="h-4 w-4 inline"/> Start</button>
          </>
        ) : (
          <>
            {status==="running" ? <button onClick={pause} className="rounded-xl border px-4 py-2">Pause</button> : <button onClick={resume} className="rounded-xl bg-accent-500 px-4 py-2 text-white">Resume</button>}
            <button onClick={()=>{void stop(); onSessionSaved?.();}} className="rounded-xl border px-4 py-2">Stop</button>
          </>
        )}
      </div>
    </section>
  );
}

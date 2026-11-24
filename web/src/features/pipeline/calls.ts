// Phone reach (Heni, 24 Nov 2026): a call script for each lead, in English for now (Heni translates to Tunisian
// later), and one tap to log how the call went, which moves the lead and sets the next step.
import { addDays, greetName, noticed } from "./outreach";
import { isOpen, type Lead, type Stage } from "./model";

export interface ScriptStep {
  key: string;
  title: string;
  /** What to say; [brackets] are for you to fill in. */
  say: string[];
  /** A tip for the caller, not to read out. */
  tip?: string;
}

/** The call, step by step: opener, why you call, questions, the pitch, objections, the close, a voicemail. */
export function callScript(lead: Pick<Lead, "brand" | "contact" | "extra">): ScriptStep[] {
  const name = greetName(lead as Pick<Lead, "contact" | "brand">);
  const seen = noticed(lead as Pick<Lead, "extra">);
  return [
    {
      key: "open",
      title: "Open (10 seconds)",
      say: [
        `Hi ${name}, it's Heni from Gecko, a video ad studio in Tunis.`,
        "Did I catch you at a bad time? I'll be quick, two minutes.",
      ],
      tip: "Smile while you talk; it's heard. If it's a bad time, book a time and hang up.",
    },
    {
      key: "why",
      title: "Why you're calling",
      say: [
        seen
          ? `I saw ${seen}, and I had an idea for ${lead.brand}'s ads.`
          : `I've been following ${lead.brand} and I had an idea for your ads.`,
        "We make short video ads that sell: reels, UGC and launch films, scripted, shot and edited for you.",
      ],
    },
    {
      key: "ask",
      title: "Ask, then listen",
      say: [
        "How do you get new customers today: mostly Instagram, ads, word of mouth?",
        "Are you running paid ads right now? What's working, what isn't?",
        "Who makes your videos today?",
        "If one video worked really well this month, what would that change for you?",
      ],
      tip: "Write down their words: you'll use them in the proposal.",
    },
    {
      key: "pitch",
      title: "The pitch (30 seconds)",
      say: [
        `For brands like ${lead.brand}, we plan the ideas with you, write the scripts, cast and shoot, and deliver ready-to-post ads.`,
        "You approve everything in your own space: ideas, scripts, talent, cuts. No back and forth on WhatsApp.",
        "Packages start at [price] for [n] videos, and we can shoot within [two weeks].",
      ],
    },
    {
      key: "objections",
      title: "If they say…",
      say: [
        "“It's expensive.” → One good ad pays for itself; we can start small with [n] videos and measure.",
        "“We do it in-house.” → Great, we can do the heavy shoots and the scripts your team doesn't have time for.",
        "“Send me something.” → Sure. What matters most to you, so I send the right thing? Then book the next call.",
        "“Not now.” → When would be a better moment? I'll call you back then.",
      ],
    },
    {
      key: "close",
      title: "Close",
      say: [
        "Can we do a 20-minute call this week to show you ideas for your brand? Tuesday or Thursday?",
        "I'll send you a short WhatsApp right after with what we said.",
      ],
      tip: "Always end with a date, never with “I'll think about it”.",
    },
    {
      key: "voicemail",
      title: "If it's voicemail",
      say: [
        `Hi ${name}, Heni from Gecko. I have a video ad idea for ${lead.brand}; I'll send you a WhatsApp now, and call you back tomorrow.`,
      ],
    },
  ];
}

export type CallOutcome = "no_answer" | "callback" | "interested" | "meeting" | "not_now" | "no";

export const OUTCOME_LABEL: Record<CallOutcome, string> = {
  no_answer: "No answer",
  callback: "Call back",
  interested: "Interested: send info",
  meeting: "Meeting booked",
  not_now: "Not now",
  no: "Not interested",
};

const ORDER: Stage[] = [
  "prospect",
  "contacted",
  "conversation",
  "meeting_booked",
  "qualified",
  "proposal_sent",
  "negotiation",
  "accepted",
  "signed",
];

function atLeast(stage: Stage, floor: Stage): Stage {
  return ORDER.indexOf(stage) >= ORDER.indexOf(floor) ? stage : floor;
}

/** What a call changes: it's logged, the lead moves on, and the next step and date are set. */
export function afterCall(
  lead: Pick<Lead, "stage" | "history" | "log" | "owner_member_id">,
  outcome: CallOutcome,
  notes: string,
  now: string,
  me: string | null,
): Pick<Lead, "stage" | "history" | "log" | "next_step" | "next_date" | "owner_member_id"> {
  const today = now.slice(0, 10);
  const plan: Record<CallOutcome, { stage: Stage | null; next: string; days: number }> = {
    no_answer: { stage: "contacted", next: "Call again", days: 1 },
    callback: { stage: "conversation", next: "Call back", days: 2 },
    interested: { stage: "conversation", next: "Send the proposal", days: 1 },
    meeting: { stage: "meeting_booked", next: "Prepare the meeting", days: 1 },
    not_now: { stage: "nurture", next: "Check in again", days: 45 },
    no: { stage: "lost", next: "", days: 0 },
  };
  const p = plan[outcome];
  let stage: Stage = lead.stage;
  if (p.stage === "nurture" || p.stage === "lost")
    stage = isOpen(lead.stage) ? p.stage : lead.stage;
  else if (p.stage && isOpen(lead.stage)) stage = atLeast(lead.stage, p.stage);
  const history = Array.isArray(lead.history) ? lead.history : [];
  const log = Array.isArray(lead.log) ? lead.log : [];
  const text = [`Call: ${OUTCOME_LABEL[outcome]}`, notes.trim()].filter(Boolean).join(". ");
  return {
    stage,
    history: stage !== lead.stage ? [...history, { at: today, stage }] : history,
    log: [...log, { at: now, channel: "call", text }],
    next_step: p.next || null,
    next_date: p.days ? addDays(today, p.days) : null,
    owner_member_id: lead.owner_member_id ?? me,
  };
}

export type AgentStepId = "perceive" | "mine" | "plan" | "guard" | "confirm";
export type DecisionStatus = "pending" | "confirmed" | "modified" | "rejected";
export type RejectReason =
  | "tone"
  | "risk"
  | "stale"
  | "other";

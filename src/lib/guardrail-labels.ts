const GUARDRAIL_LABELS: Record<string, string> = {
  crypto_wallet: "Message contains cryptocurrency wallet address pattern",
  unknown_sender: "Sender is not in trusted accounts list",
  instruction_override: "Message attempted to override agent instructions",
  url_suspicious: "Message contains suspicious or shortened URL",
  troll_disengage: "Conversation flagged as trolling — disengaged",
  rate_limit: "Rate limit reached for this platform",
  spam_pattern: "Message matches known spam pattern",
  beta_offer: "Unsolicited beta/product offer from unknown account",
  "400": "Platform API returned error (400 Bad Request)",
  sensitive_topic: "Content touches a sensitive or restricted topic",
  blocked_handle: "Target handle is on the block list",
  length_limit: "Response exceeded platform character limit",
};

export function humanizeGuardrail(code: string): string {
  // Parse formats like "error:400", "skip:troll_disengage", "pass:trusted", "degraded:rate_limit"
  const parts = code.split(":");
  const key = parts[parts.length - 1];
  return GUARDRAIL_LABELS[key] || code;
}

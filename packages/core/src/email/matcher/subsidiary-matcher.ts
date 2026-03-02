import type { ParsedEmail } from "../types";
import type { SubsidiaryConfig } from "../../config/types";

export interface MatchResult {
  subsidiaryId?: string;
  confidence: "high" | "medium" | "low";
  requestType:
    | "bug"
    | "feature"
    | "support"
    | "inquiry"
    | "appointment"
    | "order";
}

export function matchEmailToSubsidiary(
  email: ParsedEmail,
  configs: SubsidiaryConfig[],
): MatchResult {
  const subj = email.subject.toLowerCase();
  const body = email.bodyText.toLowerCase();

  // Pass 1: exact subsidiary name match in subject (high confidence)
  const nameMatch = configs.find((c) => subj.includes(c.name.toLowerCase()));
  if (nameMatch)
    return {
      subsidiaryId: nameMatch.id,
      confidence: "high",
      requestType: inferType(email),
    };

  // Pass 2: service keyword match in body or subject (medium confidence)
  const kwMatch = configs.find((c) =>
    c.agent.services.some(
      (s) => body.includes(s.toLowerCase()) || subj.includes(s.toLowerCase()),
    ),
  );
  if (kwMatch)
    return {
      subsidiaryId: kwMatch.id,
      confidence: "medium",
      requestType: inferType(email),
    };

  // Pass 3: email address domain match (medium confidence)
  const domainMatch = configs.find((c) => {
    const domain = c.email.inbound.split("@")[1]?.toLowerCase();
    const senderDomain = email.from.email.split("@")[1]?.toLowerCase();
    return domain && senderDomain === domain;
  });
  if (domainMatch)
    return {
      subsidiaryId: domainMatch.id,
      confidence: "medium",
      requestType: inferType(email),
    };

  // Pass 4: no match (low confidence)
  return { confidence: "low", requestType: inferType(email) };
}

function inferType(email: ParsedEmail): MatchResult["requestType"] {
  const text = `${email.subject} ${email.bodyText}`.toLowerCase();
  if (text.includes("bug") || text.includes("broken") || text.includes("error"))
    return "bug";
  if (
    text.includes("appointment") ||
    text.includes("booking") ||
    text.includes("schedule")
  )
    return "appointment";
  if (
    text.includes("order") ||
    text.includes("shipping") ||
    text.includes("tracking")
  )
    return "order";
  if (
    text.includes("feature") ||
    text.includes("suggestion")
  )
    return "feature";
  if (
    text.includes("help") ||
    text.includes("support") ||
    text.includes("issue")
  )
    return "support";
  return "inquiry";
}

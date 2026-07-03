import { GoogleGenAI } from "@google/genai";

let _ai: GoogleGenAI | null = null;

function getAi(): GoogleGenAI {
  if (!_ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not set");
    _ai = new GoogleGenAI({ apiKey: key });
  }
  return _ai;
}

/** Gemini 무료 등급 일일 요청 한도 초과(429 RESOURCE_EXHAUSTED)를 나타내는 에러 */
export class QuotaExceededError extends Error {
  constructor(message = "Gemini API 일일 사용 한도를 초과했어요") {
    super(message);
    this.name = "QuotaExceededError";
  }
}

/** @google/genai 에러가 429(할당량 초과)인지 판별 */
export function isQuotaError(e: unknown): boolean {
  if (e instanceof QuotaExceededError) return true;
  const status = (e as { status?: number })?.status;
  if (status === 429) return true;
  const message = e instanceof Error ? e.message : String(e ?? "");
  return message.includes("RESOURCE_EXHAUSTED") || message.includes("exceeded your current quota");
}

export async function extractTags(content: string): Promise<string[]> {
  let res;
  try {
    res = await getAi().models.generateContent({
      model: "gemini-2.5-flash",
      contents: `다음 문장에서 핵심 주제나 감정을 나타내는 한글 태그를 5개 이하로 추출해주세요. 반드시 JSON 배열 형식으로만 답해야 합니다. 예: ["성장", "외로움", "관계"]

문장: "${content}"`,
      config: { responseMimeType: "application/json" },
    });
  } catch (e) {
    if (isQuotaError(e)) throw new QuotaExceededError();
    throw e;
  }
  try {
    const parsed = JSON.parse(res.text ?? "[]");
    return Array.isArray(parsed) ? (parsed as string[]).slice(0, 5) : [];
  } catch {
    return [];
  }
}

export interface FlowerCandidate {
  name: string;
  meaning: string;
  season: string;
  emoji: string;
}

export interface FlowerResult {
  name: string;
  meaning: string;
  season: string;
  emoji: string;
  reason: string;
}

export async function matchFlower(
  review: string,
  candidates: FlowerCandidate[]
): Promise<FlowerResult | null> {
  if (candidates.length === 0) return null;

  const candidateList = candidates
    .map((c) => `- ${c.emoji} ${c.name}: 꽃말 "${c.meaning}"`)
    .join("\n");

  let res;
  try {
    res = await getAi().models.generateContent({
      model: "gemini-2.5-flash",
      contents: `다음은 어떤 책에 대한 독자의 소감입니다:
"${review}"

아래 꽃 목록 중에서 이 소감의 감정이나 주제와 꽃말이 가장 잘 어울리는 꽃 하나를 선택하고, 왜 그 꽃을 선택했는지 한 문장으로 설명해주세요.

꽃 목록:
${candidateList}

반드시 아래 JSON 형식으로만 답해야 합니다:
{"name": "꽃 이름", "reason": "이 꽃을 선택한 이유 한 문장"}`,
      config: { responseMimeType: "application/json" },
    });
  } catch (e) {
    // 할당량 초과는 호출부가 사용자에게 안내할 수 있도록 구분해서 던진다
    if (isQuotaError(e)) throw new QuotaExceededError();
    throw e;
  }

  try {
    const parsed = JSON.parse(res.text ?? "{}") as { name?: string; reason?: string };
    const chosen = candidates.find((c) => c.name === parsed.name?.trim());
    if (!chosen) return null;
    return { ...chosen, reason: parsed.reason ?? "" };
  } catch {
    return null;
  }
}

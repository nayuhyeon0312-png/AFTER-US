import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const app = express();
const here = path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    aiReady: Boolean(process.env.OPENAI_API_KEY),
    supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
  });
});

app.post("/api/chat", async (req, res) => {
  const { character, history = [], playerMessage = "", scene = "" } = req.body ?? {};
  if (!character || typeof character !== "object") {
    return res.status(400).json({ error: "대화할 캐릭터 정보가 없습니다." });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: "AI API 키가 아직 설정되지 않았습니다. Render 환경변수에 OPENAI_API_KEY를 추가해 주세요."
    });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const instructions = `너는 한국 연애 리얼리티 시뮬레이션의 참가자다.
아래 캐릭터 설정을 일관되게 유지하고, 실제 사람처럼 자연스러운 한국어로 대화한다.
사용자가 한 메시지에 질문을 여러 개 쓰면 각 질문에 빠짐없이 답한다.
사용자의 긴 메시지를 대충 요약하거나 무시하지 말고 세부 맥락과 감정을 반영한다.
캐릭터가 모르는 비밀을 먼저 폭로하지 않는다. 다른 사람의 속마음을 안다고 단정하지 않는다.
선택지나 게임 공략처럼 말하지 말고 메신저에서 대화하는 사람처럼 답한다.
답변은 상황에 맞게 충분히 구체적으로 하되 불필요하게 같은 말을 반복하지 않는다.

캐릭터 설정:
${JSON.stringify(character)}

현재 장면:
${String(scene).slice(0, 1000)}`;

    const safeHistory = Array.isArray(history) ? history.slice(-16).map(item => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: String(item.content ?? "").slice(0, 3000)
    })) : [];

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions,
      input: [
        ...safeHistory,
        { role: "user", content: String(playerMessage || "지금 상황에 맞게 먼저 말을 걸어 줘.") }
      ]
    });

    const reply = response.output_text?.trim();
    if (!reply) return res.status(502).json({ error: "AI 답변이 비어 있어요. 다시 시도해 주세요." });
    return res.json({ reply });
  } catch (error) {
    console.error("AI chat error:", error?.message || error);
    return res.status(500).json({ error: "AI 대화에 실패했어요. Render 로그와 API 키 사용 한도를 확인해 주세요." });
  }
});

const distPath = path.join(here, "dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"), err => {
    if (err && !res.headersSent) res.status(404).send("사이트 파일을 찾을 수 없습니다. 먼저 npm run build를 실행해 주세요.");
  });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => console.log(`App listening on ${port}`));

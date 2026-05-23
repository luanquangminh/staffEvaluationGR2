# Chatbot Implementation Plan — Qwen on Modal

## 1. Purpose

Add an AI chatbot to the staff evaluation platform using Qwen3 (open-source LLM) deployed on Modal (free GPU cloud). The chatbot serves as an intelligent assistant for evaluation workflows in Vietnamese.

### Use Cases

| Use Case | Example |
|----------|---------|
| **Evaluation Guide** | "Tiêu chí đánh giá Giảng dạy gồm những gì?" — explain evaluation criteria |
| **Process Q&A** | "Khi nào kỳ đánh giá kết thúc?" — answer questions about active periods, deadlines |
| **Results Interpreter** | "Điểm trung bình của tôi so với nhóm thế nào?" — natural language analytics |
| **Navigation Helper** | "Làm sao để đánh giá đồng nghiệp?" — guide users through the UI workflow |
| **Admin Assistant** | "Bao nhiêu người chưa đánh giá?" — quick stats without navigating dashboards |

**Thesis value:** Demonstrates integration of LLM technology into a real-world enterprise system with Vietnamese language support.

---

## 2. Technology Choices

### Model: Qwen3-8B (FP8) — Recommended

| | Qwen3-4B | Qwen3-8B (FP8) |
|---|---|---|
| VRAM | ~8 GB (FP16) | ~8 GB (FP8 quantized) |
| GPU | T4 (16GB) — comfortable | T4 (16GB) — fits |
| Context | 32K tokens | 128K tokens |
| Quality | ≈ Qwen2.5-7B | ≈ Qwen2.5-14B |
| Vietnamese | Good | Better |
| **Verdict** | Safe fallback | **Best pick** — same GPU cost, better quality |

**Why Qwen:**
- Alibaba-developed — CJK and Southeast Asian languages are first-class
- Vietnamese explicitly supported across all Qwen3 models
- Outperforms Llama/Mistral for Vietnamese tasks
- Open-source, free to use

### Platform: Modal (Free Tier)

- **$30/month free credits** — ~50 hours of T4 GPU time
- Deploy as **public HTTPS endpoint** with OpenAI-compatible API
- vLLM inference server — battle-tested, streaming support
- No surprise billing — stops when credits run out
- Academic accounts can get $10K in credits

### Key Modal Specs

| Resource | Limit |
|----------|-------|
| Free credits | $30/month |
| GPU concurrency | 10 |
| Deployed web endpoints | 8 |
| T4 GPU price | ~$0.59/hr (~50 hrs/month) |
| L4 GPU price | ~$0.80/hr (~37 hrs/month) |
| Cold start | 5-30s (mitigable with keepalive) |

---

## 3. Architecture

```
┌──────────────┐       ┌───────────────────┐       ┌─────────────────────┐
│  React SPA   │ SSE/  │  NestJS Backend   │ HTTP  │  Modal (GPU Cloud)  │
│              │ fetch │                   │       │                     │
│  ChatWidget  │◄─────►│  /api/chat        │──────►│  vLLM + Qwen3-8B   │
│  (floating)  │       │  ChatModule       │       │  OpenAI-compat API  │
└──────────────┘       │  - rate limit     │       └─────────────────────┘
                       │  - auth check     │
                       │  - context inject │
                       └───────────────────┘
```

**Key design:** NestJS acts as a proxy — it authenticates the user, injects system context (evaluation data, user role), then forwards to Modal. The frontend never talks to Modal directly.

---

## 4. Implementation Phases

### Phase 1 — Modal Deployment (Python)

**Directory:** `chatbot/` at project root

| Step | Task | Details |
|------|------|---------|
| 1.1 | Set up Modal account | Sign up, install `modal` CLI, `modal token new` |
| 1.2 | Create `chatbot/app.py` | Modal app with vLLM serving Qwen3-8B-FP8 |
| 1.3 | Create Modal Volume | Cache model weights (~16GB download, cached after first run) |
| 1.4 | Configure GPU + keepalive | T4 GPU, `scaledown_window=300` (5min keepalive) |
| 1.5 | Deploy & test | `modal deploy chatbot/app.py`, test with curl |

**Estimated work:** 1-2 hours

### Phase 2 — Backend Integration (NestJS)

**Files to create/modify:**

| File | Purpose |
|------|---------|
| `src/chat/chat.module.ts` | New NestJS module |
| `src/chat/chat.controller.ts` | `POST /api/chat` endpoint, JWT-protected |
| `src/chat/chat.service.ts` | Calls Modal endpoint, injects system prompt with user context |
| `src/chat/dto/chat.dto.ts` | Request/response DTOs |
| `src/app.module.ts` | Import ChatModule |
| `.env` | Add `MODAL_ENDPOINT_URL`, `MODAL_AUTH_KEY` |

**Key logic in `chat.service.ts`:**

1. Receive user message
2. Build system prompt with:
   - User's name, role, staff groups
   - Active evaluation period info
   - Evaluation criteria (questions from DB)
   - Basic stats (if admin)
3. Call Modal endpoint (OpenAI-compatible)
4. Return response (or stream via SSE)

**Rate limiting:** 10 requests/minute per user (LLM calls are expensive)

**Estimated work:** 3-4 hours

### Phase 3 — Frontend Chat Widget (React)

**Files to create/modify:**

| File | Purpose |
|------|---------|
| `src/components/ChatWidget.tsx` | Floating chat bubble + dialog |
| `src/components/ChatMessage.tsx` | Message bubble component |
| `src/hooks/useChat.ts` | Chat state management, API calls |
| `src/lib/api.ts` | Add `chat()` function |
| `src/App.tsx` | Mount ChatWidget globally |

**UX design:**

- Floating button (bottom-right corner)
- Expandable chat panel
- Message history (session-only, no persistence needed)
- Loading indicator during LLM response
- Vietnamese as default language

**Estimated work:** 3-4 hours

### Phase 4 — Context-Aware Prompting

| Feature | System Prompt Injection |
|---------|------------------------|
| Role awareness | "User is admin/moderator/user" → adjust responses |
| Period context | "Current active period: X, ends: Y" |
| Group context | "User belongs to groups: A, B, C" |
| Evaluation criteria | Inject question titles for accurate guidance |
| User stats | For results queries: inject user's average scores |

**Estimated work:** 2-3 hours

---

## 5. Cost & Limits

| Metric | Value |
|--------|-------|
| Monthly budget | $30 (free) |
| GPU hours | ~50h on T4 |
| Tokens per request | ~500-2000 (chat) |
| Requests per month | ~2000-5000 (conservative) |
| Cold start | 5-30s first request |
| Warm response | <2s |

**For thesis demo:** More than enough. A 30-minute defense demo uses ~$0.30 in compute.

---

## 6. Timeline

| Phase | Duration |
|-------|----------|
| Phase 1 — Modal deploy | Day 1 |
| Phase 2 — NestJS integration | Day 1-2 |
| Phase 3 — React widget | Day 2-3 |
| Phase 4 — Context prompting | Day 3 |
| Testing & polish | Day 4 |
| **Total** | **~4 days** |

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Cold start delay (30s) | Show "Đang khởi động AI..." message; set keepalive=300s |
| Credits exhausted | Monitor usage; Qwen3-4B as fallback (cheaper) |
| Vietnamese quality issues | Test with real evaluation questions early; tune system prompt |
| Modal downtime | Graceful degradation — chat button hidden when endpoint unreachable |
| Hallucinated evaluation data | Never let LLM access raw DB; inject only pre-formatted stats |

---

## 8. Defense Q&A Prep

**Q: "Why Qwen instead of GPT/Claude API?"**
A: Open-source, free, no API costs, strong Vietnamese support, and demonstrates infrastructure competency (self-hosted LLM vs API call).

**Q: "Why Modal instead of self-hosting?"**
A: Free GPU access, zero infrastructure management, auto-scaling, pay-per-second billing. Self-hosting requires purchasing/renting GPU hardware.

**Q: "How do you prevent the chatbot from hallucinating evaluation data?"**
A: The LLM never has direct DB access. The NestJS backend injects pre-computed, verified data into the system prompt. The LLM only interprets and presents this data.

**Q: "What about data privacy?"**
A: User evaluation data is injected server-side into the system prompt — it goes to Modal's GPU for inference only. No data is stored by Modal. For production, you'd use a self-hosted solution or enterprise agreement.

---
theme: default
title: LangChain으로 배우는 RAG — Naive에서 Graph RAG까지
colorSchema: light
routerMode: hash
fonts:
  sans: Pretendard
  mono: IBM Plex Mono
transition: fade
mdc: true
lineNumbers: false
class: cover
---

<!--
  대상: LLM 앱을 만들려는 개발 경험 있는 입문자(사내 교육) · 형식: 개념+시연 위주
  서사: 왜 검색이 필요한가(문제) → 검색 부품 → RAG 아키텍처 → 자기교정 → 관계 기반(Graph)
  4파트 노트북(01~04)을 한눈에 들어오는 시각 슬라이드로 압축.
-->

<div class="cover-telemetry"><span>LLM · RETRIEVAL · RAG</span><span>입문 → 실무 · 2026</span></div>

<div class="title-block">
<div class="latin-mark">RETRIEVAL-AUGMENTED GENERATION</div>

# 검색으로 LLM의 한계를 넘다<br><em>Naive</em>에서 <em>Graph RAG</em>까지

<p class="cover-sub">LangChain · LangGraph로, 검색이 어떻게 더 똑똑해지는지 4단계로 따라갑니다</p>
</div>

<div class="cover-foot"><span>LangChain 공식 문서 기반 실습 교안</span><span>4-Part Course</span></div>

---

<p class="crumbs"><b>LangChain RAG</b><span>코스 지도</span><em>오늘 가는 길</em></p>

# 검색은 한 가지가 아닙니다 — <em>네 단계로 발전</em>합니다

<figure class="figure">
<svg viewBox="0 0 860 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Naive RAG에서 Advanced/Agentic, Hybrid, Graph RAG로 이어지는 4단계 발전 흐름">
  <line x1="40" y1="120" x2="820" y2="120" style="stroke:var(--rule);stroke-width:2.5"/>
  <!-- 4 nodes -->
  <circle cx="130" cy="120" r="9" style="fill:var(--ink)"/>
  <circle cx="360" cy="120" r="9" style="fill:var(--ink)"/>
  <circle cx="590" cy="120" r="9" style="fill:var(--ink)"/>
  <circle cx="800" cy="120" r="11" style="fill:var(--accent);stroke:var(--paper);stroke-width:3"/>
  <text x="130" y="92" text-anchor="middle" style="font-size:17px;font-family:var(--display);font-weight:700;fill:var(--ink)">Part 1</text>
  <text x="360" y="92" text-anchor="middle" style="font-size:17px;font-family:var(--display);font-weight:700;fill:var(--ink)">Part 2</text>
  <text x="590" y="92" text-anchor="middle" style="font-size:17px;font-family:var(--display);font-weight:700;fill:var(--ink)">Part 3</text>
  <text x="800" y="92" text-anchor="middle" style="font-size:17px;font-family:var(--display);font-weight:700;fill:var(--accent)">Part 4</text>
  <text x="130" y="150" text-anchor="middle" style="font-size:14px;font-family:var(--sans);fill:var(--ink)">Naive RAG</text>
  <text x="360" y="150" text-anchor="middle" style="font-size:14px;font-family:var(--sans);fill:var(--ink)">Agentic RAG</text>
  <text x="590" y="150" text-anchor="middle" style="font-size:14px;font-family:var(--sans);fill:var(--ink)">자기교정 RAG</text>
  <text x="800" y="150" text-anchor="middle" style="font-size:14px;font-family:var(--sans);fill:var(--accent)">Graph RAG</text>
  <text x="130" y="172" text-anchor="middle" style="font-size:12px;font-family:var(--mono);fill:var(--dim)">검색→생성</text>
  <text x="360" y="172" text-anchor="middle" style="font-size:12px;font-family:var(--mono);fill:var(--dim)">스스로 검색</text>
  <text x="590" y="172" text-anchor="middle" style="font-size:12px;font-family:var(--mono);fill:var(--dim)">평가·재검색</text>
  <text x="800" y="172" text-anchor="middle" style="font-size:12px;font-family:var(--mono);fill:var(--dim)">관계로 확장</text>
</svg>
<figcaption>의미 유사도로 시작해, 에이전트가 스스로 조율하고, 스스로 고치고, 관계를 따라 검색하는 데까지</figcaption>
</figure>

<p class="lead">공통 질문은 하나입니다 — <em>"어떻게 더 좋은 근거를 LLM에게 줄 것인가?"</em></p>

---
class: divider
---

<p class="div-no">01</p>

## 검색의 기초 — 왜, 그리고 무엇으로

<p class="div-sub">LLM의 한계에서 출발해, 의미로 검색하는 엔진을 부품으로 만든다</p>

<p class="div-file">Part 1 · Retrieval & Semantic Search</p>

---

<p class="crumbs"><b>LangChain RAG</b><span>검색의 기초</span><em>왜 검색이 필요한가</em></p>

# LLM은 똑똑하지만, <em class="bad">모르는 것</em>이 있습니다

<div class="vs">
<div class="pane"><h3><span class="latin">01</span>유한한 컨텍스트</h3><p>한 번에 읽는 양에 한계. 1M 토큰이어도 회사 문서 전체·PDF 수천 개를 매번 넣을 순 없다.</p></div>
<i class="vs-badge">+</i>
<div class="pane"><h3><span class="latin">02</span>고정된 지식</h3><p>학습이 끊긴 시점(cutoff) 이후, 그리고 <em>우리 회사 내부 문서</em>는 애초에 모른다.</p></div>
</div>

<p class="lead"><em>Retrieval(검색)</em>: 질문이 들어온 그 순간, 필요한 외부 지식만 찾아다 넣어준다.</p>

<!-- 모델에게 "삼성전자 DS 사내 와이파이 비번"을 물으면 모르거나 지어낸다 — 학습한 적이 없으니까 -->

---

<p class="crumbs"><b>LangChain RAG</b><span>검색의 기초</span><em>검색 파이프라인</em></p>

# 검색은 <em>다섯 부품</em>의 조립입니다

<div class="flow">
<div><b>문서 로더</b><span>PDF·웹·Notion</span></div>
<div><b>분할기</b><span>큰 문서를 청크로</span></div>
<div><b>임베딩</b><span>텍스트 → 벡터</span></div>
<div><b>벡터 스토어</b><span>저장·유사도 검색</span></div>
<div><b>리트리버</b><span>질의 → 관련 문서</span></div>
</div>

<p class="lead">사용자 질문도 <em>같은 임베딩</em>으로 바꿔, 가장 가까운 청크를 찾습니다.</p>

<p class="note"><b>핵심</b> 부품을 자유롭게 갈아끼울 수 있는 이 성질이 뒤에서 <em>Modular RAG</em>로 이어집니다.</p>

---

<p class="crumbs"><b>LangChain RAG</b><span>검색의 기초</span><em>의미를 숫자로</em></p>

# 임베딩 — <em>의미가 비슷하면 벡터도 가깝다</em>

<div class="split evidence">
<div>

<p class="thesis">텍스트를 숫자 벡터로 바꾸면, "강아지" 질문이 키워드가 없어도 "개" 문장에 가장 가깝게 놓인다.</p>

<div class="deflist narrow">
<div><b>개 문장</b><span>유사도 0.357 — 가장 가까움 ✅</span></div>
<div><b>고양이 문장</b><span>유사도 0.309</span></div>
<div><b>무관한 문장</b><span>유사도 0.085 — 멀다</span></div>
</div>

</div>
<div>
<figure class="figure">
<svg viewBox="0 0 320 230" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="벡터 공간에서 질문이 개 문장에 가깝고 무관한 문장과는 멀다">
  <circle cx="160" cy="120" r="98" style="fill:none;stroke:var(--rule);stroke-width:1;stroke-dasharray:3 5"/>
  <!-- query -->
  <circle cx="150" cy="96" r="8" style="fill:var(--accent)"/>
  <text x="150" y="82" text-anchor="middle" style="font-size:12px;font-family:var(--mono);fill:var(--accent)">질문</text>
  <!-- dog (near) -->
  <circle cx="196" cy="110" r="7" style="fill:var(--ink)"/>
  <text x="214" y="114" style="font-size:12px;font-family:var(--sans);fill:var(--ink)">개</text>
  <line x1="150" y1="96" x2="196" y2="110" style="stroke:var(--accent);stroke-width:1.5"/>
  <!-- cat -->
  <circle cx="124" cy="150" r="7" style="fill:var(--dim)"/>
  <text x="112" y="154" text-anchor="end" style="font-size:12px;font-family:var(--sans);fill:var(--dim)">고양이</text>
  <!-- unrelated (far) -->
  <circle cx="250" cy="196" r="7" style="fill:var(--dim)"/>
  <text x="214" y="212" style="font-size:11px;font-family:var(--sans);fill:var(--dim)">파이썬</text>
</svg>
<figcaption>가까운 것 = 의미가 비슷한 것</figcaption>
</figure>
</div>
</div>

---

<p class="crumbs"><b>LangChain RAG</b><span>검색의 기초</span><em>가장 단순한 RAG</em></p>

# 검색 → 생성, 이으면 <em>Naive RAG</em>입니다

<div class="flow">
<div><b>① 질문</b><span>"해외투자가 환율에 미치는 영향은?"</span></div>
<div><b>② 검색</b><span>벡터 스토어에서 관련 청크 k개</span></div>
<div><b>③ 생성</b><span>그 청크만 근거로 LLM이 답변</span></div>
</div>

<p class="lead">지어내던 모델이, 이제 <em>문서 속 실제 내용</em>으로 답합니다.</p>

<p class="note"><b>실습 문서</b> 한국은행 BOK 이슈노트 「해외투자와 투자소득이 환율에 미치는 영향」 — PDF를 검색 엔진으로.</p>

---
class: divider
---

<p class="div-no">02</p>

## RAG 아키텍처 — 검색을 언제·어떻게

<p class="div-sub">고정 파이프라인부터, 에이전트가 스스로 검색을 조율하는 데까지</p>

<p class="div-file">Part 2 · Architectures & Agentic RAG</p>

---

<p class="crumbs"><b>LangChain RAG</b><span>RAG 아키텍처</span><em>세 가지 방식</em></p>

# 검색과 생성을 잇는 <em>세 가지</em> 방식

| 아키텍처 | 검색 시점 | 제어 | 유연성 | 적합한 곳 |
|---|---|---|---|---|
| **2-Step** | 항상 검색 → 생성 | 높음 | 낮음 | FAQ·문서봇 |
| **Agentic** | 에이전트가 스스로 결정 | 낮음 | 높음 | 범용 리서치 비서 |
| **Hybrid** | 검증 단계를 끼움 | 중간 | 중간 | 품질이 중요한 Q&A |

<p class="lead">속도·예측이 중요하면 <em>2-Step</em>, 유연함이 중요하면 <em>Agentic</em>.</p>

---

<p class="crumbs"><b>LangChain RAG</b><span>RAG 아키텍처</span><em>2-Step vs Agentic</em></p>

# 누가 검색을 결정하는가 — <em>파이프라인 vs 에이전트</em>

<figure class="figure">
<svg viewBox="0 0 860 230" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="2-Step은 항상 검색 후 생성, Agentic은 에이전트가 검색 여부와 횟수를 판단">
  <!-- 2-step (top) -->
  <text x="20" y="42" style="font-size:14px;font-family:var(--display);font-weight:700;fill:var(--dim)">2-STEP</text>
  <g style="font-family:var(--mono);font-size:13px">
    <rect x="120" y="22" width="120" height="42" rx="9" style="fill:var(--card);stroke:var(--rule);stroke-width:1.5"/><text x="180" y="48" text-anchor="middle" style="fill:var(--ink)">질문</text>
    <rect x="300" y="22" width="120" height="42" rx="9" style="fill:var(--card);stroke:var(--rule);stroke-width:1.5"/><text x="360" y="48" text-anchor="middle" style="fill:var(--ink)">검색</text>
    <rect x="480" y="22" width="120" height="42" rx="9" style="fill:var(--card);stroke:var(--rule);stroke-width:1.5"/><text x="540" y="48" text-anchor="middle" style="fill:var(--ink)">생성</text>
    <rect x="660" y="22" width="120" height="42" rx="9" style="fill:var(--card);stroke:var(--rule);stroke-width:1.5"/><text x="720" y="48" text-anchor="middle" style="fill:var(--ink)">답변</text>
  </g>
  <g style="stroke:var(--rule);stroke-width:2"><line x1="240" y1="43" x2="298" y2="43"/><line x1="420" y1="43" x2="478" y2="43"/><line x1="600" y1="43" x2="658" y2="43"/></g>
  <text x="450" y="86" text-anchor="middle" style="font-size:12px;font-family:var(--mono);fill:var(--dim)">언제나 같은 순서 — 빠르고 예측 가능</text>

  <!-- agentic (bottom) -->
  <text x="20" y="150" style="font-size:14px;font-family:var(--display);font-weight:700;fill:var(--accent)">AGENTIC</text>
  <g style="font-family:var(--mono);font-size:13px">
    <rect x="120" y="130" width="120" height="42" rx="9" style="fill:var(--card);stroke:var(--rule);stroke-width:1.5"/><text x="180" y="156" text-anchor="middle" style="fill:var(--ink)">질문</text>
    <rect x="300" y="130" width="150" height="42" rx="9" style="fill:var(--card);stroke:var(--accent);stroke-width:2"/><text x="375" y="156" text-anchor="middle" style="fill:var(--ink)">에이전트(LLM)</text>
    <rect x="660" y="130" width="120" height="42" rx="9" style="fill:var(--card);stroke:var(--rule);stroke-width:1.5"/><text x="720" y="156" text-anchor="middle" style="fill:var(--ink)">답변</text>
  </g>
  <!-- loop -->
  <path d="M450,151 C520,151 520,151 560,151" style="stroke:var(--rule);stroke-width:2;fill:none"/>
  <path d="M560,151 C600,151 600,130 540,130 C470,130 470,151 450,151" style="stroke:var(--accent);stroke-width:2;fill:none;stroke-dasharray:5 4"/>
  <text x="540" y="120" text-anchor="middle" style="font-size:11.5px;font-family:var(--mono);fill:var(--accent)">검색이 필요하면, 필요한 만큼 반복</text>
  <line x1="450" y1="151" x2="658" y2="151" style="stroke:var(--rule);stroke-width:2"/>
  <text x="375" y="196" text-anchor="middle" style="font-size:12px;font-family:var(--mono);fill:var(--dim)">검색 여부·횟수를 스스로 판단</text>
</svg>
<figcaption>2-Step은 항상 한 번 검색, Agentic은 인사엔 검색을 건너뛰고 복합 질문엔 여러 번 검색한다</figcaption>
</figure>

---

<p class="crumbs"><b>LangChain RAG</b><span>RAG 아키텍처</span><em>도구와 에이전트</em></p>

# 에이전트에게 <em>검색 도구</em> 하나면 — Agentic RAG

<div class="steps">
<div><b>도구(Tool)</b><span>검색 함수에 <code>@tool</code>을 붙이면, LLM이 호출할 수 있는 도구가 된다.</span></div>
<div><b>에이전트(Agent)</b><span><code>create_agent(model, tools)</code> — "생각 → 도구 호출 → 관찰 → 반복" 루프.</span></div>
<div><b>Multi-hop</b><span>"A를 찾고, 그걸로 B를 또 찾아" — 한 질문에 검색을 여러 번 이어간다.</span></div>
</div>

<p class="note"><b>관찰</b> 단순 인사엔 <em class="c-ok">검색을 건너뛰고</em>, 지식이 필요한 질문에만 스스로 검색합니다.</p>

---

<p class="crumbs"><b>LangChain RAG</b><span>RAG 아키텍처</span><em>검색 품질 높이기</em></p>

# 더 좋은 소스를 위해 — <em>Rerank</em>로 한 번 더 거른다

<div class="flow">
<div><b>1차 검색</b><span>후보 넉넉히 — 빠르고 거침</span></div>
<div><b>Reranker</b><span>관련도 재정렬 — 정밀</span></div>
<div><b>상위 N개</b><span>생성에 사용</span></div>
</div>

<p class="lead">빠른 검색으로 넓게 뽑고 정밀하게 좁혀, <em>더 좋은 근거</em>만 남깁니다.</p>

<p class="note"><b>Modular RAG</b> retriever · reranker · generator … 이런 부품을 끼워 조립하는 방식입니다.</p>

---

<p class="crumbs"><b>LangChain RAG</b><span>RAG 아키텍처</span><em>임베딩 vs rerank</em></p>

# 둘 다 "관련도"를 보지만, <em>배운 방식</em>이 다릅니다

<div class="vs">
<div class="pane"><h3><span class="latin">BI-ENCODER</span>임베딩 모델</h3><p>질문·문서를 <em>따로</em> 벡터로. "비슷하면 가깝게" 배워서 수백만 개를 <em>빠르게</em> 추린다 — 대신 미묘한 관련도는 놓친다.</p></div>
<i class="vs-badge">vs</i>
<div class="pane key"><h3><span class="latin">CROSS-ENCODER</span>rerank 모델</h3><p>질문·문서를 <em>함께</em> 넣어 관련도를 직접 배운다. <em>정밀</em>하지만 느려서, 추려진 후보 몇십 개에만 쓴다.</p></div>
</div>

<p class="lead">임베딩은 <em>따로 보고 거리만</em>, rerank는 <em>나란히 놓고 같이 읽어</em> 순위를 매깁니다.</p>

<!-- 엘리스엔 reranker가 없어 OpenRouter의 cohere/rerank-4-fast를 쓴다(노트북은 rate limit 때문에 개념만). -->

---
class: divider
---

<p class="div-no">03</p>

## 자기교정 RAG — 스스로 점검하고 고친다

<p class="div-sub">검색 결과를 평가하고, 부족하면 질문을 다시 써서 재검색하는 그래프</p>

<p class="div-file">Part 3 · Hybrid RAG with LangGraph</p>

---

<p class="crumbs"><b>LangChain RAG</b><span>자기교정 RAG</span><em>LangGraph가 필요한 순간</em></p>

# 검색→평가→재검색 같은 흐름은 <em>그래프</em>로 그린다

<div class="deflist narrow">
<div><b>State</b><span>그래프를 따라 흐르는 공유 데이터 — 메시지들이 쌓이는 회람판</span></div>
<div><b>Node</b><span>일하는 함수 — state를 받아 갱신분을 돌려준다</span></div>
<div><b>Edge</b><span>다음 노드로 가는 고정 연결</span></div>
<div><b>Conditional Edge</b><span>state를 보고 <em>다음 행선지를 동적으로</em> 결정 — 분기·반복의 핵심</span></div>
</div>

<p class="note"><b>왜</b> <code>create_agent</code>의 고정 루프로는 "평가해서 부족하면 다시"를 그리기 어렵습니다 — 그래서 LangGraph.</p>

---

<p class="crumbs"><b>LangChain RAG</b><span>자기교정 RAG</span><em>스스로 고치는 루프</em></p>

# 부족하면 질문을 <em>다시 써서</em> 재검색합니다

<figure class="figure">
<svg viewBox="0 0 800 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="검색 후 관련성을 평가해, 관련 있으면 답변 생성, 없으면 질문을 재작성해 다시 검색하는 루프">
  <g style="font-family:var(--mono);font-size:13px">
    <rect x="40"  y="30"  width="150" height="48" rx="10" style="fill:var(--card);stroke:var(--rule);stroke-width:1.5"/><text x="115" y="59" text-anchor="middle" style="fill:var(--ink)">검색</text>
    <polygon points="430,30 540,54 430,78 320,54" style="fill:var(--card);stroke:var(--accent);stroke-width:2"/><text x="430" y="59" text-anchor="middle" style="fill:var(--ink)">관련 있나?</text>
    <rect x="620" y="30"  width="150" height="48" rx="10" style="fill:var(--card);stroke:var(--rule);stroke-width:1.5"/><text x="695" y="59" text-anchor="middle" style="fill:var(--ink)">답변 생성</text>
    <rect x="300" y="178" width="260" height="48" rx="10" style="fill:var(--card);stroke:var(--rule);stroke-width:1.5"/><text x="430" y="207" text-anchor="middle" style="fill:var(--ink)">질문 재작성</text>
  </g>
  <!-- 검색 -> 평가 -->
  <line x1="190" y1="54" x2="318" y2="54" style="stroke:var(--rule);stroke-width:2"/><path d="M318,54 l-10,-4 v8 z" style="fill:var(--rule)"/>
  <!-- 평가 -> 생성 (yes) -->
  <line x1="540" y1="54" x2="618" y2="54" style="stroke:var(--ok);stroke-width:2.5"/><path d="M618,54 l-10,-4 v8 z" style="fill:var(--ok)"/>
  <text x="578" y="42" text-anchor="middle" style="font-size:12px;font-family:var(--mono);fill:var(--ok)">관련 ✅</text>
  <!-- 평가 -> 재작성 (no) -->
  <path d="M430,78 L430,178" style="stroke:var(--accent);stroke-width:2.5;fill:none"/><path d="M430,178 l-4,-10 h8 z" style="fill:var(--accent)"/>
  <text x="452" y="130" style="font-size:12px;font-family:var(--mono);fill:var(--accent)">부족 ⚠️</text>
  <!-- 재작성 -> 검색 (loop back) -->
  <path d="M300,202 C120,202 115,140 115,82" style="stroke:var(--accent);stroke-width:2.5;fill:none;stroke-dasharray:6 4"/><path d="M115,82 l-4,10 h8 z" style="fill:var(--accent)"/>
  <text x="150" y="150" style="font-size:12px;font-family:var(--mono);fill:var(--accent)">다시 검색</text>
</svg>
<figcaption>관련 있으면 답하고, 부족하면 질문을 더 나은 형태로 고쳐 다시 검색한다 — self-correction</figcaption>
</figure>

---
class: divider
---

<p class="div-no">04</p>

## Graph RAG — 비슷함을 넘어, 관계로

<p class="div-sub">의미 유사도가 놓치는 "연결"을, 문서 사이 관계를 따라 검색한다</p>

<p class="div-file">Part 4 · Graph RAG</p>

---

<p class="crumbs"><b>LangChain RAG</b><span>관계 기반 검색</span><em>벡터 검색의 한계</em></p>

# 벡터 검색은 <em class="bad">"연결"을 모릅니다</em>

<p class="thesis">"초밥과 <em>같은 나라</em> 음식은?"이라 물으면 — 벡터 검색은 의미가 비슷한 한식까지 섞어 옵니다.</p>

<div class="vs">
<div class="pane"><h3><span class="latin">VECTOR</span>의미 유사도</h3><p>초밥 · 비빔밥 · 잡채 · 규동 …<br><em class="bad">한식이 섞임</em> — "같은 나라"라는 관계를 모른다.</p></div>
<i class="vs-badge">≠</i>
<div class="pane key"><h3><span class="latin">GOAL</span>우리가 원한 것</h3><p>초밥 · 라멘 · 우동 · 규동<br><em class="c-ok">전부 일식</em> — 같은 cuisine으로 묶기.</p></div>
</div>

<p class="note"><b>한계</b> 벡터는 "비슷함"은 알아도, "같은 범주·저자·나라" 같은 <em>관계</em>는 사용하지 않습니다.</p>

---

<p class="crumbs"><b>LangChain RAG</b><span>관계 기반 검색</span><em>Graph RAG의 원리</em></p>

# 벡터로 출발해, <em>관계(엣지)를 따라</em> 넓힌다

<figure class="figure">
<svg viewBox="0 0 760 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="질문에서 벡터 검색으로 초밥을 찾고, cuisine 엣지를 따라 라멘 우동 규동으로 확장">
  <!-- query -->
  <text x="60" y="130" style="font-size:13px;font-family:var(--mono);fill:var(--dim)">질문</text>
  <line x1="92" y1="125" x2="150" y2="125" style="stroke:var(--rule);stroke-width:2"/><path d="M150,125 l-10,-4 v8 z" style="fill:var(--rule)"/>
  <!-- start node (vector hit) -->
  <circle cx="210" cy="125" r="30" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2.5"/>
  <text x="210" y="122" text-anchor="middle" style="font-size:14px;font-family:var(--sans);fill:var(--ink)">초밥</text>
  <text x="210" y="170" text-anchor="middle" style="font-size:11px;font-family:var(--mono);fill:var(--accent)">벡터 검색 출발점</text>
  <!-- edges to neighbors -->
  <g style="stroke:var(--accent);stroke-width:2">
    <line x1="240" y1="110" x2="430" y2="55"/>
    <line x1="240" y1="125" x2="430" y2="125"/>
    <line x1="240" y1="140" x2="430" y2="195"/>
  </g>
  <!-- neighbor nodes -->
  <g style="font-family:var(--sans);font-size:13px">
    <circle cx="470" cy="55"  r="26" style="fill:var(--card);stroke:var(--rule);stroke-width:1.5"/><text x="470" y="60" text-anchor="middle" style="fill:var(--ink)">라멘</text>
    <circle cx="470" cy="125" r="26" style="fill:var(--card);stroke:var(--rule);stroke-width:1.5"/><text x="470" y="130" text-anchor="middle" style="fill:var(--ink)">우동</text>
    <circle cx="470" cy="195" r="26" style="fill:var(--card);stroke:var(--rule);stroke-width:1.5"/><text x="470" y="200" text-anchor="middle" style="fill:var(--ink)">규동</text>
  </g>
  <text x="350" y="40" text-anchor="middle" style="font-size:12px;font-family:var(--mono);fill:var(--accent)">cuisine = 일식 (엣지)</text>
  <!-- result bracket -->
  <path d="M520,40 C545,40 545,210 520,210" style="fill:none;stroke:var(--rule);stroke-width:1.5"/>
  <text x="560" y="130" style="font-size:13px;font-family:var(--mono);fill:var(--ink)">전부 일식 ✅</text>
</svg>
<figcaption>start_k로 출발점을 찾고, 같은 메타데이터(엣지)로 연결된 문서를 max_depth만큼 따라간다</figcaption>
</figure>

<p class="note"><b>설계 포인트</b> 엣지를 <code>cuisine</code>→<code>spicy</code>→<code>staple</code>로 바꾸면 "같은 나라 → 같은 매운맛 → 같은 면요리"로 검색이 바뀝니다.</p>

---

<p class="crumbs"><b>LangChain RAG</b><span>관계 기반 검색</span><em>실제 결과 비교</em></p>

# 같은 질문, <em>확연히 다른</em> 결과

<div class="vs">
<div class="pane"><h3><span class="latin">VECTOR</span>벡터 검색</h3><p><code>초밥 · 비빔밥 · 잡채 · 불닭</code><br>의미는 비슷하나 <em class="bad">나라가 뒤섞임</em></p></div>
<i class="vs-badge">→</i>
<div class="pane key"><h3><span class="latin">GRAPH</span>Graph RAG</h3><p><code>초밥 · 라멘 · 우동</code><br><em class="c-ok">전부 일식</em> — 게다가 "왜 골랐는지" 설명 가능</p></div>
</div>

<p class="lead"><em>비슷함</em>이 중요하면 벡터, <em>관계·연결</em>이 중요하면 Graph RAG.</p>

---

<p class="crumbs"><b>LangChain RAG</b><span>마무리</span><em>네 가지 검색, 하나의 목표</em></p>

# 검색은 부품 — <em>골라 쓰고, 조립하고, 맡긴다</em>

<div class="deflist">
<div><b>Part 1 · Naive</b><span>의미 유사도로 검색해 생성에 잇는다 — 모든 RAG의 토대</span></div>
<div><b>Part 2 · Agentic</b><span>에이전트가 검색 여부·횟수를 스스로 조율, rerank로 품질을 높인다</span></div>
<div><b>Part 3 · 자기교정</b><span>LangGraph로 검색을 평가하고 부족하면 다시 검색한다</span></div>
<div><b>Part 4 · Graph</b><span>의미를 넘어 문서 간 관계를 따라 검색한다</span></div>
</div>

<p class="lead">부품의 <em>존재 이유</em>를 알면, LLM에게 정확히 시키거나 직접 조립할 수 있습니다.</p>

<p class="refs">LangChain · LangGraph · langchain-graph-retriever · 실습 노트북 4-Part</p>

---
doc: spec
status: draft
---

# Proofline — Technical Spec

Written from the existing Proofline codebase on 2026-10-26, using the Devpost Learn spec template.

## How This Works, In Plain Language

Proofline is a web app that runs almost entirely in the reader's browser.

- The page is a React app. It shows the landing page, the shelf, the reader and the flip book.

- The library on this device is a small database inside the browser. Every text, original PDF, highlight, margin note and brief is saved there. Nothing about the reader's library is stored on a server.

- The text model is how every text is held: a list of blocks (paragraphs, headings, quotes, tables, figures), each with an id and a paragraph number. Any spot in a text is stored as "block id + character offset", so highlights and notes stay put when fonts or themes change.

- The backend (Base44) does two jobs: sign-in, and calling the AI model. The browser sends a finished prompt; the backend returns text or JSON.

- The checker is plain code, not AI. When the model returns a quotation, the checker searches the stored text for those exact words. If they are not there, the quotation is discarded and counted.

Why this shape: the reading and checking all happen next to the data, in the browser, so the app needs no database server, and the one thing that must be trustworthy (the quotes) never depends on the model being honest.

## The Core Journey Through the System

PRD ref: prd.md > The Core Journey .

1. Sign in → AuthContext asks Base44 who the user is → signed out sends them to /login , then back.

2. Import a link → importFromUrl fetches `https://r.jina.ai/<url>` → Markdown comes back → textToArticle turns it into blocks → saveDoc writes it to the docs table → a LibraryItem is added to the shelf → shelveText later asks the model for a topic, tags and a cover scene.

3. Import a PDF → pdfToArticle reads the text layer with pdf.js (via unpdf), up to 400 pages, rejoins lines into paragraphs → the article goes to docs , the file to files .

4. Open a text → /read/:id loads the article from docs → numberBlocks gives each paragraph its ¶ number → the reader renders blocks.

5. Select and ask → anchor.ts turns the browser selection into {start, end, quote} → the lens offers actions → startGloss adds an empty note to the store and calls write → buildMessages puts the whole text (numbered) in the system prompt, then the length rule, then the task → InvokeLLM returns text → the note is filled in → Answer.tsx turns [¶n] into chips that jump to real paragraphs.

6. Investigate a claim → passagesFor picks the 3 passages per chosen text that share the most words with the claim (no AI) → one InvokeLLM call with a JSON schema returns findings → locate searches the stored text for each quotation → unfound quotes are dropped and counted → the packet is saved as a notebook entry.

7. Leave and come back → store changes are written to the state table on a short debounce → on return the store is rebuilt from it.

## Stack

| Piece | Choice | Docs |
| --- | --- | --- |
| UI | React 18, React Router 7 | https://react.dev, https://reactrouter.com |
| Build | Vite 8 with `@base44/vite-plugin` | https://vite.dev |
| Language | TypeScript and JSX mixed | https://www.typescriptlang.org |
| Styling | Tailwind CSS 3, shadcn/ui (Radix) components, custom CSS in `src/styles/` | https://tailwindcss.com, https://ui.shadcn.com |
| State | Zustand-style store (`src/platform/zustand.js`) | https://zustand.docs.pmnd.rs |
| Local database | Dexie 4 over IndexedDB | https://dexie.org |
| Backend, auth, AI | Base44 SDK 0.8 (`base44.auth`, `base44.integrations.Core.InvokeLLM`) | https://docs.base44.com |
| PDF reading | unpdf + pdfjs-dist 4 | https://github.com/unjs/unpdf |
| Page flip | react-pageflip | https://github.com/Nodlik/react-pageflip |
| Motion | framer-motion, canvas-confetti | https://motion.dev |

Unverified, check early: the model label shown to readers is "Gemini 3.8 Flash" while the platform slug sent is gemini_3_flash . Confirm which model actually answers and make the label match.

## Where It Runs and How Someone Tries It

- Runtime: a modern desktop or mobile browser. The hosted Base44 app provides sign-in and AI.

- Local run: Node.js, Deno, and the Base44 CLI ( npm install -g base44@latest ). Then npm install , base44 login , base44 link , base44 dev , and open the printed URL (usually http://localhost:5173 ). The app must have been published once for the UI to load locally.

- Environment values: VITE_BASE44_APP_ID , VITE_BASE44_APP_BASE_URL , VITE_BASE44_FUNCTIONS_VERSION . No AI or search API keys are needed in this build.

- Demo recording: use the hosted app. Path for a 2-minute video: landing headline → open "On a Piece of Chalk" from the starter shelf → select a sentence → Explain → click a ¶ chip → select a claim → Investigate against two other texts → show the verified quotes and the "left out" count → open the notebook and export.

- Submission: demo video plus the public GitHub repo. Deployment is through the Base44 dashboard.

## Look and Feel

Warm paper background, near-black ink, serif body type with optional Literata and Atkinson faces, light and dark themes driven by CSS variables set on `<html>` before first paint ( gloss-boot.js ). Highlights are colour washes; the marked answer line is a wash with a pen underline. Spacious, calm, book-like. Library spines take four shades per topic so each topic reads as a set. Copy is short and plain. Answers: no headings, no em dashes.

## Components

### Import ( lib/import.ts , lib/pdf.ts , lib/article.ts , lib/html-to-blocks.ts )

Turns a link, PDF, text file or paste into an Article of blocks. Talks to the public reader service for links and to Dexie for saving. PRD ref: prd.md > Bringing texts in .

### Reader ( components/reader/Reader.tsx , Block.tsx , Toc.tsx , TopBar.tsx )

Renders numbered blocks, tracks reading progress, hosts the overlays. PRD ref: prd.md > Reading and questioning (the margin) .

### Selection lens ( components/reader/Lens.tsx , lib/anchor.ts , lib/actions.ts )

Reads the selection, builds an anchor, offers the seven actions and the question box, creates highlights. PRD ref: prd.md > Reading and questioning (the margin) .

### Margin answers ( lib/ask.ts , lib/prompts.ts , lib/doc.ts , components/reader/Margin.tsx , Rail.tsx , Answer.tsx )

Builds the prompt, calls the model, writes the answer into the gloss, renders ¶ chips. doc.ts windows texts past about 400,000 characters. PRD ref: prd.md > Reading and questioning (the margin) .

### Whole-text brief ( lib/ask.ts > fetchBrief , components/reader/Brief.tsx , BriefPaper.tsx )

One JSON-schema call returning gist, claims, caveats and sections. PRD ref: prd.md > Whole-text brief .

### Investigate ( lib/evidence.ts , components/reader/Investigate.tsx , EvidenceList.tsx )

Word-overlap passage picking, one model call, then quote verification with quotePattern (matches the quote's words in order, ignoring punctuation and quote styles; quotes under 3 words are rejected). PRD ref: prd.md > Investigate (one claim, your other texts) .

### Brief builder ( lib/brief.ts , lib/briefs.ts , components/reader/BriefBuilder.tsx )

Assembles assertions, tensions and gaps from marked passages; grounds every quote with groundSource ; saves edits to the browser. PRD ref: prd.md > Multi-text brief builder .

### Lab ( lib/lab.ts , components/reader/Lab.tsx , LabCurve.tsx )

Detects growth passages with regular expressions, runs V = V₀ × (1 + r)ⁿ locally, compares to the reader's prediction. PRD ref: prd.md > Explore (the Lab) .

### Notebook and export ( components/reader/Notebook*.tsx , lib/export.ts , lib/zip.ts )

Lists entries with filters and tags; exports Markdown and a zip. PRD ref: prd.md > Highlights, notebook and review .

### Review ( lib/review.ts , components/landing/DailyHighlight.tsx )

Spaced schedule derived from each highlight's review field. PRD ref: prd.md > Highlights, notebook and review .

### Library ( components/library/* , lib/library.ts , lib/shelving.ts , lib/art.ts , lib/classics.ts )

Topic shelves, stable spine looks from the text id, background AI sorting, SVG plates, starter shelf. PRD ref: prd.md > Library .

### Listen ( lib/listen.ts , lib/language.ts , components/reader/Listen.tsx )

Browser speech synthesis, paragraph by paragraph, voice chosen by detected language. PRD ref: prd.md > Library .

### Auth ( lib/AuthContext.jsx , App.jsx > AuthenticatedApp , pages/Login.jsx and siblings)

Base44 email/password, one-time code, Google, password reset, return-to handling. PRD ref: prd.md > The Core Journey .

## Data Model

Browser database proofline (Dexie, version 1):

| Table | Key | Holds |
| --- | --- | --- |
| docs | id | `{ id, article }` — the full text as blocks |
| files | id | the original PDF blob |
| covers | id | painted cover blobs (unused in this build) |
| state | key | the persisted store and settings |

Persisted store (written to state , debounced):

- library: LibraryItem[] — title, author, source, words, origin, addedAt, topic, tags, scene, cover, favorite, finishedAt.

- glosses: `Record<articleId, Gloss[]>` — anchor or reading position, action, question, turns (assistant and user), note, tags, starred, optional evidence packet.

- highlights: `Record<articleId, Highlight[]>` — anchor, colour, note, tags, starred, review { due, step, last, off } .

- briefs: `Record<articleId, BriefState>` — the whole-text brief and its status.

- progress: `Record<articleId, { block, pct, at }>` — where the reader left off.

Anchor: { start: { b: blockId, o: offset }, end: { b, o }, quote } .

Leaving and returning: everything above survives a reload in the same browser. Clearing site data, a private window, or another device starts empty.

Base44 entities Article , Highlight , ReadingNote , User are defined in base44/entities/ but the app does not read or write the first three. sync.ts is a deliberate no-op.

## File Structure

```text
 proofline/
 ├── base44/


 │      ├── config.jsonc                # Base44 site commands
 │      └── entities/                   # Backend schemas (defined, not yet used for library data)
 ├── devpost/                           # Devpost Learn planning docs: scope, prd, spec
 ├── src/
 │      ├── App.jsx                     # Routes: /, /library, /read/:id, /flip/:id
 │      ├── api/base44Client.js         # Base44 SDK client
 │      ├── pages/                      # Route pages and auth screens
 │      ├── components/
 │      │    ├── landing/               # Hero, import bar, desk, daily highlight
 │      │    ├── library/               # Shelves, books, add panel, AI sort, arrivals
 │      │    ├── reader/                # Reader, lens, margin, brief, investigate, lab, notebook, listen
 │      │    ├── flip/                  # Page-flip view
 │      │    ├── help/                  # Guided tour
 │      │    └── ui/                    # shadcn/ui primitives
 │      ├── lib/                        # Text model, prompts, AI calls, evidence checker, store, Dexie
 │      ├── content/                    # Bundled readings as JSON blocks
 │      └── styles/                     # Theme, reader, library and flip CSS
 ├── SOURCE_RECOVERY.md                 # How this source was recovered from Base44
 └── package.json
```

## External Services and Dependencies

### Base44 InvokeLLM

- Call: base44.integrations.Core.InvokeLLM({ prompt, model: "gemini_3_flash", add_context_from_internet?, response_json_schema? }) .

- Returns: a string, or an object matching the schema.

- Used by: margin answers, whole-text brief, Investigate, brief builder, shelving.

- Keys: none in the app; uses the app's Base44 credits. Limits and cost: set by the Base44 plan. Check the plan's integration credit limit before recording the demo.

- Docs: https://docs.base44.com

### Base44 auth

- auth.me , loginViaEmailPassword , register , verifyOtp , resendOtp , loginWithProvider("google") , resetPasswordRequest , resetPassword .

### Jina Reader ( r.jina.ai )

- Call: GET `https://r.jina.ai/<url>` with accept: text/plain . Returns Title: , Published Time: and Markdown Content: sections.

- Keys: none. Limits: unauthenticated free tier, rate limited by IP. Docs: https://jina.ai/reader

### Remote assets

- Google Fonts and some Wix-hosted static images are referenced by URL.

## Important Failure Modes

- The model returns quotes that are not in the text → they are dropped and counted; if none survive, the panel says so and offers retry instead of showing anything unchecked.

- A page will not import (blocked site, paywall, Jina rate limit, scanned PDF) → a plain error and the suggestion to paste the text.

- The browser database cannot open → StorageRecovery explains, keeps existing data, and lets the reader retry.

- The model call fails or comes back empty → the note shows the reason and a retry; nothing is left spinning.

## What Was Simplified and Why

- Browser-only storage instead of account sync — no server data model to build or secure. The fuller version would write Article , Highlight and ReadingNote entities and merge changes across devices.

- Word-overlap passage picking instead of embeddings — no vector index needed and the choice is explainable. The cost is that up to 3 passages per text are read, so evidence elsewhere can be missed; the app says so every time.

- One model instead of a fast/deep choice — simpler UI and predictable cost.

- Platform web context instead of a dedicated search API with numbered sources — no keys to hold. Web-derived content is not citation-checked the way text quotes are.

- Browser speech instead of a hosted narrator voice — no key, nothing leaves the device.

- One deterministic Lab model (compound growth) instead of AI-generated simulations — every number is reproducible.

## Decisions and Open Issues

Decisions (from the code):

- Quotes are verified by code after the model answers, not trusted. Tradeoff: some correct but paraphrased quotes are discarded.

- Coverage is stated before and after every Investigate run. Tradeoff: a less confident-sounding product.

- The whole text goes in the system prompt so follow-ups on the same text can reuse the model's cache.

Open issues found while writing this spec:

1. Fact-check web lookup. The UI says Fact-check "Searches the web," but write() in lib/ask.ts sends add_context_from_internet: st.settings.search for every action, so with the switch off, Fact-check does not search. Fix: force it on when action === "check" .

2. Naming. The system prompt says "You are Gloss," the PDF error says "Gloss reads .txt and .md files," and the localStorage/CSS hooks use gloss . Rename reader-visible strings to Proofline.

3. Model label. Readers see "Gemini 3.8 Flash"; the call uses gemini_3_flash . Make the label match what runs.

4. Unused server-era files. lib/search.ts (Exa), lib/voice.ts (Cartesia), lib/agent.ts , lib/ratelimit.ts are not imported anywhere, and quota.ts and upgrade.ts are referenced in comments but absent. Remove or mark as legacy so reviewers do not read them as live features.

5. Margin citations check existence, not support. A [¶n] chip is disabled if paragraph n does not exist, but nothing checks that paragraph n says what the answer claims. Only Investigate and the brief builder verify quotations. Keep marketing claims to those two features.

6. Sign-in without sync. Login is required, yet the library does not follow the account. Either sync, or say plainly that the library lives on this device.

Learner uncertainty: none recorded; these docs were written from the code, not from a planning conversation.

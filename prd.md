---
doc: prd
status: draft
---

# Proofline — Product Requirements

A close-reading app for people who read to understand and then have to use what they read: question any passage and get a margin note tied to the paragraphs it came from, with every quotation checked against the stored text. Source: scope.md > The Unique Kernel , scope.md > Who It's For .

Written from the existing Proofline codebase on 2026-10-26, using the Devpost Learn PRD template.

## The Core Journey

1. Arrive. The landing page leads with "Don't just read it. Question all of it." A magnifier lens over the headline shows the idea before any sign-in. An import bar takes a link or pasted text straight away.

2. Sign in. Email and password (with a one-time code on registration) or Google. Signed-out visitors are sent to log in and returned to where they were.

3. Get a text. Paste a link, drop a PDF or a .txt/.md file, paste text, or open one of the bundled readings (Thoreau's Walden, Huxley's "On a Piece of Chalk", Schopenhauer's "On Thinking for Oneself", and an original worked example on compound growth). The text lands on the shelf.

4. Read. The text opens in the reader with numbered paragraphs, a table of contents, and a margin.

5. Question a passage. Select text. The lens appears with quick actions or a question box. The answer writes itself into the margin beside that paragraph, with ¶ citations and the direct answer marked.

6. Follow up. Ask a follow-up in the same thread, retry, or stop an answer in progress.

7. Weigh a claim. On a claim, choose Investigate. Pick which other shelf texts to compare against, read the stated coverage limit, run it, and get findings marked Supporting, Conflicts or Not established, each with a verified quotation that jumps to its place.

8. Keep it. Highlights, questions, answers and evidence packets collect in the text's notebook. Export one entry or the whole shelf as Markdown.

9. Success: the reader can say what a passage means and what their other texts say about it, and can click back to every source behind that answer.

## Screens and Layout

- Landing ( / ) — Hero headline with the magnifier, import bar, paste sheet, a desk of recent documents and the reader's sticky notes, a daily highlight card once highlights exist, and a line of the shelf.

- Auth pages — Login, Register (with code verification), Forgot and Reset password, OAuth consent.

- Library ( /library ) — Shelves by topic (18 fixed topics such as AI, Science, Philosophy, Economics), each book a cloth spine with a stable colour and height. Add panel, AI sort button, starter shelf for an empty library, arrivals card as new texts land, and a notes desk at the foot.

- Reader ( /read/:id ) — Top bar (title, settings, listen, web switch), table of contents, the text in numbered blocks, the margin rail of answers, and overlays for the lens, Brief, Brief builder, Investigate, Lab and Notebook.

- Flip book ( /flip/:id ) — The same text laid out as turning pages, a two-page spread on wide screens.

- Help tour — A step-by-step tour anchored to real controls, available from a help button.

## Look and Feel

Warm paper and ink, serif reading type (with Literata and Atkinson as optional reading faces), light and dark themes. Highlights look like a highlighter wash, emphasis like a pen underline. The library looks like a real bookshelf: cloth spines in four shades per topic, printed bookplates drawn as SVG. Interface copy is plain, calm and slightly literary ("Unsorted is a fine place to wait."). Answers never use headings or em dashes.

## Features and Behavior

### Bringing texts in

- Link: the page is fetched through a public reader service, turned into Markdown, then into blocks. Title, site and year are kept.

- PDF: read in the browser, page by page, up to a page limit. Lines are rejoined into paragraphs. A scanned page with no text layer is reported as empty rather than guessed at. The original file is stored beside the text.

- .txt / .md files and pasted text: turned into blocks directly.

- Bundled readings: ship with the app, already shelved with covers.

- Each import reports progress and a plain error with a fallback ("Try pasting the text instead").

### Reading and questioning (the margin)

- As a student, I want to select a sentence and ask what it means so that I understand it without leaving the page.

  - [ ] Selecting text inside the article shows the lens; selecting outside it does not.

  - [ ] Quick actions: Explain, Define (four words or fewer) or Simplify (longer), Fact-check, Related, Counterpoint, Investigate, and a free question.

  - [ ] The answer appears in the margin beside the selected paragraph, with the direct answer marked once.

  - [ ] Every [¶n] in an answer becomes a chip that jumps to and previews that paragraph; a number that does not exist in the text is shown disabled.

  - [ ] The reader can follow up, retry, or stop. A failure shows a reason and a retry, never a blank note.

- Whole-text questions can be asked from the reading position, with starters ("What would a sharp skeptic say?").

- Answer length is a setting: short, normal, long.

- A web switch lets answers draw on the internet. It is on by default.

### Whole-text brief

- One click returns a gist (two sentences), 3 to 5 load-bearing claims and 1 to 3 caveats, each citing a paragraph, and 4 to 8 sections that cover the text in order.

- Numbers must come from the text's evidence, not its summary; where they disagree, a caveat says so.

### Investigate (one claim, your other texts)

- As a researcher, I want to check a claim against the papers I already have so that I know whether my sources agree.

  - [ ] Before the run, the panel states the coverage limit: up to 3 passages and about 1,800 characters read from each text.

  - [ ] Each finding is Supporting, Conflicts, or Not established.

  - [ ] Every quotation shown was found word for word in the stored text and links to its exact place. Any that were not found are left out and counted.

  - [ ] The model's own conclusion is labelled as inference, not evidence.

  - [ ] The result is saved to the notebook as an evidence packet with its coverage line.

### Multi-text brief builder

- As a writer, I want to turn passages I marked across several texts into an argument so that I can see what my sources actually support.

  - [ ] Needs at least two passages.

  - [ ] Returns a title, a question, an arguable thesis, 3 to 6 assertions with reasoning, tensions, and gaps.

  - [ ] An assertion keeps only sources whose quotation is found in the stored text; an assertion with no verified source is dropped and counted.

  - [ ] Disagreements are kept as tensions with both sides linked, never resolved for the reader.

  - [ ] The brief is editable and saved in the browser as it changes.

### Explore (the Lab)

- When a selected passage describes something growing at a rate, the reader can open a compound growth model, set the start value, rate and periods, write down a prediction, run it, and compare. All arithmetic runs locally with no model call. The passage, the model's assumptions and the result are shown separately.

### Highlights, notebook and review

- Highlights in several colours, with an optional note. Clicking a highlight reopens the lens on it.

- The notebook lists every question, answer, highlight and packet for a text, with filters, tags and bulk actions.

- Export one entry to the clipboard, or the whole shelf as a zip of Markdown files ready for Obsidian, with web citations as footnotes.

- A daily review brings back a few highlights on a widening schedule (3 days, a week, two weeks, a month). Marking one done retires it.

### Library

- New texts are sorted onto a topic in the background with tags and a cover scene. Moving a book by hand always wins.

- Read aloud (off by default) uses the browser's own voice, follows along paragraph by paragraph, and picks a voice for the text's language.

- Settings: theme, reading face, highlighter colours, answer length, web lookups, two-page spread, read aloud.

## States and Boundaries

- First use / empty library — A starter shelf of bundled readings, and a help tour.

- Signed out — Redirected to login, then back to the page they wanted.

- Answer in progress — The margin shows a shimmering pen wash until text arrives; focus mode is exited so the answer is visible.

- Long text — Past roughly 100k tokens, only a window around the reader's position is sent, and the model is told to say so if a question needs the rest.

- Import failure — A plain reason and a suggested fallback.

- AI failure or empty answer — A reason on the note, with retry.

- Unverifiable quotes — Dropped and counted; if nothing survives, the run fails with an explanation instead of showing unchecked text.

- What persists — Texts, original PDFs, highlights, notes, glosses, briefs and settings live in this browser's database. They do not follow the account to another device.

- Browser storage failure — A storage recovery prompt; the database is kept and the reader can retry.

## Product Decisions

Decisions visible in the code. Reasons in quotes are from code comments; anything else is marked as an assumption to confirm.

- One model for everything — "quick enough for a margin note and steady enough for a whole-text brief."

- Quotes are verified in code, not trusted from the model — so "nothing on screen is invented."

- Coverage limits are always shown — "so the limit is never hidden."

- The Lab is deterministic — "the arithmetic is checkable by hand," and the numbers are never presented as the author's.

- AI sorting never happens during import — it is a separate background step, and manual shelving wins.

- Data lives in the browser — no server storage for the library. Assumption: chosen for privacy and speed of building; confirm.

## What We're Building

Everything in Features and Behavior above, running on a hosted backend that provides sign-in and the AI model, with the library stored in the browser.

## Deferred From the POC

- Cross-device sync — Data entities exist on the backend but the app does not write to them. Out because the local store already works and sync adds conflict handling.

- Careful re-read of hard PDF pages with a vision model — The panel exists but says it is not part of this build.

- Painted cover images — No image model in this build.

- Agent access to the library — Token code exists but is not wired in.

## Possible Later Enhancements

- Web results returned as numbered sources ([1], [2]) and checked like text quotes.

- A natural narrator voice for read-aloud.

- Shared briefs another reader can open.

## Non-Goals

- Not a chatbot. Every question starts from a passage or a reading position in a specific text.

- Not a truth oracle. Investigate reports what the selected excerpts show, never that a claim is true in general.

- Not a book reader for whole bound books. PDFs are capped at a page limit.

- No model picker or user API keys.

## Open Questions

- Must answer before submission: Fact-check is described as "Searches the web," but web lookup follows the global switch. Should Fact-check force a web lookup?

- Must answer before submission: Should the product be called Proofline everywhere? The AI's prompts and some messages still say "Gloss."

- Can wait: Should the library sync through the account, given sign-in is already required?

- Can wait: Should URL import keep depending on a public third-party reader service?

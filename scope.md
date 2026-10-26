---
doc: scope
status: draft
---

# Proofline

A reading app where you select any passage, question it, and get an answer in the margin that is pinned to the paragraphs it came from, and where any quotation the AI offers must exist word for word in your texts or it is thrown away.

Written from the existing Proofline codebase on 2026-10-26, using the Devpost Learn scope template.

## The Unique Kernel

AI that reads with you but cannot put words in the author's mouth. Every answer cites numbered paragraphs ([¶12]) you can click back to, and when Proofline weighs a claim against your other texts, each quotation the model returns is searched for in the stored text. A quote that cannot be found is dropped and counted, never shown. The headline promise: "Don't just read it. Question all of it."

## Who It's For

Someone who reads to understand and then has to use what they read: a researcher working through papers, a student with assigned essays, a writer collecting sources for an argument. Today they bounce between a PDF viewer, a chatbot tab and a notes app. The chatbot answers confidently, cites nothing they can check, and loses the connection back to the page.

## The Core Loop

1. Open a text from the shelf (a link, a PDF, pasted text, or one of the bundled classics).

2. Read. Select a sentence that matters.

3. A lens appears over the selection: Explain, Define or Simplify, Fact-check, Related, Counterpoint, Investigate, or type your own question.

4. The answer is written in the margin beside that paragraph, with clickable ¶ citations and the key line marked like a highlighter.

5. Keep going. Every question, answer and highlight collects in a notebook for that text.

They come back because the notebook and the shelf grow: highlights return in a spaced daily review, and more texts make Investigate and the multi-text brief more useful.

## Inspiration & Identity

A scholar's annotated book, not a chat window. Warm paper, serif type, highlighter washes and pen underlines, cloth-bound book spines on a shelf sorted by topic, painted bookplates. Answers read like a sharp, generous scholar leaning over your shoulder: short, direct, no preamble.

## Why This Matters to the Learner

To fill in, in your own words.

## What "Working" Looks Like

Open "On a Piece of Chalk" from the starter shelf, select a sentence, choose Explain, and watch a short note write itself into the margin beside that paragraph with a ¶ citation that jumps back to the source. Then select a claim, choose Investigate, and see it weighed against two other texts on the shelf, with each supporting or conflicting passage quoted exactly and linked to where it sits.

The "oh, that's cool" beat: the packet says outright how many offered quotations could not be found in the stored text and were left out.

## The POC Boundary

- Import a text (link, PDF, .txt/.md, paste) or open a bundled sample.

- The reader with numbered paragraphs, selection lens and margin answers.

- The verified-quote features: Investigate (one claim against your other texts) and the multi-text Brief.

- Highlights and a per-text notebook, kept in the browser.

- Sign-in, so the app runs on a hosted backend with its AI quota.

## Later

- Syncing the library across devices through the account (entities exist but are not used yet).

- Reading long or scanned PDFs page by page with a vision model.

- A natural voice for read-aloud instead of the browser's own.

- Letting an outside agent (Claude, ChatGPT) add texts to the shelf.

- Web sources with numbered citations in answers, checked like the text quotes are.

## Explicitly Cut

- Painted AI cover images: no image model in this build, so covers fall back to drawn topic plates.

- Choosing between models: one fast model answers everything, which keeps answers quick and cost predictable.

- Bring-your-own API key: the platform's model is used, so there is no key to manage.

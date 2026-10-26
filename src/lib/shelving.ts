"use client";

/**
 * The library's sorting, from the browser: each new text is sorted once, in
 * the background, and comes back with a topic, tags and a scene for its cover.
 * Moving a book by hand always wins.
 */

import { base44 } from "@/api/base44Client";
import type { Article } from "./article";
import { excerptOf } from "./excerpt";
import { TOPICS, type Shelving } from "./library";
import { PLATFORM_MODEL } from "./models";
import { loadDoc, useStore, type LibraryItem } from "./store";

const inflight = new Set<string>();

type Text = Pick<Article, "id" | "title" | "author" | "source" | "dek"> & { blocks?: Article["blocks"] };

const SCHEMA = {
  type: "object",
  properties: {
    topic: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    scene: { type: "string" },
  },
  required: ["topic", "tags", "scene"],
};

export async function shelveText(a: Text): Promise<void> {
  if (inflight.has(a.id)) return;
  inflight.add(a.id);
  try {
    const topics = TOPICS.map((t) => `${t.key} (${t.label})`).join(", ");
    const s = (await base44.integrations.Core.InvokeLLM({
      prompt: `You are the librarian of a reading app. Sort one text onto a single topic, and describe the scene a painted cover would show.

TOPICS: ${topics}

THE TEXT: "${a.title}"${a.author ? ` by ${a.author}` : ""}${a.source ? ` (${a.source})` : ""}${a.dek ? `\n${a.dek}` : ""}${a.blocks ? `\n\n${excerptOf(a.blocks)}` : ""}

Rules:
- topic is one of the keys above, exactly.
- 2 to 4 tags, lowercase, one or two words each.
- scene is one sentence of 12 to 20 words describing a quiet still image for the cover: objects, light, place. No faces, no lettering, no abstract nouns.`,
      model: PLATFORM_MODEL,
      response_json_schema: SCHEMA,
    })) as Shelving;

    if (!s?.topic) return;
    const st = useStore.getState();
    const cur = st.library.find((x) => x.id === a.id);
    if (!cur || cur.topic) return;
    st.shelve(a.id, { topic: s.topic, tags: s.tags?.length ? s.tags : undefined, scene: s.scene });
  } catch {
    // Unsorted is a fine place to wait.
  } finally {
    inflight.delete(a.id);
  }
}

let backfilling = false;

/** Sort what was shelved before the library existed: two at a time, a few dozen a visit. */
export async function backfill(items: LibraryItem[], limit = 40): Promise<void> {
  if (backfilling) return;
  const todo = items.filter((x) => !x.topic && x.origin !== "sample").slice(0, limit);
  if (!todo.length) return;
  backfilling = true;
  try {
    const next = async () => {
      for (let x = todo.shift(); x; x = todo.shift()) {
        const doc = await loadDoc(x.id).catch(() => null);
        await shelveText(doc ?? { id: x.id, title: x.title, author: x.author, source: x.source, dek: x.dek });
        await new Promise((r) => setTimeout(r, 400));
      }
    };
    await Promise.all([next(), next()]);
  } finally {
    backfilling = false;
  }
}

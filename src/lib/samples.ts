import chalk from "@/content/on-a-piece-of-chalk.json";
import worked from "@/content/compound-growth-worked.json";
import thinking from "@/content/on-thinking-for-oneself.json";
import walden from "@/content/walden-reading.json";
import type { Article } from "./article";

/**
 * Bundled texts. The three public-domain readings ship in full. The fourth is
 * an original Proofline worked example — plainly labelled as ours, not a
 * reading — so the deterministic Explore model has a passage that visibly
 * supports it without any import or model call.
 */
export const SAMPLES: Article[] = [chalk, thinking, walden, worked].map((a) => ({ ...(a as Article), origin: "sample" as const }));

export const sampleById = (id: string) => SAMPLES.find((a) => a.id === id) ?? null;

/** Starter questions per sample, where the age of the text is the interesting part. */
export const SAMPLE_QUESTIONS: Record<string, string[]> = {
  "on-a-piece-of-chalk": ["What is the core argument, in three sentences?", "What has science learned since 1868?", "Why lecture this to working men?"],
  "on-thinking-for-oneself": ["What is the core argument, in three sentences?", "Is he against reading?", "How would he see the internet?"],
  "walden-reading": ["What is the core argument, in three sentences?", "What does he mean by heroic books?", "Is he being elitist?"],
  "compound-growth-worked": ["Where do the 121 units come from?", "What happens at a flat rate?", "Is this evidence of anything?"],
};

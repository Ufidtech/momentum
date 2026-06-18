import { pipeline } from "@xenova/transformers";

let extractorPromise = null;

async function getExtractor() {
    if (!extractorPromise) {
        extractorPromise = pipeline(
            "feature-extraction",
            "Xenova/all-MiniLM-L6-v2"
        );
    }
    return extractorPromise;
}

self.addEventListener("message", async (event) => {
    const { id, text } = event.data || {};

    try {
        const extractor = await getExtractor();

        // Generate embeddings locally
        const output = await extractor(text, { pooling: "mean", normalize: true });

        // Simple local metadata signal derived from embedding + text properties
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
        const charCount = text.length;

        // Convert embedding magnitude to a lightweight heuristic score.
        // Keep it deterministic and bounded for backend metadata.
        const values = Array.isArray(output?.data) ? output.data : [];
        const magnitude = values.length
            ? values.reduce((sum, n) => sum + Math.abs(n), 0) / values.length
            : 0;

        const sentimentScore = Math.max(
            0,
            Math.min(1, Number((1 - Math.min(magnitude / 10, 1)).toFixed(3)))
        );

        self.postMessage({
            id,
            ok: true,
            payload: {
                sentiment_score: sentimentScore,
                word_count: wordCount,
                char_count: charCount,
            },
        });
    } catch (error) {
        self.postMessage({
            id,
            ok: false,
            error: error?.message || "Worker analysis failed",
        });
    }
});
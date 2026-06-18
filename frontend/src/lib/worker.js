// 1. Polyfill process.env to stop the worker from crashing
self.process = { env: {} };

import { pipeline, env } from '@xenova/transformers';

// Skip local caching checks to pull directly from HuggingFace
env.allowLocalModels = false;

class PipelineSingleton {
    static task = 'feature-extraction';
    static model = 'Xenova/all-MiniLM-L6-v2';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }
}

self.addEventListener('message', async (event) => {
    const { text } = event.data;

    try {
        const wordCount = text.trim().split(/\s+/).length;

        const extractor = await PipelineSingleton.getInstance((x) => {
            self.postMessage({ status: 'progress', data: x });
        });

        const output = await extractor(text, { pooling: 'mean', normalize: true });

        const rawScore = Math.abs(output.data[0]);
        const sentimentScore = parseFloat((rawScore * 10).toFixed(2));

        self.postMessage({
            status: 'complete',
            metadata: {
                word_count: wordCount,
                sentiment_score: sentimentScore
            }
        });

    } catch (error) {
        self.postMessage({ status: 'error', error: error.message });
    }
});
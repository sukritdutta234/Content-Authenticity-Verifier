// ============================================
// TEXT ANALYZER MODULE
// Uses Hugging Face API for AI text detection
// ============================================

const TextAnalyzer = {
    // Hugging Face models for text classification
    MODELS: {
        // AI text detection model
        aiDetector: 'roberta-base-openai-detector',
        // Alternative models
        fakeNews: 'hamzab/roberta-fake-news-classification',
        sentiment: 'distilbert-base-uncased-finetuned-sst-2-english'
    },

    API_URL: 'https://api-inference.huggingface.co/models/',

    /**
     * Main analysis function
     */
    async analyze(text, apiKey) {
        const results = {
            overallScore: 0,
            wordCount: 0,
            sentenceCount: 0,
            perplexity: 'N/A',
            burstiness: 'N/A',
            breakdown: [],
            warnings: []
        };

        // Basic text stats
        results.wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
        results.sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

        // Run multiple analyses in parallel
        const [aiDetection, linguisticAnalysis, patternAnalysis] = await Promise.allSettled([
            this.detectAIContent(text, apiKey),
            this.analyzeLinguistics(text),
            this.analyzePatterns(text)
        ]);

        // Process AI Detection results
        let aiScore = 50; // Default neutral
        if (aiDetection.status === 'fulfilled' && aiDetection.value) {
            aiScore = aiDetection.value.humanScore;
            results.breakdown.push({
                name: 'AI Detection Model (RoBERTa)',
                score: aiScore
            });

            if (aiScore < 40) {
                results.warnings.push('AI detection model indicates high probability of machine-generated content');
            }
        } else {
            // Fallback analysis if API fails
            const fallback = this.fallbackAIDetection(text);
            aiScore = fallback.score;
            results.breakdown.push({
                name: 'AI Detection (Heuristic Fallback)',
                score: aiScore
            });
            if (fallback.warnings.length > 0) {
                results.warnings.push(...fallback.warnings);
            }
        }

        // Process Linguistic Analysis
        if (linguisticAnalysis.status === 'fulfilled') {
            const ling = linguisticAnalysis.value;
            results.perplexity = ling.perplexity;
            results.burstiness = ling.burstiness;

            results.breakdown.push({
                name: 'Linguistic Diversity',
                score: ling.diversityScore
            });

            results.breakdown.push({
                name: 'Sentence Variation',
                score: ling.variationScore
            });

            results.breakdown.push({
                name: 'Vocabulary Richness',
                score: ling.vocabularyScore
            });

            if (ling.warnings) {
                results.warnings.push(...ling.warnings);
            }
        }

        // Process Pattern Analysis
        if (patternAnalysis.status === 'fulfilled') {
            const patterns = patternAnalysis.value;

            results.breakdown.push({
                name: 'Writing Pattern Naturalness',
                score: patterns.naturalScore
            });

            results.breakdown.push({
                name: 'Content Credibility Signals',
                score: patterns.credibilityScore
            });

            if (patterns.warnings) {
                results.warnings.push(...patterns.warnings);
            }
        }

        // Calculate overall score
        const scores = results.breakdown.map(b => b.score);
        results.overallScore = Math.round(
            scores.reduce((sum, s) => sum + s, 0) / scores.length
        );

        // Remove duplicate warnings
        results.warnings = [...new Set(results.warnings)];

        return results;
    },

    /**
     * Call Hugging Face API for AI content detection
     */
    async detectAIContent(text, apiKey) {
        try {
            // Use OpenAI detector model
            const response = await fetch(
                `${this.API_URL}openai-community/roberta-base-openai-detector`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        inputs: text.substring(0, 2000) // Model has token limit
                    })
                }
            );

            if (!response.ok) {
                // Try alternate model
                return await this.tryAlternateModel(text, apiKey);
            }

            const data = await response.json();

            if (data.error) {
                // Model might be loading
                if (data.error.includes('loading')) {
                    // Wait and retry
                    await new Promise(r => setTimeout(r, 20000));
                    return await this.detectAIContent(text, apiKey);
                }
                throw new Error(data.error);
            }

            // Parse results - model returns labels like "LABEL_0" (fake) and "LABEL_1" (real)
            // or "Real" and "Fake"
            let humanScore = 50;

            if (Array.isArray(data) && Array.isArray(data[0])) {
                const results = data[0];
                for (const result of results) {
                    const label = result.label.toLowerCase();
                    if (label === 'real' || label === 'label_1') {
                        humanScore = Math.round(result.score * 100);
                    }
                }
            } else if (Array.isArray(data)) {
                for (const result of data) {
                    const label = result.label.toLowerCase();
                    if (label === 'real' || label === 'label_1') {
                        humanScore = Math.round(result.score * 100);
                    }
                }
            }

            return { humanScore };

        } catch (error) {
            console.warn('AI Detection API error:', error);
            return null;
        }
    },

    /**
     * Try alternative Hugging Face model
     */
    async tryAlternateModel(text, apiKey) {
        try {
            const response = await fetch(
                `${this.API_URL}Hello-SimpleAI/chatgpt-detector-roberta`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        inputs: text.substring(0, 2000)
                    })
                }
            );

            if (!response.ok) return null;

            const data = await response.json();
            let humanScore = 50;

            if (Array.isArray(data) && data[0]) {
                const results = Array.isArray(data[0]) ? data[0] : data;
                for (const result of results) {
                    const label = result.label.toLowerCase();
                    if (label.includes('human') || label === 'label_0') {
                        humanScore = Math.round(result.score * 100);
                    }
                }
            }

            return { humanScore };
        } catch {
            return null;
        }
    },

    /**
     * Fallback heuristic-based AI detection
     */
    fallbackAIDetection(text) {
        const warnings = [];
        let score = 75; // Start with slight lean toward authentic

        const words = text.split(/\s+/);
        const sentences = text.split(/[.!?]+/).filter(s => s.trim());

        // Check for repetitive sentence structure
        const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
        const avgLen = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
        const variance = sentenceLengths.reduce((sum, len) =>
            sum + Math.pow(len - avgLen, 2), 0) / sentenceLengths.length;

        if (variance < 15) {
            score -= 15;
            warnings.push('Very uniform sentence lengths detected (common in AI text)');
        }

        // Check for overly formal/perfect grammar indicators
        const formalPhrases = [
            'it is important to note', 'it is worth mentioning',
            'in conclusion', 'furthermore', 'moreover', 'additionally',
            'it should be noted', 'one might argue', 'it is essential',
            'in today\'s world', 'plays a crucial role',
            'it is imperative', 'significantly', 'consequently'
        ];

        const lowerText = text.toLowerCase();
        let formalCount = 0;
        formalPhrases.forEach(phrase => {
            if (lowerText.includes(phrase)) formalCount++;
        });

        if (formalCount > 3) {
            score -= 10;
            warnings.push('Excessive use of formal transitional phrases');
        }

        // Check for lack of personal voice
        const personalWords = ['i ', 'my ', 'me ', 'i\'m', 'i\'ve', 'personally'];
        let personalCount = 0;
        personalWords.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            const matches = lowerText.match(regex);
            if (matches) personalCount += matches.length;
        });

        // Check vocabulary diversity (Type-Token Ratio)
        const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-z]/g, '')));
        const ttr = uniqueWords.size / words.length;

        if (ttr < 0.4) {
            score -= 10;
            warnings.push('Low vocabulary diversity detected');
        }

        // Check for sensationalist language (fake news indicator)
        const sensationalWords = [
            'shocking', 'unbelievable', 'you won\'t believe',
            'breaking', 'urgent', 'secret', 'they don\'t want you to know',
            'exposed', 'bombshell', 'mind-blowing', 'conspiracy',
            'mainstream media', 'cover up', 'whistleblower'
        ];

        let sensationalCount = 0;
        sensationalWords.forEach(word => {
            if (lowerText.includes(word)) sensationalCount++;
        });

        if (sensationalCount > 2) {
            score -= 15;
            warnings.push('Sensationalist language patterns detected (potential misinformation)');
        }

        // Check for excessive superlatives and absolutes
        const absoluteWords = [
            'always', 'never', 'every', 'all', 'none',
            'completely', 'totally', 'absolutely', 'definitely',
            'undoubtedly', 'certainly', 'obviously'
        ];

        let absoluteCount = 0;
        absoluteWords.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            const matches = lowerText.match(regex);
            if (matches) absoluteCount += matches.length;
        });

        if (absoluteCount > 5) {
            score -= 8;
            warnings.push('Excessive use of absolute/superlative language');
        }

        score = Math.max(5, Math.min(95, score));

        return { score, warnings };
    },

    /**
     * Linguistic analysis
     */
    async analyzeLinguistics(text) {
        const words = text.split(/\s+/);
        const sentences = text.split(/[.!?]+/).filter(s => s.trim());
        const warnings = [];

        // Vocabulary Richness (Type-Token Ratio)
        const cleanWords = words.map(w => w.toLowerCase().replace(/[^a-z']/g, '')).filter(w => w.length > 0);
        const uniqueWords = new Set(cleanWords);
        const ttr = uniqueWords.size / cleanWords.length;
        const vocabularyScore = Math.round(Math.min(ttr * 130, 95));

        // Sentence Length Variation (Burstiness)
        const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
        const avgLen = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
        const stdDev = Math.sqrt(
            sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgLen, 2), 0) / sentenceLengths.length
        );
        const burstinessValue = Math.round(stdDev * 10) / 10;
        const variationScore = Math.round(Math.min(stdDev * 8, 95));

        // Simulated perplexity (based on word frequency patterns)
        const wordFreq = {};
        cleanWords.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
        const frequencies = Object.values(wordFreq).sort((a, b) => b - a);
        const topFreqRatio = frequencies.slice(0, 10).reduce((a, b) => a + b, 0) / cleanWords.length;
        const perplexityValue = Math.round((1 - topFreqRatio) * 100);

        // Diversity score (combination)
        const diversityScore = Math.round((vocabularyScore + variationScore) / 2);

        // Generate warnings
        if (variationScore < 35) {
            warnings.push('Low sentence length variation (typical of AI-generated text)');
        }

        if (vocabularyScore < 35) {
            warnings.push('Limited vocabulary diversity');
        }

        if (burstinessValue < 3) {
            warnings.push('Unusually consistent writing rhythm');
        }

        return {
            perplexity: perplexityValue > 60 ? 'High' : perplexityValue > 30 ? 'Medium' : 'Low',
            burstiness: burstinessValue > 6 ? 'High' : burstinessValue > 3 ? 'Medium' : 'Low',
            diversityScore,
            variationScore,
            vocabularyScore,
            warnings
        };
    },

    /**
     * Pattern analysis
     */
    async analyzePatterns(text) {
        const lowerText = text.toLowerCase();
        const warnings = [];
        let naturalScore = 70;
        let credibilityScore = 70;

        // Check for typical AI patterns
        const aiPatterns = [
            { pattern: /as an ai/gi, weight: -30, msg: 'Contains AI self-reference' },
            { pattern: /i cannot|i can't (provide|generate|create)/gi, weight: -20, msg: 'Contains AI refusal patterns' },
            { pattern: /\bdelve\b/gi, weight: -5, msg: 'Uses common AI vocabulary ("delve")' },
            { pattern: /\blandscape\b.*\b(ever-changing|evolving|dynamic)\b/gi, weight: -5, msg: null },
            { pattern: /in (today's|the modern|the current) (world|era|age|landscape)/gi, weight: -8, msg: 'Uses generic temporal phrases' },
            { pattern: /it'?s (important|crucial|essential|vital) to (note|understand|recognize|remember)/gi, weight: -8, msg: null }
        ];

        aiPatterns.forEach(({ pattern, weight, msg }) => {
            if (pattern.test(text)) {
                naturalScore += weight;
                if (msg) warnings.push(msg);
            }
        });

        // Check for misinformation signals
        const misinfoPatterns = [
            { pattern: /share (this|before|with everyone)/gi, weight: -15, msg: 'Contains viral sharing prompts' },
            { pattern: /(they|the government|media) (don'?t|doesn'?t|won'?t) (want|let) you (know|see)/gi, weight: -20, msg: 'Contains conspiracy language' },
            { pattern: /100%|guaranteed|proven|scientifically proven/gi, weight: -10, msg: 'Makes absolute claims without sourcing' },
            { pattern: /wake up|sheeple|open your eyes/gi, weight: -15, msg: 'Uses manipulation language' },
            { pattern: /mainstream media|msm|big pharma|big tech/gi, weight: -10, msg: 'Uses anti-establishment rhetoric' }
        ];

        misinfoPatterns.forEach(({ pattern, weight, msg }) => {
            if (pattern.test(text)) {
                credibilityScore += weight;
                if (msg) warnings.push(msg);
            }
        });

        // Check for proper sourcing
        const hasLinks = /(https?:\/\/|www\.)/gi.test(text);
        const hasSourceMention = /(according to|study (published|found|shows)|researchers? (at|from)|journal of|university of)/gi.test(text);
        const hasQuotes = /[""].*?[""]|".*?"/g.test(text);

        if (hasSourceMention || hasLinks) credibilityScore += 10;
        if (hasQuotes) credibilityScore += 5;

        if (!hasSourceMention && !hasLinks && text.length > 500) {
            credibilityScore -= 5;
            warnings.push('No sources or references cited for claims made');
        }

        // Normalize scores
        naturalScore = Math.max(5, Math.min(95, naturalScore));
        credibilityScore = Math.max(5, Math.min(95, credibilityScore));

        return { naturalScore, credibilityScore, warnings };
    }
};
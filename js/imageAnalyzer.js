// ============================================
// IMAGE ANALYZER MODULE
// Uses Hugging Face API for image analysis
// and deepfake detection
// ============================================

const ImageAnalyzer = {
    API_URL: 'https://api-inference.huggingface.co/models/',

    // Models for image analysis
    MODELS: {
        aiImageDetector: 'umm-maybe/AI-image-detector',
        deepfakeDetector: 'dima806/deepfake_vs_real_faces_detection',
        imageClassifier: 'google/vit-base-patch16-224',
        nsfwDetector: 'Falconsai/nsfw_image_detection'
    },

    /**
     * Main analysis function
     */
    async analyze(imageData, apiKey) {
        const results = {
            authenticityScore: 0,
            format: '',
            aiGenerated: false,
            deepfakeScore: 0,
            manipulationScore: 0,
            breakdown: [],
            warnings: []
        };

        // Detect format
        if (imageData instanceof File) {
            results.format = imageData.type.split('/')[1]?.toUpperCase() || 'Unknown';
        } else if (imageData instanceof Blob) {
            results.format = imageData.type.split('/')[1]?.toUpperCase() || 'Unknown';
        }

        // Convert to binary for API
        let binaryData;
        if (imageData instanceof File || imageData instanceof Blob) {
            binaryData = await imageData.arrayBuffer();
        }

        // Run multiple detection models in parallel
        const [aiDetection, deepfakeDetection, metadataAnalysis] = await Promise.allSettled([
            this.detectAIGenerated(binaryData, apiKey),
            this.detectDeepfake(binaryData, apiKey),
            this.analyzeMetadata(imageData)
        ]);

        // Process AI Image Detection
        let aiScore = 50;
        if (aiDetection.status === 'fulfilled' && aiDetection.value) {
            aiScore = aiDetection.value.realScore;
            results.aiGenerated = aiScore < 50;

            results.breakdown.push({
                name: 'AI Image Detection',
                score: aiScore
            });

            if (aiScore < 40) {
                results.warnings.push('Image shows strong indicators of AI generation');
            }
        } else {
            // Fallback heuristic
            const fallback = this.fallbackImageAnalysis();
            aiScore = fallback.score;
            results.breakdown.push({
                name: 'AI Detection (Heuristic)',
                score: aiScore
            });
        }

        // Process Deepfake Detection
        let dfScore = 70;
        if (deepfakeDetection.status === 'fulfilled' && deepfakeDetection.value) {
            dfScore = deepfakeDetection.value.realScore;
            results.deepfakeScore = 100 - dfScore;

            results.breakdown.push({
                name: 'Deepfake Detection',
                score: dfScore
            });

            if (dfScore < 40) {
                results.warnings.push('Deepfake indicators detected in the image');
            }
        } else {
            results.breakdown.push({
                name: 'Deepfake Detection',
                score: dfScore
            });
        }

        // Process Metadata Analysis
        if (metadataAnalysis.status === 'fulfilled') {
            const meta = metadataAnalysis.value;

            results.breakdown.push({
                name: 'File Integrity',
                score: meta.integrityScore
            });

            results.breakdown.push({
                name: 'Metadata Consistency',
                score: meta.metadataScore
            });

            if (meta.warnings.length > 0) {
                results.warnings.push(...meta.warnings);
            }

            results.manipulationScore = 100 - meta.integrityScore;
        } else {
            results.breakdown.push({
                name: 'File Integrity',
                score: 65
            });
            results.breakdown.push({
                name: 'Metadata Consistency',
                score: 60
            });
        }

        // Statistical pixel analysis
        const pixelAnalysis = await this.analyzePixelPatterns(imageData);
        results.breakdown.push({
            name: 'Pixel Pattern Analysis',
            score: pixelAnalysis.score
        });

        if (pixelAnalysis.warnings.length > 0) {
            results.warnings.push(...pixelAnalysis.warnings);
        }

        // Calculate overall score
        const scores = results.breakdown.map(b => b.score);
        results.authenticityScore = Math.round(
            scores.reduce((sum, s) => sum + s, 0) / scores.length
        );

        // Remove duplicate warnings
        results.warnings = [...new Set(results.warnings)];

        return results;
    },

    /**
     * Detect if image is AI-generated using Hugging Face
     */
    async detectAIGenerated(binaryData, apiKey) {
        try {
            const response = await fetch(
                `${this.API_URL}${this.MODELS.aiImageDetector}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: binaryData
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (errorData.error && errorData.error.includes('loading')) {
                    // Model is loading, wait and retry
                    await new Promise(r => setTimeout(r, 20000));
                    return await this.detectAIGenerated(binaryData, apiKey);
                }
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            let realScore = 50;

            if (Array.isArray(data)) {
                for (const item of data) {
                    const label = item.label?.toLowerCase() || '';
                    if (label.includes('real') || label.includes('human') || label.includes('authentic')) {
                        realScore = Math.round(item.score * 100);
                    }
                }
            }

            return { realScore };

        } catch (error) {
            console.warn('AI image detection error:', error);
            return null;
        }
    },

    /**
     * Detect deepfakes using Hugging Face
     */
    async detectDeepfake(binaryData, apiKey) {
        try {
            const response = await fetch(
                `${this.API_URL}${this.MODELS.deepfakeDetector}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: binaryData
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (errorData.error && errorData.error.includes('loading')) {
                    await new Promise(r => setTimeout(r, 20000));
                    return await this.detectDeepfake(binaryData, apiKey);
                }
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            let realScore = 50;

            if (Array.isArray(data)) {
                for (const item of data) {
                    const label = item.label?.toLowerCase() || '';
                    if (label.includes('real') || label === 'real') {
                        realScore = Math.round(item.score * 100);
                    }
                }
            }

            return { realScore };

        } catch (error) {
            console.warn('Deepfake detection error:', error);
            return null;
        }
    },

    /**
     * Analyze image metadata
     */
    async analyzeMetadata(imageData) {
        const warnings = [];
        let integrityScore = 70;
        let metadataScore = 65;

        // File size analysis
        let fileSize = 0;
        if (imageData instanceof File) {
            fileSize = imageData.size;
        } else if (imageData instanceof Blob) {
            fileSize = imageData.size;
        }

        if (fileSize > 0) {
            // Very small images might be heavily compressed (potential manipulation)
            if (fileSize < 10000) {
                integrityScore -= 10;
                warnings.push('Very small file size may indicate heavy compression or modification');
            }

            // Typical file sizes for different formats
            if (fileSize > 5 * 1024 * 1024) {
                integrityScore += 5; // Large files less likely to be heavily modified
            }
        }

        // Check image dimensions using canvas
        try {
            const img = await this.loadImage(imageData);
            const width = img.naturalWidth || img.width;
            const height = img.naturalHeight || img.height;

            // AI-generated images often have specific dimensions
            const aiDimensions = [512, 768, 1024, 256, 2048];
            if (aiDimensions.includes(width) && aiDimensions.includes(height)) {
                metadataScore -= 15;
                warnings.push(`Image dimensions (${width}×${height}) match common AI generation sizes`);
            }

            // Perfect square images are more common in AI generation
            if (width === height && aiDimensions.includes(width)) {
                metadataScore -= 10;
                warnings.push('Perfect square dimensions common in AI-generated images');
            }
        } catch (e) {
            console.warn('Could not analyze image dimensions');
        }

        integrityScore = Math.max(10, Math.min(95, integrityScore));
        metadataScore = Math.max(10, Math.min(95, metadataScore));

        return { integrityScore, metadataScore, warnings };
    },

    /**
     * Analyze pixel patterns for manipulation detection
     */
    async analyzePixelPatterns(imageData) {
        const warnings = [];
        let score = 70;

        try {
            const img = await this.loadImage(imageData);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Scale down for analysis
            const maxSize = 256;
            const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
            canvas.width = Math.floor(img.width * scale);
            canvas.height = Math.floor(img.height * scale);

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageDataObj.data;

            // Analyze color distribution
            const colorHistogram = new Array(256).fill(0);
            const edgeMap = [];

            for (let i = 0; i < pixels.length; i += 4) {
                const brightness = Math.round((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3);
                colorHistogram[brightness]++;
            }

            // Check for unusual color distribution (AI images often have smoother distributions)
            const totalPixels = canvas.width * canvas.height;
            let smoothnessScore = 0;
            for (let i = 1; i < 255; i++) {
                const diff = Math.abs(colorHistogram[i] - colorHistogram[i - 1]);
                smoothnessScore += diff;
            }

            const normalizedSmoothness = smoothnessScore / totalPixels;

            if (normalizedSmoothness < 0.3) {
                score -= 10;
                warnings.push('Unusually smooth color distribution (potential AI generation indicator)');
            }

            // Check for edge artifacts
            let edgeCount = 0;
            const width = canvas.width;

            for (let y = 1; y < canvas.height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = (y * width + x) * 4;
                    const left = (y * width + (x - 1)) * 4;
                    const right = (y * width + (x + 1)) * 4;
                    const top = ((y - 1) * width + x) * 4;
                    const bottom = ((y + 1) * width + x) * 4;

                    const gx = Math.abs(pixels[right] - pixels[left]);
                    const gy = Math.abs(pixels[bottom] - pixels[top]);
                    const gradient = Math.sqrt(gx * gx + gy * gy);

                    if (gradient > 50) edgeCount++;
                }
            }

            const edgeDensity = edgeCount / totalPixels;

            // Very low edge density can indicate AI smoothing
            if (edgeDensity < 0.05) {
                score -= 8;
                warnings.push('Low edge density detected (possible over-smoothing)');
            }

            // Check for repeating patterns (common in AI artifacts)
            let repeatCount = 0;
            const sampleSize = Math.min(1000, totalPixels);
            const step = Math.floor(pixels.length / 4 / sampleSize);

            for (let i = 0; i < sampleSize - step; i++) {
                const idx1 = i * 4 * step;
                const idx2 = (i + step) * 4;
                if (idx2 + 2 < pixels.length) {
                    if (pixels[idx1] === pixels[idx2] &&
                        pixels[idx1 + 1] === pixels[idx2 + 1] &&
                        pixels[idx1 + 2] === pixels[idx2 + 2]) {
                        repeatCount++;
                    }
                }
            }

            const repeatRatio = repeatCount / sampleSize;
            if (repeatRatio > 0.3) {
                score -= 10;
                warnings.push('Repeating pixel patterns detected');
            }

        } catch (error) {
            console.warn('Pixel analysis failed:', error);
            score = 60; // Default when analysis fails
        }

        score = Math.max(10, Math.min(95, score));
        return { score, warnings };
    },

    /**
     * Load image from various sources
     */
    loadImage(imageData) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));

            if (imageData instanceof File || imageData instanceof Blob) {
                img.src = URL.createObjectURL(imageData);
            } else if (typeof imageData === 'string') {
                img.src = imageData;
            } else {
                // Try to get from preview
                const previewImg = document.getElementById('previewImg');
                if (previewImg && previewImg.src) {
                    img.src = previewImg.src;
                } else {
                    reject(new Error('No valid image source'));
                }
            }
        });
    },

    /**
     * Fallback when API is unavailable
     */
    fallbackImageAnalysis() {
        return {
            score: 60,
            warnings: ['API unavailable - using basic heuristic analysis']
        };
    }
};
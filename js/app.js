// ============================================
// APP.JS - Main Application Logic
// ============================================

// Global State
const AppState = {
    apiKey: '',
    currentTab: 'text',
    isAnalyzing: false,
    theme: 'light'
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    initTabs();
    initParticles();
    initAnimations();
    initUploadZone();
    initTextInput();
    loadSavedApiKey();
    initScrollAnimations();
});

// ============================================
// THEME
// ============================================
function initTheme() {
    const saved = localStorage.getItem('truthlens-theme');
    if (saved) {
        AppState.theme = saved;
        document.documentElement.setAttribute('data-theme', saved);
        updateThemeIcon();
    }

    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
}

function toggleTheme() {
    AppState.theme = AppState.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', AppState.theme);
    localStorage.setItem('truthlens-theme', AppState.theme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = document.querySelector('#themeToggle i');
    icon.className = AppState.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// ============================================
// NAVIGATION
// ============================================
function initNavigation() {
    // Scroll effects
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        navbar.classList.toggle('scrolled', window.scrollY > 20);

        // Update active nav link
        const sections = document.querySelectorAll('section[id]');
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            if (window.scrollY >= sectionTop) {
                current = section.getAttribute('id');
            }
        });

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });

    // Mobile toggle
    document.getElementById('mobileToggle').addEventListener('click', () => {
        document.querySelector('.nav-links').classList.toggle('mobile-open');
    });
}

function scrollToVerify() {
    document.getElementById('verify').scrollIntoView({ behavior: 'smooth' });
}

function scrollToHowItWorks() {
    document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' });
}

// ============================================
// TABS
// ============================================
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tab) {
    AppState.currentTab = tab;

    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Update panels
    document.querySelectorAll('.verify-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    document.getElementById(`${tab}Panel`).classList.add('active');
}

// ============================================
// PARTICLES
// ============================================
function initParticles() {
    const container = document.getElementById('particles');
    const count = 30;

    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (Math.random() * 20 + 15) + 's';
        particle.style.animationDelay = (Math.random() * 20) + 's';
        particle.style.width = (Math.random() * 4 + 2) + 'px';
        particle.style.height = particle.style.width;
        container.appendChild(particle);
    }
}

// ============================================
// ANIMATIONS
// ============================================
function initAnimations() {
    // Typing animation
    const words = ['Fake News.', 'Deepfakes.', 'AI Content.', 'Misinfo.'];
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    const typingEl = document.getElementById('typingText');

    function type() {
        const currentWord = words[wordIndex];

        if (isDeleting) {
            typingEl.textContent = currentWord.substring(0, charIndex - 1);
            charIndex--;
        } else {
            typingEl.textContent = currentWord.substring(0, charIndex + 1);
            charIndex++;
        }

        let speed = isDeleting ? 50 : 100;

        if (!isDeleting && charIndex === currentWord.length) {
            speed = 2000;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            speed = 500;
        }

        setTimeout(type, speed);
    }

    type();

    // Counter animation
    const counters = document.querySelectorAll('.stat-number');
    const observerCallback = (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.dataset.target);
                animateCounter(entry.target, target);
            }
        });
    };

    const observer = new IntersectionObserver(observerCallback, { threshold: 0.5 });
    counters.forEach(counter => observer.observe(counter));
}

function animateCounter(el, target) {
    let current = 0;
    const duration = 2000;
    const step = target / (duration / 16);

    function update() {
        current += step;
        if (current >= target) {
            el.textContent = target;
            return;
        }
        el.textContent = Math.floor(current);
        requestAnimationFrame(update);
    }

    update();
}

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.step-card, .tech-card, .feature-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
}

// ============================================
// TEXT INPUT
// ============================================
function initTextInput() {
    const textarea = document.getElementById('textInput');
    const charCount = document.getElementById('charCount');

    textarea.addEventListener('input', () => {
        charCount.textContent = textarea.value.length;
    });
}

function clearText() {
    document.getElementById('textInput').value = '';
    document.getElementById('charCount').textContent = '0';
    document.getElementById('textResults').innerHTML = `
        <div class="results-placeholder">
            <div class="placeholder-icon"><i class="fas fa-microscope"></i></div>
            <h3>Ready to Analyze</h3>
            <p>Enter text or a URL and click "Analyze" to check content authenticity</p>
        </div>
    `;
}

async function pasteText() {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('textInput').value = text;
        document.getElementById('charCount').textContent = text.length;
        showToast('Text pasted from clipboard', 'success');
    } catch (err) {
        showToast('Unable to access clipboard. Please paste manually.', 'warning');
    }
}

function loadSampleText() {
    const samples = [
        `BREAKING: Scientists at MIT have discovered a new element that could revolutionize energy production. The element, temporarily named "Solarium," was found in trace amounts in meteorite samples collected from the Sahara Desert. Researchers claim it could produce 1000x more energy than uranium with zero radioactive waste. The discovery has been verified by three independent laboratories and is expected to completely transform the global energy landscape within the next five years. Major oil companies have already begun investing billions in Solarium extraction technology.`,
        `A new study published in the Journal of Artificial Intelligence Research examined the impact of large language models on academic writing. The researchers analyzed over 50,000 academic papers submitted between 2020 and 2024, finding that approximately 15% of recent submissions show strong indicators of AI-generated content. The study employed multiple detection methodologies, including perplexity analysis, burstiness measurement, and stylometric evaluation. The findings suggest that academic institutions need to develop comprehensive policies regarding the use of AI tools in scholarly work.`,
        `URGENT: The government has been secretly implanting microchips through the new flu vaccine program. A whistleblower from the Department of Health has leaked classified documents proving that every vaccine administered since January contains nano-tracking devices. These chips can monitor your location, read your thoughts, and even control your behavior remotely. Share this information with everyone you know before it's too late. The mainstream media is covering this up because they are controlled by the same people behind the vaccine program.`
    ];

    const randomSample = samples[Math.floor(Math.random() * samples.length)];
    document.getElementById('textInput').value = randomSample;
    document.getElementById('charCount').textContent = randomSample.length;
    showToast('Sample text loaded', 'info');
}

async function fetchFromURL() {
    const url = document.getElementById('urlInput').value.trim();
    if (!url) {
        showToast('Please enter a valid URL', 'warning');
        return;
    }

    showToast('URL fetching requires a backend proxy. Please paste the article text directly.', 'info');
}

// ============================================
// IMAGE UPLOAD
// ============================================
function initUploadZone() {
    const zone = document.getElementById('uploadZone');
    const input = document.getElementById('imageInput');

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
        } else {
            showToast('Please upload a valid image file', 'error');
        }
    });

    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleImageFile(file);
    });
}

function handleImageFile(file) {
    if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be less than 10MB', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('previewImg').src = e.target.result;
        document.getElementById('uploadContent').style.display = 'none';
        document.getElementById('imagePreview').style.display = 'flex';
    };
    reader.readAsDataURL(file);
    showToast('Image loaded successfully', 'success');
}

function removeImage(e) {
    if (e) e.stopPropagation();
    document.getElementById('imageInput').value = '';
    document.getElementById('previewImg').src = '';
    document.getElementById('uploadContent').style.display = 'block';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('imageResults').innerHTML = `
        <div class="results-placeholder">
            <div class="placeholder-icon"><i class="fas fa-camera-retro"></i></div>
            <h3>Ready to Analyze</h3>
            <p>Upload an image or enter a URL to check for deepfakes and AI manipulation</p>
        </div>
    `;
}

function loadSampleImage() {
    const sampleUrl = 'https://picsum.photos/800/600?random=' + Date.now();
    document.getElementById('previewImg').src = sampleUrl;
    document.getElementById('uploadContent').style.display = 'none';
    document.getElementById('imagePreview').style.display = 'flex';
    showToast('Sample image loaded', 'info');
}

async function fetchImageFromURL() {
    const url = document.getElementById('imageUrlInput').value.trim();
    if (!url) {
        showToast('Please enter a valid image URL', 'warning');
        return;
    }

    try {
        document.getElementById('previewImg').src = url;
        document.getElementById('uploadContent').style.display = 'none';
        document.getElementById('imagePreview').style.display = 'flex';
        showToast('Image loaded from URL', 'success');
    } catch (err) {
        showToast('Failed to load image from URL', 'error');
    }
}

// ============================================
// API KEY MANAGEMENT
// ============================================
function loadSavedApiKey() {
    const saved = localStorage.getItem('truthlens-api-key');
    if (saved) {
        AppState.apiKey = atob(saved);
    }
}

function checkApiKey() {
    if (!AppState.apiKey) {
        document.getElementById('apiKeyModal').classList.add('active');
        return false;
    }
    return true;
}

function closeApiModal() {
    document.getElementById('apiKeyModal').classList.remove('active');
}

function saveApiKey() {
    const key = document.getElementById('apiKeyInput').value.trim();
    if (!key) {
        showToast('Please enter an API key', 'warning');
        return;
    }

    AppState.apiKey = key;

    if (document.getElementById('saveApiKey').checked) {
        localStorage.setItem('truthlens-api-key', btoa(key));
    }

    closeApiModal();
    showToast('API key saved successfully', 'success');
}

function toggleApiKeyVisibility() {
    const input = document.getElementById('apiKeyInput');
    const icon = document.getElementById('apiKeyEyeIcon');

    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// ============================================
// LOADING OVERLAY
// ============================================
function showLoading(title, subtitle) {
    const overlay = document.getElementById('loadingOverlay');
    document.getElementById('loadingTitle').textContent = title || 'Analyzing Content...';
    document.getElementById('loadingSubtitle').textContent = subtitle || 'Running AI models';
    document.getElementById('progressBar').style.width = '0%';

    // Reset steps
    document.querySelectorAll('.loading-step').forEach(step => {
        step.classList.remove('active', 'completed');
    });
    document.getElementById('step1').classList.add('active');

    overlay.classList.add('active');

    // Animate progress
    animateProgress();
}

function animateProgress() {
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        document.getElementById('progressBar').style.width = progress + '%';

        if (progress > 30) {
            document.getElementById('step1').classList.remove('active');
            document.getElementById('step1').classList.add('completed');
            document.getElementById('step1').querySelector('i').className = 'fas fa-check-circle';
            document.getElementById('step2').classList.add('active');
        }

        if (progress > 70) {
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step2').classList.add('completed');
            document.getElementById('step2').querySelector('i').className = 'fas fa-check-circle';
            document.getElementById('step3').classList.add('active');
        }

        if (progress >= 90) clearInterval(interval);
    }, 500);

    window._progressInterval = interval;
}

function hideLoading() {
    if (window._progressInterval) clearInterval(window._progressInterval);

    document.getElementById('progressBar').style.width = '100%';
    document.getElementById('step3').classList.remove('active');
    document.getElementById('step3').classList.add('completed');
    document.getElementById('step3').querySelector('i').className = 'fas fa-check-circle';

    setTimeout(() => {
        document.getElementById('loadingOverlay').classList.remove('active');
    }, 500);
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type]} toast-icon"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.classList.add('toast-out'); setTimeout(() => this.parentElement.remove(), 300);">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================
// ANALYZE TEXT (calls textAnalyzer.js)
// ============================================
async function analyzeText() {
    const text = document.getElementById('textInput').value.trim();

    if (!text) {
        showToast('Please enter some text to analyze', 'warning');
        return;
    }

    if (text.length < 50) {
        showToast('Please enter at least 50 characters for accurate analysis', 'warning');
        return;
    }

    if (!checkApiKey()) return;

    showLoading('Analyzing Text...', 'Checking for AI-generated content');

    try {
        const results = await TextAnalyzer.analyze(text, AppState.apiKey);
        hideLoading();
        renderTextResults(results);
    } catch (error) {
        hideLoading();
        showToast('Analysis failed: ' + error.message, 'error');
        console.error(error);
    }
}

// ============================================
// ANALYZE IMAGE (calls imageAnalyzer.js)
// ============================================
async function analyzeImage() {
    const imgSrc = document.getElementById('previewImg').src;
    const fileInput = document.getElementById('imageInput');

    if (!imgSrc || imgSrc === window.location.href) {
        showToast('Please upload an image to analyze', 'warning');
        return;
    }

    if (!checkApiKey()) return;

    showLoading('Analyzing Image...', 'Scanning for deepfakes and manipulation');

    try {
        let imageData;

        if (fileInput.files && fileInput.files[0]) {
            imageData = fileInput.files[0];
        } else {
            // Convert image URL to blob
            const response = await fetch(imgSrc);
            imageData = await response.blob();
        }

        const results = await ImageAnalyzer.analyze(imageData, AppState.apiKey);
        hideLoading();
        renderImageResults(results);
    } catch (error) {
        hideLoading();
        showToast('Analysis failed: ' + error.message, 'error');
        console.error(error);
    }
}

// ============================================
// RENDER TEXT RESULTS
// ============================================
function renderTextResults(results) {
    const container = document.getElementById('textResults');

    const verdict = results.overallScore > 70 ? 'authentic' :
                    results.overallScore > 40 ? 'suspicious' : 'fake';

    const verdictLabels = {
        authentic: { label: 'Likely Authentic', icon: 'fa-check-circle', desc: 'This content appears to be human-written' },
        suspicious: { label: 'Suspicious', icon: 'fa-exclamation-triangle', desc: 'This content shows mixed signals' },
        fake: { label: 'Likely AI-Generated', icon: 'fa-robot', desc: 'This content shows strong AI writing patterns' }
    };

    const v = verdictLabels[verdict];

    container.innerHTML = `
        <div class="result-card">
            <div class="result-header">
                <div class="result-icon ${verdict}">
                    <i class="fas ${v.icon}"></i>
                </div>
                <div>
                    <div class="result-title">${v.label}</div>
                    <div class="result-subtitle">${v.desc}</div>
                </div>
            </div>

            <div class="confidence-meter">
                <div class="meter-header">
                    <span class="meter-label">Authenticity Score</span>
                    <span class="meter-value" style="color: var(--${verdict === 'authentic' ? 'success' : verdict === 'suspicious' ? 'warning' : 'danger'})">${results.overallScore}%</span>
                </div>
                <div class="meter-bar">
                    <div class="meter-fill ${verdict}" id="textMeterFill"></div>
                </div>
            </div>

            <div class="detail-grid">
                <div class="detail-item">
                    <i class="fas fa-font"></i>
                    <div>
                        <span class="detail-label">Word Count</span>
                        <span class="detail-value">${results.wordCount}</span>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-paragraph"></i>
                    <div>
                        <span class="detail-label">Sentences</span>
                        <span class="detail-value">${results.sentenceCount}</span>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-chart-line"></i>
                    <div>
                        <span class="detail-label">Perplexity</span>
                        <span class="detail-value">${results.perplexity}</span>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-random"></i>
                    <div>
                        <span class="detail-label">Burstiness</span>
                        <span class="detail-value">${results.burstiness}</span>
                    </div>
                </div>
            </div>

            <div class="analysis-breakdown">
                <div class="breakdown-title">
                    <i class="fas fa-chart-bar"></i> Analysis Breakdown
                </div>
                ${results.breakdown.map(item => `
                    <div class="breakdown-item">
                        <span class="breakdown-name">${item.name}</span>
                        <div class="breakdown-bar">
                            <div class="breakdown-bar-fill" style="width: ${item.score}%; background: ${getScoreColor(item.score)}"></div>
                        </div>
                        <span class="breakdown-score" style="color: ${getScoreColor(item.score)}">${item.score}%</span>
                    </div>
                `).join('')}
            </div>

            ${results.warnings.length > 0 ? `
                <div class="info-box ${verdict === 'fake' ? 'danger' : 'warning'}">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>
                        <strong>Findings:</strong>
                        <ul style="margin-top: 8px; padding-left: 16px;">
                            ${results.warnings.map(w => `<li>${w}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            ` : `
                <div class="info-box success">
                    <i class="fas fa-check-circle"></i>
                    <div>No significant red flags detected. The content appears to have natural human writing characteristics.</div>
                </div>
            `}

            <div class="info-box info">
                <i class="fas fa-info-circle"></i>
                <div><strong>Disclaimer:</strong> This analysis is based on AI models and heuristics. Results should be used as guidance, not definitive proof. Always verify important information through multiple trusted sources.</div>
            </div>

            <div class="result-actions">
                <button class="btn btn-ghost" onclick="copyResults('text')">
                    <i class="fas fa-copy"></i> Copy Report
                </button>
                <button class="btn btn-ghost" onclick="analyzeText()">
                    <i class="fas fa-redo"></i> Re-analyze
                </button>
            </div>
        </div>
    `;

    // Animate meter fill
    setTimeout(() => {
        const fill = document.getElementById('textMeterFill');
        if (fill) fill.style.width = results.overallScore + '%';
    }, 100);
}

// ============================================
// RENDER IMAGE RESULTS
// ============================================
function renderImageResults(results) {
    const container = document.getElementById('imageResults');

    const verdict = results.authenticityScore > 70 ? 'authentic' :
                    results.authenticityScore > 40 ? 'suspicious' : 'fake';

    const verdictLabels = {
        authentic: { label: 'Likely Authentic', icon: 'fa-check-circle', desc: 'No significant manipulation detected' },
        suspicious: { label: 'Potentially Manipulated', icon: 'fa-exclamation-triangle', desc: 'Some anomalies detected in the image' },
        fake: { label: 'Likely Manipulated/AI-Generated', icon: 'fa-robot', desc: 'Strong indicators of artificial generation or manipulation' }
    };

    const v = verdictLabels[verdict];

    container.innerHTML = `
        <div class="result-card">
            <div class="result-header">
                <div class="result-icon ${verdict}">
                    <i class="fas ${v.icon}"></i>
                </div>
                <div>
                    <div class="result-title">${v.label}</div>
                    <div class="result-subtitle">${v.desc}</div>
                </div>
            </div>

            <div class="confidence-meter">
                <div class="meter-header">
                    <span class="meter-label">Authenticity Score</span>
                    <span class="meter-value" style="color: var(--${verdict === 'authentic' ? 'success' : verdict === 'suspicious' ? 'warning' : 'danger'})">${results.authenticityScore}%</span>
                </div>
                <div class="meter-bar">
                    <div class="meter-fill ${verdict}" id="imageMeterFill"></div>
                </div>
            </div>

            <div class="detail-grid">
                <div class="detail-item">
                    <i class="fas fa-image"></i>
                    <div>
                        <span class="detail-label">Format</span>
                        <span class="detail-value">${results.format || 'Unknown'}</span>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-expand"></i>
                    <div>
                        <span class="detail-label">AI Detection</span>
                        <span class="detail-value">${results.aiGenerated ? 'Detected' : 'Not Detected'}</span>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-user-secret"></i>
                    <div>
                        <span class="detail-label">Deepfake</span>
                        <span class="detail-value">${results.deepfakeScore > 50 ? 'Likely' : 'Unlikely'}</span>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-edit"></i>
                    <div>
                        <span class="detail-label">Manipulation</span>
                        <span class="detail-value">${results.manipulationScore > 50 ? 'Detected' : 'Not Detected'}</span>
                    </div>
                </div>
            </div>

            <div class="analysis-breakdown">
                <div class="breakdown-title">
                    <i class="fas fa-chart-bar"></i> Detection Breakdown
                </div>
                ${results.breakdown.map(item => `
                    <div class="breakdown-item">
                        <span class="breakdown-name">${item.name}</span>
                        <div class="breakdown-bar">
                            <div class="breakdown-bar-fill" style="width: ${item.score}%; background: ${getScoreColor(item.score)}"></div>
                        </div>
                        <span class="breakdown-score" style="color: ${getScoreColor(item.score)}">${item.score}%</span>
                    </div>
                `).join('')}
            </div>

            ${results.warnings.length > 0 ? `
                <div class="info-box ${verdict === 'fake' ? 'danger' : 'warning'}">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>
                        <strong>Findings:</strong>
                        <ul style="margin-top: 8px; padding-left: 16px;">
                            ${results.warnings.map(w => `<li>${w}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            ` : `
                <div class="info-box success">
                    <i class="fas fa-check-circle"></i>
                    <div>No significant manipulation indicators found. The image appears to be authentic.</div>
                </div>
            `}

            <div class="info-box info">
                <i class="fas fa-info-circle"></i>
                <div><strong>Disclaimer:</strong> Image analysis is probabilistic. Results indicate likelihood, not certainty. Sophisticated manipulations may evade detection.</div>
            </div>

            <div class="result-actions">
                <button class="btn btn-ghost" onclick="copyResults('image')">
                    <i class="fas fa-copy"></i> Copy Report
                </button>
                <button class="btn btn-ghost" onclick="analyzeImage()">
                    <i class="fas fa-redo"></i> Re-analyze
                </button>
            </div>
        </div>
    `;

    // Animate meter fill
    setTimeout(() => {
        const fill = document.getElementById('imageMeterFill');
        if (fill) fill.style.width = results.authenticityScore + '%';
    }, 100);
}

// ============================================
// UTILITIES
// ============================================
function getScoreColor(score) {
    if (score > 70) return 'var(--success)';
    if (score > 40) return 'var(--warning)';
    return 'var(--danger)';
}

function copyResults(type) {
    const container = type === 'text' ? document.getElementById('textResults') : document.getElementById('imageResults');
    const text = container.innerText;

    navigator.clipboard.writeText(text).then(() => {
        showToast('Report copied to clipboard', 'success');
    }).catch(() => {
        showToast('Failed to copy report', 'error');
    });
}
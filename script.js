// ==================== TEMPLATES ====================
const templates = {
    developer: `• Built a full-stack e-commerce platform using React, Node.js, and PostgreSQL that handles 10k+ daily users
• Led a team of 5 developers on a microservices migration project at Tech Corp (2022-2023)
• Created an open-source npm package for data visualization with 50k+ downloads
• Skills: JavaScript, Python, React, Node.js, Docker, AWS, Git, SQL, MongoDB
• Implemented CI/CD pipelines reducing deployment time by 70%
• Mentored 3 junior developers through code reviews and pair programming sessions`,

    designer: `• Redesigned the mobile app for FashionCo resulting in 40% increase in user engagement
• Led UX research and conducted 50+ user interviews for product discovery
• Created design system used across 15+ products at DesignStudio (2021-2024)
• Tools: Figma, Adobe Creative Suite, Sketch, Principle, After Effects
• Collaborated with engineers to implement pixel-perfect responsive designs
• Presented design concepts to C-level executives and stakeholders
• Won "Best Mobile App Design" award at DesignCon 2023`,

    marketing: `• Grew Instagram following from 5k to 100k+ in 6 months for lifestyle brand
• Managed $500k annual marketing budget and achieved 3x ROI
• Led content strategy at MarketingCo reaching 2M+ monthly impressions
• Skills: SEO, Google Analytics, Facebook Ads, Content Strategy, Email Marketing, A/B Testing
• Launched successful influencer campaign generating $1M in revenue
• Created viral TikTok campaign with 10M+ views
• Increased email open rates by 45% through personalization and segmentation`
};

// ==================== STATE ====================
let currentCvMarkdown = '';
let currentCvHtml = '';
let isEditMode = false;

// ==================== DOM ELEMENTS ====================
const elements = {
    brainDump: document.getElementById('brainDump'),
    jobDesc: document.getElementById('jobDesc'),
    brainDumpCount: document.getElementById('brainDumpCount'),
    jobDescCount: document.getElementById('jobDescCount'),
    generateButton: document.getElementById('generateButton'),
    clearButton: document.getElementById('clearButton'),
    saveMdButton: document.getElementById('saveMdButton'),
    savePdfButton: document.getElementById('savePdfButton'),
    copyButton: document.getElementById('copyButton'),
    editButton: document.getElementById('editButton'),
    resumePreview: document.getElementById('resumePreview'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    toast: document.getElementById('toast'),
    editArea: document.getElementById('editArea'),
    editActions: document.getElementById('editActions'),
    saveEditButton: document.getElementById('saveEditButton'),
    cancelEditButton: document.getElementById('cancelEditButton'),
    ollamaStatus: document.getElementById('ollamaStatus')
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    updateStatus();
    setInterval(updateStatus, 10000);
    loadDraft();
});

function initializeEventListeners() {
    // Template buttons
    document.querySelectorAll('.hint-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const template = btn.dataset.template;
            if (templates[template]) {
                elements.brainDump.value = templates[template];
                updateCharCount(elements.brainDump, elements.brainDumpCount);
                saveDraft();
                showToast('Template loaded!', 'success');
            }
        });
    });

    // Character counting
    elements.brainDump.addEventListener('input', () => {
        updateCharCount(elements.brainDump, elements.brainDumpCount);
        saveDraft();
    });
    
    elements.jobDesc.addEventListener('input', () => {
        updateCharCount(elements.jobDesc, elements.jobDescCount);
        saveDraft();
    });

    // Main actions
    elements.generateButton.addEventListener('click', generateCV);
    elements.clearButton.addEventListener('click', clearAll);
    elements.saveMdButton.addEventListener('click', saveAsMarkdown);
    elements.savePdfButton.addEventListener('click', saveAsPDF);
    elements.copyButton.addEventListener('click', copyToClipboard);
    elements.editButton.addEventListener('click', enterEditMode);
    elements.saveEditButton.addEventListener('click', saveEdit);
    elements.cancelEditButton.addEventListener('click', cancelEdit);

    // Initialize char counts
    updateCharCount(elements.brainDump, elements.brainDumpCount);
    updateCharCount(elements.jobDesc, elements.jobDescCount);
}

// ==================== OLLAMA STATUS ====================
async function updateStatus() {
    try {
        const res = await fetch('http://localhost:11434/api/tags', {
            signal: AbortSignal.timeout(3000)
        });
        
        if (res.ok) {
            const data = await res.json();
            const hasGemma = data.models?.some(m => m.name.startsWith('gemma'));
            
            if (hasGemma) {
                elements.ollamaStatus.innerHTML = '<span class="status-dot"></span><span class="status-text">Connected</span>';
                elements.ollamaStatus.className = 'status-badge status-connected';
                elements.generateButton.disabled = false;
            } else {
                elements.ollamaStatus.innerHTML = '<span class="status-dot"></span><span class="status-text">Gemma model not found</span>';
                elements.ollamaStatus.className = 'status-badge status-disconnected';
                elements.generateButton.disabled = true;
            }
        }
    } catch (e) {
        elements.ollamaStatus.innerHTML = '<span class="status-dot"></span><span class="status-text">Ollama not running</span>';
        elements.ollamaStatus.className = 'status-badge status-disconnected';
        elements.generateButton.disabled = true;
    }
}

// ==================== GENERATE CV ====================
async function generateCV() {
    const brain = elements.brainDump.value.trim();
    const job = elements.jobDesc.value.trim();

    if (!brain) {
        showToast('Please enter your work experience first', 'error');
        return;
    }

    // Show loading
    elements.loadingOverlay.style.display = 'flex';
    toggleButtons(false);

    // Enhanced prompt for better CV generation
    const prompt = `You are an expert CV writer and career coach. Create a professional, ATS-optimized resume using ONLY the information provided below. 

CRITICAL INSTRUCTIONS:
- Return ONLY raw Markdown (no code fences, no backticks, no preamble)
- Use # for the candidate's name (if provided), ## for section headers, ### for job titles
- Use **bold** for emphasis, - for bullet points
- Keep it professional and concise
- Focus on achievements and quantifiable results
- Do NOT add placeholder information or ask for missing details
- Do NOT include sections for information that wasn't provided
- Tailor the content to match the job description if one is provided

WORK EXPERIENCE & SKILLS:
${brain}

${job ? `TARGET JOB DESCRIPTION (tailor the resume to match these requirements):
${job}` : 'No specific job target - create a general professional resume.'}

Generate a complete, polished CV now:`;

    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemma3',
                prompt: prompt,
                stream: false,
                temperature: 0.4,
                top_p: 0.9,
                num_predict: 2500
            })
        });

        const data = await response.json();

        if (response.ok && data.response) {
            processGeneratedCV(data.response);
            showToast('Resume generated successfully!', 'success');
        } else {
            throw new Error(data.error || 'Generation failed');
        }
    } catch (error) {
        console.error('Generation error:', error);
        showErrorState(error.message);
        showToast('Failed to generate resume. Check Ollama connection.', 'error');
    } finally {
        elements.loadingOverlay.style.display = 'none';
    }
}

function processGeneratedCV(rawResponse) {
    // Clean the response
    let cleaned = rawResponse.trim();
    
    // Remove code fences if present
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/gm, '').replace(/\s*```$/gm, '').trim();
    
    // Remove any leading/trailing markdown indicators
    cleaned = cleaned.replace(/^markdown\s*/i, '').trim();
    
    // Store clean markdown
    currentCvMarkdown = cleaned;
    
    // Convert to HTML
    if (typeof marked !== 'undefined') {
        currentCvHtml = marked.parse(currentCvMarkdown);
    } else {
        currentCvHtml = `<pre style="white-space:pre-wrap; font-family:Georgia,serif; padding:2rem;">${escapeHtml(currentCvMarkdown)}</pre>`;
    }
    
    // Display
    elements.resumePreview.innerHTML = `<div class="cv-content">${currentCvHtml}</div>`;
    toggleButtons(true);
    
    // Exit edit mode if active
    if (isEditMode) {
        cancelEdit();
    }
}

function showErrorState(message) {
    elements.resumePreview.innerHTML = `
        <div class="placeholder">
            <div class="placeholder-icon">
                <i class="fas fa-triangle-exclamation" style="color: #ef4444;"></i>
            </div>
            <h3 style="color: #334155;">Generation Failed</h3>
            <p style="color: #64748b;">${escapeHtml(message)}</p>
            <p style="color: #94a3b8; font-size: 0.875rem;">Make sure Ollama is running with the Gemma model</p>
        </div>
    `;
    toggleButtons(false);
}

// ==================== BUTTONS STATE ====================
function toggleButtons(enabled) {
    elements.saveMdButton.disabled = !enabled;
    elements.savePdfButton.disabled = !enabled;
    elements.copyButton.disabled = !enabled;
    elements.editButton.disabled = !enabled;
}

// ==================== CLEAR ALL ====================
function clearAll() {
    if (elements.brainDump.value || elements.jobDesc.value || currentCvMarkdown) {
        if (!confirm('Clear all content? This cannot be undone.')) {
            return;
        }
    }
    
    elements.brainDump.value = '';
    elements.jobDesc.value = '';
    currentCvMarkdown = '';
    currentCvHtml = '';
    
    elements.resumePreview.innerHTML = `
        <div class="placeholder">
            <div class="placeholder-icon">
                <i class="fas fa-file-contract"></i>
            </div>
            <h3>Your polished resume will appear here</h3>
            <p>Fill in your experience and click Generate to get started</p>
            <div class="placeholder-features">
                <div class="feature-item">
                    <i class="fas fa-check-circle"></i>
                    <span>Professional formatting</span>
                </div>
                <div class="feature-item">
                    <i class="fas fa-check-circle"></i>
                    <span>Optimized for ATS systems</span>
                </div>
                <div class="feature-item">
                    <i class="fas fa-check-circle"></i>
                    <span>Export to PDF or Markdown</span>
                </div>
            </div>
        </div>
    `;
    
    updateCharCount(elements.brainDump, elements.brainDumpCount);
    updateCharCount(elements.jobDesc, elements.jobDescCount);
    toggleButtons(false);
    
    localStorage.removeItem('vibecv_draft');
    showToast('Cleared all content', 'success');
}

// ==================== SAVE MARKDOWN ====================
function saveAsMarkdown() {
    if (!currentCvMarkdown) return;
    
    const blob = new Blob([currentCvMarkdown], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `resume_${getTimestamp()}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
    
    showToast('Markdown file downloaded!', 'success');
}

// ==================== SAVE PDF ====================
function saveAsPDF() {
    if (!currentCvHtml) return;
    
    showToast('Generating PDF... This may take a moment', 'success');
    
    const pdfHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Crimson Text', Georgia, serif;
            padding: 2.5rem 2rem;
            background: white;
            color: #1e293b;
            line-height: 1.7;
            font-size: 11pt;
        }
        .cv-content { max-width: 750px; margin: 0 auto; }
        .cv-content h1 { 
            font-size: 28pt; 
            margin-bottom: 0.5rem; 
            color: #0f172a; 
            font-weight: 700;
            letter-spacing: -0.02em;
            border-bottom: 3px solid #0f172a;
            padding-bottom: 0.4rem;
        }
        .cv-content h2 { 
            font-size: 16pt; 
            margin-top: 1.5rem; 
            margin-bottom: 0.75rem;
            color: #0f172a; 
            font-weight: 700;
            border-bottom: 2px solid #334155;
            padding-bottom: 0.3rem;
            letter-spacing: -0.01em;
        }
        .cv-content h3 { 
            font-size: 13pt; 
            margin: 1rem 0 0.5rem; 
            color: #334155; 
            font-weight: 600;
        }
        .cv-content p { 
            margin-bottom: 0.6rem; 
            color: #334155;
        }
        .cv-content ul { 
            margin: 0.6rem 0 1rem 1.5rem; 
            padding-left: 0;
        }
        .cv-content li { 
            margin-bottom: 0.4rem; 
            color: #475569;
        }
        .cv-content strong { 
            color: #0f172a; 
            font-weight: 600;
        }
        .cv-content em {
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="cv-content">${currentCvHtml}</div>
</body>
</html>`;

    html2pdf().set({
        margin: [0.75, 0.6],
        filename: `resume_${getTimestamp()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, letterRendering: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }).from(pdfHtml).save().then(() => {
        showToast('PDF downloaded successfully!', 'success');
    });
}

// ==================== COPY TO CLIPBOARD ====================
async function copyToClipboard() {
    if (!currentCvMarkdown) return;
    
    try {
        await navigator.clipboard.writeText(currentCvMarkdown);
        showToast('Copied to clipboard!', 'success');
        
        // Visual feedback
        const icon = elements.copyButton.querySelector('i');
        const originalClass = icon.className;
        icon.className = 'fas fa-check';
        setTimeout(() => {
            icon.className = originalClass;
        }, 2000);
    } catch (err) {
        console.error('Copy failed:', err);
        showToast('Failed to copy to clipboard', 'error');
    }
}

// ==================== EDIT MODE ====================
function enterEditMode() {
    if (!currentCvMarkdown) return;
    
    isEditMode = true;
    elements.editArea.value = currentCvMarkdown;
    elements.resumePreview.style.display = 'none';
    elements.editArea.style.display = 'block';
    elements.editActions.style.display = 'flex';
    
    // Disable other buttons
    elements.saveMdButton.disabled = true;
    elements.savePdfButton.disabled = true;
    elements.copyButton.disabled = true;
    elements.editButton.disabled = true;
    
    elements.editArea.focus();
    showToast('Edit mode activated', 'success');
}

function saveEdit() {
    const editedContent = elements.editArea.value.trim();
    
    if (!editedContent) {
        showToast('Cannot save empty content', 'error');
        return;
    }
    
    processGeneratedCV(editedContent);
    exitEditMode();
    showToast('Changes saved!', 'success');
}

function cancelEdit() {
    exitEditMode();
}

function exitEditMode() {
    isEditMode = false;
    elements.editArea.style.display = 'none';
    elements.editActions.style.display = 'none';
    elements.resumePreview.style.display = 'block';
    
    toggleButtons(!!currentCvMarkdown);
}

// ==================== UTILITIES ====================
function updateCharCount(textarea, countElement) {
    const count = textarea.value.length;
    countElement.textContent = `${count.toLocaleString()} character${count !== 1 ? 's' : ''}`;
}

function showToast(message, type = 'success') {
    elements.toast.className = `toast ${type}`;
    
    const icon = type === 'success' 
        ? '<i class="fas fa-circle-check"></i>' 
        : '<i class="fas fa-circle-exclamation"></i>';
    
    elements.toast.innerHTML = `${icon}<span>${message}</span>`;
    elements.toast.classList.add('show');
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function getTimestamp() {
    const now = new Date();
    return now.toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
}

// ==================== LOCAL STORAGE (DRAFT SAVING) ====================
function saveDraft() {
    const draft = {
        brainDump: elements.brainDump.value,
        jobDesc: elements.jobDesc.value,
        timestamp: Date.now()
    };
    
    try {
        localStorage.setItem('vibecv_draft', JSON.stringify(draft));
    } catch (e) {
        console.warn('Failed to save draft:', e);
    }
}

function loadDraft() {
    try {
        const draft = localStorage.getItem('vibecv_draft');
        if (draft) {
            const parsed = JSON.parse(draft);
            
            // Only load if less than 7 days old
            const age = Date.now() - parsed.timestamp;
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
            
            if (age < maxAge && (parsed.brainDump || parsed.jobDesc)) {
                elements.brainDump.value = parsed.brainDump || '';
                elements.jobDesc.value = parsed.jobDesc || '';
                updateCharCount(elements.brainDump, elements.brainDumpCount);
                updateCharCount(elements.jobDesc, elements.jobDescCount);
            }
        }
    } catch (e) {
        console.warn('Failed to load draft:', e);
    }
}
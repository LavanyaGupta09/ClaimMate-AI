/* ═══════════════════════════════════════════════════════════════
   ClaimMate AI SaaS — Main Application Logic
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    // ═══════════════════════════════════════════════════════════════
    // NAVIGATION, ROUTING & PERSONA TOGGLE
    // ═══════════════════════════════════════════════════════════════
    const navLinks = document.querySelectorAll('.nav-link');
    const viewSections = document.querySelectorAll('.view-section');
    const sidebar = document.getElementById('sidebar');

    let currentPersona = 'customer'; // 'customer' | 'agent'

    window.navigateTo = function(viewId) {
        navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewId);
        });
        viewSections.forEach(section => {
            const isActive = section.id === `view-${viewId}`;
            section.classList.toggle('active', isActive);
            if (isActive) {
                section.style.display = section.classList.contains('flex') ? 'flex' : 'block';
            } else {
                section.style.display = 'none';
            }
        });
        sidebar.classList.add('-translate-x-full');
        
        // Re-render charts
        if (viewId === 'home' && homeChart) homeChart.resize();
        if (viewId === 'simulator' && simChart) simChart.resize();

        window.scrollTo(0, 0);
    };

    // Attach listeners
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.view);
        });
    });

    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
        sidebar.classList.toggle('-translate-x-full');
    });

    // Persona & Login Handling
    const loginView = document.getElementById('login-view');
    const mainAppWrapper = document.getElementById('main-app-wrapper');

    window.handleLogin = function(persona) {
        currentPersona = persona;
        
        // Hide login, show main app
        if (loginView) loginView.classList.add('hidden');
        if (mainAppWrapper) {
            mainAppWrapper.classList.remove('hidden');
            mainAppWrapper.classList.add('flex');
        }
        
        if (persona === 'customer') {
            document.querySelectorAll('.customer-only').forEach(el => el.classList.remove('hidden'));
            document.querySelectorAll('.agent-only').forEach(el => el.classList.add('hidden'));
            navigateTo('home');
        } else {
            document.querySelectorAll('.agent-only').forEach(el => el.classList.remove('hidden'));
            document.querySelectorAll('.customer-only').forEach(el => el.classList.add('hidden'));
            navigateTo('agent-dash');
        }
    };

    window.handleLogout = function() {
        // Show login, hide main app
        if (loginView) loginView.classList.remove('hidden');
        if (mainAppWrapper) {
            mainAppWrapper.classList.add('hidden');
            mainAppWrapper.classList.remove('flex');
        }
    };


    // ═══════════════════════════════════════════════════════════════
    // EXPLAINABILITY PANEL (TRUST METER)
    // ═══════════════════════════════════════════════════════════════
    const explainPanel = document.getElementById('explain-panel');
    const explainOverlay = document.getElementById('explain-overlay');
    const explainContent = document.getElementById('explain-content');

    const explainData = {
        'readiness_score': {
            title: 'How is this calculated?',
            icon: 'bar-chart-2',
            html: `
                <p class="text-sm text-gray-300 mb-4">The Claim Readiness Score evaluates the probability of first-pass approval based on historical data.</p>
                <div class="space-y-3">
                    <div class="bg-darkcard p-3 rounded border border-darkborder">
                        <span class="text-xs text-green-400 font-bold block mb-1">+40% Base Coverage</span>
                        <p class="text-xs text-gray-400">Treatment matches Policy Section 4.2.</p>
                    </div>
                    <div class="bg-darkcard p-3 rounded border border-darkborder">
                        <span class="text-xs text-accent font-bold block mb-1">+25% Document Completeness</span>
                        <p class="text-xs text-gray-400">2 of 4 required documents uploaded.</p>
                    </div>
                </div>
            `
        },
        'sim_engine': {
            title: 'What-If Engine Model',
            icon: 'sliders',
            html: `
                <p class="text-sm text-gray-300 mb-4">This simulator runs your inputs through our ML model trained on 2 million resolved claims.</p>
                <ul class="text-xs text-gray-400 space-y-2 list-disc pl-4">
                    <li>Costs > $10,000 trigger strict manual review penalties.</li>
                    <li>Missing "Discharge Summary" historically causes a 90% rejection rate.</li>
                </ul>
            `
        },
        'quality_scanner': {
            title: 'AI Verification Process',
            icon: 'scan',
            html: `
                <p class="text-sm text-gray-300 mb-4">Documents are processed locally in your browser using edge OCR, then verified against strict heuristics.</p>
                <div class="text-xs text-gray-400 space-y-2">
                    <p>✓ Legibility check (DPI > 150)</p>
                    <p>✓ Boundary detection</p>
                    <p>✓ Policy holder name match</p>
                </div>
                <p class="text-[10px] text-gray-500 mt-4 italic">No PII is sent to external servers during this scan.</p>
            `
        },
        'agent_escalation': {
            title: 'AI Recommendation Trail',
            icon: 'bot',
            html: `
                <p class="text-sm text-gray-300 mb-4">The AI flagged this claim for human review because of a statistical anomaly.</p>
                <div class="bg-escalated/10 border border-escalated/20 p-3 rounded mb-4">
                    <p class="text-xs text-escalated">Confidence Score: 68% (Below Auto-Approve Threshold)</p>
                </div>
                <p class="text-xs text-gray-400">Reference: Average cost for Appendectomy in this zip code is $4,200. Billed amount is $12,500.</p>
            `
        },
        'ai_hybrid': {
            title: 'Hybrid AI Model',
            icon: 'shield',
            html: `
                <p class="text-sm text-gray-300 mb-4">ClaimMate AI uses a hybrid human-in-the-loop system.</p>
                <ul class="text-xs text-gray-400 space-y-2 list-disc pl-4">
                    <li>AI auto-approves low-risk claims (< $1,000, 100% doc match).</li>
                    <li>AI escalates anomalies to human agents.</li>
                    <li>AI NEVER auto-rejects a claim. Rejections require human signature.</li>
                </ul>
            `
        }
    };

    window.openExplainPanel = function(key) {
        const data = explainData[key];
        if (!data) return;
        
        document.querySelector('#explain-panel h2').innerHTML = `<i data-lucide="${data.icon}" class="w-5 h-5"></i> ${data.title}`;
        explainContent.innerHTML = data.html;
        lucide.createIcons({ root: document.getElementById('explain-panel') });
        
        explainOverlay.classList.remove('hidden');
        // small delay for transition
        setTimeout(() => {
            explainOverlay.classList.remove('opacity-0');
            explainPanel.classList.remove('translate-x-full');
        }, 10);
    };

    window.closeExplainPanel = function() {
        explainOverlay.classList.add('opacity-0');
        explainPanel.classList.add('translate-x-full');
        setTimeout(() => {
            explainOverlay.classList.add('hidden');
        }, 300);
    };

    const groqApiKey = ''; // Provide your own Groq API key here

    // ═══════════════════════════════════════════════════════════════
    // MULTILINGUAL TOGGLE
    // ═══════════════════════════════════════════════════════════════
    const translations = {
        hi: {
            "nav_home": "डैशबोर्ड",
            "nav_chat": "क्लेम-मेट से पूछें",
            "nav_checker": "दस्तावेज़ जाँच",
            "nav_tracker": "दावा ट्रैकर",
            "nav_simulator": "दावा सिम्युलेटर",
            "nav_policies": "मेरी नीतियां",
            "nav_translator": "अस्वीकृति अनुवादक",
            "journey_title": "दावा प्रस्तुतीकरण यात्रा"
        },
        en: {
            "nav_home": "Home",
            "nav_chat": "Ask ClaimMate",
            "nav_checker": "Document Checker",
            "nav_tracker": "Claim Tracker",
            "nav_simulator": "Claim Simulator",
            "nav_policies": "My Policies",
            "nav_translator": "Rejection Translator",
            "journey_title": "Claim Submission Journey"
        }
    };

    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
        langToggle.addEventListener('change', (e) => {
            const lang = e.target.value;
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (translations[lang] && translations[lang][key]) {
                    el.innerText = translations[lang][key];
                }
            });
        });
    }


    // ═══════════════════════════════════════════════════════════════
    // SMART NUDGES NOTIFICATION SYSTEM
    // ═══════════════════════════════════════════════════════════════
    const notifBtn = document.getElementById('btn-notifications');
    const notifDropdown = document.getElementById('notif-dropdown');
    const notifBadge = document.getElementById('notif-badge');
    const notifFeed = document.getElementById('notif-feed');

    notifBtn.addEventListener('click', () => {
        notifDropdown.classList.toggle('hidden');
        notifBadge.classList.add('hidden');
        // Mark all as read
        document.querySelectorAll('.nudge-item.unread').forEach(el => el.classList.remove('unread'));
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        if (!notifBtn.contains(e.target) && !notifDropdown.contains(e.target)) {
            notifDropdown.classList.add('hidden');
        }
    });

    const mockNudges = [
        { title: 'Action Required', text: 'Your discharge summary is missing — upload now to avoid delay.', time: 'Just now' },
        { title: 'Score Dropped', text: 'Your claim readiness score dropped to 65% — see risk factors.', time: '2m ago' },
        { title: 'Insight', text: 'Similar claims were approved 2x faster with a police report attached.', time: '1hr ago' }
    ];

    let nudgeIndex = 0;

    function pushNudge() {
        if (nudgeIndex >= mockNudges.length) return;
        const nudge = mockNudges[nudgeIndex];
        
        const div = document.createElement('div');
        div.className = 'nudge-item unread';
        div.innerHTML = `
            <div class="flex justify-between items-start mb-1">
                <span class="text-xs font-semibold text-white">${nudge.title}</span>
                <span class="text-[10px] text-gray-500">${nudge.time}</span>
            </div>
            <p class="text-xs text-gray-400">${nudge.text}</p>
        `;
        
        // Remove empty state if present
        const emptyState = notifFeed.querySelector('.empty-state');
        if (emptyState) emptyState.remove();

        notifFeed.prepend(div);
        
        if (notifDropdown.classList.contains('hidden')) {
            notifBadge.classList.remove('hidden');
            // Subtle bounce animation on bell
            notifBtn.classList.add('animate-bounce');
            setTimeout(() => notifBtn.classList.remove('animate-bounce'), 1000);
        }

        nudgeIndex++;
        // Schedule next nudge
        setTimeout(pushNudge, 15000 + Math.random() * 10000); // 15-25s
    }

    // Start nudges after 5s
    setTimeout(pushNudge, 5000);


    // ═══════════════════════════════════════════════════════════════
    // CLAIM SIMULATOR (WHAT-IF ENGINE)
    // ═══════════════════════════════════════════════════════════════
    let simChart;
    const simCostInput = document.getElementById('sim-cost');
    const simCostDisplay = document.getElementById('sim-cost-display');
    const simCheckboxes = document.querySelectorAll('.sim-doc-check');
    const simFactorsEl = document.getElementById('sim-factors');
    const simScoreValueEl = document.getElementById('sim-score-value');

    function calculateSimScore() {
        const cost = parseInt(simCostInput.value);
        simCostDisplay.textContent = `$${cost.toLocaleString()}`;

        let baseScore = 100;
        let factorsHtml = '';

        // Cost penalty
        if (cost > 15000) {
            baseScore -= 20;
            factorsHtml += `<li class="flex items-start gap-2"><i data-lucide="arrow-down" class="w-4 h-4 text-red-400 shrink-0 mt-0.5"></i> <span class="text-gray-300">High cost threshold exceeded (-20%)</span></li>`;
        } else if (cost > 8000) {
            baseScore -= 10;
            factorsHtml += `<li class="flex items-start gap-2"><i data-lucide="arrow-down" class="w-4 h-4 text-yellow-400 shrink-0 mt-0.5"></i> <span class="text-gray-300">Cost requires manual review (-10%)</span></li>`;
        } else {
            factorsHtml += `<li class="flex items-start gap-2"><i data-lucide="check" class="w-4 h-4 text-green-400 shrink-0 mt-0.5"></i> <span class="text-gray-300">Cost within auto-approve limits</span></li>`;
        }

        // Document penalty
        let docsMissing = 0;
        simCheckboxes.forEach(cb => {
            if (!cb.checked) {
                docsMissing++;
                baseScore -= 15;
                let severity = cb.value === 'form' || cb.value === 'discharge' ? 'text-red-400' : 'text-yellow-400';
                factorsHtml += `<li class="flex items-start gap-2"><i data-lucide="alert-circle" class="w-4 h-4 ${severity} shrink-0 mt-0.5"></i> <span class="text-gray-300">Missing ${cb.nextElementSibling.textContent} (-15%)</span></li>`;
            }
        });

        if (docsMissing === 0) {
             factorsHtml += `<li class="flex items-start gap-2"><i data-lucide="check" class="w-4 h-4 text-green-400 shrink-0 mt-0.5"></i> <span class="text-gray-300">All required documents present</span></li>`;
        }

        baseScore = Math.max(0, baseScore);
        simScoreValueEl.textContent = `${baseScore}%`;
        
        if (simScoreValueEl.parentElement) {
             if (baseScore >= 80) simScoreValueEl.className = "text-3xl font-bold font-heading text-green-400";
             else if (baseScore >= 50) simScoreValueEl.className = "text-3xl font-bold font-heading text-yellow-400";
             else simScoreValueEl.className = "text-3xl font-bold font-heading text-red-400";
        }

        simFactorsEl.innerHTML = factorsHtml;
        lucide.createIcons({ root: simFactorsEl });

        // Update Chart
        const chartColor = baseScore >= 80 ? '#4ade80' : baseScore >= 50 ? '#facc15' : '#f87171';
        
        if (!simChart && document.getElementById('sim-score-chart')) {
            simChart = new Chart(document.getElementById('sim-score-chart'), {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [baseScore, 100 - baseScore],
                        backgroundColor: [chartColor, 'rgba(255,255,255,0.05)'],
                        borderWidth: 0,
                        borderRadius: 4,
                        cutout: '80%'
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: { duration: 500 } }
            });
        } else if (simChart) {
            simChart.data.datasets[0].data = [baseScore, 100 - baseScore];
            simChart.data.datasets[0].backgroundColor[0] = chartColor;
            simChart.update();
        }
    }

    if (simCostInput) {
        simCostInput.addEventListener('input', calculateSimScore);
    }
    if (simCheckboxes) {
        simCheckboxes.forEach(cb => cb.addEventListener('change', calculateSimScore));
    }
    if (simCostInput || simCheckboxes.length > 0 || simChart) {
        calculateSimScore();
    }


    // ═══════════════════════════════════════════════════════════════
    // REJECTION TRANSLATOR
    // ═══════════════════════════════════════════════════════════════
    const transSelect = document.getElementById('trans-select');
    const transDocument = document.getElementById('trans-document');
    const transExplanation = document.getElementById('trans-explanation');
    const transSummary = document.getElementById('trans-summary');

    const letters = {
        'med-nec': {
            html: `Dear Jane Doe,<br><br>We have processed your claim #CLM-9021. Unfortunately, we must inform you that the requested benefits are denied.<br><br>Upon review by our clinical team, the services rendered do not meet the criteria for <span class="jargon-highlight" data-jargon="medical-necessity">medical necessity</span> as defined in Section 4(B) of your policy. The documentation provided failed to establish a <span class="jargon-highlight" data-jargon="causal-link">direct causal link</span> between the acute symptoms and the extensive diagnostic panel performed.<br><br>You have the right to an <span class="jargon-highlight" data-jargon="appeal">internal appeal</span> within 60 days.`,
            summary: "In short: Your claim was rejected because the insurance company doesn't think the treatment was strictly necessary based on your doctor's notes. You have 60 days to appeal."
        },
        'pre-exist': {
            html: `Dear Jane Doe,<br><br>We are writing regarding claim #CLM-9021. The claim has been closed without payment.<br><br>Our records indicate that the condition treated falls under the <span class="jargon-highlight" data-jargon="pre-existing">pre-existing condition exclusion</span> clause. The <span class="jargon-highlight" data-jargon="waiting-period">probationary waiting period</span> of 24 months has not been exhausted prior to the <span class="jargon-highlight" data-jargon="date-of-service">date of service</span>.<br><br>No benefits are payable at this time.`,
            summary: "In short: Your claim was rejected because they believe you had this condition before buying the policy, and the mandatory 2 year waiting period hasn't finished yet."
        }
    };

    const jargonDictionary = {
        'medical-necessity': 'Treatment that a doctor would normally provide for an illness, matching standard medical practices. (Essentially, they think you got extra tests/treatments you didn\'t strictly need).',
        'causal-link': 'A direct connection showing that your specific symptoms required exactly these specific tests.',
        'appeal': 'A formal request asking them to reconsider their decision, usually requiring a letter of explanation from your doctor.',
        'pre-existing': 'A medical condition you were diagnosed with or treated for BEFORE your insurance policy started.',
        'waiting-period': 'The time you must wait after buying the policy before you can claim for certain illnesses.',
        'date-of-service': 'The exact date you were treated at the hospital.'
    };

    function loadTranslatorLetter() {
        const val = transSelect.value;
        transDocument.innerHTML = letters[val].html;
        
        transSummary.innerHTML = `
            <h3 class="text-primary font-medium flex items-center gap-2 mb-2"><i data-lucide="zap" class="w-4 h-4"></i> Bottom Line</h3>
            <p class="text-sm text-gray-300">${letters[val].summary}</p>
        `;
        lucide.createIcons({ root: transSummary });
        
        // Reset explanation
        transExplanation.innerHTML = `
            <div class="text-center text-gray-500 empty-state">
                <i data-lucide="cursor-click" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                <p>Hover or click highlighted text to translate.</p>
            </div>
        `;
        lucide.createIcons({ root: transExplanation });

        // Attach listeners to jargon
        document.querySelectorAll('.jargon-highlight').forEach(el => {
            const showTranslation = () => {
                // Remove active from others
                document.querySelectorAll('.jargon-highlight').forEach(h => h.classList.remove('active'));
                el.classList.add('active');
                
                const key = el.dataset.jargon;
                const text = jargonDictionary[key];
                
                transExplanation.innerHTML = `
                    <div class="p-6 animate-fade-in">
                        <h4 class="text-accent font-semibold text-sm mb-2 uppercase tracking-wide">Plain English Translation</h4>
                        <p class="text-gray-200 text-sm leading-relaxed">${text}</p>
                        <button class="mt-4 text-xs text-gray-500 hover:text-primary flex items-center gap-1 transition-colors" onclick="openExplainPanel('ai_hybrid')">
                            <i data-lucide="info" class="w-3 h-3"></i> Translated by ClaimMate AI
                        </button>
                    </div>
                `;
                lucide.createIcons({ root: transExplanation });
            };

            el.addEventListener('mouseenter', showTranslation);
            el.addEventListener('click', showTranslation);
        });
    }

    if (transSelect) {
        transSelect.addEventListener('change', loadTranslatorLetter);
        loadTranslatorLetter(); // init
    }


    // ═══════════════════════════════════════════════════════════════
    // DOCUMENT QUALITY SCANNER (ANIMATED SEQUENCE)
    // ═══════════════════════════════════════════════════════════════
    const scannerUpload = document.getElementById('scanner-upload');
    const scannerIdle = document.getElementById('scanner-idle');
    const scannerActive = document.getElementById('scanner-active');
    const scannerChecks = document.getElementById('scanner-checks');
    const scannerResults = document.getElementById('scanner-results');

    const N8N_DOCUMENT_WEBHOOK_URL = "[PASTE_YOUR_N8N_DOCUMENT_WEBHOOK_URL_HERE]"; // TODO: Configure CORS on n8n

    if (scannerUpload) {
        scannerUpload.addEventListener('change', async (e) => {
            if (!e.target.files.length) return;
        
        const file = e.target.files[0];
        
        // Client-side validation
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            alert("File is too large. Please upload a file smaller than 10MB.");
            return;
        }
        
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            alert("Unsupported file type. Please upload a PDF, JPG, or PNG.");
            return;
        }

        // Hide idle, show scanning overlay
        scannerIdle.classList.add('opacity-0');
        scannerActive.classList.remove('hidden');
        scannerActive.classList.add('flex');
        scannerResults.classList.add('hidden');
        scannerChecks.innerHTML = `
            <div class="scan-check-item text-gray-300">
                <i data-lucide="loader" class="w-4 h-4 text-primary animate-spin"></i> Running Edge OCR and AI Quality Checks...
            </div>
        `;
        lucide.createIcons({ root: scannerChecks });

        // MOCK HACKATHON DELAY INSTEAD OF N8N WEBHOOK
        setTimeout(() => {
            const isFlagged = false; // Mocking success
            const status = "Verified";
            const summaryText = "AI confirmed high legibility and matched policy holder details. Added to claim #CLM-9021.";
            
            scannerActive.classList.add('hidden');
            scannerActive.classList.remove('flex');
            scannerIdle.classList.remove('opacity-0');
            
            scannerResults.innerHTML = `
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 ${isFlagged ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'} rounded-xl flex items-center justify-center shrink-0">
                        <i data-lucide="${isFlagged ? 'alert-triangle' : 'check-circle'}" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <h3 class="font-bold ${isFlagged ? 'text-red-400' : 'text-green-400'} mb-1">Document Status: ${escapeHTML(status)}</h3>
                        <p class="text-sm text-gray-300 mb-3">${escapeHTML(summaryText)}</p>
                        <button class="btn-primary text-xs py-1.5" onclick="navigateTo('home')">Return to Dashboard</button>
                    </div>
                </div>
            `;
            lucide.createIcons({ root: scannerResults });
            scannerResults.classList.remove('hidden');
        }, 3000);
    });
    }

    // Helper to sanitize text
    function escapeHTML(str) {
        if (!str) return '';
        return str.toString().replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag])
        );
    }


    // ═══════════════════════════════════════════════════════════════
    // HOME CHART INIT
    // ═══════════════════════════════════════════════════════════════
    let homeChart;
    if (document.getElementById('home-score-chart')) {
        homeChart = new Chart(document.getElementById('home-score-chart'), {
            type: 'doughnut',
            data: { datasets: [{ data: [65, 35], backgroundColor: ['#facc15', 'rgba(255,255,255,0.05)'], borderWidth: 0, cutout: '80%' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
        });
    }
    // ═══════════════════════════════════════════════════════════════
    // ASK CLAIMMATE (CHAT) LOGIC
    // ═══════════════════════════════════════════════════════════════
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatMessages = document.getElementById('chat-messages');

    // Chat History for context
    let chatHistory = [
        {
            role: "system",
            content: "You are ClaimMate AI, an expert insurance claims assistant. You help users understand their health insurance policies, check document readiness, and decode rejection letters. Keep your answers concise, empathetic, and professional. Use markdown for formatting. Mention the 'Claim Simulator' or 'Document Scanner' if they ask about predicting approval or checking documents."
        }
    ];

    function addMessage(text, isUser = false, evidence = null) {
        if (!chatMessages) return;
        
        // Remove typing indicator if exists
        const typingEl = document.getElementById('typing-indicator');
        if (typingEl) typingEl.remove();

        const msgDiv = document.createElement('div');
        msgDiv.className = `flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`;
        
        if (isUser) {
            msgDiv.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-darksec border border-darkborder flex items-center justify-center shrink-0">
                    <span class="text-xs font-bold">JD</span>
                </div>
                <div class="bg-primary text-white rounded-2xl rounded-tr-sm p-4 max-w-[85%]">
                    <p class="text-sm whitespace-pre-wrap">${text}</p>
                </div>
            `;
        } else {
            let evidenceHtml = '';
            if (evidence) {
                evidenceHtml = `
                    <div class="mt-4 p-3 bg-darksec border border-darkborder rounded-lg">
                        <p class="text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Source Evidence</p>
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-white font-medium">${evidence.sourceTitle} (Page ${evidence.page})</span>
                            <button class="text-xs bg-primary/20 text-primary hover:bg-primary/30 px-2 py-1 rounded transition-colors" onclick="alert('Opening Policy Document to Page ${evidence.page}...')">View Source</button>
                        </div>
                    </div>
                `;
            }
            
            msgDiv.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                    <i data-lucide="bot" class="w-5 h-5 text-white"></i>
                </div>
                <div class="bg-darkcard border border-darkborder rounded-2xl rounded-tl-sm p-4 max-w-[85%]">
                    <div class="text-sm prose prose-invert max-w-none whitespace-pre-wrap">${text}</div>
                    ${evidenceHtml}
                    <button class="mt-2 text-[10px] text-gray-500 hover:text-primary flex items-center gap-1 transition-colors" onclick="openExplainPanel('ai_hybrid')">
                        <i data-lucide="info" class="w-3 h-3"></i> Why am I seeing this?
                    </button>
                </div>
            `;
        }
        
        chatMessages.appendChild(msgDiv);
        lucide.createIcons({ root: msgDiv });
        chatMessages.parentElement.scrollTop = chatMessages.parentElement.scrollHeight;
    }

    function showTypingIndicator() {
        if (!chatMessages) return;
        const msgDiv = document.createElement('div');
        msgDiv.id = 'typing-indicator';
        msgDiv.className = `flex gap-3`;
        msgDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                <i data-lucide="bot" class="w-5 h-5 text-white"></i>
            </div>
            <div class="bg-darkcard border border-darkborder rounded-2xl rounded-tl-sm p-4 max-w-[85%] flex items-center gap-1">
                <span class="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                <span class="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
                <span class="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.4s"></span>
            </div>
        `;
        chatMessages.appendChild(msgDiv);
        lucide.createIcons({ root: msgDiv });
        chatMessages.parentElement.scrollTop = chatMessages.parentElement.scrollHeight;
    }

    // ═══════════════════════════════════════════════════════════════
    // VOICE-ASSIST MODE
    // ═══════════════════════════════════════════════════════════════
    const N8N_AUDIO_WEBHOOK_URL = "[PASTE_YOUR_N8N_AUDIO_WEBHOOK_URL_HERE]"; // TODO: Configure CORS on n8n
    
    const chatMicBtn = document.getElementById('chat-mic-btn');
    const micIcon = document.getElementById('mic-icon');
    let mediaRecorder = null;
    let audioChunks = [];

    if (chatMicBtn) {
        chatMicBtn.addEventListener('click', async () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = async () => {
                    chatMicBtn.classList.remove('text-red-500', 'animate-pulse');
                    chatInput.placeholder = "Processing your voice input...";
                    
                    // MOCK HACKATHON DELAY INSTEAD OF N8N WEBHOOK
                    setTimeout(() => {
                        chatInput.placeholder = "Type your message...";
                        
                        // Mock Transcription
                        addMessage("Can you explain why my claim was rejected?", true);
                        
                        // Mock AI Response with Policy Evidence
                        const mockAiResponse = `I see that your claim #CLM-9021 was closed due to a **pre-existing condition exclusion**. 

According to your policy, any condition you were diagnosed with before purchasing the insurance requires a 24-month waiting period before it is covered. Since you purchased the policy 14 months ago, this condition is not yet eligible.`;
                        
                        addMessage(mockAiResponse, false, {
                            sourceUrl: '#',
                            sourceTitle: 'Comprehensive Health Plan - Section 8(a)',
                            page: 12
                        });
                        
                    }, 2000);
                    
                    // Cleanup tracks
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();
                chatMicBtn.classList.add('text-red-500', 'animate-pulse');
                chatInput.placeholder = "Recording... Click mic again to stop.";

            } catch (error) {
                console.error("Microphone access error:", error);
                alert("Microphone access denied or unavailable.");
            }
        });
    }

    async function handleChatSend() {
        if (!chatInput) return;
        const text = chatInput.value.trim();
        if (!text) return;

        addMessage(text, true);
        chatInput.value = '';
        
        chatHistory.push({ role: "user", content: text });
        showTypingIndicator();

        try {
            // Updated System Prompt with "RAM" (RAG/Policy Context)
            const sysPrompt = {
                role: "system",
                content: `You are ClaimMate AI, an expert insurance claims assistant. 
You must provide verified information based on the following policy context:
- Policy Name: Comprehensive Health Plan
- Inpatient Hospitalization: Covered up to $500,000 (Section 4a, Page 5)
- Emergency Ambulance: Covered (Section 4b, Page 6)
- MRI and CT Scans: Covered at 60% after deductible for outpatient (Section 4c, Page 7)
- Pre-existing Conditions: Not covered for the first 24 months (Section 8a, Page 12)
- Claim Documents Required: Claim Form, Discharge Summary, Itemized Bills (Section 10, Page 15)

If the user asks about coverage or rejections, answer based on this context. 
IMPORTANT: At the very end of your response, if you used policy context, add a special citation block exactly formatted like this on its own line:
[EVIDENCE: Section Name | Page Number]
For example: [EVIDENCE: Section 4c | 7]
Keep your answers concise, empathetic, and professional.`
            };

            const payload = [sysPrompt, ...chatHistory.filter(m => m.role !== 'system')];
            
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: payload,
                    temperature: 0.3,
                    max_tokens: 500
                })
            });

            if (!response.ok) {
                throw new Error('API Error');
            }

            const data = await response.json();
            let aiMessage = data.choices[0].message.content;
            
            // Extract evidence citation
            let evidence = null;
            const evidenceMatch = aiMessage.match(/\[EVIDENCE:\s*(.*?)\s*\|\s*(\d+)\s*\]/);
            if (evidenceMatch) {
                evidence = {
                    sourceTitle: 'Comprehensive Health Plan - ' + evidenceMatch[1],
                    page: evidenceMatch[2]
                };
                aiMessage = aiMessage.replace(evidenceMatch[0], '').trim();
            }
            
            chatHistory.push({ role: "assistant", content: aiMessage });
            addMessage(aiMessage, false, evidence);

        } catch (error) {
            console.error('Chat AI Error:', error);
            // Fallback to robust Mock Response if API fails
            setTimeout(() => {
                const lowerText = text.toLowerCase();
                let mockText = "Based on your active policy (Comprehensive Health), inpatient treatments are covered up to $500,000. Is there a specific claim you need help with?";
                let evidence = null;
                
                if (lowerText.includes('document') || lowerText.includes('ready')) {
                    mockText = "For a standard health claim, you need a **Claim Form**, **Discharge Summary**, and **Itemized Bills**. You can check your document readiness using the Pre-Submission Check tool.";
                    evidence = { sourceTitle: 'Comprehensive Health Plan - Section 10', page: 15 };
                }
                else if (lowerText.includes('reject') || lowerText.includes('deny')) {
                    mockText = "Your previous claim was rejected because the condition fell under the **pre-existing condition exclusion** clause. A 24-month waiting period applies.";
                    evidence = { sourceTitle: 'Comprehensive Health Plan - Section 8a', page: 12 };
                }
                else if (lowerText.includes('mri') || lowerText.includes('scan')) {
                    mockText = "Yes, MRI scans are covered under your Outpatient benefits. The coverage is 60% after your deductible is met.";
                    evidence = { sourceTitle: 'Comprehensive Health Plan - Section 4c', page: 7 };
                }
                else if (lowerText.includes('treatment') || lowerText.includes('cover')) {
                    mockText = "Yes! Based on your Comprehensive Health Plan, inpatient treatments are covered up to $500,000. Emergency ambulance services are also covered.";
                    evidence = { sourceTitle: 'Comprehensive Health Plan - Section 4a', page: 5 };
                }
                
                chatHistory.push({ role: "assistant", content: mockText });
                addMessage(mockText, false, evidence);
            }, 1000);
        }
    }

    if (chatSendBtn) chatSendBtn.addEventListener('click', handleChatSend);
    if (chatInput) chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleChatSend();
        }
    });

    window.sendSuggestedMessage = function(text) {
        if (chatInput) chatInput.value = text;
        handleChatSend();
    };

    // ═══════════════════════════════════════════════════════════════
    // MY POLICIES LOGIC
    // ═══════════════════════════════════════════════════════════════
    const policiesGrid = document.getElementById('policies-grid');
    const policyModal = document.getElementById('policy-modal');
    const policyModalContent = document.getElementById('policy-modal-content');

    const mockPolicies = [
        {
            id: 'POL-1001',
            type: 'Comprehensive Health',
            status: 'Active',
            premium: '$240/mo',
            coverage: '80% Inpatient / 60% Outpatient',
            deductible: '$1,500 ($450 met)',
            details: `
                <div class="p-6 border-b border-darkborder bg-darkbg flex justify-between items-center sticky top-0 z-10">
                    <h2 class="text-xl font-heading font-bold">Comprehensive Health Plan</h2>
                    <button class="text-gray-400 hover:text-white" onclick="document.getElementById('policy-modal').classList.add('hidden')">
                        <i data-lucide="x" class="w-6 h-6"></i>
                    </button>
                </div>
                <div class="p-6 space-y-6">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-darksec p-4 rounded-xl border border-darkborder">
                            <p class="text-sm text-gray-400">Policy Number</p>
                            <p class="font-medium text-white">POL-1001</p>
                        </div>
                        <div class="bg-darksec p-4 rounded-xl border border-darkborder">
                            <p class="text-sm text-gray-400">Deductible Remaining</p>
                            <p class="font-medium text-accent">$1,050</p>
                        </div>
                    </div>
                    <div>
                        <h3 class="text-sm font-semibold text-primary uppercase tracking-wider mb-3">What's Covered</h3>
                        <ul class="space-y-2 text-sm text-gray-300">
                            <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-green-400"></i> Inpatient Hospitalization (Up to $500,000)</li>
                            <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-green-400"></i> Emergency Ambulance</li>
                            <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-green-400"></i> Prescription Drugs (Tier 1 & 2)</li>
                        </ul>
                    </div>
                    <div>
                        <h3 class="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">What's NOT Covered</h3>
                        <ul class="space-y-2 text-sm text-gray-300">
                            <li class="flex items-center gap-2"><i data-lucide="x" class="w-4 h-4 text-red-400"></i> Cosmetic Procedures</li>
                            <li class="flex items-center gap-2"><i data-lucide="x" class="w-4 h-4 text-red-400"></i> Pre-existing conditions (24 mo waiting period)</li>
                        </ul>
                    </div>
                </div>
                <div class="mt-8 border-t border-darkborder pt-6 flex justify-end">
                    <button class="btn-primary py-2 px-6 flex items-center gap-2" onclick="document.getElementById('policy-modal').classList.add('hidden'); document.getElementById('xray-modal').classList.remove('hidden');">
                        <i data-lucide="eye" class="w-4 h-4"></i> View Policy X-Ray
                    </button>
                </div>
            `
        },
        {
            id: 'POL-2055',
            type: 'Term Life',
            status: 'Active',
            premium: '$45/mo',
            coverage: '$500,000 payout',
            deductible: 'N/A',
            details: `<div class="p-6"><h2 class="text-xl font-bold mb-4">Term Life Details</h2><p>Simplified details for demo.</p><button class="btn-primary mt-4" onclick="document.getElementById('policy-modal').classList.add('hidden')">Close</button></div>`
        }
    ];

    window.openPolicy = function(id) {
        const policy = mockPolicies.find(p => p.id === id);
        if (policy && policyModal) {
            policyModalContent.innerHTML = policy.details;
            lucide.createIcons({ root: policyModalContent });
            policyModal.classList.remove('hidden');
        }
    };

    function renderPolicies() {
        if (!policiesGrid) return;
        policiesGrid.innerHTML = mockPolicies.map(p => `
            <div class="dashboard-card group cursor-pointer" onclick="openPolicy('${p.id}')">
                <div class="flex justify-between items-start mb-4">
                    <div class="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <i data-lucide="shield" class="w-5 h-5"></i>
                    </div>
                    <span class="text-xs font-medium px-2 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/20">${p.status}</span>
                </div>
                <h3 class="font-heading font-semibold text-lg mb-1">${p.type}</h3>
                <p class="text-xs text-gray-400 mb-4">${p.id}</p>
                
                <div class="space-y-2 text-sm border-t border-darkborder pt-4">
                    <div class="flex justify-between"><span class="text-gray-400">Premium</span><span>${p.premium}</span></div>
                    <div class="flex justify-between"><span class="text-gray-400">Coverage</span><span class="text-right max-w-[60%] truncate">${p.coverage}</span></div>
                    <div class="flex justify-between"><span class="text-gray-400">Deductible</span><span>${p.deductible}</span></div>
                </div>
            </div>
        `).join('');
        lucide.createIcons({ root: policiesGrid });
    }
    renderPolicies();

    // ═══════════════════════════════════════════════════════════════
    // TRACKER LOGIC
    // ═══════════════════════════════════════════════════════════════
    const trackerTimeline = document.getElementById('tracker-timeline');
    
    let trackerLogs = [
        { date: 'Oct 14, 2:30 PM', title: 'Manual Review Required', desc: 'AI flagged cost anomaly. Escalated to agent.', icon: 'alert-triangle', color: 'text-yellow-400', bg: 'bg-yellow-400/20', trust: 'agent_escalation' },
        { date: 'Oct 12, 10:15 AM', title: 'AI Verification Complete', desc: 'Documents verified. Proceeding to clinical review.', icon: 'check-circle', color: 'text-green-400', bg: 'bg-green-400/20', trust: 'quality_scanner' },
        { date: 'Oct 12, 9:00 AM', title: 'Claim Submitted', desc: 'Initial claim and 2 documents received via portal.', icon: 'file-up', color: 'text-primary', bg: 'bg-primary/20', trust: null }
    ];
    
    window.renderTimeline = function() {
        if (!trackerTimeline) return;
        trackerTimeline.innerHTML = trackerLogs.map(log => `
            <div class="relative animate-fade-in-up">
                <div class="absolute -left-10 w-8 h-8 rounded-full ${log.bg} flex items-center justify-center border-4 border-darkbg">
                    <i data-lucide="${log.icon}" class="w-4 h-4 ${log.color}"></i>
                </div>
                <div>
                    <h3 class="font-semibold text-white">${log.title}</h3>
                    <p class="text-xs text-gray-500 mb-1">${log.date}</p>
                    <p class="text-sm text-gray-300">${log.desc}</p>
                    ${log.trust ? `
                    <button class="mt-2 text-[10px] text-gray-500 hover:text-primary flex items-center gap-1 transition-colors" onclick="openExplainPanel('${log.trust}')">
                        <i data-lucide="info" class="w-3 h-3"></i> Trust & Reasoning Details
                    </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
        if (window.lucide) window.lucide.createIcons({ root: trackerTimeline });
    }
    
    window.approveClaim = function(btn) {
        if (!btn) return;
        btn.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4"></i> Approved`;
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
        if (window.lucide) window.lucide.createIcons({ root: btn });
        
        trackerLogs.unshift({
            date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
            title: 'Claim Approved',
            desc: 'Your claim has been fully approved by our team. Payment is being processed.',
            icon: 'badge-check',
            color: 'text-green-400',
            bg: 'bg-green-400/20',
            trust: null
        });
        
        // Update Customer Dashboard UI Elements
        const actionText = document.getElementById('home-action-text');
        const actionBtn = document.getElementById('home-action-btn');
        const claimStatus = document.getElementById('home-claim-status');
        const claimProgress = document.getElementById('home-claim-progress');

        if (actionText) actionText.innerHTML = "Good news! Your active Claim #CLM-9021 has been <strong>approved</strong>. Payment is on the way.";
        if (actionBtn) {
            actionBtn.innerHTML = "View Payment Details";
            actionBtn.setAttribute('onclick', "navigateTo('tracker')");
        }
        if (claimStatus) {
            claimStatus.innerHTML = "Approved";
            claimStatus.className = "text-green-400";
        }
        if (claimProgress) {
            claimProgress.style.width = "100%";
            claimProgress.className = "bg-green-400 h-1.5 rounded-full";
        }

        if (typeof renderTimeline === 'function') {
            renderTimeline();
        }
    }
    renderTimeline();

    // ═══════════════════════════════════════════════════════════════
    // GAMIFIED SUBMIT JOURNEY
    // ═══════════════════════════════════════════════════════════════
    const btnSubmitGamified = document.getElementById('btn-submit-gamified');
    if (btnSubmitGamified) {
        btnSubmitGamified.addEventListener('click', (e) => {
            if (btnSubmitGamified.disabled) return;
            btnSubmitGamified.disabled = true;
            
            btnSubmitGamified.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Submitting...`;
            if (window.lucide) window.lucide.createIcons({ root: btnSubmitGamified });

            // 1. Submit Claim
            setTimeout(() => {
                trackerLogs = []; // Clear old logs
                
                trackerLogs.unshift({
                    date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
                    title: 'Claim Submitted',
                    desc: 'Initial claim and documents received via portal.',
                    icon: 'file-up',
                    color: 'text-primary',
                    bg: 'bg-primary/20',
                    trust: null
                });
                renderTimeline();
                
                btnSubmitGamified.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Submitted!`;
                btnSubmitGamified.classList.remove('animate-pulse');
                btnSubmitGamified.classList.add('bg-green-600', 'hover:bg-green-500');
                if (window.lucide) window.lucide.createIcons({ root: btnSubmitGamified });
                
                for (let i = 0; i < 50; i++) {
                    createConfetti(e.clientX, e.clientY);
                }

                // 2. AI Verification
                setTimeout(() => {
                    trackerLogs.unshift({
                        date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
                        title: 'AI Verification Complete',
                        desc: 'Documents verified. Policy match confirmed.',
                        icon: 'check-circle',
                        color: 'text-green-400',
                        bg: 'bg-green-400/20',
                        trust: 'quality_scanner'
                    });
                    renderTimeline();
                    
                    // 3. Under Review
                    setTimeout(() => {
                        trackerLogs.unshift({
                            date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
                            title: 'Under Review',
                            desc: 'Claim is actively being reviewed by an agent.',
                            icon: 'clock',
                            color: 'text-yellow-400',
                            bg: 'bg-yellow-400/20',
                            trust: 'agent_escalation'
                        });
                        renderTimeline();
                        
                        btnSubmitGamified.disabled = false;
                        btnSubmitGamified.innerHTML = `Submit New Claim`;
                        btnSubmitGamified.classList.remove('bg-green-600', 'hover:bg-green-500');
                        btnSubmitGamified.classList.add('animate-pulse');
                    }, 2500);
                }, 2000);
            }, 1000);
        });
    }

    function createConfetti(x, y) {
        const colors = ['#3b9df8', '#4fd1ff', '#10b981', '#facc15', '#ef4444'];
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.left = x + 'px';
        confetti.style.top = y + 'px';
        confetti.style.width = '8px';
        confetti.style.height = '8px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.borderRadius = '50%';
        confetti.style.pointerEvents = 'none';
        confetti.style.zIndex = '9999';
        
        const angle = Math.random() * Math.PI * 2;
        const velocity = 5 + Math.random() * 15;
        const tx = Math.cos(angle) * velocity * 10;
        const ty = Math.sin(angle) * velocity * 10 + 50;
        
        confetti.style.transition = 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        document.body.appendChild(confetti);
        
        requestAnimationFrame(() => {
            confetti.style.transform = `translate(${tx}px, ${ty}px) rotate(${Math.random() * 360}deg)`;
            confetti.style.opacity = '0';
        });
        
        setTimeout(() => confetti.remove(), 1000);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // NEW FEATURES: PRE-SUBMISSION CHECK
    // ═══════════════════════════════════════════════════════════════
    window.fixPresubIssue = function(issueId) {
        const el = document.getElementById(issueId);
        if(!el) return;
        const btn = el.querySelector('button');
        btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin inline mr-1"></i> Uploading...`;
        
        setTimeout(() => {
            el.classList.add('hidden');
            const countEl = document.getElementById('presub-issue-count');
            let count = parseInt(countEl.innerText) - 1;
            countEl.innerText = count;
            
            if (count === 0) {
                document.getElementById('presub-action-card').classList.replace('border-yellow-500/20', 'border-green-500/20');
                document.getElementById('presub-action-card').classList.replace('bg-yellow-500/5', 'bg-green-500/5');
                document.getElementById('presub-issues-list').classList.add('hidden');
                document.getElementById('presub-action-card').querySelector('h3').innerText = "All issues resolved";
                document.getElementById('presub-action-card').querySelector('i').classList.replace('text-yellow-500', 'text-green-500');
                document.getElementById('presub-action-card').querySelector('h3').classList.replace('text-yellow-500', 'text-green-500');
                
                document.getElementById('presub-success').classList.remove('hidden');
                
                // Update stats
                document.getElementById('doc-complete-stat').innerText = "100%";
                document.getElementById('doc-complete-stat').classList.replace('text-yellow-400', 'text-green-400');
                document.getElementById('doc-quality-stat').innerText = "98%";
                document.getElementById('doc-quality-stat').classList.replace('text-yellow-400', 'text-green-400');
                
                document.getElementById('sim-score-value').innerText = "LOW";
                document.getElementById('sim-score-value').classList.replace('text-yellow-400', 'text-green-400');
                
                document.getElementById('presub-risk-reasons').innerHTML = `
                    <li class="text-green-400">• All documents verified and clear</li>
                    <li class="text-green-400">• Coverage matches treatment perfectly</li>
                `;
            }
        }, 1500);
    }

    // ═══════════════════════════════════════════════════════════════
    // NEW FEATURES: LOANS
    // ═══════════════════════════════════════════════════════════════
    window.checkLoanReadiness = function(event) {
        try {
            const btn = event ? event.currentTarget : document.querySelector('#view-loan-readiness button');
            if (!btn) return;
            
            const origText = btn.innerText || "Check Readiness";
            btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin inline mr-1"></i> Checking...`;
            if (window.lucide) window.lucide.createIcons({ root: btn });
            
            setTimeout(() => {
                btn.innerHTML = origText;
                const resultEl = document.getElementById('loan-readiness-result');
                if (resultEl) {
                    // Calculate Readiness
                    const amt = parseFloat(document.getElementById('loan-amt').value) || 0;
                    const tenure = parseInt(document.getElementById('loan-tenure').value) || 12;
                    const income = parseFloat(document.getElementById('loan-income').value) || 0;
                    const commitments = parseFloat(document.getElementById('loan-commitments').value) || 0;
                    
                    const estimatedEMI = (amt / tenure) * 1.05; // rough 5% flat interest approx for simple DTI
                    const totalMonthlyDebt = estimatedEMI + commitments;
                    const dti = income > 0 ? (totalMonthlyDebt / income) : 1;
                    
                    let statusColor = "text-green-400";
                    let bgClass = "bg-green-500/20";
                    let borderClass = "border-green-500/20";
                    let boxBgClass = "bg-green-500/5";
                    let icon = "check-circle";
                    let title = "Profile Looks Good";
                    let msg = "Your application appears ready for the next stage based on the information provided.";
                    
                    if (dti > 0.60) {
                        statusColor = "text-red-400";
                        bgClass = "bg-red-500/20";
                        borderClass = "border-red-500/20";
                        boxBgClass = "bg-red-500/5";
                        icon = "x-circle";
                        title = "High Risk (DTI > 60%)";
                        msg = "Your current debt-to-income ratio is too high for this requested amount. Consider reducing the loan amount or increasing tenure.";
                    } else if (dti > 0.40) {
                        statusColor = "text-yellow-400";
                        bgClass = "bg-yellow-500/20";
                        borderClass = "border-yellow-500/20";
                        boxBgClass = "bg-yellow-500/5";
                        icon = "alert-triangle";
                        title = "Needs Attention";
                        msg = "Your debt-to-income ratio is borderline. You may need additional co-applicants or collateral.";
                    }
                    
                    resultEl.className = `dashboard-card text-center flex flex-col justify-center ${borderClass} ${boxBgClass}`;
                    resultEl.innerHTML = `
                        <div class="w-16 h-16 rounded-full ${bgClass} ${statusColor} flex items-center justify-center mx-auto mb-4">
                            <i data-lucide="${icon}" class="w-8 h-8"></i>
                        </div>
                        <h3 class="text-xl font-bold ${statusColor} mb-2">${title}</h3>
                        <p class="text-sm text-gray-300 mb-4">${msg}</p>
                        <p class="text-[10px] text-gray-500 italic">Final approval depends on the lender's criteria and verification. Estimated EMI: $${estimatedEMI.toFixed(0)}.</p>
                    `;
                    
                    if (window.lucide) window.lucide.createIcons({ root: resultEl });
                    
                    resultEl.classList.remove('hidden');
                    resultEl.style.display = 'flex'; // Force visible
                }
            }, 1000);
        } catch(e) {
            console.error(e);
        }
    }
    
    window.generateLoanScenarios = function(event) {
        if(event) event.preventDefault();
        try {
            const amtInput = document.getElementById('sim-loan-amt');
            const rateInput = document.getElementById('sim-loan-rate');
            const grid = document.getElementById('loan-scenarios-grid');
            
            if (!amtInput || !rateInput || !grid) {
                alert("Error: Required elements not found in the DOM.");
                return;
            }
            
            const amt = parseFloat(amtInput.value) || 500000;
            const rateStr = rateInput.value;
            const rate = (parseFloat(rateStr) || 10.5) / 12 / 100;
            
            const tenures = [12, 36, 60];
            grid.innerHTML = '';
            
            tenures.forEach(t => {
                const emi = amt * rate * Math.pow(1 + rate, t) / (Math.pow(1 + rate, t) - 1);
                const total = emi * t;
                
                grid.innerHTML += `
                    <div class="dashboard-card text-center relative ${t===36 ? 'border-primary/50 bg-primary/5' : ''} animate-fade-in">
                        ${t===36 ? '<div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase">Recommended</div>' : ''}
                        <h3 class="font-heading font-bold text-xl mb-4">${t} Months</h3>
                        <p class="text-sm text-gray-400 mb-1">Monthly EMI</p>
                        <p class="text-2xl font-bold text-white mb-4">₹${Math.round(emi).toLocaleString('en-IN')}</p>
                        <div class="text-xs text-gray-500 space-y-1">
                            <p>Total Interest: ₹${Math.round(total - amt).toLocaleString('en-IN')}</p>
                            <p>Total Payment: ₹${Math.round(total).toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                `;
            });
        } catch(e) {
            alert("Error generating scenarios: " + e.message);
        }
    }
    
    // Auto-generate on load if grid exists
    if(document.getElementById('loan-scenarios-grid')) {
        setTimeout(() => window.generateLoanScenarios(), 500);
    }

    window.scanMockLoan = function() {
        const btn = document.querySelector('#view-loan-explainer button');
        const origText = btn.innerText;
        btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin inline mr-1"></i> Analyzing Agreement...`;
        
        setTimeout(() => {
            btn.innerHTML = origText;
            document.getElementById('loan-explainer-content').classList.remove('hidden');
            lucide.createIcons();
        }, 2000);
    }
    
    window.showLoanClause = function(clause) {
        const viewer = document.getElementById('loan-clause-viewer');
        let html = '';
        if (clause === 'prepayment') {
            html = `
                <div class="text-left w-full h-full flex flex-col">
                    <h3 class="font-heading font-bold text-xl mb-2 flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-yellow-500"></span> Prepayment Condition</h3>
                    <div class="bg-darksec p-4 rounded-xl border border-darkborder mb-4 flex-1 overflow-y-auto">
                        <p class="text-sm text-gray-300 font-serif italic leading-loose">"The Borrower may prepay the Loan in full or in part before the maturity date, subject to a prepayment penalty of 2.5% on the principal amount outstanding, provided that no prepayment shall be allowed within the first 6 months of the Loan tenure."</p>
                    </div>
                    <div class="bg-primary/10 border border-primary/30 p-4 rounded-xl">
                        <p class="text-sm text-white font-medium flex items-center gap-2 mb-1"><i data-lucide="zap" class="w-4 h-4 text-primary"></i> AI Translation</p>
                        <p class="text-sm text-gray-300">You cannot pay off this loan early during the first 6 months. After 6 months, if you pay it off early, you will be charged a 2.5% fee on the remaining balance.</p>
                    </div>
                </div>
            `;
        } else if (clause === 'late_fee') {
            html = `
                <div class="text-left w-full h-full flex flex-col">
                    <h3 class="font-heading font-bold text-xl mb-2 flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-red-500"></span> Late Payment Charge</h3>
                    <div class="bg-darksec p-4 rounded-xl border border-darkborder mb-4 flex-1 overflow-y-auto">
                        <p class="text-sm text-gray-300 font-serif italic leading-loose">"In the event of default in payment of any EMI on the Due Date, the Borrower shall be liable to pay penal interest at the rate of 24% per annum (2% per month) on the overdue amount from the Due Date until actual realization."</p>
                    </div>
                    <div class="bg-primary/10 border border-primary/30 p-4 rounded-xl">
                        <p class="text-sm text-white font-medium flex items-center gap-2 mb-1"><i data-lucide="zap" class="w-4 h-4 text-primary"></i> AI Translation</p>
                        <p class="text-sm text-gray-300">If you miss your monthly payment, you will be charged a very high penalty fee of 2% per month on the missed amount until you pay it.</p>
                    </div>
                </div>
            `;
        } else if (clause === 'processing') {
            html = `
                <div class="text-left w-full h-full flex flex-col">
                    <h3 class="font-heading font-bold text-xl mb-2 flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-blue-400"></span> Processing Fee</h3>
                    <div class="bg-darksec p-4 rounded-xl border border-darkborder mb-4 flex-1 overflow-y-auto">
                        <p class="text-sm text-gray-300 font-serif italic leading-loose">"A non-refundable processing fee of 1.5% of the sanctioned Loan amount, plus applicable taxes, shall be deducted upfront from the Loan disbursement."</p>
                    </div>
                    <div class="bg-primary/10 border border-primary/30 p-4 rounded-xl">
                        <p class="text-sm text-white font-medium flex items-center gap-2 mb-1"><i data-lucide="zap" class="w-4 h-4 text-primary"></i> AI Translation</p>
                        <p class="text-sm text-gray-300">A fee of 1.5% (plus tax) will be taken out of your loan before you receive the money. You won't get this back if you cancel.</p>
                    </div>
                </div>
            `;
        }
        viewer.innerHTML = html;
        viewer.classList.remove('justify-center', 'items-center', 'text-center');
        lucide.createIcons({root: viewer});
    }

    // ═══════════════════════════════════════════════════════════════
    // NEW FEATURES: FINTECH
    // ═══════════════════════════════════════════════════════════════
    window.analyzeMockStatement = function() {
        const btn = document.querySelector('#view-fintech-analyzer button');
        const origText = btn.innerText;
        btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin inline mr-1"></i> Analyzing...`;
        
        setTimeout(() => {
            btn.innerHTML = origText;
            document.getElementById('fintech-content').classList.remove('hidden');
            lucide.createIcons();
            
            // Render Chart
            const ctx = document.getElementById('spending-chart').getContext('2d');
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Food', 'Transport', 'Utilities', 'Shopping', 'Subscriptions'],
                    datasets: [{
                        data: [40, 20, 15, 15, 10],
                        backgroundColor: ['#3b9df8', '#4fd1ff', '#10b981', '#facc15', '#a855f7'],
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#9ca3af', font: { size: 10 } } }
                    },
                    cutout: '75%'
                }
            });
            
        }, 2000);
    }

    // ═══════════════════════════════════════════════════════════════
    // PROVIDERS DIRECTORY
    // ═══════════════════════════════════════════════════════════════
    const mockProviders = [
        {
            id: 'dr-john-doe',
            name: 'Dr. John Doe',
            photo: 'https://ui-avatars.com/api/?name=John+Doe&background=3b9df8&color=fff&size=128',
            role: 'Cardiologist',
            experience: '15 Years',
            availability: 'Mon, Wed, Fri (9 AM - 2 PM)',
            location: 'Apollo City Center, New York',
            rating: '4.8/5.0',
            about: 'Dr. John Doe is a highly experienced Cardiologist specializing in interventional cardiology and preventive care.'
        },
        {
            id: 'dr-sarah-smith',
            name: 'Dr. Sarah Smith',
            photo: 'https://ui-avatars.com/api/?name=Sarah+Smith&background=4fd1ff&color=fff&size=128',
            role: 'Dermatologist',
            experience: '10 Years',
            availability: 'Tue, Thu, Sat (10 AM - 4 PM)',
            location: 'Skin Care Clinic, New Jersey',
            rating: '4.9/5.0',
            about: 'Dr. Sarah Smith focuses on medical and cosmetic dermatology with a patient-first approach.'
        }
    ];

    function renderProviders() {
        const grid = document.getElementById('providers-grid');
        if (!grid) return;
        
        let html = '';
        mockProviders.forEach(p => {
            html += `
            <div class="dashboard-card group cursor-pointer hover:border-primary transition-all flex flex-col items-center text-center" onclick="openProviderProfile('${p.id}')">
                <img src="${p.photo}" alt="${p.name}" class="w-20 h-20 rounded-full mb-4 border-2 border-darkborder group-hover:border-primary transition-colors">
                <h3 class="text-xl font-bold mb-1">${p.name}</h3>
                <p class="text-sm text-primary mb-3">${p.role}</p>
                <div class="flex items-center gap-1 text-yellow-400 text-xs mb-4">
                    <i data-lucide="star" class="w-4 h-4 fill-current"></i>
                    <span>${p.rating}</span>
                </div>
                <button class="w-full bg-darksec border border-darkborder py-2 rounded-lg text-sm group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">View Profile</button>
            </div>
            `;
        });
        grid.innerHTML = html;
        lucide.createIcons({ root: grid });
    }

    const providerModal = document.getElementById('provider-modal');
    const providerModalContent = document.getElementById('provider-modal-content');

    window.openProviderProfile = function(id) {
        const provider = mockProviders.find(p => p.id === id);
        if (!provider || !providerModal) return;

        providerModalContent.innerHTML = `
            <div class="p-6 md:p-8 relative">
                <button class="absolute top-4 right-4 text-gray-400 hover:text-white bg-darksec p-2 rounded-full transition-colors" onclick="closeProviderProfile()">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
                
                <div class="flex flex-col md:flex-row gap-6 items-center md:items-start mb-6">
                    <img src="${provider.photo}" alt="${provider.name}" class="w-24 h-24 rounded-full border-4 border-darksec shadow-lg shrink-0">
                    <div class="text-center md:text-left">
                        <h2 class="text-2xl font-bold font-heading mb-1">${provider.name}</h2>
                        <p class="text-primary font-medium mb-3">${provider.role}</p>
                        <div class="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm">
                            <span class="flex items-center gap-1 bg-darksec px-3 py-1.5 rounded-lg border border-darkborder text-yellow-400"><i data-lucide="star" class="w-4 h-4 fill-current"></i> ${provider.rating}</span>
                            <span class="flex items-center gap-1 bg-darksec px-3 py-1.5 rounded-lg border border-darkborder text-gray-300"><i data-lucide="briefcase" class="w-4 h-4"></i> ${provider.experience}</span>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div class="bg-darksec p-4 rounded-xl border border-darkborder">
                        <h4 class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-2"><i data-lucide="map-pin" class="w-4 h-4 text-accent"></i> Location</h4>
                        <p class="text-gray-300 text-sm">${provider.location}</p>
                    </div>
                    <div class="bg-darksec p-4 rounded-xl border border-darkborder">
                        <h4 class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-2"><i data-lucide="clock" class="w-4 h-4 text-accent"></i> Availability</h4>
                        <p class="text-gray-300 text-sm">${provider.availability}</p>
                    </div>
                </div>

                <div class="mb-6">
                    <h4 class="text-sm font-semibold mb-2">About ${provider.name}</h4>
                    <p class="text-gray-400 text-sm leading-relaxed">${provider.about}</p>
                </div>

                <button class="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2" onclick="closeProviderProfile()">
                    <i data-lucide="calendar-check" class="w-4 h-4"></i> Book Appointment
                </button>
            </div>
        `;
        
        lucide.createIcons({ root: providerModalContent });
        
        providerModal.classList.remove('hidden');
        providerModal.classList.add('flex');
        setTimeout(() => {
            providerModalContent.classList.remove('scale-95');
            providerModalContent.classList.add('scale-100');
        }, 10);
    };

    window.closeProviderProfile = function() {
        if (!providerModal) return;
        providerModalContent.classList.remove('scale-100');
        providerModalContent.classList.add('scale-95');
        setTimeout(() => {
            providerModal.classList.add('hidden');
            providerModal.classList.remove('flex');
        }, 200);
    };

    renderProviders();

    // ═══════════════════════════════════════════════════════════════
    // USER PROFILE MODAL (SIDEBAR)
    // ═══════════════════════════════════════════════════════════════
    const mockUsers = [
        {
            id: 'jane-doe',
            name: 'Jane Doe',
            photo: 'https://ui-avatars.com/api/?name=Jane+Doe&background=3b9df8&color=fff&size=128',
            role: 'Premium Member',
            experience: 'Joined 2023',
            availability: 'Online',
            location: 'New York, USA',
            rating: '5.0/5.0 (Trust Score)',
            about: 'Jane is a premium customer with ClaimMate AI, utilizing the platform for seamless insurance tracking and financial insights.'
        }
    ];

    const userProfileModal = document.getElementById('user-profile-modal');
    const userProfileModalContent = document.getElementById('user-profile-modal-content');

    window.openUserProfile = function(id) {
        const user = mockUsers.find(u => u.id === id);
        if (!user || !userProfileModal) return;

        userProfileModalContent.innerHTML = `
            <div class="p-6 md:p-8 relative">
                <button class="absolute top-4 right-4 text-gray-400 hover:text-white bg-darksec p-2 rounded-full transition-colors" onclick="closeUserProfile()">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
                
                <div class="flex flex-col md:flex-row gap-6 items-center md:items-start mb-6">
                    <img src="${user.photo}" alt="${user.name}" class="w-24 h-24 rounded-full border-4 border-darksec shadow-lg shrink-0">
                    <div class="text-center md:text-left">
                        <h2 class="text-2xl font-bold font-heading mb-1">${user.name}</h2>
                        <p class="text-primary font-medium mb-3">${user.role}</p>
                        <div class="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm">
                            <span class="flex items-center gap-1 bg-darksec px-3 py-1.5 rounded-lg border border-darkborder text-yellow-400"><i data-lucide="star" class="w-4 h-4 fill-current"></i> ${user.rating}</span>
                            <span class="flex items-center gap-1 bg-darksec px-3 py-1.5 rounded-lg border border-darkborder text-gray-300"><i data-lucide="calendar" class="w-4 h-4"></i> ${user.experience}</span>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div class="bg-darksec p-4 rounded-xl border border-darkborder">
                        <h4 class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-2"><i data-lucide="map-pin" class="w-4 h-4 text-accent"></i> Location</h4>
                        <p class="text-gray-300 text-sm">${user.location}</p>
                    </div>
                    <div class="bg-darksec p-4 rounded-xl border border-darkborder">
                        <h4 class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-2"><i data-lucide="activity" class="w-4 h-4 text-accent"></i> Status</h4>
                        <p class="text-gray-300 text-sm">${user.availability}</p>
                    </div>
                </div>

                <div class="mb-6">
                    <h4 class="text-sm font-semibold mb-2">About ${user.name}</h4>
                    <p class="text-gray-400 text-sm leading-relaxed">${user.about}</p>
                </div>

                <button class="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2" onclick="closeUserProfile()">
                    <i data-lucide="edit" class="w-4 h-4"></i> Edit Profile Settings
                </button>
            </div>
        `;
        
        lucide.createIcons({ root: userProfileModalContent });
        
        userProfileModal.classList.remove('hidden');
        userProfileModal.classList.add('flex');
        setTimeout(() => {
            userProfileModalContent.classList.remove('scale-95');
            userProfileModalContent.classList.add('scale-100');
        }, 10);
    };

    window.closeUserProfile = function() {
        if (!userProfileModal) return;
        userProfileModalContent.classList.remove('scale-100');
        userProfileModalContent.classList.add('scale-95');
        setTimeout(() => {
            userProfileModal.classList.add('hidden');
            userProfileModal.classList.remove('flex');
        }, 200);
    };

});

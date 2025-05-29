document.addEventListener('DOMContentLoaded', function() {
    // Configuration
    const API_URL = "https://yourusername-voicewave.hf.space/api/predict"; // Replace with your HF Space URL
    const MAX_TEXT_LENGTH = 5000;
    
    // DOM Elements
    const elements = {
        textInput: document.getElementById('textInput'),
        languageSelect: document.getElementById('languageSelect'),
        playButton: document.getElementById('playButton'),
        stopButton: document.getElementById('stopButton'),
        downloadButton: document.getElementById('downloadButton'),
        status: document.getElementById('status'),
        audioPlayer: document.getElementById('audioPlayer'),
        charCounter: document.getElementById('charCounter'),
        voiceGrid: document.getElementById('voiceGrid'),
        voiceSearch: document.getElementById('voiceSearch')
    };

    // State
    let currentAudio = {
        url: null,
        blob: null,
        language: 'en'
    };

    // Initialization
    init();

    async function init() {
        setupEventListeners();
        updateCharacterCount();
        loadLanguages();
    }

    async function loadLanguages() {
    try {
        const response = await fetch('languages.json');
        const languages = await response.json();
        populateVoiceGrid(languages);
        populateLanguageDropdown(languages); // NEW
    } catch (error) {
        showError('Failed to load languages');
    }
    }

    function populateLanguageDropdown(languages) {
    const dropdown = document.getElementById('languageSelect');
    dropdown.innerHTML = ''; // Clear existing options

    Object.entries(languages).forEach(([code, lang]) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = lang.name;
        dropdown.appendChild(option);
    });

    // Set default selection to "en" or the first available
    dropdown.value = 'en' in languages ? 'en' : Object.keys(languages)[0];
    }


    function populateVoiceGrid(languages) {
        elements.voiceGrid.innerHTML = '';
        
        Object.entries(languages).forEach(([code, lang]) => {
            const voiceButton = createVoiceButton(code, lang);
            elements.voiceGrid.appendChild(voiceButton);
        });
    }

    function createVoiceButton(code, lang) {
        const button = document.createElement('div');
        button.className = 'voice-button';
        button.innerHTML = `
            <div class="voice-icon">${getFlagEmoji(code)}</div>
            <div class="voice-name">${lang.name}</div>
            <div class="voice-description">${code.toUpperCase()}</div>
        `;

        button.addEventListener('click', () => {
            document.querySelectorAll('.voice-button').forEach(btn => 
                btn.classList.remove('active'));
            button.classList.add('active');
            currentAudio.language = code;
        });

        return button;
    }

    function getFlagEmoji(code) {
        const flags = {
            'en': '🇬🇧', 'hi': '🇮🇳', 'ta': '🇮🇳',
            'te': '🇮🇳', 'es': '🇪🇸', 'fr': '🇫🇷'
        };
        return flags[code] || '🌐';
    }

    async function generateAudio() {
        try {
            const text = elements.textInput.value.trim();
            if (!validateText(text)) return;

            showLoading('Generating audio...');
            disableControls(true);

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    data: [
                        text,
                        currentAudio.language
                    ]
                })
            });

            if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
            
            const result = await response.json();
            handleAudioResponse(result);

        } catch (error) {
            handleGenerationError(error);
        }
    }

    function handleAudioResponse(response) {
        const audioPath = response.data[0];
        currentAudio.url = `https://yourusername-voicewave.hf.space/file=${audioPath}`;
        
        elements.audioPlayer.src = currentAudio.url;
        elements.audioPlayer.play();
        
        elements.audioPlayer.onended = () => {
            showSuccess('Playback completed');
            disableControls(false);
        };

        elements.audioCard.classList.add('active');
        showSuccess('Audio ready!');
    }

    async function downloadAudio(format) {
        if (!currentAudio.url) {
            showError('Generate audio first');
            return;
        }

        try {
            const response = await fetch(currentAudio.url);
            const blob = await response.blob();
            triggerDownload(blob, format);
            showSuccess(`${format.toUpperCase()} downloaded!`);
        } catch (error) {
            handleDownloadError(error);
        }
    }

    // Helper functions
    function validateText(text) {
        if (!text) {
            showError('Please enter some text');
            return false;
        }
        if (text.length > MAX_TEXT_LENGTH) {
            showError(`Text too long (max ${MAX_TEXT_LENGTH} characters)`);
            return false;
        }
        return true;
    }

    function triggerDownload(blob, format) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `voicewave_${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function setupEventListeners() {
        // Text input
        elements.textInput.addEventListener('input', updateCharacterCount);
        
        // Controls
        elements.playButton.addEventListener('click', generateAudio);
        elements.stopButton.addEventListener('click', () => {
            elements.audioPlayer.pause();
            elements.audioPlayer.currentTime = 0;
            disableControls(false);
            elements.status.className = 'status';
        });
        
        // Downloads
        elements.downloadButton.addEventListener('click', () => downloadAudio('wav'));
        document.getElementById('downloadMP3').addEventListener('click', () => downloadAudio('mp3'));
        document.getElementById('downloadWAV').addEventListener('click', () => downloadAudio('wav'));
        
        // Voice search
        elements.voiceSearch.addEventListener('input', filterVoices);
    }

    function filterVoices() {
        const searchTerm = elements.voiceSearch.value.toLowerCase();
        document.querySelectorAll('.voice-button').forEach(button => {
            const name = button.querySelector('.voice-name').textContent.toLowerCase();
            const lang = button.querySelector('.voice-description').textContent.toLowerCase();
            button.style.display = (name.includes(searchTerm) || 
                                  (lang.includes(searchTerm)) ? 'flex' : 'none';
        });
    }

    // UI Updates
    function updateCharacterCount() {
        elements.charCounter.textContent = 
            `${elements.textInput.value.length} characters`;
    }

    function showLoading(message) {
        elements.status.innerHTML = `
            <div class="wave-animation">
                ${Array(5).fill('<div class="wave-bar"></div>').join('')}
            </div>
            ${message}
        `;
        elements.status.className = 'status playing';
    }

    function showSuccess(message) {
        elements.status.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        elements.status.className = 'status success';
    }

    function showError(message) {
        elements.status.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        elements.status.className = 'status error';
    }

    function disableControls(disabled) {
        elements.playButton.disabled = disabled;
        elements.stopButton.disabled = !disabled;
        elements.downloadButton.disabled = disabled;
        elements.textInput.disabled = disabled;
    }

    function handleGenerationError(error) {
        console.error('Generation error:', error);
        showError(`Failed to generate audio: ${error.message}`);
        disableControls(false);
    }

    function handleDownloadError(error) {
        console.error('Download error:', error);
        showError(`Download failed: ${error.message}`);
    }
});
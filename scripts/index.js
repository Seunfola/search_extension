class VoiceSearchEngine {
    constructor() {
        this.recognition = null;
        this.synth = window.speechSynthesis;
        this.isListening = false;
        this.loadVoices();
    }

    loadVoices() {
        this.voices = [];
        const load = () => {
            this.voices = this.synth.getVoices();
            this.defaultVoice = this.voices.find(v => v.default) || this.voices[0];
        };
        this.synth.onvoiceschanged = load;
        load();
    }

    initVoiceRecognition() {
        this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = navigator.language || 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            document.getElementById('inputModeToggle').classList.add('recording');
        };

        this.recognition.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            document.getElementById('keywords').value = transcript;
            this.triggerSearch();
        };

        this.recognition.onerror = (e) => {
            console.error('Speech recognition error:', e.error);
            this.isListening = false;
        };

        this.recognition.onend = () => {
            this.isListening = false;
            document.getElementById('inputModeToggle').classList.remove('recording');
        };
    }

    triggerSearch() {
        document.getElementById('searchButton').click();
    }

    speak(text) {
        if (this.synth.speaking) this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = this.defaultVoice;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;

        this.synth.speak(utterance);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const voiceEngine = new VoiceSearchEngine();
    const ttsToggle = document.getElementById('ttsToggle');
    const inputModeToggle = document.getElementById('inputModeToggle');
    const keywordsInput = document.getElementById('keywords');
    const matchList = document.getElementById('matchList');
    let isVoiceMode = true;

    // Toggle between voice and text mode
    inputModeToggle.addEventListener('click', () => {
        isVoiceMode = !isVoiceMode;
        inputModeToggle.classList.toggle('voice-mode', isVoiceMode);
        keywordsInput.disabled = isVoiceMode;
        inputModeToggle.textContent = isVoiceMode ? '🎤' : '⌨️';
        inputModeToggle.setAttribute('aria-label', isVoiceMode ? 'Switch to text mode' : 'Switch to voice mode');
    });

    // Voice Button Handler
    inputModeToggle.addEventListener('click', () => {
        if (isVoiceMode && !voiceEngine.isListening) {
            voiceEngine.initVoiceRecognition();
            voiceEngine.recognition.start();
        }
    });

    // Search Handler
    document.getElementById('searchButton').addEventListener('click', () => {
        const keywords = document.getElementById('keywords').value.trim().split(/\s+/);
        const caseSensitive = document.getElementById('caseSensitive').checked;

        if (keywords.length > 0) {
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'search',
                    keywords: keywords,
                    caseSensitive: caseSensitive
                }, response => {
                    const resultText = `Found ${response.count} matches:`;
                    document.getElementById('matchCount').textContent = resultText;

                    // Display all matches
                    matchList.innerHTML = '';
                    response.matches.forEach((match, index) => {
                        const li = document.createElement('li');
                        li.textContent = `${index + 1}. ${match}`;
                        li.style.padding = '5px';
                        li.style.borderBottom = '1px solid #ddd';
                        li.style.fontSize = '0.9em';
                        matchList.appendChild(li);
                    });

                    if (ttsToggle.checked) {
                        voiceEngine.speak(resultText);
                    }
                });
            });
        }
    });

    // Clear Handler
    document.getElementById('clearButton').addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'clear' }, () => {
                document.getElementById('keywords').value = '';
                document.getElementById('matchCount').textContent = '';
                matchList.innerHTML = '';
            });
        });
    });

    // Settings Persistence
    chrome.storage.sync.get(['ttsEnabled', 'caseSensitive'], data => {
        ttsToggle.checked = data.ttsEnabled ?? true;
        document.getElementById('caseSensitive').checked = data.caseSensitive ?? false;
    });

    ttsToggle.addEventListener('change', () => {
        chrome.storage.sync.set({ ttsEnabled: ttsToggle.checked });
    });

    document.getElementById('caseSensitive').addEventListener('change', function () {
        chrome.storage.sync.set({ caseSensitive: this.checked });
    });
});
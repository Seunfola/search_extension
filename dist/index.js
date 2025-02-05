var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class VoiceSearchEngine {
    constructor() {
        this.recognition = null;
        this.synth = window.speechSynthesis;
        this.isListening = false;
        this.voices = [];
        this.defaultVoice = null;
        this.loadVoices();
    }
    loadVoices() {
        const load = () => {
            this.voices = this.synth.getVoices();
            this.defaultVoice = this.voices.find(v => v.default) || this.voices[0];
        };
        this.synth.onvoiceschanged = load;
        load();
    }
    initVoiceRecognition() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (!SpeechRecognition) {
                    reject('Speech recognition not supported');
                    return;
                }
                this.recognition = new SpeechRecognition();
                this.recognition.continuous = true;
                this.recognition.interimResults = false;
                this.recognition.lang = navigator.language || 'en-US';
                this.recognition.onstart = () => {
                    this.isListening = true;
                    this.updateUIListeningState(true);
                    resolve();
                };
                this.recognition.onresult = (e) => {
                    const transcript = e.results[e.results.length - 1][0].transcript;
                    this.setSearchInput(transcript);
                    this.triggerSearch();
                };
                this.recognition.onerror = (e) => {
                    this.handleRecognitionError(e);
                    reject(e.error);
                };
                this.recognition.onend = () => {
                    this.isListening = false;
                    this.updateUIListeningState(false);
                };
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then(() => { var _a; return (_a = this.recognition) === null || _a === void 0 ? void 0 : _a.start(); })
                    .catch(err => this.handleMicError(err));
            });
        });
    }
    updateUIListeningState(listening) {
        const input = document.getElementById('searchInput');
        const button = document.getElementById('inputModeToggle');
        if (button) {
            button.classList.toggle('recording', listening);
            input.placeholder = listening ? 'Listening...' : 'Click mic to start speaking...';
        }
    }
    setSearchInput(value) {
        const input = document.getElementById('searchInput');
        if (input)
            input.value = value;
    }
    handleRecognitionError(e) {
        console.error('Speech recognition error:', e.error);
        this.isListening = false;
        this.updateUIListeningState(false);
        alert(`Speech recognition error: ${e.error}`);
    }
    handleMicError(error) {
        console.error('Microphone access denied:', error);
        alert('Please enable microphone access in your browser settings.');
    }
    triggerSearch() {
        const button = document.getElementById('searchButton');
        if (button)
            button.click();
    }
    speak(text) {
        if (this.synth.speaking)
            this.synth.cancel();
        if (!this.defaultVoice)
            return;
        try {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.voice = this.defaultVoice;
            Object.assign(utterance, {
                rate: 1.0,
                pitch: 1.0,
                volume: 0.8
            });
            this.synth.speak(utterance);
        }
        catch (error) {
            console.error('Text-to-speech failed:', error);
        }
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const getElement = (id) => {
        const el = document.getElementById(id);
        if (!el)
            throw new Error(`Element ${id} not found`);
        return el;
    };
    const voiceEngine = new VoiceSearchEngine();
    const inputModeToggle = getElement('inputModeToggle');
    const searchInput = getElement('searchInput');
    const searchButton = getElement('searchButton');
    const clearButton = getElement('clearButton');
    const resultList = getElement('resultList');
    const resultCount = getElement('resultCount');
    const ttsToggle = getElement('ttsToggle');
    const caseSensitive = getElement('caseSensitive');
    let isVoiceMode = true;
    // Initialize voice mode
    searchInput.disabled = true;
    inputModeToggle.classList.add('voice-mode');
    inputModeToggle.addEventListener('click', () => {
        isVoiceMode = !isVoiceMode;
        searchInput.disabled = isVoiceMode;
        inputModeToggle.classList.toggle('voice-mode', isVoiceMode);
        inputModeToggle.textContent = isVoiceMode ? '🎤' : '⌨️';
        searchInput.placeholder = isVoiceMode ? 'Click mic to start speaking...' : 'Type your search terms...';
        if (!isVoiceMode)
            searchInput.focus();
    });
    inputModeToggle.addEventListener('click', () => {
        if (isVoiceMode && !voiceEngine.isListening) {
            voiceEngine.initVoiceRecognition()
                .catch(err => console.error('Voice recognition failed:', err));
        }
    });
    searchButton.addEventListener('click', () => {
        const keywords = searchInput.value.trim().split(/\s+/).filter(Boolean);
        if (!keywords.length) {
            resultCount.textContent = 'Please enter search terms';
            resultList.innerHTML = '';
            return;
        }
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            var _a;
            if (!((_a = tabs[0]) === null || _a === void 0 ? void 0 : _a.id))
                return;
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'search',
                keywords,
                caseSensitive: caseSensitive.checked
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Runtime error:', chrome.runtime.lastError);
                    return;
                }
                const resultText = (response === null || response === void 0 ? void 0 : response.count)
                    ? `Found ${response.count} matches`
                    : 'No matches found';
                resultCount.textContent = resultText;
                resultList.innerHTML = ((response === null || response === void 0 ? void 0 : response.matches) || [])
                    .map((match, index) => `
                <li>
                    <span class="match-number">${index + 1}.</span>
                    <span class="match-text">${match}</span>
                </li>
            `).join('');
                if (ttsToggle.checked)
                    voiceEngine.speak(resultText);
            });
        });
    });
    clearButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            var _a;
            if ((_a = tabs[0]) === null || _a === void 0 ? void 0 : _a.id) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'clear' });
            }
            searchInput.value = '';
            resultList.innerHTML = '';
            resultCount.textContent = '';
        });
    });
    chrome.storage.sync.get(['ttsEnabled', 'caseSensitive'], data => {
        var _a, _b;
        ttsToggle.checked = (_a = data.ttsEnabled) !== null && _a !== void 0 ? _a : true;
        caseSensitive.checked = (_b = data.caseSensitive) !== null && _b !== void 0 ? _b : false;
    });
    ttsToggle.addEventListener('change', () => {
        chrome.storage.sync.set({ ttsEnabled: ttsToggle.checked });
    });
    caseSensitive.addEventListener('change', () => {
        chrome.storage.sync.set({ caseSensitive: caseSensitive.checked });
    });
    searchInput.addEventListener('keypress', e => {
        if (e.key === 'Enter')
            searchButton.click();
    });
});
export {};
//# sourceMappingURL=index.js.map
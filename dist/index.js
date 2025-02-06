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
    const voiceEngine = new VoiceSearchEngine();
    const getElement = (id) => document.getElementById(id) || (() => { throw new Error(`${id} not found`); })();
    const elements = {
        inputModeToggle: getElement('inputModeToggle'),
        searchInput: getElement('searchInput'),
        searchButton: getElement('searchButton'),
        clearButton: getElement('clearButton'),
        resultList: getElement('resultList'),
        resultCount: getElement('resultCount'),
        ttsToggle: getElement('ttsToggle'),
        caseSensitive: getElement('caseSensitive')
    };
    let isVoiceMode = true;
    elements.searchInput.disabled = true;
    elements.inputModeToggle.classList.add('voice-mode');
    // Input mode toggle
    elements.inputModeToggle.addEventListener('click', () => {
        isVoiceMode = !isVoiceMode;
        elements.searchInput.disabled = isVoiceMode;
        elements.inputModeToggle.classList.toggle('voice-mode', isVoiceMode);
        elements.inputModeToggle.textContent = isVoiceMode ? '🎤' : '⌨️';
        elements.searchInput.placeholder = isVoiceMode
            ? 'Click mic to start speaking...'
            : 'Type your search terms...';
        if (!isVoiceMode)
            elements.searchInput.focus();
    });
    // Voice recognition
    elements.inputModeToggle.addEventListener('click', () => __awaiter(void 0, void 0, void 0, function* () {
        if (isVoiceMode && !voiceEngine.isListening) {
            try {
                yield voiceEngine.initVoiceRecognition();
            }
            catch (error) {
                elements.resultCount.textContent = `Error: ${error.message}`;
            }
        }
    }));
    // Search handler
    elements.searchButton.addEventListener('click', () => __awaiter(void 0, void 0, void 0, function* () {
        const rawInput = elements.searchInput.value.trim();
        // Handle single character searches
        const keywords = rawInput.length === 1
            ? [rawInput]
            : rawInput.split(/\s+/).filter(Boolean);
        if (!keywords.length) {
            elements.resultCount.textContent = 'Please enter search terms';
            elements.resultList.innerHTML = '';
            return;
        }
        try {
            const [tab] = yield chrome.tabs.query({
                active: true,
                currentWindow: true,
                status: 'complete'
            });
            if (!(tab === null || tab === void 0 ? void 0 : tab.id))
                throw new Error('No active tab found');
            // Ensure content script is injected
            yield chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['dist/content.js']
            });
            // Send message with retries
            const response = yield sendMessageWithRetry(tab.id, {
                action: 'search',
                keywords,
                caseSensitive: elements.caseSensitive.checked
            });
            handleSearchResponse(response);
        }
        catch (error) {
            console.error('Search failed:', error);
            elements.resultCount.textContent = `Error: ${error.message}`;
        }
    }));
    // Clear handler
    elements.clearButton.addEventListener('click', () => __awaiter(void 0, void 0, void 0, function* () {
        const [tab] = yield chrome.tabs.query({ active: true, currentWindow: true });
        if (tab === null || tab === void 0 ? void 0 : tab.id) {
            yield chrome.tabs.sendMessage(tab.id, { action: 'clear' });
        }
        elements.searchInput.value = '';
        elements.resultList.innerHTML = '';
        elements.resultCount.textContent = '';
    }));
    // Settings persistence
    chrome.storage.sync.get(['ttsEnabled', 'caseSensitive'], data => {
        var _a, _b;
        elements.ttsToggle.checked = (_a = data.ttsEnabled) !== null && _a !== void 0 ? _a : true;
        elements.caseSensitive.checked = (_b = data.caseSensitive) !== null && _b !== void 0 ? _b : false;
    });
    elements.ttsToggle.addEventListener('change', () => {
        chrome.storage.sync.set({ ttsEnabled: elements.ttsToggle.checked });
    });
    elements.caseSensitive.addEventListener('change', () => {
        chrome.storage.sync.set({ caseSensitive: elements.caseSensitive.checked });
    });
    // Enter key support
    elements.searchInput.addEventListener('keypress', e => {
        if (e.key === 'Enter')
            elements.searchButton.click();
    });
    function sendMessageWithRetry(tabId_1, message_1) {
        return __awaiter(this, arguments, void 0, function* (tabId, message, retries = 3) {
            try {
                return yield chrome.tabs.sendMessage(tabId, message);
            }
            catch (error) {
                if (retries > 0) {
                    yield new Promise(resolve => setTimeout(resolve, 300));
                    return sendMessageWithRetry(tabId, message, retries - 1);
                }
                throw error;
            }
        });
    }
    function handleSearchResponse(response) {
        const count = (response === null || response === void 0 ? void 0 : response.count) || 0;
        const matches = (response === null || response === void 0 ? void 0 : response.matches) || [];
        elements.resultCount.textContent = count
            ? `Found ${count} matches`
            : 'No matches found';
        elements.resultList.innerHTML = matches
            .map((match, index) => `
        <li>
          <span class="match-number">${index + 1}.</span>
          <span class="match-text">${match}</span>
        </li>
      `).join('');
        if (elements.ttsToggle.checked) {
            voiceEngine.speak(elements.resultCount.textContent || '');
        }
    }
});
export {};
//# sourceMappingURL=index.js.map
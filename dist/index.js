"use strict";
/// <reference types="chrome" />
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class VoiceSearch {
    constructor() {
        this.recognition = null;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
                this.recognition.lang = navigator.language;
                this.recognition.onresult = (e) => {
                    const transcript = e.results[0][0].transcript;
                    document.getElementById('searchInput').value = transcript;
                    this.search();
                };
                this.recognition.start();
                resolve();
            });
        });
    }
    search() {
        document.getElementById('searchButton').click();
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const voice = new VoiceSearch();
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const voiceButton = document.getElementById('inputModeToggle');
    // Voice search
    voiceButton.addEventListener('click', () => voice.start());
    // Text search
    searchButton.addEventListener('click', () => __awaiter(void 0, void 0, void 0, function* () {
        const searchString = searchInput.value.trim();
        if (!searchString)
            return;
        const [tab] = yield chrome.tabs.query({ active: true, currentWindow: true });
        if (!(tab === null || tab === void 0 ? void 0 : tab.id))
            return;
        try {
            // Inject content script if not already present
            yield chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['dist/content.js']
            });
            // Send search string to content script
            yield chrome.tabs.sendMessage(tab.id, {
                action: 'search',
                searchString
            });
        }
        catch (error) {
            console.error('Search failed:', error);
        }
    }));
    // Clear results
    const clearButton = document.getElementById('clearButton');
    clearButton.addEventListener('click', () => __awaiter(void 0, void 0, void 0, function* () {
        const [tab] = yield chrome.tabs.query({ active: true, currentWindow: true });
        if (tab === null || tab === void 0 ? void 0 : tab.id) {
            yield chrome.tabs.sendMessage(tab.id, { action: 'clear' });
        }
        searchInput.value = '';
    }));
});
//# sourceMappingURL=index.js.map
/// <reference types="chrome" />
import { ExtensionMessage, SearchResult } from './types';

declare global {
  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

class VoiceSearchEngine {
  private recognition: SpeechRecognition | null = null;
  private synth = window.speechSynthesis;
  public isListening = false;
  private voices: SpeechSynthesisVoice[] = [];
  private defaultVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.loadVoices();
  }

  private loadVoices(): void {
    const load = () => {
      this.voices = this.synth.getVoices();
      this.defaultVoice = this.voices.find(v => v.default) || this.voices[0];
    };
    this.synth.onvoiceschanged = load;
    load();
  }

  async initVoiceRecognition(): Promise<void> {
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

      this.recognition.onresult = (e: SpeechRecognitionEvent) => {
        const transcript = e.results[e.results.length - 1][0].transcript;
        this.setSearchInput(transcript);
        this.triggerSearch();
      };

      this.recognition.onerror = (e: Event) => {
        this.handleRecognitionError(e as SpeechRecognitionErrorEvent);
        reject((e as SpeechRecognitionErrorEvent).error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.updateUIListeningState(false);
      };

      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => this.recognition?.start())
        .catch(err => this.handleMicError(err));
    });
  }

  private updateUIListeningState(listening: boolean): void {
    const input = document.getElementById('searchInput') as HTMLInputElement;
    const button = document.getElementById('inputModeToggle');
    if (button) {
      button.classList.toggle('recording', listening);
      input.placeholder = listening ? 'Listening...' : 'Click mic to start speaking...';
    }
  }

  private setSearchInput(value: string): void {
    const input = document.getElementById('searchInput') as HTMLInputElement;
    if (input) input.value = value;
  }

  private handleRecognitionError(e: SpeechRecognitionErrorEvent): void {
    console.error('Speech recognition error:', e.error);
    this.isListening = false;
    this.updateUIListeningState(false);
    alert(`Speech recognition error: ${e.error}`);
  }

  private handleMicError(error: Error): void {
    console.error('Microphone access denied:', error);
    alert('Please enable microphone access in your browser settings.');
  }

  triggerSearch(): void {
    const button = document.getElementById('searchButton');
    if (button) button.click();
  }

  speak(text: string): void {
    if (this.synth.speaking) this.synth.cancel();
    if (!this.defaultVoice) return;

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = this.defaultVoice;
      Object.assign(utterance, {
        rate: 1.0,
        pitch: 1.0,
        volume: 0.8
      });
      this.synth.speak(utterance);
    } catch (error) {
      console.error('Text-to-speech failed:', error);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const getElement = <T extends HTMLElement>(id: string): T => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Element ${id} not found`);
    return el as T;
  };

  const voiceEngine = new VoiceSearchEngine();
  const inputModeToggle = getElement<HTMLButtonElement>('inputModeToggle');
  const searchInput = getElement<HTMLInputElement>('searchInput');
  const searchButton = getElement<HTMLButtonElement>('searchButton');
  const clearButton = getElement<HTMLButtonElement>('clearButton');
  const resultList = getElement<HTMLUListElement>('resultList');
  const resultCount = getElement<HTMLElement>('resultCount');
  const ttsToggle = getElement<HTMLInputElement>('ttsToggle');
  const caseSensitive = getElement<HTMLInputElement>('caseSensitive');

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

    if (!isVoiceMode) searchInput.focus();
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
      if (!tabs[0]?.id) return;

      chrome.tabs.sendMessage<ExtensionMessage, SearchResult>(
        tabs[0].id,
        {
          action: 'search',
          keywords,
          caseSensitive: caseSensitive.checked
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Runtime error:', chrome.runtime.lastError);
            return;
          }

          const resultText = response?.count 
            ? `Found ${response.count} matches`
            : 'No matches found';
            
          resultCount.textContent = resultText;
        interface SearchResultResponse {
            count: number;
            matches: string[];
        }

        resultList.innerHTML = (response?.matches || [] as string[])
            .map((match: string, index: number) => `
                <li>
                    <span class="match-number">${index + 1}.</span>
                    <span class="match-text">${match}</span>
                </li>
            `).join('');

          if (ttsToggle.checked) voiceEngine.speak(resultText);
        }
      );
    });
  });

  clearButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'clear' });
      }
      searchInput.value = '';
      resultList.innerHTML = '';
      resultCount.textContent = '';
    });
  });

  chrome.storage.sync.get(['ttsEnabled', 'caseSensitive'], data => {
    ttsToggle.checked = data.ttsEnabled ?? true;
    caseSensitive.checked = data.caseSensitive ?? false;
  });

  ttsToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ ttsEnabled: ttsToggle.checked });
  });

  caseSensitive.addEventListener('change', () => {
    chrome.storage.sync.set({ caseSensitive: caseSensitive.checked });
  });

  searchInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') searchButton.click();
  });
});
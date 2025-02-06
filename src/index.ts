/// <reference types="chrome" />

class VoiceSearch {
  private recognition: SpeechRecognition | null = null;

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      this.recognition.lang = navigator.language;
      this.recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        (document.getElementById('searchInput') as HTMLInputElement).value = transcript;
        this.search();
      };
      this.recognition.start();
      resolve();
    });
  }

  search(): void {
    document.getElementById('searchButton')!.click();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const voice = new VoiceSearch();
  const searchInput = document.getElementById('searchInput') as HTMLInputElement;
  const searchButton = document.getElementById('searchButton') as HTMLButtonElement;
  const voiceButton = document.getElementById('inputModeToggle') as HTMLButtonElement;

  // Voice search
  voiceButton.addEventListener('click', () => voice.start());

  // Text search
  searchButton.addEventListener('click', async () => {
    const searchString = searchInput.value.trim();
    if (!searchString) return;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    try {
      // Inject content script if not already present
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['dist/content.js']
      });

      // Send search string to content script
      await chrome.tabs.sendMessage(tab.id, {
        action: 'search',
        searchString
      });

    } catch (error) {
      console.error('Search failed:', error);
    }
  });

  // Clear results
  const clearButton = document.getElementById('clearButton') as HTMLButtonElement;
  clearButton.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, { action: 'clear' });
    }
    searchInput.value = '';
  });
});
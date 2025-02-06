class VoiceSearch {
  private recognition: SpeechRecognition | null = null;

  async start() {
    return new Promise<void>((resolve, reject) => {
      this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      this.recognition.lang = navigator.language;
      this.recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        (document.getElementById('searchInput') as HTMLInputElement)!.value = transcript;
        this.search();
      };
      this.recognition.start();
      resolve();
    });
  }

  search() {
    document.getElementById('searchButton')!.click();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const voice = new VoiceSearch();
  const searchInput = document.getElementById('searchInput') as HTMLInputElement;
  const searchButton = document.getElementById('searchButton') as HTMLButtonElement;
  const voiceButton = document.getElementById('voiceButton') as HTMLButtonElement;

  // Voice search
  voiceButton.addEventListener('click', () => voice.start());

  // Text search
  searchButton.addEventListener('click', async () => {
    const keywords = searchInput.value.trim().split(/\s+/).filter(Boolean);
    if (!keywords.length) return;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['dist/content.js']
      });

      await chrome.tabs.sendMessage(tab.id, {
        action: 'search',
        keywords
      });

    } catch (error) {
      console.error('Search failed:', error);
    }
  });
});
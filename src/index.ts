document.addEventListener('DOMContentLoaded', () => {
  const searchButton = document.getElementById('searchButton') as HTMLButtonElement;
  const clearButton = document.getElementById('clearButton') as HTMLButtonElement;
  const caseSensitive = document.getElementById('caseSensitive') as HTMLInputElement;
  const keywordsInput = document.getElementById('keywords') as HTMLInputElement;
  const matchCount = document.getElementById('matchCount') as HTMLDivElement;

  // Load saved settings from Chrome storage
  chrome.storage.sync.get(['keywords', 'caseSensitive'], (data: { keywords?: string; caseSensitive?: boolean }) => {
    if (data.keywords) keywordsInput.value = data.keywords;
    caseSensitive.checked = !!data.caseSensitive;
  });

  searchButton.addEventListener('click', () => {
    const keywords = keywordsInput.value.trim();
    if (!keywords) {
      matchCount.textContent = 'Please enter keywords';
      return;
    }

    // Save settings
    chrome.storage.sync.set({
      keywords: keywords,
      caseSensitive: caseSensitive.checked,
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          {
            action: 'search',
            keywords: keywords,
            caseSensitive: caseSensitive.checked,
          },
          updateMatchCount
        );
      }
    });
  });

  clearButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'clear' }, () => {
          matchCount.textContent = 'Highlights cleared';
          keywordsInput.value = '';
        });
      }
    });
  });

  function updateMatchCount(response: { count: number; matchedWords?: string[] }) {
    if (response && response.count > 0) {
      matchCount.textContent = `${response.count} matches found: ${
        response.matchedWords ? response.matchedWords.join(', ') : ''
      }`;
      matchCount.style.color = '#4CAF50';
    } else {
      matchCount.textContent = 'No matches found';
      matchCount.style.color = '#ff0000';
    }
  }
});

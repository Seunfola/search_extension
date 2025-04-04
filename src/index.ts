// src/index.ts

const keywordsInput = document.getElementById('keywords') as HTMLInputElement;
const caseCheckbox = document.getElementById('caseSensitive') as HTMLInputElement;
const searchButton = document.getElementById('searchButton') as HTMLButtonElement;
const clearButton = document.getElementById('clearButton') as HTMLButtonElement;
const matchCount = document.getElementById('matchCount')!;
const matchList = document.getElementById('matchList')!;

searchButton.addEventListener('click', async () => {
  const keywords = keywordsInput.value.trim().split(/\s+/).filter(Boolean);
  const caseSensitive = caseCheckbox.checked;

  if (!keywords.length) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) return;

  chrome.tabs.sendMessage(
    tab.id,
    { type: 'HIGHLIGHT_KEYWORDS', keywords, caseSensitive },
    (response) => {
      if (!response) return;

      matchCount.textContent = `${response.count} match${response.count !== 1 ? 'es' : ''} found`;
      matchList.innerHTML = '';

      response.matches.forEach((match: string) => {
        const li = document.createElement('li');
        li.textContent = match;
        matchList.appendChild(li);
      });
    }
  );
});

clearButton.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) return;

  chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_HIGHLIGHTS' }, () => {
    matchCount.textContent = '';
    matchList.innerHTML = '';
  });

  keywordsInput.value = '';
});

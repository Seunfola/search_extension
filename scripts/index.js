document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('searchButton');
    const clearButton = document.getElementById('clearButton');
    const caseSensitive = document.getElementById('caseSensitive');
    const keywordsInput = document.getElementById('keywords');
    const matchCount = document.getElementById('matchCount');

    // Load saved settings
    chrome.storage.sync.get(['keywords', 'caseSensitive'], (data) => {
        if (data.keywords) keywordsInput.value = data.keywords;
        caseSensitive.checked = !!data.caseSensitive;
    });

    searchButton.addEventListener('click', () => {
        const keywords = keywordsInput.value.trim();
        if (!keywords) {
            matchCount.textContent = 'Please enter keywords';
            return;
        }

        chrome.storage.sync.set({
            keywords: keywords,
            caseSensitive: caseSensitive.checked
        });

        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'search',
                keywords: keywords,
                caseSensitive: caseSensitive.checked
            }, updateMatchCount);
        });
    });

    clearButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'clear'
            }, () => {
                matchCount.textContent = 'Highlights cleared';
                keywordsInput.value = '';
            });
        });
    });

    function updateMatchCount(response) {
        if (response && response.count > 0) {
            matchCount.textContent = `${response.count} matches found`;
            matchCount.style.color = '#4CAF50';
        } else {
            matchCount.textContent = 'No matches found';
            matchCount.style.color = '#ff0000';
        }
    }
});
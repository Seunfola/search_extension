// Load saved settings

chrome.storage.sync.get(['keywords', 'caseSensitive', 'ttsEnabled'], (data) => {
    keywordsInput.value = data.keywords || '';
    caseSensitive.checked = Boolean(data.caseSensitive);
    ttsToggle.checked = Boolean(data.ttsEnabled);
});

// Save settings
ttsToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ ttsEnabled: ttsToggle.checked });
});
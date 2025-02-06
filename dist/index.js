
document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('searchButton');
    const clearButton = document.getElementById('clearButton');
    const caseSensitive = document.getElementById('caseSensitive');
    const keywordsInput = document.getElementById('keywords');
    const matchCount = document.getElementById('matchCount');
    const matchList = document.createElement('ul');
    // Configure match list styling
    matchList.id = 'matchList';
    matchList.style.maxHeight = '200px';
    matchList.style.overflowY = 'auto';
    matchList.style.padding = '0';
    matchList.style.margin = '10px 0 0 0';
    document.querySelector('.container').appendChild(matchList);

    // Load saved settings
    chrome.storage.sync.get(['keywords', 'caseSensitive'], (data) => {
        keywordsInput.value = data.keywords || '';
        caseSensitive.checked = Boolean(data.caseSensitive);
    });

    searchButton.addEventListener('click', () => {
        const keywords = keywordsInput.value.trim();
        if (!keywords) {
            showMessage('Please enter keywords', 'error');
            return;
        }

        // Save settings and search
        chrome.storage.sync.set({
            keywords: keywords,
            caseSensitive: caseSensitive.checked
        }, () => {
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'search',
                    keywords: keywords,
                    caseSensitive: caseSensitive.checked
                }, response => {
                    if (chrome.runtime.lastError) {
                        showMessage('Error communicating with content script', 'error');
                        return;
                    }
                    updateMatchDisplay(response);
                });
            });
        });
    });

    clearButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'clear' }, () => {
                keywordsInput.value = '';
                showMessage('Highlights cleared', 'success');
                matchList.innerHTML = '';
            });
        });
    });

    function updateMatchDisplay(response) {
        matchList.innerHTML = '';
        matchCount.textContent = '';
        if (response && response.count > 0) {
            showMessage(`${response.count} matches found`, 'success');
            response.matches.forEach((matchText, index) => {
                const li = document.createElement('li');
                li.textContent = `${index + 1}. ${matchText}`;
                li.style.padding = '5px';
                li.style.borderBottom = '1px solid #ddd';
                li.style.fontSize = '0.9em';
                matchList.appendChild(li);
            });
        } else {
            showMessage('No matches found', 'error');
        }
    }
    function showMessage(message, type) {
        matchCount.textContent = message;
        matchCount.style.color = type === 'error' ? '#ff4444' : '#00c851';
        matchCount.style.fontWeight = '500';
        matchCount.style.margin = '10px 0';
    }
});
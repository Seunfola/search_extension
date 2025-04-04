// index.ts

// DOM Elements
const searchButton = document.getElementById('searchButton') as HTMLButtonElement;
const keywordsInput = document.getElementById('keywords') as HTMLInputElement;
const caseSensitiveToggle = document.getElementById('caseSensitive') as HTMLInputElement;
const clearButton = document.getElementById('clearButton') as HTMLButtonElement;
const matchCountDisplay = document.getElementById('matchCount') as HTMLDivElement;
const matchList = document.getElementById('matchList') as HTMLUListElement;
const nextButton = document.getElementById('nextMatch') as HTMLButtonElement;
const prevButton = document.getElementById('prevMatch') as HTMLButtonElement;

// Initialize state
let currentMatches: string[] = [];

// Function to handle search
const handleSearch = () => {
    const keywords = keywordsInput.value.trim();
    const caseSensitive = caseSensitiveToggle.checked;
    
    if (keywords) {
        // Send search data to content script to highlight matches
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id! },
                func: searchKeywords,  // changed function to func
                args: [keywords, caseSensitive],
            });
        });
    }
};

// Function to send search request to content script
const searchKeywords = (keywords: string, caseSensitive: boolean) => {
    chrome.runtime.sendMessage({ action: 'search', keywords, caseSensitive });
};

// Function to clear the search results
const clearResults = () => {
    keywordsInput.value = '';
    matchCountDisplay.textContent = '';
    matchList.innerHTML = '';
    chrome.runtime.sendMessage({ action: 'clear' });
};

// Event listeners for buttons
searchButton.addEventListener('click', handleSearch);
clearButton.addEventListener('click', clearResults);

// Function to handle next match navigation
const handleNextMatch = () => {
    chrome.runtime.sendMessage({ action: 'nextMatch' });
};

// Function to handle previous match navigation
const handlePrevMatch = () => {
    chrome.runtime.sendMessage({ action: 'prevMatch' });
};

// Listen for updates from the content script
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'updateMatchCount') {
        // Update the match count
        const { matchCount } = message;
        matchCountDisplay.textContent = `Found ${matchCount} match${matchCount !== 1 ? 'es' : ''}`;
        
        // Update match list
        matchList.innerHTML = '';
        for (let i = 0; i < matchCount; i++) {
            const listItem = document.createElement('li');
            listItem.textContent = `Match ${i + 1}`;
            matchList.appendChild(listItem);
        }
    }
});

// Handle match navigation buttons
nextButton.addEventListener('click', handleNextMatch);
prevButton.addEventListener('click', handlePrevMatch);

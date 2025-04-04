// content.ts

// Global variables
let matchElements: HTMLSpanElement[] = [];
let currentMatchIndex = 0;

const highlightText = (keywords: string, caseSensitive: boolean) => {
    const regex = new RegExp(keywords, caseSensitive ? 'g' : 'gi');
    const bodyText = document.body.innerHTML;

    // Remove previous highlights
    matchElements.forEach((element) => {
        element.outerHTML = element.innerText;
    });

    matchElements = [];

    // Search for all occurrences of the keywords in the body text
    let match;
    while ((match = regex.exec(bodyText)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        const beforeMatch = bodyText.slice(0, start);
        const matchText = bodyText.slice(start, end);
        const afterMatch = bodyText.slice(end);

        // Wrap the match in a <span> to highlight it
        const highlighted = `${beforeMatch}<span class="highlight">${matchText}</span>${afterMatch}`;
        document.body.innerHTML = highlighted;

        // Store the highlight elements
        const newHighlight = document.querySelectorAll('.highlight');
        matchElements = Array.from(newHighlight) as HTMLSpanElement[];
    }

    updateMatchNavigation();
    updateMatchCount();
};

const updateMatchCount = () => {
    // Send match count to index
    chrome.runtime.sendMessage({
        action: 'updateMatchCount',
        matchCount: matchElements.length,
    });
};

const updateMatchNavigation = () => {
    if (matchElements.length > 0) {
        // Highlight the first match initially
        matchElements[0].classList.add('active-match');
    }
};

const nextMatch = () => {
    if (matchElements.length === 0) return;
    matchElements[currentMatchIndex].classList.remove('active-match');

    currentMatchIndex = (currentMatchIndex + 1) % matchElements.length;
    const nextMatch = matchElements[currentMatchIndex];
    nextMatch.classList.add('active-match');

    // Scroll the next match into view
    nextMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

const prevMatch = () => {
    if (matchElements.length === 0) return;
    matchElements[currentMatchIndex].classList.remove('active-match');

    currentMatchIndex = (currentMatchIndex - 1 + matchElements.length) % matchElements.length;
    const prevMatch = matchElements[currentMatchIndex];
    prevMatch.classList.add('active-match');

    // Scroll the previous match into view
    prevMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

// Listen for search button click from the popup to highlight matches
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'search') {
        const { keywords, caseSensitive } = message;
        highlightText(keywords, caseSensitive);
    }

    if (message.action === 'nextMatch') {
        nextMatch();
    }

    if (message.action === 'prevMatch') {
        prevMatch();
    }
});

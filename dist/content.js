class KeywordHighlighter {
    constructor() {
        this.highlightClass = 'keyword-highlight';
        this.highlightedElements = [];
    }

    clearHighlights() {
        this.highlightedElements.forEach(element => {
            const parent = element.parentNode;
            if (parent) {
                parent.replaceChild(document.createTextNode(element.textContent), element);
                parent.normalize();
            }
        });
        this.highlightedElements = [];
    }

    highlight(keywords, caseSensitive) {
        this.clearHighlights();
        if (!keywords.length) return;

        const flags = caseSensitive ? 'g' : 'gi';
        // Remove word boundaries and fix regex pattern
        const regex = new RegExp(`(${keywords.map(this.escapeRegExp).join('|')})`, flags);

        this.walkTextNodes(node => {
            if (node.textContent.trim() && !node.parentElement.closest('script, style')) {
                const newContent = node.textContent.replace(regex, '<mark class="keyword-highlight">$1</mark>');
                if (newContent !== node.textContent) {
                    const wrapper = document.createElement('span');
                    wrapper.innerHTML = newContent;

                    // Collect all matches
                    const matches = wrapper.querySelectorAll('.keyword-highlight');
                    matches.forEach(highlight => {
                        this.highlightedElements.push(highlight);
                    });

                    node.replaceWith(...wrapper.childNodes);
                }
            }
        });

        this.scrollToFirstMatch();
    }

    walkTextNodes(callback) {
        const treeWalker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: node =>
                    node.textContent.trim() ?
                        NodeFilter.FILTER_ACCEPT :
                        NodeFilter.FILTER_REJECT
            }
        );

        while (treeWalker.nextNode()) {
            callback(treeWalker.currentNode);
        }
    }

    scrollToFirstMatch() {
        const firstMatch = document.querySelector(`.${this.highlightClass}`);
        if (firstMatch) {
            firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

const highlighter = new KeywordHighlighter();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'search') {
        const keywords = request.keywords.split(/,\s*|\s+/).filter(Boolean);
        highlighter.highlight(keywords, request.caseSensitive);
        // Return actual matched texts and count
        const matches = highlighter.highlightedElements.map(el => el.textContent);
        sendResponse({
            count: matches.length,
            matches: matches
        });
    }

    if (request.action === 'clear') {
        highlighter.clearHighlights();
        sendResponse({ count: 0, matches: [] });
    }
});
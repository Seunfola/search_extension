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
        const regex = new RegExp(`\\b(${keywords.map(this.escapeRegExp).join('|')})\\b`, flags);

        this.walkTextNodes(node => {
            if (node.textContent.trim() && !node.parentElement.closest('script, style')) {
                const matches = node.textContent.match(regex);
                if (matches) {
                    const span = document.createElement('span');
                    span.innerHTML = node.textContent.replace(regex, '<mark class="$&">$1</mark>');

                    const newElements = Array.from(span.childNodes).map(child => {
                        if (child instanceof HTMLElement && child.tagName === 'MARK') {
                            child.className = this.highlightClass;
                            this.highlightedElements.push(child);
                        }
                        return child;
                    });

                    node.replaceWith(...newElements);
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
        sendResponse({ count: highlighter.highlightedElements.length });
    }

    if (request.action === 'clear') {
        highlighter.clearHighlights();
        sendResponse({ count: 0 });
    }
});
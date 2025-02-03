class KeywordHighlighter {
    constructor() {
        this.highlightClass = 'keyword-highlight';
        this.markedElements = new Set();
        this.observer = new MutationObserver(this.handleDOMChanges.bind(this));
        this.currentConfig = null;
    }

    handleDOMChanges(mutations) {
        if (!this.currentConfig) return;
        mutations.forEach(mutation => {
            if (mutation.type === 'characterData' || mutation.addedNodes.length) {
                this.highlight(this.currentConfig.keywords, this.currentConfig.caseSensitive);
            }
        });
    }

    clearHighlights() {
        this.markedElements.forEach(el => {
            const parent = el.parentNode;
            if (parent) {
                const textNode = document.createTextNode(el.textContent);
                parent.replaceChild(textNode, el);
                parent.normalize();
            }
        });
        this.markedElements.clear();
    }

    highlight(keywords, caseSensitive) {
        this.clearHighlights();
        this.currentConfig = { keywords, caseSensitive };

        const flags = caseSensitive ? 'g' : 'gi';
        const pattern = keywords.map(k => this.escapeRegex(k)).join('|');
        const regex = new RegExp(`(${pattern})`, flags);

        this.processTextNodes(node => {
            if (!node.parentNode || node.parentNode.closest('script, style')) return;

            const matches = node.textContent.match(regex);
            if (matches) {
                const wrapper = document.createElement('span');
                wrapper.innerHTML = node.textContent.replace(regex, '<mark class="keyword-highlight">$1</mark>');

                const newNodes = Array.from(wrapper.childNodes);
                node.parentNode.replaceChild(wrapper, node);

                newNodes.forEach(n => {
                    if (n.nodeName === 'MARK') this.markedElements.add(n);
                });
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    processTextNodes(callback) {
        const treeWalker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            { acceptNode: node => node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT }
        );

        while (treeWalker.nextNode()) callback(treeWalker.currentNode);
    }

    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    getMatches() {
        return Array.from(this.markedElements).map(el => el.textContent);
    }
}

const highlighter = new KeywordHighlighter();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'search':
            highlighter.highlight(request.keywords, request.caseSensitive);
            const matches = highlighter.getMatches();
            sendResponse({
                count: matches.length,
                matches: matches
            });
            break;

        case 'clear':
            highlighter.clearHighlights();
            sendResponse({ count: 0, matches: [] });
            break;
    }
    return true;
});
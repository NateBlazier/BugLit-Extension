function highlightMatchingLinks(searchTerms) {
    const links = document.querySelectorAll("a[href]");
    links.forEach(link => {
      const href = link.href.toLowerCase();
      if (searchTerms.some(term => href.includes(term.toLowerCase()))) {
        link.classList.add("link-highlight");
      }
    });
  }
  
  function highlightMatchingText(searchTerms) {
    const treeWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
  
    while (treeWalker.nextNode()) {
      textNodes.push(treeWalker.currentNode);
    }
  
    textNodes.forEach(node => {
      const parent = node.parentNode;
      if (!parent) return;
  
      const originalText = node.nodeValue;
      const lowerText = originalText.toLowerCase();
      let replaced = false;
  
      searchTerms.forEach(term => {
        const termLower = term.toLowerCase();
        if (lowerText.includes(termLower)) {
          const regex = new RegExp(`(${term})`, "gi");
          const spanText = originalText.replace(regex, '<span class="text-highlight">$1</span>');
          const wrapper = document.createElement("span");
          wrapper.innerHTML = spanText;
          parent.replaceChild(wrapper, node);
          replaced = true;
        }
      });
    });
  }
  
  function runHighlighting() {
    chrome.storage.local.get(["searchTerms"], (data) => {
      highlightMatchingLinks(data.searchTerms || []);
      highlightMatchingText(data.searchTerms || []);
    });
  }
  
  window.addEventListener("highlight-links", runHighlighting);
  
  // Auto-run if enabled
  chrome.storage.local.get(["autoHighlight", "highlightDelay"], (data) => {
    if (data.autoHighlight) {
      const delay = parseInt(data.highlightDelay) || 0;
      setTimeout(() => {
        runHighlighting();
      }, delay);
    }
  });
  

  function removeHighlights() {
    // Remove link highlights
    document.querySelectorAll("a.link-highlight").forEach(link => {
      link.classList.remove("link-highlight");
    });
  
    // Remove text highlight spans and restore original text
    document.querySelectorAll("span.text-highlight").forEach(span => {
      const text = span.textContent;
      const parent = span.parentNode;
  
      // Replace span with its text node
      const textNode = document.createTextNode(text);
      parent.replaceChild(textNode, span);
    });
  }
  
  window.addEventListener("remove-highlights", removeHighlights);
  
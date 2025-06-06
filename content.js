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
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentNode;
      if (!parent || parent.classList?.contains("text-highlight")) continue;
  
      let text = node.nodeValue;
      let hasMatch = false;
  
      const regexParts = searchTerms
        .filter(term => term.length > 0)
        .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // escape regex characters
  
      if (regexParts.length === 0) continue;
  
      const regex = new RegExp(`(${regexParts.join('|')})`, 'gi');
  
      if (!regex.test(text)) continue;
  
      const fragment = document.createDocumentFragment();
  
      text.split(regex).forEach(part => {
        if (regex.test(part)) {
          const span = document.createElement("span");
          span.className = "text-highlight";
          span.textContent = part;
          fragment.appendChild(span);
        } else {
          fragment.appendChild(document.createTextNode(part));
        }
      });
  
      parent.replaceChild(fragment, node);
    }
  }
  
  
  
function runHighlighting() {
  chrome.storage.local.get(["searchTerms"], (data) => {
    const searchTerms = data.searchTerms || [];
    highlightMatchingLinks(searchTerms);
    observeDOMForTextHighlights(searchTerms);
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
  

  let observer;

  function observeDOMForTextHighlights(searchTerms) {
    observer = new MutationObserver((mutations) => {
      for (let mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          highlightMatchingText(searchTerms);
        }
      }
    });
  
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  
    // Also run once initially
    highlightMatchingText(searchTerms);
  }
  
  function removeHighlights() {
    // Disconnect the observer to prevent re-highlighting
    if (observer) {
      observer.disconnect();
    }
  
    // Remove link highlights
    document.querySelectorAll("a.link-highlight").forEach(link => {
      link.classList.remove("link-highlight");
    });
  
    // Remove text highlight spans and restore original text
    document.querySelectorAll("span.text-highlight").forEach(span => {
      try {
        const text = span.textContent;
        const parent = span.parentNode;
  
        // Replace span with its text node
        const textNode = document.createTextNode(text);
        parent.replaceChild(textNode, span);
      } catch (error) {
        console.error("Error removing highlight:", error);
      }
    });
  
  
    // Also run once initially
    highlightMatchingText(searchTerms);
  }


  // Define colors for each category
const categoryColors = {
  internal: "lightblue",
  external: "lightgreen",
  redirected: "orange",
  broken: "red",
  mailto: "purple",
  tel: "yellow",
  javascript: "pink",
  anchor: "cyan",
};

// Function to highlight links of a specific category
function highlightLinks(category, enable) {
  const links = document.querySelectorAll(`a[data-category="${category}"]`);
  links.forEach(link => {
    if (enable) {
      link.style.backgroundColor = categoryColors[category];
    } else {
      link.style.backgroundColor = ""; // Remove highlight
    }
  });
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleHighlight") {
    highlightLinks(message.category, message.enable);
  }
});
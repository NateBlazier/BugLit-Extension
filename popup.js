document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.local.get(["searchTerms", "autoHighlight", "highlightDelay"], (data) => {
      if (data.searchTerms) {
        document.getElementById("input").value = data.searchTerms.join("\n");
      }
      document.getElementById("autoHighlight").checked = data.autoHighlight || false;
      document.getElementById("delayInput").value = data.highlightDelay ?? 0;
    });
  });
  
  document.getElementById("highlight").addEventListener("click", () => {
    saveAndTriggerHighlight();
  });
  
  document.getElementById("remove").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: () => {
          window.dispatchEvent(new Event('remove-highlights'));
        }
      });
    });
  });
  
  document.getElementById("autoHighlight").addEventListener("change", (e) => {
    chrome.storage.local.set({ autoHighlight: e.target.checked });
  });
  
  document.getElementById("delayInput").addEventListener("change", (e) => {
    chrome.storage.local.set({ highlightDelay: parseInt(e.target.value) || 0 });
  });
  
  function saveAndTriggerHighlight() {
    const input = document.getElementById("input").value;
    const searchTerms = input
      .split("\n")
      .map(term => term.trim())
      .filter(term => term.length > 0);
  
    const delay = parseInt(document.getElementById("delayInput").value) || 0;
  
    chrome.storage.local.set({ searchTerms, highlightDelay: delay }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: () => {
            window.dispatchEvent(new Event('highlight-links'));
          }
        });
      });
    });
  }
  
document.addEventListener("DOMContentLoaded", () => {
  // Restore saved data for highlighting
  chrome.storage.local.get(["searchTerms", "autoHighlight", "highlightDelay", "savedSelector", "linkCheckResults"], (data) => {
    if (data.searchTerms) {
      document.getElementById("input").value = data.searchTerms.join("\n");
    }
    document.getElementById("autoHighlight").checked = data.autoHighlight || false;
    document.getElementById("delayInput").value = data.highlightDelay ?? 0;

    // Restore saved selector and link check results
    const selectorInput = document.getElementById("selector");
    const summaryDiv = document.getElementById("linkSummary");
    if (data.savedSelector) {
      selectorInput.value = data.savedSelector;
    }
    if (data.linkCheckResults) {
      renderSummary(data.linkCheckResults, summaryDiv);
    }
  });

  // Highlight functionality
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

  // Save selector when user types
  const selectorInput = document.getElementById("selector");
  selectorInput.addEventListener("input", () => {
    chrome.storage.local.set({ savedSelector: selectorInput.value });
  });

  // Handle "Select DOM Element" button click
  // Handle "Select DOM Element" button click
const selectDomButton = document.getElementById("selectDom");
selectDomButton.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        func: () => {
          return new Promise((resolve) => {
            let previousElement = null;

            const highlightElement = (event) => {
              if (previousElement) {
                previousElement.style.outline = ""; // Remove outline from the previous element
              }
              event.target.style.outline = "2px solid red"; // Add outline to the hovered element
              previousElement = event.target;
            };

            const removeHighlight = () => {
              if (previousElement) {
                previousElement.style.outline = ""; // Remove outline when exiting select mode
              }
              document.body.style.cursor = "";
              document.removeEventListener("mousemove", highlightElement, true);
              document.removeEventListener("click", onClick, true);
            };

            const onClick = (event) => {
              event.preventDefault();
              event.stopPropagation();
              removeHighlight();

              const path = [];
              let el = event.target;
              while (el) {
                let selector = el.tagName.toLowerCase();
                if (el.id) {
                  selector += `#${el.id}`;
                  path.unshift(selector);
                  break;
                } else {
                  let sib = el,
                    nth = 1;
                  while ((sib = sib.previousElementSibling)) nth++;
                  selector += `:nth-child(${nth})`;
                }
                path.unshift(selector);
                el = el.parentElement;
              }
              resolve(path.join(" > "));
            };

            document.body.style.cursor = "crosshair";
            document.addEventListener("mousemove", highlightElement, true);
            document.addEventListener("click", onClick, true);
          });
        },
      },
      (results) => {
        if (results && results[0] && results[0].result) {
          const selector = results[0].result;
          selectorInput.value = selector;
          chrome.storage.local.set({ savedSelector: selector });
        }
      }
    );
  });
});

  // Link checker init
  if (typeof initLinkCheckerUI === 'function') {
    initLinkCheckerUI();
  }



  const checkboxes = document.querySelectorAll(".highlight-toggle");

  checkboxes.forEach(checkbox => {
    checkbox.addEventListener("change", (event) => {
      const category = event.target.getAttribute("data-category");
      const enable = event.target.checked;

      // Send a message to the content script to toggle highlighting
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "toggleHighlight",
          category: category,
          enable: enable,
        });
      });
    });
  });





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
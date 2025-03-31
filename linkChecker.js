function initLinkCheckerUI() {
    const button = document.getElementById("checkLinks");
    if (!button) return;
  
    button.addEventListener("click", () => {
      const selector = document.getElementById("selector").value;
      const status = document.getElementById("status");
      const summary = document.getElementById("linkSummary");
  
      status.textContent = "🔄 Scanning links...";
      summary.innerHTML = "";
  
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: collectLinks,
          args: [selector],
        }, async (results) => {
          if (!results || !results[0] || !results[0].result) {
            status.textContent = "⚠️ Could not retrieve links from the page.";
            return;
          }
  
          const links = results[0].result;
          const categorized = {
            internal: [],
            external: [],
            redirected: [],
            broken: [],
            mailto: [],
            tel: [],
            javascript: [],
            anchor: [],
          };
  
          let processed = 0;
          for (const link of links) {
            const result = await fetchStatus(link.href);
  
            const statusCode = result.status;
            const type = link.type;
  
            if (["mailto", "tel", "javascript", "anchor"].includes(type)) {
              categorized[type].push({ ...link, status: "N/A" });
            } else if (statusCode >= 200 && statusCode < 300) {
              categorized[type].push({ ...link, status: statusCode });
            } else if (statusCode >= 300 && statusCode < 400) {
              categorized.redirected.push({ ...link, status: statusCode });
            } else {
              categorized.broken.push({ ...link, status: statusCode });
            }
  
            processed++;
            status.textContent = `✅ Checked ${processed} of ${links.length} links...`;
          }
  
          chrome.storage.local.set({ linkCheckResults: categorized }, () => {
            status.textContent = "✅ Link check complete.";
            renderSummary(categorized, summary);
          });
        });
      });
    });
  }
  
  function collectLinks(selector) {
    const root = selector ? document.querySelector(selector) : document.body;
    const anchors = root ? root.querySelectorAll("a[href]") : [];
    const origin = location.origin;
  
    return Array.from(anchors).map(a => {
      const href = a.href;
      const text = a.textContent.trim() || "(no text)";
      let type = "external";
  
      if (href.startsWith("mailto:")) type = "mailto";
      else if (href.startsWith("tel:")) type = "tel";
      else if (href.startsWith("javascript:")) type = "javascript";
      else if (href.startsWith("#")) type = "anchor";
      else if (href.startsWith(origin)) type = "internal";
  
      return { href, text, type };
    });
  }
  
  async function fetchStatus(url) {
    try {
      const res = await fetch(url, { method: "HEAD", mode: "no-cors" });
      return { status: res.status || 0 };
    } catch (e) {
      return { status: 0 };
    }
  }
  
  function renderSummary(data, container) {
    const categories = ["internal", "external", "redirected", "broken", "mailto", "tel", "javascript", "anchor"];
    container.innerHTML = categories
      .filter(cat => data[cat] && data[cat].length > 0)
      .map(cat => {
        const labelMap = {
          internal: "✅ Internal",
          external: "🌐 External",
          redirected: "🔁 Redirect",
          broken: "❌ Broken",
          mailto: "📧 Mailto",
          tel: "📞 Tel",
          javascript: "⚙️ JS Links",
          anchor: "🔗 Anchors"
        };
        const count = data[cat].length;
        const icon = labelMap[cat] || cat;
        return `<div><a href="linkResults.html?category=${cat}" target="_blank">${icon}: ${count}</a></div>`;
      }).join("");
  }

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
      chrome.storage.local.remove(["linkCheckResults"]);
    }
  });
  
  chrome.storage.local.set({ linkCheckResults: categorized }, () => {
    status.textContent = "✅ Link check complete.";
    renderSummary(categorized, summary);
  });
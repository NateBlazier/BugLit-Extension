function initLinkCheckerUI() {
    const button = document.getElementById("checkLinks");
    if (!button) return;
  
    // Create exclusion input field if it doesn't exist
    if (!document.getElementById("excludeSelectors")) {
      const label = document.createElement("label");
      label.setAttribute("for", "excludeSelectors");
      label.textContent = "Exclude selectors (comma-separated):";
      const input = document.createElement("input");
      input.type = "text";
      input.id = "excludeSelectors";
      input.placeholder = ".main-header, .footer";
      input.style.marginBottom = "8px";
      const container = document.getElementById("selector")?.parentElement || document.body;
      container.appendChild(label);
      container.appendChild(document.createElement("br"));
      container.appendChild(input);
      container.appendChild(document.createElement("br"));
  
      // Load saved value if available
      chrome.storage.local.get("excludeSelectors", (data) => {
        if (data.excludeSelectors) {
          input.value = data.excludeSelectors;
        }
      });
  
      // Save value when user changes it
      input.addEventListener("input", () => {
        chrome.storage.local.set({ excludeSelectors: input.value });
      });
    }
  
    button.addEventListener("click", () => {
      const selector = document.getElementById("selector");
      const status = document.getElementById("status");
      const summary = document.getElementById("linkSummary");
  
      let exclusions = [];
      const exclusionInput = document.getElementById("excludeSelectors");
      if (exclusionInput && exclusionInput.value.trim()) {
        exclusions = exclusionInput.value
          .split(",")
          .map(sel => sel.trim())
          .filter(sel => sel);
      }
  
      status.textContent = "🔄 Scanning links...";
      summary.innerHTML = "";
  
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabUrl = tabs[0].url;
        const storageKey = `linkCheckResults_${tabUrl}`;
  
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: collectLinks,
          args: [selector.value, exclusions],
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
  
          await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (categorizedLinks) => {
              for (const [category, links] of Object.entries(categorizedLinks)) {
                links.forEach(link => {
                  const el = Array.from(document.querySelectorAll("a[href]"))
                    .find(a => a.href === link.href);
                  if (el) el.setAttribute("data-category", category);
                });
              }
            },
            args: [categorized],
          });
  
          chrome.storage.local.set({ [storageKey]: categorized, mainUrl: tabUrl }, () => {
            status.textContent = "✅ Link check complete.";
            renderSummary(categorized, summary);
          });
  
          await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
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
  
              Object.keys(categoryColors).forEach(category => {
                document.querySelectorAll(`a[data-category="${category}"]`).forEach(link => {
                  link.style.backgroundColor = categoryColors[category];
                });
              });
            }
          });
        });
      });
    });
  }
  
  function collectLinks(selector, excludeSelectors) {
    const root = selector ? document.querySelector(selector) : document.body;
    const excludedRoots = excludeSelectors.flatMap(sel => Array.from(document.querySelectorAll(sel)));
    const anchors = root ? root.querySelectorAll("a[href]") : [];
    const origin = location.origin;
  
    const isExcluded = (element) => excludedRoots.some(excluded => excluded.contains(element));
  
    return Array.from(anchors)
      .filter(a => !isExcluded(a))
      .map(a => {
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
      let res = await fetch(url, { method: "HEAD", mode: "cors" });
      if (!res.ok || res.status >= 400) {
        // If HEAD fails or is denied, try GET
        res = await fetch(url, { method: "GET", mode: "cors" });
      }
      return { status: res.status || 0 };
    } catch (e) {
      return { status: 0 };
    }
  }
  
  function renderSummary(data, container) {
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
  
    const labelMap = {
      all: "📋 All Links",
      internal: "✅ Internal",
      external: "🌐 External",
      redirected: "🔁 Redirect",
      broken: "❌ Broken",
      mailto: "📧 Mailto",
      tel: "📞 Tel",
      javascript: "⚙️ JS Links",
      anchor: "🔗 Anchors"
    };
  
    const categories = ["all", ...Object.keys(data)];
  
    container.innerHTML = categories
      .filter(cat => cat === "all" || (data[cat] && data[cat].length > 0))
      .map(cat => {
        const count = cat === "all"
          ? Object.values(data).reduce((sum, list) => sum + list.length, 0)
          : data[cat].length;
        const label = labelMap[cat] || cat;
        const color = categoryColors[cat] || "#eee";
        return `
          <div style="display: flex; align-items: center; margin-bottom: 6px;">
            <span style="width: 16px; height: 16px; background: ${color}; border-radius: 3px; margin-right: 6px;"></span>
            <a href="linkResults.html?category=${cat}" target="_blank" style="flex-grow: 1; text-decoration: none; color: black;">${label}: ${count}</a>
            <input type="checkbox" class="highlight-toggle" data-category="${cat}" ${cat !== "all" ? "checked" : "disabled"} />
          </div>`;
      }).join("");
  
    document.querySelectorAll(".highlight-toggle").forEach(checkbox => {
      checkbox.addEventListener("change", (e) => {
        const category = e.target.dataset.category;
        const enable = e.target.checked;
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { action: "toggleHighlight", category, enable });
        });
      });
    });
  }
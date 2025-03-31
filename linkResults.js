// Get the category from the query string
const params = new URLSearchParams(window.location.search);
const category = params.get("category");

// Fetch results and main URL from chrome.storage.local
chrome.storage.local.get(null, (data) => {
    const mainUrl = data.mainUrl || "Unknown Page";
    const storageKey = `linkCheckResults_${mainUrl}`;
    const results = data[storageKey] || {};
  
    // Combine all links if the "all" category is selected
    const links = category === "all"
      ? Object.values(results).flat()
      : results[category] || [];
  
    console.log("Links for category:", category, links); // Debugging
  
    // Display the main URL
    const urlDiv = document.createElement("div");
    urlDiv.innerHTML = `<p><strong>Page URL:</strong> <a href="${mainUrl}" target="_blank">${mainUrl}</a></p>`;
    document.body.insertBefore(urlDiv, document.getElementById("results"));
  
    if (links.length === 0) {
      document.getElementById("results").innerHTML = `<p>No results found for category: ${category}</p>`;
      return;
    }
  
    // Generate a table of results
    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Link Text</th>
          <th>Link</th>
          <th>Status</th>
          <th>Type</th>
        </tr>
      </thead>
      <tbody>
        ${links
          .map(
            (link) => `
          <tr>
            <td><a href="${link.href}" target="_blank">${link.text || link.href}</a></td>
             <td><a href="${link.href}" target="_blank">${link.href}</a></td>
            <td class="status-${link.status}">${link.status}</td>
            <td>${link.type}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    `;
    document.getElementById("results").appendChild(table);
  });
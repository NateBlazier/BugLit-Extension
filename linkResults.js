// filepath: c:\Users\Marvin\Desktop\BugLit Extension\BugLit-Extension\linkResults.js

// Get the category from the query string
const params = new URLSearchParams(window.location.search);
const category = params.get("category");

// Fetch results from chrome.storage.local
chrome.storage.local.get("linkCheckResults", (data) => {
  const results = data.linkCheckResults || {};
  const links = results[category] || [];

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
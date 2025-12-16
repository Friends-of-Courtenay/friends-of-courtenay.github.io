function loadCourtenayFeed() {
  const feedContainer = document.getElementById("courtenay-feed");
  if (!feedContainer) return;

  // Prevent double-loading if we navigate back and forth quickly
  if (feedContainer.getAttribute("data-loaded")) return;
  feedContainer.setAttribute("data-loaded", "true");

  // The RSS feed URL
  const feedUrl = "https://www.courtenay.cps.edu/apps/news/news_rss.jsp?id=0";
  // Use rss2json service to convert RSS to JSON and bypass CORS
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;

  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      if (data.status === "ok") {
        // Create a container for the feed items
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'grid';

        // Display all items
        data.items.forEach(item => {
          const date = new Date(item.pubDate).toLocaleDateString('uk-UA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          
          // Try to find an image
          let imageHtml = '';
          if (item.thumbnail) {
             imageHtml = `<div style="margin-bottom: 1rem;"><img src="${item.thumbnail}" alt="" style="width:100%; height:auto; object-fit:cover; border-radius: 0.25rem;"></div>`;
          } else if (item.enclosure && item.enclosure.link && item.enclosure.type.startsWith('image/')) {
             imageHtml = `<div style="margin-bottom: 1rem;"><img src="${item.enclosure.link}" alt="" style="width:100%; height:auto; object-fit:cover; border-radius: 0.25rem;"></div>`;
          }

          const itemDiv = document.createElement('div');
          itemDiv.className = 'card';
          itemDiv.style.padding = '1rem';
          itemDiv.innerHTML = `
            <div class="md-typeset">
              ${imageHtml}
              <h4 style="margin-top: 0;"><a href="${item.link}" target="_blank" rel="noopener">${item.title}</a></h4>
              <div class="feed-meta">
                <span class="feed-date" style="font-size: 0.8em; color: var(--md-default-fg-color--light);">${date}</span>
              </div>
              <div class="feed-description" style="margin-top: 0.5em;">${item.description}</div>
            </div>
          `;
          itemsContainer.appendChild(itemDiv);
        });

        // Append items to the container
        feedContainer.appendChild(itemsContainer);
        
        // Remove the "Loading..." text content if present
        const ps = feedContainer.querySelectorAll('p');
        ps.forEach(p => {
          if (p.textContent.includes('Завантаження новин')) {
            p.style.display = 'none';
          }
        });

      } else {
        showError(feedContainer);
      }
    })
    .catch(error => {
      console.error('Error fetching feed:', error);
      showError(feedContainer);
    });
}

function showError(container) {
  const errorMsg = document.createElement('p');
  errorMsg.textContent = 'На даний момент неможливо завантажити стрічку новин.';
  container.appendChild(errorMsg);
}

// Subscribe to page changes (handles Instant Navigation)
// This works with MkDocs Material / Zensical's instant loading
if (typeof document$ !== "undefined") {
  document$.subscribe(function() {
    loadCourtenayFeed();
  });
} else {
  // Fallback for normal loading if instant navigation is disabled
  document.addEventListener("DOMContentLoaded", loadCourtenayFeed);
}

// Fix the tooltip on the school link in the header
// Changes "Go to repository" to "Visit Courtenay School"
document.addEventListener('DOMContentLoaded', function() {
  const sourceLink = document.querySelector('.md-source[data-md-component="source"]');
  if (sourceLink) {
    sourceLink.setAttribute('title', 'Visit the official school website');
  }
});


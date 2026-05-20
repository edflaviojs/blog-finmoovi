(function() {
  var saved = null;
  try { saved = localStorage.getItem('fm-theme'); } catch(e) {}
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
    var hasSaved = false;
    try { hasSaved = !!localStorage.getItem('fm-theme'); } catch(ex) {}
    if (!hasSaved) {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
  });
})();

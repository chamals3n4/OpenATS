(function () {
  var root = document.getElementById("openats-jobs");
  var scr = document.currentScript;
  if (!root || !scr) return;
  var base = (scr.getAttribute("data-instance") || "").replace(/\/$/, "");
  if (!base) {
    root.innerHTML =
      "<p>OpenATS embed: set <code>data-instance</code> to your app URL.</p>";
    return;
  }
  root.innerHTML = "<p>Loading jobs…</p>";
  fetch(base + "/api/public/jobs", { credentials: "omit" })
    .then(function (r) {
      return r.json();
    })
    .then(function (payload) {
      var jobs = (payload && payload.data) || [];
      if (!jobs.length) {
        root.innerHTML = "<p>No open positions right now.</p>";
        return;
      }
      var esc = function (s) {
        return String(s == null ? "" : s)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/"/g, "&quot;");
      };
      root.innerHTML =
        '<ul style="list-style:none;padding:0;margin:0;">' +
        jobs
          .map(function (j) {
            var href =
              base +
              "/careers/" +
              encodeURIComponent(j.id != null ? String(j.id) : "");
            return (
              '<li style="margin-bottom:0.75rem;border:1px solid #e2e8f0;border-radius:0.5rem;overflow:hidden;">' +
              '<a href="' +
              esc(href) +
              '" target="_blank" rel="noopener noreferrer" style="display:block;padding:0.75rem;text-decoration:none;color:inherit;">' +
              "<strong>" +
              esc(j.title) +
              "</strong>" +
              (j.location
                ? '<br><span style="color:#64748b;font-size:0.875rem;">' +
                  esc(j.location) +
                  "</span>"
                : "") +
              "</a></li>"
            );
          })
          .join("") +
        "</ul>";
    })
    .catch(function () {
      root.innerHTML = "<p>Could not load jobs.</p>";
    });
})();

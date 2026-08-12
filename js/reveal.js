(function () {
  var io = null;

  function observe(nodes) {
    if (!nodes.length) return;
    if (!("IntersectionObserver" in window)) {
      nodes.forEach(function (el) {
        el.classList.add("is-in");
      });
      return;
    }
    if (!io) {
      io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              io.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
      );
    }
    nodes.forEach(function (el) {
      if (!el.classList.contains("is-in")) io.observe(el);
    });
  }

  function refresh() {
    observe(Array.prototype.slice.call(document.querySelectorAll(".reveal")));
  }

  window.refreshQuietlyReveal = refresh;
  refresh();
})();

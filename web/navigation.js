document.getElementById("dummy").addEventListener("click", () => {
  const pageId = localStorage.getItem("currPage");
  renderPage(pageId);
});
function renderPage(pageId) {
  const container = document.getElementById("main_content");
  container.innerHTML = "";

  const tpl = document.getElementById(`page-${pageId}`);
  container.appendChild(tpl.content.cloneNode(true));
}

document.getElementById("go_back").addEventListener("click", () => {
  localStorage.setItem("currPage", 0);
  renderPage(0);
});

// initial call
(function init() {
  let currPage = Number(localStorage.getItem("currPage")) || 0;
  renderPage(currPage);
})();

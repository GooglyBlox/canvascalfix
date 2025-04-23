(async () => {
  if (!location.pathname.includes("/calendar")) return;

  await waitForList();
  enableSavedRepeatedly();
  observeDom();

  chrome.runtime.onMessage.addListener((req, _s, reply) => {
    if (req.action === "getCourses") {
      reply({ courses: listCourses() });
      return true;
    }
    if (req.action === "applySavedCourses") {
      enableSavedOnce().then(() => reply({ ok: true }));
      return true;
    }
    reply({ pong: true });
  });

  function listCourses() {
    return [...document.querySelectorAll("li[data-context]")].map((li) => ({
      id: li.dataset.context,
      name: (li.querySelector("label") || li).textContent.trim(),
    }));
  }

  async function enableSavedOnce() {
    const key = "selectedCourses";
    const store = await chrome.storage.sync.get({ [key]: [] });
    const saved = store[key];

    let changed = false;

    saved.forEach((course) => {
      let li = document.querySelector(`li[data-context='${course.id}']`);

      if (!li) {
        li = [...document.querySelectorAll("li[data-context]")].find(
          (el) =>
            (el.querySelector("label") || el).textContent
              .trim()
              .toLowerCase() === course.name.toLowerCase()
        );
        if (li && li.dataset.context !== course.id) {
          course.id = li.dataset.context;
          changed = true;
        }
      }
      if (!li) return;

      const box =
        li.querySelector("[role='checkbox']") ||
        li.querySelector(".context-list-toggle-box");

      const checked =
        box &&
        ((box.getAttribute("aria-checked") || "").toLowerCase() === "true" ||
          box.checked === true);

      if (box && !checked) box.click();
    });

    if (changed) chrome.storage.sync.set({ [key]: saved });
  }

  function enableSavedRepeatedly() {
    enableSavedOnce();
    setInterval(enableSavedOnce, 2000);
  }

  function observeDom() {
    const holder = document.getElementById("calendar-list-holder");
    if (!holder) return;
    new MutationObserver(enableSavedOnce).observe(holder, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-checked"],
    });
  }

  function waitForList() {
    return new Promise((res) => {
      const poll = () =>
        document.querySelector("li[data-context]")
          ? res()
          : setTimeout(poll, 200);
      poll();
    });
  }
})();

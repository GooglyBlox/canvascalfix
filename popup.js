document.addEventListener("DOMContentLoaded", main);

function main() {
  const urlInput = $("#canvasUrl");
  const urlList = $("#urlList");
  const addForm = $("#addUrlForm");
  const courseBox = $("#courseManager");
  const courseUL = $("#courseList");
  const saveBtn = $("#saveCourses");
  const hint = $("#hint");

  loadUrls();

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab?.url?.includes("/calendar")) return showHint();

    const hostOK =
      /instructure\.com|canvas\.edu/.test(tab.url) ||
      (async () => {
        const { canvasUrls = [] } = await chrome.storage.sync.get("canvasUrls");
        return canvasUrls.some((u) => tab.url.includes(new URL(u).hostname));
      })();

    Promise.resolve(hostOK).then((ok) => {
      if (!ok) return showHint();
      ensureCS(tab.id, () =>
        chrome.tabs.sendMessage(tab.id, { action: "getCourses" }, (res) => {
          if (chrome.runtime.lastError || !res?.courses?.length)
            return showHint();
          buildCourseList(res.courses);
          courseBox.hidden = false;
          hint.hidden = true;
        })
      );
    });
  });

  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (!url) return;
    chrome.storage.sync.get({ canvasUrls: [] }, ({ canvasUrls }) => {
      if (canvasUrls.includes(url)) return alert("URL already saved.");
      chrome.storage.sync.set({ canvasUrls: [...canvasUrls, url] }, () => {
        urlInput.value = "";
        loadUrls();
      });
    });
  });

  saveBtn.addEventListener("click", () => {
    const selected = [...courseUL.querySelectorAll("input:checked")].map(
      (cb) => ({ id: cb.dataset.id, name: cb.dataset.name })
    );

    chrome.storage.sync.set({ selectedCourses: selected }, () => {
      alert("Saved!  These courses will stay visible on every Canvas site.");
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) =>
        ensureCS(tab.id, () =>
          chrome.tabs.sendMessage(
            tab.id,
            { action: "applySavedCourses" },
            () => void chrome.runtime.lastError
          )
        )
      );
    });
  });

  function buildCourseList(courses) {
    courseUL.innerHTML = "";
    chrome.storage.sync.get({ selectedCourses: [] }, ({ selectedCourses }) => {
      const picked = selectedCourses.map((c) => c.id);
      courses.forEach(({ id, name }) => {
        const li = document.createElement("li");

        const cb = Object.assign(document.createElement("input"), {
          type: "checkbox",
          id: `c-${id}`,
          checked: picked.includes(id),
        });
        cb.dataset.id = id;
        cb.dataset.name = name;

        const lbl = Object.assign(document.createElement("label"), {
          htmlFor: cb.id,
          textContent: name,
        });

        li.append(cb, lbl);
        courseUL.append(li);
      });
    });
  }

  function ensureCS(tabId, next) {
    chrome.tabs.sendMessage(tabId, { ping: true }, () => {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript(
          { target: { tabId }, files: ["content.js"] },
          next
        );
      } else next();
    });
  }

  function loadUrls() {
    chrome.storage.sync.get({ canvasUrls: [] }, ({ canvasUrls }) => {
      urlList.innerHTML = "";
      canvasUrls.forEach((u) => {
        const li = document.createElement("li");
        li.textContent = u;
        const del = document.createElement("button");
        del.textContent = "Delete";
        del.className = "delete-btn";
        del.onclick = () =>
          chrome.storage.sync.set(
            { canvasUrls: canvasUrls.filter((x) => x !== u) },
            loadUrls
          );
        li.append(del);
        urlList.append(li);
      });
    });
  }

  function showHint() {
    courseBox.hidden = true;
    hint.hidden = false;
  }
  function $(sel) {
    return document.querySelector(sel);
  }
}

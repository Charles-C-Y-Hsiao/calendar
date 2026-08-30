(function (global) {
  "use strict";

  const DEFAULT_TABS = [
    { id: "source-input", label: "Source Input", description: "Source input content slot", tag: "A1" },
    { id: "preview", label: "Preview", description: "Preview content slot", tag: "B1" },
    { id: "query", label: "Query", description: "Query content slot", tag: "C1" },
    { id: "result", label: "Result", description: "Result content slot", tag: "D1" },
  ];

  function createTabbedWorkspace(options) {
    const config = options || {};
    const root = config.root;
    if (!root) throw new Error("tabbed_workspace requires root");
    const tabsRoot = root.querySelector('[data-role="tabs"]');
    const panelsRoot = root.querySelector('[data-role="panels"]');
    const indicator = root.querySelector('[data-role="tabs-indicator"]');
    const moduleId = "tabbed_workspace";
    if (!tabsRoot || !panelsRoot) throw new Error("tabbed_workspace markup is incomplete");

    function updateIndicator() {
      if (!indicator) return;
      const activeTab = tabsRoot.querySelector('.tab.active');
      if (!activeTab) return;
      indicator.style.width = `${activeTab.offsetWidth}px`;
      indicator.style.transform = `translateX(${activeTab.offsetLeft}px)`;
    }

    let tabs = Array.isArray(config.tabs) && config.tabs.length ? config.tabs : DEFAULT_TABS;
    let activeId = config.activeTab || tabs[0].id;

    function activateTab(tabId, notify) {
      const selected = tabs.find((tab) => tab.id === tabId) || tabs[0];
      if (!selected) return;
      activeId = selected.id;
      tabsRoot.querySelectorAll('[role="tab"]').forEach((tab) => {
        const active = tab.dataset.sheet === activeId;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      panelsRoot.querySelectorAll("[data-sheet-panel]").forEach((panel) => {
        const active = panel.dataset.sheetPanel === activeId;
        panel.classList.toggle("active-sheet", active);
        panel.hidden = !active;
      });
      requestAnimationFrame(updateIndicator);
      if (notify && typeof config.onTabChange === "function") {
        const tabElement = tabsRoot.querySelector(`[data-sheet="${CSS.escape(activeId)}"]`);
        const sheetElement = panelsRoot.querySelector(`[data-sheet-panel="${CSS.escape(activeId)}"]`);
        config.onTabChange({ sheetId: activeId, tabElement, sheetElement, moduleId });
      }
    }

    function render(nextTabs = tabs) {
      tabs = nextTabs;
      activeId = tabs.some((tab) => tab.id === activeId) ? activeId : tabs[0]?.id;
      tabsRoot.replaceChildren();
      panelsRoot.replaceChildren();
      tabs.forEach((tab) => {
        const tabButton = document.createElement("button");
        tabButton.className = "tab";
        tabButton.type = "button";
        tabButton.dataset.sheet = tab.id;
        tabButton.setAttribute("role", "tab");
        tabButton.textContent = tab.label;
        tabButton.addEventListener("click", () => activateTab(tab.id, true));
        tabsRoot.append(tabButton);

        const panel = document.createElement("article");
        panel.className = "sheet-cell";
        panel.dataset.sheetPanel = tab.id;
        panel.setAttribute("role", "tabpanel");
        const head = document.createElement("div");
        head.className = "cell-head";
        const headText = document.createElement("div");
        const heading = document.createElement("h2");
        heading.textContent = tab.label;
        const description = document.createElement("p");
        description.textContent = tab.description || "Content slot";
        headText.append(heading, description);
        const tag = document.createElement("span");
        tag.className = "cell-tag";
        tag.textContent = tab.tag || "";
        head.append(headText, tag);
        const contentSlot = document.createElement("div");
        contentSlot.className = "content-slot";
        contentSlot.dataset.role = "content-slot";
        contentSlot.textContent = `Content slot: ${tab.label}`;
        panel.append(head, contentSlot);
        panelsRoot.append(panel);
      });
      if (indicator) tabsRoot.append(indicator);
      activateTab(activeId, false);
      requestAnimationFrame(updateIndicator);
    }

    render();
    window.addEventListener("resize", updateIndicator);
    return { root, tabsRoot, panelsRoot, moduleId, activateTab, setTabs: render };
  }

  global.KnowledgeForgeModules = global.KnowledgeForgeModules || {};
  global.KnowledgeForgeModules.tabbed_workspace = { create: createTabbedWorkspace };

  const previewRoot = document.querySelector('[data-module="tabbed_workspace"][data-standalone-preview="true"]');
  if (previewRoot) createTabbedWorkspace({ root: previewRoot, activeTab: "source-input" });
})(window);

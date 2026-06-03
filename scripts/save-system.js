(function () {
  const STORAGE_KEY = "water-old-case:saves:v1";
  const DEFAULT_SLOT_ID = "autosave";
  const CHAPTER_ORDER = [
    "water_old_case_chapter1"
  ];

  function nowIso() {
    return new Date().toISOString();
  }

  function emptyData() {
    return {
      version: 1,
      activeSlotId: DEFAULT_SLOT_ID,
      updatedAt: nowIso(),
      slots: {}
    };
  }

  function emptySlot(id) {
    return {
      id,
      label: id === DEFAULT_SLOT_ID ? "自动存档" : id,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      chapters: {}
    };
  }

  function canUseStorage() {
    try {
      const key = `${STORAGE_KEY}:test`;
      window.localStorage.setItem(key, "1");
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  const memoryFallback = emptyData();
  const storageAvailable = canUseStorage();

  function readData() {
    if (!storageAvailable) return memoryFallback;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyData();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return emptyData();
      parsed.version = parsed.version || 1;
      parsed.activeSlotId = parsed.activeSlotId || DEFAULT_SLOT_ID;
      parsed.slots = parsed.slots || {};
      return parsed;
    } catch {
      return emptyData();
    }
  }

  function writeData(data) {
    data.updatedAt = nowIso();
    if (!storageAvailable) {
      Object.assign(memoryFallback, data);
      return data;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  }

  function getActiveSlot(data) {
    const slotId = data.activeSlotId || DEFAULT_SLOT_ID;
    if (!data.slots[slotId]) data.slots[slotId] = emptySlot(slotId);
    return data.slots[slotId];
  }

  function normalizeChoice(choice) {
    return {
      id: choice.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      chapterId: choice.chapterId || "",
      sceneId: choice.sceneId || "",
      sceneTitle: choice.sceneTitle || "",
      key: choice.key || choice.choiceKey || "",
      label: choice.label || choice.choiceLabel || "",
      customText: choice.customText || "",
      generatedStory: choice.generatedStory || "",
      nextHint: choice.nextHint || "",
      styleTag: Array.isArray(choice.styleTag) ? choice.styleTag : [],
      newStats: choice.newStats || {},
      source: choice.source || "unknown",
      createdAt: choice.createdAt || nowIso()
    };
  }

  function saveChapterState(input) {
    if (!input || !input.chapterId) return null;
    const data = readData();
    const slot = getActiveSlot(data);
    const previous = slot.chapters[input.chapterId] || {};
    const historyChoices = Array.isArray(input.historyChoices)
      ? input.historyChoices.map(normalizeChoice)
      : previous.historyChoices || [];

    const chapter = {
      ...previous,
      chapterId: input.chapterId,
      title: input.title || input.chapterTitle || previous.title || input.chapterId,
      label: input.label || previous.label || "",
      currentSceneId: input.currentSceneId || previous.currentSceneId || "",
      completed: Boolean(input.completed ?? previous.completed),
      playerStats: input.playerStats || previous.playerStats || {},
      historyChoices,
      archiveText: input.archiveText ?? previous.archiveText ?? "",
      lastGeneratedStory: input.lastGeneratedStory ?? previous.lastGeneratedStory ?? "",
      updatedAt: nowIso()
    };

    slot.chapters[input.chapterId] = chapter;
    slot.updatedAt = chapter.updatedAt;
    writeData(data);
    return chapter;
  }

  function getChapterState(chapterId) {
    const data = readData();
    const slot = getActiveSlot(data);
    return slot.chapters[chapterId] || null;
  }

  function getPreviousChapterStates(chapterId) {
    const data = readData();
    const slot = getActiveSlot(data);
    const currentIndex = CHAPTER_ORDER.indexOf(chapterId);
    const chapters = Object.values(slot.chapters || {});
    return chapters
      .filter((chapter) => {
        if (chapter.chapterId === chapterId) return false;
        const index = CHAPTER_ORDER.indexOf(chapter.chapterId);
        return currentIndex === -1 || index === -1 || index < currentIndex;
      })
      .sort((a, b) => {
        const ai = CHAPTER_ORDER.indexOf(a.chapterId);
        const bi = CHAPTER_ORDER.indexOf(b.chapterId);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
  }

  function compactChoice(choice) {
    return {
      sceneId: choice.sceneId,
      sceneTitle: choice.sceneTitle,
      choice: choice.customText ? `D. ${choice.customText}` : `${choice.key}. ${choice.label}`,
      generatedStory: choice.generatedStory,
      nextHint: choice.nextHint,
      styleTag: choice.styleTag || []
    };
  }

  function buildAiContext(chapterId) {
    const previousChapters = getPreviousChapterStates(chapterId).map((chapter) => ({
      chapterId: chapter.chapterId,
      title: chapter.title,
      completed: Boolean(chapter.completed),
      playerStats: chapter.playerStats || {},
      archiveText: chapter.archiveText || "",
      keyChoices: (chapter.historyChoices || []).map(compactChoice),
      updatedAt: chapter.updatedAt
    }));

    return {
      storageVersion: 1,
      source: "browser-localStorage",
      previousChapters
    };
  }

  function formatTime(value) {
    if (!value) return "无记录";
    try {
      return new Date(value).toLocaleString("zh-CN", { hour12: false });
    } catch {
      return value;
    }
  }

  function describePreviousContext(chapterId) {
    const previous = getPreviousChapterStates(chapterId);
    if (!previous.length) return "未读取到前章本地存档。";
    return previous
      .map((chapter) => {
        const choices = (chapter.historyChoices || [])
          .map((choice) => choice.customText ? `D. ${choice.customText}` : `${choice.key}. ${choice.label}`)
          .filter(Boolean)
          .slice(-4)
          .join("；");
        return `${chapter.title || chapter.chapterId}：${chapter.completed ? "已封档" : "未封档"}；${choices || "暂无选择记录"}`;
      })
      .join("\n");
  }

  window.WaterGameSaves = {
    STORAGE_KEY,
    DEFAULT_SLOT_ID,
    storageAvailable,
    readData,
    saveChapterState,
    getChapterState,
    getPreviousChapterStates,
    buildAiContext,
    describePreviousContext,
    formatTime
  };
})();

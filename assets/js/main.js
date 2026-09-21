const cur = document.getElementById("cur");
const cursorTrail = document.getElementById("cur-t");
const timelineViewport = document.getElementById("timeline-viewport");
const timelineTrack = document.getElementById("timeline-track");
const yearNodes = document.getElementById("year-nodes");
const fireflies = document.getElementById("fireflies");
const progressBar = document.getElementById("timeline-progress-bar");
const storyDialog = document.getElementById("story-dialog");
const storyTitle = document.getElementById("story-title");
const storyContent = document.getElementById("story-content");
const storyClose = document.getElementById("story-close");
const dialogCur = document.getElementById("dialog-cur");
const dialogCursorTrail = document.getElementById("dialog-cur-t");
const lotusScene = document.getElementById("s3");
const lotusStage = document.getElementById("lotus-stage");
const lotusInstruction = document.getElementById("lotus-instruction");
const lotusCount = document.getElementById("lotus-count");
const lotusReset = document.getElementById("lotus-reset");
const lotusHotspots = [...document.querySelectorAll(".lotus-hotspot")];
const lotusFlowers = [...document.querySelectorAll(".lotus-flower")];
const lotusProgressDots = [...document.querySelectorAll(".lotus-progress i")];
const inkButterfly = document.getElementById("ink-butterfly");
const lotusLights = document.getElementById("lotus-lights");
const lotusLightButtons = [...document.querySelectorAll(".lotus-lights button")];
const lotusScroll = document.getElementById("lotus-scroll");
const lotusScrollTitle = document.getElementById("lotus-scroll-title");
const lotusScrollContent = document.getElementById("lotus-scroll-content");
const lotusScrollClose = document.getElementById("lotus-scroll-close");

const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const timelineFiles = {
  2006: "01-2006.md",
  2007: "15-2007.md",
  2008: "17-2008.md",
  2009: "02-2009.md",
  2010: "18-2010.md",
  2011: "19-2011.md",
  2012: "20-2012.md",
  2013: "21-2013.md",
  2014: "03-2014.md",
  2015: "04-2015.md",
  2016: "05-2016.md",
  2017: "06-2017.md",
  2018: "07-2018.md",
  2019: "08-2019.md",
  2020: "09-2020.md",
  2021: "10-2021.md",
  2022: "11-2022.md",
  2023: "12-2023.md",
  2024: "13-2024.md",
  2025: "14-2025.md",
  2026: "16-2026.md",
};

const nodePositions = [
  { year: 2006, x: 4.18, y: 38.4 },
  { year: 2007, x: 6.8, y: 47.6 },
  { year: 2008, x: 8, y: 41.4, labelX: -6 },
  { year: 2009, x: 9.35, y: 33.8 },
  { year: 2010, x: 10.93, y: 26.7, labelX: 26 },
  { year: 2011, x: 13.35, y: 41.1 },
  { year: 2012, x: 16.08, y: 50.9 },
  { year: 2013, x: 19.8, y: 57.1 },
  { year: 2014, x: 24.13, y: 58.9 },
  { year: 2015, x: 28.53, y: 53.4 },
  { year: 2016, x: 31.4, y: 59.5 },
  { year: 2017, x: 36.7, y: 51.4 },
  { year: 2018, x: 42.13, y: 64.8 },
  { year: 2019, x: 47.5, y: 56 },
  { year: 2020, x: 56.73, y: 56.7 },
  { year: 2021, x: 60, y: 52 },
  { year: 2022, x: 64.2, y: 48.7 },
  { year: 2023, x: 69.33, y: 25.1 },
  { year: 2024, x: 74.93, y: 20.2 },
  { year: 2025, x: 80.63, y: 13.1 },
  { year: 2026, x: 89.75, y: 4.6 },
];

function setUpCursor() {
  if (!finePointer || !cur || !cursorTrail) {
    return;
  }

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let trailX = mouseX;
  let trailY = mouseY;
  let previousMouseX = mouseX;
  let previousMouseY = mouseY;
  let cursorFacing = 1;
  let lastSparkleTime = 0;
  const reducedCursorMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function shedButterflySparkles(x, y, movementX, movementY, time) {
    const distance = Math.hypot(movementX, movementY);
    if (
      reducedCursorMotion
      || !document.body.classList.contains("scene-four-active")
      || distance < 2
      || time - lastSparkleTime < 34
    ) {
      return;
    }

    lastSparkleTime = time;
    const particleCount = distance > 34 ? 2 : 1;
    const unitX = movementX / distance;
    const unitY = movementY / distance;

    for (let index = 0; index < particleCount; index += 1) {
      const sparkle = document.createElement("i");
      const tailDistance = 15 + Math.random() * 18;
      const sideOffset = (Math.random() - 0.5) * 18;
      const size = 2 + Math.random() * 4.5;
      sparkle.className = "cursor-sparkle";
      sparkle.style.left = `${x - unitX * tailDistance - unitY * sideOffset}px`;
      sparkle.style.top = `${y - unitY * tailDistance + unitX * sideOffset}px`;
      sparkle.style.width = `${size}px`;
      sparkle.style.height = `${size}px`;
      sparkle.style.setProperty("--sparkle-drift", `${(Math.random() - 0.5) * 26}px`);
      sparkle.style.setProperty("--sparkle-fall", `${22 + Math.random() * 34}px`);
      sparkle.style.setProperty("--sparkle-duration", `${720 + Math.random() * 520}ms`);
      sparkle.addEventListener("animationend", () => sparkle.remove(), { once: true });
      document.body.appendChild(sparkle);
    }
  }

  document.addEventListener("pointermove", (event) => {
    const movementX = event.clientX - previousMouseX;
    const movementY = event.clientY - previousMouseY;
    mouseX = event.clientX;
    mouseY = event.clientY;
    if (Math.abs(movementX) > 1.5) {
      cursorFacing = movementX > 0 ? 1 : -1;
      cur.style.setProperty("--cursor-facing", String(cursorFacing));
    }
    cur.style.left = `${mouseX}px`;
    cur.style.top = `${mouseY}px`;
    shedButterflySparkles(mouseX, mouseY, movementX, movementY, performance.now());
    previousMouseX = mouseX;
    previousMouseY = mouseY;
    if (dialogCur) {
      dialogCur.style.left = `${mouseX}px`;
      dialogCur.style.top = `${mouseY}px`;
    }
  });

  document.addEventListener("pointerover", (event) => {
    if (event.target.closest("a, button, [tabindex]")) {
      cur.classList.add("big");
      dialogCur?.classList.add("big");
    }
  });

  document.addEventListener("pointerout", (event) => {
    if (event.target.closest("a, button, [tabindex]")) {
      cur.classList.remove("big");
      dialogCur?.classList.remove("big");
    }
  });

  function follow() {
    trailX += (mouseX - trailX) * 0.14;
    trailY += (mouseY - trailY) * 0.14;
    cursorTrail.style.left = `${trailX}px`;
    cursorTrail.style.top = `${trailY}px`;
    if (dialogCursorTrail) {
      dialogCursorTrail.style.left = `${trailX}px`;
      dialogCursorTrail.style.top = `${trailY}px`;
    }
    window.requestAnimationFrame(follow);
  }

  follow();
}

function createYearNodes() {
  if (!yearNodes) {
    return;
  }

  nodePositions.forEach(({ year, x, y, labelX = 0 }, index) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "year-node";
    button.style.setProperty("--node-x", `${x}%`);
    button.style.setProperty("--node-y", `${y}%`);
    button.style.setProperty("--label-x", `${labelX}px`);
    button.style.setProperty("--node-order", index);
    button.dataset.year = year;
    button.setAttribute("aria-label", `打开 ${year} 年时间卷页`);

    const label = document.createElement("span");
    label.textContent = year;
    button.appendChild(label);
    button.addEventListener("click", () => openStory(year));
    yearNodes.appendChild(button);
  });
}

function createFireflies() {
  if (!fireflies) {
    return;
  }

  const count = 68;
  let seed = 2026;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let index = 0; index < count; index += 1) {
    const light = document.createElement("i");
    const size = 2 + random() * 4;
    light.className = "firefly";
    light.style.left = `${random() * 100}%`;
    light.style.top = `${random() * 92}%`;
    light.style.setProperty("--size", `${size}px`);
    light.style.setProperty("--duration", `${2.2 + random() * 3.8}s`);
    light.style.setProperty("--delay", `${-random() * 5}s`);
    fireflies.appendChild(light);
  }
}

function parseTimelineMarkdown(markdown) {
  const sections = markdown.split(/(?=^##\s+\d+｜)/m).slice(1);

  return sections.map((section) => {
    const date = section.match(/^##\s+\d+｜\[(.+?)\]/m)?.[1]?.trim() || "时间未详";
    const description = section.match(/事件描述：\s*\n\[([\s\S]*?)\](?:\s*\n|$)/)?.[1]?.trim() || "资料整理中。";
    const imageBlock = section.match(/图片：\s*\n([\s\S]*?)(?=\n官方链接：|$)/)?.[1] || "";
    const images = [...imageBlock.matchAll(/`([^`]+\.(?:jpg|jpeg|png|webp))`/gi)].map((match) => match[1]);
    const linkTitle = section.match(/-\s*标题：(.+)/)?.[1]?.trim() || "查看资料来源";
    const linkUrl = section.match(/-\s*URL：(https?:\/\/\S+)/)?.[1]?.trim() || "";

    return { date, description, images, linkTitle, linkUrl };
  });
}

function createStoryCard(event, year) {
  const card = document.createElement("article");
  card.className = "story-card";
  card.dataset.year = year;

  const imageWrap = document.createElement("div");
  imageWrap.className = "story-image";
  imageWrap.dataset.year = year;

  if (event.images.length) {
    const image = document.createElement("img");
    image.src = `./content/scene2-layer2/images/${event.images[0]}?v=20260921-2`;
    image.alt = `${year}年 ${event.date} 相关影像`;
    image.loading = "lazy";
    image.addEventListener("error", () => {
      image.remove();
      imageWrap.classList.add("is-placeholder");
      card.classList.add("no-image");
    });
    imageWrap.appendChild(image);
  } else {
    imageWrap.classList.add("is-placeholder");
    card.classList.add("no-image");
  }

  const date = document.createElement("h3");
  date.className = "story-date";
  date.textContent = event.date;

  const description = document.createElement("p");
  description.className = "story-description";
  description.textContent = event.description;

  card.append(imageWrap, date, description);

  if (event.linkUrl) {
    const link = document.createElement("a");
    link.className = "story-link";
    link.href = event.linkUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = `${event.linkTitle} ↗`;
    card.appendChild(link);
  }

  return card;
}

async function openStory(year) {
  if (!storyDialog || !storyTitle || !storyContent) {
    return;
  }

  storyTitle.textContent = year;
  storyContent.replaceChildren();

  const loading = document.createElement("p");
  loading.className = "story-loading";
  loading.textContent = "卷页展开中……";
  storyContent.appendChild(loading);

  if (!storyDialog.open) {
    storyDialog.showModal();
  }

  try {
    const filename = timelineFiles[year];
    const bundledMarkdown = globalThis.JCT20_TIMELINE_CONTENT?.[filename];
    let markdown = "";

    if (window.location.protocol === "file:" && typeof bundledMarkdown === "string") {
      markdown = bundledMarkdown;
    } else {
      try {
        const response = await fetch(`./content/scene2-layer2/${filename}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        markdown = await response.text();
      } catch (fetchError) {
        if (typeof bundledMarkdown !== "string") {
          throw fetchError;
        }
        markdown = bundledMarkdown;
      }
    }

    const events = parseTimelineMarkdown(markdown);
    storyContent.replaceChildren(...events.map((event) => createStoryCard(event, year)));
    storyContent.scrollLeft = 0;
  } catch (error) {
    const message = document.createElement("p");
    message.className = "story-error";
    message.textContent = "这一卷暂时无法展开，请刷新页面后重试。";
    storyContent.replaceChildren(message);
    console.error("Timeline content failed to load:", error);
  }
}

function setUpDialog() {
  if (!storyDialog || !storyClose) {
    return;
  }

  storyClose.addEventListener("click", () => storyDialog.close());

  storyDialog.addEventListener("click", (event) => {
    if (event.target === storyDialog) {
      storyDialog.close();
    }
  });
}

function updateProgress() {
  if (!timelineViewport || !progressBar) {
    return;
  }

  const maxScroll = timelineViewport.scrollWidth - timelineViewport.clientWidth;
  const ratio = maxScroll > 0 ? timelineViewport.scrollLeft / maxScroll : 0;
  progressBar.style.width = `${12 + ratio * 88}%`;
}

function setUpTimelineNavigation() {
  if (!timelineViewport || !timelineTrack) {
    return;
  }

  const mountainAspectRatio = 4000 / 1080;
  let dragging = false;
  let startX = 0;
  let startScroll = 0;
  let resizeFrame = 0;

  function syncTimelineDimensions() {
    window.cancelAnimationFrame(resizeFrame);
    const oldMaxScroll = timelineViewport.scrollWidth - timelineViewport.clientWidth;
    const oldRatio = oldMaxScroll > 0 ? timelineViewport.scrollLeft / oldMaxScroll : 0;

    resizeFrame = window.requestAnimationFrame(() => {
      const targetWidth = timelineViewport.clientHeight * mountainAspectRatio;
      timelineTrack.style.width = `${targetWidth}px`;

      window.requestAnimationFrame(() => {
        const newMaxScroll = timelineViewport.scrollWidth - timelineViewport.clientWidth;
        timelineViewport.scrollLeft = oldRatio * Math.max(0, newMaxScroll);
        updateProgress();
      });
    });
  }

  timelineViewport.addEventListener("scroll", updateProgress, { passive: true });

  timelineViewport.addEventListener("wheel", (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return;
    }

    const maxScroll = timelineViewport.scrollWidth - timelineViewport.clientWidth;
    const canMoveForward = event.deltaY > 0 && timelineViewport.scrollLeft < maxScroll - 2;
    const canMoveBack = event.deltaY < 0 && timelineViewport.scrollLeft > 2;

    if (canMoveForward || canMoveBack) {
      event.preventDefault();
      timelineViewport.scrollLeft += event.deltaY * 1.15;
    }
  }, { passive: false });

  timelineViewport.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) {
      return;
    }

    dragging = true;
    startX = event.clientX;
    startScroll = timelineViewport.scrollLeft;
    timelineViewport.setPointerCapture(event.pointerId);
  });

  timelineViewport.addEventListener("pointermove", (event) => {
    if (!dragging) {
      return;
    }
    timelineViewport.scrollLeft = startScroll - (event.clientX - startX);
  });

  timelineViewport.addEventListener("pointerup", () => { dragging = false; });
  timelineViewport.addEventListener("pointercancel", () => { dragging = false; });

  if ("ResizeObserver" in window) {
    const timelineResizeObserver = new ResizeObserver(syncTimelineDimensions);
    timelineResizeObserver.observe(timelineViewport);
  } else {
    window.addEventListener("resize", syncTimelineDimensions);
  }

  syncTimelineDimensions();
}

function setUpLotusScene() {
  if (!lotusScene || !lotusStage || !lotusReset || !inkButterfly || !lotusScroll) {
    return;
  }

  const litFlowers = new Set();
  const lightStories = [
    {
      slug: "movie",
      label: "电影",
      kicker: "最新作品",
      image: "./assets/images/lotus-film-kongqiang.jpg?v=20260920-1",
      imageAlt: "电影《空枪》檀健次饰亓宏刚单人角色海报",
      imageNote: "《空枪》· 亓宏刚",
      awardFirst: true,
      workLabel: "重点作品",
      latestWork: { year: "2025", title: "《震耳欲聋》· 李淇", detail: "饰演律师李淇；影片为听障人士反诈题材，相关表演获金鹿奖最佳男演员、年度银幕突破演员等荣誉。" },
      latestAward: { year: "2026", title: "金鹿奖最佳男演员", detail: "凭《震耳欲聋》获第21届中国长春电影节金鹿奖最佳男演员。" },
      works: [
        { year: "2026", items: ["《空枪》· 亓宏刚"] },
        { year: "2025", items: ["《震耳欲聋》· 李淇"] },
        { year: "2024", items: ["《被我弄丢的你》· 白晓宇"] },
        { year: "2019", items: ["《宠爱》· 罗华"] },
        { year: "2016—2017", items: ["《魔王重生》", "《恐怖笔记》", "《天师伏魔·弑魂 / 重生》", "《网游之梦回诸仙》"] },
        { year: "2008—2009", items: ["《秘岸》· 小川"] },
      ],
      awards: [
        { year: "2026", items: ["第21届中国长春电影节金鹿奖最佳男演员 · 《震耳欲聋》· 获奖", "第23届电影频道传媒大奖最受传媒关注男主角 · 《震耳欲聋》· 提名", "Rtime时光大赏年度银幕突破演员 · 《震耳欲聋》· 获奖", "搜狐电影年度突破演员 · 《震耳欲聋》· 获奖", "青年电影手册年度男演员 · 提名"] },
        { year: "2025", items: ["年度银幕潜力面孔 · 《震耳欲聋》· 获奖", "第17届澳门国际电影节最佳男主角 · 《被我弄丢的你》· 提名", "庐山国际爱情电影周年度男主角 · 《被我弄丢的你》· 提名"] },
      ],
    },
    {
      slug: "television",
      label: "电视剧",
      kicker: "剧集角色",
      image: "./assets/images/lotus-tv-hebutongzhou.jpg?v=20260920-1",
      imageAlt: "电视剧《何不同舟渡》角色海报",
      imageNote: "《何不同舟渡》· 谢却山",
      awardFirst: true,
      latestWork: { year: "2026", title: "《爱情有烟火》", detail: "饰演李亦非；同年《何不同舟渡》开机，并官宣《猎罪图鉴3》。" },
      latestAward: { year: "2025", title: "年度最受欢迎男演员", detail: "凭《猎罪图鉴2》获首届中国电视剧制作产业大会年度盛典荣誉。" },
      works: [
        { year: "2026", items: ["《猎罪图鉴3》· 沈翊", "《爱情有烟火》· 李亦非", "《何不同舟渡》· 谢却山（拍摄中）"] },
        { year: "2025", items: ["《滤镜》· 唐奇"] },
        { year: "2024", items: ["《猎罪图鉴2》· 沈翊", "《四方馆》· 元莫", "《长相思第二季》· 相柳 / 防风邶"] },
        { year: "2023", items: ["《很想很想你》· 莫青成", "《长相思》· 相柳 / 防风邶"] },
        { year: "2022", items: ["《你安全吗？》· 秦淮", "《猎罪图鉴》· 沈翊"] },
        { year: "2020—2021", items: ["《骊歌行》", "《鬓边不是海棠红》", "《爱的厘米》", "《今夕何夕》"] },
        { year: "2017—2019", items: ["《带着爸爸去留学》", "《原来你还在这里》", "《三国机密之潜龙在渊》", "《军师联盟 / 虎啸龙吟》"] },
      ],
      awards: [
        { year: "2025", items: ["电视剧制作产业大会年度最受欢迎男演员 · 《猎罪图鉴2》· 获奖", "第16届澳门国际电视节最佳男主角 · 《猎罪图鉴2》· 提名"] },
        { year: "2024", items: ["第15届澳门国际电视节最佳男主角 · 《四方馆》· 提名", "新时代国际电视节新时代最具影响力演员 · 《长相思》· 提名"] },
        { year: "2023", items: ["第28届亚洲电视大奖最佳网络剧男主 · 《你安全吗？》· 提名", "新时代国际电视节最受欢迎男演员 · 《猎罪图鉴》· 获奖"] },
        { year: "2022", items: ["第27届亚洲电视大奖最佳网络剧男主 · 《猎罪图鉴》· 提名"] },
        { year: "2021", items: ["电视剧品质盛典品质新人 · 《带着爸爸去留学》· 获奖", "国剧盛典青春演绎风格男演员 · 《鬓边不是海棠红》· 获奖"] },
      ],
    },
    {
      label: "舞蹈",
      kicker: "身体叙事",
      image: "./assets/images/lotus-dance.jpg?v=20260920-1",
      imageAlt: "《DEAD REFLEX》舞蹈影像",
      imageNote: "《DEAD REFLEX》· 2026",
      latestWork: { year: "2026", title: "《DEAD REFLEX》", detail: "由 INGYOO KIM、CLARK、BONNIE、经伟共同参与编舞。" },
      latestAward: { year: "2012", title: "《舞林大会》总决赛第四名", detail: "将拉丁、街舞与舞台叙事融为一体。" },
      works: [
        { year: "2026", items: ["《DEAD REFLEX》"] },
        { year: "2024", items: ["《每到周末我要离开地球》", "《蒙娜丽莎》"] },
        { year: "2023", items: ["《守卫高地》", "《着迷》", "《IMMA GET IT》"] },
        { year: "2022", items: ["《平行》"] },
        { year: "2021", items: ["《瓷》"] },
        { year: "2012", items: ["《天外来客》", "《黑与白》", "《天战》"] },
      ],
      awards: [
        { year: "2012", items: ["东方卫视《舞林大会》总决赛第四名"] },
        { year: "2006", items: ["第八届桃李杯国际标准舞16岁以下拉丁舞一等奖", "全国体育舞蹈锦标赛专业16岁组拉丁舞冠军、摩登舞第五名", "世界IDSF大奖赛年度总决赛上海公开赛拉丁舞季军、摩登舞第四名"] },
      ],
    },
    {
      slug: "music",
      label: "音乐",
      kicker: "个人专辑",
      image: "./assets/images/lotus-music-tangent.jpg?v=20260920-2",
      imageAlt: "檀健次第三张个人专辑《TANGENT》视觉海报",
      imageNote: "《TANGENT》第三张个人专辑",
      awardFirst: true,
      latestWork: { year: "2026", title: "《拯救我》", detail: "电视剧《蝉》主题曲；同年发行《宠》《PROOF》《DEAD REFLEX》等作品。" },
      latestAward: { year: "2026", title: "年度十大人气单曲", detail: "《Get To It》获腾讯音乐娱乐盛典QQ音乐&JOOX年度十大人气单曲。" },
      works: [
        { year: "2026", items: ["《拯救我》", "《宠》", "《PROOF》", "《DEAD REFLEX》", "《阿亓》"] },
        { year: "2025", items: ["《Get To It》", "《震耳欲聋》", "《孤》", "《好好告别》", "《傲慢与偏见》"] },
        { year: "2024", items: ["第二张个人专辑《焕》", "《不要回答》", "《画像》", "《和光同往》", "《蒙娜丽莎》"] },
        { year: "2023", items: ["首张个人专辑《DREAMS》", "《等不到的等待》", "《偏爱人间烟火》", "《路过，人间烟火》"] },
        { year: "2022", items: ["《IMMA GET IT》", "《灯火千万》", "《地球战士》"] },
        { year: "2014", items: ["首支个人单曲《Fly Away》"] },
        { year: "2010—2013", items: ["随MIC男团发行《ROCK STAR》《V》《色·COLOR》等专辑"] },
      ],
      awards: [
        { year: "2026", items: ["腾讯音乐娱乐盛典年度十大人气单曲 · 《Get To It》· 获奖", "QQ音乐巅峰最佳歌手 · 获奖", "QQ音乐超级会员十大巅峰华语单曲 · 《好好告别》· 获奖", "Star Power年中舞曲 · 《DEAD REFLEX》· 获奖"] },
        { year: "2025", items: ["腾讯音乐娱乐盛典年度最佳全能歌手 · 获奖", "年度华语数字单曲 · 《蒙娜丽莎》· 获奖", "QQ音乐巅峰人气男歌手、巅峰全能艺人 · 获奖"] },
        { year: "2024", items: ["全球华语音乐流行榜年度十大金曲、年度风格单曲 · 《蒙娜丽莎》· 获奖", "亚洲流行音乐大奖最佳男歌手 · 《焕》· 提名"] },
        { year: "2023", items: ["全球华语流行音乐金曲榜最佳男歌手、全能艺人 · 获奖", "亚洲流行音乐大奖最佳男歌手 · 《DREAMS》· 提名"] },
        { year: "2010—2014", items: ["随MIC男团获中国TOP排行榜、音悦V榜、TVB8金曲榜、香港亚洲流行音乐节等组合及金曲奖项"] },
      ],
    },
    {
      slug: "variety",
      label: "综艺",
      kicker: "人间烟火",
      image: "./assets/images/lotus-variety-nihaoxingqiliu.jpg?v=20260920-1",
      imageAlt: "檀健次参加《你好，星期六》",
      imageNote: "《你好，星期六》· 好6团",
      awardFirst: true,
      latestWork: { year: "2026", title: "《你好，星期六》", detail: "持续作为好6团成员参与节目；同年参加《我们的宿舍·归心季》。" },
      latestAward: { year: "2021", title: "年度追光之星", detail: "获《追光吧！哥哥》年度总冠军并成团。" },
      works: [
        { year: "2026", items: ["《你好，星期六》", "《我们的宿舍·归心季》"] },
        { year: "2023—2025", items: ["《你好，星期六》", "《我们的客栈》", "《声生不息·宝岛季》及多场晚会节目"] },
        { year: "2022", items: ["常驻《你好，星期六》", "《沸腾校园》", "《超有趣滑雪大会》", "《飘雪的日子来看你》"] },
        { year: "2021", items: ["《接招吧！前辈》", "《念念桃花源》"] },
        { year: "2020", items: ["《追光吧！哥哥》", "《天赐的声音》", "《跨界歌王第五季》", "《笑起来真好看》"] },
        { year: "2018—2019", items: ["《演员请就位第一季》", "《快乐大本营》", "《我就是演员》"] },
      ],
      awards: [
        { year: "2021", items: ["《追光吧！哥哥》年度总冠军、年度追光之星 · 获奖"] },
        { year: "2020", items: ["《笑起来真好看》头号玩家称号"] },
        { year: "2015", items: ["《国色天香第二季》团体竞演第二名"] },
      ],
    },
    {
      slug: "dubbing",
      label: "配音",
      kicker: "以声入戏",
      image: "./assets/images/lotus-dubbing.jpg?v=20260920-1",
      imageAlt: "动画电影《三国的星空第一部》配音海报",
      imageNote: "《三国的星空第一部》· 曹操",
      latestWork: { year: "2025", title: "《三国的星空第一部》", detail: "为动画电影中的曹操配音，并演唱主题曲《孤》。" },
      latestAward: null,
      works: [
        { year: "2025", items: ["动画电影《三国的星空第一部》· 曹操"] },
        { year: "2022", items: ["央视电视节目《最in是端午》· 一人分饰五个角色"] },
      ],
      awards: [],
    },
  ];
  let landingTimer = 0;
  let followFrame = 0;
  let butterflyX = 0;
  let butterflyY = 0;
  let pointerX = 0;
  let pointerY = 0;
  let butterflyFacing = -1;
  let isSceneVisible = false;
  let isComplete = false;
  let isLanding = false;

  function clearFlightTimers() {
    window.clearTimeout(landingTimer);
    window.cancelAnimationFrame(followFrame);
    landingTimer = 0;
    followFrame = 0;
    isLanding = false;
  }

  function setButterflyPosition(x, y, rotation = 0, facing = 1) {
    butterflyX = x;
    butterflyY = y;
    butterflyFacing = facing;
    inkButterfly.style.setProperty("--butterfly-x", `${x}px`);
    inkButterfly.style.setProperty("--butterfly-y", `${y}px`);
    inkButterfly.style.setProperty("--butterfly-r", `${rotation}deg`);
    inkButterfly.style.setProperty("--butterfly-facing", String(facing));
  }

  function initializeButterflyPosition() {
    if (butterflyX || butterflyY) {
      return;
    }
    const x = lotusStage.clientWidth * 0.68;
    const y = lotusStage.clientHeight * 0.28;
    pointerX = x;
    pointerY = y;
    setButterflyPosition(x, y, -5, -1);
  }

  function followPointer() {
    if (followFrame || !isSceneVisible || isComplete || isLanding) {
      return;
    }
    followFrame = window.requestAnimationFrame(() => {
      followFrame = 0;
      const deltaX = pointerX - butterflyX;
      const deltaY = pointerY - butterflyY;
      const facing = Math.abs(deltaX) > 2 ? (deltaX > 0 ? 1 : -1) : butterflyFacing;
      const rotation = Math.max(-12, Math.min(12, deltaY * 0.08));
      setButterflyPosition(pointerX, pointerY, rotation, facing);
    });
  }

  function trackPointer(event) {
    if (!finePointer || !isSceneVisible || isComplete || isLanding) {
      return;
    }
    const stageRect = lotusStage.getBoundingClientRect();
    const margin = Math.max(34, inkButterfly.offsetWidth * 0.42);
    pointerX = Math.max(margin, Math.min(stageRect.width - margin, event.clientX - stageRect.left));
    pointerY = Math.max(margin, Math.min(stageRect.height - margin, event.clientY - stageRect.top));
    followPointer();
  }

  function landButterfly(hotspot) {
    window.clearTimeout(landingTimer);
    window.cancelAnimationFrame(followFrame);
    followFrame = 0;
    isLanding = true;
    const stageRect = lotusStage.getBoundingClientRect();
    const hotspotRect = hotspot.getBoundingClientRect();
    const x = hotspotRect.left - stageRect.left + hotspotRect.width * 0.5;
    const y = hotspotRect.top - stageRect.top + hotspotRect.height * 0.5;
    const facing = x > butterflyX ? 1 : -1;
    inkButterfly.classList.add("is-landing");
    window.requestAnimationFrame(() => {
      setButterflyPosition(x, y, -8, facing);
      inkButterfly.style.removeProperty("transform");
    });

    landingTimer = window.setTimeout(() => {
      isLanding = false;
      inkButterfly.classList.remove("is-landing");
      followPointer();
    }, 1300);
  }

  lotusStage.addEventListener("pointermove", trackPointer, { passive: true });

  function updateLotusProgress() {
    const total = lotusHotspots.length;
    const count = litFlowers.size;

    if (lotusCount) {
      lotusCount.textContent = `已点亮 ${count} / ${total}`;
    }

    lotusProgressDots.forEach((dot, index) => {
      dot.classList.toggle("is-lit", index < count);
    });

    lotusReset.disabled = count === 0;
  }

  function completeLotusScene() {
    isComplete = true;
    clearFlightTimers(true);
    lotusScene.classList.add("is-complete");
    lotusScene.classList.add("is-butterfly-open");
    lotusStage.classList.add("is-dispersed");
    inkButterfly.classList.remove("is-flying", "is-landing");
    inkButterfly.classList.add("is-open");
    inkButterfly.style.setProperty("--butterfly-x", "52vw");
    inkButterfly.style.setProperty("--butterfly-y", "43svh");
    inkButterfly.style.setProperty("--butterfly-r", "0deg");
    inkButterfly.style.setProperty("--butterfly-facing", "1");
    window.requestAnimationFrame(() => inkButterfly.style.removeProperty("transform"));

    if (lotusInstruction) {
      lotusInstruction.textContent = "朱砂蝶已展翼，轻触六处光点";
    }
  }

  lotusHotspots.forEach((hotspot) => {
    hotspot.addEventListener("click", () => {
      const flowerId = hotspot.dataset.flower;
      if (!flowerId || litFlowers.has(flowerId) || lotusStage.classList.contains("is-dispersed")) {
        return;
      }

      litFlowers.add(flowerId);
      hotspot.classList.add("is-lit");
      hotspot.setAttribute("aria-pressed", "true");
      lotusFlowers
        .find((flower) => flower.dataset.flower === flowerId)
        ?.classList.add("is-lit");

      updateLotusProgress();

      if (litFlowers.size === lotusHotspots.length) {
        completeLotusScene();
      } else {
        landButterfly(hotspot);
        if (lotusInstruction) {
          lotusInstruction.textContent = `再点亮 ${lotusHotspots.length - litFlowers.size} 朵，花阵即开`;
        }
      }
    });
  });

  function renderLightStory(lightNumber) {
    const story = lightStories[lightNumber - 1];
    if (!story || !lotusScrollTitle || !lotusScrollContent) {
      return;
    }

    lotusScrollTitle.textContent = story.label;
    lotusScrollContent.replaceChildren();

    const card = document.createElement("article");
    card.className = "lotus-archive";
    if (story.slug) {
      card.dataset.story = story.slug;
    }

    const feature = document.createElement("figure");
    feature.className = "lotus-archive-feature";

    const image = document.createElement("img");
    image.src = story.image;
    image.alt = story.imageAlt;
    image.loading = "lazy";
    image.decoding = "async";

    const featureCaption = document.createElement("figcaption");
    const featureKicker = document.createElement("span");
    featureKicker.textContent = story.kicker;
    const featureTitle = document.createElement("strong");
    featureTitle.textContent = story.imageNote;
    featureCaption.append(featureKicker, featureTitle);
    feature.append(image, featureCaption);

    const latest = document.createElement("div");
    latest.className = "lotus-archive-latest";

    const latestItems = story.awardFirst
      ? [
          { label: "最新奖项", content: story.latestAward, featured: true },
          { label: story.workLabel || "最新作品", content: story.latestWork, featured: false },
        ]
      : [
          { label: "最新作品", content: story.latestWork, featured: false },
          { label: "最新奖项", content: story.latestAward, featured: false },
        ];

    latestItems.filter(({ content }) => content).forEach(({ label, content, featured }) => {
      const item = document.createElement("section");
      if (featured) {
        item.classList.add("is-award-featured");
      }
      const eyebrow = document.createElement("p");
      eyebrow.textContent = `${label} · ${content.year}`;
      const heading = document.createElement("h4");
      heading.textContent = content.title;
      const detail = document.createElement("p");
      detail.textContent = content.detail;
      item.append(eyebrow, heading, detail);
      latest.appendChild(item);
    });
    if (latest.childElementCount === 1) {
      latest.classList.add("is-single");
    }

    const createArchiveColumn = (titleText, groups) => {
      const section = document.createElement("section");
      section.className = "lotus-archive-column";
      const title = document.createElement("h4");
      title.textContent = titleText;
      section.appendChild(title);

      groups.forEach((group) => {
        const block = document.createElement("div");
        const year = document.createElement("h5");
        year.textContent = group.year;
        const list = document.createElement("ul");
        group.items.forEach((itemText) => {
          const item = document.createElement("li");
          item.textContent = itemText;
          list.appendChild(item);
        });
        block.append(year, list);
        section.appendChild(block);
      });

      return section;
    };

    const archiveBody = document.createElement("div");
    archiveBody.className = "lotus-archive-body";
    archiveBody.append(createArchiveColumn("作品年表", story.works));
    if (story.awards?.length) {
      archiveBody.append(createArchiveColumn("获奖记录", story.awards));
    } else {
      archiveBody.classList.add("is-single");
    }

    const source = document.createElement("a");
    source.className = "lotus-archive-source";
    source.href = "https://baike.baidu.com/item/%E6%AA%80%E5%81%A5%E6%AC%A1/8906275";
    source.target = "_blank";
    source.rel = "noreferrer";
    source.textContent = "资料来源：百度百科 · 檀健次 ↗";

    card.append(feature, latest, archiveBody, source);
    lotusScrollContent.appendChild(card);
  }

  function openLightStory(button) {
    const lightNumber = Number(button.dataset.light);
    lotusLightButtons.forEach((light) => light.classList.toggle("is-active", light === button));
    renderLightStory(lightNumber);
    lotusScene.classList.add("has-light-selection");
    lotusScroll.classList.add("is-open");
    lotusScroll.setAttribute("aria-hidden", "false");
    if (lotusInstruction) {
      lotusInstruction.textContent = `正在翻阅「${lightStories[lightNumber - 1].label}」卷页`;
    }
  }

  function closeLightStory() {
    lotusScene.classList.remove("has-light-selection");
    lotusLightButtons.forEach((light) => light.classList.remove("is-active"));
    lotusScroll.classList.remove("is-open");
    lotusScroll.setAttribute("aria-hidden", "true");
    if (lotusInstruction && isComplete) {
      lotusInstruction.textContent = "朱砂蝶已展翼，轻触六处光点";
    }
  }

  lotusLightButtons.forEach((button) => {
    button.addEventListener("click", () => openLightStory(button));
  });

  lotusScrollClose?.addEventListener("click", closeLightStory);

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !lotusScroll.classList.contains("is-open")) {
      return;
    }
    event.preventDefault();
    closeLightStory();
  });

  lotusReset.addEventListener("click", () => {
    clearFlightTimers();
    isComplete = false;
    litFlowers.clear();
    lotusScene.classList.remove("is-complete", "is-butterfly-open", "has-light-selection");
    lotusStage.classList.remove("is-dispersed");
    lotusHotspots.forEach((hotspot) => {
      hotspot.classList.remove("is-lit");
      hotspot.setAttribute("aria-pressed", "false");
    });
    lotusFlowers.forEach((flower) => flower.classList.remove("is-lit"));
    lotusLightButtons.forEach((light) => light.classList.remove("is-active"));
    lotusScroll.classList.remove("is-open");
    lotusScroll.setAttribute("aria-hidden", "true");
    inkButterfly.classList.remove("is-open", "is-landing");
    inkButterfly.classList.add("is-flying");
    inkButterfly.style.removeProperty("--butterfly-x");
    inkButterfly.style.removeProperty("--butterfly-y");
    inkButterfly.style.removeProperty("--butterfly-r");
    inkButterfly.style.removeProperty("--butterfly-facing");
    inkButterfly.style.removeProperty("transform");
    butterflyX = 0;
    butterflyY = 0;
    butterflyFacing = -1;
    if (lotusInstruction) {
      lotusInstruction.textContent = "轻触花朵，收集微光";
    }
    updateLotusProgress();
    initializeButterflyPosition();
  });

  const lotusObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      isSceneVisible = entry.isIntersecting;
      lotusScene.classList.toggle("is-in-view", entry.isIntersecting);
      if (entry.isIntersecting) {
        initializeButterflyPosition();
      } else {
        clearFlightTimers();
      }
    });
  }, { threshold: 0.12 });

  lotusObserver.observe(lotusScene);

  updateLotusProgress();
}

function setUpTimelineVisibility() {
  const timelineScene = document.getElementById("s2");
  if (!timelineScene || !("IntersectionObserver" in window)) {
    timelineScene?.classList.add("is-in-view");
    return;
  }

  const observer = new IntersectionObserver(([entry]) => {
    timelineScene.classList.toggle("is-in-view", entry.isIntersecting);
  }, { threshold: 0.08 });

  observer.observe(timelineScene);
}

function setUpNightfallTransition() {
  const transition = document.getElementById("nightfall-transition");
  if (!transition || !lotusScene) {
    return;
  }

  let updateFrame = 0;

  function updateNightfall() {
    updateFrame = 0;
    const rect = lotusScene.getBoundingClientRect();
    const transitionDistance = Math.max(window.innerHeight * 0.4, 1);
    const progress = Math.max(0, Math.min(1, -rect.top / transitionDistance));
    transition.style.setProperty("--nightfall-progress", progress.toFixed(3));
    transition.classList.toggle("is-active", progress > 0.04);
  }

  function requestNightfallUpdate() {
    if (!updateFrame) {
      updateFrame = window.requestAnimationFrame(updateNightfall);
    }
  }

  window.addEventListener("scroll", requestNightfallUpdate, { passive: true });
  window.addEventListener("resize", requestNightfallUpdate);
  updateNightfall();
}

function setUpGalaxyScene() {
  const galaxyScene = document.getElementById("s4");
  const galaxyCanvas = document.getElementById("galaxy-canvas");
  const galaxyStage = document.getElementById("galaxy-stage");
  const galaxyEndingTrigger = document.getElementById("galaxy-ending-trigger");
  const galaxyEndingLayer = document.querySelector(".galaxy-ending-layer");
  const galaxyHint = document.getElementById("galaxy-light-hint");
  const galaxyDown = document.getElementById("galaxy-down");
  const galaxyHome = document.getElementById("galaxy-home");
  const galaxyReturn = document.getElementById("galaxy-return");
  const galaxyJoystick = document.getElementById("galaxy-joystick-control");
  const galaxyJoystickKnob = document.getElementById("galaxy-joystick-knob");
  const submitButton = document.getElementById("firefly-submit");
  const fireflyDialog = document.getElementById("firefly-dialog");
  const fireflyDialogKicker = document.getElementById("firefly-dialog-kicker");
  const fireflyDialogTitle = document.getElementById("firefly-dialog-title");
  const fireflyDialogContent = document.getElementById("firefly-dialog-content");
  const fireflyDialogNav = document.getElementById("firefly-dialog-nav");
  const fireflyDialogPrev = document.getElementById("firefly-dialog-prev");
  const fireflyDialogNext = document.getElementById("firefly-dialog-next");
  const fireflyDialogClose = document.getElementById("firefly-dialog-close");
  const galaxyToast = document.getElementById("galaxy-toast");

  if (!galaxyScene || !galaxyCanvas || !galaxyStage || !fireflyDialog || !fireflyDialogContent) {
    return;
  }

  const context = galaxyCanvas.getContext("2d", { alpha: false });
  if (!context) {
    return;
  }

  function createGlowSprite(coreAlpha, middleAlpha) {
    const sprite = document.createElement("canvas");
    const size = 96;
    sprite.width = size;
    sprite.height = size;
    const spriteContext = sprite.getContext("2d");
    const glow = spriteContext.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    glow.addColorStop(0, `rgba(255, 240, 158, ${coreAlpha})`);
    glow.addColorStop(0.18, `rgba(246, 198, 65, ${middleAlpha})`);
    glow.addColorStop(1, "rgba(226, 166, 34, 0)");
    spriteContext.fillStyle = glow;
    spriteContext.fillRect(0, 0, size, size);
    return sprite;
  }

  const ambientGlowSprite = createGlowSprite(0.9, 0.38);
  const interactiveGlowSprite = createGlowSprite(1, 0.76);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fireflyFormUrl = "https://my.feishu.cn/share/base/form/shrcnpzvpRE3WRzSyEWx1mextGg";
  const fallbackRecords = [
    { id: "fallback-01", type: "text", title: "给认真走路的人", content: "愿你走过的每一步都算数，也愿每一次回头，都能看见沿途亮起的微光。", signature: "一颗路过的萤火", reviewStatus: "approved", createdAt: "2026-09-20T01:00:00+08:00" },
    { id: "fallback-02", type: "text", title: "廿载之后", content: "长路并不总有掌声，但热爱会把沉默的日子，一点一点照亮。", signature: "与你一同看星河的人", reviewStatus: "approved", createdAt: "2026-09-20T02:00:00+08:00" },
    { id: "fallback-03", type: "text", title: "仍然出发", content: "愿你的好奇不被岁月磨平，愿你永远有重新出发的勇气。", signature: "微光", reviewStatus: "approved", createdAt: "2026-09-20T03:00:00+08:00" },
  ];
  let records = [];
  let points = [];
  let projectedPoints = [];
  let hoveredPoint = null;
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let cloudRadius = 420;
  let yaw = -0.12;
  let pitch = 0.05;
  let targetYaw = yaw;
  let targetPitch = pitch;
  let isDragging = false;
  let dragMoved = false;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let previousPointerX = 0;
  let previousPointerY = 0;
  let isVisible = false;
  let isEnding = false;
  let animationFrame = 0;
  let previousFrameTime = 0;
  let toastTimer = 0;
  let activeRecordIndex = -1;
  let joystickActive = false;
  let joystickPointerId = null;
  let joystickX = 0;
  let joystickY = 0;
  let seed = 402026;

  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  function readLocalRecords() {
    try {
      const saved = JSON.parse(window.localStorage.getItem("jct20-fireflies") || "[]");
      return Array.isArray(saved)
        ? saved.filter((item) => item && item.reviewStatus === "approved" && (item.content || item.url))
        : [];
    } catch (error) {
      console.warn("Saved fireflies could not be read:", error);
      return [];
    }
  }

  async function loadRecords() {
    try {
      const response = await fetch("./content/scene4/fireflies.json?v=20260920-1");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      records = Array.isArray(data) ? data.filter((item) => item?.reviewStatus === "approved") : fallbackRecords;
    } catch (error) {
      records = [...fallbackRecords];
      console.warn("Firefly data fell back to local samples:", error);
    }

    records.push(...readLocalRecords());
    records.sort((left, right) => {
      const leftTime = Date.parse(left.createdAt || "") || 0;
      const rightTime = Date.parse(right.createdAt || "") || 0;
      return leftTime - rightTime;
    });
    syncInteractivePoints();
  }

  function syncInteractivePoints() {
    points.forEach((point, index) => {
      point.recordIndex = records.length ? index % records.length : null;
    });
  }

  function createPoints() {
    const areaRatio = Math.min(1, Math.max(0, (width * height - 300000) / 1400000));
    const count = Math.round(58 + areaRatio * 38);
    cloudRadius = Math.max(170, Math.min(width * 0.46, height * 0.48, 540));
    seed = 402026;
    points = Array.from({ length: count }, (_, index) => {
      const azimuth = random() * Math.PI * 2;
      const vertical = random() * 2 - 1;
      const horizontal = Math.sqrt(1 - vertical * vertical);
      const radialDistance = cloudRadius * Math.cbrt(random());
      const sizeScale = index === 0
        ? 1
        : index === 1
          ? 8
          : 1 + 7 * Math.pow(random(), 2.35);
      return {
        x: radialDistance * horizontal * Math.cos(azimuth),
        y: radialDistance * vertical,
        z: radialDistance * horizontal * Math.sin(azimuth),
        size: sizeScale,
        phase: random() * Math.PI * 2,
        speed: 0.45 + random() * 0.7,
        drift: (random() - 0.5) * 0.12,
        recordIndex: records.length ? index % records.length : null,
      };
    });
  }

  function resizeCanvas() {
    const rect = galaxyStage.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    pixelRatio = Math.min(1.5, window.devicePixelRatio || 1);
    galaxyCanvas.width = Math.round(width * pixelRatio);
    galaxyCanvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    createPoints();
    syncInteractivePoints();
  }

  function projectPoint(point, time) {
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    const rotatingX = point.x * cosY - point.z * sinY;
    const rotatingZ = point.x * sinY + point.z * cosY;
    const rotatingY = point.y * cosP - rotatingZ * sinP;
    const finalZ = point.y * sinP + rotatingZ * cosP;
    const focal = Math.max(620, width * 0.65);
    const scale = focal / Math.max(210, focal + finalZ);
    const scatter = isEnding ? Math.min(1, Math.max(0, (window.scrollY - galaxyScene.offsetTop - height * 0.42) / (height * 0.42))) : 0;
    const side = rotatingX < 0 ? -1 : 1;
    const centerGap = scatter * Math.min(width * 0.26, 310);
    const pulse = reducedMotion ? 0.8 : 0.64 + Math.sin(time * 0.001 * point.speed + point.phase) * 0.26;
    const depthRatio = Math.max(0, Math.min(1, (finalZ + cloudRadius) / (cloudRadius * 2)));

    return {
      point,
      x: width * 0.5 + rotatingX * scale + side * centerGap,
      y: height * 0.5 + rotatingY * scale,
      radius: point.size * 1.2,
      alpha: Math.max(0.14, Math.min(1, pulse * (1.12 - depthRatio * 0.38))),
      scale,
    };
  }

  function drawGalaxy(time = 0) {
    animationFrame = 0;
    const frameTime = previousFrameTime ? Math.min(50, Math.max(0, time - previousFrameTime)) : 16.67;
    previousFrameTime = time;
    if (!reducedMotion && !isDragging && !joystickActive && !isEnding) {
      targetYaw -= frameTime * 0.000045;
    }
    if (joystickActive) {
      targetYaw += joystickX * 0.018;
      targetPitch = Math.max(-0.52, Math.min(0.52, targetPitch + joystickY * 0.012));
    }
    yaw += (targetYaw - yaw) * 0.075;
    pitch += (targetPitch - pitch) * 0.075;

    context.fillStyle = "#000";
    context.fillRect(0, 0, width, height);

    projectedPoints = points
      .map((point) => projectPoint(point, time))
      .filter((item) => item.x > -50 && item.x < width + 50 && item.y > -50 && item.y < height + 50)
      .sort((a, b) => a.scale - b.scale);

    projectedPoints.forEach((item) => {
      const interactive = item.point.recordIndex !== null;
      const highlighted = hoveredPoint === item.point;
      const radius = item.radius * (interactive ? 1.25 : 0.78) * (highlighted ? 1.5 : 1);
      const glowRadius = Math.min(72, Math.max(10, radius * (interactive ? 7.5 : 4.8)));
      context.globalAlpha = Math.min(1, item.alpha * (interactive ? 0.94 : 0.62));
      context.drawImage(
        interactive ? interactiveGlowSprite : ambientGlowSprite,
        item.x - glowRadius,
        item.y - glowRadius,
        glowRadius * 2,
        glowRadius * 2,
      );
      context.globalAlpha = 1;

      context.fillStyle = `rgba(255, 236, 148, ${Math.min(1, item.alpha + 0.2)})`;
      context.beginPath();
      context.arc(item.x, item.y, Math.max(0.8, radius), 0, Math.PI * 2);
      context.fill();

      if (interactive && highlighted) {
        context.strokeStyle = "rgba(255, 224, 129, 0.62)";
        context.lineWidth = 1;
        context.beginPath();
        context.arc(item.x, item.y, Math.max(14, radius * 4.4), 0, Math.PI * 2);
        context.stroke();
      }
    });

    if (isVisible && (!reducedMotion || Math.abs(targetYaw - yaw) > 0.001 || Math.abs(targetPitch - pitch) > 0.001)) {
      animationFrame = window.requestAnimationFrame(drawGalaxy);
    }
  }

  function requestDraw() {
    if (!animationFrame && isVisible) {
      animationFrame = window.requestAnimationFrame(drawGalaxy);
    }
  }

  function findPoint(clientX, clientY) {
    const rect = galaxyCanvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let nearest = null;
    let distance = Number.POSITIVE_INFINITY;
    const baseTolerance = finePointer ? 32 : 44;

    projectedPoints.forEach((item) => {
      if (item.point.recordIndex === null) {
        return;
      }
      const nextDistance = Math.hypot(item.x - x, item.y - y);
      const hitRadius = Math.min(68, Math.max(baseTolerance, item.radius * 4.5));
      if (nextDistance < hitRadius && nextDistance < distance) {
        nearest = item;
        distance = nextDistance;
      }
    });

    return nearest;
  }

  function setHoveredPoint(projectedPoint) {
    const point = projectedPoint?.point || null;
    if (hoveredPoint === point) {
      return;
    }
    hoveredPoint = point;
    galaxyHint?.classList.toggle("is-near", Boolean(point));
    if (galaxyHint) {
      galaxyHint.textContent = point ? "点击这束荧火，查看微光" : "靠近一束微光，轻触展开";
    }
    requestDraw();
  }

  function updateRecordNavigation() {
    const canNavigate = records.length > 1 && activeRecordIndex >= 0;
    if (fireflyDialogNav) {
      fireflyDialogNav.hidden = !canNavigate;
    }
    if (fireflyDialogPrev) {
      fireflyDialogPrev.disabled = !canNavigate;
    }
    if (fireflyDialogNext) {
      fireflyDialogNext.disabled = !canNavigate;
    }
  }

  function renderRecord(record, recordIndex = records.indexOf(record)) {
    if (!record || !fireflyDialogTitle || !fireflyDialogKicker) {
      return;
    }

    activeRecordIndex = recordIndex >= 0 ? recordIndex : records.indexOf(record);
    fireflyDialog.classList.remove("is-composer");
    updateRecordNavigation();
    fireflyDialogKicker.hidden = false;
    fireflyDialogKicker.textContent = "星河来信";
    const recordTitle = typeof record.title === "string" ? record.title.trim() : "";
    fireflyDialogTitle.textContent = recordTitle;
    fireflyDialogTitle.hidden = !recordTitle;
    if (recordTitle) {
      fireflyDialog.setAttribute("aria-labelledby", "firefly-dialog-title");
      fireflyDialog.removeAttribute("aria-label");
    } else {
      fireflyDialog.removeAttribute("aria-labelledby");
      fireflyDialog.setAttribute("aria-label", "星河来信");
    }
    fireflyDialogContent.replaceChildren();

    const card = document.createElement("section");
    card.className = "firefly-record-card";
    const message = document.createElement("blockquote");
    message.className = "firefly-message";
    const body = document.createElement("p");
    body.textContent = record.content || "这束微光还在等待一句话。";
    const recordSignature = typeof record.signature === "string" ? record.signature.trim() : "";
    const signature = document.createElement("footer");
    signature.textContent = `—— ${recordSignature || "一位路过的炭火"}`;
    message.append(body, signature);
    card.appendChild(message);

    if (record.type === "website" && record.url) {
      const link = document.createElement("a");
      link.href = record.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "打开网页 ↗";
      card.appendChild(link);
    }
    fireflyDialogContent.appendChild(card);

    if (!fireflyDialog.open) {
      fireflyDialog.showModal();
    }
  }

  function showRelativeRecord(offset) {
    if (!records.length || activeRecordIndex < 0) {
      return;
    }
    const nextIndex = (activeRecordIndex + offset + records.length) % records.length;
    renderRecord(records[nextIndex], nextIndex);
  }

  function openComposer() {
    if (!fireflyDialogTitle || !fireflyDialogKicker) {
      return;
    }
    activeRecordIndex = -1;
    fireflyDialog.classList.add("is-composer");
    updateRecordNavigation();
    fireflyDialogKicker.hidden = true;
    fireflyDialogKicker.textContent = "";
    fireflyDialogTitle.hidden = false;
    fireflyDialogTitle.textContent = "写下你的微光";
    fireflyDialog.setAttribute("aria-labelledby", "firefly-dialog-title");
    fireflyDialog.removeAttribute("aria-label");
    fireflyDialogContent.replaceChildren();

    const embed = document.createElement("section");
    embed.className = "firefly-form-embed";

    const loading = document.createElement("p");
    loading.className = "firefly-form-loading";
    loading.textContent = "正在连接星河信箱…";

    const frame = document.createElement("iframe");
    frame.className = "firefly-form-frame";
    frame.src = fireflyFormUrl;
    frame.title = "投递萤火表单";
    frame.loading = "eager";
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    const loadTimer = window.setTimeout(() => {
      if (!embed.classList.contains("is-loaded")) {
        embed.classList.add("is-unavailable");
        loading.textContent = "飞书表单无法在当前页面内显示，请在新窗口继续投递。";
      }
    }, 6000);
    frame.addEventListener("load", () => {
      window.clearTimeout(loadTimer);
      embed.classList.add("is-loaded");
    });

    const fallback = document.createElement("p");
    fallback.className = "firefly-form-fallback";
    fallback.append("表单没有显示？", Object.assign(document.createElement("a"), {
      href: fireflyFormUrl,
      target: "_blank",
      rel: "noopener noreferrer",
      textContent: "在新窗口填写 ↗",
    }));

    embed.append(loading, frame, fallback);
    fireflyDialogContent.appendChild(embed);
    fireflyDialog.showModal();
  }

  function showToast() {
    window.clearTimeout(toastTimer);
    galaxyToast?.classList.add("is-visible");
    toastTimer = window.setTimeout(() => galaxyToast?.classList.remove("is-visible"), 2200);
  }

  galaxyCanvas.addEventListener("pointerdown", (event) => {
    if (isEnding) {
      return;
    }
    isDragging = true;
    dragMoved = false;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    previousPointerX = event.clientX;
    previousPointerY = event.clientY;
    galaxyCanvas.classList.add("is-dragging");
    galaxyCanvas.setPointerCapture(event.pointerId);
  });

  galaxyCanvas.addEventListener("pointermove", (event) => {
    if (!isDragging) {
      setHoveredPoint(findPoint(event.clientX, event.clientY));
      return;
    }

    const movementX = event.clientX - previousPointerX;
    const movementY = event.clientY - previousPointerY;
    if (Math.hypot(event.clientX - pointerStartX, event.clientY - pointerStartY) > 6) {
      dragMoved = true;
    }
    targetYaw += movementX * 0.0042;
    targetPitch = Math.max(-0.52, Math.min(0.52, targetPitch + movementY * 0.0034));
    previousPointerX = event.clientX;
    previousPointerY = event.clientY;
    setHoveredPoint(null);
    requestDraw();
  });

  function finishPointer(event) {
    if (!isDragging) {
      return;
    }
    isDragging = false;
    galaxyCanvas.classList.remove("is-dragging");
    if (!dragMoved) {
      const selected = findPoint(event.clientX, event.clientY);
      if (selected && records.length) {
        const randomIndex = Math.floor(Math.random() * records.length);
        renderRecord(records[randomIndex], randomIndex);
      }
    }
  }

  galaxyCanvas.addEventListener("pointerup", finishPointer);
  galaxyCanvas.addEventListener("pointercancel", () => {
    isDragging = false;
    galaxyCanvas.classList.remove("is-dragging");
  });
  galaxyCanvas.addEventListener("pointerleave", () => {
    if (!isDragging) {
      setHoveredPoint(null);
    }
  });

  function updateJoystick(clientX, clientY) {
    if (!galaxyJoystick || !galaxyJoystickKnob) {
      return;
    }
    const rect = galaxyJoystick.getBoundingClientRect();
    const radius = Math.max(1, rect.width * 0.31);
    const rawX = clientX - (rect.left + rect.width / 2);
    const rawY = clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(rawX, rawY);
    const scale = distance > radius ? radius / distance : 1;
    const offsetX = rawX * scale;
    const offsetY = rawY * scale;
    joystickX = offsetX / radius;
    joystickY = offsetY / radius;
    targetYaw += joystickX * 0.022;
    targetPitch = Math.max(-0.52, Math.min(0.52, targetPitch + joystickY * 0.016));
    galaxyJoystickKnob.style.transform = `translate(calc(-50% + ${offsetX.toFixed(1)}px), calc(-50% + ${offsetY.toFixed(1)}px))`;
    requestDraw();
  }

  function resetJoystick() {
    joystickActive = false;
    joystickPointerId = null;
    joystickX = 0;
    joystickY = 0;
    galaxyJoystick?.classList.remove("is-active");
    if (galaxyJoystickKnob) {
      galaxyJoystickKnob.style.removeProperty("transform");
    }
  }

  galaxyJoystick?.addEventListener("pointerdown", (event) => {
    if (isEnding) {
      return;
    }
    event.preventDefault();
    joystickActive = true;
    joystickPointerId = event.pointerId;
    galaxyJoystick.classList.add("is-active");
    galaxyJoystick.setPointerCapture(event.pointerId);
    updateJoystick(event.clientX, event.clientY);
  });

  galaxyJoystick?.addEventListener("pointermove", (event) => {
    if (!joystickActive || event.pointerId !== joystickPointerId) {
      return;
    }
    event.preventDefault();
    updateJoystick(event.clientX, event.clientY);
  });

  galaxyJoystick?.addEventListener("pointerup", resetJoystick);
  galaxyJoystick?.addEventListener("pointercancel", resetJoystick);
  galaxyJoystick?.addEventListener("lostpointercapture", resetJoystick);
  galaxyJoystick?.addEventListener("keydown", (event) => {
    const keySteps = {
      ArrowLeft: [-0.18, 0],
      ArrowRight: [0.18, 0],
      ArrowUp: [0, -0.14],
      ArrowDown: [0, 0.14],
    };
    const step = keySteps[event.key];
    if (!step) {
      return;
    }
    event.preventDefault();
    targetYaw += step[0];
    targetPitch = Math.max(-0.52, Math.min(0.52, targetPitch + step[1]));
    requestDraw();
  });

  fireflyDialogClose?.addEventListener("click", () => fireflyDialog.close());
  fireflyDialogPrev?.addEventListener("click", () => showRelativeRecord(-1));
  fireflyDialogNext?.addEventListener("click", () => showRelativeRecord(1));
  fireflyDialog.addEventListener("click", (event) => {
    if (event.target === fireflyDialog) {
      fireflyDialog.close();
    }
  });
  window.addEventListener("keydown", (event) => {
    const isEditing = event.target instanceof Element && event.target.closest("input, textarea, select");
    if (!fireflyDialog.open || fireflyDialogNav?.hidden || isEditing) {
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showRelativeRecord(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      showRelativeRecord(1);
    }
  });
  submitButton?.addEventListener("click", openComposer);
  galaxyDown?.addEventListener("click", () => galaxyEndingTrigger?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" }));
  galaxyHome?.addEventListener("click", () => document.getElementById("s1")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" }));
  galaxyReturn?.addEventListener("click", () => galaxyScene.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" }));

  const galaxyObserver = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    document.body.classList.toggle("scene-four-active", entry.isIntersecting);
    if (entry.isIntersecting) {
      requestDraw();
    } else {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      previousFrameTime = 0;
    }
  }, { threshold: 0.03 });
  galaxyObserver.observe(galaxyScene);

  if (galaxyEndingTrigger) {
    const endingObserver = new IntersectionObserver(([entry]) => {
      isEnding = entry.isIntersecting;
      galaxyScene.classList.toggle("is-ending", isEnding);
      galaxyEndingLayer?.setAttribute("aria-hidden", String(!isEnding));
      requestDraw();
    }, { threshold: 0.34 });
    endingObserver.observe(galaxyEndingTrigger);
  }

  if ("ResizeObserver" in window) {
    const galaxyResizeObserver = new ResizeObserver(resizeCanvas);
    galaxyResizeObserver.observe(galaxyStage);
  } else {
    window.addEventListener("resize", resizeCanvas);
  }

  resizeCanvas();
  loadRecords();
}

setUpCursor();
createYearNodes();
createFireflies();
setUpDialog();
setUpTimelineNavigation();
setUpTimelineVisibility();
setUpLotusScene();
setUpNightfallTransition();
setUpGalaxyScene();

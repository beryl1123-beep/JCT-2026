# Scene 2 Layer 2 Content Guide

这一层的内容建议按"一个被点击项 = 一个 Markdown 文件"来整理。

卷轴交互基于目前原型的理解是：

- 用户点击某个年份或时间段
- 展开卷轴，只显示这个被点击项的内容
- 卷轴主体区域可左右滑动查看更多事件
- 点击卷轴右侧收起按钮后，回到年份选择状态

## Recommended Structure

```text
content/
└── scene2-layer2/
    ├── _template-scroll-section.md
    ├── 01-2006.md
    ├── 02-2007.md
    ├── 03-2011-2015.md
    ├── 04-2021.md
    └── images/
        ├── 01-03-01.jpg
        ├── 01-05-01.jpg
        ├── 01-05-02.jpg
        └── ...
```

## Naming Rules

- Markdown file: `序号-展示标题.md`
- Image file: `文件序号-月份-图片序号.jpg`
- Use lowercase English letters, numbers, and `-`
- Avoid spaces and vague suffixes such as `final`, `new`, `v2`

## Example Names

- `01-2006.md`
- `02-2007.md`
- `03-2011-2015.md`
- `04-2021.md`

Matching images:

- `01-03-01.jpg`
- `01-05-01.jpg`
- `01-05-02.jpg`

## How To Use

1. Copy `_template-scroll-section.md`
2. Rename it to the clicked year or time segment
3. Fill in the timeline items by month or by year-month
4. Put the image files into `images/`
5. Keep the image filenames aligned with the Markdown file prefix and month

## Writing Tips

- One file should focus on one clicked item only
- Write content in strict chronological order
- Each event should be concise enough to fit into a horizontal scroll card
- Description can be 1 short paragraph or 2 short paragraphs
- If there is no official link, leave the field empty
- If one event has multiple images, keep them under the same event item

## For Future Frontend Conversion

The template is designed so the content can be converted into a scroll popup with:

- one popup per selected year or time segment
- horizontal scrolling event cards
- text + image mixed layout inside each card
- optional official link button when a link exists

## Current Frontend Connection

- `assets/js/main.js` 中的 `timelineFiles` 负责把 2006–2026 年映射到对应 Markdown 文件。
- 前端会在点击年份后读取文件，按 `## 序号｜[时间]` 分割成横向卡片。
- 图片仍放在本目录的 `images/` 下；文件不存在时会自动显示“影像待审”占位。
- 新增或重命名年份文件后，请同步更新 `timelineFiles`，无需修改卡片 HTML。

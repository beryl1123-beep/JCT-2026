# JCT-20

这是“银河蝴蝶”生日网站的静态项目版本。目前已完成首页、第二幕“廿载长卷”、第三幕“莲开蝶至”和第四幕“萤火星河”的交互原型。

当前浏览方式：

- 第一幕不再依赖点击切场；向上滑动即可自然进入第二幕。
- 第二幕使用 `SecondPage-background.png` 作为横向山水长卷。
- 横向拖动长卷可浏览 2006–2026 年份光点。
- 点击年份光点会读取 `content/scene2-layer2/` 下对应的 Markdown，并展开图文卷页。
- 缺少或仍待确认的图片会显示“影像待审”占位，不影响资料审查。
- 第四幕“星河寄语”可拖拽金色萤火星河；每个光点都会读取 `content/scene4/fireflies.json` 中的记录并展开信笺，信笺可直接切换上一张或下一张。
- 飞书审核数据可通过 `scripts/feishu-csv-to-fireflies.mjs` 转成网页数据；具体操作见 `docs/飞书数据更新到GitHub.md`。
- 第一幕右侧人物使用本地 Three.js 与 Shader 粒子呈现；三处衣摆会循环落下墨流粒子，下滑首屏时粒子逐渐散去并显出原人物图。预生成数据位于 `assets/data/hero-particle-data.js`，可通过 `scripts/build_hero_particle_data.swift` 在替换人物图后重新生成。手机端限制粒子数量和像素比，低帧率、减少动态效果或 WebGL 不可用时自动显示原人物 PNG。
- 右下角炭火 GIF 用于投递新的文字或网页微光；接入正式数据库前，原型数据只保存在当前浏览器。
- 第四幕继续向下会进入结束层；结束插画使用预生成彩色采样点产生火星式上升粒子，并叠加主体呼吸光晕。预生成数据位于 `assets/data/companion-spark-data.js`，可以直接通过 Chrome 的 `file://` 地址或 GitHub Pages 运行。

## 项目结构

```text
JCT-20/
├── index.html
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── main.js
│   │   ├── hero-particles.js
│   │   └── companion-sparks.js
│   ├── data/
│   │   ├── hero-particle-data.js
│   │   └── companion-spark-data.js
│   ├── images/
│   └── fonts/
├── scripts/
│   ├── build_hero_particle_data.swift
│   └── build_companion_assets.swift
├── content/
│   ├── scene2-layer2/
│   └── scene4/
└── README.md
```

## 你需要放进去的源文件

把你现有的两张首页图片和字体文件放到下面这些位置：

1. 人物主视觉图
   路径：`assets/images/home-character.PNG`

2. 首页标题图
   路径：`assets/images/home-title.PNG`

3. 首页背景图
   路径：`assets/images/home-background.WEBP`

4. 字体文件
   文件夹：`assets/fonts/`

   推荐直接把字体文件改成以下任意一个名字放进去：

   - `huiwen.woff2`
   - `huiwen.woff`
   - `huiwen.ttf`
   - `huiwen.otf`

5. 第四幕投递按钮 GIF
   路径：`assets/images/fire-character.gif`

6. 第四幕结束插画
   路径：`assets/images/companion-hedgehog.png`

   与它配套的呼吸光晕和粒子采样数据分别是：

   - `assets/images/companion-glow.png`
   - `assets/data/companion-spark-data.js`

   替换结束插画后，应运行 `scripts/build_companion_assets.swift` 重新生成这两个文件。文件名和扩展名大小写必须与这里完全一致，确保 GitHub Pages 可以正确读取。

`style.css` 已经写好了这几种常见格式的回退顺序，只要其中一个文件存在即可。

## 说明

- 现在项目会直接读取 `home-background.WEBP` 作为背景图，不叠加纸面质感或颜色遮罩。
- 如果你的图片扩展名不是 `.png`，也可以直接改 `index.html` 里这两行路径：
  - `./assets/images/home-character.PNG`
  - `./assets/images/home-title.PNG`
- 如果你的字体文件名不想改，就到 `assets/css/style.css` 里修改 `@font-face` 的 `src` 路径即可。

## 本地预览

直接打开 `index.html` 就能看页面。

如果你想避免部分浏览器对本地文件的限制，建议用一个简单静态服务器预览，比如：

```bash
python3 -m http.server 8000
```

然后访问 `http://localhost:8000/`

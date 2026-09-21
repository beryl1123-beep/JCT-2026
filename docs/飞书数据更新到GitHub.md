# 把飞书最新数据更新到 GitHub

网站展示的数据文件是 `content/scene4/fireflies.json`。飞书表单只负责收集内容；审核完成后，需要从多维表格导出 CSV，再用项目里的转换工具更新这个 JSON 文件。

## 第一次准备

1. 安装 GitHub Desktop，并登录自己的 GitHub 账号。
2. 在 GitHub Desktop 中选择 `File` → `Add Local Repository`，打开本项目文件夹：
   `/Users/beryl/Documents/Codex/JCT-20`
3. 确认当前分支是 `main`。

## 每次更新数据

1. 打开飞书多维表格，在“审核状态”列把可以公开的内容设为“✅通过”。
2. 在表格右上角选择导出 CSV。CSV 可以包含全部记录，转换工具只会保留审核通过的内容。
3. 打开“终端”，运行：

   ```bash
   cd /Users/beryl/Documents/Codex/JCT-20
   node scripts/feishu-csv-to-fireflies.mjs "/这里替换成/飞书导出的文件.csv"
   ```

4. 打开 `content/scene4/fireflies.json` 简单检查：标题允许为空；昵称为空时，网页会自动显示“一位路过的炭火”。
5. 回到 GitHub Desktop，在左下角摘要填写“更新飞书萤火数据”，点击 `Commit to main`，再点击顶部 `Push origin`。
6. GitHub Pages 会自动重新发布。通常等待 1～3 分钟，刷新网站即可看到新内容。

## CSV 字段要求

转换工具兼容最新版表单对应的字段：

- 标题（可空）
- 内容类型（纯文字 / 网页链接）
- 🔗 网址链接
- 微光正文
- 署名（表单中显示为“昵称”，可空）
- 审核状态（只有“✅通过”会公开）
- 创建时间（建议保留，用来决定展示顺序）

不要把飞书 App Secret、访问令牌或其他密钥上传到 GitHub。当前这套更新方式不需要任何密钥。

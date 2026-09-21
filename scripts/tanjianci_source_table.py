#!/usr/bin/env python3

from __future__ import annotations

import argparse
import html
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

UA = {"User-Agent": "Mozilla/5.0"}
PERSON_BAIKE = "https://baike.baidu.com/item/%E6%AA%80%E5%81%A5%E6%AC%A1/8906275"
MIC_BAIKE = "https://baike.baidu.com/item/MIC%E7%94%B7%E5%9B%A2/6209104"

HIGH_DOMAINS = [
    "cctv.com",
    "tv.cctv.com",
    "v.qq.com",
    "qq.com",
    "iqiyi.com",
    "iq.com",
    "youku.com",
    "mgtv.com",
    "y.qq.com",
    "qqmusic.qq.com",
    "music.163.com",
    "music.apple.com",
    "1905.com",
    "bjiff.com",
    "bjtv.com.cn",
    "brtn.cn",
    "smg.cn",
    "migu.cn",
]

MED_DOMAINS = [
    "people.com.cn",
    "xinhuanet.com",
    "chinanews.com.cn",
    "cnr.cn",
    "ynet.com",
    "bjnews.com.cn",
    "bjd.com.cn",
    "sohu.com",
    "sina.com.cn",
    "163.com",
    "ifeng.com",
    "thepaper.cn",
    "globalpeople.com.cn",
    "china.com.cn",
]

BAD_PATTERNS = [
    "zhidao.baidu",
    "tieba.baidu",
    "zhihu.com",
    "bilibili.com",
    "douyin.com",
    "xiaohongshu.com",
    "xhslink.com",
    "kuaishou.com",
    "tvmao.com",
    "cjbaike.com",
    "toutiao.com",
    "douban.com",
    "wikipedia.org",
    "baike.sogou.com",
    "tmdb.org",
    "youtube.com",
]

WEIBO_OFFICIAL_HINTS = [
    "工作室",
    "官方",
    "电视剧",
    "短剧集",
    "腾讯视频",
    "爱奇艺",
    "优酷",
    "湖南卫视",
    "东方卫视",
    "北京卫视",
    "浙江卫视",
    "央视",
    "总台",
    "QQ音乐",
    "微博",
]

BROADCAST_HINTS = [
    "央视",
    "中央广播电视总台",
    "湖南卫视",
    "东方卫视",
    "北京卫视",
    "浙江卫视",
    "江苏卫视",
    "安徽卫视",
    "深圳卫视",
    "山东卫视",
    "优酷",
    "腾讯视频",
    "爱奇艺",
    "芒果TV",
    "QQ音乐",
    "微博",
    "快手",
    "抖音",
]

EVENT_KEYWORDS = [
    "定档",
    "开机",
    "播出",
    "开播",
    "首播",
    "上映",
    "上线",
    "发行",
    "首发",
    "发布",
    "预售",
    "举行",
    "录制",
    "参加",
    "加盟",
    "官宣",
    "获奖",
    "演唱",
    "出席",
    "担任",
    "研讨会",
    "配音",
]


def parse_entries(text: str) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    year = None
    for line in text.splitlines():
        m = re.match(r"##\s+(\d{4})\s+年", line)
        if m:
            year = int(m.group(1))
            continue
        if line.startswith("|") and "------" not in line and " 月份 " not in line:
            parts = [p.strip() for p in line.strip("|").split("|")]
            if len(parts) == 3:
                entries.append(
                    {
                        "year": year,
                        "month": parts[0],
                        "category": parts[1],
                        "content": parts[2],
                    }
                )
    return entries


def clean_text(s: str) -> str:
    s = re.sub(r"（.*?）", "", s)
    s = re.sub(r"\(.*?\)", "", s)
    s = s.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
    return s.strip()


def first_title_or_event(content: str) -> tuple[str, list[str]]:
    titles = re.findall(r"《([^》]+)》", content)
    if titles:
        return titles[0], titles
    m = re.search(r'["“](.+?)["”]', content)
    if m:
        return m.group(1), []
    m = re.match(
        r"(.{4,24}?)(?:播出|开播|举行|上线|上映|开机|首播|发行|获奖|演唱|出席|参加|加盟|官宣)",
        content,
    )
    if m:
        return m.group(1), []
    return "", []


def detect_action(content: str) -> str:
    for k in EVENT_KEYWORDS:
        if k in content:
            return k
    return ""


def detect_hint(content: str) -> str:
    for h in BROADCAST_HINTS:
        if h in content:
            return h
    return ""


def entity_name(content: str) -> str:
    return "MIC男团" if "MIC男团" in content else "檀健次"


def build_queries(entry: dict[str, Any]) -> list[str]:
    content = clean_text(entry["content"])
    main, _ = first_title_or_event(content)
    hint = detect_hint(content)
    entity = entity_name(content)
    category = entry["category"]
    queries: list[str] = []

    if main:
        queries.append(main)

    if "🎵" in category:
        if main:
            queries += [f"{main} QQ音乐", f"{main} {entity}"]
        else:
            queries += [f"{content[:18]} {entity}", content[:28]]
    elif "📺" in category or "🎬" in category:
        kind = "电视剧" if "📺" in category else "电影"
        if main:
            queries += [f"{main} {kind}", f"{main} {entity}"]
        else:
            queries += [f"{content[:18]} {entity}", content[:28]]
    elif "🎤" in category:
        if main:
            queries += [f"{main} {hint}".strip(), f"{main} {entity}"]
        else:
            base = content[:18]
            queries += [f"{base} {hint or entity}".strip(), f"{base} {entity}"]
    elif "🏆" in category:
        base = main or content[:18]
        queries += [f"{base} {entity}", content[:28]]
    else:
        if main:
            queries += [f"{main} {hint or entity}".strip(), f"{main} {entity}"]
        else:
            base = content[:20]
            queries += [f"{base} {entity}", content[:28]]

    queries.append(f"site:weibo.com {main or content[:14]}")

    out: list[str] = []
    seen: set[str] = set()
    for query in queries:
        query = re.sub(r"\s+", " ", query).strip()
        if query and query not in seen:
            out.append(query)
            seen.add(query)
    return out[:3]


def ddg_search(query: str, cache: dict[str, list[dict[str, str]]]) -> list[dict[str, str]]:
    if query in cache:
        return cache[query]

    url = "https://duckduckgo.com/html/?q=" + urllib.parse.quote(query)
    last_error = None
    text = ""
    for attempt in range(2):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=5) as response:
                text = response.read().decode("utf-8", errors="ignore")
            break
        except Exception as exc:  # pragma: no cover - network variability
            last_error = exc
            if attempt == 0:
                time.sleep(0.5)
            else:
                raise last_error

    results: list[dict[str, str]] = []
    for match in re.finditer(
        r'<a rel="nofollow" class="result__a" href="([^"]+)">(.*?)</a>', text
    ):
        href = html.unescape(match.group(1))
        title = re.sub("<.*?>", "", html.unescape(match.group(2))).strip()
        if href.startswith("//"):
            href = "https:" + href
        try:
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(href).query)
            href = qs.get("uddg", [href])[0]
        except Exception:
            pass
        results.append({"title": title, "url": href})
        if len(results) >= 8:
            break

    cache[query] = results
    time.sleep(0.02)
    return results


def domain_score(url: str, title: str = "") -> int:
    lower_url = url.lower()
    domain = urllib.parse.urlparse(url).netloc.lower()
    if any(bad in lower_url or bad in domain for bad in BAD_PATTERNS):
        return -10
    if "baike.baidu.com" in domain:
        return 2
    if any(d in domain for d in HIGH_DOMAINS):
        return 9
    if any(d in domain for d in MED_DOMAINS):
        return 7
    if "weibo.com" in domain:
        score = 4
        if any(hint in title for hint in WEIBO_OFFICIAL_HINTS):
            score += 3
        return score
    return 0


def relevance_score(entry: dict[str, Any], candidate: dict[str, str]) -> int:
    content = entry["content"]
    title = candidate["title"]
    url = candidate["url"]
    score = domain_score(url, title)
    main, titles = first_title_or_event(content)

    if main and main in title:
        score += 3
    if main and main in url:
        score += 2
    for title_name in titles[:2]:
        if title_name in title:
            score += 2
    action = detect_action(content)
    if action and action in title:
        score += 1
    entity = entity_name(content)
    if entity in title:
        score += 1
    if "weibo.com" in url and not any(hint in title for hint in WEIBO_OFFICIAL_HINTS):
        score -= 1
    return score


def baike_fallback(
    entry: dict[str, Any], cache: dict[str, list[dict[str, str]]]
) -> dict[str, Any]:
    content = entry["content"]
    if "MIC男团" in content and "《" not in content:
        return {"title": "MIC男团_百度百科", "url": MIC_BAIKE, "score": 5, "query": "fallback"}

    main, _ = first_title_or_event(content)
    if main:
        try:
            hits = ddg_search(main, cache)
        except Exception:
            hits = []
        for hit in hits:
            if "baike.baidu.com" in hit["url"]:
                return {"title": hit["title"], "url": hit["url"], "score": 5, "query": main}

    return {"title": "檀健次_百度百科", "url": PERSON_BAIKE, "score": 4, "query": "fallback"}


def title_baike_fallback(
    entry: dict[str, Any], cache: dict[str, list[dict[str, str]]]
) -> dict[str, Any] | None:
    main, _ = first_title_or_event(entry["content"])
    if not main:
        return None
    try:
        hits = ddg_search(main, cache)
    except Exception:
        return None
    for hit in hits:
        if "baike.baidu.com" in hit["url"]:
            return {"title": hit["title"], "url": hit["url"], "score": 5, "query": main}
    return None


def ambiguous_title(title: str) -> bool:
    normalized = title.strip()
    if len(normalized) <= 2:
        return True
    if re.fullmatch(r"[A-Za-z0-9 .!_\-+&']+", normalized):
        return True
    return False


def early_candidate_is_specific(entry: dict[str, Any], candidate: dict[str, Any] | None) -> bool:
    if not candidate:
        return False
    main, titles = first_title_or_event(entry["content"])
    haystacks = [candidate.get("title", ""), candidate.get("url", "")]
    entity = entity_name(entry["content"])
    if any(entity in h for h in haystacks):
        return True
    for title_name in titles:
        if not title_name:
            continue
        if any(title_name in h for h in haystacks):
            if not ambiguous_title(title_name):
                return True
    if main and any(main in h for h in haystacks):
        if not ambiguous_title(main):
            return True
    if "MIC男团" in entry["content"] and any("MIC男团" in h for h in haystacks):
        return True
    return False


def process_entries(
    entries: list[dict[str, Any]],
    start: int,
    end: int,
) -> list[dict[str, Any]]:
    cache: dict[str, list[dict[str, str]]] = {}
    rows: list[dict[str, Any]] = []
    selected = entries[start:end]

    for offset, entry in enumerate(selected, start=start + 1):
        best = None
        tried: list[str] = []
        for query in build_queries(entry):
            tried.append(query)
            try:
                candidates = ddg_search(query, cache)
            except Exception:
                continue

            scored = sorted(
                (
                    {
                        "title": candidate["title"],
                        "url": candidate["url"],
                        "score": relevance_score(entry, candidate),
                        "query": query,
                    }
                    for candidate in candidates
                ),
                key=lambda x: x["score"],
                reverse=True,
            )

            if scored and scored[0]["score"] >= 8:
                best = scored[0]
                break
            if scored and (best is None or scored[0]["score"] > best["score"]):
                best = scored[0]

        found = best is not None and best["score"] >= 8
        if entry["year"] <= 2013 and not early_candidate_is_specific(entry, best):
            found = False
        if not found and entry["year"] <= 2013:
            best = baike_fallback(entry, cache)
            found = True
            note = "早期条目，回退为百度百科链接"
        elif not found:
            title_baike = title_baike_fallback(entry, cache)
            if title_baike:
                best = title_baike
                found = True
                note = "未命中更强信源，暂用百度百科作品/事件链接"
            else:
                note = "未找到合适信源（3次检索后略过）"
        else:
            note = "已找到"

        rows.append(
            {
                "序号": offset,
                "年份": entry["year"],
                "月份": entry["month"],
                "类别": entry["category"],
                "经历": entry["content"],
                "信源标题": best["title"] if found else "",
                "信源链接": best["url"] if found else "",
                "备注": note,
                "检索词": tried,
                "候选最高分": best["score"] if best else None,
            }
        )
    return rows


def render_markdown(rows: list[dict[str, Any]]) -> str:
    found_count = sum(1 for row in rows if row["信源链接"])
    missing_count = len(rows) - found_count
    lines = [
        "# 檀健次演艺年表（2006–2026）信源表",
        "",
        "> 说明：每条经历仅保留 1 条链接；每条最多尝试 3 次检索。2013 年及以前，如无更合适的作品/节目/报道链接，则回退为百度百科链接；2014 年及以后仍优先保留官方站、视频平台、央媒/主流媒体与官方微博。",
        "",
        f"> 统计：共 {len(rows)} 条，已找到 {found_count} 条，未找到 {missing_count} 条。",
        "",
        "| 序号 | 年份 | 月份 | 类别 | 经历 | 信源 | 备注 |",
        "|---:|---:|---|---|---|---|---|",
    ]
    for row in rows:
        link = (
            f'[{row["信源标题"]}]({row["信源链接"]})' if row["信源链接"] else "—"
        )
        category = row["类别"].replace("|", "/")
        content = row["经历"].replace("|", "/").replace("\n", " ")
        lines.append(
            f'| {row["序号"]} | {row["年份"]} | {row["月份"]} | {category} | {content} | {link} | {row["备注"]} |'
        )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="檀健次演艺年表2006-2026.md")
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--end", type=int, default=-1)
    parser.add_argument("--json-out", required=True)
    parser.add_argument("--markdown-out")
    args = parser.parse_args()

    input_path = Path(args.input)
    entries = parse_entries(input_path.read_text())
    end = len(entries) if args.end == -1 else min(args.end, len(entries))
    rows = process_entries(entries, args.start, end)

    json_out = Path(args.json_out)
    json_out.write_text(json.dumps(rows, ensure_ascii=False, indent=2))

    if args.markdown_out:
        Path(args.markdown_out).write_text(render_markdown(rows))

    print(f"processed={len(rows)} start={args.start} end={end}")
    print(f"found={sum(1 for row in rows if row['信源链接'])}")
    print(f"missing={sum(1 for row in rows if not row['信源链接'])}")
    print(f"json={json_out}")


if __name__ == "__main__":
    main()

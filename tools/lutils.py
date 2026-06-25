import json
import os
import re
import shutil
from datetime import datetime


# --- MANIFEST ---
VERSION = "v0.1.0"
DATE = "2026-06-25"
NAME = os.path.basename(__file__)
META = {"name": NAME, "version": VERSION}


def lessons_log(message, script_meta, level="INFO", conf=None):
    now = datetime.now()
    version_str = script_meta.get("version", "?.?")
    tag = f"[{script_meta['name']} {version_str}]"
    time_s = now.strftime("%H:%M:%S")
    time_f = now.strftime("%Y-%m-%d %H:%M:%S")
    msg = f"[{time_s}] {tag} [{level}] {message}"
    print(msg)

    log_dir = None
    if conf:
        log_dir = conf.get("LESSONS_LOG_DIR") or conf.get("LOG_DIR")
    if log_dir:
        try:
            os.makedirs(log_dir, exist_ok=True)
            log_file = os.path.join(log_dir, f"{script_meta['name']}.log")
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(f"[{time_f}] {tag} [{level}] {message}\n")
        except Exception:
            pass


def load_lessons_config():
    config_path = os.path.join(os.path.dirname(__file__), "..", "..", "BIN", "_config", "tconfig.txt")
    config_path = os.path.abspath(config_path)
    if not os.path.exists(config_path):
        print(f"КРИТИЧЕСКАЯ ОШИБКА: конфиг не найден: {config_path}")
        return None

    conf = {}
    base_dir = None
    with open(config_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.split("#")[0].strip()
            if "=" in line:
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip()
                conf[k] = v
                if k == "BASE_DIR":
                    base_dir = v

    if base_dir:
        for k in list(conf.keys()):
            if isinstance(conf[k], str) and "${BASE_DIR}" in conf[k]:
                conf[k] = conf[k].replace("${BASE_DIR}", base_dir)
    return conf


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def slugify(value):
    value = value.strip().lower()
    value = value.replace("ё", "е")
    value = re.sub(r"\s+", "_", value)
    value = re.sub(r"[^\w\-]+", "_", value, flags=re.UNICODE)
    value = re.sub(r"_+", "_", value).strip("_")
    return value or "lesson"


def build_filename(date_str, title):
    dt = datetime.fromisoformat(date_str)
    return f"{dt.strftime('%y%m%d_%H%M')}_{slugify(title)}.html"


def build_author_dir(author):
    return author.strip() or "Unknown Author"


def extract_passport_from_html(html_text):
    match = re.search(
        r'<script\s+type="application/json"\s+id="lesson-passport">\s*(\{.*?\})\s*</script>',
        html_text,
        re.DOTALL,
    )
    if not match:
        return None
    return json.loads(match.group(1))


def extract_legacy_metadata(html_text, file_path=None):
    title_match = re.search(r"<title>(.*?)</title>", html_text, re.IGNORECASE | re.DOTALL)
    h1_match = re.search(r"<h1>(.*?)</h1>", html_text, re.IGNORECASE | re.DOTALL)
    author_match = re.search(r'<div class="author">(.*?)</div>', html_text, re.IGNORECASE | re.DOTALL)
    lang_match = re.search(r'<html[^>]+lang="(.*?)"', html_text, re.IGNORECASE)

    title = strip_html(title_match.group(1)).strip() if title_match else ""
    heading = strip_html(h1_match.group(1)).strip() if h1_match else ""
    author = strip_html(author_match.group(1)).strip() if author_match else ""
    lang = (lang_match.group(1).strip() if lang_match else "ru") or "ru"

    if not title and heading:
        title = heading

    date_iso = ""
    if file_path:
        base = os.path.splitext(os.path.basename(file_path))[0]
        m = re.match(r"(?P<yy>\d{2})(?P<mm>\d{2})(?P<dd>\d{2})_(?P<hh>\d{2})(?P<mi>\d{2})", base)
        if m:
            year = 2000 + int(m.group("yy"))
            date_iso = f"{year:04d}-{m.group('mm')}-{m.group('dd')}T{m.group('hh')}:{m.group('mi')}:00"

    tags = []
    if heading:
        parts = [p.strip() for p in re.split(r"[—–-]", heading) if p.strip()]
        if parts:
            maybe_cycle = parts[0]
            if maybe_cycle and maybe_cycle != title:
                tags.append(maybe_cycle)

    return {
        "title": heading or title or os.path.splitext(os.path.basename(file_path or "lesson.html"))[0],
        "author": author,
        "cycle": "",
        "date": date_iso,
        "tags": tags,
        "lang": lang,
    }


def strip_html(value):
    value = re.sub(r"<[^>]+>", "", value)
    return re.sub(r"\s+", " ", value)


def read_text(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def write_text(path, content):
    ensure_dir(os.path.dirname(path))
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def copy_file(src, dst):
    ensure_dir(os.path.dirname(dst))
    shutil.copy2(src, dst)

import json
import os

from lutils import META, extract_legacy_metadata, extract_passport_from_html, lessons_log, load_lessons_config, read_text, write_text


# --- MANIFEST ---
VERSION = "v0.1.0"
DATE = "2026-06-25"
NAME = os.path.basename(__file__)
META = {"name": NAME, "version": VERSION}


def main():
    conf = load_lessons_config()
    if not conf:
        raise SystemExit(1)

    source_root = conf["LESSONS_SOURCE_LIBRARY"]
    output_json = conf["LESSONS_LIBRARY_JSON"]
    lessons_log(f"Инвентаризация библиотеки: {source_root}", META, "START", conf)

    items = []
    for root, _, files in os.walk(source_root):
        for name in files:
            if not name.lower().endswith(".html"):
                continue
            path = os.path.join(root, name)
            rel_path = os.path.relpath(path, source_root).replace(os.sep, "/")
            html = read_text(path)
            passport = extract_passport_from_html(html)
            if not passport:
                lessons_log(f"HTML-паспорт не найден, применяю fallback-разбор: {path}", META, "WARNING", conf)
                passport = extract_legacy_metadata(html, path)
            items.append(
                {
                    "file_path": f"Library/{rel_path}",
                    "date": passport.get("date", ""),
                    "author": passport.get("author", ""),
                    "title": passport.get("title", os.path.splitext(name)[0]),
                    "cycle": passport.get("cycle", ""),
                    "tags": passport.get("tags", []),
                    "lang": passport.get("lang", conf.get("LESSONS_DEFAULT_LANG", "ru")),
                }
            )

    items.sort(key=lambda x: x.get("date", ""), reverse=True)
    write_text(output_json, json.dumps(items, ensure_ascii=False, indent=2))
    lessons_log(f"library.json обновлён: {output_json} ({len(items)} уроков)", META, "DONE", conf)


if __name__ == "__main__":
    main()

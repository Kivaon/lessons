import argparse
import json
import os
from datetime import datetime

from lutils import (
    META,
    VERSION,
    build_author_dir,
    build_filename,
    ensure_dir,
    lessons_log,
    load_lessons_config,
    read_text,
    write_text,
)


# --- MANIFEST ---
VERSION = "v0.1.0"
DATE = "2026-06-25"
NAME = os.path.basename(__file__)
META = {"name": NAME, "version": VERSION}


HTML_TEMPLATE_FALLBACK = """<!DOCTYPE html>
<html lang=\"{lang}\">
<head>
  <meta charset=\"UTF-8\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
  <title>{title}</title>
  <script type=\"application/json\" id=\"lesson-passport\">{passport_json}</script>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 760px; margin: 0 auto; padding: 20px; line-height: 1.7; color: #243447; }}
    .meta {{ color: #5b6b79; margin-bottom: 24px; }}
    article {{ white-space: pre-wrap; }}
  </style>
</head>
<body>
  <h1>{title}</h1>
  <div class=\"meta\"><strong>{author}</strong>{cycle_line}<br>{date}</div>
  <article>{body}</article>
</body>
</html>
"""


def parse_args():
    parser = argparse.ArgumentParser(description="Генерация HTML-урока из Markdown/DOCX")
    parser.add_argument("--input", required=True)
    parser.add_argument("--author", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--cycle", default="")
    parser.add_argument("--date", default=datetime.now().replace(second=0, microsecond=0).isoformat())
    parser.add_argument("--tags", default="")
    parser.add_argument("--lang", default="ru")
    return parser.parse_args()


def main():
    args = parse_args()
    conf = load_lessons_config()
    if not conf:
        raise SystemExit(1)

    lessons_log(f"Старт генерации урока из {args.input}", META, "START", conf)
    input_path = os.path.abspath(args.input)
    if not os.path.exists(input_path):
        lessons_log(f"Входной файл не найден: {input_path}", META, "ERROR", conf)
        raise SystemExit(1)

    if input_path.lower().endswith(".docx"):
        try:
            from docx import Document
            doc = Document(input_path)
            body = "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except Exception as e:
            lessons_log(f"Ошибка чтения DOCX: {e}", META, "ERROR", conf)
            raise SystemExit(1)
    else:
        body = read_text(input_path)

    tags = [x.strip() for x in args.tags.split(",") if x.strip()]
    passport = {
        "title": args.title,
        "author": args.author,
        "cycle": args.cycle,
        "date": args.date,
        "tags": tags,
        "lang": args.lang,
        "source": os.path.basename(input_path),
    }

    template_path = conf.get("LESSONS_TEMPLATE", "")
    passport_json = json.dumps(passport, ensure_ascii=False, indent=2)
    cycle_line = f" · {args.cycle}" if args.cycle else ""
    if template_path and os.path.exists(template_path):
        template = read_text(template_path)
    else:
        template = HTML_TEMPLATE_FALLBACK

    html = template.format(
        title=args.title,
        author=args.author,
        cycle=args.cycle,
        cycle_line=cycle_line,
        date=args.date,
        lang=args.lang,
        body=body,
        passport_json=passport_json,
    )

    author_dir = os.path.join(conf["LESSONS_SOURCE_LIBRARY"], build_author_dir(args.author))
    ensure_dir(author_dir)
    output_path = os.path.join(author_dir, build_filename(args.date, args.title))
    write_text(output_path, html)
    lessons_log(f"HTML урок сохранён: {output_path}", META, "DONE", conf)


if __name__ == "__main__":
    main()

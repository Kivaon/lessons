import os
import shutil

from lutils import META, copy_file, lessons_log, load_lessons_config


# --- MANIFEST ---
VERSION = "v0.1.0"
DATE = "2026-06-25"
NAME = os.path.basename(__file__)
META = {"name": NAME, "version": VERSION}


def main():
    conf = load_lessons_config()
    if not conf:
        raise SystemExit(1)

    src_root = conf["LESSONS_SOURCE_LIBRARY"]
    dst_root = conf["LESSONS_PAGES_LIBRARY"]
    lessons_log(f"Синхронизация библиотеки: {src_root} -> {dst_root}", META, "START", conf)

    expected_paths = set()
    copied = 0
    for root, _, files in os.walk(src_root):
        for name in files:
            if not name.lower().endswith(".html"):
                continue
            src = os.path.join(root, name)
            rel = os.path.relpath(src, src_root)
            dst = os.path.join(dst_root, rel)
            expected_paths.add(os.path.normpath(dst))
            copy_file(src, dst)
            copied += 1

    removed = 0
    for root, _, files in os.walk(dst_root):
        for name in files:
            if not name.lower().endswith(".html"):
                continue
            dst_file = os.path.normpath(os.path.join(root, name))
            if dst_file not in expected_paths:
                os.remove(dst_file)
                removed += 1

    for root, dirs, _ in os.walk(dst_root, topdown=False):
        for dirname in dirs:
            dir_path = os.path.join(root, dirname)
            if not os.listdir(dir_path):
                os.rmdir(dir_path)

    lessons_log(f"Синхронизировано HTML-файлов: {copied}; удалено устаревших: {removed}", META, "DONE", conf)


if __name__ == "__main__":
    main()

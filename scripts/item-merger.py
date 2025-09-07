import json
from os import path, walk

RUST_GAME_PATH = r"C:\\Program Files (x86)\\Steam\steamapps\\common\\Rust"
RUST_BUNDLE_ITEMS_PATH = path.join(RUST_GAME_PATH, "Bundles", "items")


def main():
    items = []

    for dirpath, dirnames, filenames in walk(RUST_BUNDLE_ITEMS_PATH):
        for filename in filenames:
            if filename.endswith(".json"):
                full_path = path.join(dirpath, filename)

                with open(full_path, "r", encoding="utf-8") as file:
                    data = json.load(file)

                    items.append(data)

    with open("assets/items.json", "w", encoding="utf-8") as output_file:
        json.dump(items, output_file, indent=4)

    print(f"Merged {len(items)} items into assets/items.json")


if __name__ == "__main__":
    main()

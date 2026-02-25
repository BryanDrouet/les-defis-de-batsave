import sys
import os
import shutil
import re

def clean_key(selector):
    """Nettoie le sélecteur pour le tri (ignore ., #, --)"""
    s = selector.strip().lower()
    for char in ['.', '#', '--']:
        s = s.replace(char, '')
    return s.strip()

def sort_properties(content):
    """Trie les propriétés CSS (pour :root)"""
    props = [p.strip() for p in content.split(';') if p.strip()]
    props.sort()
    if not props:
        return ""
    return "\n    " + ";\n    ".join(props) + ";"

def parse_blocks(css_content):
    """
    Découpe le CSS en blocs logiques { selecteur: ..., contenu: ... }
    Gère l'imbrication (pour @media) grâce au comptage d'accolades.
    """
    blocks = []
    buffer_sel = ""
    buffer_content = ""
    depth = 0
    in_block = False
    
    i = 0
    while i < len(css_content):
        char = css_content[i]
        
        if char == '{':
            if depth == 0:
                in_block = True
                buffer_sel = buffer_sel.strip()
            else:
                buffer_content += char
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                in_block = False
                blocks.append({
                    'selector': buffer_sel,
                    'content': buffer_content,
                    'full_block': f"{buffer_sel} {{{buffer_content}}}"
                })
                buffer_sel = ""
                buffer_content = ""
            else:
                buffer_content += char
        else:
            if in_block:
                buffer_content += char
            else:
                buffer_sel += char
        i += 1
    return blocks

def process_sorting(blocks):
    """Trie les blocs selon les règles spécifiques"""
    
    cat_font = []
    cat_keyframes = []
    cat_media = []
    cat_root = []
    cat_star = []
    cat_html = []
    cat_body = []
    cat_others = []

    for block in blocks:
        sel = block['selector']
        content = block['content']

        if sel.startswith('@font-face'):
            cat_font.append(block)
        elif sel.startswith('@keyframes') or sel.startswith('@-webkit-keyframes'):
            cat_keyframes.append(block)
        elif sel.startswith('@media'):
            inner_blocks = parse_blocks(content)
            sorted_inner = process_sorting(inner_blocks)
            new_content = "\n" + "\n".join([b['full_block'] for b in sorted_inner]) + "\n"
            block['full_block'] = f"{sel} {{{new_content}}}"
            cat_media.append(block)
        elif sel.startswith(':root'):
            new_content = sort_properties(content)
            block['full_block'] = f"{sel} {{{new_content}\n}}"
            cat_root.append(block)
        elif sel.startswith('*'):
            cat_star.append(block)
        elif sel.startswith('html'):
            cat_html.append(block)
        elif sel.startswith('body'):
            cat_body.append(block)
        else:
            cat_others.append(block)

    cat_keyframes.sort(key=lambda x: clean_key(x['selector']))
    cat_media.sort(key=lambda x: clean_key(x['selector']))
    cat_others.sort(key=lambda x: clean_key(x['selector']))

    return cat_font + cat_keyframes + cat_media + cat_root + cat_star + cat_html + cat_body + cat_others

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 css_sorter.py <chemin_du_fichier_css>")
        sys.exit(1)

    filepath = sys.argv[1]

    if not os.path.exists(filepath):
        print(f"Erreur: Le fichier {filepath} n'existe pas.")
        sys.exit(1)

    backup_path = filepath + ".backup"
    shutil.copy2(filepath, backup_path)
    print(f"✅ Backup créé : {backup_path}")

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    blocks = parse_blocks(content)
    sorted_blocks = process_sorting(blocks)

    final_css = "\n\n".join([b['full_block'] for b in sorted_blocks])
    
    final_css = re.sub(r'\n{3,}', '\n\n', final_css)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(final_css)
    
    print(f"✨ CSS trié avec succès : {filepath}")
    print("Ordre appliqué : @font-face > @keyframes > @media > :root > * > html > body > Reste (A-Z)")

if __name__ == "__main__":
    main()
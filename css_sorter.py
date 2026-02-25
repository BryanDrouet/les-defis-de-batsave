import os
import shutil
import re

def list_css_files(start_path='.'):
    css_files = []
    for root, dirs, files in os.walk(start_path):
        if '.git' in dirs: dirs.remove('.git')
        if 'node_modules' in dirs: dirs.remove('node_modules')
        
        for file in files:
            if file.endswith('.css') and not file.endswith('.backup.css'):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, start_path)
                css_files.append(rel_path)
    return css_files

def get_raw_blocks(content):
    """
    Découpe le CSS en blocs logiques (règles complètes) en respectant les accolades imbriquées.
    """
    blocks = []
    current_block = ""
    brace_count = 0
    in_comment = False
    
    i = 0
    while i < len(content):
        char = content[i]
        
        if not in_comment and content[i:i+2] == '/*':
            in_comment = True
        elif in_comment and content[i:i+2] == '*/':
            in_comment = False
        
        current_block += char
        
        if not in_comment:
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    if current_block.strip():
                        blocks.append(current_block.strip())
                    current_block = ""
        
        i += 1
        
    if current_block.strip():
        blocks.append(current_block.strip())
        
    return blocks

def sort_key_clean(text):
    """
    Nettoie la chaîne pour le tri alphabétique (enlève ., #, -- et espaces)
    """
    first_line = text.split('{')[0].strip()
    clean = re.sub(r'[.#\-\s]', '', first_line).lower()
    return clean

def sort_properties_inside_block(block_content):
    """
    Trie les propriétés à l'intérieur d'un bloc (ex: :root)
    """
    match = re.match(r'([^{]+)\{\s*(.*)\s*\}', block_content, re.DOTALL)
    if not match:
        return block_content
    
    selector = match.group(1).strip()
    body = match.group(2).strip()
    
    props = [p.strip() for p in body.split(';') if p.strip()]
    props.sort(key=lambda x: x.replace('--', '').strip().lower())
    
    new_body = ";\n    ".join(props)
    if new_body:
        new_body += ";"
        
    return f"{selector} {{\n    {new_body}\n}}"

def sort_media_query(block_content):
    """
    Trie les blocs CSS à l'intérieur d'une media query
    """
    first_brace = block_content.find('{')
    last_brace = block_content.rfind('}')
    
    if first_brace == -1 or last_brace == -1:
        return block_content
        
    header = block_content[:first_brace+1]
    inner_content = block_content[first_brace+1:last_brace]
    
    sorted_inner = process_css_content(inner_content, is_root=False)
    
    indented_inner = "\n".join(["    " + line for line in sorted_inner.split('\n')])
    
    return f"{header}\n{indented_inner}\n}}"

def process_css_content(content, is_root=True):
    blocks = get_raw_blocks(content)
    
    font_face = []
    keyframes = []
    media = []
    root = []
    universal = []
    html_tag = []
    body_tag = []
    rest = []
    
    for block in blocks:
        selector = block.split('{')[0].strip().lower()
        
        if selector.startswith('@font-face'):
            font_face.append(block)
        elif selector.startswith('@keyframes') or selector.startswith('@-webkit-keyframes'):
            keyframes.append(block)
        elif selector.startswith('@media'):
            media.append(sort_media_query(block))
        elif selector.startswith(':root'):
            root.append(sort_properties_inside_block(block))
        elif selector.startswith('*'):
            universal.append(block)
        elif selector.startswith('html'):
            html_tag.append(block)
        elif selector.startswith('body'):
            body_tag.append(block)
        else:
            rest.append(block)

    font_face.sort(key=sort_key_clean)
    keyframes.sort(key=sort_key_clean)
    media.sort(key=sort_key_clean)
    root.sort(key=sort_key_clean)
    
    rest.sort(key=sort_key_clean)
    
    ordered_blocks = (
        font_face +
        keyframes +
        media +
        root +
        universal +
        html_tag +
        body_tag +
        rest
    )
    
    separator = "\n\n" if is_root else "\n"
    return separator.join(ordered_blocks)

def main():
    print("--- Trieur de CSS pour Batsave ---")
    files = list_css_files()
    
    if not files:
        print("Aucun fichier CSS trouvé.")
        return

    print("\nFichiers trouvés :")
    for i, f in enumerate(files):
        print(f"[{i+1}] {f}")
        
    choice = input("\nLequel veux-tu trier ? (numéro) : ")
    
    try:
        index = int(choice) - 1
        if 0 <= index < len(files):
            target_file = files[index]
            
            backup_file = target_file.replace('.css', '.backup.css')
            shutil.copy(target_file, backup_file)
            print(f"✅ Backup créé : {backup_file}")
            
            with open(target_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = process_css_content(content)
            
            with open(target_file, 'w', encoding='utf-8') as f:
                f.write(new_content)
                
            print(f"✨ CSS trié et sauvegardé dans : {target_file}")
            
        else:
            print("Numéro invalide.")
    except ValueError:
        print("Ce n'est pas un nombre.")

if __name__ == "__main__":
    main()
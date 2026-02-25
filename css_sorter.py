import os
import re
import shutil

def get_category_priority(selector):
    selector = selector.strip()
    
    if selector.startswith("@font-face"): return 1
    if selector.startswith("@import"): return 2
    if selector.startswith("@media"): return 3
    if selector.startswith("@keyframes") or selector.startswith("@-webkit-keyframes"): return 4
    
    if selector.startswith("@"): return 5
    
    if selector.startswith("::"): return 7
    if selector.startswith(":"): return 6
    
    if selector.startswith("*"): return 8
    if selector.startswith("html"): return 9
    if selector.startswith("body"): return 10
    
    return 11

def get_sort_key_for_rest(selector):
    cleaned = re.sub(r'[.#\-:]', '', selector).lower().strip()
    return cleaned

def sort_properties(body_content, indent_str):
    """Trie les propriétés à l'intérieur d'un bloc {}"""
    props = [p.strip() for p in body_content.split(';') if p.strip()]
    props.sort()
    
    if not props:
        return ""
    
    sorted_body = ""
    for prop in props:
        if not prop.endswith(';'):
            prop += ';'
        sorted_body += f"\n{indent_str}{prop}"
    
    return sorted_body + "\n"

def reindent_lines(body_content, indent_str):
    """Ré-indente proprement et ajoute des espaces aux accolades condensées"""
    lines = body_content.split('\n')
    indented_lines = []
    for line in lines:
        cleaned = line.strip()
        if cleaned:
            cleaned = re.sub(r'\{(?!\s)', '{ ', cleaned)
            cleaned = re.sub(r'(?<!\s)\}', ' }', cleaned)
            indented_lines.append(indent_str + cleaned)
    
    if indented_lines:
        return "\n" + "\n".join(indented_lines) + "\n"
    else:
        return ""

def parse_and_sort_css(content):
    indent_match = re.search(r'\n([ \t]+)', content)
    indent_str = indent_match.group(1) if indent_match else "    "

    blocks = []
    buffer = ""
    depth = 0
    in_comment = False
    i = 0
    
    while i < len(content):
        char = content[i]
        
        if content[i:i+2] == '/*' and not in_comment:
            in_comment = True
            buffer += char
            i += 1
            continue
        if content[i:i+2] == '*/' and in_comment:
            in_comment = False
            buffer += char + content[i+1]
            i += 2
            continue
            
        if in_comment:
            buffer += char
            i += 1
            continue

        if char == '{':
            if depth == 0:
                selector = buffer.strip()
                buffer = ""
            else:
                buffer += char
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                body = buffer.strip()
                
                if selector.startswith('@media') or selector.startswith('@keyframes') or selector.startswith('@-webkit-keyframes'):
                    formatted_body = reindent_lines(body, indent_str)

                elif selector.startswith('@font-face'):
                     formatted_body = sort_properties(body, indent_str)
                     
                else:
                    formatted_body = sort_properties(body, indent_str)

                blocks.append({
                    'selector': selector,
                    'body': formatted_body
                })
                buffer = ""
            else:
                buffer += char
        else:
            buffer += char
        
        i += 1

    def sort_logic(block):
        sel = block['selector']
        priority = get_category_priority(sel)
        
        if priority == 11:
            secondary = get_sort_key_for_rest(sel)
        else:
            secondary = sel
            
        return (priority, secondary)

    blocks.sort(key=sort_logic)

    output = ""
    for block in blocks:
        output += f"{block['selector']} {{{block['body']}}}\n\n"
    
    return output.strip() + "\n"

def list_css_files(root_dir):
    css_files = []
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith('.css') and not filename.endswith('.backup.css'):
                full_path = os.path.join(dirpath, filename)
                css_files.append(full_path)
    return css_files

def main():
    root_dir = os.getcwd()
    print(f"Recherche de fichiers CSS dans : {root_dir}")
    
    files = list_css_files(root_dir)
    
    if not files:
        print("Aucun fichier CSS trouvé.")
        return

    print("\nFichiers trouvés :")
    for idx, f in enumerate(files):
        print(f"[{idx + 1}] {os.path.relpath(f, root_dir)}")

    try:
        choice = input("\nQuel fichier voulez-vous trier ? (entrez le numéro) : ")
        file_index = int(choice) - 1
        
        if 0 <= file_index < len(files):
            target_file = files[file_index]
            
            backup_file = target_file.replace('.css', '.backup.css')
            shutil.copy2(target_file, backup_file)
            print(f"✅ Backup créé : {os.path.relpath(backup_file, root_dir)}")
            
            with open(target_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            try:
                sorted_content = parse_and_sort_css(content)
                
                with open(target_file, 'w', encoding='utf-8') as f:
                    f.write(sorted_content)
                
                print(f"🚀 Succès ! {os.path.relpath(target_file, root_dir)} a été trié proprement.")
                
            except Exception as e:
                print(f"❌ Erreur lors du parsing CSS : {e}")
                print("Restauration du backup...")
                shutil.copy2(backup_file, target_file)
                
        else:
            print("Numéro invalide.")
    except ValueError:
        print("Veuillez entrer un nombre valide.")

if __name__ == "__main__":
    main()
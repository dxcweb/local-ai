import os

def get_download_path():
    if os.name == 'nt':  # nt stands for Windows.
        return os.path.join(os.getenv('USERPROFILE'), 'Downloads')
    else:  # For Unix and Mac.
        return os.path.expanduser('~/Downloads')
    
def create_unique_folder(path, base_folder_name):
    counter = 0
    while True:
        if counter == 0:
            folder_name = base_folder_name
        else:
            folder_name = f"{base_folder_name}({counter})"
        
        full_path = os.path.join(path, folder_name)
        
        if not os.path.exists(full_path):
            os.makedirs(full_path)
            return full_path

        counter += 1

def generate_filename(path):
    if not os.path.exists(path):
        return path

    base, extension = os.path.splitext(path)
    counter = 1

    while os.path.exists(f"{base}({counter}){extension}"):
        counter += 1

    return f"{base}({counter}){extension}"
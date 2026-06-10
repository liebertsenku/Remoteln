import os
import sys

# Tambahkan path Backend ke sys.path agar import internal (seperti database, models) berfungsi
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'Backend'))

from main import app

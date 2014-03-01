import os
import shutil

shutil.rmtree("mcp_rep_dist", True)

os.system("python mcp_report_manager_setup.py py2exe")
os.system("python main_setup.py py2exe")

os.system("python CreatePackage.py")
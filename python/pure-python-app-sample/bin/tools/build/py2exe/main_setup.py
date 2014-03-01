from distutils.core import setup
import os
import py2exe

version_file = open("current_version.dat")
ver_str = version_file.read()
version_file.close()

path = "C:\\Users\\Media\\Desktop\\Projects\\MCP Software\\MCP Report Manager\\" + ver_str + "\\manager\\"
files = [("",[path + "MCP Report Manager Tutorial.doc",path + "current_version.dat",path + "dlls\\freesansbold.ttf",
                  path + "dlls\\libfreetype-6.dll",path + "dlls\\SDL_ttf.dll",path + "mcp_report_manager.conf"])]

setup(
        windows=['main.py'],
        data_files = files,
        zipfile = None,
        options={
                 "py2exe":{
                           "excludes":["numpy"],
                           "dll_excludes":["smpeg.dll","API-MS-Win-Core-LocalRegistry-L1-1-0.dll","API-MS-Win-Core-ProcessThreads-L1-1-0.dll","API-MS-Win-Security-Base-L1-1-0.dll",
                                           "libvorbisfile-3.dll","libvorbis-0.dll","SDL_mixer.dll","POWRPROF.dll"],
                           "dist_dir": "mcp_rep_dist/main/",
                           "optimize":2
                           }
                 }
      )

cmd_str = "xcopy \"" + path + "libs\\firefox\" \"" + path + "\\mcp_rep_dist\\main\\libs\\firefox\" /e /i /R /Y /q"
os.system(cmd_str)

cmd_str = "xcopy \"" + path + "libs\\epydoc\" \"" + path + "\\mcp_rep_dist\\main\\libs\\epydoc\" /e /i /R /Y /q"
os.system(cmd_str)

cmd_str = "xcopy \"" + path + "def\" \"" + path + "\\mcp_rep_dist\\main\\def\" /e /i /R /Y /q"
os.system(cmd_str)

cmd_str = "xcopy \"" + path + "macros\" \"" + path + "\\mcp_rep_dist\\main\\macros\" /e /i /R /Y /q"
os.system(cmd_str)

cmd_str = "xcopy \"" + path + "libs\\images\" \"" + path + "\\mcp_rep_dist\\main\\libs\\images\" /e /i /R /Y /q"
os.system(cmd_str)

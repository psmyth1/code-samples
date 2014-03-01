from distutils.core import setup
import os
import py2exe

version_file = open("current_version.dat")
ver_str = version_file.read()
version_file.close()

path = "C:\\Users\\Media\\Desktop\\Projects\\MCP Software\\MCP Report Manager\\" + ver_str + "\\manager\\"

files = [("",[path + "dlls\\freesansbold.ttf",path + "dlls\\libfreetype-6.dll",path + "dlls\\SDL_ttf.dll"])]

setup(
        windows=['MCPReportManager.py'],
        data_files = files,
        zipfile = None,
        options={
                 "py2exe":{
                           "excludes":["numpy","_ssl"],
                           "dll_excludes":["smpeg.dll","API-MS-Win-Core-LocalRegistry-L1-1-0.dll","API-MS-Win-Core-ProcessThreads-L1-1-0.dll","API-MS-Win-Security-Base-L1-1-0.dll",
                                           "libvorbisfile-3.dll","libvorbis-0.dll","SDL_mixer.dll","POWRPROF.dll"],
                           "optimize":2,
                           "dist_dir": "mcp_rep_dist"
                           }
                 }
      )

from ftplib import FTP
from zipfile import ZipFile
import os

class AutoUpdater:
    def __init__(self):
        self.mcp_soft = self.initiateConnection()
    
    def getRefreshList(self,version):
        error_msg = 0
        try:
            self.mcp_soft.cwd("/mcp_rep_man")
            self.mcp_soft.retrbinary("RETR ref_list_"+str(version)+".dat", open('ref_list.dat', 'wb').write)
            error_msg = 1
        except:
            error_msg = 2
        return error_msg
    
    def getPackage(self,version,pg=None):
        self.pg = pg
        error_msg = 0
        try:
            self.file = open("package.zip","wb")
            self.file_cur_size = 0
            self.prev_percent_done = 0
            self.file_total_size = self.mcp_soft.size("/mcp_rep_man/package"+str(version)+".zip")
            self.mcp_soft.cwd("/mcp_rep_man")
            self.mcp_soft.retrbinary("RETR package" + str(version) + ".zip", self.incrementDownload)
            self.file.close()
            error_msg = 1
        except:
            error_msg = 2
        return error_msg
    
    def extract(self):
        zfile = ZipFile("package.zip")
        zfile.extractall(os.getcwd())
    
    def incrementDownload(self,data):
        self.file.write(data)
        self.file_cur_size += len(data)
        
        percent_done = float(self.file_cur_size)/float(self.file_total_size)
        percent_done *= 100
        percent_done = int(percent_done)
        
        percent_done_diff = percent_done - self.prev_percent_done
        
        if self.pg != None:
            for i in range(0,percent_done_diff):
                self.pg.incSub()
        self.prev_percent_done = percent_done
       
    def initiateConnection(self):
        mcp_soft = FTP("ftp.mcpsoftware.net")
        mcp_soft.login("mcpdefault","Meridian1")
        return mcp_soft
    
    def getCurrentVersion(self):
        try:
            self.mcp_soft.cwd("/mcp_rep_man/")
            self.mcp_soft.retrbinary("RETR current_version.dat", open('tmp.dat', 'wb').write)
            version_file = open("tmp.dat")
            v_str = version_file.read()
            version_file.close()
            os.remove("tmp.dat")
        except:
            v_str = "0.0"
        return v_str    
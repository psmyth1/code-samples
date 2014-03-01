from libs.utils.AutoUpdater import AutoUpdater
from libs.utils.ProgBar import ProgBar
import Tkinter as tk
from subprocess import call
import os
import shutil
from sys import argv
import cPickle

class AutoRun:
    def __init__(self):
        os.chdir("./main")
        self.updater = AutoUpdater()        
        
        if os.access("current_version.dat",os.F_OK):
            v_file = open("current_version.dat")
            self.version = v_file.read()
            v_file.close()
        else:
            v_file = open("current_version.dat","w")
            v_file.write("1.00")
            self.version = "1.00"
            v_file.close()
        
        self.latest_version = self.updater.getCurrentVersion()
        
        if self.latest_version != self.version:
            self.updateWin()
            
        retcode = call(["main.exe", ""])
   
    def updateWin(self):
        root = tk.Tk()
        self.root = root
        root.title("MCP Software Updater")
        self.resizeWindow(200, 95, self.root)
        
        tk.Label(self.root,text="There is an update available.").pack(side=tk.TOP,fill=tk.X)
        tk.Label(self.root,text="Install it now?").pack(side=tk.TOP,fill=tk.X)
        tmp_frame = tk.Frame(self.root)
        tk.Button(tmp_frame,text="Yes",command=self.update,padx=10,pady=3).pack(side=tk.LEFT,padx = 20,pady = 10)
        tk.Button(tmp_frame,text="No",command=self.no_update,padx=10,pady=3).pack(side=tk.RIGHT,padx = 20,pady = 10)
        tmp_frame.pack(side=tk.BOTTOM,fill=tk.X)
        
        root.mainloop()
    
    def update(self):
        self.pg = ProgBar("Updating...",False,"libs/images/",True)
        self.pg.addMessage("updating from " + self.version + " to " + self.latest_version)
        cd = os.curdir
        f_names = os.listdir(cd)
        
        self.pg.startSubProcess(5.0,2)
        if os.access("ref_list.dat", os.F_OK):
            os.remove("ref_list.dat")
        self.pg.incSub("Retrieving ref_list.dat..")
        self.updater.getRefreshList(self.latest_version)
        self.pg.incSub("ref_list.dat finished..")
        list_file = open("ref_list.dat")
        refresh_list = cPickle.load(list_file)
        list_file.close()
        
        self.pg.startSubProcess(10.0,len(refresh_list))       
        for f in f_names:
            if f in refresh_list:
                self.pg.incSub("Deleted " + f)
                if os.path.isdir(cd+"/"+f):
                    shutil.rmtree(cd+"/"+f)
                else:
                    os.remove(cd+"/"+f)
            elif os.path.isdir(cd+"/"+f):
                f_names2 = os.listdir(cd+"/"+f)
                for f2 in f_names2:
                    tmp = f + "/" + f2
                    if tmp in refresh_list:
                        self.pg.incSub("Deleted " + f+"/"+f2)
                        if os.path.isdir(cd+"/"+f+"/"+f2):
                            shutil.rmtree(cd+"/"+f+"/"+f2)
                        else:
                            os.remove(cd+"/"+f+"/"+f2)
        self.pg.startSubProcess(80.0,100)
        self.pg.addMessage("Downloading package.zip...")
        self.updater.getPackage(self.latest_version,self.pg)
        self.pg.addMessage("package.zip finished...")
        self.pg.startSubProcess(5.0,2)
        self.pg.incSub("Extracting package.zip..")
        self.updater.extract()
        self.pg.incSub("package.zip extracted...")
        self.pg.addMessage("done...")
        
        self.pg.exit()
        self.root.destroy()
    
    def no_update(self):
        self.root.destroy()
        pass
    
    def resizeWindow(self,x,y,win):
        self.win_w = x
        self.win_h = y
        
        screen_w = (win.winfo_screenwidth()-self.win_w) / 2
        screen_h = (win.winfo_screenheight()-self.win_h) / 2
        
        win.geometry(str(self.win_w)+'x'+str(self.win_h)+'+'+str(screen_w)+'+'+str(screen_h))

AutoRun()
        
        
        
        

        
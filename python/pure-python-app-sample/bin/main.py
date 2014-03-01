import cPickle, calendar, os, subprocess
from datetime import datetime, date
from Tkinter import *
from tkFileDialog import askdirectory
from libs.gui.elements.Splash import Splash
from libs.gui.StatsModule import StatsModule
from libs.gui.MISModule import MISModule
from libs.gui.HoldingSummaryModule import HoldingSummaryModule
from libs.modules.stats.StatsReportGenerator import StatsReportGenerator
from libs.utils.PropsUtility import PropsUtility


class MCPReportManager:
    def __init__(self):
        root = Tk()
        self.root = root
        self.props = PropsUtility()
        
        self.final_funds_specified = False
        
        self.init = True
        with Splash(root,os.path.join(self.props.data['CONF_DIR'],'data/images/splash_screen.jpg'),.05):
            self.buildWindow(root)
            
        self.init = False
                
        root.mainloop()

    
    def displayTutorial(self):
        subprocess.Popen('"%s"'%(os.path.join(self.props.data['CONF_DIR'],'docs','MCP Report Manager Tutorial.doc')), shell=True)
    
    def displayPyDoc(self):
        subprocess.Popen('"%s"'%(os.path.join(self.props.data['CONF_DIR'],'docs\epydoc\index.html')), shell=True)
    
    def displayPreferences(self):
        self.pref_win = Toplevel()
        self.pref_win.title("Preferences")
        self.pref_win.focus_set()
        
        self.resizeWindow(550,120,self.pref_win)
        
        self.network_cache_var = StringVar()
        tmp_frame = Frame(self.pref_win)
        Label(tmp_frame,text="Network Cache Path: ").pack(side=LEFT,padx=5)
        self.network_path_entry = Entry(tmp_frame, textvariable=self.network_cache_var)
        self.network_path_entry.insert(0, self.props.data['OUTPUT_PATH'])
        self.network_path_entry.pack(side=LEFT,padx=5,fill=X,expand=1)
        Button(tmp_frame, text="Browse...", command=self.setNetworkCacheDir).pack(side=LEFT,padx=5)
        tmp_frame.pack(fill=X)
        
        self.local_cache_var = StringVar()
        tmp_frame = Frame(self.pref_win)
        Label(tmp_frame,text="Local Cache Path:      ").pack(side=LEFT,padx=5)
        self.local_path_entry = Entry(tmp_frame, textvariable=self.local_cache_var)
        self.local_path_entry.insert(0, self.props.data['OUTPUT_PATH'])
        self.local_path_entry.pack(side=LEFT,padx=5,fill=X,expand=1)
        Button(tmp_frame, text="Browse...", command=self.setLocalCacheDir).pack(side=LEFT,padx=5)
        tmp_frame.pack(fill=X)
        
        self.output_path_var = StringVar()
        tmp_frame = Frame(self.pref_win)
        Label(tmp_frame,text="Default Output Path:  ").pack(side=LEFT,padx=5)
        self.output_path_entry = Entry(tmp_frame, textvariable=self.output_path_var)
        self.output_path_entry.insert(0, self.props.data['OUTPUT_PATH'])
        self.output_path_entry.pack(side=LEFT,padx=5,fill=X,expand=1)
        Button(tmp_frame, text="Browse...", command=self.setOutputPathDir).pack(side=LEFT,padx=5)
        tmp_frame.pack(fill=X)
        
        self.local_cache_var.set(self.props.data['CACHE_PATH'])
        self.network_cache_var.set(self.props.data['NET_CACHE_PATH'])
        self.output_path_var.set(self.props.data['OUTPUT_PATH'])
        
        Button(self.pref_win,text="Save",command=self.savePrefs).pack(side=TOP,pady=10)
            
    def setNetworkCacheDir(self):
        tmp_dir = askdirectory(parent=self.root,initialdir=self.props.data['NET_CACHE_PATH'],title='Please select a directory')
        self.network_path_entry.delete(0,END)
        self.network_path_entry.insert(0,tmp_dir)
        self.pref_win.focus_set()
    
    def setLocalCacheDir(self):
        tmp_dir = askdirectory(parent=self.root,initialdir=self.props.data['CACHE_PATH'],title='Please select a directory')
        self.local_path_entry.delete(0,END)
        self.local_path_entry.insert(0,tmp_dir)
        self.pref_win.focus_set()
    
    def setOutputPathDir(self):
        tmp_dir = askdirectory(parent=self.root,initialdir=self.props.data['OUTPUT_PATH'],title='Please select a directory')
        self.output_path_entry.delete(0,END)
        self.output_path_entry.insert(0,tmp_dir)
        self.pref_win.focus_set()
    
    def savePrefs(self):
        self.props.data['CACHE_PATH'] = os.path.normpath(self.local_cache_var.get())
        self.props.data['NET_CACHE_PATH'] = os.path.normpath(self.network_cache_var.get())
        self.props.data['OUTPUT_PATH'] = os.path.normpath(self.output_path_var.get())
    
        conf_file = open("mcp_report_manager.conf",'w')
        conf_file.write("DEF_NETWORK_CACHE_PATH="+self.props.data['NET_CACHE_PATH']+"\n")
        conf_file.write("DEF_LOCAL_CACHE_PATH="+self.props.data['CACHE_PATH']+"\n")
        conf_file.write("DEF_OUTPUT_PATH="+self.props.data['OUTPUT_PATH']+"\n")
        conf_file.close()
        
        self.props.data['MIS_DATES'] = self.getMISArchiveDates()
        self.props.data['STATS_DATES'] = self.getStatsArchiveDates()
        
        if self.report_choice.get() == 1:
            self.runMIS()
        elif self.report_choice.get() == 2:
            self.runStat()
        elif self.report_choice.get() == 3:
            self.runHoldingSummary()
                        
        self.pref_win.destroy()
        
    def displayAbout(self):
        about_win = Toplevel()
        about_win.title("About")
        about_win.focus_set()
        
        self.resizeWindow(250,100,about_win)
        
        tmp_frame = Frame(about_win)
        Label(tmp_frame,text="MCP Report Manager " + str(self.props.data['VERSION_NUM']),font=('times',14)).pack(side=TOP)      
        tmp_frame.pack(side=TOP,pady=10)
        
        tmp_frame = Frame(about_win)
        Label(tmp_frame,text="Developed by: Patrick Smyth").pack(side=TOP)
        Label(tmp_frame,text="Copyright 2010, All Rights Reserved").pack(side=TOP)
        tmp_frame.pack(side=TOP)
        
    def buildWindow(self,root):
        self.resizeWindow(580, 670, self.root)
         
        root.iconbitmap(default=os.path.join(self.props.data['CONF_DIR'],'data/images/icon.ico'))
        root.title("Meridian Report Manager")
        
        self.buildTopMenu(root)
        self.buildMainWindow(root)
        
    def buildMainWindow(self,root):
        self.select_frame = Frame(root,bd=1,relief=GROOVE,padx=10,pady=10)
        
        self.report_choice = IntVar()
        tmp_frame = Frame(self.select_frame)
        Radiobutton(tmp_frame,text="MIS Report",variable=self.report_choice,value=1,command=self.loadWizard).pack(side=LEFT)
        tmp_frame.pack(fill=X)
        tmp_frame = Frame(self.select_frame)
        Radiobutton(tmp_frame,text="Statistics Report",variable=self.report_choice,value=2,command=self.loadWizard).pack(side=LEFT)
        tmp_frame.pack(fill=X)
        tmp_frame = Frame(self.select_frame)
        Radiobutton(tmp_frame,text="Holdings Summary Report",variable=self.report_choice,value=3,command=self.loadWizard).pack(side=LEFT)
        tmp_frame.pack(fill=X)
        
        self.select_frame.pack(side=LEFT,fill=BOTH)
        self.option_frame = Frame(root)
        self.option_frame.pack(fill=BOTH,expand=1)       
        
    def buildTopMenu(self,root):
        menu = Menu(root)
        root.config(menu=menu)
        
        optionsmenu = Menu(menu,tearoff=0)
        menu.add_cascade(label="Options", menu=optionsmenu)
        optionsmenu.add_command(label="Preferences", command=self.displayPreferences)
        
        toolmenu = Menu(menu,tearoff=0)
        menu.add_cascade(label="Tools", menu=toolmenu)
        toolmenu.add_command(label="MIS Report", command=self.runMIS)
        toolmenu.add_command(label="Stats Report", command=self.runStat)
        toolmenu.add_command(label="Holdings Summary Report", command=self.runHoldingSummary)
        
        helpmenu = Menu(menu,tearoff=0)
        menu.add_cascade(label="Help", menu=helpmenu)
        helpmenu.add_command(label="Tutorial", command=self.displayTutorial)
        helpmenu.add_command(label="PyDoc", command=self.displayPyDoc)
        helpmenu.add_command(label="About", command=self.displayAbout)
    
    def loadWizard(self):
        r = self.report_choice.get()
        if r == 1:
            self.runMIS()
        elif r == 2:
            self.runStat()
        elif r == 3:
            self.runHoldingSummary()
    
    def runMIS(self):
        self.report_choice.set(1)
        self.option_frame.destroy()
        self.option_frame = Frame(self.root)
        self.option_frame.pack(fill=BOTH,expand=1)
        
        m = MISModule(self.root,self.props,self.props.data['MIS_DATES'])
        m.runMIS(self.option_frame)
    
   
        
    def runStat(self):
        self.report_choice.set(2)
        self.option_frame.destroy()
        self.option_frame = Frame(self.root)
        self.option_frame.pack(fill=BOTH,expand=1)
        
        s = StatsModule(self.root,self.props.data['NET_CACHE_PATH'],self.props.data['CACHE_PATH'],self.props.data['OUTPUT_PATH'],self.props.data['STATS_DATES'],self.stats_gen)
        s.runStat(self.option_frame)

    def runHoldingSummary(self):
        self.report_choice.set(3)
        self.option_frame.destroy()
        self.option_frame = Frame(self.root)
        self.option_frame.pack(fill=BOTH,expand=1)
        
        h = HoldingSummaryModule(self.root,self.props)     
        h.runHoldingSummary(self.option_frame)
    
    def resizeWindow(self,x,y,win):
        self.win_w = x
        self.win_h = y
        
        screen_w = (win.winfo_screenwidth()-self.win_w) / 2
        screen_h = (win.winfo_screenheight()-self.win_h) / 2
        
        win.geometry(str(self.win_w)+'x'+str(self.win_h)+'+'+str(screen_w)+'+'+str(screen_h))
    
    def moveWindow(self,x,y,win):
        dx = x
        dy = y
        
        screen_w = (win.winfo_screenwidth()-self.win_w) / 2
        screen_h = (win.winfo_screenheight()-self.win_h) / 2
        
        win.geometry(str(self.win_w)+'x'+str(self.win_h)+'+'+str(screen_w + dx)+'+'+str(screen_h + dy))
    
    def getEndOfMonth(self,month,year):
        num_days = 0
        if month == 4 or month == 6 or month == 9 or month == 11:
            num_days = 30
        elif month == 2:
            if calendar.isleap(year):
                num_days = 29
            else:
                num_days = 28
        else:
            num_days = 31
        return num_days
    
mdat = MCPReportManager()



import os,calendar,time,cPickle
from datetime import date,datetime
from operator import itemgetter

from Tkinter import *
from tkFileDialog import askdirectory

from libs.modules.stats.ManagerListThread import ManagerListThread
from libs.modules.stats.StatsManagerThread import StatsManagerThread
from libs.modules.stats.StatsReportGenerator import StatsReportGenerator
from libs.gui.elements.ProgBar import ProgBar
from libs.gui.elements.ToolTip import ToolTip


class StatsModule:
    def __init__(self,root,props,stats_gen):
        
        self.def_network_cache_path = props.data['NET_CACHE_PATH']
        self.def_local_cache_path = props.data['CACHE_PATH']
        self.def_output_path = props.data['OUTPUT_PATH']
        self.use_local = [False,False]
        self.root = root
        
        self.early_terminate = False
        
        self.additional_managers = {}
        self.custom_pg_list = {}
        self.pg_list = {}
        self.pg_is_custom = False
        self.custom_pg_name = ""
        self.pg_name = ""
        self.pg_id = 0
        
        self.cache_dates = props.data['STATS_DATES']
        if len(self.cache_dates) > 0:
            self.cache_most_recent_date = self.cache_dates[0]
        else:
            self.cache_most_recent_date = "N/A"
            
        self.months = ("Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec")
        self.months_rev = []
        for var in range(len(self.months)-1,-1,-1):
            self.months_rev.append(self.months[var])
        self.years = []
        for i in range(1995,datetime.now().year+1):
            self.years.append(i)
        self.years = tuple(self.years)
        self.stats_gen = StatsReportGenerator(self.props.data['STATS_CACHE_PATH'])

    def runStat(self,option_frame):
        self.option_frame = option_frame
        self.buildDataOptions()
        
        label_frame = LabelFrame(self.option_frame,text="Report Options",padx=5,pady=5)
        label_frame.pack(fill=BOTH,padx=5,pady=5,expand=1)
        
        #-----------------------FUND SET-----------------------------------
        tmp_frame = Frame(label_frame)
        Label(tmp_frame, text="Fund Universe:").pack(side=LEFT)
        tmp_frame.pack(fill=X)
        
        self.stat_fund_set = IntVar()
        tmp_frame = Frame(label_frame)
        self.fund_set_butt1 = Radiobutton(tmp_frame, text="Invested",variable=self.stat_fund_set,value=1)
        self.fund_set_butt1.select()
        self.fund_set_butt1.pack(side=LEFT,padx=10)
#        tmp_frame.pack(fill=X)
#        tmp_frame = Frame(label_frame)
        self.fund_set_butt2 = Radiobutton(tmp_frame, text="Focus List",variable=self.stat_fund_set,value=2)
        self.fund_set_butt2.pack(side=LEFT,padx=10)
#        tmp_frame.pack(fill=X)
#        tmp_frame = Frame(label_frame)
        self.fund_set_butt3 = Radiobutton(tmp_frame, text="Invested and Focus List",variable=self.stat_fund_set,value=3)
        self.fund_set_butt3.pack(side=LEFT,padx=10)
        tmp_frame.pack(fill=X)
        #-----------------------FUND SUBSET-----------------------------------
        tmp_frame = Frame(label_frame)
        Label(tmp_frame, text="Allowed Completeness of Returns:").pack(side=LEFT)
        tmp_frame.pack(fill=X)
        
        self.stat_fund_subset = IntVar()
        tmp_frame = Frame(label_frame)
        tmp_r = Radiobutton(tmp_frame, text="Complete",variable=self.stat_fund_subset,value=1)
        ToolTip(tmp_r,"returns data must span entire period",None,.5)
        tmp_r.select()
        tmp_r.pack(side=LEFT)
        tmp_r = Radiobutton(tmp_frame, text="Incomplete",variable=self.stat_fund_subset,value=2)
        tmp_r.pack(padx=13, side=LEFT)
        ToolTip(tmp_r,"returns data might not span entire period",None,.5)
        tmp_frame.pack(fill=X, padx = 10)
        #-----------------------REPORT PERIOD-----------------------------------
        
        self.stat_add_set = IntVar()
       
        tmp_frame = Frame(label_frame)
        Label(tmp_frame,text="Customize Fund Set:").pack(side=LEFT,fill=X)
        tmp_frame.pack(fill=X)
        
        tmp_frame = Frame(label_frame)
        Radiobutton(tmp_frame, text="Add Additional Managers",variable=self.stat_add_set,value=1,command=self.setAddManagersActive).pack(side=LEFT,padx=10)
        self.stat_add_button1 = Button(tmp_frame, text=".....",command=self.selectAddManagers,state=DISABLED)
        self.stat_add_button1.pack(side=LEFT,padx=23)
        tmp_frame.pack(fill=X)
        
        tmp_frame = Frame(label_frame)
        Radiobutton(tmp_frame, text="Select or Define a Peer Group",variable=self.stat_add_set,value=2,command=self.setAddManagersActive).pack(side=LEFT,padx=10)
        self.stat_add_button2 = Button(tmp_frame, text=".....",command=self.selectPeerGroup,state=DISABLED)
        self.stat_add_button2.pack(side=LEFT)
        self.pg_label_var = StringVar()
        tmp_frame2 = LabelFrame(tmp_frame,bd=1)
        Label(tmp_frame2,text="Selected:").pack(side=LEFT,padx=2)
        self.pg_label = Label(tmp_frame2, textvariable=self.pg_label_var,font=('times',10,'bold'))
        self.pg_label.pack(side=LEFT,padx = 2)
        tmp_frame2.pack(side=LEFT,fill=X,padx=10,expand=1)
        tmp_frame.pack(fill=X)
                
        tmp_frame = Frame(label_frame)
        Label(tmp_frame, text="Time Periods for Report:").pack(side=LEFT)
        tmp_frame.pack(fill=X)
        
        self.date_input_type = IntVar()
        tmp_frame = Frame(label_frame)
        tmp_r = Radiobutton(tmp_frame, text="Standard 1, 3, 5 Year Trailing",variable=self.date_input_type,command=self.setCustomDatesActive,value=1)
        tmp_r.select()
        tmp_r.pack(side=LEFT,padx=10)
        tmp_frame.pack(fill=X)
        tmp_frame = Frame(label_frame)
        Radiobutton(tmp_frame, text="Custom Date Ranges",variable=self.date_input_type,command=self.setCustomDatesActive,value=2).pack(side=LEFT,padx=10)
        tmp_frame.pack(fill=X)
        
        self.period1_start = StringVar()
        self.period1_end = StringVar()
        self.period2_start = StringVar()
        self.period2_end = StringVar()
        self.period3_start = StringVar()
        self.period3_end = StringVar()
        
        self.custom_date_section = []
        
        t = datetime.now()
        values = [[self.months[t.month-1],self.prevMonthYear(1),self.months[self.prevMonth()],self.prevMonthYear(0)],
                  [self.months[t.month-1],self.prevMonthYear(3),self.months[self.prevMonth()],self.prevMonthYear(0)],
                  [self.months[t.month-1],self.prevMonthYear(5),self.months[self.prevMonth()],self.prevMonthYear(0)]]
        self.spin_var = []
 
        for row in range(0,len(values)):
            self.spin_var.append([])
            for v in values[row]:
                self.spin_var[row].append(StringVar())
            
        for var in range(0,3):
            self.custom_date_section.append([])
            tmp_frame = Frame(label_frame)
            tmp = Label(tmp_frame, text="Period " + str(var+1) + ":",state=DISABLED)
            tmp.pack(side=LEFT,padx=5)
            self.custom_date_section[var].append(tmp)
            tmp = Spinbox(tmp_frame, state=DISABLED, values=self.months_rev,textvariable=self.spin_var[var][0], width=5)
            tmp.pack(side=LEFT, padx=2)
            self.custom_date_section[var].append(tmp)
            tmp = Spinbox(tmp_frame, state=DISABLED, values=self.years,command=self.updateDateRanges,textvariable=self.spin_var[var][1],width=5)
            tmp.pack(side=LEFT, padx=2)
            self.custom_date_section[var].append(tmp)
            tmp = Label(tmp_frame)
            tmp.pack(side=LEFT, padx=2)
            tmp = Spinbox(tmp_frame, state=DISABLED, values=self.months_rev[(11-self.prevMonth()):len(self.months_rev)],textvariable=self.spin_var[var][2], width=5)
            tmp.pack(side=LEFT, padx=2)
            self.custom_date_section[var].append(tmp)
            tmp = Spinbox(tmp_frame, state=DISABLED, values=self.years,command=self.updateDateRanges,textvariable=self.spin_var[var][3], width=5)
            tmp.pack(side=LEFT, padx=2)
            self.custom_date_section[var].append(tmp)
            tmp_frame.pack(fill=X, padx=20)
        
        for row in range(0,len(values)):
            for col in range(0,len(values[row])):
                self.spin_var[row][col].set(values[row][col])
       
        #-----------------------INCLUDE MCP INDICES-----------------------
        self.include_mcp_indices = IntVar()

        tmp_frame = Frame(label_frame)
        MCPFAI = Checkbutton(tmp_frame,text = "Include MCP Funds and Benchmarks",variable=self.include_mcp_indices)
        MCPFAI.pack(side=LEFT,padx=5)
        MCPFAI.select()
        tmp_frame.pack(fill=X)
        
        self.calculate_rankings = IntVar()

        tmp_frame = Frame(label_frame)
        calc_rank = Checkbutton(tmp_frame,text = "Calculate Statistic Rankings",variable=self.calculate_rankings)
        calc_rank.pack(side=LEFT,padx=5)
        tmp_frame.pack(fill=X)
        
        #-----------------------SET DESTINATION FOLDER--------------------
        self.report_out_dir = StringVar()
        tmp_frame = Frame(label_frame)
        Label(tmp_frame,text="Export to: ").pack(side=LEFT,padx=5)
        self.path_entry = Entry(tmp_frame, textvariable=self.report_out_dir)
        self.path_entry.insert(0, self.def_output_path)
        self.path_entry.pack(side=LEFT,padx=5,fill=X,expand=1)
        Button(tmp_frame, text="Browse...", command=self.setOutputDir).pack(side=LEFT,padx=5)
        tmp_frame.pack(fill=X,pady=3)
               
        Button(self.option_frame,text="Generate Report",command=self.generateStats).pack(side=BOTTOM,pady=9)
    
    def buildDataOptions(self):
        data_frame = LabelFrame(self.option_frame,text="Data Source Options",padx=5,pady=5)
        data_frame.pack(fill=X,padx=5)
        
        tmp_frame = Frame(data_frame)
        Label(tmp_frame, text="Select Data Source:").pack(side=LEFT,padx=5)
        tmp_frame.pack(fill=X)
        
        self.data_input_type = IntVar()
        tmp_frame = Frame(data_frame)
        if self.cache_most_recent_date != "N/A":
            self.data_input_button1 = Radiobutton(tmp_frame,text="Most Recent Cached Data     (" + self.cache_most_recent_date.strftime("%m/%d/%Y") + ")",command=self.activateCacheButton,variable=self.data_input_type,value=1)
        else:
            self.data_input_button1 = Radiobutton(tmp_frame,text="Most Recent Cached Data     (N/A)",command=self.activateCacheButton,variable=self.data_input_type,value=1)
        self.data_input_button1.select()
        self.stats_cache_path = self.def_network_cache_path + "StatsNew/"
        self.data_input_button1.pack(side=LEFT,padx=10)
        tmp_frame.pack(fill=X)
        
        tmp_frame = Frame(data_frame)
        self.data_input_button3 = Radiobutton(tmp_frame, text="Historically Cached Data",command=self.activateCacheButton,variable=self.data_input_type,value=3)
        self.data_input_button3.pack(side=LEFT,padx=10)
    
        self.cache_month_var = StringVar()
        self.cache_month_box = Spinbox(tmp_frame,state=DISABLED,command=self.updateCacheDates,textvariable=self.cache_month_var,width=5)
        self.cache_year_var = StringVar()
        self.cache_year_box = Spinbox(tmp_frame,state=DISABLED,command=self.updateCacheDates,textvariable=self.cache_year_var,width=5)
        self.cache_month_box.pack(side=LEFT)
        self.cache_year_box.pack(side=LEFT,padx=10)
        tmp_frame.pack(fill=X)
        
        self.updateCacheDates(True)
        
        tmp_frame = Frame(data_frame)
        Label(tmp_frame,text = "------ OR ------").pack(side=LEFT,padx=50,pady=5)
        tmp_frame.pack(fill=X)
        
        tmp_frame = Frame(data_frame)
        self.data_input_button2 = Radiobutton(tmp_frame, text="Backstop Server (may take a while)",command=self.activateCacheButton,variable=self.data_input_type,value=2)
        self.data_input_button2.pack(side=LEFT,padx=10)
        tmp_frame.pack(fill=X)
        
        self.as_of_date = StringVar()
        tmp_frame = Frame(data_frame)
        self.as_of_label = Label(tmp_frame, text="As Of Date:", state=DISABLED)
        self.as_of_label.pack(side=LEFT,padx=5)
        
        self.cur_month = StringVar()
        self.cur_year = StringVar()
        
        self.as_of_date_month = Spinbox(tmp_frame, state=DISABLED, values=self.months_rev[(11-self.curMonth()):len(self.months_rev)], textvariable=self.cur_month,command=self.updateAsOfDate,width=5)
        self.as_of_date_year = Spinbox(tmp_frame, state=DISABLED, values=self.years, textvariable=self.cur_year,command=self.updateAsOfDate, width=5)
        self.as_of_date_month.pack(side=LEFT)
        self.as_of_date_year.pack(side=LEFT)
        
        self.cur_month.set(self.months[self.curMonth()])
        self.cur_year.set(self.prevMonthYear(0))
        
        self.as_of_date = self.getEndOfMonth(self.curMonth(), self.prevMonthYear(0))
                                            
        tmp_frame.pack(fill=X,pady=3, padx=20)
    
    def updateCacheDates(self,init=False):
        if init:
            cur_m = self.months[self.cache_most_recent_date.month-1]
            cur_y = str(self.cache_most_recent_date.year)
        else:
            cur_m = self.cache_month_var.get()
            cur_y = self.cache_year_var.get()
        cache_years = []
        cache_months = []
        cache_month_index = []
        for d in self.cache_dates:
            if self.months[d.month-1] == cur_m:
                if d.year not in cache_years:
                    cache_years.append(d.year)
            if int(d.year) == int(cur_y):                
                if (d.month-1) not in cache_month_index:
                    cache_month_index.append((d.month-1))
        cache_years = sorted(cache_years)
        cache_month_index = sorted(cache_month_index)
        
        for m in cache_month_index:
            cache_months.append(self.months[m])
        
        tmp = cache_months
        cache_months = []
        for var in range(len(tmp)-1,-1,-1):
            cache_months.append(tmp[var])
        
        self.cache_month_box.config(values=tuple(cache_months))
        self.cache_year_box.config(values=tuple(cache_years))
        
        self.cache_month_var.set(cur_m)
        self.cache_year_var.set(cur_y)

    def updateDate(self, cur_month, cur_year, tmp_month_box):
        cur_month_lit = cur_month.get()
        cur_year_lit = cur_year.get()
        if int(cur_year_lit) == datetime.now().year and int(cur_year_lit) in self.years:
            tmp_month_box.delete(0,END)
            prev_month_rev = 11 - self.curMonth()
            tmp_month_box.config(values=self.months_rev[prev_month_rev:len(self.months_rev)],textvariable=cur_month)
            if cur_month_lit in self.months_rev[0:prev_month_rev]:
                cur_month.set(self.months_rev[prev_month_rev])
            else:
                cur_month.set(cur_month_lit)
        else:
            tmp_month_box.delete(0,END)
            tmp_month_box.config(values=self.months_rev,textvariable=cur_month)
            cur_month.set(cur_month_lit)
    
    def updateAsOfDate(self):
        self.updateDate(self.cur_month, self.cur_year, self.as_of_date_month)
        tmp_m = 0
        for var in range(0,len(self.months)):
            if self.cur_month.get() == self.months[var]:
                tmp_m = var+1
        try:
            self.updateDefDateRanges(date(int(self.cur_year.get()),tmp_m,1))
        except:
            pass 
    
    def updateDefDateRanges(self,end_date):
        t = end_date 
        values = [[self.months[self.nextMonth(t)],self.prevMonthYear(1,t),self.months[t.month-1],t.year],
                  [self.months[self.nextMonth(t)],self.prevMonthYear(3,t),self.months[t.month-1],t.year],
                  [self.months[self.nextMonth(t)],self.prevMonthYear(5,t),self.months[t.month-1],t.year]]
        for row in range(0,len(values)):
            for col in range(0,len(values[row])):
                self.spin_var[row][col].set(values[row][col])
    
    def updateDateRanges(self):
        for row in range(0,len(self.custom_date_section)):
            for col in range(0,len(self.custom_date_section[row])):
                if col == 1 or col == 3:
                    self.updateDate(self.spin_var[row][col-1], self.spin_var[row][col], self.custom_date_section[row][col])

    def setCustomDatesActive(self):
        if self.date_input_type.get() == 2:
            self.as_of_label.config(state=NORMAL)
            self.as_of_date_month.config(state=NORMAL)
            self.as_of_date_year.config(state=NORMAL)
            for row in self.custom_date_section:
                for e in row:
                    e.config(state=NORMAL)
        elif self.date_input_type.get() == 1:
            for row in self.custom_date_section:
                for e in row:
                    e.config(state=DISABLED)
        self.option_frame.update()
    
    def setAddManagersActive(self):
        if self.stat_add_set.get() == 1:
            self.stat_add_button1.config(state=NORMAL)
            self.stat_add_button2.config(state=DISABLED)
            self.fund_set_butt1.config(state=NORMAL)
            self.fund_set_butt2.config(state=NORMAL)
            self.fund_set_butt3.config(state=NORMAL)
        elif self.stat_add_set.get() == 2:
            self.stat_add_button2.config(state=NORMAL)
            self.stat_add_button1.config(state=DISABLED)
            self.fund_set_butt1.config(state=DISABLED)
            self.fund_set_butt2.config(state=DISABLED)
            self.fund_set_butt3.config(state=DISABLED)
            
    def selectAddManagers(self):
        self.fund_win = Toplevel()
        self.fund_win.title("Additional Managers")
        
        self.fund_win_frame = Frame(self.fund_win,bd=1,relief=RAISED)
        
        tmp_frame = Frame(self.fund_win_frame)
        sb = Scrollbar(tmp_frame)
        sb.pack(side=RIGHT,fill=Y)
        self.text_box1 = Listbox(tmp_frame,height=30,selectmode=EXTENDED,yscrollcommand=sb.set)
        self.text_box1.pack(side=LEFT,fill=X,expand=1)
        sb.config(command=self.text_box1.yview)
        tmp_frame.pack(side=LEFT,fill=X,expand=1)
        
        tmp_frame = Frame(self.fund_win_frame)
        Button(tmp_frame,text="Refresh\nLists",command=self.refreshManagerList).pack(pady=30)
        Button(tmp_frame,text="Reset Filters",command=self.resetFilters).pack(pady=30)
        Button(tmp_frame,text=">>",command=self.selectManager).pack(pady=30)
        Button(tmp_frame,text="<<",command=self.deselectManager).pack(pady=30)
        tmp_frame.pack(side=LEFT)
        
        tmp_frame = Frame(self.fund_win_frame)
        sb = Scrollbar(tmp_frame)
        sb.pack(side=RIGHT,fill=Y)
        self.text_box2 = Listbox(tmp_frame,height=30,selectmode=EXTENDED,yscrollcommand=sb.set)
        self.text_box2.pack(side=LEFT,fill=X,expand=1)
        sb.config(command=self.text_box2.yview)
        tmp_frame.pack(side=LEFT,fill=X,expand=1)
        
        if not self.use_local[0]:
            path = self.def_network_cache_path + "StatsNew/lists/"
        else:
            path = self.def_local_cache_path + "StatsNew/lists/"
        
        if self.stat_fund_set.get() == 1:
            tmp_file = open(path + "ex-invested.cache")
            data = cPickle.load(tmp_file)
            self.manager_objs = data
            tmp_file.close()
        elif self.stat_fund_set.get() == 2:
            tmp_file = open(path + "ex-focus.cache")
            data = cPickle.load(tmp_file)
            self.manager_objs = data
            tmp_file.close()
        elif self.stat_fund_set.get() == 3:    
            tmp_file = open(path + "ex-invested_and_focus.cache")
            data = cPickle.load(tmp_file)
            self.manager_objs = data
            tmp_file.close()
        
        self.opts = {}
        self.state_zip_opts = {}
        self.zip_city_opts = {}
        self.state_city_opts = {}
        self.opts["Class"] = [" "]
        self.opts["State"] = [" "]
        self.opts["City"] = [" "]
        self.opts["PostalCode"] = [" "]
        self.opts["Primary Strategy"] = [" "]
        self.opts["Sub Strategy 1"] = [" "]
        self.opts["Sub Strategy 2"] = [" "]
        self.opts["Interest Level"] = [" "]
        self.opts["Strength"] = [" "]
        self.opts["MRR"] = [" "]
        
        for fund in sorted(self.manager_objs,key=lambda fund:fund.Name):
            if fund.ID not in self.additional_managers.keys():
                if fund.Class not in self.opts["Class"]:
                    self.opts["Class"].append(fund.Class)
                if fund.state not in self.opts["State"]:
                    self.opts["State"].append(fund.state)
                if fund.postal_code not in self.opts["PostalCode"]:
                    self.opts["PostalCode"].append(fund.postal_code)
                if fund.city not in self.opts["City"]:
                    self.opts["City"].append(fund.city)                    
                if fund.state not in self.state_zip_opts.keys():
                    self.state_zip_opts[fund.state] = []
                if fund.postal_code not in self.state_zip_opts[fund.state]:
                    self.state_zip_opts[fund.state].append(fund.postal_code)
                if fund.postal_code.strip() == "None":
                    if fund.state not in self.state_city_opts.keys():
                        self.state_city_opts[fund.state] = []
                    if fund.city not in self.state_city_opts[fund.state]:
                        self.state_city_opts[fund.state].append(fund.city)                    
                if fund.postal_code not in self.zip_city_opts.keys():
                    self.zip_city_opts[fund.postal_code] = []
                if fund.city not in self.zip_city_opts[fund.postal_code]:
                    self.zip_city_opts[fund.postal_code].append(fund.city)
                if fund.prime_strat not in self.opts["Primary Strategy"]:
                    self.opts["Primary Strategy"].append(fund.prime_strat)
                if fund.sub_strat1 not in self.opts["Sub Strategy 1"]:
                    self.opts["Sub Strategy 1"].append(fund.sub_strat1)
                if fund.sub_strat2 not in self.opts["Sub Strategy 2"]:
                    self.opts["Sub Strategy 2"].append(fund.sub_strat2)
                if fund.IL not in self.opts["Interest Level"]:
                    self.opts["Interest Level"].append(fund.IL)
                if fund.StrengthRating not in self.opts["Strength"]:
                    self.opts["Strength"].append(fund.StrengthRating)
                if self.standardDateFormat(fund.DMRR) not in self.opts["MRR"]:
                    self.opts["MRR"].append(self.standardDateFormat(fund.DMRR))                  
                self.text_box1.insert(END,fund.ListName)
                
        self.opts["Class"] = sorted(self.opts["Class"])
        self.opts["City"] = sorted(self.opts["City"])
        self.opts["State"] = sorted(self.opts["State"])
        self.opts["PostalCode"] = sorted(self.opts["PostalCode"])
        self.opts["Primary Strategy"] = sorted(self.opts["Primary Strategy"])
        self.opts["Sub Strategy 1"] = sorted(self.opts["Sub Strategy 1"])
        self.opts["Sub Strategy 2"] = sorted(self.opts["Sub Strategy 2"])
        self.opts["Strength"] = sorted(self.opts["Strength"])
        self.opts["Interest Level"] = sorted(self.opts["Interest Level"])
        
        for f in sorted(self.additional_managers.items(),key=itemgetter(1)):
            for man in self.manager_objs:
                if man.ID == f[0]: 
                    self.text_box2.insert(END,f[1])
        
        self.fund_win_frame.pack(fill=BOTH,expand=1)
        
        self.filter_type_ref = [[["Name","",False],["State","State:",True],["PostalCode","Zip:",True],["City","City:",True],["Interest Level","Int:",True],["MRR","MRR:",True]],
                                [["Primary Strategy","Strat:",True],["Sub Strategy 1","Sub1:",True],["Sub Strategy 2","Sub2:",True],["Class","Cls:",True],["Strength","Str:",True]]]
        self.filter_str = {}
        self.filter_str["Name"] = StringVar()
        
        tmp_search_frame = LabelFrame(self.fund_win,bd=1)
        tmp_search_frame.pack(fill=X)
        for row in self.filter_type_ref:
            tmp_frame = Frame(tmp_search_frame)
            for type_dat in row:
                Label(tmp_frame,text=(type_dat[0] + ":")).pack(side=LEFT)
                if type_dat[2]:
                    self.filter_str[type_dat[0]] = Listbox(tmp_frame,height=4,width=10,exportselection=0,selectmode=EXTENDED)
                    if type_dat[0] == "State":
                        self.filter_str[type_dat[0]].bind("<Return>",self.filterStateZipLists)
                    elif type_dat[0] == "PostalCode":
                        self.filter_str[type_dat[0]].bind("<Return>",self.filterZipCityLists)
                    else:
                        self.filter_str[type_dat[0]].bind("<Return>",self.filterManagerList)
                    for opt in self.opts[type_dat[0]]:
                        self.filter_str[type_dat[0]].insert(END,opt)
                    self.filter_str[type_dat[0]].pack(side=LEFT,fill=X,expand=1)                    
                else:
                    tmp_entry = Entry(tmp_frame,textvariable=self.filter_str[type_dat[0]],width=5)
                    tmp_entry.bind("<Return>",self.filterManagerList)
                    tmp_entry.pack(side=LEFT,fill=X,expand=1)
            tmp_frame.pack(fill=X,expand=1)
               
        Button(self.fund_win,text="OK",command=self.addManagers, width=10).pack()
        
        self.resizeWindow(800, 570, self.fund_win)

    def resetFilters(self):
        for row in self.filter_type_ref:
            for type_dat in row:
                if type_dat[2]:
                    self.filter_str[type_dat[0]].selection_clear(0,END)
                else:
                    self.filter_str[type_dat[0]].set("")
        self.filterStateZipLists()
        self.filterZipCityLists()
        self.filterManagerList()
        
    def addManagers(self):
        self.fund_win.destroy()
        
    def filterStateZipLists(self,event=None):
        states = list(self.filter_str["State"].curselection())
        postal_codes = []
        cities = [" "]
        for var in range(len(states)):
            states[var] = self.filter_str["State"].get(int(states[var]))
        for state in states:
            if state == " ":
                for postal_code in self.opts["PostalCode"]:
                    if postal_code not in postal_codes:
                        postal_codes.append(postal_code)
            else:
                for postal_code in self.state_zip_opts[state]:
                    if postal_code not in postal_codes:
                        postal_codes.append(postal_code)
        if len(states) == 0:
            for postal_code in self.opts["PostalCode"]:
                if postal_code not in postal_codes:
                    postal_codes.append(postal_code)
        add_blank = True
        for postal_code in postal_codes:
            if postal_code == " ":
                add_blank = False
                for city in self.opts["City"]:
                    if city not in cities:
                        cities.append(city)
            elif postal_code.strip() == "None":
                for state in states:
                    if state in self.state_city_opts.keys():
                        for city in self.state_city_opts[state]:
                            if city not in cities:
                                cities.append(city)
            else:
                for city in self.zip_city_opts[postal_code]:
                    if city not in cities:
                        cities.append(city)
        if add_blank:
            postal_codes.append(" ")
        self.filter_str["PostalCode"].delete(0,END)
        for postal_code in sorted(postal_codes):
            self.filter_str["PostalCode"].insert(END,postal_code)
        self.filter_str["City"].delete(0,END)
        for city in sorted(cities):
            self.filter_str["City"].insert(END,city)
        self.filterManagerList()
    
    def filterZipCityLists(self,event=None):
        states = list(self.filter_str["State"].curselection())
        postal_codes = list(self.filter_str["PostalCode"].curselection())
        cities = [" "]
        for var in range(len(states)):
            states[var] = self.filter_str["State"].get(int(states[var]))
        for var in range(len(postal_codes)):
            postal_codes[var] = self.filter_str["PostalCode"].get(int(postal_codes[var]))
        for postal_code in postal_codes:
            if postal_code == " ":
                for city in self.opts["City"]:
                    if city not in cities:
                        cities.append(city)
            elif postal_code.strip() == "None":
                for state in states:
                    if state == " ":
                        for city in self.zip_city_opts[postal_code]:
                            if city not in cities:
                                cities.append(city)
                    else:
                        if state in self.state_city_opts.keys():
                            for city in self.state_city_opts[state]:
                                if city not in cities:
                                    cities.append(city)
            else:
                for city in self.zip_city_opts[postal_code]:
                    if city not in cities:
                        cities.append(city)
        if len(postal_codes) == 0:
            for city in self.opts["City"]:
                if city not in cities:
                    cities.append(city)
        self.filter_str["City"].delete(0,END)
        for city in sorted(cities):
            self.filter_str["City"].insert(END,city)
        self.filterManagerList()
        
    def filterManagerList(self,event=None):
        filtered_list = {}
        if self.stat_add_set.get() == 1:
            man_objs = self.manager_objs
            man_list = self.additional_managers
        else:
            man_objs = self.pg_manager_objs
            man_list = self.custom_pg_list
        f_str = {}
        for row in self.filter_type_ref:
            for type_dat in row:
                if type_dat[2]:
                    indices = self.filter_str[type_dat[0]].curselection()
                    selection = []
                    for index in indices:
                        selection.append(self.filter_str[type_dat[0]].get(int(index)))
                    f_str[type_dat[0]] = [type_dat[1],selection]
                else:
                    f_str[type_dat[0]] = [type_dat[1],[self.filter_str[type_dat[0]].get()]]
        for fund in man_objs:
            if fund.ID not in man_list.keys():
                passed = True
                for t in f_str.keys():
                    if len(f_str[t][1]) > 0:
                        passed_2 = False
                        for piece in f_str[t][1]:
                            f_str_piece = f_str[t][0] + piece
                            if piece != "" and piece != " ":
                                if f_str[t][0] == "":
                                    if str.lower(str(fund.ListName.split("(")[0])).find(str.lower(str(f_str_piece))) != -1:
                                        passed_2 = True
                                else:
                                    if str.lower(str(fund.ListName)).find(str.lower(str("("+f_str_piece+")"))) != -1:
                                        passed_2 = True
                            else:
                                passed_2 = True
                        if not passed_2:
                            passed = False
                if passed:
                    filtered_list[fund.ID] = fund.ListName
        self.text_box1.delete(0, END)
        for f in sorted(filtered_list.items(),key=itemgetter(1)):
            self.text_box1.insert(END,f[1])
 
    def filterPeerGroupList(self,event):
        filtered_list = {}
        if str.isalnum(event.char) or event.char=='\'' or event.char == '>' or event.char == '(' or event.char == ')' or event.char == '<':
            f_str = self.pg_filter_str.get() + event.char
        elif len(event.char) > 0:
            if ord(event.char) == 8:
                f_str = self.pg_filter_str.get()
                if len(f_str) > 0:
                    f_str = f_str[0:(len(f_str)-1)]
            else:
                f_str = self.pg_filter_str.get()
        else:
            f_str = self.pg_filter_str.get()
        f_str = f_str.split(',')
        for f in self.peer_group_list.items():
            passed = True
            try:
                for f_str_piece in f_str:
                    if f_str_piece != "":
                        if str.lower(str(f[1])).find(str.lower(str(f_str_piece))) == -1:
                            passed = False
            except:
                pass
            if passed:
                filtered_list[f[0]] = f[1]
        self.pg_box1.delete(0, END)
        for f in sorted(filtered_list.items(),key=itemgetter(1)):
            self.pg_box1.insert(END,f[1])                   
    
    def selectPeerGroup(self):
        self.fund_win = Toplevel()
        self.fund_win.title("Peer Groups")
        self.fund_win.focus_set()
        
        self.peer_group_type = IntVar()
        
        tmp_frame = LabelFrame(self.fund_win,bd=1)
        self.define_pg = Radiobutton(tmp_frame,value=1,variable=self.peer_group_type,command=self.setPGActive)
        self.define_pg.pack(side=LEFT)
        self.define_pg.deselect()
        self.cust_pg_button = Button(tmp_frame,text="Define a Custom Peer Group",command=self.createCustomPeerGroup, state=DISABLED)
        self.cust_pg_button.pack(side=LEFT,padx=20,pady=15)
        self.pg_label2_var = StringVar()
        tmp_frame2 = LabelFrame(tmp_frame,bd=1)
        Label(tmp_frame2,text="Peer Group Name:").pack(side=LEFT,padx=2)
        self.pg_label = Label(tmp_frame2, textvariable=self.pg_label2_var,font=('times',10,'bold'))
        self.pg_label.pack(side=LEFT,padx = 2)
        self.pg_label2_var.set(self.custom_pg_name)
        tmp_frame2.pack(side=LEFT,fill=X,padx=3,expand=1)
        tmp_frame.pack(fill=X)
        
        tmp_master = LabelFrame(self.fund_win,bd=1)
        
        self.refresh_pg_list_button = Button(tmp_master,text="Refresh Peer Group List",command=self.refreshManagerList,state=DISABLED)
        self.refresh_pg_list_button.pack(side=TOP,pady=5)
        
        tmp_frame = Frame(tmp_master)
        tmp_r = Radiobutton(tmp_frame,value=2,variable=self.peer_group_type,command=self.setPGActive)
        tmp_r.pack(side=LEFT)
        tmp_r.deselect()
        tmp_frame.pack(side=LEFT)
        
        self.fund_win_frame = Frame(tmp_master,bd=1,relief=RAISED)
        sb = Scrollbar(self.fund_win_frame)
        sb.pack(side=RIGHT, fill=Y)
        self.pg_box1 = Listbox(self.fund_win_frame,height=15,yscrollcommand=sb.set)
        self.pg_box1.pack(fill=X,expand=1)
        sb.config(command=self.pg_box1.yview)
        
        self.pg_filter_str = StringVar()
        tmp_frame = Frame(self.fund_win_frame)
        Label(tmp_frame,text="Search:").pack(side=LEFT,pady=5)
        self.filter_entry = Entry(tmp_frame,textvariable=self.pg_filter_str)
        self.filter_entry.bind("<Key>",self.filterPeerGroupList)
        self.filter_entry.pack(side=LEFT,fill=X,expand=1,pady=5)
        tmp_frame.pack(fill=X,expand=1)
        self.fund_win_frame.pack(side=LEFT,fill=BOTH,expand=1)
        tmp_master.pack(fill=X,expand=1)
        
        tmp_frame = Frame(self.fund_win)
        Button(tmp_frame,text="OK",command=self.addPeerGroup, width=10).pack()
        tmp_frame.pack(fill=X,expand=1)
        
        if not self.use_local[1]:
            path = self.def_network_cache_path + "StatsNew/pg_lists/"
        else:
            path = self.def_local_cache_path + "StatsNew/pg_lists/"

        if not os.access(path + "cache-peer_group_member_id.cache", os.F_OK) or not os.access(path + "cache-peer_group_member_id.cache", os.F_OK):            
            self.manageThread(2,True)

        tmp_file = open(path + "cache-peer_group_id_name_map.cache")
        tmp_list = cPickle.load(tmp_file)
        tmp_file.close()
        
        tmp_file = open(path + "cache-peer_group_member_id.cache")
        self.pg_member_id_list = cPickle.load(tmp_file)
        tmp_file.close()                    
        
        self.peer_group_list = {}
        for e in tmp_list.items():
            self.peer_group_list[e[0]] = e[1][7:]
               
        for f in sorted(self.peer_group_list.items(),key=itemgetter(1)):
            self.pg_box1.insert(END,f[1])
        
        self.pg_box1.config(state=DISABLED)
        self.filter_entry.config(state=DISABLED)
        
        self.resizeWindow(600, 380, self.fund_win)
    
    def createCustomPeerGroup(self):    
        self.fund_win2 = Toplevel()
        self.fund_win2.title("Peer Group Managers")
        
        self.define_pg.select()
        
        self.custom_pg_frame = LabelFrame(self.fund_win2,text="Define a Custom Peer Group:")
        self.custom_pg_frame.pack(fill=X)
        
        self.cust_pg_name = StringVar()
        tmp_frame = Frame(self.custom_pg_frame)
        Label(tmp_frame,text="Peer Group Name:").pack(side=LEFT)
        Entry(tmp_frame,textvariable=self.cust_pg_name).pack(side = LEFT)
        tmp_frame.pack(fill=X,expand=1,pady=6)
        
        self.fund_win_frame = Frame(self.custom_pg_frame,bd=1,relief=RAISED)
        
        tmp_frame = Frame(self.fund_win_frame)
        sb = Scrollbar(tmp_frame)
        sb.pack(side=RIGHT,fill=Y)
        self.text_box1 = Listbox(tmp_frame,height=15,selectmode=EXTENDED,yscrollcommand=sb.set)
        self.text_box1.pack(side=LEFT,fill=X,expand=1)
        sb.config(command=self.text_box1.yview)
        tmp_frame.pack(side=LEFT,fill=X,expand=1)
        
        tmp_frame = Frame(self.fund_win_frame)
        Button(tmp_frame,text="Refresh\nLists",command=self.refreshManagerList).pack(pady=10)
        Button(tmp_frame,text="Reset Filters",command=self.resetFilters).pack(pady=10)
        Button(tmp_frame,text=">>",command=self.selectManager).pack(pady=15)
        Button(tmp_frame,text="<<",command=self.deselectManager).pack(pady=15)
        tmp_frame.pack(side=LEFT)
        
        tmp_frame = Frame(self.fund_win_frame)
        sb = Scrollbar(tmp_frame)
        sb.pack(side=RIGHT,fill=Y)
        self.text_box2 = Listbox(tmp_frame,height=15,selectmode=EXTENDED,yscrollcommand=sb.set)
        self.text_box2.pack(side=LEFT,fill=X,expand=1)
        sb.config(command=self.text_box2.yview)
        tmp_frame.pack(side=LEFT,fill=X,expand=1)
        
        if not self.use_local[0]:
            path = self.def_network_cache_path + "StatsNew/lists/"
        else:
            path = self.def_local_cache_path + "StatsNew/lists/"
        
        tmp_file = open(path + "all_funds.cache")
        data = cPickle.load(tmp_file)
        tmp_file.close()

        self.pg_manager_objs = data
        pg_man_list = self.pg_manager_objs
        
        self.opts = {}
        self.state_zip_opts = {}
        self.state_city_opts = {}
        self.zip_city_opts = {}
        self.opts["Class"] = [" "]
        self.opts["State"] = [" "]
        self.opts["City"] = [" "]
        self.opts["PostalCode"] = [" "]
        self.opts["Primary Strategy"] = [" "]
        self.opts["Sub Strategy 1"] = [" "]
        self.opts["Sub Strategy 2"] = [" "]
        self.opts["Interest Level"] = [" "]
        self.opts["Strength"] = [" "]
        self.opts["MRR"] = [" "]
        
        for fund in sorted(pg_man_list,key=lambda fund:fund.Name):
            if fund.ID not in self.additional_managers.keys():
                if fund.Class not in self.opts["Class"]:
                    self.opts["Class"].append(fund.Class)
                if fund.state not in self.opts["State"]:
                    self.opts["State"].append(fund.state)
                if fund.postal_code not in self.opts["PostalCode"]:
                    self.opts["PostalCode"].append(fund.postal_code)
                if fund.city not in self.opts["City"]:
                    self.opts["City"].append(fund.city)                    
                if fund.state not in self.state_zip_opts.keys():
                    self.state_zip_opts[fund.state] = []
                if fund.postal_code not in self.state_zip_opts[fund.state]:
                    self.state_zip_opts[fund.state].append(fund.postal_code)
                if fund.postal_code.strip() == "None":
                    if fund.state not in self.state_city_opts.keys():
                        self.state_city_opts[fund.state] = []
                    if fund.city not in self.state_city_opts[fund.state]:
                        self.state_city_opts[fund.state].append(fund.city)                    
                if fund.postal_code not in self.zip_city_opts.keys():
                    self.zip_city_opts[fund.postal_code] = []
                if fund.city not in self.zip_city_opts[fund.postal_code]:
                    self.zip_city_opts[fund.postal_code].append(fund.city)
                if fund.prime_strat not in self.opts["Primary Strategy"]:
                    self.opts["Primary Strategy"].append(fund.prime_strat)
                if fund.sub_strat1 not in self.opts["Sub Strategy 1"]:
                    self.opts["Sub Strategy 1"].append(fund.sub_strat1)
                if fund.sub_strat2 not in self.opts["Sub Strategy 2"]:
                    self.opts["Sub Strategy 2"].append(fund.sub_strat2)
                if fund.IL not in self.opts["Interest Level"]:
                    self.opts["Interest Level"].append(fund.IL)
                if fund.StrengthRating not in self.opts["Strength"]:
                    self.opts["Strength"].append(fund.StrengthRating)
                if self.standardDateFormat(fund.DMRR) not in self.opts["MRR"]:
                    self.opts["MRR"].append(self.standardDateFormat(fund.DMRR))                  
                self.text_box1.insert(END,fund.ListName)
                
        self.opts["Class"] = sorted(self.opts["Class"])
        self.opts["City"] = sorted(self.opts["City"])
        self.opts["State"] = sorted(self.opts["State"])
        self.opts["PostalCode"] = sorted(self.opts["PostalCode"])
        self.opts["Primary Strategy"] = sorted(self.opts["Primary Strategy"])
        self.opts["Sub Strategy 1"] = sorted(self.opts["Sub Strategy 1"])
        self.opts["Sub Strategy 2"] = sorted(self.opts["Sub Strategy 2"])
        self.opts["Strength"] = sorted(self.opts["Strength"])
        self.opts["Interest Level"] = sorted(self.opts["Interest Level"])
        
        for f in sorted(self.custom_pg_list.items(),key=itemgetter(1)):
            for man in self.pg_manager_objs:
                if man.ID == f[0]: 
                    self.text_box2.insert(END,f[1]) 
        
        self.fund_win_frame.pack(fill=BOTH,expand=1)
        
        self.filter_type_ref = [[["Name","",False],["State","State:",True],["PostalCode","Zip:",True],["City","City:",True],["Interest Level","Int:",True],["MRR","MRR:",True]],
                                [["Primary Strategy","Strat:",True],["Sub Strategy 1","Sub1:",True],["Sub Strategy 2","Sub2:",True],["Class","Cls:",True],["Strength","Str:",True]]]
        self.filter_str = {}
        self.filter_str["Name"] = StringVar()
        
        tmp_search_frame = LabelFrame(self.custom_pg_frame,bd=1)
        tmp_search_frame.pack(fill=X)
        for row in self.filter_type_ref:
            tmp_frame = Frame(tmp_search_frame)
            for type_dat in row:
                Label(tmp_frame,text=(type_dat[0] + ":")).pack(side=LEFT)
                if type_dat[2]:
                    self.filter_str[type_dat[0]] = Listbox(tmp_frame,height=4,width=10,exportselection=0,selectmode=EXTENDED)
                    if type_dat[0] == "State":
                        self.filter_str[type_dat[0]].bind("<Return>",self.filterStateZipLists)
                    elif type_dat[0] == "PostalCode":
                        self.filter_str[type_dat[0]].bind("<Return>",self.filterZipCityLists)
                    else:
                        self.filter_str[type_dat[0]].bind("<Return>",self.filterManagerList)
                    for opt in self.opts[type_dat[0]]:
                        self.filter_str[type_dat[0]].insert(END,opt)
                    self.filter_str[type_dat[0]].pack(side=LEFT,fill=X,expand=1)                    
                else:
                    tmp_entry = Entry(tmp_frame,textvariable=self.filter_str[type_dat[0]],width=5)
                    tmp_entry.bind("<Return>",self.filterManagerList)
                    tmp_entry.pack(side=LEFT,fill=X,expand=1)
            tmp_frame.pack(fill=X,expand=1)
        
        tmp_frame_a = Frame(self.custom_pg_frame)
        tmp_frame = Frame(tmp_frame_a)
        Button(tmp_frame,text="OK",command=self.addCustomPeerGroup,width=10).pack(side=RIGHT)
        tmp_frame.pack(fill=X,expand=1,side=LEFT)
        self.add_to_backstop = IntVar()
        tmp_frame = Frame(tmp_frame_a)
        Checkbutton(tmp_frame,text="Add to Backstop",variable=self.add_to_backstop).pack(side=LEFT)
        tmp_frame.pack(fill=X,expand=1,side=LEFT)
        tmp_frame_a.pack(fill=X,expand=1)
        
        self.resizeWindow(700, 415, self.fund_win2)
    
    def addCustomPeerGroup(self):
        self.pg_is_custom = True
        self.custom_pg_name = self.cust_pg_name.get()
        if self.custom_pg_name == "":
            warn = Toplevel()
            warn.focus_set()
            warn.geometry("200x100+300+500")
            warn.title("Warning")
            self.resizeWindow(250,60,warn)
            self.moveWindow(0, 0, warn)
            Label(warn, text="Please provide a name for your peer group.").pack(pady=5)
            Button(warn, text="OK",width=10,command=warn.destroy).pack()
        else:
            self.fund_win2.destroy()
            if self.add_to_backstop.get() == 1:
                tmp_file = open("C:/Program Files/MCP Report Manager/peer_groups.dat",'w')
                tmp_file.write("{Stats}" + self.custom_pg_name + ":")
                for id in self.custom_pg_list:
                    tmp_file.write(" " + str(id))
                tmp_file.close()
                try:
                    os.system("taskkill /F /IM firefox.exe")
                except Exception as e:
                    print e
                    pass
                time.sleep(.5)
                cmd_str = "\"libs\\firefox\\firefox_portable.exe\" -cf-run macros\\autoPeerGroupAdd.js"
                os.system(cmd_str)
        self.pg_label_var.set(self.custom_pg_name)
        self.pg_label2_var.set(self.custom_pg_name)        
        
    def addPeerGroup(self):
        if self.peer_group_type.get() == 1:
            self.pg_is_custom = True
            self.fund_win.destroy()
        else:
            self.pg_is_custom = False
            pgs = self.pg_box1.curselection()
            if len(pgs) > 0:
                self.pg_name = self.pg_box1.get(int(pgs[0]))
                for f in self.peer_group_list.items():
                    if self.pg_name == f[1]:
                        id = f[0]
                self.pg_id = id
                self.pg_list = self.pg_member_id_list[self.pg_id]
                self.pg_label_var.set(self.pg_box1.get(int(pgs[0])))
                self.pg_label2_var.set("")
                self.fund_win.destroy()       

    def selectManager(self):
        funds = self.text_box1.curselection()
        names = {}
        indices = []        
        for f in funds:
            indices.append(int(f))            
        for index in sorted(indices,reverse=True):
            name = self.text_box1.get(index)
            names[index] = name
        for index in sorted(names.keys(),reverse=True):
            name = names[index]
            if self.stat_add_set.get() == 1:
                for f in self.manager_objs:
                    if f.ListName == name:
                        id = f.ID
                        self.additional_managers[id] = name
            elif self.stat_add_set.get() == 2:
                for f in self.pg_manager_objs:
                    if f.ListName == name:
                        id = f.ID
                        self.custom_pg_list[id] = name
            self.text_box2.insert(END,name)
            self.text_box1.delete(index)
            self.text_box1.selection_clear(index)

    def deselectManager(self):
        funds = self.text_box2.curselection()
        names = {}
        indices = []        
        for f in funds:
            indices.append(int(f)) 
        for index in sorted(indices,reverse=True):
            name = self.text_box2.get(index)
            names[index] = name
        for index in sorted(names.keys(),reverse=True):
            name = names[index]
            if self.stat_add_set.get() == 1:
                for f in self.manager_objs:
                    if f.ListName == name:
                        id = f.ID
                        del self.additional_managers[id]
            elif self.stat_add_set.get() == 2:
                for f in self.pg_manager_objs:
                    if f.ListName == name:
                        id = f.ID
                        del self.custom_pg_list[id] 
            self.text_box2.delete(index)
            self.text_box2.selection_clear(index)
        self.text_box1.delete(0,END)
        if self.stat_add_set.get() == 1:
            for fund in self.manager_objs:
                if fund.ID not in self.additional_managers.keys():
                    self.text_box1.insert(END,fund.ListName)
        elif self.stat_add_set.get() == 2:
            for fund in self.pg_manager_objs:
                if fund.ID not in self.custom_pg_list.keys():
                    self.text_box1.insert(END,fund.ListName)
    
    def refreshManagerList(self):
        if self.stat_add_set.get() == 1:
            self.use_local[0] = True
            self.manageThread(1)
        elif self.stat_add_set.get() == 2:
            if self.peer_group_type.get() == 1:
                self.use_local[0] = True
                self.manageThread(1)
            elif self.peer_group_type.get() == 2:
                self.use_local[1] = True
                self.manageThread(2)
        
    def manageThread(self,type,update_net_cache = False):
        self.pg = ProgBar("Downloading...",True)
        
        if not update_net_cache:
            self.refreshThread = ManagerListThread(self.def_local_cache_path + "StatsNew/",type)
            self.refreshThread.start()
        else:
            self.refreshThread = ManagerListThread(self.def_network_cache_path,type)
            self.refreshThread.start()
                    
        count = 0
        while self.refreshThread.status == 1 and not self.early_terminate:
            self.root.update()
            try:
                self.pg.updateMainPercent(count)
                count = (count+4)%108
                self.pg.redisplay()
            except SystemExit:
                self.refreshThread.terminate()
                self.early_terminate = True
            time.sleep(.1)
        if self.early_terminate:
            self.pg.exit()
            del self.refreshThread
            del self.pg
            self.early_terminate = False
        else:
            self.pg.addMessage("finished....")
            self.pg.exit()
            del self.pg
            if self.stat_add_set.get() == 1:
                self.fund_win.destroy()
                self.selectAddManagers()
            elif self.stat_add_set.get() == 2:
                if self.peer_group_type.get() == 1:
                    self.fund_win2.destroy()
                    self.createCustomPeerGroup()  
                elif self.peer_group_type.get() == 2:
                    self.fund_win.destroy()
                    self.selectPeerGroup()
     
    def setPGActive(self):
        if self.peer_group_type.get() == 1:
            self.cust_pg_button.config(state=NORMAL)
            self.pg_box1.config(state=DISABLED)
            self.filter_entry.config(state=DISABLED)
            self.refresh_pg_list_button.config(state=DISABLED)
            self.as_of_date_month.config(state=NORMAL)
            self.as_of_date_year.config(state=NORMAL)
            self.as_of_label.config(state=NORMAL)
        elif self.peer_group_type.get() == 2:
            self.cust_pg_button.config(state=DISABLED)
            self.refresh_pg_list_button.config(state=NORMAL)
            self.pg_box1.config(state=NORMAL)
            self.filter_entry.config(state=NORMAL)
                        
    def activateCacheButton(self):
        if self.data_input_type.get() == 3:
            self.cache_month_box.config(state=NORMAL)
            self.cache_year_box.config(state=NORMAL)
            self.as_of_date_month.config(state=DISABLED)
            self.as_of_date_year.config(state=DISABLED)
            self.as_of_label.config(state=DISABLED)
        elif self.data_input_type.get() == 2:
            self.cache_month_box.config(state=DISABLED)
            self.cache_year_box.config(state=DISABLED)
            self.stats_cache_path = self.def_local_cache_path + "StatsNew/"
            self.as_of_date_month.config(state=NORMAL)
            self.as_of_date_year.config(state=NORMAL)
            self.as_of_label.config(state=NORMAL)
        else:
            self.cache_month_box.config(state=DISABLED)
            self.cache_year_box.config(state=DISABLED)
            self.stats_cache_path = self.def_network_cache_path + "StatsNew/"
            self.as_of_date_month.config(state=DISABLED)
            self.as_of_date_year.config(state=DISABLED)
            self.as_of_label.config(state=DISABLED)
    
    def setOutputDir(self):
        dir = askdirectory(parent=self.root,initialdir="/",title='Please select a directory')
        self.path_entry.delete(0,END)
        self.path_entry.insert(0,dir)
    
    def generateStats(self):
        map = {"Jan":1, "Feb":2, "Mar":3, "Apr":4, "May":5,"Jun":6,"Jul":7,"Aug":8,"Sep":9,"Oct":10,"Nov":11,"Dec":12}
        
        date_arr = "DEFAULT"
        if self.date_input_type.get() == 2:
            tmp = self.custom_date_section
            date_arr = [[date(int(tmp[0][2].get()),map[tmp[0][1].get()],15),date(int(tmp[0][4].get()),map[tmp[0][3].get()],15)],
                        [date(int(tmp[1][2].get()),map[tmp[1][1].get()],15),date(int(tmp[1][4].get()),map[tmp[1][3].get()],15)],
                        [date(int(tmp[2][2].get()),map[tmp[2][1].get()],15),date(int(tmp[2][4].get()),map[tmp[2][3].get()],15)]]
        
        if self.data_input_type.get() == 1 or self.data_input_type.get() == 3:
            stats = self.stats_gen
            if self.data_input_type.get() == 3:
                tmp_date = date(int(self.cache_year_var.get()),map[self.cache_month_var.get()],1)
                as_of_date = date(tmp_date.year,tmp_date.month,self.getEndOfMonth(tmp_date.month, tmp_date.year))
            else:
                as_of_date = self.cache_most_recent_date
        else:
            stats = self.stats_gen
            tmp_date = date(int(self.cur_year.get()),map[self.cur_month.get()],1)
            as_of_date = date(tmp_date.year,tmp_date.month,self.getEndOfMonth(tmp_date.month, tmp_date.year))
        
        include_mcpfai = False
        calc_rankings = False
        if self.include_mcp_indices.get() == 1:
            include_mcpfai = True
        if self.calculate_rankings.get() == 1:
            calc_rankings = True
            
        if self.data_input_type.get() == 1 or self.data_input_type.get() == 3:
            if self.stat_add_set.get() == 0:
                args = [1,self.stat_fund_set.get(),[],as_of_date,date_arr,self.stat_fund_subset.get(),include_mcpfai,calc_rankings,False]
            elif self.stat_add_set.get() == 1:
                args = [1,self.stat_fund_set.get(),self.additional_managers.keys(),as_of_date,date_arr,self.stat_fund_subset.get(),include_mcpfai,calc_rankings,False]
            elif self.stat_add_set.get() == 2:
                if self.peer_group_type.get() == 1:
                    args = [2,self.custom_pg_list,self.custom_pg_name,as_of_date,date_arr,self.stat_fund_subset.get(),include_mcpfai,calc_rankings,False]
                elif self.peer_group_type.get() == 2:
                    args = [2,self.pg_list,self.pg_name,as_of_date,date_arr,self.stat_fund_subset.get(),include_mcpfai,calc_rankings,False]
        elif self.data_input_type.get() == 2:
            if self.stat_add_set.get() == 0:
                args = [1,self.stat_fund_set.get(),[],as_of_date,date_arr,self.stat_fund_subset.get(),include_mcpfai,calc_rankings,True]
            elif self.stat_add_set.get() == 1:
                args = [1,self.stat_fund_set.get(),self.additional_managers.keys(),as_of_date,date_arr,self.stat_fund_subset.get(),include_mcpfai,calc_rankings,True]
            elif self.stat_add_set.get() == 2:
                if self.peer_group_type.get() == 1:
                    args = [2,self.custom_pg_list,self.custom_pg_name,as_of_date,date_arr,self.stat_fund_subset.get(),include_mcpfai,calc_rankings,True]
                elif self.peer_group_type.get() == 2:
                    args = [2,self.pg_list,self.pg_name,as_of_date,date_arr,self.stat_fund_subset.get(),include_mcpfai,calc_rankings,True]
        
        self.pg = ProgBar("Downloading...",True)
        
        self.statsThread = StatsManagerThread(stats,args)
        self.statsThread.start()
        
        count = 0
        while self.statsThread.status == 1 and not self.early_terminate:
            self.root.update()
            try:
                self.pg.updateMainPercent(count)
                count = (count+4)%108
                self.pg.redisplay()
            except SystemExit:
                self.refreshThread.terminate()
                self.early_terminate = True
            time.sleep(.1)
        if self.early_terminate:
            self.pg.exit()
            del self.refreshThread
            del self.pg
            self.early_terminate = False
        else:
            self.pg.addMessage("finished....")
            self.pg.exit()
            del self.pg
    
    def killStatsThread(self):
        self.statsThread.terminate()
        self.load_win.destroy()
        
    def killRefreshThread(self):
        if self.thread_init == False:
            if self.stat_add_set.get() == 1:
                self.use_local[0] = False
            elif self.stat_add_set.get() == 2:
                if self.peer_group_type.get() == 1:
                    self.use_local[0] = False
                elif self.peer_group_type.get() == 2:
                    self.use_local[1] = False
            self.refreshThread.terminate()
            self.load_win.destroy()
    
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
    
    def standardDateFormat(self,date):
        months = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep","Oct", "Nov"]
        return months[date.month%12] + "'" + str(date.year)[2:]
        
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
    
    def curMonth(self,cur_date=datetime.now()):
        month = cur_date.month - 1
        return month
    def prevMonth(self,cur_date=datetime.now()):
        month = 0
        if cur_date.month==1:
            month=11
        else:
            month = cur_date.month - 2
        return month
    
    def nextMonth(self,cur_date=datetime.now()):
        month = 0
        if cur_date.month != 12:
            month = cur_date.month
        return month
        
    def prevMonthYear(self,offset,cur_date=datetime.now()):
        year = 0
        if cur_date.month==12:
            year = cur_date.year + 1
        else:
            year = cur_date.year
        return year - offset
        
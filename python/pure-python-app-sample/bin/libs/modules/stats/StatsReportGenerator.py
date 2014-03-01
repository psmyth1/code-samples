from utils.BackStopDataManager import BackStopDataManager
from utils.Fund import Fund
from win32com.client import Dispatch
from win32com.client import gencache
import pythoncom
import os
from operator import attrgetter, itemgetter
from datetime import datetime, date
import cPickle, time
from utils.BackStopDataManager import BackStopDataManager
from ExcelWriter import ExcelWriter
from StatsCalculator import StatsCalculator
from StatsCacheUpdater import StatsCacheUpdater
from utils.CheckFilename import CheckFilename

class StatsReportGenerator:
    def __init__(self,cache_path,output_path = ("C:/Documents and Settings/" + os.getenv("username") + "/Desktop")):
        if cache_path[len(cache_path)-1] != "/" and cache_path[len(cache_path)-1] != "\\":
            cache_path += "/"        
        self.cache_path = cache_path

        self.stats_calc = []
        self.stats_calc.append(StatsCalculator(cache_path))
        self.stats_calc.append(StatsCalculator(cache_path,True))
        
        self.setOutputPath(output_path)        
        self.months = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep","Oct", "Nov"]
        
        self.loadData()
    
    def setOutputPath(self,output_path):
        if output_path[len(output_path)-1] == '/':
            output_path = output_path[0:len(output_path)-1]
            
        if output_path.count("/") > 0:
            final_path = ""
            pieces = output_path.split("/")
            for p in pieces:
                final_path += p + "\\"
            output_path = final_path
        self.dir_path = output_path
    
    def loadData(self):
        self.universe_funds = ["","",""]

        tmp_file = open(self.cache_path + "lists/all_fund_index.cache")
        self.fund_index = cPickle.load(tmp_file)
        tmp_file.close()
        
        tmp_file = open(self.cache_path + "lists/invested_funds.cache")
        self.universe_funds[0] = cPickle.load(tmp_file)
        tmp_file.close()

        tmp_file = open(self.cache_path + "lists/focus_list_funds.cache")
        self.universe_funds[1] = cPickle.load(tmp_file)
        tmp_file.close()

        tmp_file = open(self.cache_path + "lists/inv_and_focus_funds.cache")
        self.universe_funds[2] = cPickle.load(tmp_file)
        tmp_file.close()
               
        tmp_file = open(self.cache_path + "lists/MCPFAI_funds.cache")
        self.MCPFAI_funds = cPickle.load(tmp_file)
        tmp_file.close()
    
    def refreshFundInfo(self,fund_universe,add_managers=[],include_indices=False):
        t = date.today()
        cur_date = date(t.year,t.month,15)
        get = BackStopDataManager()
        stats_cache_updater = StatsCacheUpdater(self.cache_path)
                
        file_def = open("def/refresh_fund_def.dat")
        report_def = file_def.read()
        file_def.close()
        if fund_universe != "PeerGroup":
            if fund_universe == 1:
                file_res = open("def/refresh_inv_res.dat")
                report_res = file_res.read()
                file_res.close()
            elif fund_universe == 2:
                file_res = open("def/refresh_focus_res.dat")
                report_res = file_res.read()
                file_res.close()
            elif fund_universe == 3:
                file_res = open("def/refresh_inv_focus_res.dat")
                report_res = file_res.read()
                file_res.close()
            info = get.runFundsReport(report_def, report_res, cur_date)
            for data in info:
                self.fund_index[data[0][1]].DMRR = datetime.strptime(data[1][1],"%m/%d/%Y")
                self.fund_index[data[0][1]].IL = data[2][1]
                self.fund_index[data[0][1]].Signal = data[3][1]
                self.fund_index[data[0][1]].DMRR = stats_cache_updater.getActualDMRR(data[0][1],self.fund_index[data[0][1]].DMRR)
                
        if len(add_managers) > 0:
            report_res = """${(report.field1 == """ + str(add_managers[0]) + """)"""
            for id in add_managers[1:]:
                report_res += """ && (report.field1 == """ + str(id) + """)"""
            report_res += """}"""
            info = get.runFundsReport(report_def, report_res, cur_date)
            for data in info:
                self.fund_index[data[0][1]].DMRR = datetime.strptime(data[1][1],"%m/%d/%Y")
                self.fund_index[data[0][1]].IL = data[2][1]
                self.fund_index[data[0][1]].Signal = data[3][1]
                self.fund_index[data[0][1]].DMRR = stats_cache_updater.getActualDMRR(data[0][1],self.fund_index[data[0][1]].DMRR)
        
        if include_indices:
            self.MCPFAI_funds = []
            file_def = open("def/MCPFAI_def.dat")
            file_res = open("def/MCPFAI_res.dat")
            report_def = file_def.read()
            report_res = file_res.read()
            info = get.runFundsReport(report_def, report_res, cur_date)
            for data in info:
                self.fund_index[data[1][1]].DMRR = datetime.strptime(data[2][1],"%m/%d/%Y")
                self.fund_index[data[1][1]].IL = "MCP Fund or Index"
                self.fund_index[data[1][1]].Class = "MCP Fund or Index"
                self.fund_index[data[1][1]].Signal = data[4][1]
                self.fund_index[data[1][1]].DMRR = stats_cache_updater.getActualDMRR(data[1][1],self.fund_index[data[1][1]].DMRR)
                self.MCPFAI_funds.append(self.fund_index[data[1][1]])                
        
    def generateStandardReport(self,fund_universe,add_managers=[],as_of_date=date.today(),date_ranges="DEFAULT",only_complete_data=1,include_indices=False,calculate_rankings=False,backstop_only=False):
        add_funds = []
        univ_funds = []
        mcpfai_funds = []
        target_funds = []
        funds_period_all = [[],[],[]]
        funds_period_complete = [[],[],[]]
        funds_period_1mo = [[],[],[]]
        funds_period_2mo = [[],[],[]]
        funds_period_other = [[],[],[]]
        
        if backstop_only:
            self.refreshFundInfo(fund_universe,add_managers,include_indices)
        as_of_date = self.setMiddleMonth(as_of_date)
        custom_dates = True
        if date_ranges == "DEFAULT":
            custom_dates = True
            end_date = self.setMiddleMonth(as_of_date)
            report_dates = [[self.trailingYearDate(end_date,1),end_date],[self.trailingYearDate(end_date,3),end_date],[self.trailingYearDate(end_date,5),end_date]]
        else:
            report_dates = date_ranges
        
        if fund_universe == 1:
            univ_funds = self.universe_funds[0]
            target_funds.extend(self.universe_funds[0])
        elif fund_universe == 2:
            univ_funds = self.universe_funds[1]
            target_funds.extend(self.universe_funds[1])
        elif fund_universe == 3:
            univ_funds = self.universe_funds[2]
            target_funds.extend(self.universe_funds[2])
            
        if len(add_managers) > 0:
            for id in add_managers:
                if id in self.fund_index.keys():
                    add_funds.append(self.fund_index[id])
                    target_funds.append(self.fund_index[id])
                elif str(id) in self.fund_index.keys():
                    add_funds.append(self.fund_index[str(id)])
                    target_funds.append(self.fund_index[str(id)])
                elif unicode(str(id)) in self.fund_index.keys():
                    add_funds.append(self.fund_index[unicode(str(id))])
                    target_funds.append(self.fund_index[unicode(str(id))])
        
        if include_indices:
            mcpfai_funds = self.MCPFAI_funds
            for fund in mcpfai_funds:
                if not self.equalOrAfter(fund.DMRR, as_of_date) and fund.Signal != "-":
                    fund.DMRR = as_of_date            
            target_funds.extend(mcpfai_funds)

        for fund in target_funds:
            for p_num in range(0,3):
                if self.equalOrBefore(fund.incept_date, report_dates[p_num][0]):
                    if self.equalOrAfter(fund.DMRR, report_dates[p_num][1]):
                        funds_period_all[p_num].append(fund)
                        funds_period_complete[p_num].append(fund)
                    elif self.equalOrAfter(fund.DMRR, self.getMonthBefore(report_dates[p_num][1])):
                        funds_period_all[p_num].append(fund)
                        funds_period_1mo[p_num].append(fund)
                    elif self.equalOrAfter(fund.DMRR, self.getMonthBefore(self.getMonthBefore(report_dates[p_num][1]))):
                        funds_period_all[p_num].append(fund)
                        funds_period_2mo[p_num].append(fund)
                    else:
                        funds_period_other[p_num].append(fund)

        for p_num in range(0,3):
            print "report_dates for pnum", p_num, report_dates[p_num]
            self.loadStats(funds_period_complete[p_num],p_num,report_dates[p_num][0],report_dates[p_num][1],backstop_only)
            if only_complete_data == 2:
                self.loadStats(funds_period_1mo[p_num],p_num,report_dates[p_num][0],report_dates[p_num][1],backstop_only)
                self.loadStats(funds_period_2mo[p_num],p_num,report_dates[p_num][0],report_dates[p_num][1],backstop_only)

        classes = ["A", "B Low Vol", "B", "C", "D"]
        if include_indices:
            classes.append("MCP Fund or Index")

        output_funds = {}
        output = []    
        
        for cls in classes:
            output_funds[cls] = [[],[],[]]
        
        fund_group = []
        if only_complete_data == 1:
            fund_group = funds_period_complete
        elif only_complete_data == 2:
            fund_group = funds_period_all
            
        for p_num in range(0,3):
            for fund in fund_group[p_num]:
                if fund.Class in classes:
                    output_funds[fund.Class][p_num].append(fund)
                else:
                    output_funds["D"][p_num].append(fund)
        
        if calculate_rankings:
            for cls in output_funds.keys():
                for p_num in range(0,3):
                    if len(output_funds[cls][p_num]) > 0:
                        self.calcRankings(output_funds[cls][p_num],p_num)
        
        border_cols = [6,8,10,12,14,16,18,22,26,30,36,40,42,44,46]
        hidden_cols = [5,6,8,10,12,14,16,18,19,20,21,22,24,26,28,30,31,32,33,34,35,36,37,38,39,40,42,44,46,47,48,49]
        trailing_tags = ["1 Yr", "3 Yr", "5 Yr"]
        trailing_headings = ["Trailing 1-Year","Trailing 3-Year","Trailing 5-Year"]
        sect_size = []
        sect_corners = []

        for cls_var in range(0,len(classes)):
            cls = classes[cls_var]
            sect_size.append([0,0,0])
            output.append([[[],[]],[[],[]],[[],[]]])
            for p_num in range(0,3):
                output_funds[cls][p_num] = sorted(output_funds[cls][p_num], key=attrgetter('Name'))
                sect_size[cls_var][p_num] = len(output_funds[cls][p_num])
                for fund in output_funds[cls][p_num]:
                    tmp_row = []
                    disp_att = []
                    tmp_row.append(fund.Name)
                    if cls == "MCP Fund or Index":
                        tmp_row.append(" ")
                    elif cls == "B Low Vol":
                        tmp_row.append("BLV")
                    else:
                        tmp_row.append(fund.Class)
                    if cls == "MCP Fund or Index":
                        tmp_row.append(" ")
                    else:
                        tmp_row.append(fund.StrengthRating)
                    tmp_row.append(fund.incept_date)
                    mmr_str = self.months[fund.DMRR.month%12] + "'" + str(fund.DMRR.year - 2000)
                    tmp_row.append(mmr_str)
                    if custom_dates:
                        tmp_row.append("Custom")
                    else:
                        tmp_row.append(trailing_tags[p_num])
                    for s_var in range(0,len(fund.stats[p_num])):
                        tmp_row.append(fund.stats[p_num][s_var])
                        if calculate_rankings and cls != "MCP Fund or Index":
                            tmp_row.append(fund.stat_ranks[p_num][s_var])
                        else:
                            tmp_row.append("-")
                    if fund_universe == 3 and fund.IL == "Invested":
                        disp_att.append(True)
                    else:
                        disp_att.append(False)
                    if only_complete_data == 2 and not self.compareMMRandPeriodEnd(mmr_str, report_dates[p_num][1]):
                        disp_att.append(True)
                    else:
                        disp_att.append(False)
                    if len(add_managers) > 0 and (unicode(str(fund.ID)) in add_managers or str(fund.ID) in add_managers or fund.ID in add_managers):
                        disp_att.append(True)
                    else:
                        disp_att.append(False)
                    output[cls_var][p_num][0].append(tuple(tmp_row))
                    output[cls_var][p_num][1].append(disp_att)
                if len(output_funds[cls][p_num]) == 0:
                    output[cls_var][p_num][0].append(tuple([" "," "]))
                    
        gencache.EnsureModule('{00020813-0000-0000-C000-000000000046}', 0, 1, 5)
        xl = Dispatch("Excel.Application")
        
        xl.Visible = True
        if include_indices:
            xl.Workbooks.Open(os.getcwd() + "\\macros\\templates\\template_std_wmcpfai.xls")
        else:
            xl.Workbooks.Open(os.getcwd() + "\\macros\\templates\\template_std.xls")
        ex_writer = ExcelWriter(xl)
        wb = xl.ActiveWorkbook
        shts = wb.Sheets
        
        file_date = self.months[as_of_date.month%12] + "'" + str(as_of_date.year - 2000)
        filename = "Statistics Report " + file_date
        checker = CheckFilename(self.dir_path, filename)
        filename = checker.checkName()
        
        xl.ActiveWorkbook.SaveAs(filename)
        
        cur_dir = os.getcwd()
        try:
            xl.VBE.ActiveVBProject.VBComponents.Import(cur_dir + "\macros\StatsReportFormatting.bas")
            xl.VBE.ActiveVBProject.VBComponents.Import(cur_dir + "\macros\SortUF.frm")
        except:
            pass
        sht = shts("Notes")
        sht.Activate()
        non_current_funds = {}
        if only_complete_data == 1:
            sht.Cells(1,1).Value = "The following funds did not have returns for the current month. Consequently, they are not included in this report."
            for p_num in range(0,3):
                for f in funds_period_1mo[p_num]:
                    non_current_funds[f.ID] = f
                for f in funds_period_2mo[p_num]:
                    non_current_funds[f.ID] = f
                for f in funds_period_other[p_num]:
                    non_current_funds[f.ID] = f
        elif only_complete_data == 2:
            sht.Cells(1,1).Value = "The following funds did not have returns for the past three months. Consequently, they are not included in this report."
            for p_num in range(0,3):
                for f in funds_period_other[p_num]:
                    non_current_funds[f.ID] = f

        non_current_funds = sorted(non_current_funds.values(), key=attrgetter('Name'))
        for fund_num in range(0,len(non_current_funds)):
            fund = non_current_funds[fund_num]
            sht.Cells(3 + fund_num,1).Value = fund.Name

        univ_name = ""
        if fund_universe == 1:
            univ_name = "Invested"
        elif fund_universe == 2:
            univ_name = "Focus List"
        elif fund_universe == 3:
            univ_name = "Invested & Focus List"
        sht = shts("Report")
        sht.Name = univ_name
        
        title_str = self.months[as_of_date.month%12] + "'"  + str(as_of_date.year - 2000) + " " + univ_name + " Funds"
        sht.Cells(2,45).Value = title_str
        
        comment_str = ""
        if only_complete_data == 1:
            comment_str = "*Only funds with complete returns are included"
        elif only_complete_data == 2:
            comment_str = "*All funds, despite having complete returns or not, are included"
        t = datetime.now()
        time_str = t.strftime("Generated on %m/%d/%Y at %I:%M:%S %p")
        
        cur_offset = 7
        for sect_num in range(0,len(classes)):
            for p_num in range(0,3):
                if custom_dates:
                    sht.Cells(cur_offset-2,1).Value = self.periodName(report_dates[p_num][0], report_dates[p_num][1])
                else:
                    sht.Cells(cur_offset-2,1).Value = trailing_headings[p_num]
                if sect_size[sect_num][p_num] == 0:
                    cur_offset += 1
                elif sect_size[sect_num][p_num] > 1:
                    p_str = str(cur_offset)+":"+str(cur_offset+sect_size[sect_num][p_num]-2)
                    sht.Rows(p_str).Insert()
                ex_writer.addMultipleRows(cur_offset-1,output[sect_num][p_num][0],1,sht)
                for row_var in range(0,len(output[sect_num][p_num][1])):
                    atts = output[sect_num][p_num][1][row_var]
                    row_num = (cur_offset-1) + row_var
                    if atts[0]:
                        sht.Cells(row_num,1).Font.ColorIndex = 11
                    if atts[1]:
                        sht.Rows(row_num).Font.Italic = True
                    if atts[2]:
                        sht.Cells(row_num,1).Font.ColorIndex = 13
                cur_offset += (sect_size[sect_num][p_num]+1) 
            if calculate_rankings:
                for col in border_cols:    
                    tmp_range = ex_writer.getRangeByCells(((cur_offset-sect_size[sect_num][0]-sect_size[sect_num][1]-sect_size[sect_num][2]-7),col),((cur_offset-3),col),sht)
                    ex_writer.formatRange(tmp_range,"style_border_right")
            sht.Cells(cur_offset-2,1).Value = comment_str
            sht.Cells(cur_offset-2,45).Value = time_str
            cur_offset += 3
        
        xl.Run("FinalFormatting")

        big_range = sht.Columns(hidden_cols[0])
        for col in hidden_cols[1:]:
            big_range = xl.Union(big_range,sht.Columns(col))
        big_range.EntireColumn.Hidden = True
        
        if calculate_rankings:
            xl.Run("Hotkeys_wR")
        else:
            xl.Run("Hotkeys_woR")

        xl.ActiveWorkbook.Save()
        xl.Run("UserFormTimer") 
        
    def generatePGReport(self,pg_fund_ids,pg_name,as_of_date=date.today(),date_ranges="DEFAULT",only_complete_data=1,include_indices=False,calculate_rankings=False,backstop_only=False):
        mcpfai_funds = []
        target_funds = []
        funds_period_all = [[],[],[]]
        funds_period_complete = [[],[],[]]
        funds_period_1mo = [[],[],[]]
        funds_period_2mo = [[],[],[]]
        funds_period_other = [[],[],[]]
        
        if backstop_only:
            self.refreshFundInfo("PeerGroup",pg_fund_ids,include_indices)
            
        pg_name = pg_name.replace("/","-")
        
        as_of_date = self.setMiddleMonth(as_of_date)
        custom_dates = True
        if date_ranges == "DEFAULT":
            custom_dates = False
            end_date = self.setMiddleMonth(as_of_date)
            report_dates = [[self.trailingYearDate(end_date,1),end_date],[self.trailingYearDate(end_date,3),end_date],[self.trailingYearDate(end_date,5),end_date]]
        else:
            report_dates = date_ranges
        
        for id in pg_fund_ids:
            if id in self.fund_index.keys():
                target_funds.append(self.fund_index[id])
            elif str(id) in self.fund_index.keys():
                target_funds.append(self.fund_index[str(id)])
            elif unicode(str(id)) in self.fund_index.keys():
                target_funds.append(self.fund_index[unicode(str(id))])

        if include_indices:
            mcpfai_funds = self.MCPFAI_funds
            for fund in mcpfai_funds:
                if not self.equalOrAfter(fund.DMRR, as_of_date) and fund.Signal != "-":
                    fund.DMRR = as_of_date            
            target_funds.extend(mcpfai_funds)

        for fund in target_funds:
            for p_num in range(0,3):
                if self.equalOrBefore(fund.incept_date, report_dates[p_num][0]):
                    if self.equalOrAfter(fund.DMRR, report_dates[p_num][1]):
                        funds_period_all[p_num].append(fund)
                        funds_period_complete[p_num].append(fund)
                    elif self.equalOrAfter(fund.DMRR, self.getMonthBefore(report_dates[p_num][1])):
                        funds_period_all[p_num].append(fund)
                        funds_period_1mo[p_num].append(fund)
                    elif self.equalOrAfter(fund.DMRR, self.getMonthBefore(self.getMonthBefore(report_dates[p_num][1]))):
                        funds_period_all[p_num].append(fund)
                        funds_period_2mo[p_num].append(fund)
                    else:
                        funds_period_other[p_num].append(fund)

        for p_num in range(0,3):
            self.loadStats(funds_period_complete[p_num],p_num,report_dates[p_num][0],report_dates[p_num][1],backstop_only)
            if only_complete_data == 2:
                self.loadStats(funds_period_1mo[p_num],p_num,report_dates[p_num][0],report_dates[p_num][1],backstop_only)
                self.loadStats(funds_period_2mo[p_num],p_num,report_dates[p_num][0],report_dates[p_num][1],backstop_only)

        classes = ["Peer Group"]
        if include_indices:
            classes.append("MCP Fund or Index")

        output_funds = {}
        output = []    
        
        for cls in classes:
            output_funds[cls] = [[],[],[]]
                
        fund_group = []
        if only_complete_data == 1:
            fund_group = funds_period_complete
        elif only_complete_data == 2:
            fund_group = funds_period_all
            
        if include_indices:
            for p_num in range(0,3):
                for fund in fund_group[p_num]:
                    if fund.Class != "MCP Fund or Index":
                        output_funds["Peer Group"][p_num].append(fund)
                    else:
                        output_funds["MCP Fund or Index"][p_num].append(fund)
        else:
            for p_num in range(0,3):
                for fund in fund_group[p_num]:
                    output_funds["Peer Group"][p_num].append(fund)
        
        if calculate_rankings:
            for cls in output_funds.keys():
                for p_num in range(0,3):
                    if len(output_funds[cls][p_num]) > 0:
                        self.calcRankings(output_funds[cls][p_num],p_num)
        
        border_cols = [6,8,10,12,14,16,18,22,26,30,36,40,42,44,46]
        hidden_cols = [5,6,8,10,12,14,16,18,19,20,21,22,24,26,28,30,31,32,33,34,35,36,37,38,39,40,42,44,46,47,48,49]
        trailing_tags = ["1 Yr", "3 Yr", "5 Yr"]
        trailing_headings = ["Trailing 1-Year","Trailing 3-Year","Trailing 5-Year"]
        sect_size = []
        sect_corners = []

        for cls_var in range(0,len(classes)):
            cls = classes[cls_var]
            sect_size.append([0,0,0])
            output.append([[[],[]],[[],[]],[[],[]]])
            for p_num in range(0,3):
                output_funds[cls][p_num] = sorted(output_funds[cls][p_num], key=attrgetter('Name'))
                sect_size[cls_var][p_num] = len(output_funds[cls][p_num])
                for fund in output_funds[cls][p_num]:
                    tmp_row = []
                    disp_att = []
                    tmp_row.append(fund.Name)
                    if cls == "MCP Fund or Index":
                        tmp_row.append(" ")
                    elif cls == "B Low Vol":
                        tmp_row.append("BLV")
                    else:
                        tmp_row.append(fund.Class)
                    if cls == "MCP Fund or Index":
                        tmp_row.append(" ")
                    else:
                        tmp_row.append(fund.StrengthRating)
                    tmp_row.append(fund.incept_date)
                    mmr_str = self.months[fund.DMRR.month%12] + "'" + str(fund.DMRR.year - 2000)
                    tmp_row.append(mmr_str)
                    if custom_dates:
                        tmp_row.append("Custom")
                    else:
                        tmp_row.append(trailing_tags[p_num])
                    for s_var in range(0,len(fund.stats[p_num])):
                        tmp_row.append(fund.stats[p_num][s_var])
                        if calculate_rankings:
                            tmp_row.append(fund.stat_ranks[p_num][s_var])
                        else:
                            tmp_row.append("")
                    if fund.IL == "Invested":
                        disp_att.append(True)
                    else:
                        disp_att.append(False)
                    if only_complete_data == 2 and not self.compareMMRandPeriodEnd(mmr_str, report_dates[p_num][1]):
                        disp_att.append(True)
                    else:
                        disp_att.append(False)
                    output[cls_var][p_num][0].append(tuple(tmp_row))
                    output[cls_var][p_num][1].append(disp_att)
                if len(output_funds[cls][p_num]) == 0:
                    output[cls_var][p_num][0].append(tuple([" "," "]))
                    
        gencache.EnsureModule('{00020813-0000-0000-C000-000000000046}', 0, 1, 5)
        xl = Dispatch("Excel.Application")
        
        xl.Visible = True
        if include_indices:
            xl.Workbooks.Open(os.getcwd() + "\\macros\\templates\\template_pg_wmcpfai.xls")
        else:
            xl.Workbooks.Open(os.getcwd() + "\\macros\\templates\\template_pg.xls")
        ex_writer = ExcelWriter(xl)
        wb = xl.ActiveWorkbook
        shts = wb.Sheets
        
        cur_dir = os.getcwd()
        xl.VBE.ActiveVBProject.VBComponents.Import(cur_dir + "\macros\StatsReportFormatting.bas")
        xl.VBE.ActiveVBProject.VBComponents.Import(cur_dir + "\macros\SortUF.frm")
        
        file_date = self.months[as_of_date.month%12] + "'" + str(as_of_date.year - 2000)
        filename = "Statistics Report " + file_date + " - " + pg_name
        checker = CheckFilename(self.dir_path, filename)
        filename = checker.checkName()
        
        xl.ActiveWorkbook.SaveAs(filename)
        
        sht = shts("Notes")
        sht.Activate()
        non_current_funds = {}
        if only_complete_data == 1:
            sht.Cells(1,1).Value = "The following funds did not have returns for the current month. Consequently, they are not included in this report."
            for p_num in range(0,3):
                for f in funds_period_1mo[p_num]:
                    non_current_funds[f.ID] = f
                for f in funds_period_2mo[p_num]:
                    non_current_funds[f.ID] = f
                for f in funds_period_other[p_num]:
                    non_current_funds[f.ID] = f
        elif only_complete_data == 2:
            sht.Cells(1,1).Value = "The following funds did not have returns for the past three months. Consequently, they are not included in this report."
            for p_num in range(0,3):
                for f in funds_period_other[p_num]:
                    non_current_funds[f.ID] = f

        non_current_funds = sorted(non_current_funds.values(), key=attrgetter('Name'))
        for fund_num in range(0,len(non_current_funds)):
            fund = non_current_funds[fund_num]
            sht.Cells(3 + fund_num,1).Value = fund.Name

        sht = shts("Report")
        sht.Name = pg_name
        
        title_str = self.months[as_of_date.month%12] + "'"  + str(as_of_date.year - 2000) + " " + pg_name + " Funds"
        sht.Cells(2,45).Value = title_str
        
        comment_str = ""
        if only_complete_data == 1:
            comment_str = "*Only funds with complete returns are included"
        elif only_complete_data == 2:
            comment_str = "*All funds, despite having complete returns or not, are included"
        t = datetime.now()
        time_str = t.strftime("Generated on %m/%d/%Y at %I:%M:%S %p")
         
        cur_offset = 7
        for sect_num in range(0,len(classes)):
            for p_num in range(0,3):
                if custom_dates:
                    sht.Cells(cur_offset-2,1).Value = self.periodName(report_dates[p_num][0], report_dates[p_num][1])
                else:
                    sht.Cells(cur_offset-2,1).Value = trailing_headings[p_num]
                if sect_size[sect_num][p_num] == 0:
                    cur_offset += 1
                elif sect_size[sect_num][p_num] > 1:
                    p_str = str(cur_offset)+":"+str(cur_offset+sect_size[sect_num][p_num]-2)
                    sht.Rows(p_str).Insert()
                ex_writer.addMultipleRows(cur_offset-1,output[sect_num][p_num][0],1,sht)
                for row_var in range(0,len(output[sect_num][p_num][1])):
                    atts = output[sect_num][p_num][1][row_var]
                    row_num = (cur_offset-1) + row_var
                    if atts[0]:
                        sht.Cells(row_num,1).Font.ColorIndex = 11
                    if atts[1]:
                        sht.Rows(row_num).Font.Italic = True
                cur_offset += (sect_size[sect_num][p_num]+1) 
            if calculate_rankings:
                for col in border_cols:    
                    tmp_range = ex_writer.getRangeByCells(((cur_offset-sect_size[sect_num][0]-sect_size[sect_num][1]-sect_size[sect_num][2]-7),col),((cur_offset-3),col),sht)
                    ex_writer.formatRange(tmp_range,"style_border_right")
            sht.Cells(cur_offset-2,1).Value = comment_str
            sht.Cells(cur_offset-2,45).Value = time_str
            cur_offset += 3
        
        big_col_range = sht.Range(sht.Columns(3),sht.Columns(4))
        big_col_range =  sht.Range(big_col_range,sht.Columns(5)).EntireColumn.AutoFit()

        xl.Run("FinalFormatting")
        big_range = sht.Columns(hidden_cols[0])
        
        for col in hidden_cols[1:]:
            big_range = xl.Union(big_range,sht.Columns(col))
            
        big_range.EntireColumn.Hidden = True
              
        if calculate_rankings:
            xl.Run("Hotkeys_wR")
        else:
            xl.Run("Hotkeys_woR")
        
        xl.ActiveWorkbook.Save()
        xl.Run("UserFormTimer")       

    def calcRankings(self,fund_group,p_num):
        stat_arrs = {}
        rankings = {}
        sort_order = [True,True,False,True,True,True,True,False,True,False,True,False,True,True,True,True,True,True,False,False,False]
        for fund in fund_group:
            for stat_var in range(0,21):
                if stat_var not in stat_arrs.keys():
                    stat_arrs[stat_var] = []
                if fund.stats[p_num][stat_var] == "N/A":
                    if sort_order[stat_var]:
                        stat_arrs[stat_var].append((-1000000000000,fund.ID))
                    else:
                        stat_arrs[stat_var].append((1000000000000,fund.ID))
                else:
                    stat_arrs[stat_var].append((fund.stats[p_num][stat_var],fund.ID))
            rankings[fund.ID] = []
        for stat_var in range(0,21):
            if sort_order[stat_var]:
                stat_arrs[stat_var] = sorted(stat_arrs[stat_var],key=itemgetter(0),reverse=True)
            else:
                stat_arrs[stat_var] = sorted(stat_arrs[stat_var],key=itemgetter(0),reverse=False)
            for rank in range(0,len(stat_arrs[stat_var])):
                f_id = stat_arrs[stat_var][rank][1]
                rankings[f_id].append(rank+1)
                
        for fund in fund_group:
            fund.stat_ranks[p_num] = rankings[fund.ID]
            
    def loadStats(self,fund_group,p_num,start_date,end_date,backstop_only):
        ids = []
        for fund in fund_group:
            ids.append(fund.ID)
        if backstop_only:
            stats_index = self.stats_calc[1].calcStatisticsFromList(ids,start_date,end_date)
        else:
            stats_index = self.stats_calc[0].calcStatisticsFromList(ids,start_date,end_date)
        for fund in fund_group:
            if p_num == 0:
                fund.stats = [[],[],[]]
                fund.stat_ranks = [[],[],[]]
            fund.stats[p_num] = stats_index[fund.ID]
            
    def compareMMRandPeriodEnd(self,MMR, period_end):
        MMR_pieces = MMR.split("'")
        month = self.months.index(MMR_pieces[0])
        if month == 0:
            month = 12
        year = int(MMR_pieces[1]) + 2000
        MMR_date = datetime(year, month, 1)
        if self.equalOrAfter(MMR_date, period_end):
            return True
        else:
            return False
              
    def periodName(self,date1, date2):
        return "from " + self.dateFormat(date1) + " to " + self.dateFormat(date2)
        
    def dateFormat(self,cur_date,type="DEFAULT"):
        formatted_str = ""
        if type == "LIST":
            formatted_str = self.months[cur_date.month%12] + "'" + str(cur_date.year)[2:]
        elif type == "DEFAULT":
            year = cur_date.year - 2000
            if year < 10:
                year = "0" + str(year)
            else:
                year = str(year)
            formatted_str = self.months[cur_date.month%12] + "-" + year
        return formatted_str 
        
    def FilterFunds(self,funds, cls):
        list = []
        for fund in funds:
            if fund.Class == cls:
                list.append(fund)
        return list
        
    def PopulateOutput(self,funds,class_list):
        output = []
        for cls in class_list:
            output.append(self.FilterFunds(funds,cls))
        return output
            
    def setMiddleMonth(self,tmp_date):
        return date(tmp_date.year, tmp_date.month, 15)
    
    def trailingYearDate(self, tmp_date, years):
        year = tmp_date.year - years
        month = tmp_date.month + 1
        if tmp_date.month == 12:
            month = 1
            year = years + 1
        return date(year, month, 15)
    
    def getMonthBefore(self, tmp_date):
        year = tmp_date.year
        month = tmp_date.month - 1
        if tmp_date.month == 1:
            year = tmp_date.year - 1
            month = 12
        return date(year, month, 15)
    
    def equalOrBefore(self,question, bench):
        if question.year < bench.year or question.year == bench.year and question.month <= bench.month:
            return True
        else:
            return False 
        
    def equalOrAfter(self,question, bench):
        if question.year > bench.year or question.year == bench.year and question.month >= bench.month:
            return True
        else:
            return False
    
    def prevMonthYear(self,offset,cur_date=datetime.now()):
        year = 0
        if cur_date.month==12:
            year = cur_date.year + 1
        else:
            year = cur_date.year
        return year - offset
    
    def prevMonth(self,cur_date=datetime.now()):
        month = 0
        if cur_date.month==1:
            month=11
        else:
            month = cur_date.month - 2
        return month
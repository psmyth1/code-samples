from utils.BackStopDataManager import BackStopDataManager
import os
from utils.Fund import Fund
from operator import attrgetter
from datetime import datetime, date
import cPickle 

class StatsCacheUpdater:    
    def __init__(self,cache_path=("C:/Documents and Settings/" + os.getenv("username") + "/cache_root/Stats")):
        if cache_path[len(cache_path)-1] != "/" and cache_path[len(cache_path)-1] != "\\":
            cache_path += "/"        
        self.cache_path = cache_path
        t = date.today()
        self.cur_date = date(t.year,t.month,15)
        
        self.get = BackStopDataManager()
        self.months = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep","Oct", "Nov"]
        self.checkFolders()
        self.loadData()
    
    def syncCache(self,source_path):
        cmd_str = "xcopy \"" + source_path + "\" \"" + self.cache_path[0:len(self.cache_path)-1] + "\" /e /i /h"
        os.system(cmd_str)
    
    def checkFolders(self):
        cp = self.cache_path
        if not os.access(cp + "returns", os.F_OK):
            os.makedirs(cp + "returns")
        if not os.access(cp + "lists", os.F_OK):
            os.makedirs(cp + "lists")
        if not os.access(cp + "pg_lists", os.F_OK):
            os.makedirs(cp + "pg_lists")
    
    def loadData(self):
        self.returns_index = {}
        self.fund_return_dates = {}
        if os.access(self.cache_path + "returns/returns.cache",os.F_OK):
            ret_cache_file = open(self.cache_path + "returns/returns.cache")
            self.returns_index = cPickle.load(ret_cache_file)
            ret_cache_file.close()
            self.loadFundReturnDates()

    def loadFundReturnDates(self):
        for year in self.returns_index.keys():
            for month in self.returns_index[year].keys():
                for id in self.returns_index[year][month].keys():
                    if id not in self.fund_return_dates.keys():
                        self.fund_return_dates[id] = []
                    if "RMF" in self.returns_index[year][month][id].keys():
                        if date(year,month,1) not in self.fund_return_dates[id]:
                            self.fund_return_dates[id].append(date(year,month,1))
        
    def updateReturns(self,as_of_date=date.today()):
        if self.equalOrAfter(as_of_date,date.today()):
            as_of_date = date.today()
                
        if not os.access(self.cache_path + "lists/active_funds.cache",os.F_OK):
            self.updateLists()
            
        tmp_file = open(self.cache_path + "lists/active_funds.cache")
        active_funds = cPickle.load(tmp_file)
        tmp_file.close()
        
        benchmarks = [496539,496605]
        
        returns = {}
        
        for b_id in benchmarks:
            tmp_returns = self.get.getHedgeFundReturns(b_id, as_of_date, as_of_date)
            if tmp_returns != False:
                returns[b_id] = {}
                for month in tmp_returns:
                    if str(month[5][1]) != "not_existent":
                        returns[b_id]["RMF"] = month[0][1] + 1     
                        returns[b_id]["RF"] = month[0][1]
          
        for fund_var in range(0,len(active_funds)):
            if fund_var % 25 == 0:
                print 100.0 * float(fund_var)/float(len(active_funds)), "%"
            fund = active_funds[fund_var]
            tmp_returns = self.get.getHedgeFundReturns(fund.ID, as_of_date, as_of_date)
            if tmp_returns != False: 
                returns[fund.ID] = {}
                for month in tmp_returns:
                    if str(month[5][1]) != "not_existent":
                        returns[fund.ID]["RMF"] = month[0][1] + 1     
                        returns[fund.ID]["RF"] = month[0][1]

        if not as_of_date.year in self.returns_index.keys():
            self.returns_index[as_of_date.year] = {}
        
        self.returns_index[as_of_date.year][as_of_date.month] = returns
        
        self.loadFundReturnDates()
        
        ret_file = open(self.cache_path + "returns/returns.cache",'w')
        cPickle.dump(self.returns_index, ret_file)
        ret_file.close()
    
    def updatePGList(self):
        ids = self.get.getPeerGroupIds()
        id_name_map = dict()
        for id in ids:
            if "{Stats}" in id[1]:
                id_name_map[id[0]] = id[1]

        file = open(self.cache_path + "pg_lists/cache-peer_group_id_name_map.cache", "w")
        cPickle.dump(id_name_map,file)
        file.close()
        
        pg_member_ids = {}
        for pg_id in id_name_map.keys():
            info = self.get.getPeerGroupMemberIds(pg_id,date.today())
            id_list = []
            for i in info:
                id_list.append(i[0])
            pg_member_ids[pg_id] = id_list

        file = open(self.cache_path + "pg_lists/cache-peer_group_member_id.cache", "w")
        cPickle.dump(pg_member_ids,file)
        file.close()
    
    def updateMCPFAIList(self):
        MCPFAI = []
        
        file_def = open("def/MCPFAI_def.dat")
        file_res = open("def/MCPFAI_res.dat")
        report_def = file_def.read()
        report_res = file_res.read()
        info = self.get.runFundsReport(report_def, report_res, date.today())
        
        for data in info:
            fund = Fund()
            fund.Name = data[0][1]
            fund.ID = data[1][1]
            fund.DMRR = datetime.strptime(data[2][1],"%m/%d/%Y")
            fund.incept_date = datetime.strptime(data[3][1],"%m/%d/%Y")
            fund.IL = "MCP Fund or Index"
            fund.Class = "MCP Fund or Index"
            fund.DMRR = self.getActualDMRR(fund.ID, fund.DMRR)                                
            MCPFAI.append(fund)
        
        tmp_file = open(self.cache_path + "lists/MCPFAI_funds.cache",'w')
        cPickle.dump(MCPFAI, tmp_file)
        tmp_file.close()
        
    def updateLists(self):
        self.updatePGList()
        self.updateMCPFAIList()
        self.updateFundList()
    
    def updateFundList(self):        
        file_def = open("def/all_funds_def.dat")
        report_def = file_def.read()
        report_res = "${true}"
        t = date.today()

        info = self.get.runFundsReport(report_def, report_res, self.cur_date)
        
        funds = []
        active_funds = []
        fund_index = {}
        
        invested_funds = []
        focus_list_funds = []
        inv_and_focus_funds = []
        ex_focus_funds = []
        ex_invested_funds = []
        ex_inv_and_focus_funds = []
        
        for data in info:
            if data[2][1] != 'None':
                fund = Fund()
                fund.Name = data[0][1] 
                fund.ID = data[1][1]
                fund.DMRR = datetime.strptime(data[2][1],"%m/%d/%Y")
                fund.DMRR = self.getActualDMRR(fund.ID, fund.DMRR)   
                fund.IL = data[4][1]
                fund.StrengthRating = data[5][1]
                fund.Class = data[6][1]
                fund.prime_strat = data[7][1]
                fund.sub_strat1 = data[8][1]
                fund.sub_strat2 = data[9][1]
                fund.city = data[10][1]
                tmp_state = self.getState(data[12][1])
                if tmp_state == "None":
                    fund.state = data[11][1]
                else:
                    fund.state = tmp_state
                fund.postal_code = data[12][1]
                fund.incept_date = datetime.strptime(data[13][1],"%m/%d/%Y")
                fund.part_of_pmg = str.lower(str(data[14][1])).strip()
                if fund.part_of_pmg == "yes":
                    fund.part_of_pmg = True
                else:
                    fund.part_of_pmg = False
                funds.append(fund)
        
        for fund in funds:
            fund.ListName = fund.Name + "                                                                                                              (MRR:" + self.dateFormat(fund.DMRR,"LIST") + ")"
            fund.ListName += "(Int:" + fund.IL + ")"
            fund.ListName += "(Str:" + fund.StrengthRating + ")"
            fund.ListName += "(Cls:" + fund.Class + ")"
            fund.ListName += "(Strat:" + fund.prime_strat + ")"
            fund.ListName += "(Sub1:" + fund.sub_strat1 + ")"
            fund.ListName += "(Sub2:" + fund.sub_strat2 + ")"
            fund.ListName += "(City:" + fund.city +")"
            fund.ListName += "(State:" + fund.state + ")"
            fund.ListName += "(Zip:" + fund.postal_code + ")"
            fund_index[fund.ID] = fund
            if self.equalOrAfter(fund.DMRR,datetime(self.cur_date.year-1,self.cur_date.month,self.cur_date.day)):
                active_funds.append(fund)
            if fund.IL == "Invested" and fund.part_of_pmg:
                inv_and_focus_funds.append(fund)
                invested_funds.append(fund)
                ex_focus_funds.append(fund)
            elif fund.IL == "Focus List" and fund.part_of_pmg:
                inv_and_focus_funds.append(fund)
                focus_list_funds.append(fund)
                ex_invested_funds.append
            else:
                ex_invested_funds.append(fund)
                ex_focus_funds.append(fund)
                ex_inv_and_focus_funds.append(fund)
        
        invested_funds = sorted(invested_funds, key=lambda Fund:Fund.Name)
        focus_list_funds = sorted(focus_list_funds, key=lambda Fund:Fund.Name)
        inv_and_focus_funds = sorted(inv_and_focus_funds, key=lambda Fund:Fund.Name)
        ex_focus_funds = sorted(ex_focus_funds, key=lambda Fund:Fund.Name)
        ex_invested_funds = sorted(ex_invested_funds, key=lambda Fund:Fund.Name)
        ex_inv_and_focus_funds = sorted(ex_inv_and_focus_funds, key=lambda Fund:Fund.Name)
        active_funds = sorted(active_funds, key=lambda Fund:Fund.Name)
        funds = sorted(funds, key=lambda Fund:Fund.Name)
        
        file = open(self.cache_path + "lists/" + "all_funds.cache", "w")
        cPickle.dump(funds,file)
        file.close()
        
        file = open(self.cache_path + "lists/" + "active_funds.cache", "w")
        cPickle.dump(active_funds,file)
        file.close()
        
        file = open(self.cache_path + "lists/invested_funds.cache", "w")
        cPickle.dump(invested_funds,file)
        file.close()
        
        file = open(self.cache_path + "lists/focus_list_funds.cache", "w")
        cPickle.dump(focus_list_funds,file)
        file.close()
        
        file = open(self.cache_path + "lists/inv_and_focus_funds.cache", "w")
        cPickle.dump(inv_and_focus_funds,file)
        file.close()
        
        file = open(self.cache_path + "lists/ex-focus.cache", "w")
        cPickle.dump(ex_focus_funds,file)
        file.close()
        
        file = open(self.cache_path + "lists/ex-invested.cache", "w")
        cPickle.dump(ex_invested_funds,file)
        file.close()
        
        file = open(self.cache_path + "lists/ex-invested_and_focus.cache", "w")
        cPickle.dump(ex_inv_and_focus_funds,file)
        file.close()
        
        file = open(self.cache_path + "lists/all_fund_index.cache", "w")
        cPickle.dump(fund_index,file)
        file.close()
    
    def getActualDMRR(self,id,dmrr):
        tmp_dmrr = dmrr
        
        if id in self.fund_return_dates.keys():
            dates = self.fund_return_dates[id]
        elif str(id) in self.fund_return_dates.keys():
            dates = self.fund_return_dates[str(id)]
        elif int(str(id)) in self.fund_return_dates.keys():
            dates = self.fund_return_dates[int(str(id))]
        elif unicode(str(id)) in self.fund_return_dates.keys():
            dates = self.fund_return_dates[unicode(str(id))]
        else:
            dates = []
        print "dates = ", dates
        if len(dates) > 0:
            dates = sorted(dates,reverse=True)
            if self.equalOrAfter(dates[0],dmrr):
                tmp_dmrr = dates[0]
        return tmp_dmrr
        
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
            formatted_str = months[cur_date.month%12] + "-" + year
        return formatted_str    

    def getState(self,zip_code):
        prefix = str(zip_code)[0:3]
        try:
            prefix = int(prefix)
        except:
            prefix = -1
        if prefix >= 995:
            state = "Alaska"
        elif prefix >= 980:
            state = "Washington"
        elif prefix >= 970:
            state = "Oregon"
        elif prefix >= 967:
            state = "Hawaii"
        elif prefix >= 962:
            state = "None"
        elif prefix >= 900:
            state = "California"
        elif prefix >= 889:
            state = "Nevada"
        elif prefix == 885:
            state = "Texas"
        elif prefix >= 870:
            state = "New Mexico"
        elif prefix >= 850:
            state = "Arizona"
        elif prefix >= 840:
            state = "Utah"
        elif prefix >= 832:
            state = "Idaho"
        elif prefix >= 820:
            state = "Wyoming"
        elif prefix >= 800:
            state = "Colorado"
        elif prefix >= 750:
            state = "Texas"
        elif prefix >= 730:
            state = "Oklahoma"
        elif prefix >= 716:
            state = "Arkansas"
        elif prefix >= 700:
            state = "Lousiana"
        elif prefix >= 680:
            state = "Nebraska"
        elif prefix >= 660:
            state = "Kansas"
        elif prefix >= 630:
            state = "Missouri"
        elif prefix >= 600:
            state = "Illinois"
        elif prefix >= 590:
            state = "Montana"
        elif prefix >= 580:
            state = "North Dakota"
        elif prefix >= 570:
            state = "South Dakota"
        elif prefix >= 569:
            state = "Washington D.C."
        elif prefix >= 550:
            state = "Minnesota"
        elif prefix >= 530:
            state = "Wisconsin"
        elif prefix >= 500:
            state = "Iowa"
        elif prefix >= 480:
            state = "Michigan"
        elif prefix >= 460:
            state = "Indiana"
        elif prefix >= 430:
            state = "Ohio"
        elif prefix >= 400:
            state = "Kentucky"
        elif prefix >= 398:
            state = "Georgia"
        elif prefix >= 386:
            state = "Mississippi"
        elif prefix >= 370:
            state = "Tennessee"
        elif prefix >= 350:
            state = "Alabama"
        elif prefix >= 320:
            state = "Florida"
        elif prefix >= 300:
            state = "Georgia"
        elif prefix >= 290:
            state = "South Carolina"
        elif prefix >= 270:
            state = "North Carolina"
        elif prefix >= 247:
            state = "West Virginia"
        elif prefix >= 220:
            state = "Virginia"
        elif prefix >= 206:
            state = "Maryland"
        elif prefix >= 202:
            state = "Fed. Government"
        elif prefix >= 201:
            state = "Virginia"
        elif prefix >= 200:
            state = "Washington D.C."
        elif prefix >= 197:
            state = "Delaware"
        elif prefix >= 150:
            state = "Pennsylvania"
        elif prefix >= 100:
            state = "New York"
        elif prefix >= 90:
            state = "None"
        elif prefix >= 70:
            state = "New Jersey"
        elif prefix >= 60:
            state = "Connecticut"
        elif prefix >= 50:
            state = "Vermont"
        elif prefix >= 39:
            state = "Maine"
        elif prefix >= 30:
            state = "New Hampshire"
        elif prefix >= 28:
            state = "Rhode Island"
        elif prefix >= 10:
            state = "Massachusetts"
        elif prefix >= 6:
            state = "Puerto Rico"
        else:
            state = "None"
        return state
from libs.modules.mis.MISCacheUpdater import MISCacheUpdater
from libs.modules.stats.StatsCacheUpdater import StatsCacheUpdater
from libs.modules.common.BackStopDataManager import BackStopDataManager
from libs.modules.common.models.FundManager import FundManager
from datetime import date,datetime
import cPickle
import calendar
import os
import shutil

class CacheUpdater:
    def __init__(self,cache_path,justStats=False):
        self.cache_path = cache_path
        if self.cache_path[len(self.cache_path)-1] != "/":
            self.cache_path += "/"
        self.mis_cache_path = self.cache_path + "MIS/"
        self.stats_cache_path = self.cache_path + "StatsNew/"
        
        self.checkFolders()
        
        if not justStats:
            tmp_dates = self.getMISArchiveDates()
            self.mis_archive_dates = tmp_dates[0]
            self.mis_invalid_archive_dates = tmp_dates[1]
        self.stats_archive_dates = self.getStatsArchiveDates()
        if not justStats:
            self.most_recent_valid_month = self.getMostRecentMISMonth()
        
    def checkFolders(self):
        if not os.access(self.mis_cache_path,os.F_OK):
            os.makedirs(self.mis_cache_path)
        if not os.access(self.mis_cache_path + "archived",os.F_OK):
            os.makedirs(self.mis_cache_path + "archived")
        if not os.access(self.mis_cache_path + "current",os.F_OK):
            os.makedirs(self.mis_cache_path + "current")
        if not os.access(self.stats_cache_path,os.F_OK):
            os.makedirs(self.stats_cache_path)
        if not os.access(self.stats_cache_path + "returns",os.F_OK):
            os.makedirs(self.stats_cache_path + "returns")
        if not os.access(self.stats_cache_path + "lists",os.F_OK):
            os.makedirs(self.stats_cache_path + "lists")
        if not os.access(self.stats_cache_path + "pg_lists",os. F_OK):
            os.makedirs(self.stats_cache_path + "pg_lists")
    
    def getMISArchiveDates(self):
        path = self.mis_cache_path + "archived/"
        dir_names = os.listdir(path)
        dates = []
        other_dates = []
        for d in dir_names:
            f = FundManager(path+d)
            if f.checkCache()[0]:
                dates.append(datetime.strptime(d,"%Y-%m-%d"))
            else:
                other_dates.append(datetime.strptime(d,"%Y-%m-%d"))
        dates = sorted(dates,reverse=True)
        other_dates = sorted(other_dates,reverse=True)
            
        return [dates,other_dates]
    
    def getStatsArchiveDates(self):
        path = self.stats_cache_path + "returns/returns.cache"
        dates = []
        if os.access(path,os.F_OK):
            tmp_file = open(path)
            returns_index = cPickle.load(tmp_file)
            tmp_file.close()
        
            for year in sorted(returns_index.keys()):
                for month in sorted(returns_index[year].keys()):
                    tmp = date(year,month,1)
                    d = self.getEndOfMonth(tmp.month, tmp.year)
                    dates.append(date(tmp.year,tmp.month,d))
            
            dates = sorted(dates,reverse=True)
        return dates
                
    def createArchivedMISCache(self,as_of_date):
        path = self.mis_cache_path + "archived/" + as_of_date.strftime("%Y-%m-%d") + "/"
        if not os.access(path,os.F_OK):
            os.makedirs(path)
        m_updater = MISCacheUpdater(path)
        m_updater.update(as_of_date)
    
    def refreshStatsCache(self,start_date,end_date):
        cur_path = self.stats_cache_path
        s_tmp = StatsCacheUpdater(cur_path)
        
        for y in range(start_date.year,end_date.year+1):
            if y == start_date.year and y == end_date.year:
                for m in range(start_date.month,end_date.month+1):
                    as_of_date = date(y,m,15)
                    s_tmp.updateReturns(as_of_date)
            elif y == start_date.year:
                for m in range(start_date.month,13):
                    as_of_date = date(y,m,15)
                    s_tmp.updateReturns(as_of_date)
            elif y == end_date.year:
                for m in range(1,end_date.month+1):
                    as_of_date = date(y,m,15)
                    s_tmp.updateReturns(as_of_date)
            else:
                for m in range(1,13):
                    as_of_date = date(y,m,15)
                    s_tmp.updateReturns(as_of_date)
    
    def repairArchivedMISCache(self,as_of_date):
        path = self.mis_cache_path + "archived/" + as_of_date.strftime("%Y-%m-%d") + "/"
        f = FundManager(path)
        while True:
            error = f.checkCache()
            if not error[0]:
                m_updater = MISCacheUpdater(path)
                for e in error[1]:
                    print e[0], "--- missing", e[1]
                    if e[1] == "product_rep":
                        m_updater.loadProductData(as_of_date)
                    elif e[1] == "fund_rep":
                        m_updater.loadFundData(as_of_date)  
                    elif e[1] == "meeting":
                        m_updater.loadMeetingsData(as_of_date,e[0])
                    elif e[1] == "exposure":
                        m_updater.loadExposureData(as_of_date,e[0])
                    elif e[1] == "aum":
                        m_updater.loadAumData(as_of_date,e[0])
                    elif e[1] == "return":
                        m_updater.loadReturnsData(as_of_date,e[0])
                    elif e[1] == "stats":
                        m_updater.loadStatisticsData(as_of_date,e[0])
                    elif e[1] == "transactions":
                        m_updater.loadInternalTransactionData(as_of_date,e[0])
                    elif e[1] == "holding":
                        m_updater.loadHoldingsData(as_of_date,e[0])
                    elif e[1] == "trans_rep":
                        m_updater.loadTransactionData(as_of_date)
                    elif e[1] == "people_org_rep":
                        m_updater.loadContactsData(as_of_date)
            else:
                break
     
    def checkMISArchives(self,start_date,end_date,total_update=False):
        if end_date > self.most_recent_valid_month:
            end_date = self.most_recent_valid_month
        for y in range(start_date.year,end_date.year+1):
            if y == start_date.year and y == end_date.year:
                for m in range(start_date.month,end_date.month+1):
                    end_day = self.getEndOfMonth(m, y)
                    tmp_date = datetime(y,m,end_day)
                    if not total_update:
                        if tmp_date in self.mis_invalid_archive_dates:
                            print "Repairing ", tmp_date.strftime("%m/%d/%Y")
                            self.repairArchivedMISCache(tmp_date)
                        elif tmp_date not in self.mis_archive_dates:
                            print "Creating ", tmp_date.strftime("%m/%d/%Y")
                            self.createArchivedMISCache(tmp_date)
                    else:
                        self.createArchivedMISCache(tmp_date)
            elif y == start_date.year:
                for m in range(start_date.month,13):
                    end_day = self.getEndOfMonth(m, y)
                    tmp_date = datetime(y,m,end_day)
                    if not total_update:
                        if tmp_date in self.mis_invalid_archive_dates:
                            print "Repairing ", tmp_date.strftime("%m/%d/%Y")
                            self.repairArchivedMISCache(tmp_date)
                        elif tmp_date not in self.mis_archive_dates:
                            print "Creating ", tmp_date.strftime("%m/%d/%Y")
                            self.createArchivedMISCache(tmp_date)
                    else:
                        self.createArchivedMISCache(tmp_date)
            elif y == end_date.year:
                for m in range(1,end_date.month+1):
                    end_day = self.getEndOfMonth(m, y)
                    tmp_date = datetime(y,m,end_day)
                    if not total_update:
                        if tmp_date in self.mis_invalid_archive_dates:
                            print "Repairing ", tmp_date.strftime("%m/%d/%Y")
                            self.repairArchivedMISCache(tmp_date)
                        elif tmp_date not in self.mis_archive_dates:
                            print "Creating ", tmp_date.strftime("%m/%d/%Y")
                            self.createArchivedMISCache(tmp_date)
                    else:
                        self.createArchivedMISCache(tmp_date)
            else:
                for m in range(1,13):
                    end_day = self.getEndOfMonth(m, y)
                    tmp_date = datetime(y,m,end_day)
                    if not total_update:
                        if tmp_date in self.mis_invalid_archive_dates:
                            print "Repairing ", tmp_date.strftime("%m/%d/%Y")
                            self.repairArchivedMISCache(tmp_date)
                        elif tmp_date not in self.mis_archive_dates:
                            print "Creating ", tmp_date.strftime("%m/%d/%Y")
                            self.createArchivedMISCache(tmp_date)
                    else:
                        self.createArchivedMISCache(tmp_date)
            
    def checkLastMonthMISArchive(self):
        t = date.today()
        if t.month == 1:
            self.checkMISArchives(date(t.year-1,12,1),date(t.year-1,12,1))
        else:
            self.checkMISArchives(date(t.year,t.month-1,1),date(t.year,t.month-1,1))
                                    
    def updateStatsCache(self):
        cur_path = self.stats_cache_path
        s_tmp = StatsCacheUpdater(cur_path)
        t = date.today()
        start_date = date(t.year,t.month,15) 
        tmp_date = self.getMonthBefore(self.getMonthBefore(t))
        end_date = date(tmp_date.year,tmp_date.month,15)

        self.refreshStatsCache(end_date,start_date)
    
    def updateMISCache(self):
        as_of_date = self.most_recent_valid_month
               
        tmp_path = self.mis_cache_path + "tmp"
        cur_path = self.mis_cache_path + "current"
        arch_path = self.mis_cache_path + "archived/" + as_of_date.strftime("%Y-%m-%d")
        
        if os.access(tmp_path,os.F_OK):
            shutil.rmtree(tmp_path)
        os.makedirs(tmp_path)
           
        tmp = MISCacheUpdater(tmp_path)
        tmp.update(as_of_date)
        
        if os.access(cur_path,os.F_OK):
            shutil.rmtree(cur_path)
        os.makedirs(cur_path) 
        
        if os.access(arch_path,os.F_OK):
            shutil.rmtree(arch_path)
        os.makedirs(arch_path)   
                
        cur = MISCacheUpdater(cur_path)
        cur.syncCache(tmp_path)
        
        cur = MISCacheUpdater(arch_path)
        cur.syncCache(tmp_path)
                        
        if os.access(tmp_path,os.F_OK):
            shutil.rmtree(tmp_path)
    
    def updateStatsPGList(self):
        cur_path = self.stats_cache_path
        tmp = StatsCacheUpdater(cur_path)
        tmp.updatePGList()
    
    def updateStatsFundList(self):
        cur_path = self.stats_cache_path
        tmp = StatsCacheUpdater(cur_path)
        tmp.updateFundList()
        
    def updateStatsLists(self):
        cur_path = self.stats_cache_path
        tmp = StatsCacheUpdater(cur_path)
        tmp.updateLists()
    
    def clearMISCacheComponent(self,component):
        c = component
        if c == "Fund":
            pass
        elif c == "Product":
            pass
        elif c == "Contact":
            pass
        elif c == "Transaction":
            pass
        elif c == "Internal Transaction":
            pass
        elif c == "Meeting":
            pass
        elif c == "Exposure":
            pass
        elif c == "Holding":
            pass
        elif c == "AUM":
            pass
        elif c == "Return":
            pass
        elif c == "Statistics":
            for root, dirs, files in os.walk(self.mis_cache_path):
                for x in files:
                    if x == "stats_data.cache":
                        os.chdir(root)
                        os.remove(x)
    
    def clearMISArchives(self):
        shutil.rmtree(self.mis_cache_path + "archived")            
        os.makedirs(self.mis_cache_path + "archived")
        
    def getMostRecentMISMonth(self):
        path = self.mis_cache_path + "most_recent_date.dat"
        update_from_server = True
        if date.today().day < 15 or date.today().day > 25:
            if os.access(path,os.F_OK):
                update_from_server = False
        elif os.access(path,os.F_OK):
            tmp_file = open(path)
            tmp_str = tmp_file.read()
            tmp_str = tmp_str.split("\n")

            tmp_date = datetime.strptime(tmp_str[0],"%m/%d/%Y")
            tmp_date2 = datetime.strptime(tmp_str[1],"%m/%d/%Y-%H-%M-%S")
            
            if (datetime.today()-tmp_date2).days < 1:
                update_from_server = False
            if tmp_date.month == self.getMonthBefore(date.today()).month:
                update_from_server = False
            tmp_file.close()
        
        if update_from_server:
            bsdm = BackStopDataManager()
            f_def = open("def/date_def.dat")
            f_res = open("def/date_res.dat")
            date_data = bsdm.runHoldingsReport(f_def.read(),f_res.read(),date.today())
            dates = []
            for d in date_data:
                date_str = d[1][1]
                dates.append(datetime.strptime(date_str,"%m/%d/%Y"))
            dates = sorted(dates,reverse=True)
            if dates[0].day < 10:
                tmp_date = self.getMonthBefore(dates[0])
                tmp_date2 = date(tmp_date.year,tmp_date.month,self.getEndOfMonth(tmp_date.month, tmp_date.year))
                final_date = tmp_date2
            else:
                final_date = dates[0]
            tmp_file = open(path,'w')
            tmp_file.write(final_date.strftime("%m/%d/%Y") + "\n" + datetime.today().strftime("%m/%d/%Y-%H-%M-%S"))
            tmp_file.close()
        else:
            tmp_file = open(path)
            final_date = datetime.strptime(tmp_file.read().split("\n")[0],"%m/%d/%Y") 
            tmp_file.close()
            
        return date(final_date.year,final_date.month,final_date.day)
        
    def isEndOfMonth(self,tmp_date):
        is_end = False
        if tmp_date.day == self.getEndOfMonth(tmp_date.month,tmp_date.year):
            is_end = True
        return is_end
    
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

    def getMonthBefore(self,date):
        year = date.year
        month = date.month - 1
        if date.month == 1:
            year = date.year - 1
            month = 12
        return datetime(year, month, 15)  
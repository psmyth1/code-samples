from utils.BackStopDataManager import BackStopDataManager
from libs.models import Fund
from libs.models import Product
from libs.models import Firm
from StatisticsCalculations import StatisticsCalculations
import os
import shutil
import cPickle
import time
from datetime import date,datetime

class MISCacheUpdater:
    def __init__(self,cache_path,pg=None):
        self.bsdm = BackStopDataManager()
        self.cache_path = cache_path
        self.pg = pg
        
        if self.cache_path[len(self.cache_path)-1] != "/":
            self.cache_path += "/"
             
        self.checkFolders()
        self.loaded = [False,False,False,False,False,False,False,False,False,False,False]
        
        self.funds = {}
        self.firms = {}
        self.products = {}
    
    def checkFolders(self):
        cp = self.cache_path
        if not os.access(cp + "reports", os.F_OK):
            os.makedirs(cp + "reports")
        if not os.access(cp + "firms", os.F_OK):
            os.makedirs(cp + "firms")
        if not os.access(cp + "funds", os.F_OK):
            os.makedirs(cp + "funds")
        if not os.access(cp + "products", os.F_OK):
            os.makedirs(cp + "products")
        
    def clearCache(self):
        cp = self.cache_path
        if os.access(cp, os.F_OK):
            shutil.rmtree(cp)
        self.checkFolders()
    
    def syncCache(self,source_path):
        s_time = time.clock()
        self.clearCache()
        cmd_str = "xcopy \"" + source_path + "\" \"" + self.cache_path[0:len(self.cache_path)-1] + "\" /e /i /h /R /Y"
        os.system(cmd_str)
        print "Copy took",(time.clock() - s_time),"secs"
        
    def update(self,as_of_date=date.today()):
        self.clearCache()
        
        self.loadFundData(as_of_date)
        self.loadProductData(as_of_date)
        self.loadContactsData(as_of_date)
        self.loadTransactionData(as_of_date)
        self.loadInternalTransactionData(as_of_date)
        self.loadMeetingsData(as_of_date)
        self.loadExposureData(as_of_date)
        self.loadHoldingsData(as_of_date)
        self.loadAumData(as_of_date)
        self.loadReturnsData(as_of_date)
        self.loadStatisticsData(as_of_date)
        
    def loadFundData(self,as_of_date,load_from_cache=False):
        if self.pg != None:
            self.pg.startSubProcess(self.pg.cur_sub_proc_total,2.0)
        
        cp = self.cache_path
        if not load_from_cache:
            f_def = open("def/fund_def.dat")
            f_res = open("def/fund_res.dat")
            
            if self.pg != None:
                self.pg.addMessage("Downloading Fund Data")
                self.pg.incSub("running funds report.....")
            
            fund_data = self.bsdm.runFundsReport(f_def.read(),f_res.read(),as_of_date)
            
            if self.pg != None:
                self.pg.incSub("finished funds report.....")
            
            rep_file = open(cp + "reports/fund_rep.cache",'w')
            cPickle.dump(fund_data,rep_file)
            rep_file.close()
        else:
            rep_file = open(cp + "reports/fund_rep.cache")
            fund_data = cPickle.load(rep_file)
            rep_file.close()
        
        for f in fund_data:
            tmp_fund = Fund()
            tmp_fund.backstop_id = int(f[0][1])
            tmp_fund.name = f[1][1]
            tmp_fund.first_investment_date = datetime.strptime(f[6][1],"%m/%d/%Y")
            tmp_fund.incept_date = datetime.strptime(f[3][1],"%m/%d/%Y")
            if int(f[30][1]) not in self.firms.keys():
                tmp_fund.firm = Firm()
                tmp_fund.firm.name = f[31][1]
                tmp_fund.firm.backstop_id = int(f[30][1])
                self.firms[int(f[30][1])] = tmp_fund.firm
            self.funds[tmp_fund.backstop_id] = tmp_fund

        self.loaded[0] = True
    
    def loadProductData(self,as_of_date,load_from_cache=False):
        if self.pg != None:
            self.pg.startSubProcess(self.pg.cur_sub_proc_total*.4,2.0)
        
        cp = self.cache_path
        if not load_from_cache:
            f_def = open("def/product_def.dat")
            f_res = open("def/product_res.dat")
            
            if self.pg != None:
                self.pg.addMessage("Downloading Product Data")
                self.pg.incSub("running products report.....")
                
            product_rep = self.bsdm.runProductsReport(f_def.read(),f_res.read(),as_of_date)
            product_bal = {}
            
            if self.pg != None:
                self.pg.incSub("finished products report.....")
                self.pg.startSubProcess(self.pg.cur_sub_proc_total*.6,len(product_rep))
            
            for p in product_rep:
                if self.pg != None:
                    self.pg.incSub("getting " + p[1][1] + " data")
                bal = self.bsdm.getProductBalances(int(p[0][1]),date.today(),date.today())
                product_bal[int(p[0][1])] = float(bal[0][1])
            
            product_data = [product_rep,product_bal]
            
            shutil.rmtree(cp + "products/")
            os.mkdir(cp + "products/")
        
            rep_file = open(cp + "reports/product_rep.cache",'w')
            cPickle.dump(product_data,rep_file)
            rep_file.close() 
        else:
            rep_file = open(cp + "reports/product_rep.cache")
            product_data = cPickle.load(rep_file)
            product_bal = product_data[1]
            product_rep = product_data[0]            
            rep_file.close()
        
        for p in product_rep:
            if int(p[0][1]) not in self.products.keys():
                tmp_product = Product()
                tmp_product.backstop_id = int(p[0][1])
                tmp_product.name = p[1][1]
                tmp_product.balance = product_bal[tmp_product.backstop_id]
                if tmp_product.balance > 0:
                    self.products[int(p[0][1])] = tmp_product
        self.loaded[1] = True

    def loadContactsData(self,as_of_date):
        if not self.loaded[0]:
            self.loadFundData(as_of_date,True)
        if not self.loaded[1]:
            self.loadProductData(as_of_date,True)
            
        if self.pg != None:
            self.pg.startSubProcess(self.pg.cur_sub_proc_total,2.0)
            self.pg.addMessage("Downloading Contacts Data.....")
            self.pg.incSub("running people/orgs report.....")
            
        cp = self.cache_path
        f_def = open("def/people_orgs_def.dat")
        f_res = open("def/people_orgs_res.dat")
        contact_data = self.bsdm.runPeopleOrgsReport(f_def.read(),f_res.read(),as_of_date)
        
        if self.pg != None:            
            self.pg.incSub("finished people/orgs report.....")
            
        rep_file = open(cp + "reports/people_org_rep.cache",'w')
        cPickle.dump(contact_data,rep_file)
        rep_file.close() 
        self.loaded[2] = True
    
    def loadTransactionData(self,as_of_date):
        if not self.loaded[0]:
            self.loadFundData(as_of_date,True)
        if not self.loaded[1]:
            self.loadProductData(as_of_date,True)
        
        if self.pg != None:
            self.pg.startSubProcess(self.pg.cur_sub_proc_total,2.0)
            self.pg.addMessage("Downloading Transaction Data.....")
            self.pg.incSub("running transaction report.....")
            
        cp = self.cache_path
        f_def = open("def/port_trans_def.dat")
        f_res = open("def/port_trans_res.dat")
        trans_data = self.bsdm.runPortfolioTransactionsReport(f_def.read(),f_res.read(),as_of_date)
        
        if self.pg != None:            
            self.pg.incSub("finished transaction report.....")
    
        rep_file = open(cp + "reports/trans_rep.cache",'w')
        cPickle.dump(trans_data,rep_file)
        rep_file.close()
        self.loaded[3] = True
        
    def loadInternalTransactionData(self,as_of_date,product_name="None"):
        if not self.loaded[0]:
            self.loadFundData(as_of_date,True)
        if not self.loaded[1]:
            self.loadProductData(as_of_date,True)
        
        if self.pg != None:
            self.pg.startSubProcess(self.pg.cur_sub_proc_total,len(self.products.keys()))
            
        cp = self.cache_path
        for p in self.products.keys():
            if self.pg != None:            
                self.pg.incSub("getting holdings for " + self.products[p].name)
            if product_name == self.products[p].name or product_name == "None":
                prod_path = cp + "products/" + self.products[p].name
                if not os.access(prod_path +"/",os.F_OK):
                    os.mkdir(prod_path)
                trans_data = {}
                holding_ids = self.bsdm.getHoldingsInProduct(p)
                for h_id in holding_ids:
                    tmp = self.bsdm.getHoldingTransactions(h_id,date(1994,1,1),as_of_date)
                    info = self.bsdm.getHoldingInformation(h_id)
                    trans_data[h_id] = [tmp,info]
            
                rep_file = open(prod_path + "/transactions.cache",'w')
                cPickle.dump(trans_data,rep_file)
                rep_file.close()
        self.loaded[4] = True
                        
    def loadMeetingsData(self,as_of_date,firm_name="None"):
        if not self.loaded[0]:
            self.loadFundData(as_of_date,True)
        if not self.loaded[1]:
            self.loadProductData(as_of_date,True)
        
        if self.pg != None:
            self.pg.startSubProcess(self.pg.cur_sub_proc_total,len(self.firms.keys()))
            self.pg.addMessage("Downloading Meetings Data.....")
            
        cp = self.cache_path
        for f in self.firms.keys():
            if self.pg != None:            
                self.pg.incSub("getting meeting info for " + self.firms[f].name)
            if firm_name == self.firms[f].name or firm_name == "None":
                firm_path = cp + "firms/" + self.firms[f].name
                if not os.access(firm_path +"/",os.F_OK):
                    os.mkdir(firm_path)
                meeting_data = self.bsdm.getMeetingInfoByBackstopIdandType(f, "Organization")
                    
                rep_file = open(firm_path + "/meeting.cache",'w')
                cPickle.dump(meeting_data,rep_file)
                rep_file.close()
        self.loaded[5] = True
                                
    def loadExposureData(self,as_of_date,fund_name="None"):
        if not self.loaded[0]:
            self.loadFundData(as_of_date,True)
        if not self.loaded[1]:
            self.loadProductData(as_of_date,True)
        
        if self.pg != None:
            self.pg.startSubProcess(self.pg.cur_sub_proc_total,len(self.funds.keys()))
            self.pg.addMessage("Downloading Exposure Data.....")
            
        cp = self.cache_path
        for f in self.funds.keys():
            if self.pg != None:            
                self.pg.incSub("getting exposure data for " + self.funds[f].name)
            if fund_name == self.funds[f].name or fund_name == "None":
                fund_path = cp + "funds/" + self.funds[f].name
                if not os.access(fund_path +"/",os.F_OK):
                    os.mkdir(fund_path)
                
                exp_data = self.bsdm.getExposureData(self.funds[f].backstop_id, self.funds[f].first_investment_date, as_of_date)
                        
                final_exp_data = []
                for cat in exp_data:
                    if cat[0] == "PORTFOLIO EXPOSURE" and cat[1] == "Portfolio Exposure":
                        final_exp_data.append(cat[2])
                    
                rep_file = open(fund_path + "/exposure_data.cache",'w')
                cPickle.dump(final_exp_data,rep_file)
                rep_file.close()
        self.loaded[6] = True

    def loadHoldingsData(self,as_of_date,product_name="None"):
        if not self.loaded[0]:
            self.loadFundData(as_of_date,True)
        if not self.loaded[1]:
            self.loadProductData(as_of_date,True)
        
        if self.pg != None:
            self.pg.startSubProcess(self.pg.cur_sub_proc_total,len(self.products.keys()))
            self.pg.addMessage("Downloading Holdings Data.....")
            
        cp = self.cache_path
        for p in self.products.keys():
            if self.pg != None:            
                self.pg.incSub("getting holdings data for " + self.products[p].name)
            if product_name == self.products[p].name or product_name == "None":
                fund_path = cp + "products/" + self.products[p].name
                if not os.access(fund_path +"/",os.F_OK):
                    os.mkdir(fund_path)
                holding_data = {}
                
                holding_ids = self.bsdm.getHoldingIds(self.products[p].backstop_id)
                for h_id in holding_ids:
                    info = self.bsdm.getHoldingInformation(h_id)
                    bal = self.bsdm.getHoldingBalances(h_id,as_of_date,as_of_date)
                    holding_data[h_id] = [info,bal]
                
                rep_file = open(fund_path + "/holding_data.cache",'w')
                cPickle.dump(holding_data,rep_file)
                rep_file.close()
        self.loaded[7] = True
            
    def loadAumData(self,as_of_date,fund_name="None"):
        if not self.loaded[0]:
            self.loadFundData(as_of_date,True)
        if not self.loaded[1]:
            self.loadProductData(as_of_date,True)
            
        if self.pg != None:
            self.pg.startSubProcess(self.pg.cur_sub_proc_total,len(self.funds.keys()))
            self.pg.addMessage("Downloading AUM Data.....")
            
        cp = self.cache_path
        for f in self.funds.keys():
            if self.pg != None:            
                self.pg.incSub("getting aum data for " + self.funds[f].name)
            if fund_name == self.funds[f].name or fund_name == "None":
                fund_path = cp + "funds/" + self.funds[f].name
                if not os.access(fund_path +"/",os.F_OK):
                    os.mkdir(fund_path)
                aum_data = self.bsdm.getHedgeFundAums(self.funds[f].backstop_id, date(1990,1,1), as_of_date)
                    
                rep_file = open(fund_path + "/aum_data.cache",'w')
                cPickle.dump(aum_data,rep_file)
                rep_file.close()
        self.loaded[8] = True
        
    def loadReturnsData(self,as_of_date,fund_name="None"):
        if not self.loaded[0]:
            self.loadFundData(as_of_date,True)
        if not self.loaded[1]:
            self.loadProductData(as_of_date,True)
        
        if self.pg != None:
            self.pg.startSubProcess(self.pg.cur_sub_proc_total,len(self.funds.keys()))
            self.pg.addMessage("Downloading Returns Data.....")
            
        cp = self.cache_path
        for f in self.funds.keys():
            if self.pg != None:            
                self.pg.incSub("getting returns data for " + self.funds[f].name)
            if fund_name == self.funds[f].name or fund_name == "None":
                fund_path = cp + "funds/" + self.funds[f].name
                if not os.access(fund_path +"/",os.F_OK):
                    os.mkdir(fund_path)            
                return_data = self.bsdm.getHedgeFundReturns(self.funds[f].backstop_id, self.funds[f].incept_date, as_of_date)
                        
                rep_file = open(fund_path + "/return_data.cache",'w')
                cPickle.dump(return_data,rep_file)
                rep_file.close()
        self.loaded[9] = True
    
    def loadStatisticsData(self,as_of_date,fund_name="None"):
        if not self.loaded[0]:
            self.loadFundData(as_of_date,True)
        if not self.loaded[1]:
            self.loadProductData(as_of_date,True)
        
        if self.pg != None:
            self.pg.startSubProcess(self.pg.cur_sub_proc_total,len(self.funds.keys()))
            self.pg.addMessage("Downloading statistics Data.....")
           
        cp = self.cache_path
        for f in self.funds.keys():
            if self.pg != None:            
                self.pg.incSub("getting statistics data for " + self.funds[f].name)
            if fund_name == self.funds[f].name or fund_name == "None":
                fund = self.funds[f]
                fund_path = cp + "funds/" + self.funds[f].name
                if not os.access(fund_path +"/",os.F_OK):
                    os.mkdir(fund_path)
                stats = StatisticsCalculations(self.bsdm,f,fund.first_investment_date,as_of_date)
                stats_data = {}
                
                try:
                    stats_data["Compound Return"] = [stats.CompoundReturn()]
                except:
                    stats_data["Compound Return"] = ["N/A"]
                    pass
                try:
                    stats_data["Annualized Geometric Return"] = [stats.AnnualizedGeometricReturn()]
                except:
                    stats_data["Annualized Geometric Return"] = ["N/A"]
                    pass
                try:
                    stats_data["Annualized Arithmetic Standard Deviation"] = [stats.AnnualizedArithmeticStandardDeviation()]
                except:
                    stats_data["Annualized Arithmetic Standard Deviation"] = ["N/A"]
                    pass
                try:
                    stats_data["Beta"] = [stats.Beta()]
                except:
                    stats_data["Beta"] = ["N/A"]
                    pass
                try:
                    stats_data["Alpha"] = [stats.AnnualizedAlpha()]
                except:
                    stats_data["Alpha"] = ["N/A"]
                    pass
                try:
                    stats_data["Correlation Coefficient"] = [stats.CorrelationCoefficient()]
                except:
                    stats_data["Correlation Coefficient"] = ["N/A"]
                    pass
                try:
                    stats_data["RSquared"] = [stats.RSquared()]
                except:
                    stats_data["RSquared"] = ["N/A"]
                    pass
                try:
                    stats_data["Max Drawdown"] = [stats.MaxDrawDown()]
                except:
                    stats_data["Max Drawdown"] = ["N/A"]
                    pass
                try:
                    stats_data["Sharpe Ratio"] = [stats.SharpeRatio()]
                except:
                    stats_data["Sharpe Ratio"] = ["N/A"]
                    pass
                try:
                    stats_data["Annualized Up-Capture"] = [stats.AnnualizedUpCapture()]
                except:
                    stats_data["Annualized Up-Capture"] = ["N/A"]
                    pass
                try:
                    stats_data["Annualized Down-Capture"] = [stats.AnnualizedDownCapture()]
                except:
                    stats_data["Annualized Down-Capture"] = ["N/A"]
                    pass
                rep_file = open(fund_path + "/stats_data.cache",'w')
                cPickle.dump(stats_data,rep_file)
                rep_file.close()
        self.loaded[10] = True
from libs.models import Fund
from libs.models import Firm
from libs.models import Holding
from libs.models import Contact
from libs.models import Transaction
from libs.models import Product
from libs.models import Meeting
import cPickle
import os
from datetime import datetime
from operator import itemgetter

class FundManager:
    def __init__(self,cache_path=("C:/Documents and Settings/" + os.getenv("username") + "/cache_root/MIS/current")):
        self.funds = {}
        self.firms = {}
        self.products = {}
        self.contacts = {}
        self.loaded = [False,False,False,False,False,False,False,False,False,False,False]
        
        if cache_path[len(cache_path)-1] != "/" or cache_path[len(cache_path)-1] != "\\":
            cache_path += "/"        
        self.cache_path = cache_path
    
    def loadAll(self):
        if self.checkCache()[0]:
            self.loadFundData()
            self.loadProductData()
            self.loadContactsData()
            self.loadTransactionData()
            self.loadInternalTransactionData()
            self.loadMeetingsData()
            self.loadExposureData()
            self.loadHoldingsData()
            self.loadAumData()
            self.loadReturnsData()
            self.loadStatisticsData()
    
    def reset(self):
        self.funds = {}
        self.firms = {}
        self.products = {}
        self.contacts = {}
        self.loaded = [False,False,False,False,False,False,False,False,False,False,False]
        
    def loadFundData(self):
        cp = self.cache_path
        
        rep_file = open(cp + "reports/fund_rep.cache")
        fund_data = cPickle.load(rep_file)
        rep_file.close()
        
        for f in fund_data:
            tmp_fund = Fund()
            tmp_fund.backstop_id = int(f[0][1])
            tmp_fund.name = f[1][1]
            tmp_fund.type = f[2][1]
            tmp_fund.incept_date = datetime.strptime(f[3][1],"%m/%d/%Y")
            tmp_fund.fund_class = f[4][1]
            tmp_fund.interest_level = f[5][1]
            tmp_fund.first_investment_date = datetime.strptime(f[6][1],"%m/%d/%Y")
            tmp_fund.management_fee = f[7][1]
            tmp_fund.incentive_fee = f[8][1]
            tmp_fund.redemptions = f[9][1]
            tmp_fund.redemption_notice = f[10][1]
            tmp_fund.hard_lockup = f[11][1]
            tmp_fund.soft_lockup = f[12][1]
            tmp_fund.gate_percentage = f[13][1]
            tmp_fund.side_pocket_percentage = f[14][1]
            tmp_fund.phone = f[15][1]
            tmp_fund.address = f[16][1]
            tmp_fund.city = f[17][1]
            tmp_fund.state = f[18][1]
            tmp_fund.postal_code = f[19][1]
            tmp_fund.website = f[20][1]
            tmp_fund.status = f[21][1]
            tmp_fund.erisa_cap = f[28][1]
            tmp_fund.k1_history = f[29][1]
            tmp_fund.balance_all_products = f[33][1]
            tmp_fund.most_recent_return_date = datetime.strptime(f[34][1],"%m/%d/%Y")
            
            if int(f[30][1]) not in self.firms.keys():
                tmp_fund.firm = Firm()
                tmp_fund.firm.back_invest_info = f[22][1]
                tmp_fund.firm.cpa_firm_ref_check = f[23][1]
                tmp_fund.firm.prime_broker_ref_checks = f[24][1]
                if f[25][1] == "Yes":
                    tmp_fund.firm.is_ria = True
                else:
                    tmp_fund.firm.is_ria = False
                tmp_fund.firm.ria_adv_date = f[26][1]
                tmp_fund.firm.sec_reg_date = f[27][1]
                tmp_fund.firm.backstop_id = int(f[30][1])
                tmp_fund.firm.name = f[31][1]
                tmp_fund.firm.cur_total_aum = f[32][1]
                mcp_info = [f[35][1],f[36][1],f[37][1],f[38][1],f[39][1],f[40][1],f[41][1],f[42][1]]
                tmp_fund.firm.mcp_score_info = mcp_info
                
                self.firms[int(f[30][1])] = tmp_fund.firm
            else:
                tmp_fund.firm = self.firms[int(f[30][1])]
            
            tmp_fund.firm.funds[tmp_fund.backstop_id] = tmp_fund
            self.funds[tmp_fund.backstop_id] = tmp_fund
        self.loaded[0] = True
    
    def loadProductData(self):
        cp = self.cache_path
        rep_file = open(cp + "reports/product_rep.cache")
        product_data = cPickle.load(rep_file)
        product_rep = product_data[0]
        product_bal = product_data[1]
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
        
    def loadContactsData(self):
        if not self.loaded[0]:
            self.loadFundData()
        if not self.loaded[1]:
            self.loadProductData()
            
        cp = self.cache_path   
        rep_file = open(cp + "reports/people_org_rep.cache")
        contact_data = cPickle.load(rep_file)
        rep_file.close()        
               
        for f in contact_data:
            tmp_contact = Contact()
            tmp_contact.backstop_party_id = int(f[0][1])
            tmp_contact.type = f[1][1]
            tmp_contact.category = f[2][1]
            tmp_contact.name = f[3][1]
            tmp_contact.position = f[4][1]
            tmp_contact.phone = f[5][1]
            tmp_contact.email = f[6][1]
            tmp_contact.backstop_person_id = int(f[7][1])
            if tmp_contact.backstop_party_id in self.firms.keys():
                tmp_contact.firm = self.firms[tmp_contact.backstop_party_id]
                self.firms[tmp_contact.backstop_party_id].addContact(tmp_contact)
                self.contacts[tmp_contact.backstop_person_id] = tmp_contact
        self.loaded[2] = True

    def loadTransactionData(self):
        if not self.loaded[0]:
            self.loadFundData()
        if not self.loaded[1]:
            self.loadProductData()
         
        cp = self.cache_path   
        rep_file = open(cp + "reports/trans_rep.cache")
        trans_data = cPickle.load(rep_file)
        rep_file.close() 
        
        for f in trans_data:
            tmp_transaction = Transaction()
            if int(f[0][1]) in self.funds.keys():
                tmp_transaction.fund = self.funds[int(f[0][1])]
                if int(f[2][1]) in self.products.keys():
                    tmp_transaction.product = self.products[int(f[2][1])]
                    tmp_transaction.date = datetime.strptime(f[4][1],"%m/%d/%Y")
                    tmp_transaction.setAmount(f[5][1])
                    tmp_transaction.type = f[6][1]
                    tmp_transaction.fund_id = int(f[0][1])
                    tmp_transaction.product_id = int(f[2][1])
                    self.products[tmp_transaction.product_id].addTransaction(tmp_transaction)
                    self.funds[tmp_transaction.fund_id].addTransaction(tmp_transaction)
        self.loaded[3] = True
    
    def loadInternalTransactionData(self):
        if not self.loaded[0]:
            self.loadFundData()
        if not self.loaded[1]:
            self.loadProductData()
            
        cp = self.cache_path
        for p in self.products.keys():
            prod_path = cp + "products/" + self.products[p].name
            
            rep_file = open(prod_path + "/transactions.cache")
            trans_data = cPickle.load(rep_file)
            rep_file.close() 
            
            first_invest = {}
            for h_id in trans_data.keys():
                trans = trans_data[h_id][0]
                holding_info = trans_data[h_id][1]
                trans_arr = []
                trans_arr_index = {}
                f_id = int(holding_info[5][1])
                for t in trans:
                    amount = float(t[0][1])
                    date_str = t[1][1].split(" ")[0].strip()
                    d = datetime.strptime(date_str,"%Y-%m-%d")
                    if t[3][1] == 'SUBSCRIPTION':
                        trans_arr.append([d,amount])
                        if d in trans_arr_index.keys():
                            trans_arr_index[d] += amount
                        else:
                            trans_arr_index[d] = amount
                trans_arr = sorted(trans_arr,key=itemgetter(0))
                if len(trans_arr) > 0:
                    first_invest[f_id] = [trans_arr[0][0],trans_arr_index[trans_arr[0][0]]]
            self.products[p].first_invest_trans = first_invest      
        self.loaded[4] = True  
            
    def loadMeetingsData(self):
        if not self.loaded[0]:
            self.loadFundData()
        if not self.loaded[1]:
            self.loadProductData()
        
        cp = self.cache_path
        for f in self.firms.keys():
            firm_path = cp + "firms/" + self.firms[f].name
            
            rep_file = open(firm_path + "/meeting.cache")
            meeting_data = cPickle.load(rep_file)
            rep_file.close()
            
            for m in meeting_data:
                tmp_meeting = Meeting()
                tmp_meeting.backstop_meeting_id = int(m[2][1])
                tmp_meeting.date = datetime.strptime(m[6][1].split(" ")[0],"%Y-%m-%d")
                tmp_meeting.type = m[7][1].split(":")[0].strip()
                if tmp_meeting.type.count("-") > 0:
                    tmp_meeting.type = tmp_meeting.type.split("-")[0].strip()
                if tmp_meeting.type.count("(") > 0:
                    tmp_meeting.type = tmp_meeting.type.split("(")[0].strip()
                self.firms[f].addMeeting(tmp_meeting)
        self.loaded[5] = True
                    
    def loadExposureData(self):
        if not self.loaded[0]:
            self.loadFundData()
        if not self.loaded[1]:
            self.loadProductData()
        
        cp = self.cache_path
        for f in self.funds.keys():
            fund_path = cp + "funds/" + self.funds[f].name
            
            rep_file = open(fund_path + "/exposure_data.cache")
            final_exp_data = cPickle.load(rep_file)
            rep_file.close()
                            
            for d in final_exp_data:
                for pt in d:
                    date_str = pt[3][1].split(" ")[0].strip()
                    self.funds[f].addExposureDataPoint(datetime.strptime(date_str,"%Y-%m-%d"),float(pt[0][1]),float(pt[1][1]),float(pt[2][1]))
        self.loaded[6] = True
        
    def loadHoldingsData(self):
        if not self.loaded[0]:
            self.loadFundData()
        if not self.loaded[1]:
            self.loadProductData()
            
        cp = self.cache_path

        for p in self.products.keys():
            fund_path = cp + "products/" + self.products[p].name
            
            rep_file = open(fund_path + "/holding_data.cache")
            holding_data = cPickle.load(rep_file)
            rep_file.close()
            
            for h_id in holding_data.keys():
                tmp_holding = Holding()
                info = holding_data[h_id][0]
                bal = holding_data[h_id][1]
                tmp_holding.amount = bal[0][1][1]
                date_str = bal[0][2][1].split(" ")[0].strip()
                tmp_holding.date = datetime.strptime(date_str,"%Y-%m-%d")
                tmp_holding.fund_id = int(info[5][1])
                tmp_holding.product_id = p
                tmp_holding.product = self.products[p]
                if tmp_holding.fund_id not in self.funds.keys():
                    if tmp_holding.fund_id in self.products.keys():
                        self.products[tmp_holding.fund_id].pass_through = True
                        tmp_holding.fund = self.products[tmp_holding.fund_id]
                        tmp_holding.type = "Internal"
                        tmp_holding.percent = tmp_holding.amount/(self.products[tmp_holding.product_id].balance)
                        self.products[tmp_holding.product_id].addHolding(tmp_holding)
                        self.products[tmp_holding.fund_id].addHolding(tmp_holding)
                    elif tmp_holding.fund_id == 374673:
                        tmp_holding.fund.name = "Cash"
                        tmp_holding.type = "Cash"
                        self.products[tmp_holding.product_id].addHolding(tmp_holding)
                    elif tmp_holding.amount > 0:
                        tmp_holding.type = "Garbage"
                else:
                    tmp_holding.fund = self.funds[tmp_holding.fund_id]
                    tmp_holding.type = "External"
                    self.products[tmp_holding.product_id].addHolding(tmp_holding)
                    self.funds[tmp_holding.fund_id].addHolding(tmp_holding)
        self.loaded[7] = True
        
    def processHoldings(self):
        for f_id in self.funds.keys():
            holdings = self.funds[f_id].holdings_direct
            for p_id in holdings.keys():
                percentage = 1.0
                if self.products[p_id].pass_through:
                    self.funds[f_id].holdings_spv[0] += holdings[p_id].amount
                    self.funds[f_id].spv_first_invest[p_id] = self.products[p_id].first_invest_trans
                    holdings2 = self.products[p_id].holdings_in
                    for p_id2 in holdings2.keys():
                        percentage2 = (percentage) * (holdings2[p_id2].amount / self.products[p_id].balance) 
                        self.funds[f_id].addIndirectHolding(p_id2,self.products[p_id2],(holdings[p_id].amount * percentage2),"External")
                        self.funds[f_id].firm.addHolding(p_id2,(holdings[p_id].amount*percentage2))     
                else:
                    self.funds[f_id].addIndirectHolding(p_id,self.products[p_id],(holdings[p_id].amount*percentage),"External")
                    self.funds[f_id].firm.addHolding(p_id,(holdings[p_id].amount*percentage))
        
        for f_id in self.funds.keys():
            holdings_indirect = self.funds[f_id].holdings_indirect
            holdings_direct = self.funds[f_id].holdings_direct
            indirect_sum = 0
            direct_sum = 0
            for p_id in holdings_indirect.keys():
                if not self.products[p_id].pass_through:
                    indirect_sum += holdings_indirect[p_id].amount
                    if p_id in holdings_direct.keys():
                        self.funds[f_id].holding_reallocations[p_id] = holdings_indirect[p_id].amount - holdings_direct[p_id].amount
                    else:
                        self.funds[f_id].holding_reallocations[p_id] = holdings_indirect[p_id].amount
            for p_id in holdings_direct.keys():
                direct_sum += holdings_direct[p_id].amount
                
            self.funds[f_id].holdings_spv[1] = direct_sum - indirect_sum
            self.funds[f_id].total_holdings[0] = indirect_sum
            self.funds[f_id].total_holdings[1] = (direct_sum - indirect_sum)
            self.funds[f_id].total_holdings[2] = direct_sum
            
            self.funds[f_id].firm.total_holdings[0] += indirect_sum
            self.funds[f_id].firm.total_holdings[1] += (direct_sum - indirect_sum)
        
        for firm in self.firms.values():
            firm.total_holdings[2] = (firm.total_holdings[0] + firm.total_holdings[1])

    def loadAumData(self):
        if not self.loaded[0]:
            self.loadFundData()
        if not self.loaded[1]:
            self.loadProductData()
        
        cp = self.cache_path
        for f in self.funds.keys():
            fund_path = cp + "funds/" + self.funds[f].name
            
            rep_file = open(fund_path + "/aum_data.cache")
            aum_data = cPickle.load(rep_file)
            rep_file.close()
            
            for a in aum_data:
                date_str = a[1][1].split(" ")[0].strip()
                amount = float(a[0][1])
                self.funds[f].addAumDataPoint(datetime.strptime(date_str,"%Y-%m-%d"),amount)
            
        for f in self.firms.keys():
            self.firms[f].calcFirmAums()
        self.loaded[8] = True
        
    def loadReturnsData(self):
        if not self.loaded[0]:
            self.loadFundData()
        if not self.loaded[1]:
            self.loadProductData()
        
        cp = self.cache_path
        for f in self.funds.keys():
            fund_path = cp + "funds/" + self.funds[f].name
            
            rep_file = open(fund_path + "/return_data.cache")
            return_data = cPickle.load(rep_file)
            rep_file.close()
            
            for r in return_data:
                tmp_amnt = float(r[0][1])
                date_str = r[4][1].split(" ")[0].strip()
                tmp_date = datetime.strptime(date_str,"%Y-%m-%d")
                
                self.funds[f].addReturnDataPoint(tmp_date,tmp_amnt)
        self.loaded[9] = True
        
    def loadStatisticsData(self):
        if not self.loaded[0]:
            self.loadFundData()
        if not self.loaded[1]:
            self.loadProductData()
        
        cp = self.cache_path
        for f in self.funds.keys():
            fund = self.funds[f]
            fund_path = cp + "funds/" + self.funds[f].name
            
            rep_file = open(fund_path + "/stats_data.cache")
            stats_data = cPickle.load(rep_file)
            rep_file.close()
            
            format = {"Compound Return" : True, "Annualized Geometric Return" : True, "Annualized Arithmetic Standard Deviation" : True, "Beta" : False, "Alpha" : False, "Correlation Coefficient" : False, "RSquared" : False, "Max Drawdown" : True, "Sharpe Ratio" : False, "Annualized Up-Capture" : True, "Annualized Down-Capture" : True}
            
            for s in stats_data.keys():
                if stats_data[s][0] != "N/A":
                    if format[s]:
                        stats_data[s].append(self.FormatPercentage(stats_data[s][0]))
                    else:
                        stats_data[s].append(self.FormatNonPercentage(stats_data[s][0]))
                else:
                    stats_data[s].append("N/A")\
                                
            fund.stats = stats_data
        self.loaded[10] = True
    
    def setCachePath(self,cache_path):
        if cache_path[len(cache_path)-1] != "/" or cache_path[len(cache_path)-1] != "\\":
            cache_path += "/"        
        self.cache_path = cache_path
    
    def processPassThroughFunds(self,pass_funds):
        for id in self.products.keys():
            if id in pass_funds:
                self.products[id].pass_through = True
            else:
                self.products[id].pass_through = False
        self.processHoldings()

    def processFinalFunds(self,final_funds):
        for id in self.products.keys():
            if id in final_funds:
                self.products[id].final_fund = True
            else:
                self.products[id].final_fund = False
        
    def FormatPercentage(self, number):
        number = number * 100.0
        return str("%.2f" % round(number, 2)) + "%"
    
    def FormatNonPercentage(self, number):
        return str(round(number, 4))
    
    def getAcronym(self,name):
        acro = ""
        name = name.split(" ")
        for var in range(0,len(name)-1):
            n = name[var]
            n = n.strip(" ,\n")
            if len(n) > 0:
                if n == "II" or n == "III" or n == "IV" or n == "2" or n == "3" or n == "4":
                    acro += n
                else:                    
                    acro += n[0]
        acro += " " + name[len(name)-1]
        return acro

    def formatMoney(self,amount,useCommas=False):
        if amount < 0.0:
            amnt = amount * -1
        else:
            amnt = amount
        mon_str = str("%d" % round(amnt))
        if useCommas:
            mon_str_tmp = ""
            for var in range(0,len(mon_str)):
                var_rev = len(mon_str) - (var + 1)
                mon_str_tmp = mon_str[var_rev] + mon_str_tmp
                if (var+1)%3 == 0 and var > 0 and (var+1) < len(mon_str):
                    mon_str_tmp = "," + mon_str_tmp
                
            mon_str = mon_str_tmp
        if round(amount) >= 0.0:
            mon_str = "$" + mon_str
        else:
            mon_str = "($" + mon_str + ")"
            
        return mon_str
    
    def setDisplayRanks(self,ranking):
        for r in ranking:
            if r[0] in self.products.keys():
                self.products[r[0]].disp_rank = r[1]
    
    def checkCache(self):
        cp = self.cache_path
        passed = True
        error_msg = []
        if not os.access(cp, os.F_OK):
            passed = False
        else:
            if not os.access(cp + "reports", os.F_OK):
                passed = False
            else:
                if not os.access(cp + "reports/fund_rep.cache", os.F_OK):
                    error_msg.append(["reports","fund_rep"])
                    passed = False   
                if not os.access(cp + "reports/product_rep.cache", os.F_OK):
                    error_msg.append(["reports","product_rep"])
                    passed = False  
                if not os.access(cp + "reports/trans_rep.cache", os.F_OK):
                    error_msg.append(["reports","trans_rep"])
                    passed = False
                if not os.access(cp + "reports/people_org_rep.cache", os.F_OK):
                    error_msg.append(["reports","people_org_rep"])
                    passed = False   
            if passed:
                if not self.loaded[0]:
                    self.loadFundData()
                if not self.loaded[1]:
                    self.loadProductData()
                if not os.access(cp + "firms", os.F_OK):
                    passed = False
                else:
                    for f in self.firms.values():
                        if not os.access(cp + "firms/" + f.name + "/meeting.cache", os.F_OK):
                            error_msg.append([f.name,"meeting"])
                            passed = False
                if not os.access(cp + "funds", os.F_OK):
                    passed = False
                else:
                    for f in self.funds.values():
                        if not os.access(cp + "funds/" + f.name + "/exposure_data.cache", os.F_OK):
                            error_msg.append([f.name,"exposure"])
                            passed = False
                        if not os.access(cp + "funds/" + f.name + "/aum_data.cache", os.F_OK):
                            error_msg.append([f.name,"aum"])
                            passed = False
                        if not os.access(cp + "funds/" + f.name + "/return_data.cache", os.F_OK):
                            error_msg.append([f.name,"return"])
                            passed = False
                        if not os.access(cp + "funds/" + f.name + "/stats_data.cache", os.F_OK):
                            error_msg.append([f.name,"stats"])
                            passed = False
                if not os.access(cp + "products", os.F_OK):
                    passed = False
                else:
                    for p in self.products.values():
                        if not os.access(cp + "products/" + p.name + "/transactions.cache", os.F_OK):
                            error_msg.append([p.name,"transactions"])
                            passed = False
                        if not os.access(cp + "products/" + p.name + "/holding_data.cache", os.F_OK):
                            error_msg.append([p.name,"holding"])
                            passed = False
        return [passed,error_msg]
    
    def printReport(self):
        print "%30s  |" % "",
        for p in self.products.keys():
            prod = self.products[p]
            if prod.final_fund:
                print "%9s    |" % self.getAcronym(prod.name),
        print ""
        
        for f in sorted(self.funds.values(),key=lambda fund: fund.name):
            fund = f
            print "%30s  |" % fund.name[0:30],
            for p in self.products.keys():
                prod = self.products[p]
                if prod.final_fund:
                    h = fund.holdings_indirect
                    if p in h.keys():
                        if h[p].amount > 1:
                            print "%12s |" % self.formatMoney(h[p].amount,True),
                        else:
                            print "%7s      |" % "--",
                    else:
                        print "%7s      |" % "--",
            print ""           

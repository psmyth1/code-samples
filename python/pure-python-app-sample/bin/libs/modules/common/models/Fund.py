from libs.models import Firm
from operator import itemgetter
from libs.models import Holding
from datetime import datetime

class Fund:
    def __init__(self):
        #--------------INFO-------------
        self.backstop_id = 0
        self.name = ""
        self.address = ""
        self.city = ""
        self.state = ""
        self.postal_code = ""
        self.phone = ""
        self.website = ""
        self.redemption_notice = ""
        self.redemptions = ""
        self.incentive_fee = ""
        self.management_fee = ""
        self.hard_lockup = 0
        self.soft_lockup = 0
        self.gate_percentage = 0.0
        self.side_pocket_percentage = 0.0
        self.first_investment_date = ""
        self.interest_level = ""
        self.type = ""
        self.incept_date = ""
        self.fund_class = ""
        self.status = ""
        self.erisa_cap = ""
        self.k1_history = ""
        self.balance_all_products = 0
        self.most_recent_return_date = ""
        self.firm = Firm()
        self.siblings = {}
        self.InterestLevel = ""
        self.Class = ""
        self.StrengthRating = ""
        self.Period1Statistics = []
        self.Period2Statistics = []
        self.Period3Statistics = []
        #-----------Stats---------
        self.stats = {}
        #----------Histories--------
        self.aum = []
        self.aum_index = {}
        self.returns = []
        self.returns_index = {}
        self.returns_years = []
        self.exposures = []
        self.transaction_index = {}
        self.transactions = []
        self.holding_index = {}
        self.holdings_direct = {}
        self.holdings_indirect = {}
        self.holding_reallocations = {}
        self.holdings_spv = [0,0]
        self.total_holdings = [0,0,0]
        self.spv_first_invest = {}
        
        self.Name = ""
        self.DMRR = ""
        self.ListName = ""
        self.ID = ""
        self.Signal = ""
        self.IL = ""
        self.prime_strat = ""
        self.sub_strat1 = ""
        self.sub_strat2 = ""
        
        #Exposure variables
        self.exp_data = {} #[date][field_type][field_name] = data_pt
        self.id = ""
        self.notes = ""
        self.basic_assumpitions = {} #[date][field_id] = [[field_id, weighting]...] weighting sum to 1
        self.additional_assumtions = {} #[date][field_id] = [[field_id, weighting]...] weighting sum to 1
        
        
    def __str__(self):
        tmp_str = "--------" + self.name + "--------\n"
        tmp_str += "       Backstop ID = " + str(self.backstop_id) + "\n"
        tmp_str += "       Type = " + self.type + "\n"
        tmp_str += "       Address = " + self.address + "\n"
        tmp_str += "       City = " + self.city + "\n"
        tmp_str += "       Postal Code = " + self.postal_code + "\n"
        tmp_str += "       Phone = " + self.phone + "\n"
        tmp_str += "       Website " + self.website + "\n"
        tmp_str += "       Redemption Notice = " + self.redemption_notice + "\n"
        tmp_str += "       Redemptions = " + self.redemptions + "\n"
        tmp_str += "       Incentive Fee = " + self.incentive_fee + "\n"
        tmp_str += "       Redemption Notice = " + self.management_fee + "\n"
        tmp_str += "       Hard Lockup = " + self.hard_lockup + "\n"
        tmp_str += "       Soft Lockup = " + self.soft_lockup + "\n"
        tmp_str += "       Gate Percentage = " + self.gate_percentage + "\n"
        tmp_str += "       Side Pocket Percentage = " + self.side_pocket_percentage + "\n"
        tmp_str += "       First Investment Date = " + self.first_investment_date.strftime("%m/%d/%Y") + "\n"
        tmp_str += "       Interest Level = " + self.interest_level + "\n"
        tmp_str += "       Fund Class = " + self.fund_class + "\n"
        tmp_str += "       Status = " + self.status + "\n"
        tmp_str += "       Erisa Capacity = " + self.erisa_cap + "\n"
        tmp_str += "       K1 History = " + self.k1_history + "\n"
        tmp_str += "       Balance of All Products = " + self.balance_all_products + "\n"
        tmp_str += "       Most Recent Return Date = " + self.most_recent_return_date.strftime("%m/%d/%Y") + "\n"
        tmp_str += "       Inception Date = " + self.incept_date.strftime("%Y-%m-%dT00:00:00-05:00") + "\n"
        tmp_str += "       Firm Name = " + self.firm.name + "\n"
        tmp_str += "       Firm AUM = " + self.firm.cur_total_aum + "\n"
        tmp_str += "------------Stats----------------\n"
        for s in self.stats.keys():
            tmp_str += "       " + s + ": " + self.stats[s][1] + "\n"
        self.ann_arith_st_dev = 0
        self.beta = 0
        self.alpha = 0
        self.correlation_coeff = 0
        self.r_squared_value = 0
        self.max_drawdown = 0
        self.sharpe_ratio = 0
        self.ann_upcapture = 0
        self.ann_downcapture = 0
        tmp_str += "------------Contacts:------------\n"
        for contact in self.firm.party.contacts:
            tmp_str += "       " + str(contact) + "\n"
        tmp_str += "------------Transactions:------------\n"
        for t in self.transactions:
            tmp_str += "       " + str(t[1]) + "\n"
        tmp_str += "------------Meetings:------------\n"
        for m in self.firm.meetings:
            tmp_str += "       " + str(m[1]) + "\n"
        tmp_str += "------------Quarterly Exposures:------------\n"
        for m in self.exposures:
            tmp_str += "       " + m[0].strftime("%m/%d/%Y") + ": " + str(100*m[1]) + "%, " + str(100*m[2]) + "%, " + str(100*m[3])+ "%\n"
        tmp_str += "------------Holdings:------------\n"
        for m in self.holdings_indirect.keys():
            tmp_str += "       " + str(self.holdings_indirect[m]) + "\n"
        tmp_str += "------------Fund Aums:------------\n"
        for m in self.aum:
            tmp_str += "       " + m[0].strftime("%m/%d/%Y") + ": $" + str(m[1]) + "   $" + str(self.firm.aum_index[m[0]]) + "\n"
        tmp_str += "------------Fund Returns:---------\n"
        for r in self.returns:
            if r[0] >= self.first_investment_date:
                tmp_str += "       " + r[0].strftime("%m/%d/%Y") + ": " + str(100*r[1]) + "%\n"
                if r[0].month == 12 or r[0] == self.returns[len(self.returns)-1][0]:
                    tmp_str += "       YTD: " + str(r[0].year) + " " + str(100*self.returns_index[r[0].year]) + "%\n"
        return tmp_str

    def addTransaction(self,trans):
        if trans.product_id not in self.transaction_index.keys():
            self.transaction_index[trans.product_id] = [[trans.date,trans]]
        else:
            self.transaction_index[trans.product_id].append([trans.date,trans])
            self.transaction_index[trans.product_id] = sorted(self.transaction_index[trans.product_id],key=itemgetter(0))
        self.transactions.append([trans.date,trans])
        self.transactions = sorted(self.transactions,key=itemgetter(0),reverse=True)
        
    def addExposureDataPoint(self,tmp_date,global_short,global_long,net):
        if tmp_date.month == 3 or tmp_date.month == 12:
            d = datetime(tmp_date.year,tmp_date.month,31)
            if d < datetime.today():
                self.exposures.append([d,global_short,global_long,net])
        elif tmp_date.month == 6 or tmp_date.month == 9:
            d = datetime(tmp_date.year,tmp_date.month,30)
            if d < datetime.today():
                self.exposures.append([d,global_short,global_long,net])
        self.exposures = sorted(self.exposures, key=itemgetter(0),reverse=True)
    
    def addHolding(self,holding):
        self.holding_index[holding.product_id] = holding
        self.holdings_direct[holding.product_id] = holding
    
    def addIndirectHolding(self,product_id,product,amount,type):
        tmp_holding = Holding()
        tmp_holding.fund_id = self.backstop_id
        tmp_holding.fund = self
        tmp_holding.product_id = product_id
        tmp_holding.product = product
        tmp_holding.amount = amount
        tmp_holding.type = type
        
        if tmp_holding.product_id in self.holdings_indirect.keys():
            self.holdings_indirect[tmp_holding.product_id].amount += tmp_holding.amount
        else:
            self.holdings_indirect[tmp_holding.product_id] = tmp_holding
    
    def addAumDataPoint(self,date,amount):
        if date.month == 3 or date.month == 6 or date.month == 9 or date.month == 12:
            self.aum_index[date] = amount
            self.aum.append([date,amount])
            self.aum = sorted(self.aum, key=itemgetter(0),reverse=True)
    
    def addReturnDataPoint(self,date,amount):
        self.returns_index[date] = amount
        self.returns.append([date,amount])
        self.returns = sorted(self.returns, key=itemgetter(0))
        if date >= self.first_investment_date:
            if date.year in self.returns_index.keys():
                self.returns_index[date.year] += 1.0
                self.returns_index[date.year] *= (1.0 + amount)
                self.returns_index[date.year] -= 1.0
            else:
                self.returns_index[date.year] = amount
            if date.year not in self.returns_years:
                self.returns_years.append(date.year)
                self.returns_years = sorted(self.returns_years)

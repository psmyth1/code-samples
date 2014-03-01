from libs.models import Party
from operator import itemgetter

class Firm:
    def __init__(self):
        self.name = ""
        self.mcp_score_info = []
        self.aum = []
        self.aum_index = {}
        self.cur_total_aum = 0
        self.sec_reg_date = ""
        self.ria_adv_date = ""
        self.cpa_firm_ref_check = ""
        self.prime_broker_ref_checks = ""
        self.is_ria = False
        self.back_invest_info = ""
        self.backstop_id = ""
        self.funds = {}
        self.meeting_index = {}
        self.meetings = []
        self.party = Party()
        self.holdings = {}
        self.total_holdings = [0,0,0]
    
    def __str__(self):
        tmp_str = "Name: " + self.name + " - " + str(self.backstop_id) + " # of Funds: " + str(len(self.funds))
        return tmp_str
    
    def addContact(self,contact):
        self.party.addContact(contact)
    
    def addHolding(self,p_id,amount):
        if p_id in self.holdings.keys():
            self.holdings[p_id] += amount
        else:
            self.holdings[p_id] = amount
        
    def addMeeting(self,meeting):
        if meeting.backstop_meeting_id not in self.meeting_index.keys():
            self.meeting_index[meeting.backstop_meeting_id] = meeting
            self.meetings.append([meeting.date,meeting])
            self.meetings = sorted(self.meetings,key=itemgetter(0),reverse=True)
    
    def calcFirmAums(self):
        for f in self.funds.keys():
            aums = self.funds[f].aum
            for a in aums:
                if a[0] in self.aum_index.keys():
                    self.aum_index[a[0]] += a[1]
                else:
                    self.aum_index[a[0]] = a[1]

        for a in self.aum_index.keys():
            self.aum.append([a,self.aum_index[a]])
        self.aum = sorted(self.aum,key=itemgetter(0),reverse=True)
            
    
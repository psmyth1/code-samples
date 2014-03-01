class Product:
    def __init__(self):
        self.backstop_id = ""
        self.name = ""
        self.transactions = {}
        self.first_invest_trans = {}
        self.holdings_out = {}
        self.holdings_in = {}
        self.balance = 0.0
        self.pass_through = False
        self.final_fund = False
        self.disp_rank = 0
        
    def addTransaction(self,trans):
        if trans.fund_id not in self.transactions.keys():
            self.transactions[trans.fund_id] = [trans]
        else:
            self.transactions[trans.fund_id].append(trans)
    
    def addHolding(self,holding):
        if holding.product_id == self.backstop_id:
            self.holdings_out[holding.fund_id] = holding
        elif holding.fund_id == self.backstop_id:
            self.holdings_in[holding.product_id] = holding
                
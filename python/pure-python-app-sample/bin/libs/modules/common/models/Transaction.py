from libs.models import Product
from libs.models import Fund

class Transaction:
    def __init__(self):
        self.product = Product()
        self.product_id = 0
        self.fund = Fund()
        self.fund_id = 0
        self.type = ""
        self.date = ""
        self.amount = 0
    
    def __str__(self):
        tmp_str = self.date.strftime("%m/%d/%Y") + " : " + str(self.amount) + " " + self.type + " of " + str(self.fund.name) + " by " + str(self.product.name) + " " + str(self.product_id)
        return tmp_str
    
    def setAmount(self,amnt):
        tmp = ""
        for var in range(0,len(amnt)):
            if amnt[var] != '(' and amnt[var] != ')' and amnt[var] != ',' and amnt[var] != '$':
                tmp += amnt[var]
        if amnt[0] == '(':
            self.amount = -1*float(tmp)
        else:
            self.amount = float(tmp)


           
            
            
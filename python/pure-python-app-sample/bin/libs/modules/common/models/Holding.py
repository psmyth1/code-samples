from libs.models import Product
from datetime import date
from libs.models import Fund

class Holding:
    def __init__(self):
        self.product = Product()
        self.product_id = 0
        self.fund = Fund.Fund()
        self.fund_id = 0
        self.date = date.today()
        self.amount = 0
        self.type = ""
        self.percent = 0
    
    def __str__(self):
        tmp_str = self.product.name + " - $" + str(self.amount) 
        return tmp_str
    



           
            
            
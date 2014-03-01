from utils.BackStopDataManager import BackStopDataManager
import cPickle
from datetime import date, datetime
import os

class StatsCalculator:
    def __init__(self, cache_path, backstop_only = False):
        self.backstop_only = backstop_only
        self.cache_path = cache_path

        if self.cache_path[len(self.cache_path)-1] != "/":
            self.cache_path += "/"

        self.bsdm = BackStopDataManager()
        
        self.returns_index = {}
    
        if not self.backstop_only:
            self.loadCachedReturns()
        else:
            self.returns_index = {}
            self.returns_index[""] = {}
            
    def loadCachedReturns(self):
        if os.access(self.cache_path + "returns/returns.cache",os.F_OK):
            tmp_file = open(self.cache_path + "returns/returns.cache")
            self.returns_index = cPickle.load(tmp_file)
            tmp_file.close()
            
    def calcStatisticsFromList(self,fund_ids, start_date, end_date):                  
        self.benchmark_returns_RMF = []
        self.benchmark_returns_RF = []
        self.risk_free_returns_RMF = []
        self.risk_free_returns_RF = []
        
        stats_index = {}
        
        if self.backstop_only:
            tmp_returns = self.bsdm.getHedgeFundReturns(496539, start_date, end_date)
            if tmp_returns != False:
                for month in tmp_returns:
                    for item in month:
                        if item[0] == "amount":
                            self.benchmark_returns_RMF.append(item[1] + 1)     
                            self.benchmark_returns_RF.append(item[1]) 
            
            tmp_returns = self.bsdm.getHedgeFundReturns(496605, start_date, end_date)
            if tmp_returns != False:
                for month in tmp_returns:
                    for item in month:
                        if item[0] == "amount":
                            self.risk_free_returns_RMF.append(item[1] + 1)     
                            self.risk_free_returns_RF.append(item[1])
        else:
            for y in range(start_date.year,end_date.year+1):
                if y == start_date.year and y == end_date.year:
                    for m in range(start_date.month,end_date.month+1):
                        self.addMonthOfReturns(496539,y,m,1)
                        self.addMonthOfReturns(496605,y,m,2)
                elif y == start_date.year:
                    for m in range(start_date.month,13):
                        self.addMonthOfReturns(496539,y,m,1)
                        self.addMonthOfReturns(496605,y,m,2)
                elif y == end_date.year:
                    for m in range(1,end_date.month+1):
                        self.addMonthOfReturns(496539,y,m,1)
                        self.addMonthOfReturns(496605,y,m,2)
                else:
                    for m in range(1,13):
                        self.addMonthOfReturns(496539,y,m,1)
                        self.addMonthOfReturns(496605,y,m,2)
        for fund_id in fund_ids:
            self.fund_returns_RMF = []  
            self.fund_returns_RF = []  
            if self.backstop_only:
                tmp_returns = self.bsdm.getHedgeFundReturns(fund_id, start_date, end_date)
                if tmp_returns != False:
                    for month in tmp_returns:
                        for item in month:
                            if item[0] == "amount":
                                self.fund_returns_RMF.append(item[1] + 1)     
                                self.fund_returns_RF.append(item[1])
            else:
                for y in range(start_date.year,end_date.year+1):
                    if y == start_date.year and y == end_date.year:
                        for m in range(start_date.month,end_date.month+1):
                            self.addMonthOfReturns(fund_id,y,m,3)
                    elif y == start_date.year:
                        for m in range(start_date.month,13):
                            self.addMonthOfReturns(fund_id,y,m,3)
                    elif y == end_date.year:
                        for m in range(1,end_date.month+1):
                            self.addMonthOfReturns(fund_id,y,m,3)
                    else:
                        for m in range(1,13):
                            self.addMonthOfReturns(fund_id,y,m,3)
                            
            stats_index[fund_id] = self.gatherStats()
        return stats_index        
                        
    def calcStatistics(self, fund_id, start_date, end_date):
        self.fund_returns_RMF = []  
        self.fund_returns_RF = []  
        self.benchmark_returns_RMF = []
        self.benchmark_returns_RF = []
        self.risk_free_returns_RMF = []
        self.risk_free_returns_RF = []
        
        if self.backstop_only:
            tmp_returns = self.bsdm.getHedgeFundReturns(496539, start_date, end_date)
            if tmp_returns != False:
                for month in tmp_returns:
                    for item in month:
                        if item[0] == "amount":
                            self.benchmark_returns_RMF.append(item[1] + 1)     
                            self.benchmark_returns_RF.append(item[1]) 
            
            tmp_returns = self.bsdm.getHedgeFundReturns(496605, start_date, end_date)
            if tmp_returns != False:
                for month in tmp_returns:
                    for item in month:
                        if item[0] == "amount":
                            self.risk_free_returns_RMF.append(item[1] + 1)     
                            self.risk_free_returns_RF.append(item[1])
            
            tmp_returns = self.bsdm.getHedgeFundReturns(fund_id, start_date, end_date)
            if tmp_returns != False:
                for month in tmp_returns:
                    for item in month:
                        if item[0] == "amount":
                            self.fund_returns_RMF.append(item[1] + 1)     
                            self.fund_returns_RF.append(item[1])
        else:
            for y in range(start_date.year,end_date.year+1):
                if y == start_date.year and y == end_date.year:
                    for m in range(start_date.month,end_date.month+1):
                        self.addMonthOfReturns(496539,y,m,1)
                        self.addMonthOfReturns(496605,y,m,2)
                        self.addMonthOfReturns(fund_id,y,m,3)
                elif y == start_date.year:
                    for m in range(start_date.month,13):
                        self.addMonthOfReturns(496539,y,m,1)
                        self.addMonthOfReturns(496605,y,m,2)
                        self.addMonthOfReturns(fund_id,y,m,3)
                elif y == end_date.year:
                    for m in range(1,end_date.month+1):
                        self.addMonthOfReturns(496539,y,m,1)
                        self.addMonthOfReturns(496605,y,m,2)
                        self.addMonthOfReturns(fund_id,y,m,3)
                else:
                    for m in range(1,13):
                        self.addMonthOfReturns(496539,y,m,1)
                        self.addMonthOfReturns(496605,y,m,2)
                        self.addMonthOfReturns(fund_id,y,m,3)
        stats = self.gatherStats()
        return stats
    
    def gatherStats(self):       
        stats = []
        try:
            stats.append(self.AnnualizedGeometricReturn())
        except:
            stats.append("N/A")
            pass
        try:
            stats.append(self.CompoundReturn())
        except:
            stats.append("N/A")
            pass
        try:
            stats.append(self.AnnualizedArithmeticStandardDeviation())
        except:
            stats.append("N/A")
            pass
        try:
            stats.append(self.MaxDrawDown())
        except:
            stats.append("N/A")
            pass
        try:
            stats.append(self.SecondMaxDrawDown())
        except:
            stats.append("N/A")
            pass
        try:
            stats.append(self.SharpeRatio())
        except:
            stats.append("N/A")
            pass
        try:
            stats.append(self.CumulativeUpCapture())
        except:
            stats.append("N/A")
            pass
        try:
            stats.append(self.CumulativeDownCapture())
        except:
            stats.append("N/A")
            pass
        try:
            stats.append(self.AnnualizedUpCapture())
        except:
            stats.append("N/A")
            pass
        try:
            stats.append(self.AnnualizedDownCapture())
        except:
            stats.append("N/A")
            pass
        try:
            stats.append(self.PercentPeriodsPositve())
        except:
            stats.append("N/A")
            pass
        try:
            stats.append(self.PercentPeriodsNegative())
        except:
            stats.append("N/A")
            pass
        try:
            stats.append(self.AverageReturn())
        except:
            stats.append("N/A")
            pass
        try:
            stats.append(self.HighestSinglePeriodReturn())
        except:
            stats.append("N/A")
            pass
        try:
            stats.append(self.LowestSinglePeriodReturn())
        except:
            stats.append("N/A")
            pass
        try:
            stats.append(self.AverageGainInPositivePeriod())
        except:
            stats.append("N/A")
            pass
        try:
            stats.append(self.AverageLossInLossPeriod())
        except:
            stats.append("N/A")
            pass
        try:
            stats.append(self.AnnualizedAlpha())
        except:
            stats.append("N/A")
            pass
        try:
            stats.append(self.Beta())
        except:
            stats.append("N/A")
            pass
        try:
            stats.append(self.CorrelationCoefficient())
        except:
            stats.append("N/A")
            pass
        try:
            stats.append(self.RSquared())
        except:
            stats.append("N/A")
            pass
        return stats 
    
    def addMonthOfReturns(self,fund_id,year,month,type):
        from_BS = False
        
        if year not in self.returns_index.keys():
            from_BS = True
        elif month not in self.returns_index[year].keys():
            from_BS = True
        elif fund_id not in self.returns_index[year][month].keys():
            from_BS = True
        
        if from_BS:
            tmp_returns = self.bsdm.getHedgeFundReturns(fund_id, date(year,month,15), date(year,month,15))
            if tmp_returns != False:
                for month in tmp_returns:
                    for item in month:
                        if item[0] == "amount":
                            if type == 3:
                                self.fund_returns_RMF.append(item[1] + 1)     
                                self.fund_returns_RF.append(item[1])
                            elif type == 2:
                                self.risk_free_returns_RMF.append(item[1] + 1)     
                                self.risk_free_returns_RF.append(item[1])
                            else:
                                self.benchmark_returns_RMF.append(item[1] + 1)     
                                self.benchmark_returns_RF.append(item[1])
        else:
            def_values = False
            if fund_id in self.returns_index[year][month].keys():
                if "RMF" in self.returns_index[year][month][fund_id].keys():
                    if type == 3:
                        self.fund_returns_RMF.append(self.returns_index[year][month][fund_id]["RMF"])     
                        self.fund_returns_RF.append(self.returns_index[year][month][fund_id]["RF"])
                    elif type == 2:
                        self.risk_free_returns_RMF.append(self.returns_index[year][month][fund_id]["RMF"])     
                        self.risk_free_returns_RF.append(self.returns_index[year][month][fund_id]["RF"])
                    else:
                        self.benchmark_returns_RMF.append(self.returns_index[year][month][fund_id]["RMF"])     
                        self.benchmark_returns_RF.append(self.returns_index[year][month][fund_id]["RF"])
                else:
                    def_values = True 
            else:
                def_values = True
            
            if def_values: 
                if type == 3:
                    self.fund_returns_RMF.append(1.0)     
                    self.fund_returns_RF.append(0.0)
                elif type == 2:
                    self.risk_free_returns_RMF.append(1.0)     
                    self.risk_free_returns_RF.append(0.0)
                else:
                    self.benchmark_returns_RMF.append(1.0)     
                    self.benchmark_returns_RF.append(0.0)
                           

    def AnnualizedGeometricReturn(self):
        if len(self.fund_returns_RMF) < 12:
            return self.CompoundReturn()
        else:
            annual_geo_return = 1.0
            for rtrn in self.fund_returns_RMF:
                annual_geo_return = annual_geo_return * rtrn
            annual_geo_return = (annual_geo_return**(12.0 / len(self.fund_returns_RMF)) - 1)
            return annual_geo_return
    
    def AnnGeometricReturn(self,fund_returns_RMF):
        annual_geo_return = 1.0
        for rtrn in fund_returns_RMF:
            annual_geo_return = annual_geo_return * rtrn
        annual_geo_return = (annual_geo_return**(12.0 / len(fund_returns_RMF)) - 1)
        return annual_geo_return
    
    def AnnualizedArithmeticStandardDeviation(self):
        if len(self.fund_returns_RMF) < 12:
            return self.ArithmeticStandardDeviation(self.fund_returns_RMF)
        else:
            return self.ArithmeticStandardDeviation(self.fund_returns_RMF) * 12**.5

    def CompoundReturn(self):
        compound_return = 1.0
        for rtrn in self.fund_returns_RMF:
            compound_return = compound_return * rtrn
        compound = compound_return - 1
        return compound
    
    def CmpndReturn(self, fund_returns_RMF):
        compound_return = 1.0
        for rtrn in fund_returns_RMF:
            compound_return = compound_return * rtrn
        compound = compound_return - 1
        return compound
    
    def MaxDrawDown(self):
        sudo_drawdown, return_multiple = 1.0,1.0
        count = 0.0
        drawdown_collection, date_collection = [],[]
        for rtrn in self.fund_returns_RF:
            return_multiple = 1 + rtrn
            if rtrn < 0:
                sudo_drawdown = sudo_drawdown * return_multiple
            if return_multiple > 1:
                if return_multiple + sudo_drawdown > 1:
                    sudo_drawdown = sudo_drawdown * return_multiple
            if sudo_drawdown < 1:
                drawdown_collection.append(sudo_drawdown)
                date_collection.append(count)
            if sudo_drawdown > 1:
                sudo_drawdown = 1
            count = count + 1
        if len(drawdown_collection) == 0:
            return 0.0
        else:
            drawdown = (self.Min(drawdown_collection) - 1)
            return drawdown
    
    def SecondMaxDrawDown(self):
        sudo_drawdown, return_multiple = 1.0,1.0
        count = 0
        drawdown_collection, date_collection = [],[]
        for rtrn in self.fund_returns_RF:
            return_multiple = 1 + rtrn
            if rtrn < 0:
                sudo_drawdown = sudo_drawdown * return_multiple
            if return_multiple > 1:
                if return_multiple + sudo_drawdown > 1:
                    sudo_drawdown = sudo_drawdown * return_multiple
            if sudo_drawdown < 1:
                drawdown_collection.append(sudo_drawdown)
                date_collection.append(count)
            if sudo_drawdown > 1:
                sudo_drawdown = 1
            count = count + 1
            
        def getDrawdownRange(drawdown, drawdown_collection, date_collection, fund_returns_RF):
            end_pos = drawdown_collection.index(drawdown)
            end_pos = date_collection[end_pos]
            tmp = 1.0
            start_pos = 0
            for index in xrange(end_pos,0,-1):
                tmp = tmp * (1 + fund_returns_RF[index])
                if abs(tmp - drawdown) < 0.000001:
                    start_pos = index
                    break
            return [start_pos, end_pos]
        
        if len(drawdown_collection) == 0:
            return 0.0
        maxdraw = self.Min(drawdown_collection) 
        max_range = getDrawdownRange(maxdraw, drawdown_collection, date_collection, self.fund_returns_RF)
        new_drawdown_collection = drawdown_collection[:]
        sec_draw = 0.0
        for i in range(len(drawdown_collection)):
            min = self.Min(new_drawdown_collection)
            min_range = getDrawdownRange(min, drawdown_collection, date_collection, self.fund_returns_RF)
            if min_range[0] >= max_range[0] and min_range[0] <= max_range[1] or \
            min_range[1] >= max_range[0] and min_range[1] <= max_range[1]:
                new_drawdown_collection.remove(min)
            else:
                sec_draw = min
                break
        if len(new_drawdown_collection) == 0:
            return 0.0
        else:
            return sec_draw - 1
    
    def SharpeRatio(self):
        fund_risk_free_delta = []
        for point in range(len(self.fund_returns_RMF)):
            fund_risk_free_delta.append(self.fund_returns_RMF[point] - self.risk_free_returns_RMF[point] + 1)
        sharpe_ratio = self.AnnGeometricReturn(fund_risk_free_delta) / self.AnnualizedArithmeticStandardDeviation()
        if sharpe_ratio < 0:
            return "N/A"
        else:
            return sharpe_ratio

    def CumulativeUpCapture(self):
        benchmark_returns, fund_returns = [],[]
        for point in range(len(self.benchmark_returns_RMF)):
            if self.benchmark_returns_RMF[point] > 1:
                benchmark_returns.append(self.benchmark_returns_RMF[point])
                fund_returns.append(self.fund_returns_RMF[point])        
        cummulative_up_cap = self.CmpndReturn(fund_returns) / self.CmpndReturn(benchmark_returns)
        return cummulative_up_cap
    
    def CumulativeDownCapture(self):
        benchmark_returns, fund_returns = [],[]
        for point in range(len(self.benchmark_returns_RMF)):
            if self.benchmark_returns_RMF[point] < 1:
                benchmark_returns.append(self.benchmark_returns_RMF[point])
                fund_returns.append(self.fund_returns_RMF[point])        
        cummulative_down_cap = self.CmpndReturn(fund_returns) / self.CmpndReturn(benchmark_returns)
        return cummulative_down_cap
    
    def AnnualizedUpCapture(self):
        benchmark_positive_returns, fund_returns = [],[]
        for point in range(len(self.benchmark_returns_RMF)):
            if self.benchmark_returns_RMF[point] > 1:
                benchmark_positive_returns.append(self.benchmark_returns_RMF[point])
                fund_returns.append(self.fund_returns_RMF[point])
        annualized_up_cap = self.AnnGeometricReturn(fund_returns) / self.AnnGeometricReturn(benchmark_positive_returns)
        if len(benchmark_positive_returns) < 12:
            return self.CumulativeUpCapture()
        return annualized_up_cap
    
    def AnnualizedDownCapture(self):
        benchmark_negative_returns, fund_returns = [],[]
        for point in range(len(self.benchmark_returns_RMF)):
            if self.benchmark_returns_RMF[point] < 1:
                benchmark_negative_returns.append(self.benchmark_returns_RMF[point])
                fund_returns.append(self.fund_returns_RMF[point])
        annualized_down_cap = self.AnnGeometricReturn(fund_returns) / self.AnnGeometricReturn(benchmark_negative_returns)
        if len(benchmark_negative_returns) < 12:
            return self.CumulativeDownCapture()
        return annualized_down_cap
    
    def PercentPeriodsPositve(self):
        count = 0.0
        for rtrn in self.fund_returns_RF:
            if rtrn > 0:
                count = count + 1
        return count / len(self.fund_returns_RF)
    
    def PercentPeriodsNegative(self):
        count = 0.0
        for rtrn in self.fund_returns_RF:
            if rtrn < 0:
                count = count + 1
        return count / len(self.fund_returns_RF)
    
    def AverageReturn(self):
        return self.Average(self.fund_returns_RF)
    
    def HighestSinglePeriodReturn(self):
        return self.Max(self.fund_returns_RF)
    
    def LowestSinglePeriodReturn(self):
        return self.Min(self.fund_returns_RF)
    
    def AverageGainInPositivePeriod(self):
        returns_in_positive = []
        for rtrn in self.fund_returns_RF:
            if rtrn > 0:
                returns_in_positive.append(rtrn)
        return self.Average(returns_in_positive)
    
    def AverageLossInLossPeriod(self):
        returns_in_negative = []
        for rtrn in self.fund_returns_RF:
            if rtrn < 0:
                returns_in_negative.append(rtrn)
        if len(returns_in_negative) == 0:
            return 0.0
        else:
            return self.Average(returns_in_negative)
    
    def Beta(self):
        num_sum, den_sum = 0.0,0.0
        x_mean = self.Average(self.benchmark_returns_RF)
        y_mean = self.Average(self.fund_returns_RF)
        for point in range(len(self.fund_returns_RF)):
            num_sum = num_sum + (self.fund_returns_RF[point] - y_mean)*(self.benchmark_returns_RF[point]-x_mean)
            den_sum = den_sum + (self.benchmark_returns_RF[point] - x_mean)**2
        beta = num_sum / den_sum
        return beta
        
    def Alpha(self):
        beta = self.Beta()
        x_mean = self.Average(self.benchmark_returns_RF)
        y_mean = self.Average(self.fund_returns_RF)
        alpha = (y_mean - x_mean * beta) * 100
        return alpha
    
    def AnnualizedAlpha(self):
        if len(self.fund_returns_RF) < 12:
            return self.Alpha()
        else:
            return self.Alpha()*12.0
    
    def CorrelationCoefficient(self):
        num_sum = 0.0
        x_mean = self.Average(self.fund_returns_RF)
        y_mean = self.Average(self.benchmark_returns_RF)
        for point in range(len(self.fund_returns_RF)):
            num_sum = num_sum + (self.benchmark_returns_RF[point] - y_mean)*(self.fund_returns_RF[point]-x_mean)
        x_stdev = self.ArithmeticStandardDeviation(self.fund_returns_RF)
        y_stdev = self.ArithmeticStandardDeviation(self.benchmark_returns_RF)
        R = num_sum / ((len(self.fund_returns_RF) -1) * x_stdev * y_stdev)
        return R
    
    def RSquared(self):
        RSqrd = self.CorrelationCoefficient()**2
        return RSqrd
    
    def AlphaGivenBeta(self, beta):
        x_mean = self.Average(self.benchmark_returns_RF)
        y_mean = self.Average(self.fund_returns_RF)
        alpha = (y_mean - x_mean * beta) * 100
        return alpha
  
    def RSquaredGivenR(self, R):
        return  R**2  
    
    def ArithmeticStandardDeviation(self, data_set):
        mean = 0.0
        for rtrn in data_set:
            mean = mean + rtrn
        mean = mean / len(data_set)
        sum_dif_sqrd = 0
        for rtrn in data_set:
            sum_dif_sqrd = sum_dif_sqrd + (rtrn - mean)**2
        stdev = (sum_dif_sqrd / (len(data_set) - 1))**.5
        return stdev
    
    def Min(self, data_set):
        min = data_set[0]
        for point in data_set:
            if point < min:
                min = point
        return min
    
    def Max(self, data_set):
        max = data_set[0]
        for point in data_set:
            if point > max:
                max= point
        return max
        
    def Average(self, data_set):
        sum = 0.0
        for point in data_set:
            sum = sum + point
        return sum / len(data_set)
      
    def FormatPercentage(self, number):
        number = number * 100.0
        return str("%.2f" % round(number, 2)) + "%"
    
    def FormatNonPercentage(self, number):
        return str(round(number, 4))
    
    def DateConversion(self, date): #date object
        return date.strftime("%Y-%m-%dT00:00:00-05:00")
    
    
    
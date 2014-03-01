class StatisticsCalculations:
    '''
    Class used in generating the MIS Report.  It is very similar to the class used for the
    Statistics Report but it is structurally optimized.  
    NOTES:
        RMF - Return Multiple Format ex - 1.02 for 2.00% return
        RF - Return Format ex - 2.0 for 2.00% return
    GetStatistics - returns array of statistics values 
    Methods are defined for each statistic calculation
    Additional helper methods are used as well 
    '''
    def __init__(self, bsdm, fundID, startDate, endDate):
        self.bsdm = bsdm
        
        self.fund_returns_RMF = []  
        self.fund_returns_RF = []  
        
        self.benchmark_returns_RMF = []
        self.benchmark_returns_RF = []
        self.risk_free_returns_RMF = []
        self.risk_free_returns_RF = []
        
        tmp = self.bsdm.getHedgeFundReturns(fundID, startDate, endDate)
        for day in tmp:
            for item in day:
                if item[0] == "amount":
                    self.fund_returns_RMF.append(item[1] + 1)     
                    self.fund_returns_RF.append(item[1])   
        
        tmp = self.bsdm.getHedgeFundReturns(496539, startDate, endDate)
        for day in tmp:
            for item in day:
                if item[0] == "amount":
                    self.benchmark_returns_RMF.append(item[1] + 1)     
                    self.benchmark_returns_RF.append(item[1]) 
                    
        tmp = self.bsdm.getHedgeFundReturns(496605, startDate, endDate)
        for day in tmp:
            for item in day:
                if item[0] == "amount":
                    self.risk_free_returns_RMF.append(item[1] + 1)     
                    self.risk_free_returns_RF.append(item[1])
        
        self.format_as_percent = [True,True,True,True,False,True,True,True,True,True,True,True,True,True,True,True,False,False,False,False]

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
            return self.ArithmeticStandardDeviation(self.fund_returns_RMF)* 12**.5
   
    def CompoundReturn(self):
        compound_return = 1.0
        for rtrn in self.fund_returns_RMF:
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
        cummulative_up_cap = self.CompoundReturn(fund_returns) / self.CompoundReturn(benchmark_returns)
        return cummulative_up_cap
    
    def CumulativeDownCapture(self):
        benchmark_returns, fund_returns = [],[]
        for point in range(len(self.benchmark_returns_RMF)):
            if self.benchmark_returns_RMF[point] < 1:
                benchmark_returns.append(self.benchmark_returns_RMF[point])
                fund_returns.append(self.fund_returns_RMF[point])        
        cummulative_down_cap = self.CompoundReturn(fund_returns) / self.CompoundReturn(benchmark_returns)
        return cummulative_down_cap
    
    def AnnualizedUpCapture(self):
        benchmark_positive_returns, fund_returns = [],[]
        for point in range(len(self.benchmark_returns_RMF)):
            if self.benchmark_returns_RMF[point] > 1:
                benchmark_positive_returns.append(self.benchmark_returns_RMF[point])
                fund_returns.append(self.fund_returns_RMF[point])
        annualized_up_cap = self.AnnGeometricReturn(fund_returns) / self.AnnGeometricReturn(benchmark_positive_returns)
        return annualized_up_cap
    
    def AnnualizedDownCapture(self):

        benchmark_negative_returns, fund_returns = [],[]
        for point in range(len(self.benchmark_returns_RMF)):
            if self.benchmark_returns_RMF[point] < 1:
                benchmark_negative_returns.append(self.benchmark_returns_RMF[point])
                fund_returns.append(self.fund_returns_RMF[point])
        annualized_up_cap = self.AnnGeometricReturn(fund_returns) / self.AnnGeometricReturn(benchmark_negative_returns)
        return annualized_up_cap
    
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
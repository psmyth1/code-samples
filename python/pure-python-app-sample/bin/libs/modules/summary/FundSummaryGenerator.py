from reportlab.pdfgen import canvas  # @UnresolvedImport
from libs.modules.common.models.FundManager import FundManager
from datetime import date,datetime
from libs.utils.ExportExcel import ExportExcel
import os
import time

class FundSummaryGenerator:
    def __init__(self,fund_man):
        self.fund_man = fund_man
        self.fund_man.setDisplayRanks([[370761,3],[370775,5],[762605,1],[762635,2],[370751,4],[370753,7],[370755,8],[370745,6],[370759,9]])
        
        tmp_arr = []
        for p in self.fund_man.products.values():
            if p.final_fund:
                tmp_arr.append(p)
        
        self.prods = sorted(tmp_arr,key=lambda product:product.disp_rank)
        
        self.p_width = 660
        self.p_height = 841.89
        self.def_font = "Helvetica"
        self.def_font_size = 6
        self.def_leading = 7
        self.def_lines_ppg = 84
        self.fund_col_width = 160
        
    def generateReport(self,sort_by,sort_order,report_path="FundSummary.pdf",as_of_date=date.today()):
        if os.access(report_path,os.F_OK):
            try:
                os.remove(report_path)
            except WindowsError:
                os.system("taskkill /F /IM AcroRd32.exe")
                time.sleep(1)
                os.remove(report_path)
        
        data = self.calcData(sort_by,sort_order)

        self.canv = canvas.Canvas(report_path)
        self.canv.setPageSize((self.p_width,self.p_height))
               
        for var in range(0,len(data)):
            page = data[var]
            self.canv.rotate(-90)  
            if var == 0:
                title_x = self.p_width-14
                title_y = float(self.p_height)/2.0
                self.drawTitle(title_x,title_y,as_of_date)
                grid_y = 0
                grid_x = title_x-21
                self.col_dims = self.calcColumns()
            else:
                grid_y = 0
                grid_x = self.p_width-10
            prod_x = grid_x
            prod_y = grid_y
            data_x = grid_x - 10
            data_y = grid_y
            
            if var == (len(data)-1):
                self.drawData(data_x,data_y,page,True)
            else:
                self.drawData(data_x,data_y,page)
            self.drawLines(grid_x,grid_y)
            self.drawColTitles(prod_x,prod_y)
            
            self.canv.showPage()
        self.canv.save()

    def exportToExcel(self,sort_by,sort_order,report_path,filename):
        data = self.calcData(sort_by,sort_order)
        
        excel_data = {}
        excel_data["Holding Summary"] = []
        
        title_row = [""]
        for p in self.prods:
            title_row.append(p.name)
        title_row.append("Total MCP")
        title_row.append("Total Non-MCP")
        title_row.append("Total")
        
        excel_data["Holding Summary"].append(title_row)
            
        for page in data:
            for row_var in range(0,len(page)):
                row = page[row_var]
                tmp_row = []
                for col_var in range(0,len(row)):
                    cell = row[col_var]
                    if col_var == 0:
                        tmp_row.append(cell[0])
                    else:
                        if type(cell).__name__ == 'float':
                            if cell < 1.0:
                                cell = 0.0
                        tmp_row.append(cell)
                excel_data["Holding Summary"].append(tmp_row)                        
                
        exp = ExportExcel(excel_data,report_path,filename)
        exp.toExcel()
    
    def drawTitle(self,x,y,as_of_date):
        c = self.canv 
        xy = self.translate(x-4, y)
        
        c.setFont("Times-Bold",self.def_font_size+10)
        c.drawCentredString(xy[0],xy[1],"MCP Holdings Summary")
        
        c.setFont("Times-Bold",self.def_font_size+4)
        xy = self.translate(x, self.p_height*.82)
        c.drawString(xy[0],xy[1],"Data As Of: " + as_of_date.strftime("%m/%d/%Y"))
        xy = self.translate(x-10, self.p_height*.82)
        c.drawString(xy[0],xy[1],datetime.today().strftime("Reported: %m/%d/%y, %I:%M %p"))         
         
        
    def calcColumns(self):
        prods = self.prods
        
        num_cols = len(prods) + 3
        col_width = float(self.p_height-self.fund_col_width-10)/float(num_cols)
        
        col_dims = [[0,self.fund_col_width/2.0,self.fund_col_width]]
        
        cur_x = self.fund_col_width
        for var in range(0,num_cols): #@UnusedVariable
            tmp_dims = [cur_x,cur_x + (col_width/2.0),(cur_x + col_width)]
            col_dims.append(tmp_dims)
            cur_x = (cur_x + col_width)
 
        return col_dims      
    
    def drawColTitles(self,x,y):
        c = self.canv
        c.setFont(self.def_font+"-Bold",self.def_font_size+1)

        for var in range(0,len(self.prods)):
            col = var+1
            xy = self.translate(x, self.col_dims[col][1])
            c.drawCentredString(xy[0],xy[1],self.getAcronym(self.prods[var].name))
        
        c.setFont(self.def_font+"-BoldOblique",self.def_font_size+1)
        
        xy = self.translate(x, self.col_dims[len(self.prods)+1][1])
        c.drawCentredString(xy[0],xy[1],"Total MCP")
        
        xy = self.translate(x, self.col_dims[len(self.prods)+2][1])
        c.drawCentredString(xy[0],xy[1],"Total Non-MCP")
        
        xy = self.translate(x, self.col_dims[len(self.prods)+3][1])
        c.drawCentredString(xy[0],xy[1],"Total")
    
    def drawLines(self,x,y):
        c = self.canv
        
        xy1 = self.translate(x+7,self.col_dims[0][2])
        xy2 = self.translate(x+7,self.col_dims[len(self.col_dims)-1][2])
        xy4 = self.translate(x-2,self.col_dims[len(self.col_dims)-1][2])
        c.setFillColorRGB(0,.9,1)
        c.rect(xy4[0],xy4[1],(xy1[0]-xy4[0]),(xy1[1]-xy4[1]),fill=1)
        c.setFillColorRGB(0,0,0)
        
        for var in range(1,len(self.col_dims)):
            if (len(self.col_dims)-var) == 3:
                c.setLineWidth(2)
            xy1 = self.translate(x+7, self.col_dims[var][0]) 
            xy2 = self.translate(0, self.col_dims[var][0])
            c.line(xy1[0],xy1[1],xy2[0],xy2[1])
            if (len(self.col_dims)-var) == 3:
                c.setLineWidth(1)            
            xy1 = self.translate(x+7, self.col_dims[var][2]) 
            xy2 = self.translate(0, self.col_dims[var][2])
            c.line(xy1[0],xy1[1],xy2[0],xy2[1])
        
        
    def calcData(self,sort_by,sort_order):
        f = self.fund_man
        data = []
        mcp_holdings = {}
        mcp_totals = [0,0,0]
        firms = sorted(self.fund_man.firms.values(),key=lambda firm: firm.total_holdings[sort_by],reverse=sort_order)
        tmp_page = []
        
        for firm in firms:
            tmp_firm_sect = []
            funds = sorted(firm.funds.values(),key=lambda fund: fund.total_holdings[2],reverse=True)
            tmp_row = [[firm.name,True]]
            for p in self.prods:
                if p.backstop_id in firm.holdings.keys():
                    tmp_row.append(firm.holdings[p.backstop_id])
                    if p.backstop_id in mcp_holdings.keys():
                        mcp_holdings[p.backstop_id] += firm.holdings[p.backstop_id]
                    else:
                        mcp_holdings[p.backstop_id] = firm.holdings[p.backstop_id]
                else:
                    tmp_row.append(0)
            mcp_totals[0] += firm.total_holdings[0]
            mcp_totals[1] += firm.total_holdings[1]
            mcp_totals[2] += firm.total_holdings[2]
            
            tmp_row.append(firm.total_holdings[0])
            tmp_row.append(firm.total_holdings[1])
            tmp_row.append(firm.total_holdings[2])
            tmp_firm_sect.append(tmp_row)
            for f in funds:
                tmp_row = [[f.name,False]]
                for p in self.prods:
                    if p.backstop_id in f.holdings_indirect.keys():
                        tmp_row.append(f.holdings_indirect[p.backstop_id].amount)
                    else:
                        tmp_row.append(0)
                tmp_row.append(f.total_holdings[0])
                tmp_row.append(f.total_holdings[1])
                tmp_row.append(f.total_holdings[2])
                tmp_firm_sect.append(tmp_row)
            if (len(tmp_firm_sect) + len(tmp_page)) > self.def_lines_ppg:
                data.append(tmp_page)
                tmp_page = []
            for row in tmp_firm_sect:
                tmp_page.append(row)
        tmp_row = [["Meridian Capital Partners Totals",True]]
        for p in self.prods:
            if p.backstop_id in mcp_holdings.keys():
                tmp_row.append(mcp_holdings[p.backstop_id])
            else:
                tmp_row.append(0)
        tmp_page.append([["",False]])
        tmp_row.append(mcp_totals[0])
        tmp_row.append(mcp_totals[1])
        tmp_row.append(mcp_totals[2])
        tmp_page.append(tmp_row)
        data.append(tmp_page)
        
        return data
        
    def drawData(self,x,y,data,endPage=False):
        c = self.canv

        cur_x = x
        
        leading = self.def_leading
        
        for var in range(0,len(data)):
            row = data[var]
            if var == (len(data)-1) and endPage:
                xy1 = self.translate(cur_x-3, self.col_dims[len(self.col_dims)-1][2])
                xy4 = self.translate(cur_x+7, self.col_dims[0][0])
                
                c.setFillColorRGB(0,.9,1)
                c.rect(xy4[0],xy4[1],(xy1[0]-xy4[0]),(xy1[1]-xy4[1]),fill=1)
                c.setFillColorRGB(0,0,0)
                    
                c.setFont(self.def_font+"-Bold",self.def_font_size+1)
                str_x = cur_x
                str_y = self.col_dims[0][1]
                xy = self.translate(str_x,str_y)
                c.drawCentredString(xy[0],xy[1],row[0][0])
            else:
                if not row[0][1]:
                    c.setFont(self.def_font,self.def_font_size)
                    str_x = cur_x
                    str_y = self.col_dims[0][0]+10
                    xy = self.translate(str_x,str_y)
                    c.drawString(xy[0],xy[1],row[0][0])
                else:
                    xy1 = self.translate(cur_x-1, self.col_dims[len(self.col_dims)-1][2])
                    xy4 = self.translate(cur_x+5.6, self.col_dims[0][0])
                    
                    c.setFillColorRGB(.8,.8,.8)
                    c.rect(xy4[0],xy4[1],(xy1[0]-xy4[0]),(xy1[1]-xy4[1]),stroke=0,fill=1)
                    c.setFillColorRGB(0,0,0)
                    
                    str_x = cur_x
                    str_y = self.col_dims[0][0]+5
                    xy = self.translate(str_x,str_y)
                    c.setFont(self.def_font+"-Bold",self.def_font_size)
                    c.drawString(xy[0],xy[1],row[0][0])
            
            for var2 in range(1,len(row)):
                str_x = cur_x
                if row[var2] < 1:
                    str_y = self.col_dims[var2][1]
                    xy = self.translate(str_x,str_y)
                    c.drawCentredString(xy[0],xy[1],"----")
                else:
                    mon_str = self.formatMoney(row[var2],True)
                    if var == (len(data)-1) and endPage:
                        str_y = self.col_dims[var2][1]
                        xy = self.translate(str_x,str_y)
                        c.drawCentredString(xy[0],xy[1],mon_str)
                    else:
                        str_y = self.col_dims[var2][2]-15
                        xy = self.translate(str_x,str_y)
                        c.drawRightString(xy[0],xy[1],mon_str)
            cur_x -= leading
        
    def translate(self,x,y):
        new_x = -(self.p_height - y)
        new_y = x
        return [new_x,new_y]
    
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

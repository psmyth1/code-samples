from libs.models import FundManager
from reportlab.pdfgen import canvas
import os
import math
import time
from operator import itemgetter
from datetime import date, datetime

class MISReportGenerator:
    def __init__(self,fund_man):
        self.fund_man = fund_man
        self.fund_man.setDisplayRanks([[370761,3],[370775,5],[762605,1],[762635,2],[370751,4],[370753,7],[370755,8],[370745,6],[370759,9]])
        self.p_width = 595.27
        self.p_height = 841.89
        self.def_font_size = 6
        self.def_leading = 7
        
    def generateReport(self,report_path="MISreport.pdf",as_of_date=datetime.today(),truncate=True):
        if os.access(report_path,os.F_OK):
            try:
                os.remove(report_path)
            except WindowsError:
                os.system("taskkill /F /IM AcroRd32.exe")
                time.sleep(1)
                os.remove(report_path)
        
        self.canv = canvas.Canvas(report_path)
        
        firms = sorted(self.fund_man.firms.values(),key = lambda firm: firm.name)
        
        for f in firms:
            funds = sorted(f.funds.values(),key = lambda fund: fund.name)
            for fund in funds:
                overflow_data = {}
                is_overflow = False
                
                self.cur_fund = fund
                f = self.cur_fund
                
                #-----------------------TITLE-------------------------
                self.drawTitle(as_of_date)
                
                #-----------------------GENERAL INFO-------------------------
                lines = [f.address,f.city + ", " + f.state + " " + f.postal_code,f.phone,f.website[0:25]]
                font = ["Helvetica",self.def_font_size]
                gen_dx = self.getWidth(lines,font,45) + 10
                if gen_dx < 190:
                    gen_dx = 190
                gen_x = 10
                gen_dy = 8*self.def_leading + 25
                gen_y = 785 - gen_dy 
                self.drawGeneralInfo(gen_x, gen_y, gen_dx, gen_dy)
                
                #-----------------------TERM INFO-------------------------
                term_dx = 405 - (gen_x + gen_dx)
                term_x = gen_x + gen_dx
                term_dy = gen_dy
                term_y = gen_y
                self.drawTermInfo(term_x, term_y, term_dx, term_dy)
                
                #-----------------------FEE INFO-------------------------            
                fee_dx = 180
                fee_x = 405
                fee_dy = term_dy
                fee_y = term_y
                self.drawFeeInfo(fee_x, fee_y, fee_dx, fee_dy)
                
                #-----------------------DUE DILIGENCE INFO-------------------------            
                due_dx = 190
                due_x = 10
                due_dy = 65
                due_y = fee_y - (due_dy-5)
                self.drawDueDiligenceInfo(due_x, due_y, due_dx, due_dy)
                
                #-----------------------CONTACT INFO-------------------------
                contact_dx = 585 - (due_dx + due_x)
                contact_x = due_dx + due_x
                
                if len(f.firm.party.contacts) <= 2:
                    contact_dy = 25
                elif len(f.firm.party.contacts) < 8:
                    contact_dy = 25 + self.def_leading*(len(f.firm.party.contacts))
                else:
                    contact_dy = 25 + self.def_leading*8
                
                contact_y = fee_y - (contact_dy-5)
                    
                self.drawContactInfo(contact_x, contact_y, contact_dx, contact_dy)
                
                #-----------------------RETURNS-----------------------------
                return_x = 10
                return_dx = 405
                
                count = 0
                tmp_year = 0
                for r in f.returns:
                    if r[0] > f.first_investment_date:
                        if r[0].year != tmp_year:
                            count += 1
                            tmp_year = r[0].year
                
                return_dy = 30 + self.def_leading * count
                if due_y > contact_y:
                    return_y = (contact_y+5) - return_dy
                else:
                    return_y = (due_y+5) - return_dy
                
                self.drawReturnsInfo(return_x, return_y, return_dx, return_dy)
                
                #-----------------------INVESTED IN INFO-------------------------            
                inv_x = 10
                inv_dx = 310
                
                data = []
                total = 0
                count = 2
                for f_id in f.firm.funds.keys():
                    fund = f.firm.funds[f_id]
                    fund_total = 0
                    for p_id in fund.holdings_direct.keys():
                        fund_total += fund.holdings_direct[p_id].amount
                    total += fund_total
                    fund_total = self.formatMoney(fund_total, True)
                    data.append([fund.name,fund_total])
                    count += 1
                total = self.formatMoney(total, True)
                data.append(["Total",total])
             
                inv_dy = count*self.def_leading + 23
                inv_y = (return_y+5) - inv_dy
                self.drawInvestedInfo(inv_x, inv_y, inv_dx, inv_dy, data)
                
                #-----------------------Transactions-----------------------------
                trans_x = 10
                
                cols_num = 0
                row_num = 3.2
                col_titles = []
                trans_dates = []
                transactions = {}
                
                for p_id in f.transaction_index.keys():
                    if self.fund_man.products[p_id].final_fund:
                        trans = f.transaction_index[p_id]
                        for t in trans:
                            if t[0] <= as_of_date:
                                if p_id not in col_titles:
                                    cols_num += 1
                                    col_titles.append(p_id)
                                    transactions[p_id] = {}                            
                                if t[0] not in trans_dates:
                                    trans_dates.append(t[0])
                                    trans_dates = sorted(trans_dates)
                                    row_num += 1
                                if t[0] in transactions[p_id].keys():
                                    transactions[p_id][t[0]].amount += t[1].amount
                                else:
                                    transactions[p_id][t[0]] = t[1]
                spvCol = False
                
                if f.holdings_spv[0] > 0:
                    for p_id in f.spv_first_invest.keys():
                        if f.backstop_id in f.spv_first_invest[p_id].keys():
                            t = f.spv_first_invest[p_id][f.backstop_id]
                            if t[0] not in trans_dates and t[0] <= as_of_date:
                                spvCol = True
                                trans_dates.append(t[0])
                                trans_dates = sorted(trans_dates)
                                row_num += 1
                            elif t[0] <= as_of_date:
                                spvCol = True
                    cols_num += 1
                
                if spvCol:
                    row_num += 2.4
                
                trans_dx = 310
                trans_dy = 30 + (self.def_leading) * row_num
                trans_y = (inv_y+5) - trans_dy
                
                if trans_y < 0:
                    num = int(math.ceil(float(-1*trans_y)/float(self.def_leading)))
                    trans_y += num*self.def_leading
                    trans_dy -= num*self.def_leading
                    if truncate:
                        for d in trans_dates[0:num]:
                            for p_id in transactions.keys():
                                if d in transactions[p_id].keys():
                                    transactions[p_id].pop(d)
                                    
                        trans_dates = trans_dates[num:len(trans_dates)]
                    else:
                        overflow_data["TRANS"] = [0,0]
                        overflow_data["TRANS"][0] = trans_dates[0:num]
                        overflow_data["TRANS"][1] = {}
                        for d in trans_dates[0:num]:
                            for p_id in transactions.keys():
                                if p_id not in overflow_data["TRANS"][1].keys():
                                    overflow_data["TRANS"][1][p_id] = {}
                                if d in transactions[p_id].keys():
                                    overflow_data["TRANS"][1][p_id][d] = transactions[p_id][d]
                        trans_dates = trans_dates[num:len(trans_dates)]                                
                        is_overflow = True
                
                
                if cols_num > 0:
                    p = self.fund_man.products
                    tmp_titles = []
                    for c in col_titles:
                        tmp_titles.append([c,p[c].disp_rank])
                    tmp_titles = sorted(tmp_titles,key=itemgetter(1))
                    sorted_col_titles = []
                    for t in tmp_titles:
                        sorted_col_titles.append(t[0])
                    self.drawTransactionInfo(trans_x,trans_y,trans_dx,trans_dy,sorted_col_titles,trans_dates,transactions,cols_num,spvCol)
                
                #-----------------------STATISTICS INFO-------------------------            
                stats_x = (trans_dx+trans_x)-5
                stats_dx = ((return_x+return_dx)-stats_x)
                stats_dy = 11*self.def_leading + 23
                stats_y = (return_y+5) - stats_dy
                self.drawStatistics(stats_x, stats_y, stats_dx, stats_dy)
                
                #-----------------------MCP SCORE INFO-------------------------            
                score_x = stats_x
                score_dx = stats_dx
                score_dy = 8*self.def_leading + 23
                score_y = (stats_y+5) - score_dy
                self.drawMCPScores(score_x, score_y, score_dx, score_dy)
                
                #-----------------------MEETING INFO-------------------------            
                meeting_x = stats_x
                meeting_dx = stats_dx
                
                tmp_data = f.firm.meetings
                data = []
                for m in tmp_data:
                    if m[0] < as_of_date:
                        data.append(m)
                
                meeting_dy = len(data)*self.def_leading + 23
                meeting_y = (score_y+5) - meeting_dy
                
                if meeting_y < 0:
                    num = int(math.ceil(float(-1*meeting_y)/float(self.def_leading)))
                    meeting_y += num*self.def_leading
                    meeting_dy -= num*self.def_leading
                    tmp_data = sorted(data,key=itemgetter(0))
                    if truncate:
                        tmp_data = tmp_data[num:len(tmp_data)]
                        data = sorted(tmp_data,key=itemgetter(0),reverse=True)
                    else:
                        overflow_data["MEETINGS"] = sorted(tmp_data[0:num],key=itemgetter(0),reverse=True)
                        is_overflow = True
                        tmp_data = tmp_data[num:len(tmp_data)]
                        data = sorted(tmp_data,key=itemgetter(0),reverse=True)
                            
                self.drawMeetingInfo(meeting_x, meeting_y, meeting_dx, meeting_dy,data)
                         
                #-----------------------AUM AND EXPOSURE INFO-------------------------            
                aum_x = (return_x+return_dx)-5
                aum_dx = (585-aum_x)
                
                data = {}
                for a in f.aum:
                    if a[0] >= f.first_investment_date:
                        if a[0] in data.keys():
                            data[a[0]][0] = a[1]
                        else:
                            data[a[0]] = [a[1],"empty","empty","empty","empty"]
                for a in f.firm.aum:
                    if a[0] >= f.first_investment_date:
                        if a[0] in data.keys():
                            data[a[0]][1] = a[1]
                        else:
                            data[a[0]] = ["empty",a[1],"empty","empty","empty"]
                for e in f.exposures:
                    if e[0] >= f.first_investment_date:
                        if e[0] in data.keys():
                            data[e[0]][2] = e[1]
                            data[e[0]][3] = e[2]
                            data[e[0]][4] = e[3]
                        else:
                            data[e[0]] = ["empty","empty",e[1],e[2],e[3]]
                        
                aum_dy = len(data.keys())*self.def_leading + 34
                aum_y = (return_dy+return_y) - aum_dy
    
                if aum_y < 0:
                    overflow_data["AUM_EXP"] = {}
                    num = int(math.ceil(float(-1*aum_y)/float(self.def_leading)))
                    aum_y += num*self.def_leading
                    aum_dy -= num*self.def_leading
                    tmp_dates = sorted(data.keys())
                    for d in tmp_dates[0:num]:
                        if truncate:
                            data.pop(d)
                        else:
                            overflow_data["AUM_EXP"][d] = data.pop(d)
                            is_overflow = True
                                   
                self.drawAUMandExpData(aum_x, aum_y, aum_dx, aum_dy, data)
                
                self.canv.showPage()
                
                #--------------------Overflow Page------------------------------            
                if truncate == False:
                    if is_overflow:
                        if "TRANS" in overflow_data.keys():
                            trans_dates = overflow_data["TRANS"][0]
                            transactions = overflow_data["TRANS"][1]
                            trans_dy = 30 + (self.def_leading) * len(trans_dates)
                            trans_y = (830) - trans_dy
                            self.drawTransactionInfo(trans_x,trans_y,trans_dx,trans_dy,col_titles,trans_dates,transactions,cols_num,spvCol,True)
                        if "MEETINGS" in overflow_data.keys():
                            data = overflow_data["MEETINGS"]
                            meeting_dy = len(data)*self.def_leading + 23
                            meeting_y = (830) - meeting_dy
                            self.drawMeetingInfo(meeting_x,meeting_y,meeting_dx,meeting_dy,data)
                        if "AUM_EXP" in overflow_data.keys():
                            data = overflow_data["AUM_EXP"]
                            aum_dy = len(data.keys())*self.def_leading + 34
                            aum_y = (830) - aum_dy
                            self.drawAUMandExpData(aum_x,aum_y,aum_dx,aum_dy,data)
                    self.canv.showPage()
        
        self.canv.save()
    
    def drawTitle(self,as_of_date):
        c = self.canv
        f = self.cur_fund
        
        c.setFont("Helvetica-Bold",14)
        c.drawString(13,808,f.name)
        c.drawString(415,808,"Data As Of: " + as_of_date.strftime("%m/%d/%Y"))
        c.setFont("Helvetica",11)
        c.drawString(13,791,f.firm.name)
        c.drawString(415,791,datetime.today().strftime("Reported: %m/%d/%y, %I:%M %p"))         
                    
    def drawGeneralInfo(self,x_origin,y_origin,dx,dy):
        c = self.canv
        f = self.cur_fund
        
        c.rect(x_origin+5,y_origin+5,dx-10,dy-20)
        
        x = x_origin + 7
        y = (y_origin + dy)-10
        c.setFont("Times-BoldItalic",9)
        c.drawString(x,y,"General Info")
        
        x = x_origin + 10
        y = (y_origin + dy)-22
        
        general_type = c.beginText(x,y)
        general_content = c.beginText(x+45,y)
        
        general_content.setFont("Helvetica",self.def_font_size)
        general_type.setFont("Helvetica-Bold",self.def_font_size)
        general_content.setLeading(self.def_leading)
        general_type.setLeading(self.def_leading)
        
        tmp_text = f.address + "\n" + f.city + ", " + f.state + " " + f.postal_code + "\n"
        tmp_text += f.phone + "\n"
        if len(f.website) > 28:
            tmp_text += f.website[0:28] + "\n" + f.website[28:56]
        else:
            tmp_text += f.website[0:28]
        general_content.textLines(tmp_text)
        general_type.textLines("Address:\n\nPhone:\nWebsite")
        c.drawText(general_content)
        c.drawText(general_type)        
    
    def drawTermInfo(self,x_origin,y_origin,dx,dy):
        c = self.canv
        f = self.cur_fund
        
        c.rect(x_origin+5,y_origin+5,dx-10,dy-20)
        
        x = x_origin + 7
        y = (y_origin + dy)-10
        c.setFont("Times-BoldItalic",9)
        c.drawString(x,y,"Terms")
        
        x = x_origin + 10
        y = (y_origin + dy)-22
        
        general_type = c.beginText(x,y)
        general_content = c.beginText(x+75,y)
        
        general_content.setFont("Helvetica",self.def_font_size)
        general_type.setFont("Helvetica-Bold",self.def_font_size)
        general_content.setLeading(self.def_leading)
        general_type.setLeading(self.def_leading)
        
        type_text = "Firm Type:\n"
        content_text = ""
        if len(f.type) > 24:
            type_text += "\n"
            content_text = f.type[0:24] + "\n" + f.type[24:48] + "\n"
        else:
            content_text = f.type[0:24] + "\n"
        
        type_text += "Incept. Date:\nMCP 1st Invest:\nK-1 History:\nERISA Capacity:\nInvest. Status:"           
        content_text += f.incept_date.strftime("%m/%d/%Y") + "\n"
        content_text += f.first_investment_date.strftime("%m/%d/%Y") + "\n"
        content_text += f.k1_history + "\n" + f.erisa_cap + "\n" + f.status
        
        general_content.textLines(content_text)
        general_type.textLines(type_text)
        c.drawText(general_content)
        c.drawText(general_type) 
    
    def drawFeeInfo(self,x_origin,y_origin,dx,dy):
        c = self.canv
        f = self.cur_fund
        
        c.rect(x_origin+5,y_origin+5,dx-10,dy-20)
        
        x = x_origin + 7
        y = (y_origin + dy)-10
        c.setFont("Times-BoldItalic",9)
        c.drawString(x,y,"Fee Structure")
        
        x = x_origin + 10
        y = (y_origin + dy)-22
        
        general_type = c.beginText(x,y)
        general_content = c.beginText(x+85,y)
        
        general_content.setFont("Helvetica",self.def_font_size)
        general_type.setFont("Helvetica-Bold",self.def_font_size)
        general_content.setLeading(self.def_leading)
        general_type.setLeading(self.def_leading)
        
        type_text = "Mgmt. Fee:\nIncent. Fee\nRedemptions:\nRed. Notice\nHard Lock (Mts):\nSoft Lock (Mts):\nGate %:\nMax Sidepock %:"           
        content_text = str(f.management_fee) + "\n" + str(f.incentive_fee) + "\n"
        content_text += str(f.redemptions) + "\n" + str(f.redemption_notice) + "\n"
        content_text += str(f.hard_lockup) + "\n" + str(f.soft_lockup) + "\n"
        content_text += str(f.gate_percentage) + "\n" + str(f.side_pocket_percentage) + "\n"
        
        general_content.textLines(content_text)
        general_type.textLines(type_text)
        c.drawText(general_content)
        c.drawText(general_type)
    
    def drawDueDiligenceInfo(self,x_origin,y_origin,dx,dy):
        c = self.canv
        f = self.cur_fund
        
        c.rect(x_origin+5,y_origin+5,dx-10,dy-20)
        
        x = x_origin + 7
        y = (y_origin + dy)-10
        c.setFont("Times-BoldItalic",9)
        c.drawString(x,y,"Due Diligence")
        
        x = x_origin + 10
        y = (y_origin + dy)-22
        
        general_type = c.beginText(x,y)
        general_content = c.beginText(x+75,y)
        
        general_content.setFont("Helvetica",self.def_font_size)
        general_type.setFont("Helvetica-Bold",self.def_font_size)
        general_content.setLeading(self.def_leading)
        general_type.setLeading(self.def_leading)
        
        type_text = "Back. Invest:\nCPA Check:\nPrime B. Check:\nIs RIA:\nRIA Adv. Date:\nSEC Reg. Date:"
                   
        content_text = str(f.firm.back_invest_info[0:22]) + "\n" + str(f.firm.cpa_firm_ref_check[0:22]) + "\n"
        content_text += str(f.firm.prime_broker_ref_checks[0:22]) + "\n" + str(f.firm.is_ria) + "\n"
        content_text += f.firm.ria_adv_date + "\n" + f.firm.sec_reg_date + "\n"
        
        general_content.textLines(content_text)
        general_type.textLines(type_text)
        c.drawText(general_content)
        c.drawText(general_type)
    
    def drawContactInfo(self,x_origin,y_origin,dx,dy):
        c = self.canv
        f = self.cur_fund
        
        c.rect(x_origin+5,y_origin+5,dx-10,dy-20)
        
        x = x_origin + 7
        y = (y_origin + dy)-10
        c.setFont("Times-BoldItalic",9)
        c.drawString(x,y,"Contacts")
        
        x = x_origin + 10
        y = (y_origin + dy)-22
        
        names = c.beginText(x,y)
        positions = c.beginText(x+85,y)
        phones = c.beginText(x+175,y)
        emails = c.beginText(x+240,y)
                
        names.setFont("Helvetica",self.def_font_size)
        positions.setFont("Helvetica",self.def_font_size)
        phones.setFont("Helvetica",self.def_font_size)
        emails.setFont("Helvetica",self.def_font_size)
        names.setLeading(self.def_leading)
        positions.setLeading(self.def_leading)
        phones.setLeading(self.def_leading)
        emails.setLeading(self.def_leading)
        
        c_arr = f.firm.party.contacts
        names_text = ""
        positions_text = ""
        phones_text = ""
        emails_text = ""
        for var in range(0,len(c_arr)):
            if var < 8:
                tmp_c = c_arr[var]
                names_text += tmp_c.name[0:22] + "\n"
                positions_text += tmp_c.position[0:22] + "\n"
                phones_text += tmp_c.phone + "\n"
                emails_text += tmp_c.email[0:27] + "\n"
                        
        names.textLines(names_text)
        positions.textLines(positions_text)
        phones.textLines(phones_text)
        emails.textLines(emails_text)
        c.drawText(names)
        c.drawText(positions)
        c.drawText(phones)
        c.drawText(emails)
    
    def drawReturnsInfo(self,x_origin,y_origin,dx,dy):
        c = self.canv
        f = self.cur_fund
        
        col_x = float(dx - 33)/float(13)
        c.setFont("Helvetica",self.def_font_size)
        
        c.rect(x_origin+5,y_origin+5,dx-10,dy-10)
        c.setFillColorRGB(0,.9,1)
        c.rect(x_origin+5,(y_origin+dy-20),dx-10,15,fill=1)
        c.setFillColorRGB(0,0,0)
        c.line(x_origin+28,y_origin+5,x_origin+28,(y_origin+dy-20))
        c.line((x_origin+dx-(5+col_x)),y_origin+5,(x_origin+dx-(5+col_x)),(y_origin+dy-20))
        
        months = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","YTD"]
        for var in range(1,len(months)):
            x = x_origin+28 + (col_x)*((var-1)+.5)
            y = (y_origin+dy)-15
            c.drawCentredString(x,y,months[var])

        for row in range(0,len(f.returns_years)):
            year = f.returns_years[row]
            for col in range(0,len(months)):
                y = (y_origin+dy)-(29+self.def_leading*row)
                tmp_str = ""
                if col == 0:
                    x = x_origin+16.5
                    tmp_str = str(year)
                    c.setFillColorRGB(0,0,0)
                elif col > 0 and col < 13:
                    x = x_origin+28 + (col_x)*((col-1)+.5)
                    d = datetime(year,col,1)
                    if d >= f.first_investment_date and d in f.returns_index.keys():
                        ret = 100*f.returns_index[d]
                        if ret < 0:
                            ret *= -1
                            tmp_str = "(" + str("%.2f" % ret) + "%)"
                            c.setFillColorRGB(1,0,0)
                        else:
                            tmp_str = str("%.2f" % ret) + "%"
                            c.setFillColorRGB(0,0,0)
                else:
                    x = x_origin+28 + (col_x)*((col-1)+.5)       
                    ret = 100*f.returns_index[year]
                    if ret < 0:
                        ret *= -1
                        tmp_str = "(" + str("%.2f" % ret) + "%)"
                        c.setFillColorRGB(1,0,0)
                    else:
                        tmp_str = str("%.2f" % ret) + "%"
                c.drawCentredString(x,y,tmp_str)
                c.setFillColorRGB(0,0,0) 
                
    def drawTransactionInfo(self,x_origin,y_origin,dx,dy,col_titles,trans_dates,transactions,cols_num,hasSPVcolumn,drawOverflow=False):
        c = self.canv
        f = self.cur_fund
        
        first_invest = f.spv_first_invest
        col_x = (dx-50.0)/float(cols_num)
        
        c.setFont("Helvetica",self.def_font_size)
        
        c.rect(x_origin+5,y_origin+5,dx-10,dy-10)
        c.setFillColorRGB(0,.9,1)
        c.rect(x_origin+5,(y_origin+dy-20),dx-10,15,fill=1)
        c.setFillColorRGB(0,0,0)
        c.line(x_origin+45,y_origin+5,x_origin+45,y_origin+dy-20)
        
        for var in range(1,cols_num):
            x1 = x_origin+45+var*col_x
            y1 = y_origin+5
            x2 = x1
            y2 = y_origin+dy-20
            c.line(x1,y1,x2,y2)
        
        for var in range(0,len(col_titles)):
            p_id = col_titles[var]
            name = self.fund_man.products[p_id].name
            short_name = self.getAcronym(name)
            x = x_origin+45 + (col_x)/2.0 + (var)*col_x
            y = y_origin + dy - 15
            c.drawCentredString(x,y,short_name)
        
        if hasSPVcolumn:
            x = x_origin+45 + (col_x)/2.0 + (cols_num-1)*col_x
            y = y_origin + dy - 15
            c.drawCentredString(x,y,"SPV")
        
        totals = {"SPV":0}
        cum_gain = {"SPV":0}
        for var in range(0,len(trans_dates)):
            d = trans_dates[var]
            x = x_origin + 25
            y = y_origin + dy - (28+var*(self.def_leading))
            c.drawCentredString(x,y,d.strftime("%m/%d/%y"))
            for var in range(0,len(col_titles)):
                p_id = col_titles[var]
                if p_id not in totals.keys():
                    totals[p_id] = 0
                if d in transactions[p_id].keys():
                    amount = transactions[p_id][d].amount
                    totals[p_id] += amount
                    amnt_str = self.formatMoney(amount,True)
                    x2 = x_origin+45 + (col_x)/2.0 + (var)*col_x
                    if amount < 0:
                        c.setFillColorRGB(1,0,0)
                    c.drawCentredString(x2,y,amnt_str)
                    c.setFillColorRGB(0,0,0)
            if hasSPVcolumn:
                tot_amount = 0
                for p_id in first_invest.keys():
                    if f.backstop_id in first_invest[p_id].keys():
                        t = first_invest[p_id][f.backstop_id]
                        if d == t[0]:
                            tot_amount += t[1]
                if tot_amount != 0:
                    totals["SPV"] += tot_amount
                    x2 = x_origin+45 + (col_x)/2.0 + len(col_titles)*col_x
                    amnt_str = self.formatMoney(tot_amount,True)
                    if tot_amount < 0:
                        c.setFillColorRGB(1,0,0)
                    c.drawCentredString(x2,y,amnt_str)
                    c.setFillColorRGB(0,0,0)
        
        if drawOverflow == False:
            cur_y = y_origin + dy - (29+(len(trans_dates)-1)*(self.def_leading))
            c.line(x_origin+5,cur_y-1.5,x_origin+dx-5,cur_y-1.5)
            col_titles.append("SPV")
                
            x = x_origin + 25
            cur_y -= 9
            c.setFont("Helvetica-Oblique",self.def_font_size)
            c.drawCentredString(x,cur_y,"Subtotal")
            for var in range(0,len(col_titles)):
                p_id = col_titles[var]
                x2 = x_origin+45 + (col_x)/2.0 + var*col_x
                amnt_str = self.formatMoney(totals[p_id], True)
                if p_id != "SPV":
                    if round(totals[p_id]) < 0:
                        c.setFillColorRGB(1,0,0)
                    c.drawCentredString(x2,cur_y,amnt_str)
                    c.setFillColorRGB(0,0,0)
                elif hasSPVcolumn:
                    if round(totals[p_id]) < 0:
                        c.setFillColorRGB(1,0,0)
                    c.drawCentredString(x2,cur_y,amnt_str)
                    c.setFillColorRGB(0,0,0)
            
            x = x_origin + 25
            cur_y -= (self.def_leading)
            c.setFont("Helvetica",self.def_font_size)
            c.drawCentredString(x,cur_y,"Cur. Bal")
            for var in range(0,len(col_titles)):
                p_id = col_titles[var]
                x2 = x_origin+45 + (col_x)/2.0 + var*col_x
                amount = 0
                if p_id == "SPV" and hasSPVcolumn:
                    amount = f.holdings_spv[0]
                else:
                    if p_id in f.holdings_direct.keys():
                        amount = f.holdings_direct[p_id].amount
                    else:
                        amount = 0
                amnt_str = self.formatMoney(amount, True)
                cum_gain[p_id] = (amount - totals[p_id])
                if p_id != "SPV":
                    if round(amount) < 0:
                        c.setFillColorRGB(1,0,0)
                    c.drawCentredString(x2,cur_y,amnt_str)
                    c.setFillColorRGB(0,0,0)
                elif hasSPVcolumn:
                    if round(amount) < 0:
                        c.setFillColorRGB(1,0,0)
                    c.drawCentredString(x2,cur_y,amnt_str)
                    c.setFillColorRGB(0,0,0)
                    
            cur_y -= (self.def_leading)
            c.drawCentredString(x,cur_y,"Cum. Gain")
            for var in range(0,len(col_titles)):
                p_id = col_titles[var]
                x2 = x_origin+45 + (col_x)/2.0 + var*col_x
                amount = cum_gain[p_id]
                amnt_str = self.formatMoney(amount, True)
                if p_id != "SPV":
                    if round(amount) < 0:
                        c.setFillColorRGB(1,0,0)
                    c.drawCentredString(x2,cur_y,amnt_str)
                    c.setFillColorRGB(0,0,0)
                elif hasSPVcolumn:
                    if round(amount) < 0:
                        c.setFillColorRGB(1,0,0)
                    c.drawCentredString(x2,cur_y,amnt_str)
                    c.setFillColorRGB(0,0,0)
            
            if hasSPVcolumn:
                c.line(x_origin+5,cur_y-2,x_origin+dx-5,cur_y-2)
                
                cur_y -= 10
                c.drawCentredString(x,cur_y,"SPV Alloc.")
                for var in range(0,len(col_titles)):
                    p_id = col_titles[var]
                    x2 = x_origin+45 + (col_x)/2.0 + var*col_x
                    if p_id != "SPV":
                        amount = f.holding_reallocations[p_id] 
                        amnt_str = self.formatMoney(amount, True)
                        if round(amount) < 0:
                            c.setFillColorRGB(1,0,0)
                        c.drawCentredString(x2,cur_y,amnt_str)
                        c.setFillColorRGB(0,0,0)
                    elif hasSPVcolumn:
                        amount = (f.holdings_spv[1] - f.holdings_spv[0])
                        amnt_str = self.formatMoney(amount, True)
                        if round(amount) < 0:
                            c.setFillColorRGB(1,0,0)
                        c.drawCentredString(x2,cur_y,amnt_str)
                        c.setFillColorRGB(0,0,0)
                
                cur_y -= (self.def_leading)
                c.setFont("Helvetica-Bold",self.def_font_size)
                c.drawCentredString(x,cur_y,"Total")
                for var in range(0,len(col_titles)):
                    p_id = col_titles[var]
                    x2 = x_origin+45 + (col_x)/2.0 + var*col_x
                    if p_id != "SPV":
                        amount = f.holdings_indirect[p_id].amount 
                        amnt_str = self.formatMoney(amount, True)
                        if round(amount) < 0:
                            c.setFillColorRGB(1,0,0)
                        c.drawCentredString(x2,cur_y,amnt_str)
                        c.setFillColorRGB(0,0,0)
                    elif hasSPVcolumn:
                        amount = f.holdings_spv[1]
                        amnt_str = self.formatMoney(amount, True)
                        if round(amount) < 0:
                            c.setFillColorRGB(1,0,0)
                        c.drawCentredString(x2,cur_y,amnt_str)
                        c.setFillColorRGB(0,0,0)
            col_titles.remove("SPV")
    
    def drawStatistics(self,x_origin,y_origin,dx,dy):
        c = self.canv
        f = self.cur_fund
        
        c.rect(x_origin+5,y_origin+5,dx-10,dy-20)
        
        x = x_origin + 7
        y = (y_origin + dy)-10
        c.setFont("Times-BoldItalic",9)
        c.drawString(x,y,"Statistics")
        
        x = x_origin + 10
        y = (y_origin + dy)-22
        
        general_type = c.beginText(x,y)
        general_content = c.beginText(x+57,y)
        
        general_content.setFont("Helvetica",self.def_font_size)
        general_type.setFont("Helvetica-Bold",self.def_font_size)
        general_content.setLeading(self.def_leading)
        general_type.setLeading(self.def_leading)
        
        types_str = {}
        types_str["Compound Return"]="Comp Ret:"
        types_str["Annualized Geometric Return"]="Ann Geo Ret:"
        types_str["Annualized Arithmetic Standard Deviation"]="Ann Arit Stdev:"
        types_str["Beta"]="Beta:"
        types_str["Alpha"]="Alpha:"
        types_str["Correlation Coefficient"]="Corr Coeff:"
        types_str["Max Drawdown"]="Max Draw:"
        types_str["Sharpe Ratio"]="Sharpe Ratio:"
        types_str["Annualized Up-Capture"]="Ann UpCapt:"
        types_str["Annualized Down-Capture"]="Ann DownCapt:"
        
        types = ["Compound Return","Annualized Geometric Return","Annualized Arithmetic Standard Deviation","Beta","Alpha","Correlation Coefficient","Max Drawdown","Sharpe Ratio","Annualized Up-Capture","Annualized Down-Capture"]
        type_text = ""
        content_text = ""
        
        for s in types:
            type_text += str(types_str[s]) + "\n"
            content_text += str(f.stats[s][1]) + "\n"

        general_content.textLines(content_text)
        general_type.textLines(type_text)
        c.drawText(general_content)
        c.drawText(general_type)            
    
    def drawMCPScores(self,x_origin,y_origin,dx,dy):
        c = self.canv
        f = self.cur_fund
        
        c.rect(x_origin+5,y_origin+5,dx-10,dy-20)
        
        x = x_origin + 7
        y = (y_origin + dy)-10
        c.setFont("Times-BoldItalic",9)
        c.drawString(x,y,"MCP Scores")
        
        x = x_origin + 10
        y = (y_origin + dy)-22
        
        general_type = c.beginText(x,y)
        general_content = c.beginText(x+65,y)
        
        general_content.setFont("Helvetica",self.def_font_size)
        general_type.setFont("Helvetica-Bold",self.def_font_size)
        general_content.setLeading(self.def_leading)
        general_type.setLeading(self.def_leading)
        
        type_text = "Agg. Score:\nCrit. Controls:\nInf. Tech & Sys:\nOrgan.:\nReputation:\nRisk Mgmt:\nTrad. Proc.:\nVal. Date:\n"
        content_text = ""
        for var in range(0,len(f.firm.mcp_score_info)-1):
            score = f.firm.mcp_score_info[var]
            content_text += str(score) + "\n"
                      
        general_content.textLines(content_text)
        general_content.moveCursor(-14,0)
        general_content.textOut(f.firm.mcp_score_info[len(f.firm.mcp_score_info)-1])
        general_type.textLines(type_text)
        
        c.drawText(general_content)
        c.drawText(general_type)
    
    def drawAUMandExpData(self,x_origin,y_origin,dx,dy,data):
        c = self.canv
        
        c.rect(x_origin+5,y_origin+5,dx-10,dy-10)
        c.setFillColorRGB(0,.9,1)
        c.rect(x_origin+5,(y_origin+dy-20),dx-10,15,fill=1)
        c.setFillColorRGB(0,0,0)
        c.line(x_origin+31,y_origin+5,x_origin+31,(y_origin+dy-20))
        c.line(x_origin+106,y_origin+5,x_origin+106,(y_origin+dy-20))
        
        x = x_origin + 7
        y = (y_origin + dy)-15
        c.setFont("Helvetica-Bold",self.def_font_size)
        titles = ["Fund AUM","Firm AUM","GL","GS","Net"]
        c.setFont("Helvetica",self.def_font_size)
        x_offsets = [x_origin+52,x_origin+88,x_origin+116,x_origin+136,x_origin+156]
        for var in range(0,len(titles)):
            x = x_offsets[var]
            c.drawCentredString(x,y,titles[var])

        dates = data.keys()
        dates = sorted(dates,reverse=True)
        
        for var in range(0,len(dates)):
            d = dates[var]
            x = x_origin + 18
            y = (y_origin + dy) - (29+self.def_leading*var)
            c.drawCentredString(x,y,d.strftime("%m/%d/%y"))
            for col in range(0,len(data[d])):
                x = x_offsets[col]
                if col == 0 or col == 1:
                    if data[d][col] != "empty":
                        tmp_str = self.formatMoney(data[d][col]/(1000000),True)
                        tmp_str += " mil"
                    else:
                        tmp_str = ""
                else:
                    if data[d][col] != "empty":
                        tmp_str = str("%d" % round(100.0*data[d][col])) + "%"
                    else:
                        tmp_str = ""
                c.drawCentredString(x,y,tmp_str)
    
    def drawInvestedInfo(self,x_origin,y_origin,dx,dy,data):
        c = self.canv
        
        c.rect(x_origin+5,y_origin+5,dx-10,dy-20)
        
        x = x_origin + 7
        y = (y_origin + dy)-10
        c.setFont("Times-BoldItalic",9)
        c.drawString(x,y,"Invested In")
        
        x = x_origin + 10
        y = (y_origin + dy)-22
        
        general_type = c.beginText(x,y)
        general_content = c.beginText(x+200,y)
        
        general_content.setFont("Helvetica",self.def_font_size)
        general_type.setFont("Helvetica-Bold",self.def_font_size)
        general_content.setLeading(self.def_leading)
        general_type.setLeading(self.def_leading)
        
        type_text = ""
        content_text = ""
        
        for d in data:
            if d[0] != "Total":
                type_text += d[0] + "\n"
                content_text += d[1] + "\n"
            else:
                type_text += "\nTotal"
                content_text += "\n" + d[1]
            
        general_content.textLines(content_text)
        general_type.textLines(type_text)
        
        c.drawText(general_content)
        c.drawText(general_type)
    
    def drawMeetingInfo(self,x_origin,y_origin,dx,dy,data):
        c = self.canv
        
        c.rect(x_origin+5,y_origin+5,dx-10,dy-20)
        
        x = x_origin + 7
        y = (y_origin + dy)-10
        c.setFont("Times-BoldItalic",9)
        c.drawString(x,y,"Meetings")
        
        x = x_origin + 10
        y = (y_origin + dy)-22       

        c.setFont("Helvetica",self.def_font_size)
        
        for d in data:
            c.drawString(x,y,d[0].strftime("%m/%d/%y"))
            c.drawString(x+30,y,d[1].type[0:17])
            y -= self.def_leading
            
    def getWidth(self,lines,font,offset):
        c = self.canv
        min_width = 0
        
        for l in lines:
            if c.stringWidth(l,font[0],font[1]) > min_width:
                min_width = c.stringWidth(str(l),font[0],font[1])
        
        return (min_width + offset)    
    
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

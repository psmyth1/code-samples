from win32com.client import Dispatch  # @UnresolvedImport
from utils.CheckFilename import CheckFilename  # @UnresolvedImport

class ExportExcel:
    def __init__(self, output, output_path, filename):
        self.output = output
        
        if output_path[len(output_path)-1] == '/':
            output_path = output_path[0:len(output_path)-1]
        
        if output_path.count("/") > 0:
            final_path = ""
            pieces = output_path.split("/")
            for p in pieces:
                final_path += p + "\\"
            output_path = final_path
            
        self.o_path = output_path
        self.filename = filename
    
    def toExcel(self):
        #Instantiate win32com client excel object and create common objects
        xl = Dispatch("Excel.Application")
        xl.Visible = True
        xl.Workbooks.Add()
        wb = xl.ActiveWorkbook
        shts = wb.Sheets
        
        #Check for file with current path and name, change it if need be, save it
        checker = CheckFilename(self.o_path, self.filename)
        filename = checker.checkName()
        wb.SaveAs(filename)
        
        shts("Sheet1").Delete
        shts("Sheet2").Delete
        shts("Sheet3").Delete
        
        keys = self.output.keys()
        
        for sheet in keys:
            xl.Worksheets.Add().Name = sheet
            sht = shts(sheet)
            r,c = 1,1
            export = self.output[sheet]
            for row in export:
                c = 1
                for cell in row:
                    sht.Cells(r,c).Value = cell
                    c+=1
                r+=1
            
        xl.ActiveWorkbook.Save()

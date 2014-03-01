import os

class CheckFilename:
    def __init__(self, path, name):
        self.path= path
        self.name = name
        
    def checkName(self):
        xext = self.path + self.name
        if not os.access(xext + ".xls", os.F_OK):
            return xext + ".xls"
        else:
            count = 1
            while os.access(xext + "(" + str(count) + ")" + ".xls", os.F_OK):
                count = count + 1
            return xext + "(" + str(count) + ")" + ".xls"
                
        
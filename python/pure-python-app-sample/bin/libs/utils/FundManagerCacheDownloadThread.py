import threading
import ctypes

def _async_raise(tid, excobj):
    res = ctypes.pythonapi.PyThreadState_SetAsyncExc(tid, ctypes.py_object(excobj))
    if res == 0:
        raise ValueError("nonexistent thread id")
    elif res > 1:
        ctypes.pythonapi.PyThreadState_SetAsyncExc(tid, 0)
        raise SystemError("PyThreadState_SetAsyncExc failed")

class FundManagerCacheDownloadThread(threading.Thread):
    def __init__(self,m_updater,as_of_date,loadArr = [True,True,True,True,True,True,True,True,True,True,True]):
        self.load_arr = loadArr
        self.m = m_updater
        self.as_of_date = as_of_date
        self.status = 1
        threading.Thread.__init__ ( self )
        
    def run(self):
        self.m.clearCache()
        if self.load_arr[0]:
            self.m.loadFundData(self.as_of_date)
            self.status += 1
        if self.load_arr[1]:
            self.m.loadProductData(self.as_of_date)
            self.status += 1
        if self.load_arr[2]:
            self.m.loadContactsData(self.as_of_date)
            self.status += 1
        if self.load_arr[3]:
            self.m.loadTransactionData(self.as_of_date)
            self.status += 1
        if self.load_arr[4]:
            self.m.loadInternalTransactionData(self.as_of_date)
            self.status += 1
        if self.load_arr[5]:
            self.m.loadMeetingsData()
            self.status += 1
        if self.load_arr[6]:
            self.m.loadExposureData(self.as_of_date)
            self.status += 1
        if self.load_arr[7]:
            self.m.loadHoldingsData(self.as_of_date)
            self.status += 1
        if self.load_arr[8]:
            self.m.loadAumData(self.as_of_date)
            self.status += 1
        if self.load_arr[9]:
            self.m.loadReturnsData(self.as_of_date)
            self.status += 1
        if self.load_arr[10]:
            self.m.loadStatisticsData(self.as_of_date)
            self.status += 1
    
    def _get_my_tid(self):
        if not self.isAlive():
            raise threading.ThreadError("the thread is not active")
        if hasattr(self, "_thread_id"):
            return self._thread_id
        for tid, tobj in threading._active.items():
            if tobj is self:
                self._thread_id = tid
                return tid
    
    def terminate(self):
        _async_raise( self._get_my_tid(), SystemExit )
from utils.CacheUpdater import CacheUpdater
import threading
import ctypes


def _async_raise(tid, excobj):
    res = ctypes.pythonapi.PyThreadState_SetAsyncExc(tid, ctypes.py_object(excobj))
    if res == 0:
        raise ValueError("nonexistent thread id")
    elif res > 1:
        ctypes.pythonapi.PyThreadState_SetAsyncExc(tid, 0)
        raise SystemError("PyThreadState_SetAsyncExc failed")
    
class ManagerListThread(threading.Thread):
    def __init__(self,path,type):
        self.path = path        
        self.status = 1
        self.type = type
        threading.Thread.__init__ ( self )
        
    def run(self):
        c = CacheUpdater(self.path,True)
        if self.type == 1:
            c.updateStatsFundList()
        elif self.type == 2:
            c.updateStatsPGList()
        self.status = 2
    
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
import threading
import ctypes
from pythoncom import CoInitialize

def _async_raise(tid, excobj):
    res = ctypes.pythonapi.PyThreadState_SetAsyncExc(tid, ctypes.py_object(excobj))
    if res == 0:
        raise ValueError("nonexistent thread id")
    elif res > 1:
        ctypes.pythonapi.PyThreadState_SetAsyncExc(tid, 0)
        raise SystemError("PyThreadState_SetAsyncExc failed")
    
class StatsManagerThread(threading.Thread):
    def __init__(self,stats_obj,args):
        self.stats = stats_obj
        self.args = args 
        self.status = 1           
        threading.Thread.__init__ ( self )
    
    def run(self):
        args = self.args
        CoInitialize()
        if args[0] == 1:
            self.stats.generateStandardReport(args[1],args[2],args[3],args[4],args[5],args[6],args[7],args[8])
        elif args[0] == 2:
            self.stats.generatePGReport(args[1],args[2],args[3],args[4],args[5],args[6],args[7],args[8])
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
    
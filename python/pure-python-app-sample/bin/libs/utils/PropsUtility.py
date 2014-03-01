import os
from datetime import datetime,date
import cPickle

class PropsUtility:
    def __init__(self):
        self.data = {}
        self.defaults = {'BIN_DIR':os.getcwd(),
                         'CONF_DIR':os.path.join(os.getcwd(),'../conf'),
                         'CACHE_DIR':os.path.join(os.getcwd(),'../conf/cache'),
                         'LOG_DIR':os.path.join(os.getcwd(),'../logs'),
                         'OUTPUT_DIR':os.path.join(os.getcwd(),'../output'),
                         'APP_ROOT':os.path.join(os.getcwd(),'..'),
                         'NET_CACHE_PATH':os.path.normpath("R:/BACKSTOP/cache_root/"),
                         'VERSION_NUM':1.0}                
        self.load_envs()
        
        self.data['CACHE_PATH'] = os.path.join(self.data['CACHE_DIR'],os.getenv("username"))
        self.data['OUTPUT_PATH'] = os.path.join(self.data['OUTPUT_DIR'],os.getenv("username"))
                
        self.load_version_file(os.path.join(self.data['CONF_DIR'],"current_version.dat"))
        self.load_conf_file(os.path.join(self.data['CONF_DIR'],'mcp_report_manager.conf'))
        
        self.data['STATS_CACHE_PATH'] = os.path.join(self.props.data['NET_CACHE_PATH'],"StatsNew")
        
        for p_t in ['CACHE_PATH','OUTPUT_PATH','STATS_CACHE_PATH']:
            os.makedirs(self.data[p_t])
                
    def load_envs(self):
        for e_v in self.defaults.keys():
            e_val = os.getenv(e_v, None)
            if e_val == None:
                e_val = self.defaults[e_v]
            self.data[e_v] = e_val        
    
    def load_version_file(self,version_file_path):
        self.data['VERSION_NUM'] = self.defaults['VERSION_NUM']
        if os.access(version_file_path, os.F_OK):
            version_file = open(version_file_path)
            ver_str = version_file.read()
            version_file.close()
            self.data['VERSION_NUM'] = float(ver_str)
    
    def load_conf_file(self,conf_file_path):
        if os.access(conf_file_path, os.F_OK):
            conf_file = open(conf_file_path)
            conf_str = conf_file.read()
            conf_file.close()
            
            pieces = conf_str.split("\n")
            for p in pieces:
                p = p.split("=")
                if len(p) == 2:
                    p[0] = p[0].strip()
                    p[1] = p[1].strip()
                    if p[0] == "DEF_NETWORK_CACHE_PATH":
                        self.data['NET_CACHE_PATH'] = os.path.normpath(p[1])
                    if p[0] == "DEF_LOCAL_CACHE_PATH":
                        self.data['CACHE_PATH'] = os.path.normpath(p[1])
                    if p[0] == "DEF_OUTPUT_PATH":
                        self.data['OUTPUT_PATH'] = os.path.normpath(p[1])   
                        
    def load_archive_dates(self):
        mis_archive_path = os.path.join(self.props.data['NET_CACHE_PATH'],"MIS/archived")
        
        mis_dates = []
        for d in os.listdir(mis_archive_path):
            mis_dates.append(datetime.strptime(d,"%Y-%m-%d"))
        self.data['MIS_DATES'] = sorted(mis_dates,reverse=True)

        stats_archive_file_path = os.path.join(self.props.data['NET_CACHE_PATH'],"returns/returns.cache")
                
        stats_dates = []
        if os.access(stats_archive_file_path, os.F_OK):
            tmp_file = open(stats_archive_file_path)
            returns_index = cPickle.load(tmp_file)
            tmp_file.close()        
        
            for year in sorted(returns_index.keys()):
                for month in sorted(returns_index[year].keys()):
                    tmp = date(year,month,1)
                    d = self.getEndOfMonth(tmp.month, tmp.year)
                    stats_dates.append(date(tmp.year,tmp.month,d))
        
        self.data['STATS_DATES'] = sorted(stats_dates,reverse=True)     
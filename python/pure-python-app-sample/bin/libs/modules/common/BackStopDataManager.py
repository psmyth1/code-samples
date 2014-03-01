from suds.client import Client  # @UnresolvedImport
from suds.sax.element import Element  # @UnresolvedImport
from operator import itemgetter
from suds.xsd.doctor import ImportDoctor, Import  # @UnresolvedImport

#from xml.dom import parseString

#import logging
#logging.basicConfig(level=logging.INFO)
#logging.getLogger('suds.client').setLevel(logging.DEBUG)

class BackStopDataManager:
	def __init__(self,username = 'rserch', password = 'r3@$0@p'):
		TNS = (None,'http://backstopsolutions.com/BackstopService')
		self.activated = {}
		
		self.header = Element('LoginInfo', ns=TNS)
		unameNode = Element('Username', ns=TNS)
		passwdNode = Element('Password', ns=TNS)
		
		unameNode.setText(username)
		passwdNode.setText(password)
		
		self.header.append(unameNode)
		self.header.append(passwdNode)
		
		self.bs_acc_data_service_1_1_url = "https://mcphedge.backstopsolutions.com/backstop/services/BackstopAccountingDataService_1_1?wsdl"
		self.activated[self.bs_acc_data_service_1_1_url] = 0

		self.bs_acc_upload_service_1_0_url = "https://mcphedge.backstopsolutions.com/backstop/services/BackstopAccountingUploadService_1_0?wsdl"
		self.activated[self.bs_acc_upload_service_1_0_url] = 0
		
		self.bs_activity_upload_service_1_0_url = "https://mcphedge.backstopsolutions.com/backstop/services/BackstopActivityUploadService_1_0?wsdl"
		self.activated[self.bs_activity_upload_service_1_0_url] = 0
			
		self.bs_admin_service_1_0_url = "https://mcphedge.backstopsolutions.com/backstop/services/BackstopAdminService_1_0?wsdl"
		self.activated[self.bs_admin_service_1_0_url] = 0
		
		self.bs_asset_group_service_1_1_url = "https://mcphedge.backstopsolutions.com/backstop/services/BackstopAssetGroupService_1_1?wsdl"
		self.activated[self.bs_asset_group_service_1_1_url] = 0
		
		self.bs_core_service_1_7_url = "https://mcphedge.backstopsolutions.com/backstop/services/BackstopCoreService_1_7?wsdl"
		self.activated[self.bs_core_service_1_7_url] = 0
		
		self.bs_crm_service_1_4_url = "https://mcphedge.backstopsolutions.com/backstop/services/BackstopCrmService_1_4?wsdl"
		self.activated[self.bs_crm_service_1_4_url] = 0
		
		self.bs_crm_query_service_1_0_url = "https://mcphedge.backstopsolutions.com/backstop/services/BackstopCrmQueryService_1_0?wsdl"
		self.activated[self.bs_crm_query_service_1_0_url] = 0
		
		self.bs_entity_lookup_service_1_0_url = "https://mcphedge.backstopsolutions.com/backstop/services/BackstopEntityLookupService_1_0?wsdl"
		self.activated[self.bs_entity_lookup_service_1_0_url] = 0

		self.bs_investor_query_service_1_0_url = "https://mcphedge.backstopsolutions.com/backstop/services/BackstopInvestorQueryService_1_0?wsdl"
		self.activated[self.bs_investor_query_service_1_0_url] = 0
		
		self.bs_mail_service_1_0_url = "https://mcphedge.backstopsolutions.com/backstop/services/BackstopMailService_1_0?wsdl"
		self.activated[self.bs_mail_service_1_0_url] = 0
		
		self.bs_portfolio_query_service_1_0_url = "https://mcphedge.backstopsolutions.com/backstop/services/BackstopPortfolioQueryService_1_0?wsdl"
		self.activated[self.bs_portfolio_query_service_1_0_url] = 0
		
		self.bs_portfolio_service_1_9_url = "https://mcphedge.backstopsolutions.com/backstop/services/BackstopPortfolioService_1_9?wsdl"
		self.activated[self.bs_portfolio_service_1_9_url] = 0
		
		self.bs_portfolio_upload_service_1_0_url = "https://mcphedge.backstopsolutions.com/backstop/services/BackstopPortfolioUploadService_1_0?wsdl"
		self.activated[self.bs_portfolio_upload_service_1_0_url] = 0
		
		self.bs_relationship_query_service_1_0_url = "https://mcphedge.backstopsolutions.com/backstop/services/BackstopRelationshipQueryService_1_0?wsdl"
		self.activated[self.bs_relationship_query_service_1_0_url] = 0
		
		self.bs_reports_service_1_0_url = "https://mcphedge.backstopsolutions.com/backstop/services/BackstopReportsService_1_0?wsdl"
		self.activated[self.bs_reports_service_1_0_url] = 0
		
		self.bs_service_1_0_url = "https://mcphedge.backstopsolutions.com/backstop/services/BackstopService-1.0?wsdl"
		self.activated[self.bs_service_1_0_url] = 0
	
	def getAccountSeedDataForProductIdAsOf(self,as_of_date,product_id):
		while True:	
			try:
				if self.activated[self.bs_acc_data_service_1_1_url] == 0:
					self.bs_acc_data_service_1_1 = Client(self.bs_acc_data_service_1_1_url)
					self.bs_acc_data_service_1_1.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_acc_data_service_1_1_url] = 1
				
				info = []
				funds = unicode(str(self.bs_acc_data_service_1_1.service.getAccountSeedDataForProductIdAsOf(as_of_date.strftime("%Y-%m-%dT00:00:00-05:00"),product_id)),errors='ignore')
				break
			except Exception as e:
				print e
		
		funds = funds.split("CompleteAccountBalanceInformation[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(CompleteAccountBalanceInformation)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[0] = tmp2[0].strip()
					tmp2[1] = tmp2[1].strip(" \"")
			
					tmp_arr.append([tmp2[0],tmp2[1]])
				info.append(tmp_arr)
		return info
	
	def getAllProductIds(self):
		while True:	
			try:
				if self.activated[self.bs_acc_data_service_1_1_url] == 0:
					self.bs_acc_data_service_1_1 = Client(self.bs_acc_data_service_1_1_url)
					self.bs_acc_data_service_1_1.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_acc_data_service_1_1_url] = 1
				
				ids = []
				account_ids = unicode(str(self.bs_acc_data_service_1_1.service.getAllProductIds()),errors='ignore')
				break
			except Exception as e:
				print e
				
		if account_ids.count(',') > 0:
			tmp = account_ids.split('=')
			tmp2 = tmp[1].split(',')
			for var in range(0,len(tmp2)-1):
				tmp2[var] = tmp2[var].strip()
				ids.append(int(tmp2[var]))
		return ids
	
	def getAllAccountIdsByProduct(self,product_id):
		while True:	
			try:
				if self.activated[self.bs_acc_data_service_1_1_url] == 0:
					self.bs_acc_data_service_1_1 = Client(self.bs_acc_data_service_1_1_url)
					self.bs_acc_data_service_1_1.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_acc_data_service_1_1_url] = 1
				
				product_ids_tmp = self.convertToArrayOfInt([product_id])
				ids = []
				account_ids = unicode(str(self.bs_acc_data_service_1_1.service.getAllAccountIdsByProduct(product_ids_tmp)),errors='ignore')
				break
			except Exception as e:
				print e
		
		if account_ids.count(',') > 0:
			tmp = account_ids.split('=')
			tmp2 = tmp[1].split(',')
			for var in range(0,len(tmp2)-1):
				tmp2[var] = tmp2[var].strip()
				ids.append(int(tmp2[var]))
		return ids
	
	def getAllAccountIds(self):
		while True:	
			try:
				if self.activated[self.bs_acc_data_service_1_1_url] == 0:
					self.bs_acc_data_service_1_1 = Client(self.bs_acc_data_service_1_1_url)
					self.bs_acc_data_service_1_1.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_acc_data_service_1_1_url] = 1
				
				ids = []
				account_ids = unicode(str(self.bs_acc_data_service_1_1.service.getAllAccountIds()),errors='ignore')
				break
			except Exception as e:
				print e

		if account_ids.count(',') > 0:
			tmp = account_ids.split('=')
			tmp2 = tmp[1].split(',')
			for var in range(0,len(tmp2)-1):
				tmp2[var] = tmp2[var].strip()
				ids.append(int(tmp2[var]))
		return ids	
	
	def getAccountValues(self,account_id,start_date,end_date,expose_overrides = False):
		while True:	
			try:
				if self.activated[self.bs_acc_data_service_1_1_url] == 0:
					self.bs_acc_data_service_1_1 = Client(self.bs_acc_data_service_1_1_url)
					self.bs_acc_data_service_1_1.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_acc_data_service_1_1_url] = 1

				account_ids_tmp = self.convertToArrayOfInt([account_id])
				break
			except Exception as e:
				print e
		info = []
		funds = unicode(str(self.bs_acc_data_service_1_1.service.getAccountValues(account_ids_tmp,start_date.strftime("%Y-%m-%dT00:00:00-05:00"),end_date.strftime("%Y-%m-%dT00:00:00-05:00"),expose_overrides)),errors='ignore')
		funds = funds.split("ComprehensiveAccountBalanceInformation[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(ComprehensiveAccountBalanceInformation)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[0] = tmp2[0].strip()
					tmp2[1] = tmp2[1].strip(" \"")
					
					if var2 == 5 or var2 == 6 or var2 == 7:
						tmp_arr.append([tmp2[0],int(tmp2[1])])
					elif var2 == 0 or var2 == 10 or var2 == 11:
						tmp_arr.append([tmp2[0],float(tmp2[1])])
					else:
						tmp_arr.append([tmp2[0],tmp2[1]])
				info.append(tmp_arr)
		return info
						
	def getAccountValuesByProduct(self,product_id,start_date,end_date,expose_overrides=False):
		while True:	
			try:
				if self.activated[self.bs_acc_data_service_1_1_url] == 0:
					self.bs_acc_data_service_1_1 = Client(self.bs_acc_data_service_1_1_url)
					self.bs_acc_data_service_1_1.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_acc_data_service_1_1_url] = 1

				product_ids_tmp = self.convertToArrayOfInt([product_id])
				break
			except Exception as e:
				print e
		
		info = []
		funds = unicode(str(self.bs_acc_data_service_1_1.service.getAccountValuesByProduct(product_ids_tmp,start_date.strftime("%Y-%m-%dT00:00:00-05:00"),end_date.strftime("%Y-%m-%dT00:00:00-05:00"),expose_overrides)),errors='ignore')
		funds = funds.split("ComprehensiveAccountBalanceInformation[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(ComprehensiveAccountBalanceInformation)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[0] = tmp2[0].strip()
					tmp2[1] = tmp2[1].strip(" \"")
			
					if var2 == 5 or var2 == 6 or var2 == 7:
						tmp_arr.append([tmp2[0],int(tmp2[1])])
					elif var2 == 0 or var2 == 10 or var2 == 11:
						tmp_arr.append([tmp2[0],float(tmp2[1])])
					else:
						tmp_arr.append([tmp2[0],tmp2[1]])
				info.append(tmp_arr)
		return info
	
	def getAvailableCurrencies(self):
		#[[currencyCode, symbol]]
		while True:	
			try:
				if self.activated[self.bs_core_service_1_7_url] == 0:
					self.bs_core_service_1_7 = Client(self.bs_core_service_1_7_url)
					self.bs_core_service_1_7.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_core_service_1_7_url] = 1
				
				info = []
				funds = unicode(str(self.bs_core_service_1_7.service.getAvailableCurrencies()),errors='ignore')
				break
			except Exception as e:
				print e	
		
		funds = funds.split("CurrencyDescription[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(CurrencyDescription)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[1] = tmp2[1].strip(" \"")
			
					tmp_arr.append(tmp2[1])
				info.append(tmp_arr)
		return info
	
	def getAvailableBenchmarks(self):
		#[[benchmarkCode, symbol]]
		while True:	
			try:
				if self.activated[self.bs_core_service_1_7_url] == 0:
					self.bs_core_service_1_7 = Client(self.bs_core_service_1_7_url)
					self.bs_core_service_1_7.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_core_service_1_7_url] = 1
				
				info = []
				funds = unicode(str(self.bs_core_service_1_7.service.getAvailableBenchmarks()),errors='ignore')
				break
			except Exception as e:
				print e
		
		funds = funds.split("BenchmarkDescription[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(BenchmarkDescription)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[1] = tmp2[1].strip(" \"")
			
					tmp_arr.append(tmp2[1])
				info.append(tmp_arr)
		return info
		
	def getAvailableFunds(self):
		while True:	
			try:		
				if self.activated[self.bs_core_service_1_7_url] == 0:
					self.bs_core_service_1_7 = Client(self.bs_core_service_1_7_url)
					self.bs_core_service_1_7.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_core_service_1_7_url] = 1
				
				info = []
				funds = unicode(str(self.bs_core_service_1_7.service.getAvailableFunds()),errors='ignore')
				break
			except Exception as e:
				print e	
		
		funds = funds.split("AssetDescription[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(AssetDescription)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("name")
				tmp[0] = tmp[0].strip(" id=\n")
				tmp[1] = tmp[1].strip(" id=\n")
				tmp[1] = tmp[1].strip("\"")
				info.append([int(tmp[0]),tmp[1]])
		return info
	
	def getAvailableFundAccounts(self):
		#[[id, name]]
		while True:	
			try:
				if self.activated[self.bs_core_service_1_7_url] == 0:
					self.bs_core_service_1_7 = Client(self.bs_core_service_1_7_url)
					self.bs_core_service_1_7.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_core_service_1_7_url] = 1
				
				info = []
				funds = unicode(str(self.bs_core_service_1_7.service.getAvailableFundAccounts()),errors='ignore')
				break
			except Exception as e:
				print e	
		
		funds = funds.split("AssetDescription[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(AssetDescription)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[1] = tmp2[1].strip(" \"")
					
					if var2 == 0:
						tmp_arr.append(int(tmp2[1]))
					else:
						tmp_arr.append(tmp2[1])
				info.append(tmp_arr)
		return info
	
	def getFundAccountInformation(self, fund_account_id):
		#[0="Name",1="Id",2="Primary Contact",3="Owner Id",4="Fund Id",5="Admin Account#",6="Closed Date",7="Tax Id",8="GP Account?",9="Investor Type",10="Current Terms",11="Currently Hot Issue Eligible?",12="InceptionDate",13="Other Id",14="Currency"]
		while True:	
			try:
				if self.activated[self.bs_core_service_1_7_url] == 0:
					self.bs_core_service_1_7 = Client(self.bs_core_service_1_7_url)
					self.bs_core_service_1_7.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_core_service_1_7_url] = 1
				
				info = []
				funds = unicode(str(self.bs_core_service_1_7.service.getFundAccountInformation(fund_account_id)),errors='ignore')
				break
			except Exception as e:
				print e
		
		funds = funds.split("AssetInformation[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(AssetInformation)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[1] = tmp2[1].strip(" \"")
					
					if var2 == 1:
						if var == 1 or var == 3 or var == 4:
							tmp_arr.append(int(tmp2[1]))
						else:
							tmp_arr.append(tmp2[1])
					else:
						tmp_arr.append(tmp2[1])
				info.append(tmp_arr)
		return info
	
	def getFundInformation2(self, fund_id):
		while True:	
			try:
				if self.activated[self.bs_core_service_1_7_url] == 0:
					self.bs_core_service_1_7 = Client(self.bs_core_service_1_7_url)
					self.bs_core_service_1_7.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_core_service_1_7_url] = 1
				
				info = []
				funds = unicode(str(self.bs_core_service_1_7.service.getFundInformation(fund_id)),errors='ignore')
				break
			except Exception as e:
				print e		
		funds = funds.split("AssetInformation[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(AssetInformation)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[1] = tmp2[1].strip(" \"")
					
					tmp_arr.append(tmp2[1])
				info.append(tmp_arr)
		return info
	
	def getFundTransactions(self,account_id,start_date,end_date):
		while True:	
			try:
				if self.activated[self.bs_core_service_1_7_url] == 0:
					self.bs_core_service_1_7 = Client(self.bs_core_service_1_7_url)
					self.bs_core_service_1_7.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_core_service_1_7_url] = 1
				
				info = []
				funds = unicode(str(self.bs_core_service_1_7.service.getFundTransactions(account_id,start_date.strftime("%Y-%m-%dT00:00:00-05:00"),end_date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				print e	
		funds = funds.split("FieldValuePair[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(FieldValuePair)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[1] = tmp2[1].strip(" \"")
					
					if var2 == 1:
						if var == 0 or var == 1 or var == 2 or var == 10:
							tmp_arr.append(float(tmp2[1]))
						else:
							tmp_arr.append(tmp2[1])
					else:
						tmp_arr.append(tmp2[1])
				info.append(tmp_arr)
		return info
	
	def getFundTransactionsByProduct(self,product_id,start_date,end_date):
		while True:	
			try:
				if self.activated[self.bs_core_service_1_7_url] == 0:
					self.bs_core_service_1_7 = Client(self.bs_core_service_1_7_url)
					self.bs_core_service_1_7.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_core_service_1_7_url] = 1
				
				info = []
				funds = unicode(str(self.bs_core_service_1_7.service.getFundTransactionsByProduct(product_id,start_date.strftime("%Y-%m-%dT00:00:00-05:00"),end_date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				print e	
		funds = funds.split("TransactionInformationSane[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(TransactionInformationSane)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[0] = tmp2[0].strip()
					tmp2[1] = tmp2[1].strip(" \"")
					
					if var2 == 0 or var2 == 3:
						tmp_arr.append([tmp2[0],int(tmp2[1])])
					elif var2 == 1:
						tmp_arr.append([tmp2[0],float(tmp2[1])])
					else:
						tmp_arr.append([tmp2[0],tmp2[1]])
				info.append(tmp_arr)
		return info
	
	def getMemberAccountBalances(self,account_id,start_date,end_date):
		while True:	
			try:
				if self.activated[self.bs_core_service_1_7_url] == 0:
					self.bs_core_service_1_7 = Client(self.bs_core_service_1_7_url)
					self.bs_core_service_1_7.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_core_service_1_7_url] = 1
				
				info = []
				temp = unicode(str(self.bs_core_service_1_7.service.getMemberAccountBalances(account_id,start_date.strftime("%Y-%m-%dT00:00:00-05:00"),end_date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				print e
		temp = temp.split("MemberAccountBalanceInformation[] =")
		if len(temp) > 1:
			temp = temp[1].strip()
			temp = temp.strip(" {},\n")
			temp = temp.split("(MemberAccountBalanceInformation)")
			temp = temp[1:len(temp)]
			
			for var in range(0,len(temp)):
				temp[var] = temp[var].split("FieldValuePair[] =")
	
				start_date = temp[var][0]
				start_date = start_date.strip(" {}abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ()=\n")
				start_date = start_date.strip("\"")
							
				temp[var] = temp[var][1].strip()
				temp[var] = temp[var].strip(" {},\n")
				temp[var] = temp[var].split("(FieldValuePair)")
				temp[var] = temp[var][1:len(temp[var])]
				
				tmp_arr1 = [["StartDate",start_date]]
				
				for var2 in range(0,len(temp[var])):
					temp[var][var2] = temp[var][var2].strip(" ,{}\n")
					tmp = temp[var][var2].split("\n")
					tmp_arr2 = []
					for var3 in range(0,len(tmp)):
						tmp2 = tmp[var3].split("=")
						tmp2[1] = tmp2[1].strip(" \"")
						
						tmp_arr2.append(tmp2[1])
					tmp_arr1.append(tmp_arr2)
				info.append(tmp_arr1)
		return info
	
	def getMemberAccountBalancesByProduct(self,product_id,start_date,end_date):
		while True:	
			try:
				if self.activated[self.bs_core_service_1_7_url] == 0:
					self.bs_core_service_1_7 = Client(self.bs_core_service_1_7_url)
					self.bs_core_service_1_7.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_core_service_1_7_url] = 1
				
				info = []
				funds = unicode(str(self.bs_core_service_1_7.service.getMemberAccountBalancesByProduct(product_id,start_date.strftime("%Y-%m-%dT00:00:00-05:00"),end_date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("MemberAccountBalanceInformationSane[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(MemberAccountBalanceInformationSane)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[0] = tmp2[0].strip()
					tmp2[1] = tmp2[1].strip(" \"")
					
					if var2 == 1:
						tmp_arr.append([tmp2[0],int(tmp2[1])])
					else:
						tmp_arr.append([tmp2[0],tmp2[1]])
				info.append(tmp_arr)
		return info
	
	def getBenchmarkReturns(self,symbol,start_date,end_date):
		while True:	
			try:
				if self.activated[self.bs_core_service_1_7_url] == 0:
					self.bs_core_service_1_7 = Client(self.bs_core_service_1_7_url)
					self.bs_core_service_1_7.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_core_service_1_7_url] = 1
				
				info = []
				funds = unicode(str(self.bs_core_service_1_7.service.getBenchmarkReturns(symbol,start_date.strftime("%Y-%m-%dT00:00:00-05:00"),end_date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("Return[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(Return)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[0] = tmp2[0].strip()
					tmp2[1] = tmp2[1].strip(" \"")
					
					if var2 == 0 or var2 == 1:
						tmp_arr.append([tmp2[0],float(tmp2[1])])
					else:
						tmp_arr.append([tmp2[0],tmp2[1]])
				info.append(tmp_arr)
		return info
	
	def getBenchmarkAnnualReturns(self,symbol,start_year,end_date):
		while True:	
			try:
				if self.activated[self.bs_core_service_1_7_url] == 0:
					self.bs_core_service_1_7 = Client(self.bs_core_service_1_7_url)
					self.bs_core_service_1_7.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_core_service_1_7_url] = 1
				
				info = []
				funds = unicode(str(self.bs_core_service_1_7.service.getBenchmarkAnnualReturns(symbol,start_year,end_date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("Return[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(Return)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[0] = tmp2[0].strip()
					tmp2[1] = tmp2[1].strip(" \"")
					
					if var2 == 0 or var2 == 1:
						tmp_arr.append([tmp2[0],float(tmp2[1])])
					else:
						tmp_arr.append([tmp2[0],tmp2[1]])
				info.append(tmp_arr)
		return info
	
	def getComprehensiveBenchmarkReturns(self,symbol,as_of_date,rf_bmk_symbol):
		if self.activated[self.bs_core_service_1_7_url] == 0:
			self.bs_core_service_1_7 = Client(self.bs_core_service_1_7_url)
			self.bs_core_service_1_7.set_options(soapheaders=self.header,timeout=1000)
			self.activated[self.bs_core_service_1_7_url] = 1
		
		return self.bs_core_service_1_7.service.getComprehensiveBenchmarkReturns(symbol,as_of_date.strftime("%Y-%m-%dT00:00:00-05:00"),rf_bmk_symbol)
	
	def getCumAndAnnBenchmarkValues(self,symbol,start_date,stop_date,rf_bmk_symbol):
		if self.activated[self.bs_core_service_1_7_url] == 0:
			self.bs_core_service_1_7 = Client(self.bs_core_service_1_7_url)
			self.bs_core_service_1_7.set_options(soapheaders=self.header,timeout=1000)
			self.activated[self.bs_core_service_1_7_url] = 1
		
		return self.bs_core_service_1_7.service.getCumAndAnnBenchmarkValues(symbol,start_date.strftime("%Y-%m-%dT00:00:00-05:00"),stop_date.strftime("%Y-%m-%dT00:00:00-05:00"),rf_bmk_symbol)
	
	def getFundReturns(self,fund_id,start_date,end_date):
		while True:	
			try:
				if self.activated[self.bs_core_service_1_7_url] == 0:
					self.bs_core_service_1_7 = Client(self.bs_core_service_1_7_url)
					self.bs_core_service_1_7.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_core_service_1_7_url] = 1
				
				info = []
				funds = unicode(str(self.bs_core_service_1_7.service.getFundReturns(fund_id,start_date.strftime("%Y-%m-%dT00:00:00-05:00"),end_date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("Return[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(Return)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[0] = tmp2[0].strip()
					tmp2[1] = tmp2[1].strip(" \"")
					
					if var2 == 0 or var2 == 1:
						tmp_arr.append([tmp2[0],float(tmp2[1])])
					else:
						tmp_arr.append([tmp2[0],tmp2[1]])
				info.append(tmp_arr)
		return info
	
	def getMemberAccountIds(self,fund_id):
		while True:	
			try:
				if self.activated[self.bs_core_service_1_7_url] == 0:
					self.bs_core_service_1_7 = Client(self.bs_core_service_1_7_url)
					self.bs_core_service_1_7.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_core_service_1_7_url] = 1
				
				ids = []
				account_ids = unicode(str(self.bs_core_service_1_7.service.getMemberAccountIds(fund_id)),errors='ignore')
				break
			except Exception as e:
				print e

		if account_ids.count(',') > 0:
			tmp = account_ids.split('=')
			tmp2 = tmp[1].split(',')
			for var in range(0,len(tmp2)-1):
				tmp2[var] = tmp2[var].strip()
				ids.append(int(tmp2[var]))
		return ids
	
	def getFundAccountReturns(self,fund_id,start_date,end_date):
		while True:	
			try:
				if self.activated[self.bs_core_service_1_7_url] == 0:
					self.bs_core_service_1_7 = Client(self.bs_core_service_1_7_url)
					self.bs_core_service_1_7.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_core_service_1_7_url] = 1
				
				info = []
				funds = unicode(str(self.bs_core_service_1_7.service.getFundAccountReturns(fund_id,start_date.strftime("%Y-%m-%dT00:00:00-05:00"),end_date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("Return[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(Return)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[0] = tmp2[0].strip()
					tmp2[1] = tmp2[1].strip(" \"")
					
					if var2 == 0 or var2 == 1:
						tmp_arr.append([tmp2[0],float(tmp2[1])])
					else:
						tmp_arr.append([tmp2[0],tmp2[1]])
				info.append(tmp_arr)
		
		return info	
				
	def getFundIds(self):
		while True:	
			try:
				if self.activated[self.bs_service_1_0_url] == 0:
					self.bs_service_1_0 = Client(self.bs_service_1_0_url)
					self.bs_service_1_0.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_service_1_0_url] = 1
				
				ids = []
				fund_ids = unicode(str(self.bs_service_1_0.service.getFundIds()),errors='ignore')
				break
			except Exception as e:
				print e

		tmp = fund_ids.split('=')
		tmp2 = tmp[1].split(',')
		for var in range(0,len(tmp2)-1):
			tmp2[var] = tmp2[var].strip()
			ids.append(int(tmp2[var]))
		return ids
	
	def getFundInformation(self,fund_id):
		while True:	
			try:
				if self.activated[self.bs_service_1_0_url] == 0:
					self.bs_service_1_0 = Client(self.bs_service_1_0_url)
					self.bs_service_1_0.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_service_1_0_url] = 1
				
				info = []
				funds = unicode(str(self.bs_service_1_0.service.getFundInformation(fund_id)),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("StringStringPair[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(StringStringPair)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[1] = tmp2[1].strip(" \"")
					
					tmp_arr.append(tmp2[1])
				info.append(tmp_arr)
		return info	
		
	def getPeerGroupIds(self):
		while True:	
			try:
				if self.activated[self.bs_service_1_0_url] == 0:
					self.bs_service_1_0 = Client(self.bs_service_1_0_url)
					self.bs_service_1_0.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_service_1_0_url] = 1
				
				info = []
				funds = unicode(str(self.bs_service_1_0.service.getPeerGroupIds()),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("StringStringPair[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(StringStringPair)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[1] = tmp2[1].strip(" \"")
					
					tmp_arr.append(tmp2[1])
				info.append(tmp_arr)
		return info
	
	def getHoldingIds(self,fund_id):
		while True:	
			try:
				if self.activated[self.bs_service_1_0_url] == 0:
					self.bs_service_1_0 = Client(self.bs_service_1_0_url)
					self.bs_service_1_0.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_service_1_0_url] = 1
				
				ids = []
				account_ids = unicode(str(self.bs_service_1_0.service.getHoldingIds(fund_id)),errors='ignore')
				break
			except Exception as e:
				print e		
		if account_ids.count(',') > 0:
			tmp = account_ids.split('=')
			tmp2 = tmp[1].split(',')
			for var in range(0,len(tmp2)-1):
				tmp2[var] = tmp2[var].strip()
				ids.append(int(tmp2[var]))
		return ids

	def getHoldingBalances(self,holding_id,start_date,end_date):
		while True:	
			try:
				if self.activated[self.bs_service_1_0_url] == 0:
					self.bs_service_1_0 = Client(self.bs_service_1_0_url)
					self.bs_service_1_0.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_service_1_0_url] = 1
				
				info = []
				funds = unicode(str(self.bs_service_1_0.service.getHoldingBalances(holding_id,start_date.strftime("%Y-%m-%dT00:00:00-05:00"),end_date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				print e		
		funds = funds.split("DateDoubleBooleanTrio[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(DateDoubleBooleanTrio)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[0] = tmp2[0].strip()
					tmp2[1] = tmp2[1].strip(" \"")
					
					if var2 == 1:
						tmp_arr.append([tmp2[0],float(tmp2[1])])
					elif var2 == 0:
						tmp_arr.append([tmp2[0],bool(tmp2[1])])
					else:
						tmp_arr.append([tmp2[0],tmp2[1]])
				info.append(tmp_arr)
		return info
	
	def getHoldingReturns(self,holding_id,start_date,end_date):
		while True:	
			try:
				if self.activated[self.bs_portfolio_service_1_9_url] == 0:
					imp = Import('http://returnentity.webservice.fundbutter.backstopsolutions.com')
					imp.filter.add('http://exposures.returnentity.webservice.fundbutter.backstopsolutions.com')
					imp2 = Import('http://backstopsolutions.com/BackstopService')
					imp2.filter.add('http://exposures.returnentity.webservice.fundbutter.backstopsolutions.com')	
					d = ImportDoctor(imp,imp2)
					self.bs_portfolio_service_1_9 = Client(self.bs_portfolio_service_1_9_url,doctor=d)
					self.bs_portfolio_service_1_9.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_portfolio_service_1_9_url] = 1
				
				info = []
				funds = unicode(str(self.bs_portfolio_service_1_9.service.getHoldingReturns(holding_id,start_date.strftime("%Y-%m-%dT00:00:00-05:00"),end_date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				print e				
		funds = funds.split("Return[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(Return)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[0] = tmp2[0].strip()
					tmp2[1] = tmp2[1].strip(" \"")
					tmp_arr.append([tmp2[0],tmp2[1]])
				info.append(tmp_arr)
		return info
	
	def getHoldingsInProduct(self,product_id,holding_type = "ALL"):
		while True:	
			try:
				if self.activated[self.bs_portfolio_service_1_9_url] == 0:
					imp = Import('http://returnentity.webservice.fundbutter.backstopsolutions.com')
					imp.filter.add('http://exposures.returnentity.webservice.fundbutter.backstopsolutions.com')
					imp2 = Import('http://backstopsolutions.com/BackstopService')
					imp2.filter.add('http://exposures.returnentity.webservice.fundbutter.backstopsolutions.com')	
					d = ImportDoctor(imp,imp2)
					self.bs_portfolio_service_1_9 = Client(self.bs_portfolio_service_1_9_url,doctor=d)
					self.bs_portfolio_service_1_9.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_portfolio_service_1_9_url] = 1
				
				info = []
				funds = unicode(str(self.bs_portfolio_service_1_9.service.getHoldingsInProduct(product_id,holding_type)),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("IntegerId[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(IntegerId)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp2 = funds[var].split("=")
				tmp2[1] = tmp2[1].strip(" \"")
				info.append(int(tmp2[1]))
		return info
	
	def getHedgeFundIds(self):
		while True:	
			try:
				if self.activated[self.bs_service_1_0_url] == 0:
					self.bs_service_1_0 = Client(self.bs_service_1_0_url)
					self.bs_service_1_0.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_service_1_0_url] = 1
				
				ids = []
				account_ids = unicode(str(self.bs_service_1_0.service.getHedgeFundIds()),errors='ignore')
				break
			except Exception as e:
				print e
		if account_ids.count(',') > 0:
			tmp = account_ids.split('=')
			tmp2 = tmp[1].split(',')
			for var in range(0,len(tmp2)-1):
				tmp2[var] = tmp2[var].strip()
				ids.append(int(tmp2[var]))
		return ids
	
	def getHoldingTransactions(self,holding_id,start_date,end_date):
		while True:	
			try:
				if self.activated[self.bs_service_1_0_url] == 0:
					self.bs_service_1_0 = Client(self.bs_service_1_0_url)
					self.bs_service_1_0.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_service_1_0_url] = 1
				
				info = []
				funds = unicode(str(self.bs_service_1_0.service. getHoldingTransactions(holding_id,start_date.strftime("%Y-%m-%dT00:00:00-05:00"),end_date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("HoldingTransaction[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(HoldingTransaction)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[0] = tmp2[0].strip()
					tmp2[1] = tmp2[1].strip(" \"")
					
					if var2 == 2:
						tmp_arr.append([tmp2[0],int(tmp2[1])])
					elif var2 == 0:
						tmp_arr.append([tmp2[0],float(tmp2[1])])
					else:
						tmp_arr.append([tmp2[0],tmp2[1]])
				info.append(tmp_arr)
		return info
	
	def getHedgeFundAums(self,hedge_fund_id,start_date,end_date):
		while True:	
			try:
				if self.activated[self.bs_service_1_0_url] == 0:
					self.bs_service_1_0 = Client(self.bs_service_1_0_url)
					self.bs_service_1_0.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_service_1_0_url] = 1
				
				info = []
				funds = unicode(str(self.bs_service_1_0.service.getHedgeFundAums(hedge_fund_id,start_date.strftime("%Y-%m-%dT00:00:00-05:00"),end_date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("DateDoublePair[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(DateDoublePair)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[0] = tmp2[0].strip()
					tmp2[1] = tmp2[1].strip(" \"")
					
					if var2 == 0:
						tmp_arr.append([tmp2[0],float(tmp2[1])])
					else:
						tmp_arr.append([tmp2[0],tmp2[1]])
				info.append(tmp_arr)
		return info
	
	def getHoldingInformation(self,holding_id):
		while True:	
			try:
				if self.activated[self.bs_service_1_0_url] == 0:
					self.bs_service_1_0 = Client(self.bs_service_1_0_url)
					self.bs_service_1_0.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_service_1_0_url] = 1
				
				info = []
				funds = unicode(str(self.bs_service_1_0.service.getHoldingInformation(holding_id)),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("StringStringPair[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(StringStringPair)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					if len(tmp2) < 2:
						tmp2[0] = tmp2[0].strip()
						info[len(info)-1][1] += tmp2[0]
					else:	
						tmp2[0] = tmp2[0].strip()
						tmp2[1] = tmp2[1].strip(" \"")
						tmp_arr.append(tmp2[1])
				info.append(tmp_arr)
		return info

	def getPeerGroupMemberIds(self,peer_grp_sym,date):
		while True:	
			try:
				if self.activated[self.bs_service_1_0_url] == 0:
					self.bs_service_1_0 = Client(self.bs_service_1_0_url)
					self.bs_service_1_0.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_service_1_0_url] = 1
				
				info = []
				funds = unicode(str(self.bs_service_1_0.service.getPeerGroupMemberIds(peer_grp_sym,date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("TypeIdComposite[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(TypeIdComposite)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[0] = tmp2[0].strip()
					tmp2[1] = tmp2[1].strip(" \"")
					
					if var2 == 1:
						tmp_arr.append(int(tmp2[1]))
				info.append(tmp_arr)
		return info
	
	def getContactIds(self):
		while True:	
			try:
				if self.activated[self.bs_service_1_0_url] == 0:
					self.bs_service_1_0 = Client(self.bs_service_1_0_url)
					self.bs_service_1_0.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_service_1_0_url] = 1
				
				info = []
				funds = unicode(str(self.bs_service_1_0.service.getContactIds()),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("ContactId[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(ContactId)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[0] = tmp2[0].strip()
					tmp2[1] = tmp2[1].strip(" \"")
					
					if var2 == 0:
						tmp_arr.append([tmp2[0],int(tmp2[1])])
					else:
						tmp_arr.append([tmp2[0],tmp2[1]])
				info.append(tmp_arr)
		return info

	def getHedgeFundReturns(self,hedge_fund_id,start_date,end_date):
		print hedge_fund_id, start_date, end_date
		while True:	
			try:
				if self.activated[self.bs_service_1_0_url] == 0:
					self.bs_service_1_0 = Client(self.bs_service_1_0_url)
					self.bs_service_1_0.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_service_1_0_url] = 1
				
				info = []
				funds = unicode(str(self.bs_service_1_0.service.getHedgeFundReturns(hedge_fund_id,start_date.strftime("%Y-%m-%dT00:00:00-05:00"),end_date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				if str(e) == "Server raised fault: 'Unknown driver'":
					print "Bad ID", hedge_fund_id
					f = open("faulty_ids.txt",'a')
					f.write(str(hedge_fund_id) + " on " + start_date.strftime("%m/%d/%Y") + " - " + end_date.strftime("%m/%d/%Y")) 
					funds = False
					break
				else:
					print e
		if funds != False:
			funds = funds.split("Return[] =")
			if len(funds) > 1:
				funds = funds[1].strip()
				funds = funds.strip(" {},\n")
				funds = funds.split("(Return)")
				funds = funds[1:len(funds)]
				
				for var in range(0,len(funds)):
					funds[var] = funds[var].strip(" ,{}\n")
					tmp = funds[var].split("\n")
					tmp_arr = []
					for var2 in range(0,len(tmp)):
						tmp2 = tmp[var2].split("=")
						tmp2[0] = tmp2[0].strip()
						tmp2[1] = tmp2[1].strip(" \"")
						
						if var2 == 0:
							tmp_arr.append([tmp2[0],float(tmp2[1])])
						elif var2 == 1:
							tmp_arr.append([tmp2[0],int(tmp2[1])])
						else:
							tmp_arr.append([tmp2[0],tmp2[1]])
					info.append(tmp_arr)
		else:
			info = False
		return info

	def getHedgeFundInformation(self,hedge_fund_id):
		while True:	
			try:
				if self.activated[self.bs_service_1_0_url] == 0:
					self.bs_service_1_0 = Client(self.bs_service_1_0_url)
					self.bs_service_1_0.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_service_1_0_url] = 1
				
				info = []
				funds = unicode(str(self.bs_service_1_0.service.getHedgeFundInformation(hedge_fund_id)),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("StringStringPair[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(StringStringPair)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					if len(tmp2) < 2:
						tmp2[0] = tmp2[0].strip()
						info[len(info)-1][1] += tmp2[0]
					else:	
						tmp2[0] = tmp2[0].strip()
						tmp2[1] = tmp2[1].strip(" \"")
						tmp_arr.append(tmp2[1])
				info.append(tmp_arr)
		return info
	
	def getAllManagedHoldingInvestors(self):
		if self.activated[self.bs_crm_service_1_4_url] == 0:
			self.bs_crm_service_1_4 = Client(self.bs_crm_service_1_4_url)
			self.bs_crm_service_1_4.set_options(soapheaders=self.header,timeout=1000)
			self.activated[self.bs_crm_service_1_4_url] = 1
			
		return self.bs_crm_service_1_4.service.getAllManagedHoldingInvestors()
	
	def getAllPartyIds(self):
		while True:	
			try:
				if self.activated[self.bs_crm_service_1_4_url] == 0:
					self.bs_crm_service_1_4 = Client(self.bs_crm_service_1_4_url)
					self.bs_crm_service_1_4.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_crm_service_1_4_url] = 1
				
				ids = []
				account_ids = unicode(str(self.bs_crm_service_1_4.service.getAllPartyIds()),errors='ignore')
				break
			except Exception as e:
				print e
		if account_ids.count(',') > 0:
			tmp = account_ids.split('=')
			tmp2 = tmp[1].split(',')
			for var in range(0,len(tmp2)-1):
				tmp2[var] = tmp2[var].strip()
				ids.append(int(tmp2[var]))
		return ids
	
	def getPartyInformation(self,party_id):
		while True:	
			try:
				if self.activated[self.bs_crm_service_1_4_url] == 0:
					self.bs_crm_service_1_4 = Client(self.bs_crm_service_1_4_url)
					self.bs_crm_service_1_4.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_crm_service_1_4_url] = 1
					
				p_id = self.convertToArrayOfInt([party_id])
				info = []
				funds = unicode(str(self.bs_crm_service_1_4.service.getParties(p_id)),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("PartyInformation[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(PartyInformation)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[0] = tmp2[0].strip()
					tmp2[1] = tmp2[1].strip(" \"")
					
					tmp_arr.append([tmp2[0],tmp2[1]])
				info.append(tmp_arr)
		return info
	
	def getAllMeetingAttendees(self):
		while True:	
			try:
				if self.activated[self.bs_crm_service_1_4_url] == 0:
					self.bs_crm_service_1_4 = Client(self.bs_crm_service_1_4_url)
					self.bs_crm_service_1_4.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_crm_service_1_4_url] = 1
				
				info = []
				funds = unicode(str(self.bs_crm_service_1_4.service.getAllMeetingAttendees()),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("MeetingAttendeeInformation[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(MeetingAttendeeInformation)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[0] = tmp2[0].strip()
					tmp2[1] = tmp2[1].strip(" \"")
					
					tmp_arr.append([tmp2[0],tmp2[1]])
				info.append(tmp_arr)
		return info
	
	def getAllPartyCustomFieldDefinitions(self):
		while True:	
			try:
				if self.activated[self.bs_crm_service_1_4_url] == 0:
					self.bs_crm_service_1_4 = Client(self.bs_crm_service_1_4_url)
					self.bs_crm_service_1_4.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_crm_service_1_4_url] = 1
				
				funds = self.bs_crm_service_1_4.service.getAllPartyCustomFieldDefinitions()
				break
			except Exception as e:
				print e
		return funds
	
	def getAllRelationshipTypesForOwner(self):
		while True:	
			try:
				if self.activated[self.bs_crm_service_1_4_url] == 0:
					self.bs_crm_service_1_4 = Client(self.bs_crm_service_1_4_url)
					self.bs_crm_service_1_4.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_crm_service_1_4_url] = 1
				
				info = []
				funds = unicode(str(self.bs_crm_service_1_4.service.getAllRelationshipTypesForOwner()),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("PartyRelationshipDescriptionInformation[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(PartyRelationshipDescriptionInformation)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[0] = tmp2[0].strip()
					tmp2[1] = tmp2[1].strip(" \"")
					
					tmp_arr.append([tmp2[0],tmp2[1]])
				info.append(tmp_arr)
		return info
	
	def getPersonInformation(self,contact_ids):
		while True:	
			try:
				if self.activated[self.bs_crm_service_1_4_url] == 0:
					self.bs_crm_service_1_4 = Client(self.bs_crm_service_1_4_url)
					self.bs_crm_service_1_4.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_crm_service_1_4_url] = 1
				
				c_id = self.convertToArrayOfInt(contact_ids)
				info = []
				funds = unicode(str(self.bs_crm_service_1_4.service.getPeople(c_id)),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("PersonInformation[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(PersonInformation)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[0] = tmp2[0].strip()
					tmp2[1] = tmp2[1].strip(" \"")
					
					tmp_arr.append([tmp2[0],tmp2[1]])
				info.append(tmp_arr)
		return info
	
	def getAllPartyEmails(self):
		while True:	
			try:
				if self.activated[self.bs_crm_service_1_4_url] == 0:
					self.bs_crm_service_1_4 = Client(self.bs_crm_service_1_4_url)
					self.bs_crm_service_1_4.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_crm_service_1_4_url] = 1
				
				info = []
				funds = unicode(str(self.bs_crm_service_1_4.service.getAllPartyEmails()),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("PartyEmailInformation[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(PartyEmailInformation)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[0] = tmp2[0].strip()
					tmp2[1] = tmp2[1].strip(" \"")
					
					tmp_arr.append([tmp2[0],tmp2[1]])
				info.append(tmp_arr)
		return info
	
	def findMeetingsByDate(self,start_date,end_date):
		while True:	
			try:
				if self.activated[self.bs_crm_service_1_4_url] == 0:
					self.bs_crm_service_1_4 = Client(self.bs_crm_service_1_4_url)
					self.bs_crm_service_1_4.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_crm_service_1_4_url] = 1
				
				ids = []
				meeting_ids = unicode(str(self.bs_crm_service_1_4.service.findMeetingsByDate(start_date.strftime("%Y-%m-%dT00:00:00-05:00"),end_date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				print e
		if meeting_ids.count(',') > 0:
			tmp = meeting_ids.split('=')
			tmp2 = tmp[1].split(',')
			for var in range(0,len(tmp2)-1):
				tmp2[var] = tmp2[var].strip()
				ids.append(int(tmp2[var]))
		return ids
	
	def getPartyLocations(self,party_id):
		while True:	
			try:
				if self.activated[self.bs_crm_service_1_4_url] == 0:
					self.bs_crm_service_1_4 = Client(self.bs_crm_service_1_4_url)
					self.bs_crm_service_1_4.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_crm_service_1_4_url] = 1
				
				p_id = self.convertToArrayOfInt([party_id])
				info = []
				funds = unicode(str(self.bs_crm_service_1_4.service.getPartyLocations(p_id)),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("PartyLocationInformation_1_2[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(PartyLocationInformation_1_2)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[0] = tmp2[0].strip()
					tmp2[1] = tmp2[1].strip(" \"")
					
					tmp_arr.append([tmp2[0],tmp2[1]])
				info.append(tmp_arr)
		return info
	
	def getAllDocumentIds(self):
		while True:	
			try:
				if self.activated[self.bs_crm_service_1_4_url] == 0:
					self.bs_crm_service_1_4 = Client(self.bs_crm_service_1_4_url)
					self.bs_crm_service_1_4.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_crm_service_1_4_url] = 1
				
				ids = []
				meeting_ids = unicode(str(self.bs_crm_service_1_4.service.getAllDocumentIds()),errors='ignore')
				break
			except Exception as e:
				print e
		if meeting_ids.count(',') > 0:
			tmp = meeting_ids.split('=')
			tmp2 = tmp[1].split(',')
			for var in range(0,len(tmp2)-1):
				tmp2[var] = tmp2[var].strip()
				ids.append(int(tmp2[var]))
		return ids
	
	def getAllMeetingIds(self):
		while True:	
			try:
				if self.activated[self.bs_crm_service_1_4_url] == 0:
					self.bs_crm_service_1_4 = Client(self.bs_crm_service_1_4_url)
					self.bs_crm_service_1_4.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_crm_service_1_4_url] = 1
				
				ids = []
				meeting_ids = unicode(str(self.bs_crm_service_1_4.service.getAllMeetingIds()),errors='ignore')
				break
			except Exception as e:
				print e
		if meeting_ids.count(',') > 0:
			tmp = meeting_ids.split('=')
			tmp2 = tmp[1].split(',')
			for var in range(0,len(tmp2)-1):
				tmp2[var] = tmp2[var].strip()
				ids.append(int(tmp2[var]))
		return ids
	
	def getOrganisationIds(self):
		while True:	
			try:
				if self.activated[self.bs_crm_service_1_4_url] == 0:
					self.bs_crm_service_1_4 = Client(self.bs_crm_service_1_4_url)
					self.bs_crm_service_1_4.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_crm_service_1_4_url] = 1
				
				info = []
				funds = unicode(str(self.bs_crm_service_1_4.service.getOrganisationIds()),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("ContactId[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(ContactId)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[0] = tmp2[0].strip()
					tmp2[1] = tmp2[1].strip(" \"")
					
					if var2 == 0:
						tmp_arr.append([tmp2[0],int(tmp2[1])])
					else:
						tmp_arr.append([tmp2[0],tmp2[1]])
				info.append(tmp_arr)
		return info
	
	def getMeetingInformation(self,meeting_id):
		while True:	
			try:
				if self.activated[self.bs_crm_service_1_4_url] == 0:
					self.bs_crm_service_1_4 = Client(self.bs_crm_service_1_4_url)
					self.bs_crm_service_1_4.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_crm_service_1_4_url] = 1
				
				m_id = self.convertToArrayOfInt(meeting_id)
				info = []
				funds = unicode(str(self.bs_crm_service_1_4.service.getMeetingInformation(m_id)),errors='ignore')
				break
			except Exception as e:
				print e
		print funds
		funds = funds.split("MeetingInformation[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(MeetingInformation)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split(" = ")
					if len(tmp2) < 2:
						tmp2[0] = tmp2[0].strip("\"\n ")
						tmp_arr[len(tmp_arr)-1][1] += " " + tmp2[0]
					elif len(tmp2) == 2:	
						tmp2[0] = tmp2[0].strip()
						tmp2[1] = tmp2[1].strip(" \"\n")
						tmp_arr.append([tmp2[0],tmp2[1]])
					else:
						tmp2[0] = tmp2[0].strip()
						for var in range(2,len(tmp2)):
							tmp2[1] += tmp2[var]
						tmp2[1] = tmp2[1].strip(" \"\n")
						tmp_arr.append([tmp2[0],tmp2[1]])
				info.append(tmp_arr)
		return info		
	
	def getAllMeetings(self):
		if self.activated[self.bs_crm_service_1_4_url] == 0:
			self.bs_crm_service_1_4 = Client(self.bs_crm_service_1_4_url)
			self.bs_crm_service_1_4.set_options(soapheaders=self.header,timeout=1000)
			self.activated[self.bs_crm_service_1_4_url] = 1
		
		return self.bs_crm_service_1_4.service.getAllMeetings()
	
	def getMeetingActivityTags(self,meeting_id):
		if self.activated[self.bs_crm_service_1_4_url] == 0:
			self.bs_crm_service_1_4 = Client(self.bs_crm_service_1_4_url)
			self.bs_crm_service_1_4.set_options(soapheaders=self.header,timeout=1000)
			self.activated[self.bs_crm_service_1_4_url] = 1
		
		m_id = self.convertToArrayOfInt(meeting_id)
		return self.bs_crm_service_1_4.service.getMeetingActivityTags(m_id)
	
	def getMeetingInfoByBackstopIdandType(self,backstop_id,entity_type):
		while True:	
			try:
				if self.activated[self.bs_crm_service_1_4_url] == 0:
					self.bs_crm_service_1_4 = Client(self.bs_crm_service_1_4_url)
					self.bs_crm_service_1_4.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_crm_service_1_4_url] = 1
		
				info = []
				funds = unicode(str(self.bs_crm_service_1_4.service.getMeetingInfoByBackstopIdandType(backstop_id,entity_type)),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("MeetingInformation_1_1[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(MeetingInformation_1_1)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
#				print funds[var]
				funds[var] = funds[var].strip(" ,{}\n")
				funds[var] = funds[var].split("enteredBy =")[1]
				funds[var] = "enteredBy =" + funds[var]
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split(" = ")
					if len(tmp2) == 2:	
						tmp2[0] = tmp2[0].strip()
						tmp2[1] = tmp2[1].strip(" \"\n")
						tmp_arr.append([tmp2[0],tmp2[1]])
						
					elif len(tmp2) > 2:
						tmp2[0] = tmp2[0].strip()
						for var in range(2,len(tmp2)):
							tmp2[1] += tmp2[var]
						tmp2[1] = tmp2[1].strip(" \"\n")
						tmp_arr.append([tmp2[0],tmp2[1]])
				info.append(tmp_arr)
		return info

	def getPeople(self,contact_id):
		if self.activated[self.bs_crm_service_1_4_url] == 0:
			self.bs_crm_service_1_4 = Client(self.bs_crm_service_1_4_url)
			self.bs_crm_service_1_4.set_options(soapheaders=self.header,timeout=1000)
			self.activated[self.bs_crm_service_1_4_url] = 1
		
		p_id = self.convertToArrayOfInt([contact_id])
		return self.bs_crm_service_1_4.service.getPeople(p_id)
		
	def runOpportunityReport(self,json_definition,r_expression,as_of_date):
		while True:	
			try:
				if self.activated[self.bs_crm_query_service_1_0_url] == 0:
					self.bs_crm_query_service_1_0 = Client(self.bs_crm_query_service_1_0_url)
					self.bs_crm_query_service_1_0.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_crm_query_service_1_0_url] = 1
		
				info = []
				funds = unicode(str(self.bs_crm_query_service_1_0.service.runOpportunityReport(unicode(json_definition,errors='ignore'),unicode(r_expression,errors='ignore'),as_of_date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("ReportRow[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(ReportRow)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp[var2] = tmp[var2].strip()
					tmp2 = tmp[var2].split("=")
					if len(tmp2) < 2:
						tmp2[0] = tmp2[0].strip("\"\n ")
						tmp_arr[len(tmp_arr)-1][1] += " " + tmp2[0]
					else:	
						tmp2[0] = tmp2[0].strip(" field\n")
						tmp2[1] = tmp2[1].strip(" \"\n")
						tmp_arr.append([int(tmp2[0]),tmp2[1]])
						
				tmp_arr = sorted(tmp_arr,key=itemgetter(0))
				info.append(tmp_arr)
		return info
	
	def runPeopleOrgsReport(self,json_definition,r_expression,as_of_date):
		while True:	
			try:
				if self.activated[self.bs_crm_query_service_1_0_url] == 0:
					self.bs_crm_query_service_1_0 = Client(self.bs_crm_query_service_1_0_url)
					self.bs_crm_query_service_1_0.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_crm_query_service_1_0_url] = 1
				
				info = []
				funds = unicode(str(self.bs_crm_query_service_1_0.service.runPeopleOrgsReport(unicode(json_definition,errors='ignore'),unicode(r_expression,errors='ignore'),as_of_date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("ReportRow[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(ReportRow)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp[var2] = tmp[var2].strip()
					tmp2 = tmp[var2].split("=")
					if len(tmp2) < 2:
						tmp2[0] = tmp2[0].strip("\"\n ")
						tmp_arr[len(tmp_arr)-1][1] += " " + tmp2[0]
					else:	
						tmp2[0] = tmp2[0].strip(" field\n")
						tmp2[1] = tmp2[1].strip(" \"\n")
						tmp_arr.append([int(tmp2[0]),tmp2[1]])
						
				tmp_arr = sorted(tmp_arr,key=itemgetter(0))
				info.append(tmp_arr)
		return info	
	
	def runActivityReport(self,json_definition,r_expression,as_of_date):
		while True:	
			try:
				if self.activated[self.bs_crm_query_service_1_0_url] == 0:
					self.bs_crm_query_service_1_0 = Client(self.bs_crm_query_service_1_0_url)
					self.bs_crm_query_service_1_0.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_crm_query_service_1_0_url] = 1
				
				info = []
				funds = unicode(str(self.bs_crm_query_service_1_0.service.runActivityReport(unicode(json_definition,errors='ignore'),unicode(r_expression,errors='ignore'),as_of_date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("ReportRow[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(ReportRow)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp[var2] = tmp[var2].strip()
					tmp2 = tmp[var2].split("=")
					if len(tmp2) < 2:
						tmp2[0] = tmp2[0].strip("\"\n ")
						tmp_arr[len(tmp_arr)-1][1] += " " + tmp2[0]
					else:	
						tmp2[0] = tmp2[0].strip(" field\n")
						tmp2[1] = tmp2[1].strip(" \"\n")
						tmp_arr.append([int(tmp2[0]),tmp2[1]])
						
				tmp_arr = sorted(tmp_arr,key=itemgetter(0))
				info.append(tmp_arr)
		return info	
	
	def runFundsReport(self,json_definition,r_expression,as_of_date):
		while True:	
			try:
				if self.activated[self.bs_portfolio_query_service_1_0_url] == 0:
					self.bs_portfolio_query_service_1_0 = Client(self.bs_portfolio_query_service_1_0_url)
					self.bs_portfolio_query_service_1_0.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_portfolio_query_service_1_0_url] = 1
				
				info = []
				funds = unicode(str(self.bs_portfolio_query_service_1_0.service.runFundsReport(unicode(json_definition,errors='ignore'),unicode(r_expression,errors='ignore'),as_of_date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("ReportRow[] =")															
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(ReportRow)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp[var2] = tmp[var2].strip()
					tmp2 = tmp[var2].split("=")
					if len(tmp2) < 2:
						tmp2[0] = tmp2[0].strip("\"\n ")
						tmp_arr[len(tmp_arr)-1][1] += " " + tmp2[0]
					else:	
						tmp2[0] = tmp2[0].strip(" field\n")
						tmp2[1] = tmp2[1].strip(" \"\n")
						tmp_arr.append([int(tmp2[0]),tmp2[1]])
						
				tmp_arr = sorted(tmp_arr,key=itemgetter(0))
				info.append(tmp_arr)
		return info
	
	def runPortfolioTransactionsReport(self,json_definition,r_expression,as_of_date):
		while True:	
			try:
				if self.activated[self.bs_portfolio_query_service_1_0_url] == 0:
					self.bs_portfolio_query_service_1_0 = Client(self.bs_portfolio_query_service_1_0_url, timeout=500)
					self.bs_portfolio_query_service_1_0.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_portfolio_query_service_1_0_url] = 1
				
				info = []
				funds = unicode(str(self.bs_portfolio_query_service_1_0.service.runPortfolioTransactionsReport(unicode(json_definition,errors='ignore'),unicode(r_expression,errors='ignore'),as_of_date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("ReportRow[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(ReportRow)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp[var2] = tmp[var2].strip()
					tmp2 = tmp[var2].split("=")
					if len(tmp2) < 2:
						tmp2[0] = tmp2[0].strip("\"\n ")
						tmp_arr[len(tmp_arr)-1][1] += " " + tmp2[0]
					else:	
						tmp2[0] = tmp2[0].strip(" field\n")
						tmp2[1] = tmp2[1].strip(" \"\n")
						tmp_arr.append([int(tmp2[0]),tmp2[1]])
						
				tmp_arr = sorted(tmp_arr,key=itemgetter(0))
				info.append(tmp_arr)
		return info
	
	def runHoldingsReport(self,json_definition,r_expression,as_of_date):
		while True:	
			try:
				if self.activated[self.bs_portfolio_query_service_1_0_url] == 0:
					self.bs_portfolio_query_service_1_0 = Client(self.bs_portfolio_query_service_1_0_url, timeout=500)
					self.bs_portfolio_query_service_1_0.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_portfolio_query_service_1_0_url] = 1
				
				info = []
				funds = unicode(str(self.bs_portfolio_query_service_1_0.service.runHoldingsReport(unicode(json_definition,errors='ignore'),unicode(r_expression,errors='ignore'),as_of_date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("ReportRow[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(ReportRow)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp[var2] = tmp[var2].strip()
					tmp2 = tmp[var2].split("=")
					if len(tmp2) < 2:
						tmp2[0] = tmp2[0].strip("\"\n ")
						tmp_arr[len(tmp_arr)-1][1] += " " + tmp2[0]
					else:	
						tmp2[0] = tmp2[0].strip(" field\n")
						tmp2[1] = tmp2[1].strip(" \"\n")
						tmp_arr.append([int(tmp2[0]),tmp2[1]])
						
				tmp_arr = sorted(tmp_arr,key=itemgetter(0))
				info.append(tmp_arr)
		return info

	def runProductsReport(self,json_definition,r_expression,as_of_date):
		while True:	
			try:
				if self.activated[self.bs_portfolio_query_service_1_0_url] == 0:
					self.bs_portfolio_query_service_1_0 = Client(self.bs_portfolio_query_service_1_0_url)
					self.bs_portfolio_query_service_1_0.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_portfolio_query_service_1_0_url] = 1
				
				info = []
				funds = unicode(str(self.bs_portfolio_query_service_1_0.service.runProductsReport(unicode(json_definition,errors='ignore'),unicode(r_expression,errors='ignore'),as_of_date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("ReportRow[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(ReportRow)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp[var2] = tmp[var2].strip()
					tmp2 = tmp[var2].split("=")
					if len(tmp2) < 2:
						tmp2[0] = tmp2[0].strip("\"\n ")
						tmp_arr[len(tmp_arr)-1][1] += " " + tmp2[0]
					else:	
						tmp2[0] = tmp2[0].strip(" field\n")
						tmp2[1] = tmp2[1].strip(" \"\n")
						tmp_arr.append([int(tmp2[0]),tmp2[1]])
						
				tmp_arr = sorted(tmp_arr,key=itemgetter(0))
				info.append(tmp_arr)
		return info
	
	def getExposureData(self,hedge_fund_id,start_date,end_date):
		while True:	
			try:
				if self.activated[self.bs_portfolio_service_1_9_url] == 0:
					imp = Import('http://returnentity.webservice.fundbutter.backstopsolutions.com')
					imp.filter.add('http://exposures.returnentity.webservice.fundbutter.backstopsolutions.com')
					imp2 = Import('http://backstopsolutions.com/BackstopService')
					imp2.filter.add('http://exposures.returnentity.webservice.fundbutter.backstopsolutions.com')	
					d = ImportDoctor(imp,imp2)
					self.bs_portfolio_service_1_9 = Client(self.bs_portfolio_service_1_9_url,doctor=d)
					self.bs_portfolio_service_1_9.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_portfolio_service_1_9_url] = 1
				
				info = []
				funds = unicode(str(self.bs_portfolio_service_1_9.service.getExposureData(hedge_fund_id,start_date.strftime("%Y-%m-%dT00:00:00-05:00"),end_date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("ExposureCategoryInformation[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(ExposureCategoryInformation)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].split("name = ")
				category_type = "name = " + funds[var][1]
				data_pts = funds[var][0]
				
				data_pts = data_pts.split("ExposurePointInformation[] =")
				data_pt_arr = []
				if len(data_pts) > 1:
					data_pts = data_pts[1].strip(" {},\n")
					data_pts = data_pts.split("(ExposurePointInformation)")
					for var2 in range(0,len(data_pts)):
						data_pts[var2] = data_pts[var2].split("FieldValuePair[] =")
						data_pt = []
						if len(data_pts[var2]) > 1:
							data_pts[var2] = data_pts[var2][1].strip(" {},\n")
							data_pts[var2] = data_pts[var2].split("(FieldValuePair)")
							data_pts[var2] = data_pts[var2][1:len(data_pts[var2])]
							for var3 in range(0,len(data_pts[var2])):
								data_pts[var2][var3] = data_pts[var2][var3].strip(" {},\n")
								tmp = data_pts[var2][var3].split("\n")
								tmp[0] = tmp[0].split(" = ")[1].strip("\"")
								tmp[1] = tmp[1].split(" = ")[1].strip("\"")
								data_pt.append(tmp)
							data_pt_arr.append(data_pt)
				
					type = category_type.split("typeName =")[1].strip(" \"\n,}{")
					name = category_type.split("parents =")[0].strip(" \"\n,}{")
					name = name.split("=")[1].strip(" \"\n,")
					
					info.append([type,name,data_pt_arr])
		return info
	
	def getProductBalances(self,product_id,start_date,end_date):
		while True:	
			try:
				if self.activated[self.bs_portfolio_service_1_9_url] == 0:
					imp = Import('http://returnentity.webservice.fundbutter.backstopsolutions.com')
					imp.filter.add('http://exposures.returnentity.webservice.fundbutter.backstopsolutions.com')
					imp2 = Import('http://backstopsolutions.com/BackstopService')
					imp2.filter.add('http://exposures.returnentity.webservice.fundbutter.backstopsolutions.com')	
					d = ImportDoctor(imp,imp2)
					self.bs_portfolio_service_1_9 = Client(self.bs_portfolio_service_1_9_url,doctor=d)
					self.bs_portfolio_service_1_9.set_options(soapheaders=self.header,timeout=1000)
					self.activated[self.bs_portfolio_service_1_9_url] = 1
				
				info = []
				funds = unicode(str(self.bs_portfolio_service_1_9.service.getProductBalances(product_id,start_date.strftime("%Y-%m-%dT00:00:00-05:00"),end_date.strftime("%Y-%m-%dT00:00:00-05:00"))),errors='ignore')
				break
			except Exception as e:
				print e
		funds = funds.split("FieldValuePair[] =")
		if len(funds) > 1:
			funds = funds[1].strip()
			funds = funds.strip(" {},\n")
			funds = funds.split("(FieldValuePair)")
			funds = funds[1:len(funds)]
			
			for var in range(0,len(funds)):
				funds[var] = funds[var].strip(" ,{}\n")
				tmp = funds[var].split("\n")
				tmp_arr = []
				for var2 in range(0,len(tmp)):
					tmp2 = tmp[var2].split("=")
					tmp2[1] = tmp2[1].strip(" \"")
					
					tmp_arr.append(tmp2[1])
				info.append(tmp_arr)
		return info

	def convertToArrayOfInt(self,int_arr):
		if self.activated[self.bs_service_1_0_url] == 0:
			self.bs_service_1_0 = Client(self.bs_service_1_0_url)
			self.bs_service_1_0.set_options(soapheaders=self.header,timeout=1000)
			self.activated[self.bs_service_1_0_url] = 1
			
		arr_tmp = self.bs_service_1_0.factory.builder.build("ArrayOfInt")
		arr_tmp.__setitem__("int",int_arr)

		return arr_tmp
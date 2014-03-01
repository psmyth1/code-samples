class Party:
    def __init__(self):
        self.firm = None
        self.backstop_party_id = ""
        self.contacts = []
    
    def addContact(self,contact):
        self.contacts.append(contact)
    
    
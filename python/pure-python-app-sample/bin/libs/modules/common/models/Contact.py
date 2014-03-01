class Contact:
    def __init__(self):
        self.name = ""
        self.position = ""
        self.phone = ""
        self.email = ""
        self.type = ""
        self.category = ""
        self.backstop_party_id = ""
        self.firm = ""
    
    def __str__(self):
        tmp_str = self.name + ", " + self.position + " - " + self.phone + " - " + self.email
        return tmp_str
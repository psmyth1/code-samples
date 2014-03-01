class Meeting:
    def __init__(self):
        self.attached_to = ""
        self.date = ""
        self.type = ""
        self.activity_tag = ""
        self.firm = ""
        self.backstop_meeting_id = 0
    
    def __str__(self):
        tmp_str = self.date.strftime("%m/%d/%Y") + " - " + self.type
        return tmp_str
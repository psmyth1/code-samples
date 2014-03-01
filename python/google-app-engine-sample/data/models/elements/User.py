from google.appengine.ext import ndb

class User(ndb.Model):
    user_id = ndb.StringProperty()
    
    def __str__(self):
        return "UserID: " + self.user_id
    
        
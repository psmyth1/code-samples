from google.appengine.ext import ndb

class Controller(ndb.Model):
    controller_id = ndb.StringProperty()
    
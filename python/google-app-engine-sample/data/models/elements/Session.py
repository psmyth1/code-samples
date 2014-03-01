from google.appengine.ext import ndb

class Session(ndb.Model):
    id = ndb.IntegerProperty()
    viewer = ndb.KeyProperty()
    controller = ndb.KeyProperty()
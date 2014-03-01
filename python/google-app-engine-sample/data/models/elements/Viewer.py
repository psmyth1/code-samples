from google.appengine.ext import ndb

class Viewer(ndb.Model):
    viewer_id = ndb.StringProperty()
    viewer_name = ndb.StringProperty()
    channel_id = ndb.StringProperty()
    token = ndb.StringProperty();
    token_expiration = ndb.IntegerProperty();
       
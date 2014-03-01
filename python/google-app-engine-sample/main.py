import webapp2, json, os, logging, uuid, time

from google.appengine.api import users
from google.appengine.api import channel
from data.ModelLoader import ModelLoader

def user_required(handler):
    def check_login(self, *args, **kwargs):
        user = users.get_current_user()
        if not user:
            self.redirect(users.create_login_url(self.request.uri))
        else:
            return handler(self, *args, **kwargs)    
    return check_login

class MainPage(webapp2.RequestHandler):
    @user_required
    def get(self):
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.write('Hello, ' + str(ModelLoader.get_user(users.get_current_user().user_id())))

class ViewerPair(webapp2.RequestHandler):
    @user_required
    def post(self):
        logging.info("ViewerPair")
        user = ModelLoader.get_user(users.get_current_user().user_id())
        viewer = ModelLoader.get_viewer(user,self.request.POST.get("viewer_id"),self.request.POST.get("viewer_name"))
                
        self.response.headers['Content-Type'] = 'application/json';
        self.response.out.write(json.dumps({'token':viewer.token}));

class ViewerUnPair(webapp2.RequestHandler):
    @user_required
    def post(self):
        logging.info("ViewerUnPair")
        user = ModelLoader.get_user(users.get_current_user().user_id())
        viewer = ModelLoader.get_viewer(user,self.request.POST.get("viewer_id"))
        if viewer != None:
            viewer.delete()
        
class ViewerConnect(webapp2.RequestHandler):
    @user_required
    def post(self):
        logging.info("ViewerConnected")        

class ViewerDisconnect(webapp2.RequestHandler):
    @user_required
    def post(self):
        logging.info("ViewerDisconnected")

class ViewerRespondMessage(webapp2.RequestHandler):
    @user_required
    def post(self):
        logging.info("ViewerRespondMessage");
        logging.info("    " + self.request.POST.get("viewer_id") + "-" + self.request.POST.get("message"));        

class ViewerSendMessage(webapp2.RequestHandler):
    @user_required
    def post(self):
        logging.info("ViewerSendMessage");
        logging.info("    " + self.request.POST.get("viewer_id") + "-" + self.request.POST.get("message"));
        
#         user = ModelLoader.get_user(users.get_current_user().user_id())
#         viewer = user.get_viewer(self.request.POST.get("viewer_id"))
#                 
#         logging.info("ChannelID:" + str(viewer));             
#         if viewer.token_expiration < int(time.time()):
#             channel.send_message("", "");
#         else:
#             channel.send_message(viewer.channel_id, json.dumps({'handler':'general',
#                                                                  'action_type':"tabs",
#                                                                  'action':"getCurrent",
#                                                                  'params':["self.post_handle"]}));

app = webapp2.WSGIApplication([('/', MainPage),('/viewer/pair', ViewerPair),('/viewer/unpair', ViewerUnPair),
                               ('/_ah/channel/connected', ViewerConnect),('/_ah/channel/disconnected', ViewerDisconnect),
                               ('/viewer/respond_msg',ViewerRespondMessage),('/viewer/send_msg',ViewerSendMessage)], debug=True)
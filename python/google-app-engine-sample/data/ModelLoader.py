import time

from google.appengine.api import channel
from google.appengine.ext import ndb

from data.models.elements.User import User
from data.models.elements.Session import Session
from data.models.elements.Viewer import Viewer
from data.models.elements.Controller import Controller

class ModelLoader:
    @staticmethod
    def get_user(user_id):
        user = User.query(User.user_id == user_id).get()
        if user == None:
            user = User(user_id=user_id)
            user.put()
        return user
    
    @staticmethod
    def get_viewer(user,viewer_id,viewer_name=None):
        viewer = Viewer.query(Viewer.viewer_id == viewer_id, ancestor=user.key).get()
        if viewer == None:
            if viewer_name != None:
                viewer = ModelLoader.create_viewer(user, viewer_id, viewer_name)
        elif viewer.token_expiration < int(time.time()):
            v_name = viewer_name
            if viewer_name == None:
                v_name = viewer.viewer_name                
            viewer = ModelLoader.create_viewer(user, viewer_id, v_name)
        return viewer
    
    @staticmethod
    def create_viewer(user,viewer_id,viewer_name):
        time_num = int(time.time())
        c_id = user.user_id + "_" + viewer_id + '_' + str(time_num);
        
        expire_time_num = time_num + (110*60);
        tkn = channel.create_channel(c_id,120);       
        viewer = Viewer(parent=user.key,viewer_id=viewer_id,viewer_name=viewer_name,channel_id=c_id,token=tkn,token_expiration=expire_time_num);
        viewer.put()
        return viewer
    
    @staticmethod
    def get_controller(user,controller_id):
        server = Controller.query(Controller.controller_id == controller_id, ancestor=user.key).get()
        if server == None:
            server = Controller(parent=user.key,controller_id=controller_id)
            server.put()
        return server
    
    @staticmethod
    def get_session(user,viewer_id,controller_id):
        viewer = ModelLoader.get_viewer(user,viewer_id)
        controller = ModelLoader.get_controller(user,controller_id)
        session = Session.query(Session.viewer == Viewer.key, Session.controller == controller.key, ancestor=user.key)
        if session == None:
            session = Session(parent=user.key,Viewer=viewer.key,controller=controller.key)
            session.put()
        return session  
        

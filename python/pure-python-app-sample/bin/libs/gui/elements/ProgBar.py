import time, os, sys
import pygame
from pygame.locals import *

class ProgBar:
    def __init__(self,bar_title="Progress",simple_bar=False,image_path="libs/images/",auto_display=False):
        self.is_simple = simple_bar
        self.image_path = image_path
        self.auto_display = auto_display
        
        pygame.init()
        pygame.fastevent.init()
        
        if not self.is_simple:
            self.win_w = 300    
            self.win_h = 200
        else:
            self.win_w = 300
            self.win_h = 54
        
        file_name = self.image_path + "icon.bmp"
        img = pygame.image.load(file_name)
        pygame.display.set_icon(img)
        
        os.environ['SDL_VIDEO_CENTERED'] = '1'
        self.screen = pygame.display.set_mode((self.win_w, self.win_h))
        pygame.display.set_caption(bar_title)
        
        self.exiting = False
        
        self.main_bar_percent = 0.0
        self.sub_bar_percent = 0.0
        self.subprocess_percent = 10.0
        self.subprocess_step = 0.0
        self.subprocess_total_steps = 10.0
        self.main_bar_start = time.clock()
        self.sub_bar_start = time.clock()
        self.main_bar_time_est = "Unknown"
        self.sub_bar_time_est = "Unknown"
        
        self.cur_sub_proc_total = 0.0
        
        self.messages = []
        
        self.def_line_height = 9
        
        self.main_bar_coords = [[14,14],[14,40],[285,40],[285,14]]
        self.main_bar_length = (self.main_bar_coords[2][0] - self.main_bar_coords[0][0])
        self.sub_bar_coords = [[14,62],[14,72],[285,72],[285,62]]
        self.sub_bar_length = (self.sub_bar_coords[2][0] - self.sub_bar_coords[0][0])
        self.message_coords = [[18,85],[18,185],[282,185],[282,85]]
        
        file_name = self.image_path + "prog_template_simple.bmp"
        img = pygame.image.load(file_name)
        self.prog_template_simple = img
        self.prog_template_simple_rect = self.prog_template_simple.get_rect()
        
        file_name = self.image_path + "prog_template.bmp"
        img = pygame.image.load(file_name)
        self.prog_template = img
        self.prog_template_rect = self.prog_template.get_rect()
        
        self.percent_font = pygame.font.Font('freesansbold.ttf',14)
        self.time_font = pygame.font.Font('freesansbold.ttf',12)
        self.msg_font = pygame.font.SysFont("msreferencesansserif",11)
        
        self.redisplay()
        
    def redisplay(self):
        self.screen.fill((255,255,255))
        self.calcNumbers()
                       
        self.drawTemplate()
        self.drawMainBar()
        if not self.is_simple:
            self.drawSubBar()
            self.drawMessages()
        
        pygame.display.flip()
        
        for event in pygame.event.get():
            if event.type == 12:
                self.exit()
                raise SystemExit()
            
    def drawTemplate(self):
        if not self.is_simple:
            self.screen.blit(self.prog_template,self.prog_template_rect)
        else:
            self.screen.blit(self.prog_template_simple,self.prog_template_simple_rect)
            
    def drawMainBar(self):
        if not self.is_simple:
            tmp_length = ((self.main_bar_percent/100.0)*float(self.main_bar_length))
            bar_rect = pygame.Rect((self.main_bar_coords[0][0],self.main_bar_coords[0][1]),(tmp_length,26))
            pygame.draw.rect(self.screen,(0,0,250),bar_rect)
        
            percent_str = str(self.main_bar_percent)[0:5] + "%"
            tmp_text = self.percent_font.render(percent_str,True,(0,0,0))
            text_rect = tmp_text.get_rect()
            text_rect.center = (.5*self.win_w,self.main_bar_coords[1][1]-11)
            self.screen.blit(tmp_text,text_rect)
            
            time_str = "N/A"
            if self.main_bar_time_est != "Unknown":
                time_str = str(int(self.main_bar_time_est)) + " seconds left"
            else:
                time_str = "Unknown seconds left"
            tmp_text = self.time_font.render(time_str,True,(0,0,0))
            text_rect = tmp_text.get_rect()
            text_rect.topleft = (.04*self.win_w,self.main_bar_coords[1][1]+5)
            self.screen.blit(tmp_text,text_rect)
        else:
            tmp_length = ((self.main_bar_percent/100.0)*float(self.main_bar_length))
            bar_rect = pygame.Rect((self.main_bar_coords[0][0],self.main_bar_coords[0][1]),(tmp_length,26))
            pygame.draw.rect(self.screen,(0,0,250),bar_rect)
            
    def drawSubBar(self):
        tmp_length = ((self.sub_bar_percent/100.0)*float(self.sub_bar_length))
        bar_rect = pygame.Rect((self.sub_bar_coords[0][0],self.sub_bar_coords[0][1]),(tmp_length,10))
        pygame.draw.rect(self.screen,(0,0,250),bar_rect)
    
    def drawMessages(self):
        msgs = []
        if len(self.messages) > 10:
            msgs = self.messages[len(self.messages)-10:len(self.messages)]
        else:
            msgs = self.messages
        for var in range(0,len(msgs)):
            tmp_text = self.msg_font.render(msgs[var][0:40],True,(0,0,0))
            text_rect = tmp_text.get_rect()
            text_rect.topleft = (.07*self.win_w,(self.message_coords[0][1]+3) + var*self.def_line_height)
            text_rect.width = 264
            self.screen.blit(tmp_text,text_rect)
        
    def calcNumbers(self):
        if self.main_bar_percent > 0.0:
            main_diff = (time.clock() - self.main_bar_start)
            main_speed = main_diff/(self.main_bar_percent)
            self.main_bar_time_est = (100.0 - self.main_bar_percent)*main_speed
        
        if self.sub_bar_percent > 0.0:
            sub_diff = (time.clock() - self.sub_bar_start)
            sub_speed = sub_diff/(self.sub_bar_percent)
            self.sub_bar_time_est = (100.0 - self.sub_bar_percent)*sub_speed
        
    def updateMainPercent(self,percent):
        if percent >= 0.0:
            if percent < 100.0:
                self.main_bar_percent = percent
            else:
                self.main_bar_percent = 100.0
        if self.auto_display:
            self.redisplay()
    
    def updateSubPercent(self,percent):
        if percent >= 0.0:
            if percent < 100.0:
                self.sub_bar_percent = percent
            else:
                self.sub_bar_percent = 100.0
        if self.auto_display:
            self.redisplay()
        
    def startSubProcess(self,percent,steps):
        self.subprocess_percent = percent
        self.subprocess_total_steps = steps
        self.subprocess_step = 0.0
        self.resetSub()
        
    def incSub(self,msg=None):
        self.subprocess_step += 1.0
        if self.subprocess_step <= self.subprocess_total_steps:
            ratio_sub = (self.subprocess_step/self.subprocess_total_steps)
            ratio_main = (1.0/self.subprocess_total_steps)
            self.updateSubPercent(100.0*ratio_sub)
            self.updateMainPercent(self.main_bar_percent + self.subprocess_percent*ratio_main)
            if msg != None:
                self.addMessage(msg)
        
    def resetMain(self):
        self.main_bar_percent = 0.0
        self.main_bar_start = time.clock()
    
    def resetSub(self):
        self.sub_bar_percent = 0.0
        self.sub_bar_start = time.clock()
    
    def clearMessages(self):
        self.messages = []
    
    def addMessage(self,msg):
        self.messages.append(msg)
        if self.auto_display:
            self.redisplay()
    
    def exit(self):
        pygame.quit()
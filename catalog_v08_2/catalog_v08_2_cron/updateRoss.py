#!/usr/bin/python

# Writes html for Ross Sea page
# reads catalog.json for info

import os
import dateutil.parser
from jinja2 import Environment, FileSystemLoader
import json
import math
from datetime import datetime, timedelta
import pytz
import logging

PATH = os.path.dirname(os.path.realpath(__file__)) + '/templates/'

TEMPLATE_ENVIRONMENT = Environment(
    autoescape=False,
    loader=FileSystemLoader(PATH),
    trim_blocks=False)
 
 
def render_template(template_filename, context):
    #print TEMPLATE_ENVIRONMENT
    #print template_filename
    return TEMPLATE_ENVIRONMENT.get_template(template_filename).render(context)
 
 
def write_ross_html(context, pageFn):
    #print context

    with open(pageFn, 'w') as f:
        html = render_template('ross.html', context)
        f.write(html)
    
    print('Ross Sea page written')
    print('---')


def updateRoss(webdir):

  print('UPDATING ROSS SEA PAGE - START')
  
  catalogFn = webdir + '/config/catalog_temp.json'

  with open(catalogFn) as catalogfile:    
    cataloginfo = json.load(catalogfile)
  
  #print('temp catalog file opened')
  
  pageDir = webdir + '/ross-sea'
  pageFn  = pageDir +'/index.php'
  if not os.path.exists(pageDir): os.makedirs(pageDir)

  timeNow = datetime.utcnow()
  timeNowLocal = datetime.now()

  #print(timeNowLocal)
  
  dateInfo = {}
  dateInfo['timeNow'] = timeNow.replace(tzinfo=pytz.utc)
      
  #print cataloginfo
     
  # Create the context that is sent to the template
  context = {'cataloginfo': cataloginfo}
      
  #print(context)
  write_ross_html(context, pageFn)

  print('UPDATING ROSS SEA PAGE - END')
  
def main():
    webdir = '/var/www/html/polarwatch/catalog_v07'
    updateRoss(webdir)

if __name__ == "__main__":
    main()
#!/usr/bin/python

# Writes html for dataset pages
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
    print(TEMPLATE_ENVIRONMENT)
    print(template_filename)
    return TEMPLATE_ENVIRONMENT.get_template(template_filename).render(context)
 
 
def write_status_html(context, statusPageFn):

    with open(statusPageFn, 'w') as f:
        html = render_template('status.html', context)
        f.write(html)
    
    print('Status page written')   
    print('---')


def updateStatusPage(webdir, version_number):
  print('START - UPDATING STATUS PAGE')
  
  catalogFn = webdir + '/config/catalog_temp.json'
  print(catalogFn)

  with open(catalogFn) as catalogfile:    
    cataloginfo = json.load(catalogfile)
  
  print('temp catalog file opened')
  
  statusPageDir = webdir + '/status'
  statusPageFn  = statusPageDir+'/index.php'
  if not os.path.exists(statusPageDir): os.makedirs(statusPageDir)

  timeNow = datetime.utcnow()
  timeNowLocal = datetime.now()
  dateInfo = {}
  dateInfo['timeNow'] = timeNow.replace(tzinfo=pytz.utc)
  context = {'cataloginfo': cataloginfo, 'version_number':version_number}
    
  write_status_html(context, statusPageFn)

  print('END - UPDATING STATUS PAGE')
  
 

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
import urllib3
import certifi

PATH = os.path.dirname(os.path.realpath(__file__)) + '/templates/'

TEMPLATE_ENVIRONMENT = Environment(
    autoescape=False,
    loader=FileSystemLoader(PATH),
    trim_blocks=False)
 
 
def render_template(template_filename, context):
    return TEMPLATE_ENVIRONMENT.get_template(template_filename).render(context)
 
 
def create_index_html(context):
    
    print(" writing preview page")
    with open(context['entry']['pageNameGraph'], 'w') as f:
        html = render_template('graph.html', context)
        f.write(html)
    print("       done writing preview page")
    
    print(" writing download page")
    with open(context['entry']['pageNameDownload'], 'w') as f:
        html = render_template('download.html', context)
        f.write(html)
    print("       done writing download page")
     
    print('---')

def restOfLoop(thisDataset, dateInfo):  
        print('top of loop')
        try:
          print(thisDataset["proj_crs_code"])
        except:
          pass
        ad = thisDataset['allDatasets']
        dateOptions = [];
        locInfo = {}
  
        print('Preparing additional info for file writing')
        
        startdate = dateutil.parser.parse(ad[9])
        enddate = dateutil.parser.parse(ad[10])
        startdateiso = startdate.strftime("%Y-%m-%dT%H:%M:%SZ")
        enddateiso = enddate.strftime("%Y-%m-%dT%H:%M:%SZ")
        startdatestr = startdate.strftime("%b %d, %Y")
        enddatestr = enddate.strftime("%b %d, %Y")
        availableRange = startdatestr + ' to ' + enddatestr
        startdatestrcal = startdate.strftime("%m/%d/%Y")
        enddatestrcal = enddate.strftime("%m/%d/%Y")

        # Determine date option details for data download form options
  
        # Write statement text for most recent single timestamp
        latestDateCaption = str((dateInfo['timeNow'] - enddate).days) + ' days ago'
        dateOptions.append({
          'radioValue':'latest',
          'radioMainText':'Latest Date', 
          'radioDateText':enddatestr,
          'radioDayCountText':latestDateCaption,
          'radioReqMin':ad[10],
          'radioReqMax':ad[10]
          })

        # Check to see if there is any data in the last week, 
        # if so add an option for data from past week      
        if (enddate - dateInfo['sevendaysago']).days > 0:
          dayspastweek = str((enddate - dateInfo['sevendaysago']).days) + ' days of data available'
          dateOptions.append({
            'radioValue':'pastweek', 
            'radioMainText':'Past week', 
            'radioDateText':dateInfo['sevendaysagostr'], 
            'radioDayCountText':dayspastweek,
            'radioReqMin': dateInfo['sevendaysagoIsoStr'],
            'radioReqMax':ad[10]
            })
        else:
          pass # no data in past week for this dataset

        # if there is data within the past 30 days
        if (enddate - dateInfo['thirtydaysago']).days > 0:
          dayspastmonth = str((enddate - dateInfo['thirtydaysago']).days) + ' days of data available'
          dateOptions.append({
            'radioValue':'pastmonth', 
            'radioMainText':'Past month', 
            'radioDateText':dateInfo['thirtydaysagostr'], 
            'radioDayCountText':dayspastmonth,
            'radioReqMin':dateInfo['thirtydaysagoIsoStr'],
            'radioReqMax': ad[10]
            })
      
        #***
        # Latitide Calculations - number of latitude cells by default, 
        #***
        hasLat = 0
        for dimension in thisDataset["dimensions"]:
          if dimension["name"] == "latitude":
            hasLat = 1
          if dimension["axis"] == "Y":
            ycoord_dimension = dimension
          if dimension["axis"] == "X":
            xcoord_dimension = dimension
           
        if hasLat == 1:
          latRangeDeg = abs(ad[6] - ad[7])                               # Range in degrees
          latResDeg = abs(ad[8])                                         # resolution in degrees
          latCellNum = str('%.0f' % (latRangeDeg / latResDeg))           # number of latitude cells
          latResMetric = abs(latResDeg * 111562)                         # convert to meters, using meters in a degree of lat at 70 deg
          latResMetricStr = '%.0f' % latResDeg
          latResPrint = latResMetricStr + ' m' 
          
          if latResMetric > 1000:
              latResMetricStr = str('%.1f' % (latResMetric /1000)) 
              latResPrint = latResMetricStr + ' km'

          #***
          # Longitude Calculations -  number of longitude cells by default
          #***
          
          lonRangeDeg = abs(ad[3] - ad[4])
          lonMeters70deg = 38187
          lonResDeg = abs(ad[5])
          lonCellNum = str('%.0f' % (lonRangeDeg / lonResDeg))
          lonResMetric = abs(lonResDeg * 38187) 
          lonResMetricStr = '%.0f' % lonResMetric 
          lonResPrint = lonResMetricStr + ' m' 
      
          if lonResMetric > 1000:
              lonResMetricStr = str('%.1f' % (lonResMetric/1000)) 
              lonResPrint = lonResMetricStr + ' km'
         
          #***
          # Combine into a single average resolution
          #***
        
          avgResMetric = (lonResMetric + latResMetric)/2
          avgResMetricStr = '%.0f' % lonResMetric
          avgResMetricPrint = avgResMetricStr +' m'
          avgResMetricPrintShort = '%.0f' % lonResMetric + ' m'
          
          if avgResMetric > 1000:
              avgResMetricStr = str('%.1f' % (avgResMetric/1000)) 
              avgResMetricPrint = avgResMetricStr + ' km'
              avgResMetricPrintShort = str('%.0f' % (avgResMetric/1000)) +' km'
            
          thisDataset["avgRes"] = avgResMetricPrintShort

          #***
          # Save additional individual dataset info to object
          #***

          latDim = next((dimension for dimension in thisDataset["dimensions"] if dimension["name"] == "latitude"))
          
          if float(latDim["latRange"][0]) < float(latDim["latRange"][1]) :
            isIncreasing = 1
          elif float(latDim["latRange"][0]) > float(latDim["latRange"][1]):
            isIncreasing = 0
          else:
            isIncreasing = "equal" 
            print('EQUAL')

          thisDataset["ycoord"] = {
          "name": ycoord_dimension["name"],
          "cellNum":latCellNum,
          "resolution_str":latResPrint,
          "avgRes":avgResMetricPrint,
          "avgResShort":avgResMetricPrintShort,
          "resolution_val":str(round(float(latResDeg),2)),
          "resolution_units":"degrees",
          "minRounded":str(math.floor(ad[6])),
          "maxRounded":str(math.ceil(ad[7])),
          "min":str(ad[6]),
          "max":str(ad[7]),
          "latres":latResPrint,
          "latcells":latCellNum,
          "isIncreasing":isIncreasing
          }
          thisDataset["xcoord"] = {
          "name": xcoord_dimension["name"],
          'cellNum':lonCellNum,
          'resolution_str':lonResPrint,
          'resolution_val':str(round(float(lonResDeg),2)),
          "resolution_units":"degrees",
          'minRounded':str(math.floor(ad[3])),
          'maxRounded':str(math.ceil(ad[4])),
          'min':str(ad[3]),
          'max':str(ad[4]),
          'lonres':lonResPrint,
          'loncells':lonCellNum
          }

        else:
          print('dataset does not have latitude dimension')
          ycoord_dimension = next((dimension for dimension in thisDataset["dimensions"] if dimension["axis"] == "Y"))
          xcoord_dimension = next((dimension for dimension in thisDataset["dimensions"] if dimension["axis"] == "X"))

          thisDataset["ycoord"] = {
            "name": ycoord_dimension["name"],
            "min": str(float(ycoord_dimension["valid_range"][0])), # str float cleans extra space at start...
            "max": str(float(ycoord_dimension["valid_range"][1])),
            "resolution_val": str(abs(float(ycoord_dimension["averageSpacing"]))),
            "resolution_units": ycoord_dimension["units"]
          }

          thisDataset["xcoord"] = {
            "name": xcoord_dimension["name"],
            "min": str(float(xcoord_dimension["valid_range"][0])),
            "max": str(float(xcoord_dimension["valid_range"][1])),
            "resolution_val": str(abs(float(xcoord_dimension["averageSpacing"]))),
            "resolution_units": xcoord_dimension["units"]
          }

          isIncreasing = 1
          thisDataset['avgRes'] = '25km'
        
        thisDataset['time']['start'] = startdatestrcal
        thisDataset['time']['end'] = enddatestrcal
        thisDataset['time']['startiso'] = startdateiso
        thisDataset['time']['endiso'] = enddateiso
        thisDataset['time']['startstr'] = startdatestr
        thisDataset['time']['endstr'] = enddatestr
        thisDataset['viewType'] = 'Full'
        thisDataset["dateOptions"] = dateOptions
        thisDataset["id"] = ad[0]
        thisDataset["subname"] =  thisDataset["subname"] #daily, weekly...
        thisDataset["parameters"] = thisDataset["parameters"]
        thisDataset["summary"] = ad[14]
        thisDataset["source"] = ad[1]

        # Determine source of the data files
        # Need to provide traceback to users who want file access when available
        # Will either:
        #   link to url (if is url)
        #   create a link back to pfeg erddap if is source files, but not originally in my erddap
        #   create a link to pw erddap if is source files and we are accessing them directly
        # If there are additional endpoints for accessing this data in file form, 

        sourceUrl = ad[13]
        localFilesUrl = ad[18]
        if (sourceUrl == '(local files)'):
          if (localFilesUrl != ''):
            thisDataset['filesUrl'] = localFilesUrl
          else:
            # this dataset originated from files, but not in this erddap')
            # seeing if we can find them in the pfeg erddap
            url = 'https://coastwatch.pfeg.noaa.gov/erddap/files/'+thisDataset["id"]+'/'
            http = urllib3.PoolManager(cert_reqs='CERT_REQUIRED', ca_certs=certifi.where())
            response = http.request('GET', url, timeout=15)
            
            if response.status == 404:
              print('response is not valid 404, could not find the location of the source files, setting to blank')
              thisDataset['filesUrl'] = ''
            elif response.status == 200:
              # Success, setting erddap source file url
              thisDataset['filesUrl'] = url
            else:
              print('Could not find the location of the source files')
        else:
          # use sourceUrl as files url
          thisDataset['filesUrl'] = sourceUrl
          
        if 'erddap' in thisDataset['filesUrl']:
          # source is erddap, setting display text
          thisDataset['filesUrlText'] = "View file collection in ERDDAP"
        elif 'thredds' in thisDataset['filesUrl']:
          # source is thredds, setting text
          thisDataset['filesUrlText'] = "View in THREDDS"
        else:
          # source is neither thredds or erddap, setting text
          thisDataset['filesUrlText'] = sourceUrl[:20] + '...'

        # Time Update Interval
        if ad[11]/86400 < 1 :
          thisDataset["updateInt"] = str(round(ad[11]/86400/24,0)) +' hours'
        elif ad[11]/86400 >= 1 and ad[11]/86400 < 88:
          thisDataset["updateInt"] = str( int( ad[11]/86400)) + ' days'
        elif ad[11]/86400 >= 88:
          thisDataset["updateInt"] = str( round( ad[11]/86400,0)) + ' months'

        # Time Resolution
        thisDataset["timeRes"] = str(ad[11]/86400) #FAKING FOR NOW !
      


def makeDatasetPages(webdir, logger, version_number):

  print('START - WRITING DATASET PAGE')
  
  catalogFn = webdir + "/config/catalog_temp.json"

  with open(catalogFn) as catalogfile:    
    cataloginfo = json.load(catalogfile)
  
  print('temp catalog file opened')
  
  timeNow = datetime.utcnow()
  timeNowLocal = datetime.now()
  print(timeNowLocal)
  
  dateInfo = {}
  dateInfo['timeNow'] = timeNow.replace(tzinfo=pytz.utc)
      
  dateInfo['sevendaysago'] = dateInfo['timeNow'] - timedelta(days = 7)
  dateInfo['thirtydaysago'] = dateInfo['timeNow'] - timedelta(days = 30)

  dateInfo['sevendaysagostr'] = dateInfo['sevendaysago'].strftime("%b %-d, %Y")
  dateInfo['thirtydaysagostr'] = dateInfo['thirtydaysago'].strftime("%b %-d, %Y")
  dateInfo['sevendaysagoIsoStr'] = dateInfo['sevendaysago'].strftime("%Y-%m-%dT%H:%M:%SZ")
  dateInfo['thirtydaysagoIsoStr'] = dateInfo['thirtydaysago'].strftime("%Y-%m-%dT%H:%M:%SZ")
  
  #Entry Loop
  for e in cataloginfo:
    
    print('===')
  
    entry = cataloginfo[e]
    # Using as a catch for non-entries in json file
    if (isinstance(entry, dict)):
      #print(entry["entryId"])

      #Get current time to write to bottom of pages, so we can see when they were last updated
      entry['pageWritten'] = str(timeNowLocal)
      
      landingDir = webdir +'/'+ entry["entryId"]
      downloadDir = landingDir + '/download'
      previewDir = landingDir + '/preview'

      # make directory if it doesn't exist
      if not os.path.exists(landingDir):
        os.makedirs(landingDir)
      if not os.path.exists(downloadDir):
            os.makedirs(downloadDir)
      if not os.path.exists(previewDir):
            os.makedirs(previewDir)

      entry["pageName"] = landingDir +'/index.php'
      entry["pageNameGraph"] = landingDir + '/preview/index.php'
      entry["pageNameDownload"] = landingDir + '/download/index.php'

      calends=[]; calstarts=[]; inERDDAPList = []

      # Indiv. Dataset Loop
      for thisDataset in entry['datasets']:
          
        datasetId = thisDataset['id']
        print('  '+ thisDataset['id'])
        print(thisDataset["inERDDAP"])
        

        #sometimes we can get all datasets but not data, populate info as long as we have metadata  
        try:
          thisDataset['allDatasets'] 
        except:
          logger.info('  * Dataset metadata was not retrieved.')
          logger.info('  * Removing this dataset from the catalog by flagging it as inERDDAP = 0.')
          thisDataset["inERDDAP"] == 0
          thisDataset["inERDDAPReason"] = "Dataset metadata not available"
        else:
          restOfLoop(thisDataset, dateInfo)

        inERDDAPList.append(thisDataset["inERDDAP"])      
            
      print(' - Preparing for Writing Templates - Subentry Loops Complete')  
      print(entry['entryName'])
      #print(inERDDAPList)

      # Templates need to know if only some of the datasets for an entry are valid
      # so they don't make tabs and content for datasets that are inactive
      print(inERDDAPList)
      # Find first valid dataset within an entry (used for creating active tabs)
      try:
        firstValidDataset = inERDDAPList.index(1)
        entry['firstValidDataset'] = firstValidDataset
      except:
        entry['firstValidDataset'] = -1

    # Create the context that is sent to the template
    # Passes info for this entry (multiple datasets)

    if (sum(inERDDAPList) == 0):
      # No valid datasets in this whole Entry
      entry['entryValid'] = 1
      viewType="inactive"
    else:
      entry['entryValid'] = 0

    print(entry["entryId"])
    # This is sent to the template
    context = {'entryid':entry["entryId"],
               'calStart': calstarts,
               'calEnd': calends,
               'title':str(entry["entryName"]),
               'entry':entry,
               'version_number':version_number
               }
    
    create_index_html(context)
  
  with open(catalogFn,"w") as catalogfile:
    json.dump(cataloginfo, catalogfile)

  print('END - WRITING DATASET PAGE')  

  return(1)
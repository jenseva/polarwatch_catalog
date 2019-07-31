#!/usr/bin/python

# Writes html for dataset pages
# reads catalog.json for info

import os
import dateutil.parser
import json
from datetime import datetime, timedelta
import pytz
import logging
import urllib3
import certifi

def getTimes(webdir, logger):

  print('GET TIMES START')
  
  # Open catalog config file, find valid entries
  catalogFn = webdir + "/config/catalog_temp.json"
  with open(catalogFn) as catalogfile:    
    cataloginfo = json.load(catalogfile)

  timeNow = datetime.utcnow()
  timeNowLocal = datetime.now()

  #Entry Loop
  for e in cataloginfo:
    
    entry = cataloginfo[e]
    logger.info(entry["entryId"])
    #print entry
    pagedir = webdir +'/'+ entry["entryId"]
    
    # make directory if it doesn't exist
    if not os.path.exists(pagedir):
      logger.info('  no folder for this dataset, cannot create times file')
    
    calends=[]; calstarts=[]; inERDDAPList=[]; idList=[]; timeList=[];

    # start a json object, write times for each dataset in this entry, then start a new file
    thisEntryTimes = {}
    
    # Indiv. Dataset Loop
    for datasetInEntry in entry['datasets']:
        
      datasetId = datasetInEntry['id']
      inERDDAPList.append(datasetInEntry["inERDDAP"])
      
      if datasetInEntry["inERDDAP"] == 0:
        logger.info('  * Dataset Id is not listed in ERDDAP at the moment: ' + datasetInEntry["id"])
      else:  
        try:
          datasetInEntry['allDatasets']
        except:
          logger.info('  * While the dataset is listed in ERDDAP at the moment. Dataset metadata was not retrieved.')
          logger.info('  * Removing this dataset from the catalog by flagging it as inERDDAP = 0.')
          datasetInEntry["inERDDAP"] == 0
          datasetInEntry["inERDDAPReason"]="all datasets not retrieved"
        else:
          # if this is a valid dataset
          for i, columnName in enumerate(datasetInEntry["allDatasetsColRef"]):
            if columnName =='minTime': minTimeCol = i
            if columnName =='maxTime': maxTimeCol = i
            if columnName =='datasetID': idCol = i
                  
          timeStart = datasetInEntry["allDatasets"][minTimeCol]
          timeEnd = datasetInEntry["allDatasets"][maxTimeCol]
          did = datasetInEntry["allDatasets"][idCol]
          timesUrl = 'https://polarwatch.noaa.gov/erddap/griddap/' + did + '.json?time[(' + timeStart + '):1:(' + timeEnd+ ')]'
          http = urllib3.PoolManager(cert_reqs='CERT_REQUIRED', ca_certs=certifi.where())
                                    
          try:
              response = http.request('GET', timesUrl, timeout=15)
          except urllib3.exceptions.HTTPError as e:
              logger.error('The server couldnt fullfill the request. Adding invalid flag to dataset.')
              logger.error('Error Code: ', e.code)
          except urllib3.exceptions.URLError as e:
              logger.error('Failed to reach erddap server for: '+ timesUrl)
              logger.error('reason: ', e.reason)
          else:
              try:
                timesResponse = json.loads(response.data.decode('utf-8'))
              except:
                print(timesUrl)
              else:
                theseTimes = []
                # if a response is returned from ERDDAP
                if timesResponse:
                  timeList.append(timesResponse['table']['rows'] )
                  idList.append(did)
                      
    thisEntryTimes["ids"] = idList
    thisEntryTimes["timeList"] = timeList
    timesFn = pagedir +'/'+'timeList.json'
    
    f = open(timesFn, 'w') 
    json.dump(thisEntryTimes, f)
    f.close()              
  
  print('GET TIMES END')
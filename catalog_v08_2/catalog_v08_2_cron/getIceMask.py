# Get corresponding ice Mask
import os
import dateutil.parser
#import json
from datetime import datetime, timedelta
import pytz
import logging
import urllib3
import certifi
import csv
import io
import json
from pytz import timezone
import numpy as np
from netCDF4 import Dataset as netcdf_dataset

def getClosestIceMask(logger, date_str):

    print('Date of data: '+ date_str)
    
    date_datetime= dateutil.parser.parse(date_str)
    date_datetime.replace(tzinfo=timezone('UTC'))   
    searchStartDate_datetime = date_datetime - timedelta(days=33)
    searchStartDate_str = searchStartDate_datetime.strftime("%Y-%m-%dT%I:%M:%SZ")
    searchEndDate_datetime = date_datetime + timedelta(days=33)
    searchEndDate_str = searchEndDate_datetime.strftime("%Y-%m-%dT%I:%M:%SZ")
    
    # See if we need to modify these times based 
    # on the extent of the ice mask dataset time range
    # because erddap throws an error if the date is too 
    # far into the future outside of the range of the dataset

    maskInfoUrl = 'https://polarwatch.noaa.gov/erddap/info/jplMURSST41/index.csv'
    http = urllib3.PoolManager(cert_reqs='CERT_REQUIRED', ca_certs=certifi.where())
    
    try:
        r = http.request('GET', maskInfoUrl, preload_content=False, timeout=20)
    except:
        logger.error("  * Error: Retrieving ice mask info file")
    else:
        reader = csv.reader(io.StringIO(r.read().decode('utf-8')), delimiter=',')
        for row in reader:
            if row[0] == "attribute" and row[2] == "time_coverage_end":
                maxIceMaskDate_datetime = dateutil.parser.parse(row[4])
                maxIceMaskDate_datetime.replace(tzinfo=timezone('UTC'))
                # compare times, replace if needed
                if maxIceMaskDate_datetime < searchEndDate_datetime:
                    print('replacing')
                    searchEndDate_str = maxIceMaskDate_datetime.strftime("%Y-%m-%dT%I:%M:%SZ")

    # create a plus or minus two months on that date to grab a limited section of the times
    # get ice mask times from erddap so we can search and find the closest one

    iceMaskTimesUrl = 'https://polarwatch.noaa.gov/erddap/griddap/jplMURSST41.json?time[(' + searchStartDate_str + '):1:(' + searchEndDate_str+ ')]'                                      

    try:
        response = http.request('GET', iceMaskTimesUrl, timeout=15)
    except urllib3.exceptions.HTTPError as e:
        logger.error('The server couldnt fullfill the request.')
        logger.error('Error Code: ', e.code)
    except urllib3.exceptions.URLError as e:
        logger.error('Failed to reach erddap server for: '+ iceMaskTimesUrl)
        logger.error('reason: ', e.reason)
    else:
        timesResponse = json.loads(response.data.decode('utf-8'))
        try:
            timesResponse = json.loads(response.data.decode('utf-8'))
        except:
            print('couldn''t read json')
            gotTimes=0
        else:
            timeList_datetime = []
            for val in timesResponse['table']['rows']:
                val_datetime = dateutil.parser.parse(val[0])
                val_datetime.replace(tzinfo=timezone('UTC'))
                timeList_datetime.append(val_datetime)
            gotTimes =1
                
    # find the closest time
    if gotTimes == 1 :    
        timeList_datetime = np.array(timeList_datetime)    
        timeList_datetime.sort
        datematch = np.searchsorted(timeList_datetime, date_datetime )  
        closest_date_str = timeList_datetime[datematch-1].strftime("%Y-%m-%dT%I:%M:%SZ")
        print('Date of ice mask request: '+ closest_date_str)
        
        #now request that mask
        maskUrl = 'https://polarwatch.noaa.gov/erddap/griddap/jplMURSST41.nc?mask[('+closest_date_str+'):1:('+closest_date_str+')][(-89.990000):35:(89.990000)][(-179.990000):71:(180.000000)]'
        print(maskUrl)
        try:
            r = http.request('GET', maskUrl, preload_content=False, timeout=70)
        except urllib3.exceptions.HTTPError as he:
            print('HTTP ERROR: the server couldnt fulfill the request')
            print(he)
        except urllib3.exceptions.URLError as e:
            logger.error('  * Failed to reach erddap server. Stopping.')
            logger.error('  * reason: ', e.reason)
        except Exception:
            logger.error('generic exception: ' + traceback.format_exc())
        else:
            with open('icemask.nc', 'wb') as out:
                while True:
                    icedata = r.read(1024*1024)
                    if not icedata:
                        break
                    out.write(icedata)
            r.release_conn()

        # Try opening the returned mask data file to confirm we retrieved valid data
        maskNetCDF = netcdf_dataset('icemask.nc')

        return maskNetCDF

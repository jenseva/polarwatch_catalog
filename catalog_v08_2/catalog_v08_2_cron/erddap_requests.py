#!/usr/bin/python

from netCDF4 import Dataset as netcdf_dataset
import numpy as np
import math
import urllib
from urllib2 import Request, urlopen, URLError, HTTPError
import os
import dateutil.parser
from dateutil.relativedelta import *
import csv
from datetime import datetime, timedelta
import logging
import tracebackfile = 'dataset.nc'
        
# Request a netcdf file
# Input request url as a string and filename as a string
# Writes file and
# Returns a python netcdf dataset
def request_netcdf_dataset(request_url, nc_filename):             
    req = Request(url)

    try:
        response = urlopen(req, timeout=70)
    except HTTPError as he:
        # Update config file to show that the dataset is not valid 
        print("Could not access data from ERDDAP")
        print(he.reason)
    except URLError as e:
        print('  * Failed to reach erddap server. Stopping.')
        print('  * reason: ', e.reason)
    except Exception:
        print('generic exception: ' + traceback.format_exc())
        print("General Error (likely timeout)")
    else:
        print('  * data file returned from erddap')
        CHUNK = 16 *1024
        with open(nc_filename,'wb') as f:
            while True:
                chunk = response.read(CHUNK)
                if not chunk:
                    break
                f.write(chunk)
        try:
            dataset = netcdf_dataset(nc_filename)
        except:
            print("Not valid netcdf returned")
        else:
            return dataset
'''
Basemaps are made from etopo netcdf data in erddap
etopo data is in lat/lon (epsg:4326)
plots are generated using cartopy in 4326 (lat/lon), 3031 (south polar stereo), 3413 (north polar stereo)
plots are made as both png and jpg
jpg files are used in the leaflet web map and are optimized for web loading 
'''

# Uses code from 2019_03_12_preview_with_cartopy.ipynb
# Modifies it to use etopo data to generate basemaps that use 
# the same polygon clippping as the other script
# Running in geo3 environment
# location /home/pythonscripts/notebooks/catalog[v]
# filename: 2019_03_13_makeBasemap_with_polygon_clipping.ipynb

#using this 3/25/19 to make basemaps with erddap coloring

import os
import sys
import ctypes
import numpy as np
import urllib3 
import certifi
import json

# for importing and working with shape files
import fiona
from shapely.geometry import shape
from shapely.geometry import MultiPolygon
from shapely.geometry import Polygon
from shapely.geometry import mapping
from functools import partial
import pyproj
from shapely.ops import transform

#for fetching and working with the satellite data
from netCDF4 import Dataset as netcdf_dataset

#for masking and plotting the data
#import matplotlib
#matplotlib.use('Agg')
from matplotlib import path
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import matplotlib.colors as colors
import cartopy
import cartopy.crs as ccrs

#for outputting data for web
import math 
import csv

from cartopy.io import shapereader
from cartopy.mpl.gridliner import LONGITUDE_FORMATTER, LATITUDE_FORMATTER
from datetime import datetime
import os
import logging
# for converting from KML

import sys
sys.executable

import cmocean
from matplotlib.colors import LinearSegmentedColormap #for making custom ocean/land palettes

# A function that fetches metadata from an ERDDAP server
# Provides details about the dataset that we can use to
# formulate our data request. We do this to determine the available
# extent (time, lat and lon) of the dataset which prevents us from making 
# unreasonable data requests that the server will reject

#Input: ERDDAP ID
#Output: Info about dataset for checking extents and forming data query

def getDatasetInfo(dataset_id):

    http = urllib3.PoolManager()

    metadataUrl = 'https://polarwatch.noaa.gov/erddap/info/'+dataset_id+'/index.json'

    try:
        response = http.request('GET', metadataUrl)
    except HTTPError as e:
        print('The server couldnt fullfill the request')
        print('Error Code: ', e.code)
    except URLError as e:
        print('Failed to reach erddap server for: '+ metadataUrl)
        print('reason: ', e.reason)
    else:
        # load information about dataset
        datasetMeta = json.loads(response.data.decode('utf-8'))
               
    return datasetMeta

def makemd(datasetMeta):
    # A newer, better version of this is somewhere...
    
    # There's a lot of information about the dataset
    # Pull out what we are interested in

    # set a flag to indicate if the dataset includes altitude dimension
    md = {'altf':0} 
    parameters = [];

    # Metadata Loop
    for x in datasetMeta['table']['rows']:   

        # list the parameters, latitude range, longitude range, time range and altitude range (if any)
        if x[0] == 'variable':               
            parameters.append(x[1])
        if x[0] == 'attribute' and x[1] == 'latitude' and x[2] == 'actual_range':
            md['latRange'] = x[4].split(',')
        if x[0] == 'attribute' and x[1] == 'longitude' and x[2] == 'actual_range':
            md['lonRange'] = x[4].split(',')
        if x[0] == 'attribute' and x[1] == 'xgrid' and x[2] == 'actual_range':
            md['xgridRange'] = x[4].split(',')
        if x[0] == 'attribute' and x[1] == 'ygrid' and x[2] == 'actual_range':
            md['ygridRange'] = x[4].split(',')
        if x[0] == 'attribute' and x[2] == 'time_coverage_end':
            md['time_coverage_end'] = x[4]
        if x[0] == 'attribute' and x[2] == 'time_coverage_start':
            md['time_coverage_start'] = x[4]
        if x[0] == 'attribute' and x[1] == 'altitude':
            md['altf'] = 1
        if x[0] == 'attribute' and x[1]=='NC_GLOBAL' and x[2]=='proj_crs_code':
            md["proj_crs_code"] = x[4]

    md['parameters'] = parameters
    return md


def getDimensionInfo(dimensions, dimensionName, field):
    for dimension in dimensions:
        if dimension["name"] == dimensionName:
            return dimension[field]
            break


# Get Dimension List and header info

def getDimensions(metadata):
    #Get Dimension List and header info
    dimensions = []
    for x in metadata['table']['rows']:
        dimension = {}
        # pull info from first line (header) in dimension
        if x[0] == 'dimension':
            dimension["name"] = x[1]
            dh = x[4].split(',')
            for dhi in dh:
                dhi_split = dhi.split('=')
                dhi_key = dhi_split[0].lstrip()
                dimension[dhi_key] = dhi_split[1]
            dimensions.append(dimension)
    # Get dimension details
    for x in metadata['table']['rows']:
        for dimension in dimensions:
            if x[0] == 'attribute' and x[1] == dimension["name"]:
                dim_field_val = x[4].split(',')
                if len(dim_field_val) > 1:
                    dimension[x[2]] = dim_field_val
                elif len(dim_field_val) == 1:
                    dimension[x[2]] = dim_field_val[0]
                else:
                    pass

    return dimensions


# input is ERDDAP dataset info query json response
# output is a list of parameters (variables) for the dataset
def getParameterList(datasetMeta):
    parameters = []
    for x in datasetMeta['table']['rows']:
        if x[0] == 'variable':
            print(x)
            parameters.append(x[1])
    return parameters
    

# This function retrieves satellite data from an ERDDAP server
# Inputs define the data request:
# the dataset id, the parameter, lat/lon/altitude bounds (4326), and time range 
# Output: data for bounds in 4326
# Set this up to be in a loop and not just one request because one request is too large
# breaking it down into smaller geographic chunks makes this doable through the REST API

def getData(dataset_id, parameter, bounds, time, sub, basemapImageDir):
    print(bounds)
    print(parameter)
    print(time)

    lat1 = bounds[0]
    lat2 = bounds[1]
    lon1 = bounds[2]
    lon2 = bounds[3]
    altf = bounds[4]
    
    time1 = time # using just one timestamp for this example
    time2 = time
    
    if altf == 1:
        #write query with altitude, haven't tested this
        alt1 = bounds[5]
        alt2 = bounds[6]
        altsub = 1
        if time != '':
            query = parameter+'[(%s):%s:(%s)][(%f):%s:(%f)][(%f):%s:(%f)][(%f):%s:(%f)]' % (time1,sub,time2,alt1, altsub, alt2, lat1,sub,lat2,lon1,sub,lon2) 
        else:
            query = parameter+'[(%f):%s:(%f)][(%f):%s:(%f)][(%f):%s:(%f)]' % (alt1, altsub, alt2, lat1,sub,lat2,lon1,sub,lon2) 

    else:
        #write query without altitude
        if time != '':
            query = parameter+'[(%s):%s:(%s)][(%f):%s:(%f)][(%f):%s:(%f)]' % (time1,sub,time2,lat1,sub,lat2,lon1,sub,lon2) 
        else:
            print('here')
            query = parameter+'[(%f):%s:(%f)][(%f):%s:(%f)]' % (lat1,sub,lat2,lon1,sub,lon2) 
        
    base_url = 'http://polarwatch.noaa.gov/erddap/griddap/'+ dataset_id +'.nc?'
    url = base_url + query
    
    print(url)
    
    file = basemapImageDir + '/'+ parameter+'.nc'

  
    http = urllib3.PoolManager(cert_reqs='CERT_REQUIRED', ca_certs=certifi.where())
    r = http.request('GET', url, preload_content=False)

    with open(file, 'wb') as out:
        while True:
            data = r.read(1024*1024)
            if not data:
                break
            out.write(data)

    r.release_conn()
    
    # add a real check here
    print ('Satellite Data File Retrieved')

    datafile = netcdf_dataset(file)
    dataset={
        "data":datafile,
        "url":url
    }
    return dataset


# In[2]:

def getRequestBounds(md, req):
    print("Getting Bounds for ERDDAP Request...")
    # Uses ERDDAP lat_range and lon_range to determine request 
    # resests values to within dataset limits and sets the lat order
    
    bounds = req["bounds"]
    
    # LATITUDE
    # Note: latRange is already in the order that erddap needs 
    #       latRange field is created in the catalog.py script
    d_ycoord_1 = float(req['ycoord_range'][0])
    d_ycoord_2 = float(req['ycoord_range'][1])
    
    if d_ycoord_1 < d_ycoord_2:
        # Lower latitude value goes first in data query
        ycoord1 = float(bounds[1])
        ycoord2 = float(bounds[0])
        ycoordOrder = "lowtohigh"
        if ycoord1 < d_ycoord_1: ycoord1 = d_ycoord_1  # Adjust min ycoord to data extent
        if ycoord2 > d_ycoord_2: ycoord2 = d_ycoord_2  # Adjust max ycoord to data extent')    
    elif d_ycoord_1 > d_ycoord_2:
        # Lower latitude value goes second in data query
        ycoord1 = float(bounds[0])
        ycoord2 = float(bounds[1])
        ycoordOrder = "hightolow"
        if ycoord1 > d_ycoord_1: ycoord1 = d_ycoord_1  # Adjust max ycoord to data extent
        if ycoord2 < d_ycoord_2: ycoord2 = d_ycoord_2  # Adjust min ycoord to data extent
    else:
        print('stop script and send alert, this dataset might have incorrect metadata')
    
    # LONGITUDE
    d_xcoord_1 = float(req['xcoord_range'][0])
    d_xcoord_2 = float(req['xcoord_range'][1])
    xcoord1 = float(bounds[2])
    xcoord2 = float(bounds[3])
    if xcoord1 < d_xcoord_1: xcoord1 = d_xcoord_1   # Adjust min xcoord to data extent
    if xcoord2 > d_xcoord_2: xcoord2 = d_xcoord_2   # Adjust max xcoord to data extent

    # Setup Altitude Query 
    if getDimensionInfo(md["dimensions"], 'altitude', 'onlyValue'):
        thisAltVal = getDimensionInfo(md["dimensions"], 'altitude', 'onlyValue')
        alt1 = thisAltVal
        alt2 = thisAltVal
        qbounds = [ycoord1, ycoord2, xcoord1, xcoord2, ycoordOrder, 1, alt1, alt2]
    else:
        qbounds = [ycoord1, ycoord2, xcoord1, xcoord2, ycoordOrder, 0]
    
    return qbounds 


# In[3]:

print('main start')
print(sys.argv)

catalog_v = 'catalogv08_2'
map_proj = 'epsg4326'
dataset_id = 'etopo180'
entryId = 'etopo'
parameter = 'altitude'
colorBar = 'KT_deep_r,,,-5500,1000,'
cache_date = '1509'

m0 = datetime.now()
print(catalog_v)

http = urllib3.PoolManager() 

working_dir = '/home/jpatterson/pythonscripts/catalogv08_2'

basemapImageDirRoot = working_dir + '/basemaps/erddap_style/'
print(basemapImageDirRoot)
    
if not os.path.exists(basemapImageDirRoot):
    os.makedirs(basemapImageDirRoot) 
    
basemapImageDir = basemapImageDirRoot 


# In[4]:

# Get dataset metadata info from ERDDAP in preparation for data request
#print('here')
erddap_metadata = getDatasetInfo(dataset_id)
#print(erddap_metadata)

md = makemd(erddap_metadata)

md["dimensions"] = getDimensions(erddap_metadata)

md["parameters"] = getParameterList(erddap_metadata)

#print(md)

try:
    md["proj_crs_code"]
except:
    md["proj_crs_code"] = "EPSG:4326" #assume that if a projection is not specified it is 4326
else:
    pass
#print(md["proj_crs_code"])


# In[5]:

#Keep track of the input info to pass back to the webpage
req = {
    'projection': map_proj,
    'dataset_id': dataset_id,
    'parameter':parameter,
    'colorBar':colorBar,
    'cache_date':cache_date
}  
print(req)


# In[6]:

# Test defining 3412...
# 03/12/19 was using northpolarstereo instead of sterographic. 
# that yielded an error and could be the cause of my graphics generation problems
# Changed to stereographic and set the central latitude 3/12
ccrs_3031 = ccrs.Stereographic(central_latitude=-90, central_longitude=0.0,true_scale_latitude=-71,globe=ccrs.Globe(datum='WGS84',ellipse='WGS84'))
ccrs_3412 = ccrs.Stereographic(central_latitude=-90, central_longitude=0.0,true_scale_latitude=-70,globe=ccrs.Globe(datum='WGS84',ellipse='WGS84'))
ccrs_3413 = ccrs.Stereographic(central_latitude=90, central_longitude=-45,true_scale_latitude=70,globe=ccrs.Globe(datum='WGS84',ellipse='WGS84'))
ccrs_4326 = ccrs.PlateCarree()# plate carre vs geodetic in cartopy?

# Setup Cartopy projection of basemap dataset
if md["proj_crs_code"] == "EPSG:4326":
    ccrs_dataset = ccrs_4326
    
print('Dataset projection (cartopy)')
print(ccrs_dataset)    

# Define projection of the data    
pyproj_dataset_proj = pyproj.Proj(init=md["proj_crs_code"])      # data coordinates/projection

# Define map details
if map_proj == "epsg3031":
    map_extent_fn = working_dir+"/masks/SouthernHemisphereMapExtent.shp"
    pyproj_map_proj = pyproj.Proj(init='epsg:3031')  # South polar stereo plots)
    ccrs_map_proj = ccrs_3031
    req["crs"] = "EPSG:3031"
elif map_proj == "epsg3413":
    map_extent_fn =  working_dir+"/masks/NorthernHemisphereMapExtent.shp"
    pyproj_map_proj = pyproj.Proj(init='epsg:3413')      #North polar stereo (data coordinates)
    ccrs_map_proj = ccrs_3413
    req["crs"] = "EPSG:3413"
else:
    ccrs_map_proj = ccrs_4326    
    req["crs"] = "EPSG:4326"


# In[7]:

# PREPARE TO GET DATA    

ycoord_dimension = next((dimension for dimension in md["dimensions"] if dimension["axis"] == "Y"))
#print(ycoord_dimension)
xcoord_dimension = next((dimension for dimension in md["dimensions"] if dimension["axis"] == "X"))        
print(ycoord_dimension["name"])

ycoord_cells = getDimensionInfo(md["dimensions"], ycoord_dimension["name"], 'nValues')
xcoord_cells = getDimensionInfo(md["dimensions"], xcoord_dimension["name"], 'nValues')

# use erddap info to determine if latitude is increasing or decreasing
req["ycoord_range"] = getDimensionInfo(md["dimensions"], ycoord_dimension["name"], 'actual_range') 
ycoord_avgSpacing = getDimensionInfo(md["dimensions"], ycoord_dimension["name"], 'averageSpacing') # used in check bounds

if float(ycoord_avgSpacing) >= 0:
    ycoord_1 = str(float(req["ycoord_range"][0]))
    ycoord_2 = str(float(req["ycoord_range"][1]))
else:
    ycoord_1 = str(float(req["ycoord_range"][1]))
    ycoord_2 = str(float(req["ycoord_range"][0]))
        
req["ycoord_range"] = [ycoord_1,ycoord_2]
req["xcoord_range"] = getDimensionInfo(md["dimensions"], xcoord_dimension["name"], 'actual_range')

print('these should be the same type:')
print(req["ycoord_range"])
print(req["xcoord_range"])
#req["ycoord_res"] = getDimensionInfo(dimensions, ycoord_dimension["name"], 'averageSpacing')
#req["xcoord_res"] = getDimensionInfo(dimensions, xcoord_dimension["name"], 'averageSpacing')

# Note: Cannot use ERDDAP actual range plus resolution to determine extent (innaccurate)

# using erddap provided dataset size to determine how large of spacing to use for dataset request.
# want images to be less than 1000px
ycoord_sub = float(ycoord_cells)/800
xcoord_sub = float(xcoord_cells)/800

# pick the larger of the two spacing options, should usually be the lon sub
if ycoord_sub <= xcoord_sub: sub = xcoord_sub
else: sub = ycoord_sub
#sub = (lat_sub + lon_sub)/2         # Use the average of the two 
req["sub"] = str((math.ceil(sub)))  # Round up to largest whole number
                                   
# To DO: Use polygon extent to limit request to the server

# return the bounds in the format required by the data server
ycoord_min = ycoord_dimension['actual_range'][0]
ycoord_max = ycoord_dimension['actual_range'][1]
xcoord_min = xcoord_dimension['actual_range'][0]
xcoord_max = xcoord_dimension['actual_range'][1]

req["bounds"] = [ycoord_max, ycoord_min, xcoord_min, xcoord_max]
#print(req["bounds"])

#adjust bounds order for erddap if needed
qbounds = getRequestBounds(md, req)
#print(qbounds)

# You can reduce the resolution of the data returned from the server
# This can be helpful during testing if the dataset is very large
# Set this to one for full resolution, two for half, and so on
req["sub"]='4'
print(req["sub"])

# In[8]:

# GET DATA
# m0 = datetime.now()

#dataset = getData(dataset_id, parameter, qbounds, '', req["sub"],basemapImageDir)

file = basemapImageDir + '/'+ parameter+'.nc'
datafile = netcdf_dataset(file)
dataset={
        "data":datafile
}

dataObj = dataset['data'] 

# check data file for expected altitude dimension response 
# pull out parameter data and x, y
if len(np.shape(dataObj.variables[parameter])) == 3: data = dataObj.variables[parameter][0, :, :]
elif len(np.shape(dataObj.variables[parameter])) == 4: data = dataObj.variables[parameter][0, 0,:, :]
elif len(np.shape(dataObj.variables[parameter])) == 2: data = dataObj.variables[parameter][:, :]   

xgrid = dataObj.variables[xcoord_dimension["name"]][:]
ygrid = dataObj.variables[ycoord_dimension["name"]][:]

# Run calculations on the grid
print(len(xgrid))
print(len(ygrid))
print(max(ygrid))
print(min(ygrid))

xmin = float(xgrid[0])
xmax = float(xgrid[len(xgrid)-1])
ymin = float(ygrid[len(ygrid)-1])
ymax = float(ygrid[0])             # note: ymax should be bigger than ymin and is towards top of plot

# running into problems here because some datasets are increasing others are not...

# output projected bounds corner points for leaflet
# format to pass is top left, bottom left, bottom right, top right
top_left = [xmin, ymax]
bottom_left = [xmin, ymin]
bottom_right = [xmax, ymin]
top_right = [xmax, ymax]
req["boundsProjected"] = [top_left, bottom_left, bottom_right, top_right]
#print(datetime.now()-m0)
#xrange = abs(xmin) + abs(xmax)
#yrange = abs(ymin) + abs(ymax)

# doing this because of the way pcolor plots the data
# to do: does this really help?
cellHeight = float(getDimensionInfo(md["dimensions"], ycoord_dimension["name"], 'averageSpacing'))
cellWidth = float(getDimensionInfo(md["dimensions"], ycoord_dimension["name"], 'averageSpacing'))

xgridMod = xgrid - (cellWidth/2)
xgridMod = np.append(xgridMod, xgridMod[len(xgridMod)-1] + cellWidth)
#print(xgridMod)
ygridMod = ygrid + (cellHeight/2)
ygridMod = np.append(ygridMod, ygridMod[len(ygridMod)-1] - cellHeight)
    
print(len(xgrid)) # xgrid is a tuple
print(len(xgridMod.shape)) # xgridmod is a tuple
#adjust start left by half pixel width (move to the left)
#startLeft = xgrid[0] - (cellWidth/2)
#adjust start top by half pixel width ( move towards the top)
#startTop = ygrid[0] + (cellHeight/2)

#rows = len(ygrid)-1
#cols = len(xgrid)-1


# In[11]:

# Clip the data to the polar shape file    
# Convert the bounds polygon (stored as 4326) to the projection of the data 

X, Y = np.meshgrid(xgrid, ygrid)    

print('dataset projection:')
print(pyproj_dataset_proj)

if (map_proj == 'epsg3031') or (map_proj == 'epsg3413'):
    


    areaProps = []

    for pol in fiona.open(map_extent_fn):
        areaProps.append(pol['properties'])
    Multi = MultiPolygon([shape(pol['geometry']) for pol in fiona.open(map_extent_fn)])
    #Multi.wkt
    polygon = Multi[0] # we only have one polygon   
    #print(polygon)
    print(polygon.bounds)

    # Transform the shapefile data to the projection of the data
    # If polygon and dataset projections are different, 
    # convert polygon coordinates to dataset projection coordinates
    
    #Define projection of the polygon
    pyproj_shape_ext = pyproj.Proj(init='epsg:4326')      # lon/lat coordinate system (polygon kml file)

    print('polygon projection (4326)')
    print(pyproj_shape_ext)
    
    # This is set in an earlier block
    print('map projection:')
    print(pyproj_map_proj)
    
    # If data and polygon are in different projections
    # Create a new polygon in the projection of the DATA
    if pyproj_dataset_proj != pyproj_shape_ext:
        project = partial(
            pyproj.transform,
            pyproj_shape_ext,               # lon/lat coordinate system, polygon crs
            pyproj_dataset_proj)          # polar stereo ...
        p_dataset_proj = transform(project, polygon)  # new shapely polygon with new projection
        #print(p_dataset_proj.bounds) #minx, miny, maxx, maxy
    else:
        # will be true for datasets that are in 4326
        print('No polygon transofrmation necessary. Both data and polygon are in same projection. ')
        #This should never happen because poly is in 4326 and this section excludes 4326')
        p_dataset_proj = polygon


    # Convert polygon to a path for plotting/masking data
    #polyListx, polyListy = p_dataset_proj.exterior.xy              # perimeter of polygon 
    #polyList = list(zip(list(polyListx),list(polyListy)))          # formatted perimeter
    #mapBoundsPath = path.Path(polyList)                            # path for data mask, in dataset projection
    #print('Polygon now in data projection')
    #print(p_dataset_proj.bounds)
    
    project = partial(
        pyproj.transform,
        pyproj_shape_ext,         # lon/lat coordinate system, polygon crs
        pyproj_map_proj)          # polar stereo ...
    p_map_proj = transform(project, polygon)  # new shapely polygon with new projection
    
    print(p_map_proj.bounds) #minx, miny, maxx, maxy
    
    # Convert polygon to a path for plotting/masking data
    polyListx, polyListy = p_map_proj.exterior.xy              # perimeter of polygon 
    polyList = list(zip(list(polyListx),list(polyListy)))      # formatted perimeter
    mapBoundsPath_map_proj = path.Path(polyList)               # path for data mask, in map projection
    print('Polygon now in map projection')

    map_xmin = p_map_proj.bounds[0]
    map_ymin = p_map_proj.bounds[1]
    map_xmax = p_map_proj.bounds[2]
    map_ymax = p_map_proj.bounds[3]

    
    x_map_proj, y_map_proj = pyproj.transform(pyproj_dataset_proj,pyproj_map_proj, X, Y)  
    points1 = np.array((x_map_proj.flatten(), y_map_proj.flatten()))
    points = points1.T # break it down

    ## Create a mask from mapBoundsPath
    print('creating a  masked array')
    # mapBoundsPath is in data projection
    # X is unmodified in dataset projection

    mask = mapBoundsPath_map_proj.contains_points(points).reshape(x_map_proj.shape) # calc and grid a mask based on polygon path

    # Create masked array
    #datamasked = np.ma.masked_where(mask != True, data) # create masked data array
    if (map_proj == 'epsg3413'):
        datamasked = np.ma.masked_where(Y < 50.400, data)
        landmask = np.ma.masked_less(data,0) & np.ma.masked_where(Y < 50.400, data) #& np.ma.masked_where(mask != True, data)# & np.ma.masked_where(Y < 50, data)#
    
    elif (map_proj == 'epsg3031'):
        datamasked = np.ma.masked_where(Y > -49.88, data)
        landmask = np.ma.masked_less(data,0) & np.ma.masked_where(Y > -49.88, data) #& np.ma.masked_where(mask != True, data)# & np.ma.masked_where(Y < 50, data)#
    
    # run check to make sure thre is data within the area:
    try: 
        np.min(datamasked[~datamasked.mask])
    except ValueError:
        print('No data within map bounds polygon for this timestamp')
    else:
        print("Some data in map bounds polygon, calculating number of data points:")
        print(datamasked.count())
else:
    # global plot
    map_xmin = xmin
    map_ymin = ymin
    map_xmax = xmax
    map_ymax = ymax
    datamasked = data
    landmask = np.ma.masked_less(data,0)

#print(np.min(datamasked))
#print(np.min(landmask))


# Colormaps for bathymetry
# ESRI Ocean color scale
colors = [(0.21, 0.355, 0.54), (0.16, 0.398, 0.648), (0.003, 0.484, 0.699),
          (0.320,0.558,0.796),(0.382,0.621,0.847),(0.523,0.699,0.917),
          ((149/256),(188/256),(230/256)), ((170/256),(207/256),(242/256)),
          ((181/256),215/256,247/256), (191/256,224/256,255/256),(209/256,233/256,255/256)
         ]  # R -> G -> B
#mapbox light color
colors = [(202/256,210/256,211/256), (202/256,210/256,211/256)]
# erddap color
colors = [(126/256,127/256,128/256), (126/256,127/256,128/256)]

# Colormaps for Land
#ESRI Ocean color scale
land_colors = [(245/256,247/256,243/256),(199/256,198/256,187/256)] #(216/256,215/256,210/256)]#
land_colors = [(239/256,239/256,237/256),(239/256,239/256,237/256)]
#mapbox light color
land_colors = [(246/256,246/256,244/256),(246/256,246/256,244/256)]
# erddap color:
land_colors = [(204/256,204/256,202/256),(204/256,204/256,202/256)]
n_bin = 4

basemap_cm = LinearSegmentedColormap.from_list(
        'basemap_palette', colors, N=n_bin)

land_cm = LinearSegmentedColormap.from_list(
        'land_palette', land_colors, N=n_bin)


print('Making figure in this projection:')
print(ccrs_map_proj)

# just in case something got hung
plt.cla()
plt.close()
plt.clf()


#Make Basemap Plot
fig = plt.figure()    
ax1 = plt.axes(projection = ccrs_map_proj ) # set projection to sps
ax1.set_global()
#print(xgridMod)
#print(xgridMod.shape())
#print(min(xgridMod))

dataplt = ax1.pcolormesh(xgridMod,ygridMod,datamasked, transform=ccrs_dataset, cmap=basemap_cm, vmin=-6000, vmax=100)

#A working example of log colormap
#landdataplt = ax1.pcolormesh(xgridMod,ygridMod,landmask, transform=ccrs_dataset, cmap=land_cm, norm=colors.LogNorm(vmin=0.1,vmax=landmask.max()))

landdataplt = ax1.pcolormesh(xgridMod,ygridMod,landmask, transform=ccrs_dataset, cmap=land_cm)

# set_extent is (x0, x1, y0, y1)
# using polygon extent 
ax1.set_extent([map_xmin, map_xmax, map_ymin, map_ymax], ccrs_map_proj)

#ax1.gridlines(alpha='0.3')
#ax1.outline_patch.set_linewidth(0.5)
ax1.outline_patch.set_visible(False)
ax1.background_patch.set_visible(False)
#ax1.coastlines(color='red')
#ax1.outline_patch.set_edgecolor('#dddddd')
#cbar = fig.colorbar(dataplt)
imagefn = basemapImageDir+'erddap_gray_etopo'+'_'+map_proj+'.png'
#print(imagefn)
#imagefn = basemapImageDir+'etopo_'+map_proj+'.jpg'
#jpg_imagefn = basemapImageDir+req['parameter']+'_'+map_proj+'.jpg'
#print(imagefn)
#p1 = datetime.now()
#plt.show()
plt.savefig(imagefn, dpi=1500, bbox_inches='tight', transparent=True, pad_inches=0)

# arctic landmask = 1500dpi png
# antarctic landmask = 2000dpi png
# 4326 landmask = 1200dpi png

#plt.savefig(imagefn, format='jpg', dpi=2000, pad_inches=0, quality=100, bbox_inches='tight')
#plt.savefig(jpg_imagefn, format='jpg', dpi=450, quality=60, bbox_inces='tight')
#m1 = datetime.now()
#print('time to saveifg:'+(str(m1-p1)))
plt.cla()
plt.clf()
plt.close()
print('Finished makeing jpg basemap')


#Make the land mask plot for the leaflet map

fig = plt.figure()    
ax1 = plt.axes(projection = ccrs_map_proj ) # set projection to sps
ax1.set_global()
#print(xgridMod)
#print(xgridMod.shape())
#print(min(xgridMod))

#dataplt = ax1.pcolormesh(xgridMod,ygridMod,datamasked, transform=ccrs_dataset, cmap=basemap_cm, vmin=-6000, vmax=100)
#print(landmask.min())

#A working example of log colormap
#landdataplt = ax1.pcolormesh(xgridMod,ygridMod,landmask, transform=ccrs_dataset, cmap=land_cm, norm=colors.LogNorm(vmin=0.1,vmax=landmask.max()))

landdataplt = ax1.pcolormesh(xgridMod,ygridMod,landmask, transform=ccrs_dataset, cmap=land_cm)

# set_extent is (x0, x1, y0, y1)
# using polygon extent 
ax1.set_extent([map_xmin, map_xmax, map_ymin, map_ymax], ccrs_map_proj)
#manaul extent now that not using polygon
#ax1.set_extent([-4679900, 4679900, -4679900, 4679900], ccrs_map_proj)

#ax1.gridlines(alpha='0.3')
#ax1.outline_patch.set_linewidth(0.5)
ax1.outline_patch.set_visible(False)
ax1.background_patch.set_visible(False)
#ax1.coastlines(color='red')
#ax1.outline_patch.set_edgecolor('#dddddd')
#cbar = fig.colorbar(dataplt)
imagefn = basemapImageDir+'erddap_gray_etopo_land_mask'+'_'+map_proj+'.png'
print(imagefn)
#print(imagefn)
#p1 = datetime.now()
#plt.show()
plt.savefig(imagefn, dpi=1500, bbox_inches='tight', transparent=True, pad_inches=0)
# arctic landmask = 1500dpi png
# antarctic landmask = 2000dpi png
# 4326 landmask = 1200dpi png

#m1 = datetime.now()
#print('time to saveifg:'+(str(m1-p1)))
plt.cla()
plt.clf()
plt.close()
print('Done making land mask transparent png')


# In[ ]:

# create json file with image bounds for leaflet
# bounds projected is top left, bottom left, bottom right, top right
# bounds projected is [minx,maxy], [minx, miny], [maxx,miny], [maxx, maxy]
# two points that are opposite...
req["boundsProjected"] = [ [map_xmin, map_ymax], [map_xmin, map_ymin], [map_xmax, map_ymin], [map_xmax, map_ymax]]

# Save image info for Leaflet
imageInfoFn = basemapImageDir + 'erddap_gray_etopo_'+map_proj+'.json'
#print(imageInfoFn)
f = open(imageInfoFn,"w")
json.dump(req, f)
f.close()

imageInfoFn = basemapImageDir + 'erddap_gray_etopo_land_mask_'+map_proj+'.json'
#print(imageInfoFn)
f = open(imageInfoFn,"w")
json.dump(req, f)
f.close()
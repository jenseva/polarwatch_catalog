'''
History:
Modified from make basemaps notebook on VM, which:
 Runs in geo3 py environment
 location /home/pythonscripts/notebooks/catalogv[]
 filename: 2019_03_13_makeBasemap_with_polygon_clipping.ipynb
which was modified from preview testing script:
2019_03_12_preview_with_cartopy.ipynb

Can use either a latitude for the map bounds or a polygon
Currently using a polygon. 
Will need to see if one is faseter than the other on the server
Plots are generated using cartopy
in 4326 (lat/lon), 3031 (south polar stereo), 3413 (north polar stereo)
plots are made as pngs to overlay on leaflet map
a json file defines the bounds of the png image
'''

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
import matplotlib
from matplotlib import path
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import matplotlib.colors as colors
matplotlib.use('Agg')
import cartopy
import cartopy.crs as ccrs

#for outputting data for web
import math 
import csv
from cartopy.io import shapereader
from cartopy.mpl.gridliner import LONGITUDE_FORMATTER, LATITUDE_FORMATTER
from datetime import datetime
import os
import sys
sys.executable
#sys.path.append('/home/jenn/pythonscripts') # using this because of custom module for kml converter


from keyholemarkup_converter import keyholemarkup2x  #requires pandas
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

    http = urllib3.PoolManager(cert_reqs='CERT_REQUIRED', ca_certs=certifi.where())

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
            #print(x)
            parameters.append(x[1])
    return parameters
    

# This function retrieves satellite data from an ERDDAP server
# Inputs define the data request:
# the dataset id, the parameter, lat/lon/altitude bounds (4326), and time range 
# Output: data for bounds in 4326
# Set this up to be in a loop and not just one request because one request is too large
# breaking it down into smaller geographic chunks makes this doable through the REST API

def getData(dataset_id, parameter, bounds, time, sub, mapImageDir):

    lat1 = qbounds[0]
    lat2 = qbounds[1]
    lon1 = qbounds[2]
    lon2 = qbounds[3]
    lat_order = qbounds[4]
    altf = qbounds[5]
    time1 = time # using just one timestamp for this example
    time2 = time

    print(lat1)
    print(lat2)
    print(lon1)
    print(lon2)
    print(sub)
    
    print(time1)
    print(time2)
    
    
    if altf == 1:
        #write query with altitude, haven't tested this
        alt1 = float(bounds[6])
        alt2 = float(bounds[7])
        altsub = '1'
        print(alt1)
        print(alt2)
        print(altsub)
        query = parameter+'[(%s):%s:(%s)][(%f):%s:(%f)][(%f):%s:(%f)][(%f):%s:(%f)]' % (time1,sub,time2,alt1, altsub, alt2, lat1,sub,lat2,lon1,sub,lon2) 

    else:
        #write query without altitude
        query = parameter+'[(%s):%s:(%s)][(%f):%s:(%f)][(%f):%s:(%f)]' % (time1,sub,time2,lat1,sub,lat2,lon1,sub,lon2) 
    
    base_url = 'http://polarwatch.noaa.gov/erddap/griddap/'+ dataset_id +'.nc?'
    url = base_url + query
    print(url)
    
    file = mapImageDir + '/'+ parameter+'.nc'
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

    data_netcdf_dataset = netcdf_dataset(file)
    dataset = {
        "data": data_netcdf_dataset,
        "url":url
    }
    return dataset

def getRequestBounds(md, req):

    print("Getting Bounds for ERDDAP Request...")
    # Uses ERDDAP lat_range and lon_range to determine request 
    # resets values past dataset range to within dataset limits 
    # sets the latitude order
    
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


###################
#print('main start')
print(sys.argv)

catalog_v = sys.argv[1]
map_proj = sys.argv[2]
dataset_id = sys.argv[3]
entryId = sys.argv[4]
parameter = sys.argv[5]
time = sys.argv[6]
tab = sys.argv[7]
colorBar = sys.argv[8]
cache_date = sys.argv[9]
mask_vals = sys.argv[10]

#print(mask_vals)

#print(map_proj)
m0 = datetime.now()
dir_path = os.path.dirname(os.path.realpath(__file__))
print(catalog_v)
print(dir_path)

version = catalog_v #'catalogv08'
production = 0
if (production == 1):
    version = 'catalog'

# apache needs to make these directories here for the permissions to be set correctly

mapImageDirRoot = '/var/www/html/polarwatch/map_images/'+version+'/'

if not os.path.exists(mapImageDirRoot):
    os.makedirs(mapImageDirRoot)

logdir = mapImageDirRoot+'logs'

if not os.path.exists(logdir):
    os.makedirs(logdir)  

mapImageDir = mapImageDirRoot + entryId+'/'+dataset_id

if not os.path.exists(mapImageDir):
    os.makedirs(mapImageDir) # creates with default perms 0777
    os.chmod(mapImageDir, 0o4775 )  

mm = time[5:7]
dd = time[8:10]
yyyy = time[0:4]
HH = time[11:13]
MM = time[14:16]
timep = yyyy + '_' + mm +'_'+dd+'_'+HH+'_'+MM    
 
# Get dataset metadata info from ERDDAP in preparation for data request
print('Getting dataset info:')
erddap_metadata = getDatasetInfo(dataset_id)

md = makemd(erddap_metadata)

md["dimensions"] = getDimensions(erddap_metadata)

md["parameters"] = getParameterList(erddap_metadata)

print('    dataset info retrieved')
try:
    md["proj_crs_code"]
except:
    md["proj_crs_code"] = "EPSG:4326" #assume that if a projection is not specified it is 4326
else:
    pass

pyproj.set_datapath('/usr/local/miniconda3/share/proj')  # fixes bad env path

#Keep track of the input info to pass back to the webpage
req = {
    'projection': map_proj,
    'dataset_id': dataset_id,
    'parameter': parameter,
    'colorBar': colorBar,
    'cache_date': cache_date,
    'time': time,
    'timep': timep,
    'tab':tab
}  

# Test defining 3412...
# 03/12/19 was using northpolarstereo instead of sterographic. 
# that yielded an error and could be the cause of my graphics generation problems
# Changed to stereographic and set the central latitude 3/12

epsg3411_globe = ccrs.Globe(semimajor_axis=6378273, semiminor_axis=None, inverse_flattening =298.279411123064,
                           ellipse=None)
ccrs_3031 = ccrs.Stereographic(central_latitude=-90, central_longitude=0.0,true_scale_latitude=-71,globe=ccrs.Globe(datum='WGS84',ellipse='WGS84'))
ccrs_3412 = ccrs.Stereographic(central_latitude=-90, central_longitude=0.0,true_scale_latitude=-70,globe=ccrs.Globe(datum='WGS84',ellipse='WGS84'))
ccrs_3413 = ccrs.Stereographic(central_latitude=90, central_longitude=-45,true_scale_latitude=70,globe=ccrs.Globe(datum='WGS84',ellipse='WGS84'))
ccrs_3411 = ccrs.Stereographic(central_latitude=90, central_longitude=-45,true_scale_latitude=70,globe=epsg3411_globe)
ccrs_3411 = ccrs.Stereographic(central_latitude=90, central_longitude=-45,true_scale_latitude=70,globe=ccrs.Globe(datum='WGS84',ellipse='WGS84'))
ccrs_4326 = ccrs.PlateCarree()

# Setup Cartopy projection of dataset
if md["proj_crs_code"] == "EPSG:4326":
    ccrs_dataset = ccrs_4326
elif md["proj_crs_code"] == "EPSG:3412":
    ccrs_dataset = ccrs_3412
elif md["proj_crs_code"] == "EPSG:3411":
    ccrs_dataset = ccrs_3411  

# Define projection of the data    
pyproj_dataset_proj = pyproj.Proj(init=md["proj_crs_code"])      # data coordinates/projection

if map_proj == "epsg3031":
    map_extent_fn = dir_path + '/config/masks/SouthernHemisphereMapExtent.shp' # Map bounds shapefile is in 4326
    pyproj_map_proj = pyproj.Proj(init='epsg:3031')  # South polar stereo plots)
    ccrs_map_proj = ccrs_3031
elif map_proj == "epsg3413":
    map_extent_fn = dir_path + '/config/masks/NorthernHemisphereMapExtent.shp'
    pyproj_map_proj = pyproj.Proj(init='epsg:3413')      # South polar stereo (data coordinates)
    ccrs_map_proj = ccrs_3413
else:
    ccrs_map_proj = ccrs_4326    


# PREPARE TO GET DATA    
ycoord_dimension = next((dimension for dimension in md["dimensions"] if dimension["axis"] == "Y"))
xcoord_dimension = next((dimension for dimension in md["dimensions"] if dimension["axis"] == "X"))        

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

#req["ycoord_res"] = getDimensionInfo(dimensions, ycoord_dimension["name"], 'averageSpacing')
#req["xcoord_res"] = getDimensionInfo(dimensions, xcoord_dimension["name"], 'averageSpacing')

# Note: Cannot use ERDDAP actual range plus resolution to determine extent (innaccurate)

# using erddap provided dataset size to determine how large of spacing to use for dataset request.
# need to limit time it takes to get the data from erddap (and to generate the pcolormesh)
# this (2200) is the minimum # that produces a graphic for MUR without rendering a gap at the antimeridian
ycoord_sub = float(ycoord_cells)/2200
xcoord_sub = float(xcoord_cells)/2200

# pick the larger of the two spacing options, should usually be the lon sub
if ycoord_sub <= xcoord_sub: sub = xcoord_sub
else: sub = ycoord_sub
#sub = (lat_sub + lon_sub)/2         # Use the average of the two 
req["sub"] = str((math.ceil(sub)))  # Round up to largest whole number
                                   
# To DO: Use polygon extent to limit request to the server

# Set request to the extent of the dataset range
# return the bounds in the format required by the erddap data server
ycoord_min = ycoord_dimension['actual_range'][0]
ycoord_max = ycoord_dimension['actual_range'][1]
xcoord_min = xcoord_dimension['actual_range'][0]
xcoord_max = xcoord_dimension['actual_range'][1]

req["bounds"] = [ycoord_max, ycoord_min, xcoord_min, xcoord_max]

#adjust bounds order for erddap if needed
qbounds = getRequestBounds(md, req)

# For global datasets Reduce request to the extent of the current map
if map_proj == "epsg3031" and md["proj_crs_code"]=="EPSG:4326":
    antarctic_ycoord_max = -49
    if antarctic_ycoord_max < float(ycoord_max):
        if qbounds[4]=="hightolow":
            qbounds[0] = antarctic_ycoord_max
        else:
            qbounds[1] = antarctic_ycoord_max
    else:
        pass
        #print('not reducing extent of request')    
elif map_proj == "epsg3413" and md["proj_crs_code"]=="EPSG:4326":
    arctic_ycoord_min = 49
    if arctic_ycoord_min > float(ycoord_min):
        if qbounds[4]=="hightolow":
            qbounds[1] = arctic_ycoord_min
        else:
            qbounds[0] = arctic_ycoord_min
    else:
        pass
        #print('not reducing extent of request (qbounds min lat)')

# qbounds is not based on the polygon at all...

# GET DATA
m0 = datetime.now()
dataset = getData(dataset_id, parameter, qbounds, req["time"], req["sub"], mapImageDir)
time_to_get_data = datetime.now() - m0

dataObj = dataset['data'] 

# check data file for expected altitude dimension response 
# pull out parameter data and x, y
if len(np.shape(dataObj.variables[parameter])) == 3: data = dataObj.variables[parameter][0, :, :]
elif len(np.shape(dataObj.variables[parameter])) == 4: data = dataObj.variables[parameter][0, 0,:, :]
elif len(np.shape(dataObj.variables[parameter])) == 2: data = dataObj.variables[parameter][:, :]   

xgrid = dataObj.variables[xcoord_dimension["name"]][:]
ygrid = dataObj.variables[ycoord_dimension["name"]][:]

xmin = float(xgrid[0])
xmax = float(xgrid[len(xgrid)-1])
ymin = float(ygrid[len(ygrid)-1])
ymax = float(ygrid[0])             # note: ymax should be bigger than ymin and is towards top of plot

#print(xmin, xmax)
#print(ymin, ymax)

#xrange = abs(xmin) + abs(xmax)
#yrange = abs(ymin) + abs(ymax)

# tryng this because of the way pcolor plots the data
# to do: does this really help?
cellHeight = float(getDimensionInfo(md["dimensions"], ycoord_dimension["name"], 'averageSpacing'))
cellWidth = float(getDimensionInfo(md["dimensions"], ycoord_dimension["name"], 'averageSpacing'))

xgridMod = xgrid - (cellWidth/2)
xgridMod = np.append(xgridMod, xgridMod[len(xgridMod)-1] + cellWidth)
#print(xgridMod)
ygridMod = ygrid + (cellHeight/2)
ygridMod = np.append(ygridMod, ygridMod[len(ygridMod)-1] - cellHeight)
    
#print(len(xgrid)) # xgrid is a tuple
#print(len(xgridMod.shape)) # xgridmod is a tuple
#adjust start left by half pixel width (move to the left)
#startLeft = xgrid[0] - (cellWidth/2)
#adjust start top by half pixel width ( move towards the top)
#startTop = ygrid[0] + (cellHeight/2)
#rows = len(ygrid)-1
#cols = len(xgrid)-1


# Clip the data to the polar shape file    
# Convert the bounds polygon (stored as 4326) to the projection of the data 

X, Y = np.meshgrid(xgrid, ygrid)    

if (map_proj == 'epsg3031') or (map_proj == 'epsg3413'):
    
    areaProps = []

    for pol in fiona.open(map_extent_fn):
        areaProps.append(pol['properties'])
    Multi = MultiPolygon([shape(pol['geometry']) for pol in fiona.open(map_extent_fn)])
    #Multi.wkt
    polygon = Multi[0] # we only have one polygon   
    #print(polygon)
    #print(polygon.bounds)

    # Transform the shapefile data to the projection of the data
    # If polygon and dataset projections are different, 
    # convert polygon coordinates to dataset projection coordinates
    
    #Define projection of the polygon
    pyproj_shape_ext = pyproj.Proj(init='epsg:4326')      # lon/lat coordinate system (polygon kml file)
    
    project = partial(
        pyproj.transform,
        pyproj_shape_ext,                     # lon/lat coordinate system, polygon crs
        pyproj_map_proj)          
    p_map_proj = transform(project, polygon)  # new shapely polygon in map projection
    
    #print(p_map_proj.bounds) #minx, miny, maxx, maxy
    # Convert polygon to a path for plotting/masking data

    polyListx, polyListy = p_map_proj.exterior.xy              # perimeter of polygon 
    polyList = list(zip(list(polyListx),list(polyListy)))      # formatted perimeter
    
    mapBoundsPath_map_proj = path.Path(polyList)               # path for data mask, in dataset projection
    #print('Polygon now in map projection')

    # Get the bounds of the polygon and use to define the bounds of the leaflet layer
    map_xmin = p_map_proj.bounds[0]
    map_ymin = p_map_proj.bounds[1]
    map_xmax = p_map_proj.bounds[2]
    map_ymax = p_map_proj.bounds[3]
    
    x_map_proj, y_map_proj = pyproj.transform(pyproj_dataset_proj,pyproj_map_proj, X, Y)  

    points1 = np.array((x_map_proj.flatten(), y_map_proj.flatten()))
    points = points1.T # break it down

    ## Create a mask from mapBoundsPath
    #print('creating a  masked array')
    # mapBoundsPath is in data projection
    # X is unmodified in dataset projection

    boundsMask = mapBoundsPath_map_proj.contains_points(points).reshape(x_map_proj.shape) # calc and grid a mask based on polygon path
    zeroesmask = data != 0 # returns true for a zero value, false for good values
    combined_mask = np.logical_and(boundsMask, zeroesmask)
    
    # Create a masked array based on the polygon
    datamasked = np.ma.masked_where(combined_mask != True, data)  # create masked data array

    # Another potential option, convert projected data to 4326 and mask using latitude
    x_4326_proj, y_4326_proj = pyproj.transform(pyproj_dataset_proj,pyproj.Proj(init='epsg:4326'), X, Y)  

    if (map_proj == 'epsg3031'):
        datamasked = np.ma.masked_where(y_4326_proj > -49.88, data)
    elif (map_proj == 'epsg3413'):
        datamasked = np.ma.masked_where(y_4326_proj < 50.4, data)

    #go from dataset bounds to map bounds - the extent values were beyond the xmin and ymin values of the data itself
    x_map_proj, y_map_proj = pyproj.transform(pyproj_dataset_proj,pyproj_map_proj, X, Y) 
    x_map_proj_min = np.min(x_map_proj)
    x_map_proj_max = np.max(x_map_proj)
    y_map_proj_min = np.min(y_map_proj)
    y_map_proj_max = np.max(y_map_proj)  
    #print(x_map_proj_min, x_map_proj_max)
    #print(y_map_proj_min, y_map_proj_max)
    
    # if datasets are in 4326 using the latitude line generates a cleaner plot
    if md["proj_crs_code"] == "EPSG:4326":
        if (map_proj == 'epsg3031'):
            datamasked = np.ma.masked_where(Y > -50.2, data)
        elif (map_proj == 'epsg3413'):
            datamasked = np.ma.masked_where(Y < 50.4, data)
    #landmask = np.ma.masked_less(data,0)& np.ma.masked_where(mask != True, data)# & np.ma.masked_where(Y < 50, data)#
    # run some check to make sure thre is data within the area:
    try: 
        np.min(datamasked[~datamasked.mask])
    except ValueError:
        pass
    else:
        print("Some data in map bounds polygon, number of data points:")
        print(datamasked.count())

else:
    # Global Map
    map_xmin = xmin
    map_ymin = ymin
    map_xmax = xmax
    map_ymax = ymax
    datamasked = data
    #landmask = np.ma.masked_less(data,0)
    
# See if we can get a more accurate representation of the overlay bounds

#print(map_xmin, map_xmax)

#print(map_ymin, map_ymax)

#print(datamasked[0][:])
# Uses polygon bounds...
# output projected bounds corner points for leaflet
# format to pass is top left, bottom left, bottom right, top right
top_left = [map_xmin, map_ymax]
bottom_left = [map_xmin, map_ymin]
bottom_right = [map_xmax, map_ymin]
top_right = [map_xmax, map_ymax]
req["boundsProjected"] = [top_left, bottom_left, bottom_right, top_right]


colorBarArray = colorBar.split(',')
if colorBarArray[0][:2] == "KT":
    cmap = 'cmo.'+colorBarArray[0][3:]
else:
    cmap = colorBarArray[0]
    
cb_lim_min = float(colorBarArray[3]) 
cb_lim_max = float(colorBarArray[4])

# Make a separate plot for the colorbar
legendfn = mapImageDir+ '/'+  req['parameter']+'_'+map_proj+'_'+req["timep"] + '_legend'+ '_'+req["cache_date"]+'.png'
print(legendfn)

fig_legend = plt.figure(figsize=(3, 0.5))
img = plt.imshow(datamasked, cmap=cmap, vmin=cb_lim_min, vmax=cb_lim_max)
plt.gca().set_visible(False)
cax = plt.axes([0.05, 0.5, 0.9, 0.3])
cbar = plt.colorbar(orientation="horizontal", cax=cax)
cbar.ax.tick_params(labelsize = 9)
plt.savefig(legendfn, transparent=True)
plt.cla()
plt.clf()
plt.close()

#Make the plot for the leaflet map
plt.cla()
plt.close()
plt.clf()


m0 = datetime.now()
fig = plt.figure()    
ax1 = plt.axes(projection = ccrs_map_proj ) # set projection to sps
ax1.set_global()
#print(xgridMod)
#print(xgridMod.shape())
#print(min(xgridMod), max(xgridMod))
dataplt = ax1.pcolormesh(xgrid,ygrid,datamasked, transform=ccrs_dataset, cmap=cmap, vmin=cb_lim_min, vmax=cb_lim_max)

#print(landmask.min())

#A working example of log colormap
#landdataplt = ax1.pcolormesh(xgridMod,ygridMod,landmask, transform=ccrs_dataset, cmap=land_cm, norm=colors.LogNorm(vmin=0.1,vmax=landmask.max()))

#landdataplt = ax1.pcolormesh(xgridMod,ygridMod,landmask, transform=ccrs_dataset, cmap=cmap)

# Add path 
if (map_proj == 'epsg3031') or (map_proj == 'epsg3413'):
    # clip the pcolormesh based on the map bounds path
    # this cleans up the edges!
    map_proj_transform = ccrs_map_proj._as_mpl_transform(ax1)
    dataplt.set_clip_path(mapBoundsPath_map_proj, transform=map_proj_transform)

    # patch = patches.PathPatch(mapBoundsPath_map_proj, fill=False, edgecolor='black',facecolor=None, linewidth=1)
    # ax1.add_patch(patch)

# set_extent is (x0, x1, y0, y1)
# Using polygon extent to set the plot extent
# Polygon extent is used to define the leaflet layer bounds. 
# The plot axes, image extent and leaflet layer bounds need to match.
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
time_to_plot_data = datetime.now() - m0
imagefn = mapImageDir+'/'+req['parameter']+'_'+map_proj+'_'+req["timep"]+'_'+req["cache_date"]+'.png'
print(imagefn)
#jpg_imagefnpad = basemapImageDir+req['parameter']+'_'+map_proj+'pad.jpg'
#jpg_imagefn = basemapImageDir+req['parameter']+'_'+map_proj+'.jpg'
#print(imagefn)
#p1 = datetime.now()
#plt.show()

m0 = datetime.now()
plt.savefig(imagefn, dpi=300, bbox_inches='tight', transparent=True, pad_inches = -0.006)
time_to_save_plot = datetime.now() - m0
#plt.savefig(jpg_imagefnpad, format='jpg', dpi=300, pad_inches=-0.004, quality=100, bbox_inches='tight')
#plt.savefig(jpg_imagefn, format='jpg', dpi=450, quality=60, bbox_inces='tight')
#m1 = datetime.now()
#print('time to saveifg:'+(str(m1-p1)))
plt.cla()
plt.clf()
plt.close()

# Save image info for Leaflet
imageInfoFn = mapImageDir +'/'+req["parameter"]+'_'+map_proj+'_'+req["timep"]+ '_'+req["cache_date"]+'.json'
print(imageInfoFn)
f = open(imageInfoFn,"w")
json.dump(req, f)
f.close()

print('Time to get data: '+ str(time_to_get_data))
print('Time to plot data: '+ str(time_to_plot_data))
print('Time to save plot: '+ str(time_to_save_plot))
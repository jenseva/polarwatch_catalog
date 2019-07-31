#!/usr/bin/python

# run from (or after) catalogMainGrouped
# makes catalog images
import matplotlib.path as mpath
import matplotlib.pyplot as plt
plt.switch_backend('agg')
from netCDF4 import Dataset as netcdf_dataset
import numpy as np
import math
import urllib3
import certifi
import cartopy
from cartopy import config
import cartopy.crs as ccrs
import pyproj
import fiona
from shapely.geometry import shape
from shapely.geometry import MultiPolygon
from shapely.geometry import Polygon
from shapely.geometry import mapping
from shapely.ops import transform
from functools import partial
import os
import cmocean
from matplotlib.colors import LinearSegmentedColormap, LogNorm
from matplotlib import path
import dateutil.parser
from dateutil.relativedelta import *
import csv
from datetime import datetime, timedelta
import json
import logging
import traceback
import io
from getIceMask import getClosestIceMask

# TO DO: figure out best size of graphic for the catalog...
# This has grown to do more than make the images
# It is more of a get actual data and then do a bunch of things including make images
# To Do: rename/rework makeImages 

def getDimensionInfo(dimensions, dimensionName, field):
    for dimension in dimensions:
        if dimension["name"] == dimensionName:
            return dimension[field]
            break

def getRequestBounds(thisDataset):

    print("Getting Bounds for ERDDAP Request...")
    # Uses ERDDAP lat_range and lon_range to determine request 
    # resets values past dataset range to within dataset limits 
    # sets the latitude order

    ycoord_dimension = next((dimension for dimension in thisDataset["dimensions"] if dimension["axis"] == "Y"))
    xcoord_dimension = next((dimension for dimension in thisDataset["dimensions"] if dimension["axis"] == "X"))        

    ycoord_cells = getDimensionInfo(thisDataset["dimensions"], ycoord_dimension["name"], 'nValues')
    xcoord_cells = getDimensionInfo(thisDataset["dimensions"], xcoord_dimension["name"], 'nValues')

    # use erddap info to determine if latitude is increasing or decreasing
    ycoord_range = getDimensionInfo(thisDataset["dimensions"], ycoord_dimension["name"], 'actual_range') 
    ycoord_avgSpacing = getDimensionInfo(thisDataset["dimensions"], ycoord_dimension["name"], 'averageSpacing') # used in check bounds

    # Adjust range order if needed
    if float(ycoord_avgSpacing) >= 0:
        ycoord_1 = str(float(ycoord_range[0]))
        ycoord_2 = str(float(ycoord_range[1]))
    else:
        ycoord_1 = str(float(ycoord_range[1]))
        ycoord_2 = str(float(ycoord_range[0]))
            
    ycoord_range = [ycoord_1,ycoord_2]
    xcoord_range = getDimensionInfo(thisDataset["dimensions"], xcoord_dimension["name"], 'actual_range')

    # Note: Cannot use ERDDAP actual range plus resolution to determine extent (innaccurate)
    # using erddap provided dataset size to determine how large of spacing to use for dataset request.
    # need to limit time it takes to get the data from erddap (and to generate the pcolormesh)
    # this (2200) is the minimum # that produces a graphic for MUR without rendering a gap at the antimeridian
    ycoord_sub = float(ycoord_cells)/1000#2200
    xcoord_sub = float(xcoord_cells)/1000#2200

    # pick the larger of the two spacing options, should usually be the lon sub
    if ycoord_sub <= xcoord_sub: sub = xcoord_sub
    else: sub = ycoord_sub
    #sub = (lat_sub + lon_sub)/2         # Use the average of the two 
    sub = str((math.ceil(sub)))  # Round up to largest whole number
       
    # Set request to the extent of the dataset range
    # return the bounds in the format required by the erddap data server
    ycoord_min = ycoord_dimension['actual_range'][0]
    ycoord_max = ycoord_dimension['actual_range'][1]

    xcoord_min = xcoord_dimension['actual_range'][0]
    xcoord_max = xcoord_dimension['actual_range'][1]

    bounds = [ycoord_max, ycoord_min, xcoord_min, xcoord_max]
    #print(bounds)
    
    # LATITUDE
    # Note: latRange is already in the order that erddap needs 
    #       latRange field is created in the catalog.py script
    d_ycoord_1 = float(ycoord_range[0])
    d_ycoord_2 = float(ycoord_range[1])
    
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
    d_xcoord_1 = float(xcoord_range[0])
    d_xcoord_2 = float(xcoord_range[1])
    xcoord1 = float(bounds[2])
    xcoord2 = float(bounds[3])
    if xcoord1 < d_xcoord_1: xcoord1 = d_xcoord_1   # Adjust min xcoord to data extent
    if xcoord2 > d_xcoord_2: xcoord2 = d_xcoord_2   # Adjust max xcoord to data extent

    # Setup Altitude Query 
    if getDimensionInfo(thisDataset["dimensions"], 'altitude', 'onlyValue'):
        thisAltVal = getDimensionInfo(thisDataset["dimensions"], 'altitude', 'onlyValue')
        alt1 = thisAltVal
        alt2 = thisAltVal
        qbounds = [ycoord1, ycoord2, xcoord1, xcoord2, ycoordOrder, 1, sub, alt1, alt2]
    else:
        qbounds = [ycoord1, ycoord2, xcoord1, xcoord2, ycoordOrder, 0, sub]
    #print(qbounds)
    return qbounds 

# This function retrieves satellite data from an ERDDAP server
# Inputs define the data request:
# the dataset id, the parameter, lat/lon/altitude bounds (4326), and time range 
# Output: data for bounds in 4326
# Set this up to be in a loop and not just one request because one request is too large
# breaking it down into smaller geographic chunks makes this doable through the REST API

def getData(dataset_id, parameter, qbounds, time):
    #print(qbounds)
    #print(parameter)
    #print(time)

    lat1 = qbounds[0]
    lat2 = qbounds[1]
    lon1 = qbounds[2]
    lon2 = qbounds[3]
    lat_order = qbounds[4]
    altf = qbounds[5]
    sub  = qbounds[6]
    
    time1 = time # using just one timestamp for this example
    time2 = time
    
    if altf == 1:
        #write query with altitude, haven't tested this
        alt1 = float(qbounds[7])
        alt2 = float(qbounds[8])
        altsub = 1
        query = parameter+'[(%s):%s:(%s)][(%f):%s:(%f)][(%f):%s:(%f)][(%f):%s:(%f)]' % (time1,sub,time2,alt1, altsub, alt2, lat1,sub,lat2,lon1,sub,lon2) 
    else:
        #write query without altitude
        query = parameter+'[(%s):%s:(%s)][(%f):%s:(%f)][(%f):%s:(%f)]' % (time1,sub,time2,lat1,sub,lat2,lon1,sub,lon2) 
    
    base_url = 'http://polarwatch.noaa.gov/erddap/griddap/'+ dataset_id +'.nc?'
    url = base_url + query
    print(url)
    datasetObj = {
        "url" : url
        }
    
    file = 'dataset.nc'

    http = urllib3.PoolManager(cert_reqs='CERT_REQUIRED', ca_certs=certifi.where())
    try:
        r = http.request('GET', url, preload_content=False)
    except urllib3.exceptions.HTTPError as he:          
        # Update config file to show that the dataset is not valid 
        datasetObj["inERDDAP"] = 0
        datasetObj["inERDDAPReason"] = "Could not access actual data when trying to make plots"
        entry["validDatasets"][subEntry] = 0
        logger.error('  * The server couldnt fullfill the request. Adding a not valid flag and not updating graphics today.')
    except urllib3.exceptions.URLError as e:
        logger.error('  * Failed to reach erddap server. Stopping.')
        logger.error('  * reason: ', e.reason)
        datasetObj["inERDDAP"] = 0
        datasetObj["inERDDAPReason"] = "Failed to reach ERDDAP when trying to make plots"
        entry["validDatasets"][subEntry] = 0
    except Exception:
        logger.error('generic exception: ' + traceback.format_exc())
        datasetObj["inERDDAP"] = 0
        datasetObj["inERDDAPReason"] = "General Error when trying to make plots (likely timeout)"
    else:
        # update the file with the new data
        with open(file, 'wb') as out:
            while True:
                data = r.read(1024*1024)
                if not data:
                    break
                out.write(data)

        r.release_conn()
        print ('Satellite Data File Retrieved')

        #Check netcdf response
        try:
            data_netcdf_dataset = netcdf_dataset(file)
        except Exception:
            print(' an unusual error has occured')
            datasetObj["inERDDAP"] = 0
            datasetObj["inERDDAPReason"] = "Valid NetCDF not returned in make images"
            getDataError = 'generic exception: ' + traceback.format_exc()
            datasetObj["goodFile"] = 0
            datasetObj["error"] = getDataError
            datasetObj["data_netcdf_dataset"] = 0
        else:    
            print('retrieved valid netcdf')
            datasetObj["data_netcdf_dataset"] = data_netcdf_dataset
            datasetObj["goodFile"] = 1
            datasetObj["inERDDAP"] = 1


    return datasetObj   


def makeThumbnail(webdir, logger, cartopy_crs_dict, thisDataset, plot_type):

    if plot_type == 'arctic':        
        map_extent_fn = webdir + '/config/masks/NorthernHemisphereMapExtent.shp'
        pyproj_map_proj = pyproj.Proj(init='epsg:3413')      
        ccrs_map_proj = cartopy_crs_dict["ccrs_3413"]
    elif plot_type == 'antarctic':
        map_extent_fn = webdir + '/config/masks/SouthernHemisphereMapExtent.shp' # Map bounds shapefile is in 4326
        pyproj_map_proj = pyproj.Proj(init='epsg:3031')  # South polar stereo 
        ccrs_map_proj = cartopy_crs_dict["ccrs_3031"]

    areaProps = []
    for pol in fiona.open(map_extent_fn):
        areaProps.append(pol['properties'])
    Multi = MultiPolygon([shape(pol['geometry']) for pol in fiona.open(map_extent_fn)])
    #Multi.wkt
    polygon = Multi[0] # we only have one polygon   
    
    #Define projection of the polygon
    pyproj_shape_ext = pyproj.Proj(init='epsg:4326')  # lon/lat coordinate system (polygon kml file)
    # Define projection transformation for polygon
    # 4326 to Arctic
    project = partial(
        pyproj.transform,
        pyproj_shape_ext,               # lon/lat coordinate system, polygon crs
        pyproj_map_proj)          
    p_map_proj = transform(project, polygon)  # new shapely polygon in map projection
    #print('Polygon now in map projection')

    # used to set axis extents
    map_xmin = p_map_proj.bounds[0]
    map_ymin = p_map_proj.bounds[1]
    map_xmax = p_map_proj.bounds[2]
    map_ymax = p_map_proj.bounds[3]
    
    #print(thisDataset["proj_crs_code"])
    # Setup Cartopy projection of dataset
    # Used in plot transform
    if thisDataset["proj_crs_code"] == "EPSG:4326":
        ccrs_dataset = cartopy_crs_dict["ccrs_4326"]
    elif thisDataset["proj_crs_code"] == "EPSG:3412":
        ccrs_dataset = cartopy_crs_dict["ccrs_3412"]
    elif thisDataset["proj_crs_code"] == "EPSG:3413":
        ccrs_dataset = cartopy_crs_dict["ccrs_3413"]
    elif thisDataset["proj_crs_code"] == "EPSG:3411":
        ccrs_dataset = cartopy_crs_dict["ccrs_3411"]    
    #print(ccrs_dataset)

    X = thisDataset["thumbnail"]["X"]
    Y = thisDataset["thumbnail"]["Y"]
    data = thisDataset["thumbnail"]["data"]
    xgridMod = thisDataset["thumbnail"]["xgridMod"]
    ygridMod = thisDataset["thumbnail"]["ygridMod"]
   
    # if datasets are in 4326 using the latitude line generates a cleaner plot
    if (thisDataset["proj_crs_code"] == "EPSG:4326") and (plot_type == 'arctic'):
        # Use lat line to create masked data
        datamasked = np.ma.masked_where(Y < 50.4, data)
        #landmask = np.ma.masked_less(data,0)& np.ma.masked_where(mask != True, data)# & np.ma.masked_where(Y < 50, data)#
    elif (thisDataset["proj_crs_code"] == "EPSG:4326") and (plot_type == 'antarctic'):
        # Use lat line to create masked data
        datamasked = np.ma.masked_where(Y > -50.4, data)
    else:
        # Use polygon to create masked data

        # Define projection of the data    
        pyproj_dataset_proj = pyproj.Proj(init=thisDataset["proj_crs_code"])      # data coordinates/projection
        # Convert polygon to a path for plotting/masking data
        polyListx, polyListy = p_map_proj.exterior.xy              # perimeter of polygon 
        polyList = list(zip(list(polyListx),list(polyListy)))      # formatted perimeter
        mapBoundsPath_map_proj = path.Path(polyList)               # path for data mask

        #Convert dataset coordinates to map coordinates
        x_map_proj, y_map_proj = pyproj.transform(pyproj_dataset_proj, pyproj_map_proj, X, Y)  
        points1 = np.array((x_map_proj.flatten(), y_map_proj.flatten()))
        points = points1.T # break it down

        ## Create a mask from mapBoundsPath
        mask = mapBoundsPath_map_proj.contains_points(points).reshape(x_map_proj.shape) # calc and grid a mask based on polygon path

        # Create a masked array based on the polygon
        datamasked = np.ma.masked_where(mask != True, data) # create masked data array
        #landmask = np.ma.masked_less(data,0)& np.ma.masked_where(mask != True, data)# & np.ma.masked_where(Y < 50, data)#
    
    # Will need to add landmaks, get it working with just data first though
        
    # run check to make sure thre is data within the area:
    try: 
        np.min(datamasked[~datamasked.mask])
    except ValueError:
        print('No data within map bounds polygon for this timestamp')
    else:
        print("Some data in map bounds polygon, calculating number of data points:")
        print(datamasked.count())
    
    if thisDataset["thumbnail"]["cbpalette"][:2] == "KT":
        cmap = 'cmo.'+ thisDataset["thumbnail"]["cbpalette"][3:]
    else:
        cmap = thisDataset["thumbnail"]["cbpalette"]

    cb_lim_min = thisDataset["thumbnail"]["cbmin"]
    cb_lim_max = thisDataset["thumbnail"]["cbmax"]
    
    maskNetCDF = getClosestIceMask(logger, thisDataset["thumbnail"]["time_end"])
    
    # NOW WE SHOULD HAVE AN ICE MASK
    if maskNetCDF:
        maskData = maskNetCDF.variables['mask'][0,:,:]
        maskLats = maskNetCDF.variables['latitude'][:]
        maskLons = maskNetCDF.variables['longitude'][:]
        rmasked = np.ma.masked_where(maskData != 9, maskData)
    else:
        print("ERDDAP is probably down, stopping this script run")
        return(0)
    
    # Ice Mask Settings
    maskmin = 8 #9-100
    maskmax = 10 #9+100
    
    # Create ice color map. 
    # Value 9 is white, everything else transparent
    colors = [(1,1,1),(1,1,1),(1,1,1)]
    cmapname = 'mylist'
    icecm = LinearSegmentedColormap.from_list(cmapname, colors, N=3)


    # Start of figure
    fig = plt.figure()  
    fig.patch.set_facecolor('blue')
    fig.patch.set_alpha(0.0)  
    ax1 = plt.axes(projection = ccrs_map_proj ) # set projection
    ax1.set_global()
    
    # Compute a circle in axes coordinates, which we can use as a boundary
    #   for the map. We can pan/zoom as much as we like - the boundary will be
    #   permanently circular.
    theta = np.linspace( 0, 2 * np.pi, 100 )
    center, radius = [0.5, 0.5], 0.5
    verts = np.vstack( [np.sin(theta), np.cos(theta)] ).T
    circle = mpath.Path( verts * radius + center )
    ax1.set_boundary( circle, transform = ax1.transAxes)
    
    # color background (water)
    ax1.set_facecolor('#87888a')# Erddap Gray: 7e7f80')# Light blue: e4f1f2')

    # Set the dark background for the sea ice concentration plots
    #  better to figure out how to just extend the range?

    if 'ice' in thisDataset["thumbnail"]["eparname"]:
        ax1.set_facecolor('#014479')
    if thisDataset["thumbnail"]["eparname"]=="seaice_conc_cdr" or thisDataset["thumbnail"]["eparname"]=="seaice_conc_monthly_cdr":
         ax1.set_facecolor('#014479')#ax1.set_facecolor('#040613')
    
    # Add data
    # using min and max from dataset config files
    if thisDataset["thumbnail"]["cblog"] == 'TRUE':
        # set to log scale
        dataplt = ax1.pcolormesh(xgridMod,ygridMod,datamasked, norm=LogNorm(vmin=cb_lim_min, vmax=cb_lim_max), transform=ccrs_dataset, cmap=cmap) 
    else:    
        dataplt = ax1.pcolormesh(xgridMod,ygridMod,datamasked, transform=ccrs_dataset, cmap=cmap, vmin=cb_lim_min, vmax=cb_lim_max)
    
    if thisDataset["thumbnail"]["iceDisplay"] == '1':
        print('adding ice')
        # add ice mask - quickly verified this against MASIE, looks right
        # the ice fill
        maskplt = ax1.contourf(maskLons, maskLats, rmasked, cmap=icecm,vmin=maskmin, vmax=maskmax,transform=ccrs.PlateCarree(), linestyles='solid', alpha=1 )
        # the ice edge line
        maskCont = ax1.contour(maskLons, maskLats, maskData, colors='#666666', alpha=0.2, linewidths=1, levels=[7],transform=ccrs.PlateCarree())
        # can probably setup a contour at value 8 for the ice edge line?
        # may want a line on some plots anyway not an overlay polygon...

    #landdataplt = ax1.pcolormesh(xgridMod,ygridMod,landmask, transform=ccrs_dataset, cmap=cmap)

    # set_extent format is (x0, x1, y0, y1), using polygon extent 
    ax1.set_extent([map_xmin, map_xmax, map_ymin, map_ymax], ccrs_map_proj)
   
    #ax1.gridlines(alpha='0.3')
    #ax1.outline_patch.set_linewidth(0.5)
    #ax1.outline_patch.set_visible(False)
    #ax1.background_patch.set_visible(False)
    ax1.add_feature( cartopy.feature.LAND, zorder=1, edgecolor='none', facecolor='#ccccca') #fae5c9')
    
    # Add coastline
    ax1.coastlines(color='#7e7f80', linewidth=0.5)
    
    # Add lat lon rings
    #ax1.gridlines(alpha='0.3')
    
    # Make border thinner
    ax1.outline_patch.set_linewidth(0.5)
    #ax1.outline.patch.set_alpha(0.5)
    ax1.outline_patch.set_edgecolor('#333333')
    #ax1.coastlines(color='red')
    #ax1.outline_patch.set_edgecolor('#dddddd')
    thumbnail_fn = webdir +'/images/' + thisDataset['thumbnail']['entryId']+'-'+ thisDataset["subname"] + '-'+plot_type+'.png'
    print(thumbnail_fn)
    thumbnail_fn_b = webdir +'/images/' + thisDataset['thumbnail']['entryId']+'-'+ thisDataset["subname"] + '-'+plot_type+'_b.png'
    #plt.show()
    plt.savefig(thumbnail_fn, dpi=30, bbox_inches='tight')
    plt.savefig(thumbnail_fn_b, dpi=75, bbox_inches='tight')
    plt.cla()
    plt.clf()
    plt.close()


def makeCatalogImages(webdir, logger):

    logger.info('--- Looping through catalog entries to make images, getting details and data from ERDDAP ---')
    
    catalogFn = webdir + '/config/catalog_temp.json'

    with open(catalogFn) as catalogfile:    
      cataloginfo = json.load(catalogfile)

    ddir = webdir +'/images/'     
    if not os.path.exists(ddir): os.makedirs(ddir)

    # For each Entry in the PW catalog
    # Get data for each dataset from ERDDAP
    # Plot it as thumbnail for catalog view

    for e in cataloginfo:
      #print(cataloginfo)
      entry = cataloginfo[e]
      logger.info(' * '+entry['entryId'])
      #print(entry)

      # Check to see if the whole entry is invalid
      if sum(entry['validDatasets']) > 0:
        
          print('   So far this is a valid entry. Continuing Plotting Loop.')
          subEntry = 0
          plottime = []  
          epsg3411_globe = ccrs.Globe(semimajor_axis=6378273, semiminor_axis=None, inverse_flattening =298.279411123064,
                           ellipse=None)

          cartopy_crs_dict = {
            "ccrs_3031": ccrs.Stereographic(central_latitude=-90, central_longitude=0.0,true_scale_latitude=-71,globe=ccrs.Globe(datum='WGS84',ellipse='WGS84')),
            "ccrs_3412": ccrs.Stereographic(central_latitude=-90, central_longitude=0.0,true_scale_latitude=-70,globe=ccrs.Globe(datum='WGS84',ellipse='WGS84')),
            "ccrs_3413": ccrs.Stereographic(central_latitude=90, central_longitude=-45,true_scale_latitude=70,globe=ccrs.Globe(datum='WGS84',ellipse='WGS84')),
            "ccrs_3411": ccrs.Stereographic(central_latitude=90, central_longitude=-45,true_scale_latitude=70,globe=epsg3411_globe),
            "ccrs_4326": ccrs.PlateCarree()
            }
          # Dataset Loop
          # Generate plots for all sub entry datasets (daily, weekly, monthly)

          for thisDataset in entry['datasets']:
            
            datasetId = thisDataset['id']
            logger.info('  ###### ' + datasetId +'  ########')
            thisDataset['time'] = {}
            thisDataset['thumbnail'] = {}
            thisDataset['thumbnail']['entryId'] = entry['entryId']
                        
            # Check that this dataset is in catalog
            if thisDataset['inERDDAP'] == 1:
              
                print('    - Dataset is in ERDDAP (according to alldatasets list). Continuing with making thumbnail plots')
                #print(thisDataset)
                
                # PREPARE FOR DATA REQUEST FOR PLOTS

                # See if we are creating a dataset from a variable (ie. eumetsat ice)
                makeEntryFlag = entry["makeEntryFlag"]
                erddapVarName = entry["erddapVarName"]
                
                thisDataset["thumbnail"]["iceDisplay"] = entry["iceDisplay"] # whether or not to display ice on catalog plot
                subname = thisDataset["subname"] # usually daily, weekly...
                print(subname)
                
                # Get Parameter to use for plots, using first parameter
                thisDataset["thumbnail"]["eparname"] = thisDataset['parameters'][0]['name']            
                
                # 0 because only generating thumbnails for first parameter in list
                thisDataset["thumbnail"]["cbmin"] = float(thisDataset["parameters"][0]["colorbar"]["colorbarmin"])
                thisDataset["thumbnail"]["cbmax"] = float(thisDataset["parameters"][0]["colorbar"]["colorbarmax"])

                thisDataset["thumbnail"]["cbpalette"] = thisDataset["parameters"][0]["colorbar"]["palette"]
                
                thisDataset["thumbnail"]["cblog"] = thisDataset["parameters"][0]["colorbar"]["logscale"]

                # Get information about this dataset
                ei = thisDataset["allDatasets"];

                dontplot =0    
                print(dontplot)
                if dontplot == 0:
                    # PREPARE TO GET DATA    
                    
                    #adjust bounds order for erddap if needed
                    qbounds = getRequestBounds(thisDataset)
                    
                    # Setup Time Query
                    time_latest = ei[10]
                    #time_start = time_latest
                    thisDataset["thumbnail"]["time_end"] = time_latest

                    print('#### GETTING DATA #####')
                    logger.info(datasetId)
                    dataObj = getData(datasetId, thisDataset["thumbnail"]["eparname"], qbounds, time_latest)
                    logger.info(dataObj["inERDDAP"])
                    logger.info(dataObj["goodFile"])
                    
                    # handle errors first
                    if dataObj["inERDDAP"] == 0:
                        # update all the places where we are keeping track of valid datasets...
                        print('not in erddap')
                        print(dataObj)

                    # make plots
                    if dataObj["goodFile"] == 1:
                        
                        this_data_netcdf_dataset = dataObj["data_netcdf_dataset"]
                        print(thisDataset["thumbnail"]["eparname"])
                        # check data file for expected altitude dimension response 
                        # pull out parameter data and x, y
                        if len(np.shape(this_data_netcdf_dataset.variables[thisDataset["thumbnail"]["eparname"]])) == 3: 
                            thisDataset["thumbnail"]["data"] = this_data_netcdf_dataset.variables[thisDataset["thumbnail"]["eparname"]][0, :, :]
                        elif len(np.shape(this_data_netcdf_dataset.variables[thisDataset["thumbnail"]["eparname"]])) == 4: 
                            thisDataset["thumbnail"]["data"] = this_data_netcdf_dataset.variables[thisDataset["thumbnail"]["eparname"]][0, 0,:, :]
                        elif len(np.shape(this_data_netcdf_dataset.variables[thisDataset["thumbnail"]["eparname"]])) == 2: 
                            thisDataset["thumbnail"]["data"] = this_data_netcdf_dataset.variables[thisDataset["thumbnail"]["eparname"]][:, :]   
                        
                        thisDataset["thumbnail"]["ycoord_dimension"]=next((dimension for dimension in thisDataset["dimensions"] if dimension["axis"] == "Y"))
                        thisDataset["thumbnail"]["xcoord_dimension"]=next((dimension for dimension in thisDataset["dimensions"] if dimension["axis"] == "X"))  

                        thisDataset["thumbnail"]["xgrid"] = this_data_netcdf_dataset.variables[thisDataset["thumbnail"]["xcoord_dimension"]["name"]][:]
                        thisDataset["thumbnail"]["ygrid"] = this_data_netcdf_dataset.variables[thisDataset["thumbnail"]["ycoord_dimension"]["name"]][:]

                        thisDataset["thumbnail"]["xmin"] = float(thisDataset["thumbnail"]["xgrid"][0])
                        thisDataset["thumbnail"]["xmax"] = float(thisDataset["thumbnail"]["xgrid"][len(thisDataset["thumbnail"]["xgrid"])-1])
                        thisDataset["thumbnail"]["ymin"] = float(thisDataset["thumbnail"]["ygrid"][len(thisDataset["thumbnail"]["ygrid"])-1])
                        thisDataset["thumbnail"]["ymax"] = float(thisDataset["thumbnail"]["ygrid"][0])             # note: ymax should be bigger than ymin and is towards top of plot

                        # to do: does this really help?
                        thisDataset["thumbnail"]["cellHeight"] = float(getDimensionInfo(thisDataset["dimensions"], thisDataset["thumbnail"]["ycoord_dimension"]["name"], 'averageSpacing'))
                        thisDataset["thumbnail"]["cellWidth"] = float(getDimensionInfo(thisDataset["dimensions"], thisDataset["thumbnail"]["ycoord_dimension"]["name"], 'averageSpacing'))

                        thisDataset["thumbnail"]["xgridMod"] = thisDataset["thumbnail"]["xgrid"] - (thisDataset["thumbnail"]["cellWidth"]/2)
                        thisDataset["thumbnail"]["xgridMod"] = np.append(thisDataset["thumbnail"]["xgridMod"], thisDataset["thumbnail"]["xgridMod"][len(thisDataset["thumbnail"]["xgridMod"])-1] + thisDataset["thumbnail"]["cellWidth"])
                        #print(xgridMod)
                        thisDataset["thumbnail"]["ygridMod"] = thisDataset["thumbnail"]["ygrid"] + (thisDataset["thumbnail"]["cellHeight"]/2)
                        thisDataset["thumbnail"]["ygridMod"] = np.append(thisDataset["thumbnail"]["ygridMod"], thisDataset["thumbnail"]["ygridMod"][len(thisDataset["thumbnail"]["ygridMod"])-1] - thisDataset["thumbnail"]["cellHeight"])

                        thisDataset["thumbnail"]["X"], thisDataset["thumbnail"]["Y"] = np.meshgrid(thisDataset["thumbnail"]["xgrid"], thisDataset["thumbnail"]["ygrid"])    

                        plotList = []
                        plotdate = dateutil.parser.parse(time_latest)

                        plotdatestr = plotdate.strftime("%b %d, %Y")
                        thisDataset['time']['plotTime'] = plotdatestr
                        plottime.append(plotdatestr)
                    
                        for region in entry["regions"]:
                            
                            if region.get("arctic") == 1:
                                # Make Arctic Plot
                                print('Making Arctic Thumbnail Plot')
                                makeThumbnail(webdir, logger, cartopy_crs_dict, thisDataset, 'arctic')
                                plotList.append('arctic')
                            else:
                                print("Dataset does not have arctic set as a region, not making Arctic thumbnail plot")    
                            if region.get("antarctic") == 1:
                                # Make Antarctic Plot
                                print('Making Antarctic Thumbnail Plot')
                                makeThumbnail(webdir, logger, cartopy_crs_dict, thisDataset, 'antarctic')
                                plotList.append('antarctic')
                            else:
                                print("Dataset does not have Antarctic set as a region, not making Antarctic thumbnail plot")    
                        thisDataset["thumbnail"]=[]
                        cataloginfo[e]["plotList"] = plotList; 

                else:
                    logger.info('Not plotting - Data not retrieved from ERDDAP')

            subEntry = subEntry + 1

          print('Finished making thumbnails.')
          cataloginfo[e]["plotTime"] = plottime
      #print(cataloginfo[e])
   
    print(cataloginfo)
    # Add any new fields to temporary catalog file
    with open(catalogFn,"w") as catalogfile:
        json.dump(cataloginfo, catalogfile)

    logger.info('Make Images End')
    logger.info('=================')
    return(1)
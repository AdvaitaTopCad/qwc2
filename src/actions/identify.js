/**
 * Copyright 2017, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import axios from 'axios';
import uuid from 'uuid';
import jsts from 'jsts';
import assign from 'object-assign';
import ConfigUtils from '../utils/Config';

export const IDENTIFY_EMPTY = 'IDENTIFY_EMPTY';
export const IDENTIFY_RESPONSE = 'IDENTIFY_RESPONSE';
export const IDENTIFY_REQUEST = 'IDENTIFY_REQUEST';
export const SET_IDENTIFY_TOOL = 'SET_IDENTIFY_TOOL';
export const PURGE_IDENTIFY_RESULTS = 'PURGE_IDENTIFY_RESULTS';
export const SET_IDENTIFY_FEATURE_RESULT = 'SET_IDENTIFY_FEATURE_RESULT';
export const NEW_MAPINFO_REQUEST = 'NEW_MAPINFO_REQUEST';

export function identifyEmpty() {
    return {
        type: IDENTIFY_EMPTY,
        reqId: uuid.v1(),
    };
}

const identifyResponse = (reqId, request, data, error = null) => {
    return {
        type: IDENTIFY_RESPONSE,
        reqId,
        request,
        data,
        responseType: request.params.info_format || request.params.outputformat,
        error,
    };
};

const identifyRequest = (reqId, request) => {
    return {
        type: IDENTIFY_REQUEST,
        reqId,
        request,
    };
};

const newMapInfoRequest = (reqId, reqConfig) => {
    return {
        type: NEW_MAPINFO_REQUEST,
        reqId,
        request: reqConfig,
    };
};

export function sendIdentifyRequest(request) {
    const reqId = uuid.v1();
    return (dispatch) => {
        dispatch(identifyRequest(reqId, request));
        axios
            .get(request.url, { params: request.params })
            .then((response) => {
                dispatch(identifyResponse(reqId, request, response.data));
            })
            .catch((e) => {
                dispatch(identifyResponse(reqId, request, null, e));
            });
    };
}

export function sendIdentifyRegionRequest(
    serviceUrl,
    requestParams,
    wgs84FilterPoly = null
) {
    const defaultParams = {
        service: 'WFS',
        version: '1.0.0',
        request: 'GetFeature',
    };

    const params = assign({}, defaultParams, requestParams);
    const reqId = uuid.v1();
    return (dispatch) => {
        dispatch(newMapInfoRequest(reqId, params));
        axios
            .get(serviceUrl, { params })
            .then((response) => {
                if (wgs84FilterPoly) {
                    const geomFactory = new jsts.geom.GeometryFactory();
                    const jsonReader = new jsts.io.GeoJSONReader(geomFactory);
                    const filterGeom = jsonReader.read({
                        type: 'Polygon',
                        coordinates: [wgs84FilterPoly],
                    });
                    response.data.features = response.data.features.filter(
                        (feature) => {
                            const geom = jsonReader.read(feature.geometry);
                            return filterGeom.contains(geom);
                        }
                    );
                }
                dispatch(
                    identifyResponse(
                        reqId,
                        { url: serviceUrl, params },
                        response.data
                    )
                );
            })
            .catch((e) => {
                dispatch(identifyResponse(reqId, null, null, e));
            });
    };
}

export function setIdentifyFeatureResult(pos, layername, feature) {
    return {
        type: SET_IDENTIFY_FEATURE_RESULT,
        reqId: uuid.v1(),
        pos,
        layername,
        feature,
    };
}

export function setIdentifyEnabled(enabled) {
    return (dispatch, getState) => {
        let identifyTool = ConfigUtils.getConfigProp(
            'identifyTool',
            getState().theme.current
        );
        identifyTool = identifyTool !== undefined ? identifyTool : 'Identify';
        dispatch({
            type: SET_IDENTIFY_TOOL,
            tool: enabled ? identifyTool : null,
        });
    };
}

export function purgeIdentifyResults() {
    return {
        type: PURGE_IDENTIFY_RESULTS,
    };
}

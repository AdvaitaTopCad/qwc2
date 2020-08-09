/**
 * Copyright 2016, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import ConfigUtils from '../utils/Config';

export const SET_LAYER_LOADING = 'SET_LAYER_LOADING';
export const ADD_LAYER = 'ADD_LAYER';
export const ADD_LAYER_SEPARATOR = 'ADD_LAYER_SEPARATOR';
export const REMOVE_LAYER = 'REMOVE_LAYER';
export const REORDER_LAYER = 'REORDER_LAYER';
export const REMOVE_LAYER_FEATURE = 'REMOVE_LAYER_FEATURE';
export const ADD_LAYER_FEATURES = 'ADD_LAYER_FEATURES';
export const ADD_THEME_SUBLAYER = 'ADD_THEME_SUBLAYER';
export const REMOVE_LAYER_FEATURES = 'REMOVE_LAYER_FEATURES';
export const CHANGE_LAYER_PROPERTY = 'CHANGE_LAYER_PROPERTY';
export const REFRESH_LAYER = 'REFRESH_LAYER';
export const REMOVE_ALL_LAYERS = 'REMOVE_ALL_LAYERS';
export const REPLACE_PLACEHOLDER_LAYER = 'REPLACE_PLACEHOLDER_LAYER';
export const SET_SWIPE = 'SET_SWIPE';
export const SET_LAYERS = 'SET_LAYERS';

export const LayerRole = {
    BACKGROUND: 1,
    THEME: 2,
    USERLAYER: 3,
    SELECTION: 4,
    MARKER: 5,
};

export function addLayer(layer, pos = null, beforename = null) {
    return {
        type: ADD_LAYER,
        layer,
        pos,
        beforename,
    };
}

export function addLayerSeparator(title, afterLayerId, afterSublayerPath) {
    return {
        type: ADD_LAYER_SEPARATOR,
        title,
        afterLayerId,
        afterSublayerPath,
    };
}

export function removeLayer(layerId, sublayerpath = []) {
    return {
        type: REMOVE_LAYER,
        layerId,
        sublayerpath,
    };
}

export function reorderLayer(layer, sublayerpath, direction) {
    return (dispatch, getState) => {
        dispatch({
            type: REORDER_LAYER,
            layer,
            sublayerpath,
            direction,
            preventSplittingGroups: ConfigUtils.getConfigProp(
                'preventSplittingGroupsWhenReordering',
                getState().theme.current
            ),
        });
    };
}

export function addLayerFeatures(layer, features, clear = false) {
    return {
        type: ADD_LAYER_FEATURES,
        layer,
        features,
        clear,
    };
}

export function removeLayerFeatures(
    layerId,
    featureIds,
    keepEmptyLayer = false
) {
    return {
        type: REMOVE_LAYER_FEATURES,
        layerId,
        featureIds,
        keepEmptyLayer,
    };
}

export function addThemeSublayer(layer) {
    return {
        type: ADD_THEME_SUBLAYER,
        layer,
    };
}

// recurseDirection: null (don't recurse), 'parents', 'children', 'both'
export function changeLayerProperty(
    layerUuid,
    property,
    newvalue,
    sublayerpath = [],
    recurseDirection = null
) {
    return {
        type: CHANGE_LAYER_PROPERTY,
        layerUuid,
        property,
        newvalue,
        sublayerpath,
        recurseDirection,
    };
}

export function setLayerLoading(layerUuid, loading) {
    return {
        type: SET_LAYER_LOADING,
        layerUuid,
        loading,
    };
}

export function addMarker(
    id,
    point,
    label = '',
    crs = 'EPSG:4326',
    zIndex = null
) {
    const layer = {
        id: 'markers',
        role: LayerRole.MARKER,
        zIndex,
    };
    const feature = {
        id,
        geometry: {
            type: 'Point',
            coordinates: point,
        },
        properties: { label },
        crs,
        styleName: 'marker',
    };
    return addLayerFeatures(layer, [feature]);
}

export function removeMarker(id) {
    return removeLayerFeatures('markers', [id]);
}

export function refreshLayer(filter) {
    return {
        type: REFRESH_LAYER,
        filter,
    };
}

export function removeAllLayers() {
    return {
        type: REMOVE_ALL_LAYERS,
    };
}

export function replacePlaceholderLayer(id, layer) {
    return {
        type: REPLACE_PLACEHOLDER_LAYER,
        id,
        layer,
    };
}

export function setSwipe(swipe) {
    return {
        type: SET_SWIPE,
        swipe,
    };
}

export function setLayers(layers) {
    return {
        type: SET_LAYERS,
        layers,
    };
}

/**
 * Copyright 2015, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assign from 'object-assign';
import { isEmpty } from 'lodash';
import uuid from 'uuid';
import { UrlParams } from '../utils/PermaLink';
import {
    addUUIDs,
    cloneLayer,
    buildWMSLayerParams,
    buildWMSLayerUrlParam,
    insertLayer,
    insertSeparator,
    removeLayer,
    mergeSubLayers,
    reorderLayer,
} from '../utils/Layer';

const {
    LayerRole,
    SET_LAYER_LOADING,
    ADD_LAYER,
    ADD_LAYER_SEPARATOR,
    REMOVE_LAYER,
    REORDER_LAYER,
    CHANGE_LAYER_PROPERTY,
    ADD_LAYER_FEATURES,
    REMOVE_LAYER_FEATURES,
    ADD_THEME_SUBLAYER,
    REFRESH_LAYER,
    REMOVE_ALL_LAYERS,
    REPLACE_PLACEHOLDER_LAYER,
    SET_SWIPE,
    SET_LAYERS,
} = require('../actions/layers');

export default function propagateLayerProperty(
    newlayer,
    property,
    value,
    path = null
) {
    assign(newlayer, { [property]: value });
    // Don't propagate visibility for mutually exclusive groups
    if (
        newlayer.sublayers &&
        !(property === 'visibility' && newlayer.mutuallyExclusive)
    ) {
        newlayer.sublayers = newlayer.sublayers.map((sublayer, idx) => {
            if (path === null || (!isEmpty(path) && path[0] === idx)) {
                const newsublayer = assign({}, sublayer);
                propagateLayerProperty(
                    newsublayer,
                    property,
                    value,
                    path ? path.slice(1) : null
                );
                return newsublayer;
            }
            return sublayer;
        });
    }
}

export function layers(state = { flat: [], swipe: undefined }, action) {
    switch (action.type) {
        case SET_LAYER_LOADING: {
            const newLayers = (state.flat || []).map((layer) => {
                return layer.uuid === action.layerUuid
                    ? assign({}, layer, { loading: action.loading })
                    : layer;
            });
            return assign({}, state, { flat: newLayers });
        }
        case CHANGE_LAYER_PROPERTY: {
            const targetLayer = state.flat.find((layer) => {
                return layer.uuid === action.layerUuid;
            });
            if (!targetLayer) {
                return state;
            }
            const backgroundVisibilityChanged =
                targetLayer.role === LayerRole.BACKGROUND &&
                action.property === 'visibility';

            let parent = targetLayer;
            const parentPath = action.sublayerpath.slice(
                0,
                action.sublayerpath.length - 1
            );
            parentPath.forEach((idx) => {
                parent = parent.sublayers[idx];
            });
            const mutexVisibilityChanged =
                parent.mutuallyExclusive && action.property === 'visibility';
            if (mutexVisibilityChanged && action.newvalue === false) {
                // Don't allow explicitly hiding item in mutex group - need to toggle other item
                return state;
            }

            const newLayers = (state.flat || []).map((layer) => {
                if (layer.uuid === action.layerUuid) {
                    const { newlayer, newsublayer } = cloneLayer(
                        layer,
                        action.sublayerpath || []
                    );
                    newsublayer[action.property] = action.newvalue;
                    const { recurseDirection } = action;

                    // Handle mutually exclusive groups
                    if (mutexVisibilityChanged) {
                        let newParent = newlayer;
                        parentPath.forEach((index) => {
                            newParent = newParent.sublayers[index];
                        });
                        const targetIdx =
                            action.sublayerpath[action.sublayerpath.length - 1];
                        newParent.sublayers = newParent.sublayers.map(
                            (localLayer, idx) =>
                                assign({}, localLayer, {
                                    visibility: idx === targetIdx,
                                })
                        );
                    }

                    if (['children', 'both'].includes(recurseDirection)) {
                        // recurse to children (except visibility to children in mutex case)
                        propagateLayerProperty(
                            newsublayer,
                            action.property,
                            action.newvalue
                        );
                    }
                    if (['parents', 'both'].includes(recurseDirection)) {
                        // recurse to parents
                        propagateLayerProperty(
                            newlayer,
                            action.property,
                            action.newvalue,
                            action.sublayerpath
                        );
                    }

                    if (newlayer.type === 'wms') {
                        assign(newlayer, buildWMSLayerParams(newlayer));
                    }
                    if (newlayer.role === LayerRole.BACKGROUND) {
                        UrlParams.updateParams({
                            bl: newlayer.visibility ? newlayer.name : '',
                        });
                    }
                    return newlayer;
                }
                if (
                    layer.role === LayerRole.BACKGROUND &&
                    backgroundVisibilityChanged
                ) {
                    return assign({}, layer, { visibility: false });
                }
                return layer;
            });
            UrlParams.updateParams({
                l: buildWMSLayerUrlParam(newLayers),
            });
            return assign({}, state, { flat: newLayers });
        }
        case ADD_LAYER: {
            let newLayers = (state.flat || []).concat();
            const layerId = action.layer.id || uuid.v4();
            const newLayer = assign({}, action.layer, {
                id: layerId,
                name: action.layer.name || layerId,
                role: action.layer.role || LayerRole.USERLAYER,
                queryable: action.layer.queryable || false,
                visibility:
                    action.layer.visibility !== undefined
                        ? action.layer.visibility
                        : true,
                opacity: action.layer.opacity || 255,
                layertreehidden:
                    action.layer.layertreehidden ||
                    action.layer.role > LayerRole.USERLAYER,
            });
            addUUIDs(newLayer);
            if (newLayer.type === 'wms') {
                assign(newLayer, buildWMSLayerParams(newLayer));
            }
            if (action.beforename) {
                newLayers = insertLayer(
                    newLayers,
                    newLayer,
                    'name',
                    action.beforename
                );
            } else {
                let inspos = 0;
                if (action.pos === null) {
                    for (
                        ;
                        inspos < newLayers.length &&
                        newLayer.role < newLayers[inspos].role;
                        inspos += 1
                    );
                } else {
                    inspos = action.pos;
                }
                newLayers.splice(inspos, 0, newLayer);
            }
            UrlParams.updateParams({
                l: buildWMSLayerUrlParam(newLayers),
            });
            if (newLayer.role === LayerRole.BACKGROUND && newLayer.visibility) {
                UrlParams.updateParams({ bl: newLayer.name });
            }
            return assign({}, state, { flat: newLayers });
        }
        case ADD_LAYER_SEPARATOR: {
            const newLayers = insertSeparator(
                state.flat,
                action.title,
                action.afterLayerId,
                action.afterSublayerPath,
                state.swipe
            );
            UrlParams.updateParams({
                l: buildWMSLayerUrlParam(newLayers),
            });
            return assign({}, state, { flat: newLayers });
        }
        case REMOVE_LAYER: {
            const layer = state.flat.find(
                (localLayer) => localLayer.id === action.layerId
            );
            if (!layer) {
                return state;
            }
            let newLayers = state.flat;
            if (
                layer.role === LayerRole.BACKGROUND ||
                isEmpty(action.sublayerpath)
            ) {
                newLayers = state.flat.filter(
                    (localLayer) => localLayer.id !== action.layerId
                );
            } else {
                newLayers = removeLayer(
                    state.flat,
                    layer,
                    action.sublayerpath,
                    state.swipe
                );
            }
            UrlParams.updateParams({
                l: buildWMSLayerUrlParam(newLayers),
            });
            return assign({}, state, { flat: newLayers });
        }
        case ADD_LAYER_FEATURES: {
            const newLayers = (state.flat || []).concat();
            const idx = newLayers.findIndex(
                (layer) => layer.id === action.layer.id
            );
            const layerId = action.layer.id || uuid.v4();
            if (idx === -1 || action.clear) {
                const newLayer = assign({}, action.layer, {
                    type: 'vector',
                    name: action.layer.name || layerId,
                    uuid: uuid.v4(),
                    features: action.features,
                    role: action.layer.role || LayerRole.USERLAYER,
                    queryable: action.layer.queryable || false,
                    visibility: action.layer.visibility || true,
                    opacity: action.layer.opacity || 255,
                    layertreehidden:
                        action.layer.layertreehidden ||
                        action.layer.role > LayerRole.USERLAYER,
                });
                if (idx === -1) {
                    let inspos = 0;
                    for (
                        ;
                        inspos < newLayers.length &&
                        newLayer.role < newLayers[inspos].role;
                        inspos += 1
                    );
                    newLayers.splice(inspos, 0, newLayer);
                } else if (action.clear) {
                    newLayers[idx] = newLayer;
                }
            } else {
                const addFeatures = action.features.concat();
                let newFeatures = (newLayers[idx].features || []).map((f) => {
                    const fidx = addFeatures.findIndex((g) => g.id === f.id);
                    if (fidx === -1) {
                        return f;
                    }
                    return addFeatures.splice(fidx, 1)[0];
                });
                newFeatures = newFeatures.concat(addFeatures);
                newLayers[idx] = assign({}, newLayers[idx], {
                    features: newFeatures,
                });
            }
            return assign({}, state, { flat: newLayers });
        }
        case REMOVE_LAYER_FEATURES: {
            const newLayers = (state.flat || []).reduce((result, layer) => {
                if (layer.id === action.layerId) {
                    const newFeatures = layer.features.filter(
                        (f) => action.featureIds.includes(f.id) === false
                    );
                    if (!isEmpty(newFeatures) || action.keepEmptyLayer) {
                        result.push(
                            assign({}, layer, { features: newFeatures })
                        );
                    }
                } else {
                    result.push(layer);
                }
                return result;
            }, []);
            return assign({}, state, { flat: newLayers });
        }
        case ADD_THEME_SUBLAYER: {
            const themeLayerIdx = state.flat.findIndex(
                (layer) => layer.role === LayerRole.THEME
            );
            if (themeLayerIdx >= 0) {
                const newLayers = state.flat.slice(0);
                newLayers[themeLayerIdx] = mergeSubLayers(
                    state.flat[themeLayerIdx],
                    action.layer,
                    state.swipe || state.swipe === 0
                );
                newLayers[themeLayerIdx].visibility = true;
                assign(
                    newLayers[themeLayerIdx],
                    buildWMSLayerParams(newLayers[themeLayerIdx])
                );
                UrlParams.updateParams({
                    l: buildWMSLayerUrlParam(newLayers),
                });
                return assign({}, state, { flat: newLayers });
            }
            return state;
        }
        case REFRESH_LAYER: {
            const newLayers = (state.flat || []).map((layer) => {
                if (action.filter(layer)) {
                    return assign({}, layer, { rev: (layer.rev || 0) + 1 });
                }
                return layer;
            });
            return assign({}, state, { flat: newLayers });
        }
        case REMOVE_ALL_LAYERS: {
            return assign({}, state, { flat: [], swipe: undefined });
        }
        case REORDER_LAYER: {
            const newLayers = reorderLayer(
                state.flat,
                action.layer,
                action.sublayerpath,
                action.direction,
                state.swipe,
                action.preventSplittingGroups
            );
            UrlParams.updateParams({
                l: buildWMSLayerUrlParam(newLayers),
            });
            return assign({}, state, { flat: newLayers });
        }
        case REPLACE_PLACEHOLDER_LAYER: {
            let newLayers = state.flat || [];
            if (action.layer) {
                newLayers = newLayers.map((layer) => {
                    if (
                        layer.type === 'placeholder' &&
                        layer.id === action.id
                    ) {
                        const newLayer = { ...action.layer };
                        addUUIDs(newLayer);
                        if (newLayer.type === 'wms') {
                            assign(newLayer, buildWMSLayerParams(newLayer));
                        }
                        return newLayer;
                    }
                    return layer;
                });
            } else {
                newLayers = newLayers.filter(
                    (layer) =>
                        !(
                            layer.type === 'placeholder' &&
                            layer.id === action.id
                        )
                );
            }
            UrlParams.updateParams({
                l: buildWMSLayerUrlParam(newLayers),
            });
            return assign({}, state, { flat: newLayers });
        }
        case SET_SWIPE: {
            let newLayers = state.flat;
            if ((state.swipe === undefined) !== (action.swipe === undefined)) {
                newLayers = reorderLayer(
                    state.flat,
                    null,
                    null,
                    null,
                    action.swipe || action.swipe === 0
                );
            }
            return assign({}, state, { flat: newLayers, swipe: action.swipe });
        }
        case SET_LAYERS: {
            return assign({}, { flat: action.layers });
        }
        default:
            return state;
    }
}

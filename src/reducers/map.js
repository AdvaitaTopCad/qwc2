/**
 * Copyright 2015, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assign from 'object-assign';
import {
    computeForZoom,
    getResolutionsForScales,
    getZoomForExtent,
    getExtentForCenterAndZoom,
} from '../utils/Map';
import { UrlParams } from '../utils/PermaLink';
import { getConfigProp } from '../utils/Config';
import { reprojectBbox, getUnits, reproject } from '../utils/Coordinates';

const {
    CHANGE_MAP_VIEW,
    CONFIGURE_MAP,
    CHANGE_ZOOM_LVL,
    ZOOM_TO_EXTENT,
    ZOOM_TO_POINT,
    PAN_TO,
    CHANGE_ROTATION,
    CLICK_ON_MAP,
    CLICK_FEATURE_ON_MAP,
    TOGGLE_MAPTIPS,
} = require('../actions/map');

const defaultState = {
    bbox: { bounds: [0, 0, 0, 0], rotation: 0 },
    center: [0, 0],
    projection: 'EPSG:4326',
    zoom: 0,
    scales: [0],
    resolutions: [0],
};

export default function map(state = defaultState, action) {
    // Always reset mapStateSource, CHANGE_MAP_VIEW will set it if necessary
    if (state.mapStateSource) {
        state = assign({}, state, { mapStateSource: null });
    }

    switch (action.type) {
        case CHANGE_MAP_VIEW: {
            const { type, ...params } = action;
            const newState = assign({}, state, params);

            const positionFormat = getConfigProp('urlPositionFormat');
            const positionCrs =
                getConfigProp('urlPositionCrs') || newState.projection;
            const bounds = reprojectBbox(
                newState.bbox.bounds,
                newState.projection,
                positionCrs
            );
            const roundfactor =
                getUnits(positionCrs) === 'degrees' ? 100000 : 1;
            if (positionFormat === 'centerAndZoom') {
                const x =
                    Math.round(0.5 * (bounds[0] + bounds[2]) * roundfactor) /
                    roundfactor;
                const y =
                    Math.round(0.5 * (bounds[1] + bounds[3]) * roundfactor) /
                    roundfactor;
                const scale = Math.round(
                    computeForZoom(newState.scales, newState.zoom)
                );
                UrlParams.updateParams({ c: `${x},${y}`, s: scale });
            } else {
                const xmin = Math.round(bounds[0] * roundfactor) / roundfactor;
                const ymin = Math.round(bounds[1] * roundfactor) / roundfactor;
                const xmax = Math.round(bounds[2] * roundfactor) / roundfactor;
                const ymax = Math.round(bounds[3] * roundfactor) / roundfactor;
                UrlParams.updateParams({
                    e: `${xmin},${ymin},${xmax},${ymax}`,
                });
            }
            if (positionCrs !== newState.projection) {
                UrlParams.updateParams({ crs: positionCrs });
            }

            return newState;
        }
        case CONFIGURE_MAP: {
            const resolutions = getResolutionsForScales(
                action.scales,
                action.crs,
                state.dpi || null
            );
            let bounds;
            let center;
            let zoom;
            if (action.view.center) {
                center = reproject(
                    action.view.center,
                    action.view.crs || action.crs,
                    action.crs
                );
                zoom = action.view.zoom;
                bounds = getExtentForCenterAndZoom(
                    center,
                    zoom,
                    resolutions,
                    state.size
                );
            } else {
                bounds = reprojectBbox(
                    action.view.bounds,
                    action.view.crs || state.projection,
                    action.crs
                );
                center = [
                    0.5 * (bounds[0] + bounds[2]),
                    0.5 * (bounds[1] + bounds[3]),
                ];
                zoom = getZoomForExtent(
                    bounds,
                    resolutions,
                    state.size,
                    0,
                    action.scales.length - 1
                );
            }
            return assign({}, state, {
                bbox: assign({}, state.bbox, { bounds }),
                center,
                zoom,
                projection: action.crs,
                scales: action.scales,
                resolutions,
            });
        }
        case CHANGE_ZOOM_LVL: {
            return assign({}, state, { zoom: action.zoom });
        }
        case ZOOM_TO_EXTENT: {
            const bounds = reprojectBbox(
                action.extent,
                action.crs || state.projection,
                state.projection
            );
            return assign({}, state, {
                center: [
                    0.5 * (bounds[0] + bounds[2]),
                    0.5 * (bounds[1] + bounds[3]),
                ],
                zoom: getZoomForExtent(
                    bounds,
                    state.resolutions,
                    state.size,
                    0,
                    state.scales.length - 1
                ),
                bbox: assign({}, state.bbox, { bounds }),
            });
        }
        case ZOOM_TO_POINT: {
            return assign({}, state, {
                center: reproject(
                    action.pos,
                    action.crs || state.projection,
                    state.projection
                ),
                zoom: action.zoom,
            });
        }
        case PAN_TO: {
            return assign({}, state, {
                center: reproject(
                    action.pos,
                    action.crs || state.projection,
                    state.projection
                ),
            });
        }
        case CHANGE_ROTATION: {
            return assign({}, state, {
                bbox: assign({}, state.bbox, { rotation: action.rotation }),
            });
        }
        case CLICK_ON_MAP: {
            return assign({}, state, { clickPoint: action.point });
        }
        case CLICK_FEATURE_ON_MAP: {
            return assign({}, state, { clickFeature: action.feature });
        }
        case TOGGLE_MAPTIPS: {
            return assign({}, state, { maptips: action.active });
        }
        default:
            return state;
    }
}

/**
 * Copyright 2016, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { setIdentifyEnabled } from './identify';
import { getConfigProp } from '../utils/Config';
import { getUnits } from '../utils/Coordinates';
import { computeForZoom } from '../utils/Map';
import { UrlParams } from '../utils/PermaLink';

export const SET_CURRENT_TASK = 'SET_CURRENT_TASK';
export const SET_CURRENT_TASK_BLOCKED = 'SET_CURRENT_TASK_BLOCKED';

export function setCurrentTask(task, mode = null, mapClickAction = null) {
    let newMapClickAction = mapClickAction;
    return (dispatch, getState) => {
        // Don't do anything if current task is blocked
        if (getState().task && getState().task.blocked === true) {
            return;
        }
        // Attempt to read mapClickAction from plugin configuration block if not set
        if (!newMapClickAction) {
            try {
                const device =
                    getState().browser && getState().browser.mobile
                        ? 'mobile'
                        : 'desktop';
                newMapClickAction = getState().localConfig.plugins[device].find(
                    (config) => config.name === task
                ).mapClickAction;
            } catch (e) {
                // Ignore
            }
        }
        dispatch(
            setIdentifyEnabled(
                task === null || newMapClickAction === 'identify'
            )
        );
        dispatch({
            type: SET_CURRENT_TASK,
            id: task,
            mode,
            unsetOnMapClick: newMapClickAction === 'unset',
        });
    };
}

export function setCurrentTaskBlocked(blocked) {
    return {
        type: SET_CURRENT_TASK_BLOCKED,
        blocked,
    };
}

export function openExternalUrl(url) {
    let newUrl = url;
    return (dispatch, getState) => {
        // Replace all entries in URL
        Object.entries(UrlParams.getParams()).forEach(([key, value]) => {
            newUrl = newUrl.replace(`$${key}$`, value);
        });

        // Additional entries
        const state = getState();
        const { bounds } = state.map.bbox;
        const proj = state.map.projection;
        const roundfactor = getUnits(proj) === 'degrees' ? 100000 : 1;
        const xmin = Math.round(bounds[0] * roundfactor) / roundfactor;
        const ymin = Math.round(bounds[1] * roundfactor) / roundfactor;
        const xmax = Math.round(bounds[2] * roundfactor) / roundfactor;
        const ymax = Math.round(bounds[3] * roundfactor) / roundfactor;
        const x =
            Math.round(0.5 * (bounds[0] + bounds[2]) * roundfactor) /
            roundfactor;
        const y =
            Math.round(0.5 * (bounds[1] + bounds[3]) * roundfactor) /
            roundfactor;
        const scale = Math.round(
            computeForZoom(state.map.scales, state.map.zoom)
        );
        // In case mode is center + scale, extent is missing in UrlParams
        newUrl = newUrl.replace('$e$', [xmin, ymin, xmax, ymax].join(','));
        // In case mode is extent, center + scale are missing in UrlParams
        newUrl = newUrl.replace('$c$', `${x},${y}`);
        newUrl = newUrl.replace('$s$', scale);
        // Add separate x, y
        newUrl = newUrl.replace('$x$', x);
        newUrl = newUrl.replace('$y$', y);

        newUrl = newUrl.replace('$crs$', proj);

        newUrl = newUrl.replace('$user$', getConfigProp('username') || '');

        window.open(newUrl);
    };
}

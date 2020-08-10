/**
 * Copyright 2016, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { combineReducers } from 'redux';
import merge from 'deepmerge';

import { createDebugStore } from '../utils/Debug';
import { getPluginReducers } from '../utils/Plugins';
import localConfig from '../reducers/localConfig';
import locale from '../reducers/locale';
import browser from '../reducers/browser';
import identify from '../reducers/identify';
import map from '../reducers/map';
import layers from '../reducers/layers';
import windows from '../reducers/windows';

import { CHANGE_BROWSER_PROPERTIES } from '../actions/browser';

export default (
    initialState = { defaultState: {}, mobile: {} },
    plugins,
    storeOpts,
    actionLogger
) => {
    const allReducers = combineReducers({
        localConfig,
        locale,
        browser,
        identify,
        map,
        layers,
        windows,
        ...getPluginReducers(plugins),
    });

    const defaultState = merge(
        {
            ...allReducers({}, { type: null }),
        },
        initialState.defaultState
    );
    const mobileOverride = initialState.mobile;

    const rootReducer = (state, action) => {
        let newState = {
            ...allReducers(state, action),
        };
        if (actionLogger) {
            actionLogger(action, newState);
        }
        if (
            action &&
            action.type === CHANGE_BROWSER_PROPERTIES &&
            newState.browser.mobile
        ) {
            newState = merge(newState, mobileOverride);
        }

        return newState;
    };
    return createDebugStore(rootReducer, defaultState);
};

/**
 * Copyright 2016, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assign from 'object-assign';
import {
    LOCAL_CONFIG_LOADED,
    SET_STARTUP_PARAMETERS,
} from '../actions/localConfig';

import { getDefaults } from '../utils/Config';

export default function localConfig(state = getDefaults(), action) {
    switch (action.type) {
        case LOCAL_CONFIG_LOADED:
            return assign({}, state, action.config);
        case SET_STARTUP_PARAMETERS:
            return assign({}, state, { startupParams: action.params });
        default:
            return state;
    }
}

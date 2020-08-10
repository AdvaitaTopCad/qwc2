/**
 * Copyright 2015, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assign from 'object-assign';
import { CHANGE_MEASUREMENT_STATE } from '../actions/measurement';

export default function measurement(
    state = {
        geomType: null,
        coordinates: null,
        length: null,
        area: 0,
        bearing: 0,
        lenUnit: 'm',
        areaUnit: 'sqm',
    },
    action
) {
    switch (action.type) {
        case CHANGE_MEASUREMENT_STATE:
            return assign(
                {},
                { lenUnit: state.lenUnit, areaUnit: state.areaUnit },
                action.data
            );
        default:
            return state;
    }
}

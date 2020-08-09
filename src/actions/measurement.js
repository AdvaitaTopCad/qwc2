/**
 * Copyright 2015, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

export const CHANGE_MEASUREMENT_STATE = 'CHANGE_MEASUREMENT_STATE';

export function changeMeasurementState(measureState) {
    return {
        type: CHANGE_MEASUREMENT_STATE,
        data: measureState,
    };
}

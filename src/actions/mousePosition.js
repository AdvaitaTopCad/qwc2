/**
 * Copyright 2018, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
export const CHANGE_MOUSE_POSITION_STATE = 'CHANGE_MOUSE_POSITION_STATE';

export function changeMousePositionState(data) {
    return {
        type: CHANGE_MOUSE_POSITION_STATE,
        data,
    };
}

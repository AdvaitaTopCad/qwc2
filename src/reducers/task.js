/**
 * Copyright 2016, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assign from 'object-assign';
import { SET_CURRENT_TASK, SET_CURRENT_TASK_BLOCKED } from '../actions/task';

export default function task(state = {}, action) {
    switch (action.type) {
        case SET_CURRENT_TASK:
            if (state.blocked) {
                return state;
            }
            return assign({}, state, {
                id: action.id,
                mode: action.mode,
                unsetOnMapClick: action.unsetOnMapClick,
            });
        case SET_CURRENT_TASK_BLOCKED:
            return assign({}, state, { blocked: action.blocked });
        default:
            return state;
    }
}

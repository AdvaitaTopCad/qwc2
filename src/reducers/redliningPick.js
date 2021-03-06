/**
 * Copyright 2018, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assign from 'object-assign';

import { CHANGE_REDLINING_PICK_STATE } from '../actions/redliningPick';

export default function redliningPick(
    state = {
        active: false,
        selectedFeatures: [],
        layer: 'redlining',
    },
    action
) {
    switch (action.type) {
        case CHANGE_REDLINING_PICK_STATE:
            return assign({}, state, action.data);
        default:
            return state;
    }
}

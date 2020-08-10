/**
 * Copyright 2017, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assign from 'object-assign';

const { CHANGE_EDITING_STATE } = require('../actions/editing');

export default function editing(
    state = {
        action: null,
        geomType: null,
        feature: null,
    },
    action
) {
    let changed = false;
    switch (action.type) {
        case CHANGE_EDITING_STATE:
            if (action.data.feature) {
                changed = action.data.changed !== false;
            }
            return assign({}, state, action.data, { changed });
        default:
            return state;
    }
}

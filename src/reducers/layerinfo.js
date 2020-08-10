/**
 * Copyright 2018, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assign from 'object-assign';
import { SET_ACTIVE_LAYERINFO } from '../actions/layerinfo';

export default function layerInfo(state = {}, action) {
    switch (action.type) {
        case SET_ACTIVE_LAYERINFO:
            return assign({}, state, {
                layer: action.layer,
                sublayer: action.sublayer,
            });
        default:
            return state;
    }
}

/**
 * Copyright 2017, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

export const CHANGE_REDLINING_STATE = 'CHANGE_REDLINING_STATE';

export function changeRedliningState(redliningState) {
    return {
        type: CHANGE_REDLINING_STATE,
        data: redliningState,
    };
}

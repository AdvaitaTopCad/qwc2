/**
 * Copyright 2017, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

export const CHANGE_EDITING_STATE = 'CHANGE_EDITING_STATE';

export function changeEditingState(editingState) {
    return {
        type: CHANGE_EDITING_STATE,
        data: editingState,
    };
}

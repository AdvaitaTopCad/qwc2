/**
 * Copyright 2015, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { CHANGE_LOCALE, LOCALE_LOAD_ERROR } = require('../actions/locale');

export default function locale(
    state = {
        messages: {},
        current: '',
    },
    action
) {
    switch (action.type) {
        case CHANGE_LOCALE:
            return {
                messages: action.messages,
                current: action.locale,
            };
        case LOCALE_LOAD_ERROR:
            return {
                loadingError: action.error,
            };
        default:
            return state;
    }
}

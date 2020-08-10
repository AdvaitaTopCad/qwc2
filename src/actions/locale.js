/**
 * Copyright 2015, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import axios from 'axios';
import { getUserLocale } from '../utils/Locale';
import { getConfigProp } from '../utils/Config';

export const CHANGE_LOCALE = 'CHANGE_LOCALE';
export const LOCALE_LOAD_ERROR = 'LOCALE_LOAD_ERROR';

function changeLocale(data) {
    return {
        type: CHANGE_LOCALE,
        messages: data.messages,
        locale: data.locale,
    };
}

function localeError(e) {
    return {
        type: LOCALE_LOAD_ERROR,
        error: e,
    };
}

export function loadLocale(translationFolder, language) {
    return (dispatch) => {
        let locale = language;
        if (!locale) {
            locale = getUserLocale();
        }
        return axios
            .get(
                `${
                    translationFolder || getConfigProp('translationsPath')
                }/data.${locale}`
            )
            .then((response) => {
                if (typeof response.data === 'string') {
                    try {
                        JSON.parse(response.data);
                    } catch (e) {
                        // eslint-disable-next-line no-console
                        console.warn(
                            `Locale file broken  for (${language}): ${e.message}`
                        );
                        dispatch(
                            localeError(
                                `Locale file broken  for (${language}): ${e.message}`
                            )
                        );
                    }
                } else {
                    dispatch(changeLocale(response.data));
                }
            })
            .catch((e) => {
                dispatch(localeError(e));
            });
    };
}

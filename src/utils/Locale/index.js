/**
 * Copyright 2015, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import url from 'url';
import { addLocaleData } from 'react-intl';
import ConfigUtils from '../Config';

let supportedLocales = {
    en: {
        code: 'en-US',
        description: 'English',
    },
};

export const ensureIntl = (callback) => {
    require.ensure(
        [
            'intl',
            'intl/locale-data/jsonp/en.js',
            'intl/locale-data/jsonp/it.js',
            'intl/locale-data/jsonp/fr.js',
        ],
        (require) => {
            global.Intl = require('intl');
            require('intl/locale-data/jsonp/en.js');
            require('intl/locale-data/jsonp/it.js');
            require('intl/locale-data/jsonp/fr.js');
            if (callback) {
                callback();
            }
        }
    );
};

export const setSupportedLocales = (locales) => {
    supportedLocales = locales;
    const localeData = [];
    Object.keys(locales).forEach((key) => {
        localeData.push(...locales[key].localeData);
    });
    addLocaleData(localeData);
};

export const normalizeLocaleCode = (localeCode) => {
    let retval;
    if (localeCode === undefined || localeCode === null) {
        retval = undefined;
    } else {
        const rg = /^[a-z]+/i;
        const match = rg.exec(localeCode);
        if (match && match.length > 0) {
            retval = match[0].toLowerCase();
        } else {
            retval = undefined;
        }
    }
    return retval;
};

export const getLocale = (query) => {
    const locale =
        supportedLocales[
            normalizeLocaleCode(
                query.locale ||
                    ConfigUtils.getConfigProp('locale') ||
                    (navigator
                        ? navigator.language || navigator.browserLanguage
                        : 'en')
            )
        ];
    return locale ? locale.code : 'en-US';
};

export const getUserLocale = () => {
    return getLocale(url.parse(window.location.href, true).query);
};

export const getSupportedLocales = () => {
    return supportedLocales;
};

export const getMessageById = (messages, msgId) => {
    let message = messages;
    msgId.split('.').forEach((part) => {
        message = message ? message[part] : null;
    });
    return message || msgId;
};

export const toLocaleFixed = (number, digits) => {
    if (ConfigUtils.getConfigProp('localeAwareNumbers')) {
        return number.toLocaleString(getUserLocale(), {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
        });
    }
    return number.toFixed(digits);
};

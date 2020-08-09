/**
 * Copyright 2015, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import axios from 'axios';
import assign from 'object-assign';
import url from 'url';
import isMobile from 'ismobilejs';

let defaultConfig = {
    translationsPath: 'translations',
    bingApiKey: null,
    mapquestApiKey: null,
    defaultFeatureStyle: {
        strokeColor: [0, 0, 255, 1],
        strokeWidth: 2,
        strokeDash: [4],
        fillColor: [0, 0, 255, 0.33],
        circleRadius: 10,
        textFill: 'black',
        textStroke: 'white',
    },
};

export const getDefaults = () => {
    return defaultConfig;
};

export const loadConfiguration = () => {
    let configFile = 'config.json';
    const urlQuery = url.parse(window.location.href, true).query;
    if (urlQuery.localConfig) {
        configFile = `${urlQuery.localConfig}.json`;
    }
    return axios.get(configFile).then((response) => {
        if (typeof response.data === 'object') {
            defaultConfig = assign({}, defaultConfig, response.data);
        } else {
            // eslint-disable-next-line no-console
            console.warn(`Broken configuration file ${configFile}!`);
        }
        return defaultConfig;
    });
};

/**
 * Utility to detect browser properties.
 * Code from leaflet-src.js
 */
export const getBrowserProperties = () => {
    const ie = 'ActiveXObject' in window;
    const ielt9 = ie && !document.addEventListener;
    const ie11 =
        ie &&
        window.location.hash === !!window.MSInputMethodContext &&
        !!document.documentMode;

    // terrible browser detection to work around Safari / iOS / Android browser bugs
    const ua = navigator.userAgent.toLowerCase();
    const webkit = ua.indexOf('webkit') !== -1;
    const chrome = ua.indexOf('chrome') !== -1;
    const phantomjs = ua.indexOf('phantom') !== -1;
    const android = ua.indexOf('android') !== -1;
    const android23 = ua.search('android [23]') !== -1;
    const gecko = ua.indexOf('gecko') !== -1;

    const mobile = isMobile.any; // typeof window.orientation !== undefined + '';
    const msPointer = !window.PointerEvent && window.MSPointerEvent;
    const pointer =
        (window.PointerEvent &&
            window.navigator.pointerEnabled &&
            window.navigator.maxTouchPoints) ||
        msPointer;
    const retina =
        ('devicePixelRatio' in window && window.devicePixelRatio > 1) ||
        ('matchMedia' in window &&
            window.matchMedia('(min-resolution:144dpi)') &&
            window.matchMedia('(min-resolution:144dpi)').matches);

    const doc = document.documentElement;
    const ie3d = ie && 'transition' in doc.style;
    const webkit3d =
        'WebKitCSSMatrix' in window &&
        'm11' in new window.WebKitCSSMatrix() &&
        !android23;
    const gecko3d = 'MozPerspective' in doc.style;
    const opera3d = 'OTransition' in doc.style;
    const any3d =
        !window.L_DISABLE_3D &&
        (ie3d || webkit3d || gecko3d || opera3d) &&
        !phantomjs;

    const touch =
        !window.L_NO_TOUCH &&
        !phantomjs &&
        (pointer ||
            'ontouchstart' in window ||
            (window.DocumentTouch && document instanceof window.DocumentTouch));

    return {
        ie,
        ie11,
        ielt9,
        webkit,
        gecko: gecko && !webkit && !window.opera && !ie,

        android,
        android23,

        chrome,

        ie3d,
        webkit3d,
        gecko3d,
        opera3d,
        any3d,

        mobile,
        mobileWebkit: mobile && webkit,
        mobileWebkit3d: mobile && webkit3d,
        mobileOpera: mobile && window.opera,

        touch,
        msPointer,
        pointer,

        retina,

        platform: navigator.platform,
    };
};

export const getConfigProp = (prop, theme) => {
    if (theme && theme.config && theme.config[prop] !== undefined) {
        return theme.config[prop];
    }
    return defaultConfig[prop];
};

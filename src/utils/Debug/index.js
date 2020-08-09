/**
 * Copyright 2015, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import url from 'url';
import { createStore, compose, applyMiddleware } from 'redux';
import { persistState } from 'redux-devtools';
import thunkMiddleware from 'redux-thunk';
import logger from 'redux-logger';
import immutable from 'redux-immutable-state-invariant';
import DevTools from '../components/development/DevTools';

const urlQuery = url.parse(window.location.href, true).query;
/*eslint-disable */
var warn = console.warn;

/* eslint-enable */

const warningFilterKey = (warning) => {
    // avoid React 0.13.x warning about nested context. Will remove in 0.14
    return (
        warning.indexOf(
            'Warning: owner-based and parent-based contexts differ'
        ) >= 0
    );
};

const DebugUtils = {
    createDebugStore(reducer, initialState, userMiddlewares, enhancer) {
        let finalCreateStore;
        if (process.env.NODE_ENV !== 'production' && urlQuery.debug) {
            const middlewares = (userMiddlewares || []).concat([
                immutable(),
                thunkMiddleware,
                logger,
            ]);
            finalCreateStore = compose(
                applyMiddleware(...middlewares),
                window.devToolsExtension
                    ? window.devToolsExtension()
                    : DevTools.instrument(),
                persistState(
                    window.location.href.match(/[?&]debug_session=([^&]+)\b/)
                )
            )(createStore);
        } else {
            const middlewares = (userMiddlewares || []).concat([
                thunkMiddleware,
            ]);
            finalCreateStore = applyMiddleware(...middlewares)(createStore);
        }
        return finalCreateStore(reducer, initialState, enhancer);
    },
};

/*eslint-disable */
console.warn = function() {
    if ( arguments && arguments.length > 0 && typeof arguments[0] === "string" && warningFilterKey(arguments[0]) ) {
        // do not warn
    } else {
        warn.apply(console, arguments);
    }
};
/* eslint-enable */

export default DebugUtils;

/**
 * Copyright 2016, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assign from 'object-assign';
import { omit } from 'lodash';

export const getPluginReducers = (plugins) => {
    return Object.keys(plugins)
        .map((name) => plugins[name].reducers)
        .reduce((previous, current) => assign({}, previous, current), {});
};

export const getPlugins = (plugins) =>
    Object.keys(plugins)
        .map((name) => plugins[name])
        .reduce(
            (previous, current) =>
                assign({}, previous, omit(current, 'reducers')),
            {}
        );

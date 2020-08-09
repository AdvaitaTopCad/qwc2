/**
 * Copyright 2020, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

export const SHOW_IFRAME_DIALOG = 'SHOW_IFRAME_DIALOG';
export const SHOW_NOTIFICATION = 'SHOW_NOTIFICATION';
export const CLOSE_WINDOW = 'CLOSE_WINDOW';
export const CLOSE_ALL_WINDOWS = 'CLOSE_ALL_WINDOWS';

export function showIframeDialog(name, url, options) {
    return {
        type: SHOW_IFRAME_DIALOG,
        name,
        url,
        options,
    };
}

export function showNotification(name, text) {
    return {
        type: SHOW_NOTIFICATION,
        name,
        text,
    };
}

export function closeWindow(name) {
    return {
        type: CLOSE_WINDOW,
        name,
    };
}

export function closeAllWindows() {
    return {
        type: CLOSE_ALL_WINDOWS,
    };
}

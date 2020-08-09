/**
 * Copyright 2015, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import assign from 'object-assign';
import proj from 'ol/proj';
import Proj4js from 'proj4';

const crsLabels = {
    'EPSG:4326': 'WGS 84',
    'EPSG:3857': 'WGS 84 / Pseudo Mercator',
};

export const setCrsLabels = (labels) => {
    assign(crsLabels, labels);
};

export const getCrsLabels = () => {
    return crsLabels;
};

export const getUnits = (projection) => {
    const proj4 = new Proj4js.Proj(projection);
    return proj4.units || 'degrees';
};

export const getAxisOrder = (projection) => {
    const axis = proj.get(projection).getAxisOrientation();
    return axis || 'enu';
};

export const reproject = (point, source, dest) => {
    if (source === dest) {
        return [...point];
    }
    const sourceProj = Proj4js.defs(source) ? new Proj4js.Proj(source) : null;
    const destProj = Proj4js.defs(dest) ? new Proj4js.Proj(dest) : null;
    if (sourceProj && destProj) {
        const p = Array.isArray(point)
            ? Proj4js.toPoint(point)
            : Proj4js.toPoint([point.x, point.y]);
        let transformed = null;
        try {
            transformed = Proj4js.transform(sourceProj, destProj, p);
        } catch (e) {
            transformed = { x: 0, y: 0 };
        }
        return [transformed.x, transformed.y];
    }
    return null;
};

/**
 * Reprojects a bounding box.
 *
 * @param bbox {array} [minx, miny, maxx, maxy]
 * @param source {string} SRS of the given bbox
 * @param dest {string} SRS of the returned bbox
 *
 * @return {array} [minx, miny, maxx, maxy]
 */
export const reprojectBbox = (bbox, source, dest) => {
    const sw = reproject([bbox[0], bbox[1]], source, dest);
    const ne = reproject([bbox[2], bbox[3]], source, dest);
    return [...sw, ...ne];
};

export const getCompatibleSRS = (srs, allowedSRS) => {
    if (
        srs === 'EPSG:900913' &&
        !allowedSRS['EPSG:900913'] &&
        allowedSRS['EPSG:3857']
    ) {
        return 'EPSG:3857';
    }
    if (
        srs === 'EPSG:3857' &&
        !allowedSRS['EPSG:3857'] &&
        allowedSRS['EPSG:900913']
    ) {
        return 'EPSG:900913';
    }
    return srs;
};

export const normalizeSRS = (srs, allowedSRS) => {
    const result = srs === 'EPSG:900913' ? 'EPSG:3857' : srs;
    if (allowedSRS && !allowedSRS[result]) {
        return getCompatibleSRS(result, allowedSRS);
    }
    return result;
};

export const isAllowedSRS = (srs, allowedSRS) => {
    return allowedSRS[getCompatibleSRS(srs, allowedSRS)];
};

export const getAvailableCRS = () => {
    const crsList = {};
    Proj4js.defs.forEach((a) => {
        if (Object.prototype.hasOwnProperty.call(Proj4js.defs, a)) {
            crsList[a] = { label: crsLabels[a] || a };
        }
    });
    return crsList;
};

export const calculateAzimuth = (p1, p2, pj) => {
    const p1proj = reproject(p1, pj, 'EPSG:4326');
    const p2proj = reproject(p2, pj, 'EPSG:4326');
    const lon1 = (p1proj[0] * Math.PI) / 180.0;
    const lat1 = (p1proj[1] * Math.PI) / 180.0;
    const lon2 = (p2proj[0] * Math.PI) / 180.0;
    const lat2 = (p2proj[1] * Math.PI) / 180.0;
    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    const azimuth = ((Math.atan2(y, x) * 180.0) / Math.PI + 360) % 360;

    return azimuth;
};

/**
 * Extend an extent given another one
 *
 * @param extent1 {array} [minx, miny, maxx, maxy]
 * @param extent2 {array} [minx, miny, maxx, maxy]
 *
 * @return {array} [minx, miny, maxx, maxy]
 */
export const extendExtent = (extent1, extent2) => {
    return [
        Math.min(extent1[0], extent2[0]),
        Math.min(extent1[1], extent2[1]),
        Math.max(extent1[2], extent2[2]),
        Math.max(extent1[3], extent2[3]),
    ];
};

/**
 * Check extent validity
 *
 * @param extent {array} [minx, miny, maxx, maxy]
 *
 * @return {bool}
 */
export const isValidExtent = (extent) => {
    return !(
        extent.indexOf(Infinity) !== -1 ||
        extent.indexOf(-Infinity) !== -1 ||
        extent[1] >= extent[2] ||
        extent[1] >= extent[3]
    );
};

export const calculateCircleCoordinates = (center, radius, sides, rotation) => {
    let angle = Math.PI * (1 / sides - 1 / 2);

    if (rotation) {
        angle += (rotation / 180) * Math.PI;
    }

    let rotatedAngle;
    let x;
    let y;
    const points = [[]];
    for (let i = 0; i < sides; i += 1) {
        rotatedAngle = angle + (i * 2 * Math.PI) / sides;
        x = center[0] + radius * Math.cos(rotatedAngle);
        y = center[1] + radius * Math.sin(rotatedAngle);
        points[0].push([x, y]);
    }

    points[0].push(points[0][0]);
    return points;
};

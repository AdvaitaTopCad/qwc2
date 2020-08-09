export const LOCAL_CONFIG_LOADED = 'LOCAL_CONFIG_LOADED';
export const SET_STARTUP_PARAMETERS = 'SET_STARTUP_PARAMETERS';

export function localConfigLoaded(config) {
    return {
        type: LOCAL_CONFIG_LOADED,
        config,
    };
}

export function setStartupParameters(params) {
    return {
        type: SET_STARTUP_PARAMETERS,
        params,
    };
}

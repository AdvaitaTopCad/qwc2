import * as Providers from './index';

describe('ExampleComponent', () => {
    Object.keys(Providers).forEach((key) => {
        it(key, () => {
            const inst = Providers[key];
            expect('url' in inst).toBeTruthy();
            expect('options' in inst).toBeTruthy();
        });
    });
});
